#!/usr/bin/env python3
"""
update_call_dates.py

Merge destination-level call opening/deadline dates (destination_dates_clX.json)
into the corresponding grouped call JSON (cluster_CLX.grouped.json).

What it does:
- Matches destinations primarily by destination_key (if present), otherwise by
  destination_title (robust normalization).
- For each call, finds the best matching call window by longest call_prefix
  that matches call_id.startswith(call_prefix).
- Writes opening/deadline fields onto each call:
    - opening_date
    - deadline
    - deadline_first_stage (if provided)
    - deadline_second_stage (if provided)

Usage examples:
1) Batch process all clusters in a directory (recommended):
   python update_call_dates.py --input-dir . --output-dir ./out

2) Overwrite grouped files in place:
   python update_call_dates.py --input-dir . --inplace

3) Process one explicit pair:
   python update_call_dates.py \
     --grouped cluster_CL2.grouped.json \
     --dates destination_dates_cl2.json \
     --out cluster_CL2.grouped.json
"""

from __future__ import annotations

import argparse
import json
import re
from dataclasses import dataclass
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple


def load_json(path: Path) -> Any:
    with path.open("r", encoding="utf-8") as f:
        return json.load(f)


def dump_json(path: Path, data: Any, pretty: bool = True) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("w", encoding="utf-8") as f:
        if pretty:
            json.dump(data, f, ensure_ascii=False, indent=2)
        else:
            json.dump(data, f, ensure_ascii=False)


def norm_title(s: str) -> str:
    """
    Normalise destination titles for matching.
    - lower
    - collapse whitespace
    - remove most punctuation
    """
    s = (s or "").strip().casefold()
    s = re.sub(r"\s+", " ", s)
    s = re.sub(r"[^a-z0-9 ]+", "", s)
    s = re.sub(r"\s+", " ", s).strip()
    return s


@dataclass(frozen=True)
class CallWindow:
    call_prefix: str
    opening_date: Optional[str]
    deadline: Optional[str]
    deadline_first_stage: Optional[str]
    deadline_second_stage: Optional[str]
    type: Optional[str]


@dataclass(frozen=True)
class DatesDestination:
    destination_key: Optional[str]
    destination_title: Optional[str]
    call_windows: List[CallWindow]


def parse_dates_file(dates_json: Dict[str, Any]) -> List[DatesDestination]:
    dests = []
    for d in dates_json.get("destinations", []):
        windows: List[CallWindow] = []
        for w in d.get("call_windows", []):
            windows.append(
                CallWindow(
                    call_prefix=str(w.get("call_prefix") or "").strip(),
                    opening_date=w.get("opening_date"),
                    deadline=w.get("deadline"),
                    deadline_first_stage=w.get("deadline_first_stage"),
                    deadline_second_stage=w.get("deadline_second_stage"),
                    type=w.get("type"),
                )
            )
        dests.append(
            DatesDestination(
                destination_key=d.get("destination_key"),
                destination_title=d.get("destination_title"),
                call_windows=windows,
            )
        )
    return dests


def best_window_for_call(call_id: str, windows: List[CallWindow]) -> Optional[CallWindow]:
    """
    Choose the most specific window: the one with the longest call_prefix that matches.
    """
    call_id = call_id or ""
    candidates = [w for w in windows if w.call_prefix and call_id.startswith(w.call_prefix)]
    if not candidates:
        return None
    candidates.sort(key=lambda w: len(w.call_prefix), reverse=True)
    return candidates[0]


def build_destination_index(dates_dests: List[DatesDestination]) -> Tuple[Dict[str, DatesDestination], Dict[str, DatesDestination]]:
    """
    Two indices:
    - by destination_key
    - by normalised destination_title
    """
    by_key: Dict[str, DatesDestination] = {}
    by_title: Dict[str, DatesDestination] = {}

    for d in dates_dests:
        if d.destination_key:
            by_key[str(d.destination_key)] = d
        if d.destination_title:
            by_title[norm_title(d.destination_title)] = d

    return by_key, by_title


def update_grouped(grouped: Dict[str, Any], dates: Dict[str, Any]) -> Tuple[Dict[str, Any], Dict[str, int]]:
    dates_dests = parse_dates_file(dates)
    by_key, by_title = build_destination_index(dates_dests)

    stats = {
        "destinations_total": 0,
        "destinations_matched": 0,
        "calls_total": 0,
        "calls_updated": 0,
        "calls_unmatched": 0,
    }

    grouped_dests = grouped.get("destinations", [])
    if not isinstance(grouped_dests, list):
        raise ValueError("Grouped JSON: expected top-level key 'destinations' to be a list.")

    stats["destinations_total"] = len(grouped_dests)

    for gd in grouped_dests:
        if not isinstance(gd, dict):
            continue

        g_key = gd.get("destination_key")
        g_title = gd.get("destination_title")

        dd: Optional[DatesDestination] = None

        if isinstance(g_key, str) and g_key in by_key:
            dd = by_key[g_key]
        elif isinstance(g_title, str):
            dd = by_title.get(norm_title(g_title))

        if dd is None:
            # No destination match; still count calls but cannot update.
            calls = gd.get("calls", []) if isinstance(gd.get("calls", []), list) else []
            stats["calls_total"] += len(calls)
            stats["calls_unmatched"] += len(calls)
            continue

        stats["destinations_matched"] += 1

        # Optionally enrich destination with destination_key if missing
        if dd.destination_key and not gd.get("destination_key"):
            gd["destination_key"] = dd.destination_key

        calls = gd.get("calls", [])
        if not isinstance(calls, list):
            continue

        stats["calls_total"] += len(calls)

        for c in calls:
            if not isinstance(c, dict):
                stats["calls_unmatched"] += 1
                continue

            call_id = c.get("call_id") or ""
            w = best_window_for_call(str(call_id), dd.call_windows)
            if w is None:
                stats["calls_unmatched"] += 1
                continue

            # Apply fields
            if w.opening_date is not None:
                c["opening_date"] = w.opening_date

            # Single-stage typically uses 'deadline'
            # Two-stage may have explicit first/second stage fields.
            if w.deadline is not None:
                c["deadline"] = w.deadline
            elif w.deadline_first_stage is not None:
                # fallback: store something useful in 'deadline'
                c["deadline"] = w.deadline_first_stage

            if w.deadline_first_stage is not None:
                c["deadline_first_stage"] = w.deadline_first_stage
            if w.deadline_second_stage is not None:
                c["deadline_second_stage"] = w.deadline_second_stage

            if w.type is not None:
                c["call_stage_type"] = w.type  # optional but useful for frontend

            stats["calls_updated"] += 1

    return grouped, stats


