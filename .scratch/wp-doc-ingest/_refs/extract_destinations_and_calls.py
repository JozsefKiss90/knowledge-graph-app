#!/usr/bin/env python3
# -*- coding: utf-8 -*-

"""
extract_destinations_and_calls.py

Extract ONLY:
  - destination title
  - call/topic ids that appear under that destination section

Output shape:
[
  {"destination": "<destination title>", "call_ids": ["HORIZON-...", ...]},
  ...
]

Key robustness changes vs previous version:
- Destination ranges are derived from the Table of Contents "Destinations" section
  (this fixes CL1 where destination headings are often not reliably extractable).
- Fallback to heading-scan if TOC parsing yields nothing.
- Pretty JSON by default; use --compact for single-line JSON.
- Keep destinations even if no calls found (debug visibility).
"""

import argparse
import json
import re
from pathlib import Path
from typing import Dict, List, Optional, Tuple

import fitz  # PyMuPDF

SOFT_HYPHEN = "\u00ad"


def clean_line(s: str) -> str:
    if not s:
        return ""
    s = s.replace("\xa0", " ").replace(SOFT_HYPHEN, "")
    s = re.sub(r"(\w)-\s+(\w)", r"\1\2", s)  # de-hyphen wrap
    s = re.sub(r"\s+", " ", s).strip()
    return s


def strip_headers_footers(lines: List[str]) -> List[str]:
    out = []
    for ln in lines:
        l = clean_line(ln)
        if not l:
            continue
        # conservative header/footer stripping
        if re.match(r"^\d+\s*$", l):
            continue
        if re.match(r"^Horizon Europe\s*-\s*Work Programme", l, re.I):
            continue
        if re.match(r"^Part\s*\d+\s*-\s*Page\s*\d+\s*of\s*\d+", l, re.I):
            continue
        out.append(l)
    return out


def page_lines(doc: "fitz.Document", page_index: int) -> List[str]:
    raw = doc[page_index].get_text("text") or ""
    return strip_headers_footers(raw.splitlines())


def destination_text(doc: "fitz.Document", start_page: int, end_page: int) -> str:
    buf: List[str] = []
    for pg in range(start_page, end_page + 1):
        buf.extend(page_lines(doc, pg))
        buf.append("")  # separator
    return "\n".join(buf)


# -----------------------------
# Destination range discovery (TOC-first)
# -----------------------------

TOC_DEST_LINE_RE = re.compile(
    r"^\s*(Destination(?:\s*[-–])?\s+.+?)\s*\.{2,}\s*(\d+)\s*$",
    re.I,
)

TOC_DEST_LINE_RE_ALT = re.compile(
    r"^\s*(Destination(?:\s*[-–])?\s+.+?)\s+(\d+)\s*$",
    re.I,
)


def discover_destinations_from_toc(doc: "fitz.Document", max_pages: int = 40) -> List[Tuple[str, int]]:
    """
    Parse the Table of Contents and extract destination titles + their starting page numbers (1-based in PDF).
    Returns list of (destination_title, start_page_0_indexed).
    """
    n = len(doc)
    scan_upto = min(max_pages, n)

    in_toc = False
    in_destinations = False
    found: List[Tuple[str, int]] = []

    # Heuristics: TOC is near the front; "Destinations" section follows.
    for pg in range(scan_upto):
        lines = page_lines(doc, pg)
        for ln in lines:
            l = clean_line(ln)

            if not in_toc and re.search(r"\bTable of contents\b", l, re.I):
                in_toc = True
                continue

            if in_toc and not in_destinations and re.match(r"^\s*Destinations\s*$", l, re.I):
                in_destinations = True
                continue

            if in_destinations:
                # Stop conditions: next TOC major block (varies by WP)
                if re.match(r"^\s*(Budget|Other actions|Annex|Appendix)\b", l, re.I):
                    in_destinations = False
                    continue

                m = TOC_DEST_LINE_RE.match(l) or TOC_DEST_LINE_RE_ALT.match(l)
                if m:
                    title = clean_line(m.group(1))
                    page_1_based = int(m.group(2))
                    # Convert to 0-index, clamp
                    start_pg = max(0, min(n - 1, page_1_based - 1))

                    # Clean title: remove leading "Destination" / "Destination -"
                    title = re.sub(r"^\s*Destination\s*[-–]?\s*", "", title, flags=re.I).strip()

                    if title:
                        found.append((title, start_pg))

    # De-dupe while preserving order
    dedup: List[Tuple[str, int]] = []
    seen = set()
    for title, sp in found:
        key = (title.lower(), sp)
        if key not in seen:
            seen.add(key)
            dedup.append((title, sp))
    return dedup


