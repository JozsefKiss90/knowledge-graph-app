#!/usr/bin/env python3
"""Bucket-A backfill (reconciliation Step-0): populate the STATIC `expected_eu_contribution`
field on grouped call records that left it blank, deriving it from the min/max contribution
already present — matching the format the (older) CL3-CL6 files use: "<min> - <max>".

WHY only this field (not `status`): `status` is dynamic and the only in-repo source
(`fetched_call_metadata_2026_2027.json`) is a stale pre-close snapshot (36% of calls have
past deadlines yet are still "Forthcoming"/"Open"; none are "Closed"). Importing it would
assert a wrong current state (ADR-0006). Status belongs to the ADR-0008 live state-join.

Idempotent: fills only blanks, only where min/max exist; never overwrites. Root cause is
upstream (`proposal-monitoring-app`: programme_groupers.py:241 / split_calls_by_cluster.py:358)
— this corrects the already-generated files the app ingests. Files are git-tracked (git = undo).
"""
import json, glob, os, re
from pathlib import Path

OUT = Path(__file__).resolve().parents[2] / "backend/routes/new_pipeline/output_files"

def blank(v): return v in (None, "", [], {})
def num(v):
    """Parse a positive contribution amount; treat 0 / 0.0 / non-numeric as ABSENT
    (a €0 floor is 'unspecified', not a real figure — never emit "0 - 0")."""
    try:
        f = float(v)
        return f if f > 0 else None
    except (TypeError, ValueError):
        return None

def sniff_indent(path):
    """Preserve the file's existing indentation to keep the git diff minimal."""
    with open(path, encoding="utf-8") as fh:
        head = fh.read(400)
    m = re.search(r'[\[{]\r?\n( +)', head)
    return len(m.group(1)) if m else None  # None -> compact

def fmt(mn, mx):
    if mn is None and mx is None: return None
    mn = mn if mn is not None else mx
    mx = mx if mx is not None else mn
    return f"{int(mn)} - {int(mx)}"

def run():
    files = sorted(glob.glob(str(OUT / "cluster_CL*.grouped.json")) +
                   glob.glob(str(OUT / "HORIZON-*.json")))
    print(f"{'file':34s} {'calls':>6} {'blank_before':>13} {'filled':>7} {'still_blank':>12}")
    grand = 0
    for f in files:
        d = json.load(open(f, encoding="utf-8"))
        if not (isinstance(d, dict) and "destinations" in d):
            continue
        calls = [c for dest in d["destinations"] for c in dest.get("calls", [])]
        blank_before = sum(1 for c in calls if blank(c.get("expected_eu_contribution")))
        filled = 0
        for c in calls:
            if not blank(c.get("expected_eu_contribution")):
                continue
            mn = num(c.get("min_contribution"))
            if mn is None:
                mn = num(c.get("min__contribution"))   # CL4 double-underscore typo
            mx = num(c.get("max_contribution"))
            s = fmt(mn, mx)
            if s is not None:
                c["expected_eu_contribution"] = s
                filled += 1
        still = blank_before - filled
        if filled:
            indent = sniff_indent(f)
            with open(f, "w", encoding="utf-8") as fh:
                json.dump(d, fh, ensure_ascii=False, indent=indent)
                if indent is not None:
                    fh.write("\n")
            grand += filled
        print(f"{os.path.basename(f):34s} {len(calls):6d} {blank_before:13d} {filled:7d} {still:12d}")
    print(f"\nTOTAL expected_eu_contribution filled: {grand}")

if __name__ == "__main__":
    run()
