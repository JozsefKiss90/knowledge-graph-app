#!/usr/bin/env python3
"""Reconciliation diff — Health 2026/2027 (PRD .scratch/wp-doc-ingest, Step 1 gate).

Compares the SAME calls across three local sources to quantify the three gap buckets
from ADR-0008 before committing to a WP-document pipeline:

  PDF     = pdf_files/HORIZON_2026/wp-4-health_horizon-2026-2027_en.pdf   (what the document has)
  API-raw = output_files/fetched_call_metadata_2026_2027.json  raw.metadata (what SEDIA returns)
  GROUPED = output_files/cluster_CL1.grouped.json               (what the pipeline ingests today)

Buckets:
  A (extractor-blank)      : field blank in GROUPED but present in API-raw  -> cheap fix upstream
  B (API-structural)       : field present in PDF but absent/boilerplate in API-raw -> PDF fills
  C (timing/permanence)    : topic in PDF but not in API-raw at all         -> PDF fills coverage

Read-only. Writes reconciliation-health-2026.md + .json next to this file.
"""
import json, re, os, statistics
from pathlib import Path

import sys
ROOT = Path(__file__).resolve().parents[2]  # repo root (.scratch/wp-doc-ingest/ -> up 2)
OUT  = Path(__file__).resolve().parent

# Standing QA gate: one entry per cluster. `token` = the topic-ID area token (Health uses
# HLTH though its file is CL1). Add clusters as their WP PDFs land in pdf_files/.
CLUSTERS = {
    "health": dict(token="HLTH", pdf="pdf_files/HORIZON_2026/wp-4-health_horizon-2026-2027_en.pdf",
                   grouped="backend/routes/new_pipeline/output_files/cluster_CL1.grouped.json"),
    "cl2":    dict(token="CL2",  pdf="pdf_files/HORIZON_2026/wp-5-culture-creativity-and-inclusive-society_horizon-2026-2027_en.pdf",
                   grouped="backend/routes/new_pipeline/output_files/cluster_CL2.grouped.json"),
    "cl3":    dict(token="CL3",  pdf="pdf_files/HORIZON_2026/wp-6-civil-security-for-society_horizon-2026-2027_en.pdf",
                   grouped="backend/routes/new_pipeline/output_files/cluster_CL3.grouped.json"),
    "cl4":    dict(token="CL4",  pdf="pdf_files/HORIZON_2026/wp-7-digital-industry-and-space_horizon-2026-2027_en.pdf",
                   grouped="backend/routes/new_pipeline/output_files/cluster_CL4.grouped.json"),
    "cl6":    dict(token="CL6",  pdf="pdf_files/HORIZON_2026/wp-9-food-bioeconomy-natural-resources-agriculture-and-environment_horizon-2026-2027_en.pdf",
                   grouped="backend/routes/new_pipeline/output_files/cluster_CL6.grouped.json"),
}
SEL   = sys.argv[1] if len(sys.argv) > 1 else "health"
CFG   = CLUSTERS[SEL]
TOKEN = CFG["token"]
PDF   = ROOT / CFG["pdf"]
RAW   = ROOT / "backend/routes/new_pipeline/output_files/fetched_call_metadata_2026_2027.json"
GRP   = ROOT / CFG["grouped"]

TOPIC_RE = re.compile(rf'HORIZON-{TOKEN}-20\d\d-[0-9A-Za-z\-]+')

# ---------------------------------------------------------------- helpers
def norm(s):
    return re.sub(r'\s+', ' ', (s or '')).strip()

def nonempty(v):
    return v not in (None, "", 0, 0.0, [], {})

def clean_id(tid):
    # trailing punctuation / stage suffix normalisation for set comparison
    return re.sub(r'[^A-Z0-9\-]+$', '', tid).rstrip('-')

def norm_key(tid):
    # robust join key: drop stage suffixes + trailing junk so call_id/identifier variants unify
    t = re.sub(r'(?i)-(two|single)-stages?$', '', tid or '')
    return re.sub(r'[^A-Za-z0-9\-]+$', '', t).rstrip('-')