def infer_cluster_id(path: Path) -> Optional[str]:
    """
    Extract CL number from filenames like:
    - destination_dates_cl2.json
    - cluster_CL2.grouped.json
    """
    m = re.search(r"(?:CL|cl)(\d+)", path.name)
    return m.group(1) if m else None


def batch_pairs(input_dir: Path) -> List[Tuple[Path, Path]]:
    """
    Pair cluster_CLX.grouped.json with destination_dates_clX.json by X.
    """
    grouped_files = list(input_dir.glob("cluster_CL*.grouped.json"))
    dates_files = list(input_dir.glob("destination_dates_cl*.json"))

    dates_by_id: Dict[str, Path] = {}
    for d in dates_files:
        cid = infer_cluster_id(d)
        if cid:
            dates_by_id[cid] = d

    pairs: List[Tuple[Path, Path]] = []
    for g in grouped_files:
        cid = infer_cluster_id(g)
        if cid and cid in dates_by_id:
            pairs.append((g, dates_by_id[cid]))

    # stable order by cluster id
    pairs.sort(key=lambda t: int(infer_cluster_id(t[0]) or 9999))
    return pairs


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--input-dir", type=Path, default=None, help="Directory containing cluster_CL*.grouped.json and destination_dates_cl*.json")
    ap.add_argument("--output-dir", type=Path, default=None, help="Where to write updated grouped JSON files (batch mode).")
    ap.add_argument("--inplace", action="store_true", help="Overwrite grouped JSON files (batch mode).")

    ap.add_argument("--grouped", type=Path, default=None, help="Single grouped file to process.")
    ap.add_argument("--dates", type=Path, default=None, help="Single destination_dates file to apply.")
    ap.add_argument("--out", type=Path, default=None, help="Output file for single-pair mode.")

    ap.add_argument("--pretty", action="store_true", default=True, help="Pretty-print JSON output (default: true).")
    ap.add_argument("--compact", action="store_true", help="Write compact JSON (disables pretty).")

    args = ap.parse_args()
    pretty = (not args.compact)

    # Single pair mode
    if args.grouped and args.dates:
        grouped_path = args.grouped
        dates_path = args.dates
        out_path = args.out or grouped_path

        grouped = load_json(grouped_path)
        dates = load_json(dates_path)
        updated, stats = update_grouped(grouped, dates)
        dump_json(out_path, updated, pretty=pretty)

        print(f"Updated: {grouped_path.name} using {dates_path.name}")
        print(json.dumps(stats, indent=2))
        return

    # Batch mode
    if not args.input_dir:
        ap.error("Provide either (--grouped AND --dates) or --input-dir for batch processing.")

    input_dir: Path = args.input_dir
    if not input_dir.exists():
        raise FileNotFoundError(f"--input-dir not found: {input_dir}")

    pairs = batch_pairs(input_dir)
    if not pairs:
        raise RuntimeError(
            f"No pairs found in {input_dir}. Expected files like "
            f"'cluster_CL2.grouped.json' and 'destination_dates_cl2.json'."
        )

    if args.inplace:
        output_dir = input_dir
    else:
        output_dir = args.output_dir or (input_dir / "updated_grouped")

    all_stats: List[Dict[str, int]] = []

    for grouped_path, dates_path in pairs:
        grouped = load_json(grouped_path)
        dates = load_json(dates_path)
        updated, stats = update_grouped(grouped, dates)

        if args.inplace:
            out_path = grouped_path
        else:
            out_path = output_dir / grouped_path.name

        dump_json(out_path, updated, pretty=pretty)

        stats_out = dict(stats)
        stats_out["cluster"] = infer_cluster_id(grouped_path) or "?"
        all_stats.append(stats_out)

        print(f"OK: {grouped_path.name} <- {dates_path.name} -> {out_path}")

    # Summary
    totals = {
        "destinations_total": sum(s["destinations_total"] for s in all_stats),
        "destinations_matched": sum(s["destinations_matched"] for s in all_stats),
        "calls_total": sum(s["calls_total"] for s in all_stats),
        "calls_updated": sum(s["calls_updated"] for s in all_stats),
        "calls_unmatched": sum(s["calls_unmatched"] for s in all_stats),
    }
    print("Batch totals:")
    print(json.dumps(totals, indent=2))


if __name__ == "__main__": 
    main()
