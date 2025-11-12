
#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Batch runner for Horizon Europe WP parsers.

Usage examples:
  python he_wp_batch.py --input_dir ./pdf --out_dir ./out --pretty
  python he_wp_batch.py --input_dir ./pdf --out_dir ./out --merge_out ./out/merged_calls.json --pretty
"""
import argparse, json, sys, subprocess
from pathlib import Path

def main():
    ap = argparse.ArgumentParser(description="Process all PDFs in a folder with he_wp_parser_merged_patched.py")
    ap.add_argument("--input_dir", required=True, help="Directory containing PDFs (non-recursive by default)")
    ap.add_argument("--out_dir", required=True, help="Directory to write per-file JSON outputs")
    ap.add_argument("--merge_out", help="Optional path to write a merged JSON of all files")
    ap.add_argument("--recursive", action="store_true", help="Recurse into subdirectories")
    ap.add_argument("--pretty", action="store_true", help="Pretty-print JSON")
    ap.add_argument("--parser_path", default=str(Path(__file__).with_name("he_wp_parser_merged_patched.py")),
                    help="Path to the single-file parser (defaults next to this script)")
    args = ap.parse_args()

    in_dir = Path(args.input_dir)
    out_dir = Path(args.out_dir)
    out_dir.mkdir(parents=True, exist_ok=True)

    if not in_dir.exists():
        print(f"ERROR: input_dir not found: {in_dir}", file=sys.stderr)
        sys.exit(2)

    # Gather PDFs
    if args.recursive:
        pdfs = sorted([p for p in in_dir.rglob("*.pdf")])
    else:
        pdfs = sorted([p for p in in_dir.glob("*.pdf")])

    if not pdfs:
        print("No PDFs found.", file=sys.stderr)
        sys.exit(1)

    pretty_flag = ["--pretty"] if args.pretty else []
    merged = {"files": []}
    total_calls = 0
    total_dests = 0
    failures = []

    for pdf in pdfs:
        rel = pdf.relative_to(in_dir)
        out_json = out_dir / rel.with_suffix(".json")
        out_json.parent.mkdir(parents=True, exist_ok=True)

        cmd = [sys.executable, args.parser_path, "--input", str(pdf), "--out", str(out_json), *pretty_flag]
        proc = subprocess.run(cmd, capture_output=True, text=True)
        print(proc.stdout.strip())
        if proc.returncode != 0:
            if proc.stderr:
                print(proc.stderr.strip(), file=sys.stderr)
            failures.append((str(pdf), proc.returncode))
            continue

        # Summarize
        try:
            with open(out_json, "r", encoding="utf-8") as f:
                data = json.load(f)
            n_d = len(data.get("destinations", []))
            n_c = sum(len(d.get("calls", [])) for d in data.get("destinations", []))
            total_calls += n_c
            total_dests += n_d
            merged["files"].append({
                "file": str(pdf),
                "output": str(out_json),
                "destinations": data.get("destinations", [])
            })
        except Exception as e:
            print(f"WARN: Could not read {out_json}: {e}", file=sys.stderr)

    # Write merged if requested
    if args.merge_out:
        merge_path = Path(args.merge_out)
        merge_path.parent.mkdir(parents=True, exist_ok=True)
        with open(merge_path, "w", encoding="utf-8") as f:
            if args.pretty:
                json.dump(merged, f, ensure_ascii=False, indent=2)
            else:
                json.dump(merged, f, ensure_ascii=False)

    # Final summary
    print(f"\nSummary: {len(pdfs)} PDFs processed; {total_calls} calls across {total_dests} destinations.")
    if failures:
        print("Failures:")
        for fp, rc in failures:
            print(f" - {fp} (exit {rc})")

if __name__ == "__main__":
    main()
