#!/usr/bin/env python3
"""Offline verification of a merged file, driven through the REAL builder.

Instantiates `BaseClusterBuilder` against a dummy DB and runs `_build_call_props`
and `_get_summary` on every call, so a merged file is proven ingestable before it
is promoted - no Neo4j, no populate, no risk.

    python wp_verify.py CL3 CL4
"""
from __future__ import annotations

import json
import sys
from pathlib import Path

HERE = Path(__file__).resolve().parent
ROOT = HERE.parents[1]
sys.path.insert(0, str(HERE))
sys.path.insert(0, str(ROOT / "backend"))

import wp_clusters  # noqa: E402
from routes.new_pipeline.base_cluster_builder import BaseClusterBuilder  # noqa: E402


class _DummyDB:
    def session(self, *a, **k):
        return self

    def __enter__(self):
        return self

    def __exit__(self, *a):
        return False

    def run(self, q, p=None, **k):
        return []


def verify(key: str) -> bool:
    cfg = wp_clusters.get(key)

    class B(BaseClusterBuilder):
        cluster_id = cfg.cluster_id
        cluster_name = cfg.cluster_name
        source_tag = cfg.source_tag

    b = B.__new__(B)
    b.db = _DummyDB()

    data = json.load(open(cfg.merged_out, encoding="utf-8"))
    summaries = json.load(open(cfg.summaries, encoding="utf-8"))
    calls = [c for d in data["destinations"] for c in d["calls"]]

    ok = err = trl = 0
    problems = []
    print(f"===== {cfg.key}  ({cfg.merged_out.name})")
    for dest in data["destinations"]:
        summary = b._get_summary(summaries, dest["destination_title"])
        if not summary:
            problems.append(f"no summary for destination {dest['destination_title']!r}")
        print(f"  summary {'OK  ' if summary else 'MISS'} {len(dest['calls']):3d} calls  "
              f"{dest['destination_title'][:64]}")
        for c in dest["calls"]:
            try:
                props = b._build_call_props(c, c["call_id"])
                ok += 1
                if props.get("technology_readiness_level"):
                    trl += 1
            except Exception as ex:                      # noqa: BLE001
                err += 1
                problems.append(f"{c['call_id']}: {type(ex).__name__}: {ex}")

    ids = [c["call_id"] for c in calls]
    if len(set(ids)) != len(ids):
        problems.append("duplicate call ids")
    if any(d["destination_title"] != c["destination"]
           for d in data["destinations"] for c in d["calls"]):
        problems.append("a call's `destination` disagrees with its bucket")
    unknown = [c["call_id"] for c in calls
               if str(c.get("destination", "")).startswith("_un")]
    if unknown:
        problems.append(f"unresolved destination on {len(unknown)} calls: {unknown[:5]}")
    typo = [c["call_id"] for c in calls if "min__contribution" in c]
    if typo:
        problems.append(f"min__contribution typo on {len(typo)} calls")

    print(f"  built {ok} / {len(calls)}   errors {err}   TRL node props {trl}")
    print(f"  min_contribution set {sum(1 for c in calls if c.get('min_contribution') is not None)}"
          f"/{len(calls)}")
    if problems:
        print("  PROBLEMS:")
        for p in problems:
            print(f"    - {p}")
    else:
        print("  OK - safe to promote")
    return not problems


if __name__ == "__main__":
    keys = sys.argv[1:] or sorted(wp_clusters.CLUSTERS)
    if not all([verify(k) for k in keys]):
        raise SystemExit(1)