# ---------------------------------------------------------------- 1. PDF
import fitz
def parse_pdf():
    doc = fitz.open(str(PDF))
    text = "\n".join(doc[i].get_text() for i in range(doc.page_count))
    text = text.replace('­', '')            # soft hyphen
    # real topic definition = topic-id header followed (soon) by 'Call:' and 'Specific conditions'
    hdr = re.compile(rf'(HORIZON-{TOKEN}-20\d\d-[0-9A-Za-z\-]+?)\s*:\s*(.+?)\n', re.S)
    starts = []
    for m in hdr.finditer(text):
        window = text[m.end(): m.end()+500]
        if 'Call:' in window and re.search(r'Specific\s+conditions', window):
            starts.append((m.start(), m.group(1), norm(m.group(2))))
    # de-dup by topic id: keep first real definition
    seen, defs = set(), []
    for pos, tid, title in starts:
        if tid in seen: continue
        seen.add(tid); defs.append((pos, tid, title))
    # slice each block to the next real-definition start
    bounds = [d[0] for d in defs] + [len(text)]
    ANCHORS = [
        ('expected_eu_contribution', r'Expected\s+EU\s+contribution\s+per\s+project'),
        ('indicative_budget',        r'Indicative\s+budget'),
        ('type_of_action',           r'Type\s+of\s+Action'),
        ('technology_readiness_level', r'Technology\s+Readiness\s+Level'),
        ('eligibility_conditions',   r'Eligibility\s+conditions'),
        ('procedure',                r'\bProcedure\b'),
        ('legal_financial',          r'Legal\s+and\s+financial\s+set-up'),
        ('expected_outcome',         r'Expected\s+Outcome\s*:'),
        ('scope',                    r'Scope\s*:'),
        ('expected_impact',          r'Expected\s+Impact\s*:'),
    ]
    out = {}
    for i, (pos, tid, title) in enumerate(defs):
        block = text[pos: bounds[i+1]]
        flat = norm(block)
        hits = []
        for name, pat in ANCHORS:
            mm = re.search(pat, flat, re.I)
            if mm: hits.append((mm.start(), name))
        hits.sort()
        fields = {}
        for j, (start, name) in enumerate(hits):
            end = hits[j+1][0] if j+1 < len(hits) else len(flat)
            val = norm(flat[start:end])
            # strip the label itself from the front
            val = re.sub(r'^[A-Za-z /\-:]+?(?=[A-Z0-9(])', '', val, count=1) if len(val) < 400 else val
            fields[name] = val
        # 'Call: X (Single/Two stage - YEAR)'
        cm = re.search(r'Call:\s*(.+?)\((Single|Two)\s*stage\s*-\s*(20\d\d)\)', flat)
        out[tid] = {
            'title': title,
            'call': norm(cm.group(1)) if cm else None,
            'stage': (cm.group(2).lower()+'-stage') if cm else None,
            'year_from_call': cm.group(3) if cm else None,
            **{k: fields.get(k) for k, _ in ANCHORS},
        }
    return out, doc.page_count

# ---------------------------------------------------------------- 2. API-raw
def mget(meta, key):
    v = meta.get(key)
    return (v[0] if v else None) if isinstance(v, list) else v

def parse_api():
    raw = json.load(open(RAW, encoding="utf-8"))
    out = {}
    for r in raw:
        ident = r.get("identifier", "")
        if not ident.startswith(f"HORIZON-{TOKEN}-20"): continue
        meta = r["raw"]["metadata"]
        db = mget(meta, "descriptionByte") or ""
        tc = mget(meta, "topicConditions") or ""
        # status text
        status = None
        act = mget(meta, "actions")
        try:
            a = json.loads(act) if isinstance(act, str) else act
            a0 = a[0] if isinstance(a, list) else a
            status = ((a0 or {}).get("status") or {}).get("description")
        except Exception: pass
        out[ident] = {
            'title': norm(mget(meta, "title") or r.get("summary")),
            'status': status or mget(meta, "status"),
            'start': mget(meta, "startDate"),
            'deadline': mget(meta, "deadlineDate"),
            'callIdentifier': mget(meta, "callIdentifier"),
            'has_expected_outcome': 'Expected Outcome' in db,
            'has_scope': 'Scope' in db,
            'has_expected_impact': 'Expected Impact' in db,
            'descriptionByte_len': len(db),
            'topicConditions_len': len(tc),
            'has_trl': bool(re.search(r'[Tt]echnology\s+[Rr]eadiness\s+[Ll]evel|\bTRL\b', db + tc)),
            'has_eu_contribution_phrase': bool(re.search(r'contribution\s+of\s+(?:between|around|up to)\s+EUR', db + tc)),
            'annex_pointers': len(re.findall(r'General Annex', tc)),
        }
    return out

# ---------------------------------------------------------------- 3. GROUPED
def parse_grouped():
    """Index every call under ALL its id variants (normalised), so the API identifier
    resolves regardless of whether the grouped file keys on identifier/topic_id/call_id/
    original_call_id or carries a -two-stage suffix."""
    g = json.load(open(GRP, encoding="utf-8"))
    out = {}
    ncalls = 0
    for d in g["destinations"]:
        for c in d.get("calls", []):
            ncalls += 1
            for key in (c.get("identifier"), c.get("topic_id"), c.get("call_id"), c.get("original_call_id")):
                if key: out.setdefault(norm_key(key), c)
    out["__count__"] = ncalls
    return out

