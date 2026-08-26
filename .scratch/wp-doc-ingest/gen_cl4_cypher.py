#!/usr/bin/env python3
"""Regenerate the CL4 repair/cleanup Cypher from the current merged file.

The two .cypher files embed the canonical topic set, the canonical Destination
node ids and the (destination, call) membership. Those must always match
`cluster_CL4.merged.v2.json`, so they are generated rather than hand-edited:

    python cl4_merge_v2.py --promote      # rebuild the merged file first
    python gen_cl4_cypher.py              # then regenerate the Cypher

Edit the *.cypher.tmpl files (the prose and the phases), never the .cypher
output - it is overwritten. Placeholders:
    @@CANONICAL_IDS@@   repair_cl4_destinations.cypher.tmpl
    @@DEST_IDS@@        cleanup_cl4_destinations.cypher.tmpl
    @@MEMBERSHIP@@      cleanup_cl4_destinations.cypher.tmpl

Destination node ids are built with the builder's own `_slugify`, imported from
backend, so they can never drift from what `populate` writes.
"""
import json
import sys
from pathlib import Path

HERE = Path(__file__).resolve().parent
ROOT = HERE.parents[1]
sys.path.insert(0, str(ROOT / "backend"))

from routes.new_pipeline.base_cluster_builder import _slugify  # noqa: E402

MERGED = HERE / "cluster_CL4.merged.v2.json"
CLUSTER_ID = "CL4"


def main():
    data = json.load(open(MERGED, encoding="utf-8"))
    dest_ids, pairs, call_ids = [], [], []
    for dest in data["destinations"]:
        did = f"{CLUSTER_ID}:{_slugify(dest['destination_title'])}"
        dest_ids.append(did)
        for call in dest["calls"]:
            pairs.append((did, call["call_id"]))
            call_ids.append(call["call_id"])

    subs = {
        "@@CANONICAL_IDS@@": ",\n".join(f"  '{i}'" for i in sorted(call_ids)),
        "@@DEST_IDS@@": ",\n".join(f"  '{i}'" for i in dest_ids),
        "@@MEMBERSHIP@@": ",\n".join(f"  ['{d}','{c}']" for d, c in pairs),
    }

    for tmpl in sorted(HERE.glob("*.cypher.tmpl")):
        text = tmpl.read_text(encoding="utf-8")
        for token, value in subs.items():
            text = text.replace(token, value)
        left = [t for t in subs if t in text]
        if left:
            raise SystemExit(f"{tmpl.name}: unsubstituted placeholder {left}")
        out = tmpl.with_suffix("")            # drop .tmpl
        out.write_text(text, encoding="utf-8")
        print(f"{out.name:<40} <- {tmpl.name}")

    print(f"\n{len(dest_ids)} destinations, {len(call_ids)} calls, {len(pairs)} membership pairs")


if __name__ == "__main__":
    main()
