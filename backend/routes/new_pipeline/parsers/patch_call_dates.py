#!/usr/bin/env python3
# -*- coding: utf-8 -*-

import argparse
import json
import sys
from pathlib import Path
from typing import Any, Dict, Optional


def load_json(path: Path) -> Any:
    with path.open("r", encoding="utf-8") as f:
        return json.load(f)


def save_json(path: Path, obj: Any, pretty: bool) -> None:
    with path.open("w", encoding="utf-8") as f:
        if pretty:
            json.dump(obj, f, ensure_ascii=False, indent=2)
        else:
            json.dump(obj, f, ensure_ascii=False)


def call_prefix_first_4(call_id: str) -> str:
    """
    Derive call prefix as first 4 parts split by '-'.
    Example: HORIZON-HLTH-2027-01-STAYHLTH-01 -> HORIZON-HLTH-2027-01
    """
    if not call_id:
        return ""
    parts = call_id.split("-")
    if len(parts) < 4:
        return call_id
    return "-".join(parts[:4])


def build_prefix_index(destination_dates: Dict[str, Any]) -> Dict[str, Dict[str, Any]]:
    """
    Supports your generated schema (Schema A):
      {
        "<destination title>": {
          "calls": {
            "<CALL_PREFIX>": { "opening_date": "...", "deadline": "...", ... },
            ...
          }
        },
        ...
      }

    Builds a global index: { "<CALL_PREFIX>": window_dict }
    Keeps the first seen window per prefix.
    """
    idx: Dict[str, Dict[str, Any]] = {}

    if not isinstance(destination_dates, dict):
        return idx

    for _dest_title, payload in destination_dates.items():
        if not isinstance(payload, dict):
            continue
        calls = payload.get("calls")
        if not isinstance(calls, dict):
            continue
        for cp, window in calls.items():
            if not isinstance(cp, str) or not cp.strip():
                continue
            if not isinstance(window, dict):
                continue
            cp = cp.strip()
            if cp not in idx:
                idx[cp] = window

    return idx


def apply_dates_to_grouped(grouped: Dict[str, Any], prefix_index: Dict[str, Dict[str, Any]]) -> int:
    """
    Mutates grouped JSON in-place. Returns number of calls updated.
    """
    updated = 0
    destinations = grouped.get("destinations", [])
    if not isinstance(destinations, list):
        return 0

    for dest in destinations:
        if not isinstance(dest, dict):
            continue
        calls = dest.get("calls", [])
        if not isinstance(calls, list):
            continue

        for call in calls:
            if not isinstance(call, dict):
                continue

            cid = call.get("call_id") or ""
            if not isinstance(cid, str) or not cid:
                continue

            cp = call_prefix_first_4(cid)
            window = prefix_index.get(cp)
            if not window:
                continue

            # opening_date
            if "opening_date" in window and window.get("opening_date") is not None:
                call["opening_date"] = window.get("opening_date")

            # deadlines (single-stage or 2-stage)
            if "deadline_first_stage" in window or "deadline_second_stage" in window:
                # keep explicit two-stage fields if present
                if "deadline_first_stage" in window and window.get("deadline_first_stage") is not None:
                    call["deadline_first_stage"] = window.get("deadline_first_stage")
                if "deadline_second_stage" in window and window.get("deadline_second_stage") is not None:
                    call["deadline_second_stage"] = window.get("deadline_second_stage")

                # convenience "deadline": prefer second-stage, else first-stage, else deadline if provided
                call["deadline"] = (
                    window.get("deadline_second_stage")
                    or window.get("deadline_first_stage")
                    or window.get("deadline")
                )
            else:
                if "deadline" in window and window.get("deadline") is not None:
                    call["deadline"] = window.get("deadline")

            updated += 1

    return updated


def main() -> int:
    ap = argparse.ArgumentParser(
        description="Patch clustered .grouped.json calls with opening/deadline dates from destination_dates_*.json"
    )
    ap.add_argument("--grouped", required=True, help="Path to cluster_CLx.grouped.json")
    ap.add_argument("--dates", required=True, help="Path to destination_dates_clx.json")
    ap.add_argument("--out", default=None, help="Output path (default: overwrite --grouped)")
    ap.add_argument("--pretty", action="store_true", help="Pretty-print JSON output")
    args = ap.parse_args()

    grouped_path = Path(args.grouped)
    dates_path = Path(args.dates)
    out_path = Path(args.out) if args.out else grouped_path

    if not grouped_path.exists():
        print(f"ERROR: grouped file not found: {grouped_path}", file=sys.stderr)
        return 2
    if not dates_path.exists():
        print(f"ERROR: dates file not found: {dates_path}", file=sys.stderr)
        return 2

    grouped = load_json(grouped_path)
    destination_dates = load_json(dates_path)

    if not isinstance(grouped, dict):
        print("ERROR: grouped JSON root must be an object/dict", file=sys.stderr)
        return 2
    if not isinstance(destination_dates, dict):
        print("ERROR: destination_dates JSON root must be an object/dict", file=sys.stderr)
        return 2

    prefix_index = build_prefix_index(destination_dates)
    updated = apply_dates_to_grouped(grouped, prefix_index)

    save_json(out_path, grouped, pretty=args.pretty)

    total_calls = 0
    if isinstance(grouped.get("destinations"), list):
        total_calls = sum(len(d.get("calls", [])) for d in grouped["destinations"] if isinstance(d, dict))

    print(f"OK: updated {updated}/{total_calls} calls -> {out_path}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