# ---------------------------------------------------------------- diff
def run():
    pdf, pages = parse_pdf()
    api = parse_api()
    grp = parse_grouped()

    P, A = set(pdf), set(api)
    gcount = grp.pop("__count__", 0)
    Pc = {norm_key(x) for x in P}; Ac = {norm_key(x) for x in A}
    both = sorted(x for x in A if norm_key(x) in Pc)
    pdf_only = sorted(x for x in P if norm_key(x) not in Ac)
    api_only = sorted(x for x in A if norm_key(x) not in Pc)
    # edition-aware bucket C: current-edition PDF-only topics vs old-year cross-ref false-positives
    pdf_only_cur  = [x for x in pdf_only if re.search(r'-202[67]-', x)]
    pdf_only_xref = [x for x in pdf_only if x not in pdf_only_cur]

    # bucket A: fields blank in grouped but present in api-raw
    A_fields = {
        'status':      lambda k: (not nonempty(grp.get(norm_key(k), {}).get('status')), api[k]['status'] if k in api else None),
        'expected_eu_contribution': lambda k: (not nonempty(grp.get(norm_key(k), {}).get('expected_eu_contribution')),
                                                api.get(k, {}).get('has_eu_contribution_phrase')),
        'technology_readiness_level': lambda k: (not nonempty(grp.get(norm_key(k), {}).get('technology_readiness_level')),
                                                  api.get(k, {}).get('has_trl')),
    }
    bucketA = {f: {'grouped_blank': 0, 'api_has': 0} for f in A_fields}
    for k in both:
        for f, fn in A_fields.items():
            blank, apihas = fn(k)
            if blank: bucketA[f]['grouped_blank'] += 1
            if blank and apihas: bucketA[f]['api_has'] += 1

    # bucket B: PDF has vs API lacks, for the structural fields
    bucketB = {'technology_readiness_level': 0, 'expected_impact': 0, 'expected_eu_contribution_phrase': 0}
    b_detail = {k: [] for k in bucketB}
    for k in both:
        p = pdf.get(k) or pdf.get(clean_id(k)) or {}
        a = api.get(k, {})
        if nonempty(p.get('technology_readiness_level')) and not a.get('has_trl'):
            bucketB['technology_readiness_level'] += 1; b_detail['technology_readiness_level'].append(k)
        if nonempty(p.get('expected_impact')) and not a.get('has_expected_impact'):
            bucketB['expected_impact'] += 1; b_detail['expected_impact'].append(k)
        if nonempty(p.get('expected_eu_contribution')) and not a.get('has_eu_contribution_phrase'):
            bucketB['expected_eu_contribution_phrase'] += 1; b_detail['expected_eu_contribution_phrase'].append(k)

    # title mismatches
    mism = []
    for k in both:
        pt = norm((pdf.get(k) or pdf.get(clean_id(k)) or {}).get('title', '')).lower()
        at = norm(api[k]['title']).lower()
        if pt and at and pt[:40] != at[:40]:
            mism.append((k, pt, at))

    # narrative parity (both loaded topics)
    api_narr = sum(1 for k in both if api[k]['has_expected_outcome'] and api[k]['has_scope'])
    grp_narr = sum(1 for k in both if nonempty(grp.get(norm_key(k), {}).get('expected_outcome')) and nonempty(grp.get(norm_key(k), {}).get('scope')))
    pdf_trl  = sum(1 for k in P if nonempty(pdf[k].get('technology_readiness_level')))
    pdf_impact = sum(1 for k in P if nonempty(pdf[k].get('expected_impact')))

    data = dict(pages=pages, counts=dict(pdf=len(P), api=len(A), grouped=gcount,
                both=len(both), pdf_only=len(pdf_only), api_only=len(api_only),
                pdf_only_current=len(pdf_only_cur), pdf_only_xref=len(pdf_only_xref)),
                pdf_only=pdf_only, pdf_only_current=pdf_only_cur, pdf_only_xref=pdf_only_xref,
                api_only=api_only, bucketA=bucketA, bucketB=bucketB,
                b_detail=b_detail, title_mismatches=mism,
                api_narr=api_narr, grp_narr=grp_narr, pdf_trl=pdf_trl, pdf_impact=pdf_impact)
    json.dump(data, open(OUT / f"reconciliation-{SEL}.json", "w", encoding="utf-8"), indent=2, ensure_ascii=False)

    # ---- console
    print(f"=== cluster={SEL} (token={TOKEN}) ===")
    print(f"PDF pages: {pages}")
    print(f"topics  PDF={len(P)}  API={len(A)}  GROUPED={gcount}  (both={len(both)})")
    print(f"PDF-only current-edition (bucket C): {len(pdf_only_cur)} -> {pdf_only_cur}")
    print(f"PDF-only old-year (cross-ref FP)   : {len(pdf_only_xref)} -> {pdf_only_xref}")
    print(f"API-only                           : {len(api_only)} -> {api_only}")
    print("bucket A (grouped-blank | of which api-has):")
    for f, v in bucketA.items(): print(f"   {f:32s} {v['grouped_blank']:2d} | {v['api_has']:2d}")
    print("bucket B (PDF-has, API-lacks):")
    for f, v in bucketB.items(): print(f"   {f:32s} {v}")
    print(f"narrative parity: API {api_narr}/{len(both)}  GROUPED {grp_narr}/{len(both)}")
    print(f"PDF has TRL on {pdf_trl}/{len(P)} topics; Expected-Impact on {pdf_impact}/{len(P)}")
    print(f"title mismatches: {len(mism)}")
    return data

if __name__ == "__main__":
    run()
