#!/usr/bin/env python3
"""Generate a cluster's graph-repair Cypher from its merged file + merge report.

    python wp_merge.py CL3          # produces cluster_CL3.merged.v2.json + .merge-report.json
    python gen_wp_cypher.py CL3     # produces repair_CL3.cypher

Edit `wp_repair.cypher.tmpl` (the prose and the phases). The generated
`repair_<CLUSTER>.cypher` is overwritten every run - never hand-edit it.

Destination node ids are built with the builder's own `_slugify`, imported from
backend, so they can never drift from what `populate` writes.

Gotcha worth remembering: never put a trailing `// comment` after an element
inside a `:param` list. The comment swallows the comma and the list silently
becomes malformed.
"""
from __future__ import annotations

import json
import sys
from collections import Counter
from pathlib import Path

HERE = Path(__file__).resolve().parent
ROOT = HERE.parents[1]
sys.path.insert(0, str(HERE))
sys.path.insert(0, str(ROOT / "backend"))

import wp_clusters  # noqa: E402
from routes.new_pipeline.base_cluster_builder import _slugify  # noqa: E402

TEMPLATE = HERE / "wp_repair.cypher.tmpl"


def ne(v):
    return v not in (None, "", [], {})


def main(cluster: str):
    cfg = wp_clusters.get(cluster)
    merged = cfg.merged_out
    report_path = merged.with_name(f"cluster_{cfg.key}.merge-report.json")
    for p in (merged, report_path):
        if not p.exists():
            raise SystemExit(f"missing {p.name} - run `python wp_merge.py {cfg.key}` first")

    data = json.load(open(merged, encoding="utf-8"))
    report = json.load(open(report_path, encoding="utf-8"))

    dest_ids, pairs, calls = [], [], []
    for dest in data["destinations"]:
        did = f"{cfg.cluster_id}:{_slugify(dest['destination_title'])}"
        dest_ids.append((did, dest["destination_title"], len(dest["calls"])))
        for call in dest["calls"]:
            pairs.append((did, call["call_id"]))
            calls.append(call)

    call_ids = sorted(c["call_id"] for c in calls)
    trl = sum(1 for c in calls if ne(c.get("technology_readiness_level")))
    cancelled = sorted(c["call_id"] for c in calls if c.get("status") == "Cancelled")

    counts = "\n".join(
        f"//   {n:3d}  {title[:96]}"
        for _, title, n in sorted(dest_ids, key=lambda d: -d[2])
    )

    subs = {
        "@@CLUSTER@@": cfg.key,
        "@@CLUSTER_NODE_ID@@": cfg.cluster_id,
        "@@SOURCE_TAG@@": cfg.source_tag,
        "@@POPULATE@@": cfg.populate_path,
        "@@DOCUMENT@@": report["document"],
        "@@MERGED_FILE@@": merged.name,
        "@@CANONICAL_IDS@@": ",\n".join(f"  '{i}'" for i in call_ids),
        "@@ID_REWRITES@@": ",\n".join(f"  ['{a}','{b}']" for a, b in report["id_rewrites"]),
        "@@DEST_IDS@@": ",\n".join(f"  '{d}'" for d, _, _ in dest_ids),
        "@@MEMBERSHIP@@": ",\n".join(f"  ['{d}','{c}']" for d, c in pairs),
        "@@DEST_COUNTS@@": counts,
        "@@CALL_COUNT@@": str(len(call_ids)),
        "@@TRL_COUNT@@": str(trl),
        "@@CANCELLED@@": ", ".join(cancelled) if cancelled else "none",
    }

    text = TEMPLATE.read_text(encoding="utf-8")
    for token, value in subs.items():
        text = text.replace(token, value)
    left = [t for t in subs if t in text]
    if left:
        raise SystemExit(f"unsubstituted placeholder {left}")

    out = HERE / f"repair_{cfg.key}.cypher"
    out.write_text(text, encoding="utf-8")

    print(f"{out.name}")
    print(f"  calls        {len(call_ids)}")
    print(f"  destinations {len(dest_ids)}")
    print(f"  membership   {len(pairs)}")
    print(f"  id rewrites  {len(report['id_rewrites'])}")
    print(f"  cancelled    {len(cancelled)}")
    print(f"  TRL          {trl}")
    for _, title, n in sorted(dest_ids, key=lambda d: -d[2]):
        print(f"    {n:3d}  {title[:80]}")


if __name__ == "__main__":
    main(sys.argv[1] if len(sys.argv) > 1 else "CL4")