def discover_destinations_by_headings(doc: "fitz.Document") -> List[Tuple[str, int]]:
    """
    Fallback method: scan for 'Destination ...' headings in body text.
    Returns list of (destination_title, start_page_0_indexed).
    """
    dests: List[Tuple[str, int]] = []

    # Handles: "Destination X", "Destination - X", "Destination X: Y", "Destination Innovative ..."
    heading_re = re.compile(r"^\s*Destination\s*(?:\d+\s*)?[:\-–]?\s*(.+\S)\s*$", re.I)

    for pg in range(len(doc)):
        lines = page_lines(doc, pg)
        for ln in lines:
            m = heading_re.match(ln)
            if m:
                title = clean_line(m.group(1))
                # filter obvious false positives
                if title and title.lower() not in ("destinations",):
                    dests.append((title, pg))
                break

    # De-dupe consecutive duplicates
    out: List[Tuple[str, int]] = []
    prev = None
    for t, p in dests:
        key = (t.lower(), p)
        if key != prev:
            out.append((t, p))
        prev = key
    return out


def build_destination_ranges(doc: "fitz.Document") -> List[Tuple[str, int, int]]:
    """
    Returns list of (destination_title, start_page, end_page), pages 0-indexed inclusive.
    """
    toc_based = discover_destinations_from_toc(doc)
    starts = toc_based if toc_based else discover_destinations_by_headings(doc)

    ranges: List[Tuple[str, int, int]] = []
    for i, (title, start_pg) in enumerate(starts):
        end_pg = (starts[i + 1][1] - 1) if i + 1 < len(starts) else (len(doc) - 1)
        if end_pg >= start_pg:
            ranges.append((title, start_pg, end_pg))
    return ranges


# -----------------------------
# Call extraction
# -----------------------------

CALL_ID_RE = re.compile(
    r"\b(HORIZON-[A-Z0-9]{2,10}-\d{4}-\d{2}-[A-Z0-9][A-Z0-9\-]*-\d{2}(?:-(?:Two-Stage|two-stage))?)\b",
    re.I,
)


def normalize_call_id(cid: str) -> str:
    cid = cid.strip()
    cid = re.sub(r"^horizon-", "HORIZON-", cid, flags=re.I)
    cid = re.sub(r"-(Two-Stage|two-stage)\b", "-two-stage", cid)
    return cid


def extract_destinations_and_calls(pdf_path: Path) -> List[Dict]:
    doc = fitz.open(pdf_path)
    ranges = build_destination_ranges(doc)

    results: List[Dict] = []

    for title, start_pg, end_pg in ranges:
        text = destination_text(doc, start_pg, end_pg)

        call_ids: List[str] = []
        seen = set()

        for m in CALL_ID_RE.finditer(text):
            cid = normalize_call_id(m.group(1))
            if cid not in seen:
                seen.add(cid)
                call_ids.append(cid)

        results.append({"destination": title, "call_ids": call_ids})

    return results


# -----------------------------
# CLI
# -----------------------------

def main():
    ap = argparse.ArgumentParser(
        description="Extract destinations and their call_ids from Horizon Europe Work Programme PDFs."
    )
    ap.add_argument("--input", required=True, nargs="+", help="One or more WP PDF paths")
    ap.add_argument("--out", required=True, help="Output JSON path")
    ap.add_argument(
        "--compact",
        action="store_true",
        help="Write JSON in a single line (default is pretty-printed).",
    )
    args = ap.parse_args()

    merged: Dict[str, List[str]] = {}
    order: List[str] = []

    for pdf in args.input:
        pdf_path = Path(pdf)
        if not pdf_path.exists():
            raise SystemExit(f"ERROR: not found: {pdf_path}")

        data = extract_destinations_and_calls(pdf_path)

        dest_count = len(data)
        call_count = sum(len(d["call_ids"]) for d in data)
        nonempty = sum(1 for d in data if d["call_ids"])
        print(f"[OK] {pdf_path.name}: {dest_count} destinations ({nonempty} with calls), {call_count} call_ids")

        for item in data:
            dest = item["destination"]
            if dest not in merged:
                merged[dest] = []
                order.append(dest)

            # Merge + preserve order within each destination
            existing = set(merged[dest])
            for cid in item["call_ids"]:
                if cid not in existing:
                    merged[dest].append(cid)
                    existing.add(cid)

    out_payload = [{"destination": d, "call_ids": merged[d]} for d in order]

    out_path = Path(args.out)
    out_path.parent.mkdir(parents=True, exist_ok=True)

    indent = None if args.compact else 2
    out_path.write_text(
        json.dumps(out_payload, indent=indent, ensure_ascii=False) + ("\n" if indent else ""),
        encoding="utf-8",
    )

    total_calls = sum(len(x["call_ids"]) for x in out_payload)
    print(f"[OK] wrote {out_path} ({len(out_payload)} destinations, {total_calls} call_ids)")


if __name__ == "__main__":
    main()
