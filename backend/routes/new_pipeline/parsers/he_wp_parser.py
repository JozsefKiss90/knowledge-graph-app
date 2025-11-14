#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Minimal two-page call-table parser for Horizon Europe WPs.

Goal: Parse ONLY the two-page "Specific conditions" + "Expected Outcome/Scope" call block.
Inputs: a 1–2 page PDF snippet containing exactly one call.
Outputs: JSON with fields matching 2026 call JSONs (subset focused on call table + EO/Scope).

Usage:
  python he_wp_calltable_parser.py --input "HORIZON-CL4-2026-2027_07_14_2025 157-158.pdf" --out call.json --pretty

Requires:
  pip install pymupdf
"""
import re
import json
import sys
import argparse
from dataclasses import dataclass, asdict
from typing import Optional, Dict

try:
    import fitz  # PyMuPDF
except ImportError:
    print("PyMuPDF (fitz) is required. Install via: pip install pymupdf", file=sys.stderr)
    sys.exit(1)

HEADER_PATS = [
    re.compile(r'^Horizon Europe - Work Programme', re.I),
    re.compile(r'^Digital, Industry and Space', re.I),
    re.compile(r'^Part\s*\d+\s*-\s*Page\s*\d+\s*of\s*\d+', re.I),
]

TOPIC_ID_LINE = re.compile(r'^(HORIZON-[A-Z0-9]+-\d{4}-[0-9A-Za-z\-]+)\s*:\s*(.+)$', re.I)
TYPE_OF_ACTION_IN_TITLE = re.compile(r'\((RIA|IA|CSA|COFUND|MSCA|EIC|ERA)\)')
MONEY_NUM = re.compile(r'(\d+(?:\.\d+)?)')

def norm(s: str) -> str:
    return re.sub(r'[ \t]+', ' ', s).strip()

def strip_headers_footers(page, lines):
    """Drop common header/footer lines using margin & patterns."""
    h = page.rect.height
    TOP = 60.0
    BOTTOM = 60.0
    kept = []
    # Use blocks to keep only text in the main area and then filter lines by header patterns
    blocks = page.get_text("blocks", sort=True)
    text_areas = []
    for (x0,y0,x1,y1,txt, *rest) in blocks:
        if y0 < TOP or y1 > h - BOTTOM:
            continue
        if txt and txt.strip():
            for ln in txt.splitlines():
                lnc = norm(ln)
                if not lnc:
                    continue
                if any(p.match(lnc) for p in HEADER_PATS):
                    continue
                kept.append(lnc)
    if kept:
        return kept
    # Fallback to original lines filtering
    out = []
    for ln in lines:
        lnc = norm(ln)
        if not lnc:
            continue
        if any(p.match(lnc) for p in HEADER_PATS):
            continue
        if re.fullmatch(r'\d+\s*', lnc):
            continue
        out.append(lnc)
    return out


def extract_sections(text: str) -> Dict[str, str]:
    """Extract paragraphs between known headings within the call block, allowing headings to span lines."""
    sections = {}
    # Flexible heading patterns that tolerate arbitrary whitespace/newlines between words
    patterns = [
        (r'Expected\s*EU\s*contribution\s*per\s*project', 'expected_eu_contribution'),
        (r'Indicative\s*budget', 'indicative_budget'),
        (r'Type\s*of\s*Action', 'type_of_action'),
        (r'Admissibility\s*conditions', 'admissibility_conditions'),
        (r'Technology\s*Readiness\s*Level', 'technology_readiness_level'),
        (r'Procedure', 'procedure'),
        (r'Legal\s*and\s*financial\s*set-up\s*of\s*the\s*Grant\s*Agreements', 'legal_and_financial_setup'),
        (r'Exceptional\s*page\s*limits', 'exceptional_page_limits'),
    ]
    # Find all headings by regex over the whole text and record their spans
    hits = []
    for pat, key in patterns:
        for m in re.finditer(pat, text, re.I | re.S):
            hits.append((m.start(), m.end(), key))
    # Sort by start position
    hits.sort(key=lambda x: x[0])
    # Slice content from each heading to the next heading
    for i, (s, e, key) in enumerate(hits):
        nxt = hits[i+1][0] if i+1 < len(hits) else len(text)
        block = text[e:nxt]
        # Stop blocks at Expected Outcome / Scope markers if present
        stopper = re.search(r'(?:\bExpected\s*Outcome\s*:|\bScope\s*:)', block, re.I)
        if stopper:
            block = block[:stopper.start()]
        # Clean up whitespace
        block = re.sub(r'\s+', ' ', block).strip()
        sections[key] = block
    # Expected Outcome & Scope blocks
    def pick_block(head_regex):
        m = re.search(head_regex + r'\s*:\s*(.*)', text, re.I | re.S)
        if not m:
            return ""
        tail = m.group(1)
        stop = re.search(r'\n\s*(Scope|Expected Outcome|Specific conditions|General conditions)\b', tail, re.I)
        return norm(tail[:stop.start()] if stop else tail)
    sections['expected_outcome'] = pick_block(r'Expected\s*Outcome')
    sections['scope'] = pick_block(r'Scope')
    return sections


def parse_call_block(raw_text: str) -> Dict[str, Optional[str]]:
    """Parse the call id/title and table sections into a JSON-friendly dict."""
    out = {
        "call_id": "",
        "call_title": "",
        "type_of_action": "",
        "expected_eu_contribution": "",
        "min__contribution": None,
        "max_contribution": None,
        "indicative_budget": None,
        "indicative_number_of_projects": None,
        "admissibility_conditions": "",
        "technology_readiness_level": "",
        "procedure": "",
        "legal_and_financial_setup": "",
        "exceptional_page_limits": "",
        "expected_outcome": "",
        "scope": ""
    }
    lines = raw_text.splitlines()
    # 1) Try normal single-line 'ID: Title'
    found = False
    for ln in lines:
        m = TOPIC_ID_LINE.match(ln.strip())
        if m:
            out["call_id"] = m.group(1).strip()
            out["call_title"] = m.group(2).strip()
            mt = TYPE_OF_ACTION_IN_TITLE.search(out["call_title"])
            if mt:
                out["type_of_action"] = mt.group(1).upper()
            found = True
            break
    # 2) Handle wrapped title where the first line ends with ':'
    if not found:
        id_only_pat = re.compile(r'^(HORIZON-[A-Z0-9]+-\d{4}-[0-9A-Za-z\-]+)\s*:\s*$', re.I)
        for i, ln in enumerate(lines):
            m = id_only_pat.match(ln.strip())
            if m:
                out["call_id"] = m.group(1).strip()
                # Accumulate subsequent lines into a title until we hit a stopper
                title_parts = []
                for j in range(i+1, min(i+8, len(lines))):
                    t = lines[j].strip()
                    if not t:
                        break
                    if t.startswith("Call:") or t.lower().startswith("specific conditions"):
                        break
                    title_parts.append(t)
                out["call_title"] = norm(" ".join(title_parts))
                mt = TYPE_OF_ACTION_IN_TITLE.search(out["call_title"])
                if mt:
                    out["type_of_action"] = mt.group(1).upper()
                found = True
                break

    # Fallback: multi-line capture from after "ID:" up to "Call:" / "Specific conditions"
    if out["call_id"] and (not out["call_title"] or len(out["call_title"]) < 40 or "(" not in out["call_title"]):
        ml_pat = re.compile(rf"{re.escape(out['call_id'])}\s*:\s*(.*?)(?=\n\s*Call:|\n\s*Specific conditions)", re.S | re.I)
        mm = ml_pat.search(raw_text)
        if mm:
            out["call_title"] = norm(mm.group(1))
            mt = TYPE_OF_ACTION_IN_TITLE.search(out["call_title"])
            if mt:
                out["type_of_action"] = mt.group(1).upper()

    sections = extract_sections(raw_text)
    exp = sections.get("expected_eu_contribution", "")
    out["expected_eu_contribution"] = exp
    # Prefer explicit patterns: between EUR A and B; around EUR A
    nums = []
    m_between = re.search(r"between\s+EUR\s+(\d+(?:\.\d+)?)\s+and\s+(\d+(?:\.\d+)?)", exp, re.I)
    if m_between:
        a, b = float(m_between.group(1)), float(m_between.group(2))
        nums = [a, b]
    else:
        m_around = re.search(r"around\s+EUR\s+(\d+(?:\.\d+)?)", exp, re.I)
        if m_around:
            a = float(m_around.group(1))
            nums = [a]
    if nums:
        out["min__contribution"] = min(nums)
        out["max_contribution"] = max(nums)

    ind = sections.get("indicative_budget", "")
    m = MONEY_NUM.search(ind)
    if m:
        try:
            out["indicative_budget"] = float(m.group(1))
        except:
            pass

    toa = sections.get("type_of_action", "")
    if toa:
        if "Research and Innovation Actions" in toa:
            out["type_of_action"] = "RIA"
        elif "Innovation Actions" in toa:
            out["type_of_action"] = "IA"
        elif "Coordination and Support Actions" in toa:
            out["type_of_action"] = "CSA"

    out["admissibility_conditions"] = sections.get("admissibility_conditions", "")
    out["technology_readiness_level"] = sections.get("technology_readiness_level", "")
    out["procedure"] = sections.get("procedure", "")
    out["legal_and_financial_setup"] = sections.get("legal_and_financial_setup", "")
    exc = sections.get("exceptional_page_limits", "")
    # Remove stray leading column header fragment
    exc = re.sub(r"^to\s+proposals/applications\s*", "", exc, flags=re.I)
    out["exceptional_page_limits"] = exc
    out["expected_outcome"] = sections.get("expected_outcome", "")
    out["scope"] = sections.get("scope", "")

    return out


def split_calls(text: str):
    headers = list(re.finditer(r'^(HORIZON-[A-Z0-9]+-\d{4}-[0-9A-Za-z\-]+)\s*:\s*(.*)$', text, re.I | re.M))
    blocks = []
    for i, m in enumerate(headers):
        start = m.start()
        end = headers[i+1].start() if i+1 < len(headers) else len(text)
        blocks.append(text[start:end])
    return blocks

def pdf_to_clean_text(pdf_path: str) -> str:
    doc = fitz.open(pdf_path)
    parts = []
    for p in doc:
        text = p.get_text("text")
        # Split into lines, remove headers/footers
        lines = [ln for ln in text.splitlines() if ln.strip()]
        lines = strip_headers_footers(p, lines)
        parts.append("\n".join(lines))
    # Merge pages
    return "\n".join(parts)

def main():
    ap = argparse.ArgumentParser(description="Parse a two-page Horizon Europe call table PDF snippet into JSON.")
    ap.add_argument("--input", required=True, help="Path to the two-page call PDF snippet")
    ap.add_argument("--out", required=True, help="Output JSON file")
    ap.add_argument("--pretty", action="store_true", help="Pretty print JSON")
    args = ap.parse_args()

    raw = pdf_to_clean_text(args.input)
    blocks = split_calls(raw)
    data = []
    for b in blocks:
        data.append(parse_call_block(b))

    with open(args.out, "w", encoding="utf-8") as f:
        if args.pretty:
            json.dump(data, f, ensure_ascii=False, indent=2)
        else:
            json.dump(data, f, ensure_ascii=False)

    # Basic sanity feedback
    print(f"Parsed {len(data)} call(s) -> wrote {args.out}", file=sys.stderr)

if __name__ == "__main__":
    main()
