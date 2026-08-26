#!/usr/bin/env python3
"""CL4 document+API merge, v2 - destination-correct.

What changed vs cl4_merge.py
----------------------------
1. **Destinations come from the work programme, not from the portal.** v1 kept whatever
   bucket the portal had put a call in and appended every PDF-only topic to "the bucket whose
   title contains 'space'". That put 15 unrelated 2027 topics under "Leadership in materials
   and production for Europe" (they carry `destination: "_unknown_destination"` from the
   portal) and dropped an INDUSTRY CSA (2027-01-MAT-PROD-50) into Space. v2 rebuilds every
   bucket from `cl4_destinations.destination_map()` and writes the same value into the call's
   own `destination` field, so the bucket and the field can never disagree again.
2. **Renames are renames.** SPACE-03-83/84 became SPACE-07-83/84 in the 2026-07-28 edition.
   v1 would keep the old pair AND add the new one. v2 applies RENAMES to the base first.
3. **Re-merge guard.** v1's base was the live grouped file, so running it twice merged a
   merged file. v2 defaults to the pristine API snapshot and refuses a base that is already
   merged.
4. Cancelled topics get `status: "Cancelled"`; the `min__contribution` typo is repaired; the
   truncated portal artefact ids are dropped; `TODAY` is the real run date.

Run:
    python cl4_merge_v2.py                      # writes cluster_CL4.merged.v2.json
    python cl4_merge_v2.py --promote            # also copies over the ingested grouped file
"""
from __future__ import annotations

import argparse
import json
import re
import shutil
import sys
from collections import Counter, OrderedDict
from datetime import date
from pathlib import Path

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE))

import cl4_wp_parser
import cl4_destinations
from cl4_destinations import OUTSIDE_DESTINATION_STRUCTURE

ROOT = HERE.parents[1]
PDF = ROOT / "pdf_files/2027 draft_20260824/HORIZON-CL4-2026-2027_2026-07-28 final.pdf"
# The pristine portal snapshot: 64 CL4 topics, no document content. This is the merge input.
# (`fetched_call_metadata_2026_2027.json` carries the same 64 CL4 entries.)
BASE = HERE / "cluster_CL4.grouped.PREPILOT.bak"
GROUPED = ROOT / "backend/routes/new_pipeline/output_files/cluster_CL4.grouped.json"
OUT = HERE / "cluster_CL4.merged.v2.json"

WP_EDITION = "HORIZON 2026-2027 / Part 7 - Digital, Industry and Space (2026-07-28 final)"
TODAY = date.today()

DOC_CONTENT = ["technology_readiness_level", "expected_outcome", "scope", "expected_impact",
               "admissibility_conditions", "eligibility_conditions", "procedure",
               "legal_and_financial_setup", "exceptional_page_limits"]

# Topic ids the 2026-07-28 edition renamed. Left side is what the portal snapshot still calls
# them; right side is the current work-programme id. Applied to the base BEFORE matching, so
# the topic is renamed rather than duplicated. The graph needs the same rename applied in
# place - see repair_cl4_destinations.cypher.
RENAMES = {
    "HORIZON-CL4-2027-SPACE-03-83": "HORIZON-CL4-2027-SPACE-07-83",
    "HORIZON-CL4-2027-SPACE-03-84": "HORIZON-CL4-2027-SPACE-07-84",
}

# Portal records whose id lost its topic token, e.g. "HORIZON-CL4-2026-02-two-stage". They
# duplicate a real topic (same title, same call) and are not topics in their own right.
ARTEFACT_ID_RE = re.compile(r'^HORIZON-CL4-20\d\d-\d\d-(?:two|single)-stages?$', re.I)

UNRESOLVED = "_unresolved_destination"


def ne(v):
    return v not in (None, "", [], {})


def norm_key(t):
    t = re.sub(r'(?i)-(two|single)-stages?$', '', t or '')
    t = re.sub(r'(?i)MATERIALS-PRODUCTION', 'MAT-PROD', t)
    return re.sub(r'[^A-Za-z0-9\-]+$', '', t).rstrip('-')


def eur(millions):
    try:
        return int(round(float(millions) * 1_000_000)) if millions else None
    except (TypeError, ValueError):
        return None


def prefix4(cid):
    p = cid.split("-")
    return "-".join(p[:4]) if len(p) >= 4 else cid


def derive_status(opening, deadline, cancelled=False):
    if cancelled:
        return "Cancelled"

    def d(x):
        try:
            return date.fromisoformat(str(x)[:10])
        except Exception:
            return None

    o, dl = d(opening), d(deadline)
    if dl and TODAY > dl:
        return "Closed"
    if o and TODAY < o:
        return "Forthcoming"
    if o or dl:
        return "Open"
    return ""


