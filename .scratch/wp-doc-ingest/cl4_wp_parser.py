#!/usr/bin/env python3
"""CL4 pilot PDF parser (ADR-0008 / PRD Step 2).

Reuses the recovered prior-art extraction engine (`_refs/he_wp_parser_merged_patched_with_dates.py`
— `parse_call_block`/`extract_sections`/helpers) but drives it with *real-definition-aware*
splitting: a topic block runs from one real definition (topic-id header immediately followed by
`Call:` + `Specific conditions`) to the next, so same-cluster cross-references in narrative prose
don't truncate a block (the failure mode of the audit-grade parser).

Returns {call_id: content_record} for CL4 current-edition (2026/2027) topics, with
`technology_readiness_level` and full narrative/conditions populated from the document.
"""
import sys, re, json
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parent / "_refs"))
import he_wp_parser_merged_patched_with_dates as pa  # prior-art engine (import-safe)
import fitz

PDF = Path(__file__).resolve().parents[2] / "pdf_files/HORIZON_2026/wp-7-digital-industry-and-space_horizon-2026-2027_en.pdf"
EDITION_RE = re.compile(r'HORIZON-CL4-20(?:26|27)-')
HDR = re.compile(r'(HORIZON-CL4-20\d\d-[0-9A-Za-z\-]+?)\s*:\s*(.+?)\n', re.S)

def _clean_text(doc):
    """Full text with running headers/footers stripped page-by-page (reuse prior-art geometry strip)."""
    parts = []
    for i in range(doc.page_count):
        page = doc.load_page(i)
        lines = [ln for ln in page.get_text('text').splitlines() if ln.strip()]
        lines = pa.strip_headers_footers(page, lines)
        parts.append("\n".join(lines))
    return "\n".join(parts)

def parse(pdf_path=PDF):
    doc = fitz.open(str(pdf_path))
    text = _clean_text(doc).replace('­', '')

    # 1) real-definition start positions: header followed (soon) by Call: + Specific conditions
    starts = []
    for m in HDR.finditer(text):
        window = text[m.end(): m.end() + 500]
        if 'Call:' in window and re.search(r'Specific\s+conditions', window):
            starts.append((m.start(), m.group(1)))
    # dedup by call_id, keep first real definition
    seen_ids, defs = set(), []
    for pos, cid in starts:
        if cid in seen_ids:
            continue
        seen_ids.add(cid)
        defs.append((pos, cid))
    bounds = [d[0] for d in defs] + [len(text)]

    # 2) slice each block to the NEXT real-def start, parse with the prior-art engine
    out = {}
    for i, (pos, cid) in enumerate(defs):
        if not EDITION_RE.match(cid):          # drop old-year cross-refs
            continue
        block = text[pos: bounds[i + 1]]
        rec = pa.parse_call_block(block)
        # normalise the prior-art double-underscore typo
        if "min__contribution" in rec:
            rec["min_contribution"] = rec.pop("min__contribution")
        rec["call_id"] = rec.get("call_id") or cid
        out.setdefault(rec["call_id"], rec)
    return out

if __name__ == "__main__":
    recs = parse()
    def ne(v): return v not in (None, "", [], {})
    trl = sum(1 for r in recs.values() if ne(r.get("technology_readiness_level")))
    narr = sum(1 for r in recs.values() if ne(r.get("expected_outcome")) and ne(r.get("scope")))
    space = sorted(k for k in recs if "SPACE" in k)
    print(f"CL4 topics parsed: {len(recs)}")
    print(f"  with TRL:            {trl}/{len(recs)}")
    print(f"  with outcome+scope:  {narr}/{len(recs)}")
    print(f"  SPACE topics:        {len(space)}")
    # show one enriched sample + one Space sample
    for label, key in [("sample", next(iter(recs))), ("space", space[0] if space else None)]:
        if not key: continue
        r = recs[key]
        print(f"\n[{label}] {key}")
        print(f"   title: {(r.get('call_title') or '')[:90]}")
        print(f"   type_of_action: {r.get('type_of_action')!r}  TRL: {(r.get('technology_readiness_level') or '')[:70]!r}")
        print(f"   min/max/budget: {r.get('min_contribution')}/{r.get('max_contribution')}/{r.get('indicative_budget')}")
        print(f"   scope[:80]: {(r.get('scope') or '')[:80]!r}")
