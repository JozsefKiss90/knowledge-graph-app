#!/usr/bin/env python3
"""CL3 PDF parser (ADR-0008 / PRD Step 2; follows the CL4 pilot).

Reuses the recovered prior-art extraction engine (`_refs/he_wp_parser_merged_patched_with_dates.py`
— `parse_call_block`/`extract_sections`/helpers) but drives it with *real-definition-aware*
splitting: a topic block runs from one real definition (topic-id header immediately followed by
`Call:` + `Specific conditions`) to the next, so same-cluster cross-references in narrative prose
don't truncate a block (the failure mode of the audit-grade parser).

Unlike CL4, CL3 (Civil Security, wp-6) is a single standard namespace: every current topic is a
`HORIZON-CL3-20{26,27}-…` id carrying a per-topic `Call:` line. There are no EUSPA / agency topics
and no PDF-only (bucket-C) coverage gap — the 9 `CS-ECCC` cybersecurity topics live only in the API
(separate ECCC programme section), so they are handled additively by the merge, not here.

Returns {call_id: content_record} for CL3 current-edition (2026/2027) topics, with
`technology_readiness_level` and full narrative/conditions populated from the document.
"""
import sys, re, json
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parent / "_refs"))
import he_wp_parser_merged_patched_with_dates as pa  # prior-art engine (import-safe)
import fitz

PDF = Path(__file__).resolve().parents[2] / "pdf_files/HORIZON_2026/wp-6-civil-security-for-society_horizon-2026-2027_en.pdf"
# CL3 current-edition topics only. Drops old-year cross-references (e.g. HORIZON-CL3-2024-DRS-01-04
# cited in narrative prose) and never matches other clusters.
EDITION_RE = re.compile(r'HORIZON-CL3-20(?:26|27)-')
HDR = re.compile(r'(HORIZON-CL3-20\d\d-[0-9A-Za-z\-]+?)\s*:\s*(.+?)\n', re.S)

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

    # 1) real-definition start positions: header followed (soon) by Call: + Specific conditions.
    # CL3 topics all carry a per-topic `Call:` line; the relaxed table-anchor alternation is kept
    # for robustness but is not needed here (no Call:-less agency topics like CL4's EUSPA).
    starts = []
    for m in HDR.finditer(text):
        window = text[m.end(): m.end() + 500]
        if re.search(r'Specific\s+conditions', window) and \
           re.search(r'Call:|Expected\s+EU\s+contribution|Type\s+of\s+Action', window):
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
        # Force the header id: `cid` is the block's own definition header and is authoritative.
        # The prior-art engine re-derives call_id by scanning the block, which lets an in-block
        # cross-reference hijack it (CL3-2027-01-INFRA-01's narrative cites its 2025 predecessor,
        # so the engine mislabels the block HORIZON-CL3-2025-01-INFRA-01). Block content is correct;
        # only the label was wrong — pin it to the header.
        rec["call_id"] = cid
        # Safety net (rarely fires for CL3's standard ids): if the prior-art engine left the title
        # empty for a non-standard shape, backfill title/action/budget directly from the block.
        if not rec.get("call_title"):
            mt = re.search(re.escape(cid) + r'\s*:\s*(.+?)(?=\s*Specific\s+conditions|\s*Call\s*[-:])', block, re.S)
            if mt:
                rec["call_title"] = re.sub(r'\s+', ' ', mt.group(1)).strip()
            mta = re.search(r'Type\s+of\s+Action\s+(.+?)(?=Eligibility|Admissibility|Technology|Procedure|Deadline|Award|Legal|Expected\s+Outcome|Scope)', block, re.S)
            if mta:
                v = re.sub(r'\s+', ' ', mta.group(1))
                rec["type_of_action"] = ("RIA" if "Research and Innovation" in v else
                                         "IA" if "Innovation Action" in v else
                                         "CSA" if "Coordination and Support" in v else v.strip()[:50])
            mb = re.search(r'total\s+indicative\s+budget\s+for\s+the\s+topic\s+is\s+EUR\s+([\d.,]+)\s*million', block, re.I)
            if mb:
                try: rec["indicative_budget"] = float(mb.group(1).replace(',', '.'))
                except ValueError: pass
        out.setdefault(rec["call_id"], rec)
    return out

if __name__ == "__main__":
    recs = parse()
    def ne(v): return v not in (None, "", [], {})
    trl = sum(1 for r in recs.values() if ne(r.get("technology_readiness_level")))
    narr = sum(1 for r in recs.values() if ne(r.get("expected_outcome")) and ne(r.get("scope")))
    print(f"CL3 topics parsed: {len(recs)}")
    print(f"  with TRL:            {trl}/{len(recs)}")
    print(f"  with outcome+scope:  {narr}/{len(recs)}")
    # show one enriched sample
    key = next(iter(recs))
    r = recs[key]
    print(f"\n[sample] {key}")
    print(f"   title: {(r.get('call_title') or '')[:90]}")
    print(f"   type_of_action: {r.get('type_of_action')!r}  TRL: {(r.get('technology_readiness_level') or '')[:70]!r}")
    print(f"   min/max/budget: {r.get('min_contribution')}/{r.get('max_contribution')}/{r.get('indicative_budget')}")
    print(f"   scope[:80]: {(r.get('scope') or '')[:80]!r}")
    print("\nall ids:")
    for k in sorted(recs): print("  ", k)