def is_cancelled(rec):
    return "CANCELLED" in (rec.get("call_title") or "").upper()


def build_document_call(cid, p, destination):
    """A topic the work programme defines but the portal API does not carry yet."""
    mn, mx = eur(p.get("min_contribution")), eur(p.get("max_contribution"))
    ec = f"{mn} - {mx}" if (mn or mx) else ""
    if ec and (mn is None or mx is None):
        v = mn or mx
        ec = f"{v} - {v}"
    cancelled = is_cancelled(p)
    note = "In the work programme but not yet in the portal API - dates/status indicative."
    if cid in OUTSIDE_DESTINATION_STRUCTURE:
        note += (" The work programme lists this under 'Indirectly managed actions', outside the "
                 "destination structure; filed under the Space destination for findability.")
    return {
        "call_id": cid, "original_call_id": cid, "topic_id": cid,
        "topic_title": p.get("call_title") or "", "call_title": p.get("call_title") or "",
        "name": p.get("call_title") or "",
        "type_of_action": p.get("type_of_action") or "", "call_type": p.get("type_of_action") or "",
        "technology_readiness_level": p.get("technology_readiness_level") or "",
        "expected_outcome": p.get("expected_outcome") or "", "scope": p.get("scope") or "",
        "admissibility_conditions": p.get("admissibility_conditions") or "",
        "eligibility_conditions": p.get("eligibility_conditions") or "",
        "procedure": p.get("procedure") or "",
        "legal_and_financial_setup": p.get("legal_and_financial_setup") or "",
        "exceptional_page_limits": p.get("exceptional_page_limits") or "",
        "expected_eu_contribution": ec,
        "min_contribution": mn, "max_contribution": mx,
        "indicative_budget": eur(p.get("indicative_budget")),
        "opening_date": "", "deadline": "", "deadlines": [], "deadline_model": "",
        "status": "Cancelled" if cancelled else "Forthcoming",
        "funding_link": "", "url": "",
        "callIdentifier": prefix4(cid), "callccm2Id": "", "keywords": [], "tags": [],
        "destination": destination,
        "content_source": "document", "schedule_source": "document",
        "wp_edition": WP_EDITION,
        "field_provenance": {**{f: "document" for f in DOC_CONTENT if ne(p.get(f))},
                             "expected_eu_contribution": "document",
                             "status": "document-cancelled" if cancelled else "document-indicative"},
        "provenance_note": note,
    }


def load_base(path):
    raw = json.load(open(path, encoding="utf-8"))
    dests = raw.get("destinations") if isinstance(raw, dict) else raw
    calls = [c for d in dests for c in (d.get("calls") or [])]
    already = [c for c in calls if c.get("content_source") or c.get("wp_edition")]
    if already:
        raise SystemExit(
            f"REFUSING TO RUN: {path.name} is already a merged file "
            f"({len(already)}/{len(calls)} calls carry content_source/wp_edition).\n"
            f"Merging a merged file double-applies enrichment and re-appends document topics.\n"
            f"Point --base at the pristine portal snapshot instead (default: {BASE.name})."
        )
    return calls


