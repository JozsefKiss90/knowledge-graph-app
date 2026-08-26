#!/usr/bin/env python3
"""Work-programme document + portal API merge (ADR-0008), generalised across clusters.

Generalisation of `cl4_merge_v2.py`. Everything cluster-specific lives in
`wp_clusters.py`; this file is the same for every cluster.

What it does
  1. repairs ids on the pristine portal snapshot (renames from the current edition,
     drops portal records whose id lost its topic token);
  2. enriches each matched call with document content (TRL above all, plus any blank
     content field the document fills), tagging `field_provenance`;
  3. appends the topics the document defines but the portal does not carry;
  4. **rebuilds every destination bucket from the document** and writes the same value
     into the call's own `destination` field, so bucket and field cannot disagree;
  5. recomputes `status` from the dates, marks CANCELLED topics;
  6. advertises the extra fields through `_description_section_keys` so the builder
     ingests them with zero builder changes.

Run:
    python wp_merge.py CL3                 # writes cluster_CL3.merged.v2.json
    python wp_merge.py CL3 --promote       # also copies over the ingested grouped file
"""
from __future__ import annotations

import argparse
import json
import shutil
import sys
from collections import Counter, OrderedDict, defaultdict
from datetime import date
from pathlib import Path

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE))

import wp_clusters
import wp_destinations
import wp_parser

TODAY = date.today()

DOC_CONTENT = ["technology_readiness_level", "expected_outcome", "scope", "expected_impact",
               "admissibility_conditions", "eligibility_conditions", "procedure",
               "legal_and_financial_setup", "exceptional_page_limits"]

ADVERTISED = ["technology_readiness_level", "content_source", "schedule_source", "wp_edition",
              "field_provenance", "provenance_note"]

UNRESOLVED = "_unresolved_destination"


def ne(v):
    return v not in (None, "", [], {})


def norm_key(t: str) -> str:
    """Join key that survives the portal's id variants."""
    import re
    t = re.sub(r'(?i)-(two|single)-stages?$', '', t or '')
    t = re.sub(r'(?i)MATERIALS-PRODUCTION', 'MAT-PROD', t)   # portal vintage alias (CL4)
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


def call_id_of(c):
    return c.get("call_id") or c.get("original_call_id") or c.get("identifier") or c.get("topic_id") or ""


def find_title_artefacts(calls, defined):
    """Portal records that duplicate a real topic's title under a less specific id.

    The portal sometimes emits a CALL-level record alongside the topic records and
    gives it an id with the topic token missing - `HORIZON-CL4-2026-02-two-stage`
    beside `...-02-MAT-PROD-21-two-stage`, `HORIZON-CL3-2026-02-CS-ECCC` beside
    `...-CS-ECCC-01`. They are not topics, they inflate the count, and one of them
    lands in `_unknown_destination`.

    Cluster-agnostic rule: an id the document does not define, whose title is
    exactly some other call's title, where that other id is longer (more specific).
    Every drop is reported so it can be audited.
    """
    by_title = defaultdict(list)
    for c in calls:
        t = (c.get("call_title") or c.get("topic_title") or "").strip().lower()
        if t:
            by_title[t].append(c)
    out = []
    for c in calls:
        cid = call_id_of(c)
        if not cid or norm_key(cid) in defined:
            continue
        t = (c.get("call_title") or c.get("topic_title") or "").strip().lower()
        twins = [o for o in by_title.get(t, []) if o is not c and len(call_id_of(o)) > len(cid)]
        if twins:
            out.append((c, call_id_of(twins[0])))
    return out


def load_base(path: Path):
    raw = json.load(open(path, encoding="utf-8"))
    dests = raw.get("destinations") if isinstance(raw, dict) else raw
    calls = []
    for d in dests:
        bucket = (d.get("destination") or d.get("destination_title") or "").strip()
        for c in d.get("calls") or []:
            c["_base_bucket"] = bucket
            calls.append(c)
    already = [c for c in calls if c.get("content_source") or c.get("wp_edition")]
    if already:
        raise SystemExit(
            f"REFUSING TO RUN: {path.name} is already a merged file "
            f"({len(already)}/{len(calls)} calls carry content_source/wp_edition).\n"
            f"Merging a merged file double-applies enrichment and re-appends document "
            f"topics. Point --base at the pristine portal snapshot."
        )
    return calls


