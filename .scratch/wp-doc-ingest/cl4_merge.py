#!/usr/bin/env python3
"""CL4 pilot merge (ADR-0008): document content + API state, on the topic-ID key.

Additive by construction — starts from the existing API-sourced `cluster_CL4.grouped.json`
(64 calls, full API state) and:
  * enriches each matched call with document-only content (TRL above all; any blank content
    field the PDF fills), tagging field_provenance;
  * appends the 15 Space topics the API omits, as new document-sourced records (indicative);
  * recomputes `status` deterministically from opening/deadline dates (status = f(deadline));
  * stamps content_source / schedule_source / wp_edition (ADR-0006 provenance).

Writes `cluster_CL4.merged.json` (pilot; not promoted over production) + prints a summary.
"""
import sys, json, re
from pathlib import Path
from datetime import date
HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE))
import cl4_wp_parser

ROOT = HERE.parents[1]
GRP  = ROOT / "backend/routes/new_pipeline/output_files/cluster_CL4.grouped.json"
OUT  = HERE / "cluster_CL4.merged.json"
WP_EDITION = "HORIZON 2026-2027 / Part 7 – Digital, Industry and Space"
TODAY = date(2026, 7, 9)   # session date; in production status is derived at read time

DOC_CONTENT = ["technology_readiness_level", "expected_outcome", "scope", "expected_impact",
               "admissibility_conditions", "eligibility_conditions", "procedure",
               "legal_and_financial_setup", "exceptional_page_limits"]

def norm_key(t):
    t = re.sub(r'(?i)-(two|single)-stages?$', '', t or '')
    # observed vintage alias: the ingested grouped file (Jan) spells the destination token
    # MATERIALS-PRODUCTION; the PDF and current API dump abbreviate it MAT-PROD. Canonicalise.
    # (Productionisation: rebuild from the current dump instead of aliasing — see report.)
    t = re.sub(r'(?i)MATERIALS-PRODUCTION', 'MAT-PROD', t)
    return re.sub(r'[^A-Za-z0-9\-]+$', '', t).rstrip('-')
def ne(v): return v not in (None, "", [], {})
def eur(millions):
    try: return int(round(float(millions) * 1_000_000)) if millions else None
    except (TypeError, ValueError): return None
def prefix4(cid):
    p = cid.split("-"); return "-".join(p[:4]) if len(p) >= 4 else cid
def derive_status(opening, deadline):
    def d(x):
        try: return date.fromisoformat(str(x)[:10])
        except Exception: return None
    o, dl = d(opening), d(deadline)
    if dl and TODAY > dl: return "Closed"
    if o and TODAY < o:   return "Forthcoming"
    if o or dl:           return "Open"
    return ""

def build_space_call(cid, p):
    mn, mx = eur(p.get("min_contribution")), eur(p.get("max_contribution"))
    ec = f"{mn} - {mx}" if (mn or mx) else ""
    if ec and (mn is None or mx is None):
        v = mn or mx; ec = f"{v} - {v}"
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
        "min_contribution": mn, "max_contribution": mx, "indicative_budget": eur(p.get("indicative_budget")),
        "opening_date": "", "deadline": "", "deadlines": [], "deadline_model": "",
        "status": "Forthcoming", "funding_link": "", "url": "",
        "callIdentifier": prefix4(cid), "callccm2Id": "", "keywords": [], "tags": [],
        "destination": "Space",
        "content_source": "document", "schedule_source": "document",
        "wp_edition": WP_EDITION,
        "field_provenance": {**{f: "document" for f in DOC_CONTENT if ne(p.get(f))},
                             "expected_eu_contribution": "document", "status": "document-indicative"},
        "provenance_note": "In the work programme but not yet in the portal API — dates/status indicative.",
    }

def run():
    pdf = cl4_wp_parser.parse()                       # {call_id: doc content (budget in millions)}
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
                c["content_source"] = "api"
            st = derive_status(c.get("opening_date"), c.get("deadline"))
            if st:
                c["status"] = st; c["schedule_source"] = "api"; restatus += 1
            c["wp_edition"] = WP_EDITION
            if prov: c["field_provenance"] = prov

    # append the PDF-only (Space) topics as new document-sourced records
    existing = {norm_key(c.get("call_id") or c.get("original_call_id") or c.get("identifier") or c.get("topic_id"))
                for dest in grouped["destinations"] for c in dest.get("calls", [])}
    space_dest = next((d for d in grouped["destinations"]
                       if "space" in (d.get("destination_title") or "").lower()), None)
    if space_dest is None:
        space_dest = {"destination_title": "Space (work programme)", "calls": []}
        grouped["destinations"].append(space_dest)
    added, added_ids = 0, []
    for cid, p in pdf.items():
        if norm_key(cid) in existing: continue
        space_dest["calls"].append(build_space_call(cid, p)); added += 1; added_ids.append(cid)

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
    print(f"matched (PDF and API): {len(matched)}   enriched: {enriched}   TRL added: {trl_added}")
    print(f"status recomputed from dates: {restatus}")
    print(f"Space topics appended: {added} -> {added_ids}")
    print(f"merged total calls: {total}  (was 64 API + {added} document)")
    print(f"written: {OUT}")

if __name__ == "__main__":
    run()
