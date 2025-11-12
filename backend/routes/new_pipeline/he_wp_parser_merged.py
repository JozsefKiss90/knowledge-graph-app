
#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Full-document parser: Destinations → Calls (all call fields)  (v2)
- Adds 'eligibility_conditions' field from call tables
- Normalizes 'procedure' values (e.g., '(FTRI).' -> 'FTRI')

Run:
python he_wp_parser_merged_v2.py --input "/mnt/data/HORIZON-CL4-2026-2027_07_14_2025.pdf" --out "/mnt/data/cl4_full_destinations_allfields_v2.json" --pretty
"""
import re
import json
import argparse
from typing import List, Dict, Tuple, Optional
import fitz  # PyMuPDF

# ---------- Patterns ----------
HEADER_PATS = [
    re.compile(r'^Horizon Europe - Work Programme', re.I),
    re.compile(r'^Digital, Industry and Space', re.I),
    re.compile(r'^Food, Bioeconomy, Natural Resources, Agriculture and Environment', re.I),
    re.compile(r'^Part\s*\d+\s*-\s*Page\s*\d+\s*of\s*\d+', re.I),
]
TOPIC_ID_LINE = re.compile(r'^(HORIZON-[A-Z0-9]+-\d{4}-[0-9A-Za-z\-]+)\s*:\s*(.+)$', re.I)
TYPE_OF_ACTION_IN_TITLE = re.compile(r'\((RIA|IA|CSA|COFUND|MSCA|EIC|ERA)\)')
MONEY_NUM = re.compile(r'(\d+(?:\.\d+)?)')
CALL_ID_HEADER_RE = re.compile(r'^(HORIZON-[A-Z0-9]+-\d{4}-[0-9A-Za-z\-]+)\s*:\s*(.*)$', re.I | re.M)

BODY_DEST_RE = re.compile(r'^\s*Destination\s*[:\-–]\s*(.+)$', re.I)
END_MARK_RE = re.compile(r'^\s*Other actions not subject to calls for proposals\b', re.I)

def norm(s: str) -> str:
    return re.sub(r'\s+', ' ', s).strip()

def strip_headers_footers(page, lines):
    """Drop common header/footer lines using page geometry + patterns."""
    h = page.rect.height
    TOP = 60.0
    BOTTOM = 60.0
    kept = []
    blocks = page.get_text("blocks", sort=True)
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
    """Grab the main keys appearing in the 'Specific conditions' table + narrative blocks."""
    sections = {}
    patterns = [
        (r'Expected\s*EU\s*contribution\s*per\s*project', 'expected_eu_contribution'),
        (r'Indicative\s*budget', 'indicative_budget'),
        (r'Type\s*of\s*Action', 'type_of_action'),
        (r'Admissibility\s*conditions', 'admissibility_conditions'),
        (r'Eligibility\s*conditions', 'eligibility_conditions'),
        (r'Technology\s*Readiness\s*Level', 'technology_readiness_level'),
        (r'Procedure', 'procedure'),
        (r'Legal\s*and\s*financial\s*set-up\s*of\s*the\s*Grant\s*Agreements', 'legal_and_financial_setup'),
        (r'Exceptional\s*page\s*limits', 'exceptional_page_limits'),
    ]
    hits = []
    for pat, key in patterns:
        for m in re.finditer(pat, text, re.I | re.S):
            hits.append((m.start(), m.end(), key))
    hits.sort(key=lambda x: x[0])
    for i, (s, e, key) in enumerate(hits):
        nxt = hits[i+1][0] if i+1 < len(hits) else len(text)
        block = text[e:nxt]
        stopper = re.search(r'(?:\bExpected\s*Outcome\s*:|\bScope\s*:)', block, re.I)
        if stopper:
            block = block[:stopper.start()]
        sections[key] = norm(block)

    def pick_block(head_regex):
        m = re.search(head_regex + r'\s*:\s*(.*)', text, re.I | re.S)
        if not m:
            return ""
        tail = m.group(1)
        stop = re.search(r'\n\s*(Scope|Expected Outcome|Specific conditions|General conditions)\b', tail, re.I)
        return norm(tail[:stop.start()] if stop else tail)

    sections['expected_outcome'] = pick_block(r'Expected\s*Outcome')
    sections['scope'] = pick_block(r'Scope')

    # Normalise procedure short markers like "(FTRI)."
    if 'procedure' in sections:
        proc = sections['procedure']
        m = re.fullmatch(r'[\(\[\{]?\s*([A-Za-z0-9\-/& ]{2,12})\s*[\)\]\}]?\.?', proc or '')
        if m and len(proc) < 20:
            sections['procedure'] = m.group(1).strip().upper()
        else:
            sections['procedure'] = proc

    return sections

def parse_call_block(raw_text: str) -> Dict[str, Optional[str]]:
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
        "eligibility_conditions": "",
        "technology_readiness_level": "",
        "procedure": "",
        "legal_and_financial_setup": "",
        "exceptional_page_limits": "",
        "expected_outcome": "",
        "scope": ""
    }
    lines = raw_text.splitlines()
    # Single-line 'ID: Title'
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
    # Wrapped title
    if not found:
        id_only_pat = re.compile(r'^(HORIZON-[A-Z0-9]+-\d{4}-[0-9A-Za-z\-]+)\s*:\s*$', re.I)
        for i, ln in enumerate(lines):
            m = id_only_pat.match(ln.strip())
            if m:
                out["call_id"] = m.group(1).strip()
                title_parts = []
                for j in range(i+1, min(i+12, len(lines))):
                    t = lines[j].strip()
                    if not t:
                        continue
                    if t.startswith("Call:") or t.lower().startswith("specific conditions"):
                        break
                    title_parts.append(t)
                out["call_title"] = norm(" ".join(title_parts))
                mt = TYPE_OF_ACTION_IN_TITLE.search(out["call_title"])
                if mt:
                    out["type_of_action"] = mt.group(1).upper()
                found = True
                break
    # Fallback multi-line capture
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

    # Numeric extraction for contribution
    nums = []
    m_between = re.search(r"between\s+EUR\s+(\d+(?:\.\d+)?)\s+and\s+(\d+(?:\.\d+)?)", exp, re.I)
    if m_between:
        a, b = float(m_between.group(1)), float(m_between.group(2))
        nums = [a, b]
    else:
        m_range = re.search(r"(\d+(?:\.\d+)?)\s*(?:to|-|–)\s*(\d+(?:\.\d+)?)", exp, re.I)
        if m_range:
            a, b = float(m_range.group(1)), float(m_range.group(2))
            nums = [a, b]
        else:
            m_around = re.search(r"around\s+EUR\s+(\d+(?:\.\d+)?)", exp, re.I)
            if m_around:
                a = float(m_around.group(1)); nums = [a]
    if nums:
        out["min__contribution"] = min(nums)
        out["max_contribution"] = max(nums)

    ind = sections.get("indicative_budget", "")
    m = MONEY_NUM.search(ind)
    if m:
        try: out["indicative_budget"] = float(m.group(1))
        except: pass

    toa = sections.get("type_of_action", "")
    if toa:
        if "Research and Innovation Actions" in toa: out["type_of_action"] = "RIA"
        elif "Innovation Actions" in toa: out["type_of_action"] = "IA"
        elif "Coordination and Support Actions" in toa: out["type_of_action"] = "CSA"

    out["admissibility_conditions"] = sections.get("admissibility_conditions", "")
    out["eligibility_conditions"] = sections.get("eligibility_conditions", "")
    out["technology_readiness_level"] = sections.get("technology_readiness_level", "")
    # Procedure normalization already applied in extract_sections
    proc = sections.get("procedure", "")
    if proc:
        proc_clean = re.sub(r'^[\(\[\{]\s*', '', proc)
        proc_clean = re.sub(r'\s*[\)\]\}]\.?\s*$', '', proc_clean)
        out["procedure"] = proc_clean.strip()
    else:
        out["procedure"] = ""

    out["legal_and_financial_setup"] = sections.get("legal_and_financial_setup", "")
    exc = sections.get("exceptional_page_limits", "")
    exc = re.sub(r"^to\s+proposals/applications\s*", "", exc, flags=re.I)
    exc = re.split(r'\bExpected\s*Outcome\s*:', exc, flags=re.I)[0].strip()
    out["exceptional_page_limits"] = exc
    out["expected_outcome"] = sections.get("expected_outcome", "")
    out["scope"] = sections.get("scope", "")
    return out

# ---------- Destination discovery ----------
def discover_destinations(doc: fitz.Document) -> List[Tuple[str, int, int]]:
    titles_pages = []
    end_page = len(doc)
    for i in range(len(doc)):
        lines = [ln.rstrip() for ln in doc.load_page(i).get_text('text').splitlines()]
        for ln in lines:
            if END_MARK_RE.match(ln) and not re.search(r'\b\d{1,4}\s*$', ln.strip()):
                end_page = i
                break
        if end_page != len(doc):
            break
    for i in range(end_page):
        lines = [ln.rstrip() for ln in doc.load_page(i).get_text('text').splitlines()]
        for ln in lines:
            m = BODY_DEST_RE.match(ln)
            if m:
                if re.search(r'\b\d{1,4}\s*$', ln.strip()):  # likely TOC
                    continue
                title = m.group(1).strip()
                if not titles_pages or titles_pages[-1][0] != title:
                    titles_pages.append((title, i))
                break
    ranges = []
    for idx, (title, start_p) in enumerate(titles_pages):
        stop_p = titles_pages[idx+1][1] if idx+1 < len(titles_pages) else end_page
        ranges.append((title, start_p, stop_p))
    return ranges

def destination_text(doc: fitz.Document, start_p: int, stop_p: int) -> str:
    parts = []
    for pno in range(start_p, stop_p):
        page = doc.load_page(pno)
        txt = page.get_text('text')
        lines = [ln for ln in txt.splitlines() if ln.strip()]
        lines = strip_headers_footers(page, lines)
        parts.append("\n".join(lines))
    return "\n".join(parts)

def split_calls(text: str) -> List[str]:
    headers = list(CALL_ID_HEADER_RE.finditer(text))
    blocks = []
    for i, m in enumerate(headers):
        start = m.start()
        end = headers[i+1].start() if i+1 < len(headers) else len(text)
        blocks.append(text[start:end])
    return blocks

def is_real_call_block(block: str) -> bool:
    has_specific = re.search(r'\bSpecific\s+conditions\b', block, re.I)
    has_eo_or_scope = re.search(r'\bExpected\s*Outcome\b|\bScope\b', block, re.I)
    return bool(has_specific and has_eo_or_scope and len(block) > 400)

def main():
    ap = argparse.ArgumentParser(description="Parse full WP (CL4) and group calls under destinations with full call fields.")
    ap.add_argument("--input", required=True, help="Full PDF path")
    ap.add_argument("--out", required=True, help="Output JSON path")
    ap.add_argument("--pretty", action="store_true")
    args = ap.parse_args()

    doc = fitz.open(args.input)
    dest_ranges = discover_destinations(doc)
    result = {"destinations": []}

    for title, s, e in dest_ranges:
        raw = destination_text(doc, s, e)
        all_blocks = split_calls(raw)
        real_blocks = [b for b in all_blocks if is_real_call_block(b)]
        calls = [parse_call_block(b) for b in real_blocks]
        # Deduplicate by call_id, keep order
        seen = set(); uniq = []
        for c in calls:
            cid = c.get("call_id") or ""
            if not cid or cid in seen:
                continue
            seen.add(cid); uniq.append(c)
        if uniq:
            result["destinations"].append({"destination_title": title, "calls": uniq})

    with open(args.out, "w", encoding="utf-8") as f:
        if args.pretty:
            json.dump(result, f, ensure_ascii=False, indent=2)
        else:
            json.dump(result, f, ensure_ascii=False)

    print(f"OK: {sum(len(d['calls']) for d in result['destinations'])} calls in {len(result['destinations'])} destinations -> {args.out}")

if __name__ == "__main__":
    main()
