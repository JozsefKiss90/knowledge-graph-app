#!/usr/bin/env python3
"""CL3 merge (ADR-0008): document content + API state, on the topic-ID key. Follows the CL4 pilot.

Additive by construction — starts from the existing API-sourced `cluster_CL3.grouped.json`
(47 calls, full API state) and:
  * enriches each matched call with document-only content (TRL above all; any blank content
    field the PDF fills), tagging field_provenance;
  * recomputes `status` deterministically from opening/deadline dates (status = f(deadline));
  * stamps content_source / schedule_source / wp_edition (ADR-0006 provenance).

Two CL3-specific differences from the CL4 pilot:
  * NO bucket-C topics — every current CL3 PDF topic is already in the API, so there is nothing to
    append. (CL4 appended 15 EUSPA/Space topics the API omits; CL3 has none.) The 38 PDF topics all
    match; the merge only enriches.
  * NO vintage id alias — the grouped ids equal the current dump ids exactly (verified), so
    `norm_key` needs no cluster alias (CL4 needed MATERIALS-PRODUCTION -> MAT-PROD).

The 9 `CS-ECCC` cybersecurity topics are API-only (separate ECCC programme section, absent from the
WP PDF). They are kept verbatim as `content_source=api` — additive, never dropped.

Writes `cluster_CL3.merged.json` (not promoted over production by this script) + prints a summary.
"""
import sys, json, re
from pathlib import Path
from datetime import date
HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE))
import cl3_wp_parser

ROOT = HERE.parents[1]
GRP  = ROOT / "backend/routes/new_pipeline/output_files/cluster_CL3.grouped.json"
OUT  = HERE / "cluster_CL3.merged.json"
WP_EDITION = "HORIZON 2026-2027 / Part 6 – Civil Security for Society"
TODAY = date(2026, 7, 9)   # session date; in production status is derived at read time

DOC_CONTENT = ["technology_readiness_level", "expected_outcome", "scope", "expected_impact",
               "admissibility_conditions", "eligibility_conditions", "procedure",
               "legal_and_financial_setup", "exceptional_page_limits"]

def norm_key(t):
    t = re.sub(r'(?i)-(two|single)-stages?$', '', t or '')
    # CL3 has no vintage id alias (grouped ids == current dump ids, verified) — no cluster rename.
    return re.sub(r'[^A-Za-z0-9\-]+$', '', t).rstrip('-')
def ne(v): return v not in (None, "", [], {})
def derive_status(opening, deadline):
    def d(x):
        try: return date.fromisoformat(str(x)[:10])
        except Exception: return None
    o, dl = d(opening), d(deadline)
    if dl and TODAY > dl: return "Closed"
    if o and TODAY < o:   return "Forthcoming"
    if o or dl:           return "Open"
    return ""

def run():
    pdf = cl3_wp_parser.parse()                       # {call_id: doc content}
    pdf_by_key = {norm_key(k): v for k, v in pdf.items()}
    grouped = json.load(open(GRP, encoding="utf-8"))

    matched, trl_added, enriched, restatus = set(), 0, 0, 0
    for dest in grouped["destinations"]:
        for c in dest.get("calls", []):
            cid = c.get("call_id") or c.get("original_call_id") or c.get("identifier") or c.get("topic_id")
            p = pdf_by_key.get(norm_key(cid)) if cid else None
            prov = {}
            if p:
                matched.add(norm_key(cid))
                for f in DOC_CONTENT:
                    if ne(p.get(f)) and not ne(c.get(f)):     # additive: fill blanks from the document
                        c[f] = p[f]; prov[f] = "document"
                if prov.get("technology_readiness_level"): trl_added += 1
                enriched += 1
                c["content_source"] = "merged"
            else:
                c["content_source"] = "api"                   # CS-ECCC API-only topics land here
            st = derive_status(c.get("opening_date"), c.get("deadline"))
            if st:
                c["status"] = st; c["schedule_source"] = "api"; restatus += 1
            c["wp_edition"] = WP_EDITION
            if prov: c["field_provenance"] = prov

    # CL3 has no PDF-only (bucket-C) topics: every current topic is already in the API. Confirm the
    # merge added no orphans — any unmatched PDF id here would be a parser/join regression.
    unmatched = sorted(k for k in pdf_by_key if k not in matched)

    # finalise: advertise TRL + provenance so the builder ingests them (zero builder change,
    # via the existing `_description_section_keys` extension point). field_provenance -> JSON string.
    ADV = ["technology_readiness_level", "content_source", "schedule_source", "wp_edition",
           "field_provenance", "provenance_note"]
    for dest in grouped["destinations"]:
        for c in dest.get("calls", []):
            if isinstance(c.get("field_provenance"), dict):
                c["field_provenance"] = json.dumps(c["field_provenance"], ensure_ascii=False, sort_keys=True)
            c["_description_section_keys"] = [k for k in ADV if ne(c.get(k))]

    json.dump(grouped, open(OUT, "w", encoding="utf-8"), ensure_ascii=False, indent=2)

    total = sum(len(d.get("calls", [])) for d in grouped["destinations"])
    api_only = sum(1 for d in grouped["destinations"] for c in d.get("calls", []) if c.get("content_source") == "api")
    print(f"matched (PDF and API): {len(matched)}   enriched: {enriched}   TRL added: {trl_added}")
    print(f"status recomputed from dates: {restatus}")
    print(f"unmatched PDF topics (must be 0): {len(unmatched)} -> {unmatched}")
    print(f"API-only calls kept (CS-ECCC etc.): {api_only}")
    print(f"merged total calls: {total}  (unchanged from grouped; no PDF-only topics to append)")
    print(f"written: {OUT}")

if __name__ == "__main__":
    run()