def build_document_call(cid, p, destination, cfg):
    """A topic the work programme defines but the portal API does not carry yet."""
    mn, mx = eur(p.get("min_contribution")), eur(p.get("max_contribution"))
    ec = f"{mn} - {mx}" if (mn or mx) else ""
    if ec and (mn is None or mx is None):
        v = mn or mx
        ec = f"{v} - {v}"
    cancelled = is_cancelled(p)
    note = "In the work programme but not yet in the portal API - dates/status indicative."
    if cid in cfg.outside_destination_structure:
        note += (" The work programme lists this outside the destination structure "
                 "(Indirectly managed actions); filed here for findability.")
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
        "wp_edition": cfg.wp_edition,
        "field_provenance": {**{f: "document" for f in DOC_CONTENT if ne(p.get(f))},
                             "expected_eu_contribution": "document",
                             "status": "document-cancelled" if cancelled else "document-indicative"},
        "provenance_note": note,
    }


def run(cluster, base_path=None, out_path=None, promote=False):
    cfg = wp_clusters.get(cluster)
    base_path = Path(base_path) if base_path else cfg.base
    out_path = Path(out_path) if out_path else cfg.merged_out

    pdf = wp_parser.parse(cfg.key)
    destmap = wp_destinations.destination_map(cfg.key)
    if set(pdf) != set(destmap):
        raise SystemExit(f"parser and destination map disagree on the topic set: "
                         f"{sorted(set(pdf) ^ set(destmap))}")
    canonical_dests = list(dict.fromkeys(destmap.values()))
    pdf_by_key = {norm_key(k): v for k, v in pdf.items()}

    calls = load_base(base_path)
    rep = {"renamed": [], "canonicalised": 0, "dropped": [], "enriched": 0, "trl_added": 0,
           "added": [], "cancelled": [], "api_only": [], "unresolved": [], "id_rewrites": []}

    # --- 1. repair ids ---------------------------------------------------------------
    artefacts = {id(c): twin for c, twin in find_title_artefacts(calls, set(pdf_by_key))}
    kept = []
    for c in calls:
        cid = call_id_of(c)
        if id(c) in artefacts:
            rep["dropped"].append((cid, artefacts[id(c)], (c.get("call_title") or "")[:60]))
            continue
        c.setdefault("original_call_id", cid)
        original = cid
        if "MATERIALS-PRODUCTION" in cid:
            cid = cid.replace("MATERIALS-PRODUCTION", "MAT-PROD")
            rep["canonicalised"] += 1
        if cid in cfg.renames:
            rep["renamed"].append((cid, cfg.renames[cid]))
            cid = cfg.renames[cid]
        if cid != original:
            # the graph still holds `original`; the Cypher renames it in place so the
            # CORDIS edges attached to that node survive
            rep["id_rewrites"].append([original, cid])
        c["call_id"] = cid
        if "min__contribution" in c:                  # long-standing builder-blind typo
            c["min_contribution"] = c.pop("min__contribution")
        kept.append(c)
    calls = kept

    # --- 2. enrich from the document -------------------------------------------------
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
                rep["trl_added"] += 1
            rep["enriched"] += 1
            c["content_source"] = "merged"
            if is_cancelled(p):
                c["call_title"] = p.get("call_title") or c.get("call_title")
                prov["call_title"] = "document"
        else:
            c["content_source"] = "api"
            rep["api_only"].append(cid)
        cancelled = bool(p) and is_cancelled(p)
        if cancelled:
            rep["cancelled"].append(cid)
        st = derive_status(c.get("opening_date"), c.get("deadline"), cancelled)
        if st:
            c["status"] = st
            c["schedule_source"] = "document-cancelled" if cancelled else "api"
        c["wp_edition"] = cfg.wp_edition
        if prov:
            c["field_provenance"] = prov

    # --- 3. append the topics the portal does not carry --------------------------------
    have = {norm_key(c["call_id"]) for c in calls}
    for cid, p in pdf.items():
        if norm_key(cid) in have:
            continue
        calls.append(build_document_call(cid, p, destmap[cid], cfg))
        rep["added"].append(cid)
        if is_cancelled(p):
            rep["cancelled"].append(cid)

    # --- 4. rebuild the buckets from the document --------------------------------------
    # The document decides. A call the document does not define (a portal-only topic such
    # as CL3's ECCC cybersecurity calls) keeps the bucket the portal put it in, but ONLY
    # if that bucket is a real destination; otherwise it is parked loudly.
    for c in calls:
        dest = destmap.get(c["call_id"])
        if not dest:
            base_bucket = (c.get("_base_bucket") or "").strip()
            if base_bucket in canonical_dests:
                dest = base_bucket
            else:
                dest = UNRESOLVED
                rep["unresolved"].append(c["call_id"])
        c["destination"] = dest                # bucket and field agree, by construction
        c.pop("_base_bucket", None)

    buckets = OrderedDict((d, []) for d in canonical_dests + [UNRESOLVED])
    for c in calls:
        buckets.setdefault(c["destination"], []).append(c)
    destinations = [{"destination_title": k, "destination": k, "calls": v}
                    for k, v in buckets.items() if v]

    # --- 5. advertise the extra fields to the builder (ADR-0008 extension point) --------
    for d in destinations:
        for c in d["calls"]:
            if isinstance(c.get("field_provenance"), dict):
                c["field_provenance"] = json.dumps(c["field_provenance"], ensure_ascii=False,
                                                   sort_keys=True)
            c["_description_section_keys"] = [k for k in ADVERTISED if ne(c.get(k))]

    json.dump({"destinations": destinations}, open(out_path, "w", encoding="utf-8"),
              ensure_ascii=False, indent=2)

    # Sidecar for gen_wp_cypher.py. Renames configured for this edition are included
    # even when the portal snapshot never had the old id: a previous ingest may have
    # written it into the graph from an earlier document edition.
    known = {tuple(x) for x in rep["id_rewrites"]}
    for old, new in cfg.renames.items():
        if (old, new) not in known:
            rep["id_rewrites"].append([old, new])
    report_path = out_path.with_name(f"cluster_{cfg.key}.merge-report.json")
    json.dump({
        "cluster": cfg.key,
        "cluster_node_id": cfg.cluster_id,
        "source_tag": cfg.source_tag,
        "populate_path": cfg.populate_path,
        "document": cfg.pdf.name,
        "generated_from": out_path.name,
        "id_rewrites": rep["id_rewrites"],
        "dropped_artefacts": [[cid, twin] for cid, twin, _ in rep["dropped"]],
        "cancelled": rep["cancelled"],
        "document_only": rep["added"],
        "portal_only": rep["api_only"],
    }, open(report_path, "w", encoding="utf-8"), ensure_ascii=False, indent=2)

    # --- 6. report ----------------------------------------------------------------------
    total = sum(len(d["calls"]) for d in destinations)
    ids = [c["call_id"] for d in destinations for c in d["calls"]]
    dupes = [k for k, v in Counter(ids).items() if v > 1]
    print(f"cluster            : {cfg.key}")
    print(f"document           : {cfg.pdf.name}  ({len(pdf)} topics defined)")
    print(f"base               : {base_path.name}")
    print(f"ids canonicalised  : {rep['canonicalised']}")
    print(f"ids renamed        : {len(rep['renamed'])} {rep['renamed']}")
    print(f"portal artefacts   : {len(rep['dropped'])} dropped")
    for cid, twin, title in rep["dropped"]:
        print(f"                     - {cid}  (duplicates {twin}: {title})")
    print(f"enriched from doc  : {rep['enriched']}   TRL added: {rep['trl_added']}")
    print(f"document-only added: {len(rep['added'])} {rep['added']}")
    print(f"portal-only kept   : {len(rep['api_only'])} {rep['api_only']}")
    print(f"cancelled topics   : {len(rep['cancelled'])} {rep['cancelled']}")
    print(f"unresolved dest    : {len(rep['unresolved'])} {rep['unresolved']}")
    print(f"duplicate ids      : {dupes if dupes else 'none'}")
    print(f"total calls        : {total}")
    print()
    for d in destinations:
        print(f"  {len(d['calls']):3d}  {d['destination_title'][:88]}")
    print(f"\nwritten: {out_path}")
    print(f"         {report_path.name}  (id rewrites: {len(rep['id_rewrites'])})")
    if dupes or rep["unresolved"]:
        raise SystemExit("NOT SAFE TO PROMOTE - resolve the problems above first.")
    if promote:
        shutil.copy2(out_path, cfg.grouped)
        print(f"promoted -> {cfg.grouped}")


if __name__ == "__main__":
    ap = argparse.ArgumentParser()
    ap.add_argument("cluster", help="e.g. CL3, CL4")
    ap.add_argument("--base", default=None)
    ap.add_argument("--out", default=None)
    ap.add_argument("--promote", action="store_true",
                    help="copy the result over the ingested grouped file")
    a = ap.parse_args()
    run(a.cluster, a.base, a.out, a.promote)
