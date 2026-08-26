#!/usr/bin/env python3
"""Work-programme topic content parser, generalised across clusters.

Same engine as the CL4 pilot's `cl4_wp_parser.py` - it drives the recovered
prior-art extractor (`_refs/he_wp_parser_merged_patched_with_dates.py`:
`parse_call_block` / `extract_sections`) with **real-definition-aware splitting**:
a topic block runs from one real definition (a topic-id header immediately followed
by the Specific-conditions table) to the next, so a same-cluster cross-reference in
narrative prose cannot truncate a block. The per-cluster regexes come from
`wp_clusters.py` instead of being hardcoded.

Returns {call_id: content record}. Budgets are in MILLIONS, as the document states
them; the merge converts to euro.
"""
from __future__ import annotations

import re
import sys
from pathlib import Path

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE))
sys.path.insert(0, str(HERE / "_refs"))

import he_wp_parser_merged_patched_with_dates as pa  # prior-art engine (import-safe)
import wp_clusters
import wp_destinations


def parse(cluster: str) -> dict:
    cfg = wp_clusters.get(cluster)
    text = wp_destinations.clean_text(cfg.pdf)
    defs = wp_destinations.real_definitions(text, cfg)
    bounds = [p for p, _ in defs] + [len(text)]

    out: dict[str, dict] = {}
    for i, (pos, cid) in enumerate(defs):
        block = text[pos: bounds[i + 1]]
        rec = pa.parse_call_block(block)

        # the prior-art engine carries a double-underscore typo
        if "min__contribution" in rec:
            rec["min_contribution"] = rec.pop("min__contribution")

        # Pin the id to the PDF header. The prior-art engine re-derives it by scanning
        # the block, and an in-block cross-reference to a prior-year predecessor
        # hijacks it (this is how CL3's 2027-01-INFRA-01 became a phantom 2025 topic).
        rec["call_id"] = cid

        # The engine assumes a HORIZON-CLx-YYYY id shape and gives up on others
        # (e.g. EUSPA's HORIZON-YYYY-EUSPA-...), leaving title/action empty and a bad
        # budget. Backfill from the block ONLY in that case; standard topics untouched.
        if not rec.get("call_title"):
            mt = re.search(re.escape(cid) + r'\s*:\s*(.+?)(?=\s*Specific\s+conditions|\s*Call\s*[-:])',
                           block, re.S)
            if mt:
                rec["call_title"] = re.sub(r'\s+', ' ', mt.group(1)).strip()
            mta = re.search(r'Type\s+of\s+Action\s+(.+?)(?=Eligibility|Admissibility|Technology|'
                            r'Procedure|Deadline|Award|Legal|Expected\s+Outcome|Scope)', block, re.S)
            if mta:
                v = re.sub(r'\s+', ' ', mta.group(1))
                rec["type_of_action"] = ("RIA" if "Research and Innovation" in v else
                                         "IA" if "Innovation Action" in v else
                                         "CSA" if "Coordination and Support" in v else v.strip()[:50])
            mb = re.search(r'total\s+indicative\s+budget\s+for\s+the\s+topic\s+is\s+EUR\s+([\d.,]+)\s*million',
                           block, re.I)
            if mb:
                try:
                    rec["indicative_budget"] = float(mb.group(1).replace(',', '.'))
                except ValueError:
                    pass
        out.setdefault(cid, rec)
    return out


if __name__ == "__main__":
    key = sys.argv[1] if len(sys.argv) > 1 else "CL4"
    recs = parse(key)

    def ne(v):
        return v not in (None, "", [], {})

    trl = sum(1 for r in recs.values() if ne(r.get("technology_readiness_level")))
    narr = sum(1 for r in recs.values() if ne(r.get("expected_outcome")) and ne(r.get("scope")))
    canc = [k for k, v in recs.items() if "CANCELLED" in (v.get("call_title") or "").upper()]
    print(f"{key} topics parsed: {len(recs)}")
    print(f"  with TRL:           {trl}/{len(recs)}")
    print(f"  with outcome+scope: {narr}/{len(recs)}")
    print(f"  cancelled:          {len(canc)} {canc}")