def run(pdf_path, base_path, out_path, promote):
    pdf = cl4_wp_parser.parse(pdf_path)
    destmap = cl4_destinations.destination_map(pdf_path)
    if set(pdf) != set(destmap):
        raise SystemExit("parser and destination map disagree on the topic set: "
                         f"{sorted(set(pdf) ^ set(destmap))}")
    pdf_by_key = {norm_key(k): v for k, v in pdf.items()}

    calls = load_base(base_path)
    report = {"renamed": [], "canonicalised": 0, "dropped_artefacts": [],
              "enriched": 0, "trl_added": 0, "added": [], "cancelled": [], "unresolved": []}

    # --- 1. repair ids on the base: portal spelling -> work-programme spelling -------------
    kept = []
    for c in calls:
        cid = c.get("call_id") or c.get("original_call_id") or ""
        if ARTEFACT_ID_RE.match(cid):
            report["dropped_artefacts"].append((cid, (c.get("call_title") or "")[:70]))
            continue
        c.setdefault("original_call_id", cid)
        if "MATERIALS-PRODUCTION" in cid:
            cid = cid.replace("MATERIALS-PRODUCTION", "MAT-PROD")
            report["canonicalised"] += 1
        if cid in RENAMES:
            report["renamed"].append((cid, RENAMES[cid]))
            cid = RENAMES[cid]
        c["call_id"] = cid
        if "min__contribution" in c:                      # long-standing builder-blind typo
            c["min_contribution"] = c.pop("min__contribution")
        kept.append(c)
    calls = kept

    # --- 2. enrich from the document ------------------------------------------------------
    for c in calls:
        cid = c["call_id"]
        p = pdf_by_key.get(norm_key(cid))
        prov = {}
        if p:
            for f in DOC_CONTENT:
                if ne(p.get(f)) and not ne(c.get(f)):     # additive: document fills blanks
                    c[f] = p[f]
                    prov[f] = "document"
            if prov.get("technology_readiness_level"):
                report["trl_added"] += 1
            report["enriched"] += 1
            c["content_source"] = "merged"
            if is_cancelled(p):
                c["call_title"] = p.get("call_title") or c.get("call_title")
                prov["call_title"] = "document"
        else:
            c["content_source"] = "api"
        cancelled = bool(p) and is_cancelled(p)
        if cancelled:
            report["cancelled"].append(cid)
        st = derive_status(c.get("opening_date"), c.get("deadline"), cancelled)
        if st:
            c["status"] = st
            c["schedule_source"] = "document-cancelled" if cancelled else "api"
        c["wp_edition"] = WP_EDITION
        if prov:
            c["field_provenance"] = prov

    # --- 3. append the topics the portal does not carry ------------------------------------
    have = {norm_key(c["call_id"]) for c in calls}
    for cid, p in pdf.items():
        if norm_key(cid) in have:
            continue
        calls.append(build_document_call(cid, p, destmap[cid]))
        report["added"].append(cid)
        if is_cancelled(p):
            report["cancelled"].append(cid)

    # --- 4. rebuild the buckets from the work programme ------------------------------------
    for c in calls:
        dest = destmap.get(c["call_id"])
        if not dest:
            dest = UNRESOLVED
            report["unresolved"].append(c["call_id"])
        c["destination"] = dest                # bucket and field now agree, by construction

    buckets = OrderedDict()
    for dest in list(dict.fromkeys(destmap.values())) + [UNRESOLVED]:
        buckets[dest] = []
    for c in calls:
        buckets.setdefault(c["destination"], []).append(c)
    destinations = [{"destination_title": k, "destination": k, "calls": v}
                    for k, v in buckets.items() if v]

    # --- 5. advertise the extra fields to the builder (ADR-0008 extension point) ------------
    ADV = ["technology_readiness_level", "content_source", "schedule_source", "wp_edition",
           "field_provenance", "provenance_note"]
    for d in destinations:
        for c in d["calls"]:
            if isinstance(c.get("field_provenance"), dict):
                c["field_provenance"] = json.dumps(c["field_provenance"], ensure_ascii=False,
                                                   sort_keys=True)
            c["_description_section_keys"] = [k for k in ADV if ne(c.get(k))]

    json.dump({"destinations": destinations}, open(out_path, "w", encoding="utf-8"),
              ensure_ascii=False, indent=2)

    # --- 6. report -------------------------------------------------------------------------
    total = sum(len(d["calls"]) for d in destinations)
    ids = [c["call_id"] for d in destinations for c in d["calls"]]
    dupes = [k for k, v in Counter(ids).items() if v > 1]
    print(f"PDF                : {pdf_path.name}  ({len(pdf)} topics)")
    print(f"base               : {base_path.name}")
    print(f"ids canonicalised  : {report['canonicalised']} (MATERIALS-PRODUCTION -> MAT-PROD)")
    print(f"ids renamed        : {len(report['renamed'])} {report['renamed']}")
    print(f"portal artefacts   : {len(report['dropped_artefacts'])} dropped")
    for cid, title in report["dropped_artefacts"]:
        print(f"                     - {cid}  ({title})")
    print(f"enriched from doc  : {report['enriched']}   TRL added: {report['trl_added']}")
    print(f"document-only added: {len(report['added'])} {report['added']}")
    print(f"cancelled topics   : {len(report['cancelled'])} {report['cancelled']}")
    print(f"unresolved dest    : {len(report['unresolved'])} {report['unresolved']}")
    print(f"duplicate ids      : {dupes if dupes else 'none'}")
    print(f"total calls        : {total}")
    print()
    for d in destinations:
        print(f"  {len(d['calls']):3d}  {d['destination_title'][:88]}")
    print(f"\nwritten: {out_path}")
    if dupes or report["unresolved"]:
        raise SystemExit("NOT SAFE TO PROMOTE - resolve the problems above first.")
    if promote:
        shutil.copy2(out_path, GROUPED)
        print(f"promoted -> {GROUPED}")


if __name__ == "__main__":
    ap = argparse.ArgumentParser()
    ap.add_argument("--pdf", type=Path, default=PDF)
    ap.add_argument("--base", type=Path, default=BASE)
    ap.add_argument("--out", type=Path, default=OUT)
    ap.add_argument("--promote", action="store_true",
                    help="copy the result over cluster_CL4.grouped.json")
    a = ap.parse_args()
    run(a.pdf, a.base, a.out, a.promote)
