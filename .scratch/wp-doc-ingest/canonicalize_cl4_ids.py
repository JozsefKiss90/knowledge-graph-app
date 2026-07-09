#!/usr/bin/env python3
"""Canonicalise the 30 stale CL4 topic IDs: MATERIALS-PRODUCTION -> MAT-PROD.

The ingested CL4 grouped file spells the Materials/Production destination token
`MATERIALS-PRODUCTION`, but the portal / current API dump / PDF all use `MAT-PROD`
(verified: all 30 renamed ids exist in the current dump). Rename ONLY id-bearing
fields so id-keyed consumers (assistant-locate, deep-links) resolve and a re-ingest
doesn't duplicate. Narrative/destination text is untouched. Idempotent.

After this, the graph must be re-ingested cleanly: DELETE /cluster4/all then
POST /cluster4/populate (a plain MERGE would leave the old-id nodes behind).
"""
import json, re
from pathlib import Path

GRP = Path(__file__).resolve().parents[2] / "backend/routes/new_pipeline/output_files/cluster_CL4.grouped.json"
ID_FIELDS = ["call_id", "original_call_id", "topic_id", "identifier", "topic_id_from_budget", "unique_key"]
STALE, CANON = "MATERIALS-PRODUCTION", "MAT-PROD"

def run():
    g = json.load(open(GRP, encoding="utf-8"))
    renamed = 0
    for d in g["destinations"]:
        for c in d.get("calls", []):
            hit = False
            for f in ID_FIELDS:
                v = c.get(f)
                if isinstance(v, str) and STALE in v:
                    c[f] = v.replace(STALE, CANON); hit = True
            if hit: renamed += 1
    # safety: no stray token left in any id field; count remaining anywhere (should be narrative-free -> 0)
    remaining_ids = sum(1 for d in g["destinations"] for c in d.get("calls", [])
                        for f in ID_FIELDS if isinstance(c.get(f), str) and STALE in c[f])
    remaining_any = json.dumps(g).count(STALE)
    json.dump(g, open(GRP, "w", encoding="utf-8"), ensure_ascii=False, indent=2)
    print(f"calls with an id field renamed: {renamed}")
    print(f"stale token left in id fields : {remaining_ids} (must be 0)")
    print(f"stale token left anywhere else: {remaining_any} (narrative/destination — left as-is)")

if __name__ == "__main__":
    run()
