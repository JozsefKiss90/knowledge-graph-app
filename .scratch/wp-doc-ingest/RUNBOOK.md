# Runbook — reproduce the document+API merge for any cluster / work programme

**What this is.** The CL4 pilot (ADR-0008) merged work-programme-PDF content (TRL, Space topics, full
narrative) with the F&T API state and ingested it live. This is the repeatable recipe to do the same for
another cluster (CL3, CL6, …) or programme. Read `cl4-pilot-report.md` for the CL4 result and
`reconciliation-report.md` for which clusters are worth doing.

**Reproduced so far:** **CL4** (pilot — TRL + 15 Space bucket-C topics; `cl4-pilot-report.md`) and
**CL3** (pure TRL enrichment, no bucket C, no id alias; `cl3-report.md`). Both are live in the dev graph.
CL3 is the cleaner second example — read it if your cluster has no PDF-only topics.

**Scripts (this dir)** — copy + retune the constants at the top for a new cluster. Two worked examples:
CL4 (`cl4_wp_parser.py`, `cl4_merge.py`, `canonicalize_cl4_ids.py` — has Space bucket-C + an id alias)
and CL3 (`cl3_wp_parser.py`, `cl3_merge.py` — enrichment-only, no canonicalise). Plus the shared gate
`reconcile_health_2026.py` (already parameterised `<health|cl2|cl3|cl4|cl6>`). The parse engine is reused
from git (see step 1). **Prefer the CL3 pair as the base for an enrichment-only cluster** — it already
has the Space-append branch and the alias removed.

---

## The pipeline at a glance

```
0. GATE      reconcile diff        → is this cluster worth a PDF pipeline? (bucket B/C non-zero?)
1. PARSE     PDF → topic content   → TRL + narrative + conditions + PDF-only topics
2. MERGE     doc content + API state on the topic-id key → grouped JSON + provenance
3. PROMOTE   copy merged → output_files/cluster_<CL>.grouped.json  (back up first)
4. CANON     rename stale vintage ids (if any) → canonical portal ids
5. INGEST    DELETE /cluster<N>/all → POST /cluster<N>/populate     (delete-first!)
6. VERIFY    GET /cluster<N>/nodes + drive the UI
```

## Per-cluster inputs (fill these in first)

| Input | CL4 example | How to find it |
|---|---|---|
| **token** (topic-id area token) | `CL4` | Health is `HLTH` (file `CL1`); others = `CL<n>` |
| **WP PDF** (matching edition!) | `pdf_files/HORIZON_2026/wp-7-digital-industry-and-space_horizon-2026-2027_en.pdf` | must be the 2026-27 edition, not 2025 |
| **grouped file** | `output_files/cluster_CL4.grouped.json` | the API-side base the merge enriches |
| **route prefix** | `/cluster4` (**not** `/cl4`) | read `backend/routes/new_pipeline/<cl>_routes.py` |
| **UI graph key** | `Cluster_4` | `GRAPH_ENDPOINTS` in `frontend/src/components/GraphPage/useGraphData.js` |

## Prerequisites

- Matching-edition WP PDF present in `pdf_files/HORIZON_2026/` (the folder mixes editions — check the year in the filename).
- Dev stack up (`docker ps` → `kg-dev-backend-1` :8000, `kg-dev-frontend-1` :3001, `kg-dev-neo4j-1` :7687). Start with `docker compose -f docker-compose.dev.yml up -d`.
- `pymupdf` in the Python you run scripts with (`pip install pymupdf`).
- Run the **gate** first (step 0): only clusters with real bucket B (TRL) or C (PDF-only topics) are worth it — CL3/CL4/CL6 yes; Health/CL2 (no TRL) no, just fix the extractor.

---

## Steps (the exact CL4 sequence; substitute your cluster)

**0. Gate — is it worth it?**
```
python .scratch/wp-doc-ingest/reconcile_health_2026.py <cluster>
```
Look at bucket B (TRL) and bucket C (real PDF-only). Non-zero → proceed.

**1. Parse the PDF.** Reuse the prior-art engine (recovered, not un-deleted):
`git show 14464ed~1:backend/routes/new_pipeline/parsers/he_wp_parser_merged_patched_with_dates.py > _refs/...`.
Copy `cl4_wp_parser.py` → `<cl>_wp_parser.py` and retune the **cluster-specific constants**:
- `PDF` path; `HDR` / `EDITION_RE` regexes (the topic-id namespace).
- **Namespace breadth:** include non-`CL<n>` topics published in this WP (CL4 has EUSPA Space topics
  `HORIZON-YYYY-EUSPA-…`); **exclude cross-cluster references** (a `HORIZON-CL5-…` hit in the CL4 doc).
- **Real-def confirmation:** `Specific conditions` + (`Call:` OR `Expected EU contribution` OR `Type of Action`)
  within 500 chars — the `Call:`-less agency topics need the relaxed form.
- **Non-standard id backfill:** the prior-art `parse_call_block` assumes `HORIZON-CL<n>-YYYY-` ids and leaves
  title/action/budget empty for other shapes (EUSPA) — backfill them from the block.
Sanity: `python <cl>_wp_parser.py` → topic count should equal the count of
`Proposals are invited against the following topic(s):` topics, **not** the `Specific conditions` count
(which over-counts — duplicate tables + General-Annexes boilerplate).

**2. Merge.** Copy `cl4_merge.py` → `<cl>_merge.py`; retune `GRP`, `WP_EDITION`, and the **id alias** in
`norm_key` (see step 4). Ensure the grouped file is the **API-only base** first (fresh cluster: it already
is; a re-run: restore from `*.PREPILOT.bak` or re-fetch). It: enriches matched calls with document content
(TRL + any blank field, tagging `field_provenance`), appends PDF-only topics as `content_source=document`
(budget **millions → euros ×1e6**, `status=Forthcoming` indicative), recomputes `status` from dates, and
advertises TRL + provenance via `_description_section_keys` (zero builder change). Verify: additive (all API
topics kept), TRL populated, `content_source` = {merged, api, document}.
```
python .scratch/wp-doc-ingest/<cl>_merge.py     # writes cluster_<CL>.merged.json
```

**3. Promote.**
```
cp output_files/cluster_<CL>.grouped.json .scratch/wp-doc-ingest/cluster_<CL>.grouped.PREPILOT.bak
cp .scratch/wp-doc-ingest/cluster_<CL>.merged.json output_files/cluster_<CL>.grouped.json
```

**4. Canonicalise stale ids (only if the cluster has a vintage alias).** Detect by diffing parser ids vs
grouped ids vs current-dump ids (norm_key mismatches). CL4's grouped file was a Jan vintage spelling
`MATERIALS-PRODUCTION` where the dump/PDF use `MAT-PROD`. Copy `canonicalize_cl4_ids.py`, set the
`STALE`/`CANON` pair, **verify every renamed id exists in the dump**, then run it (edits id fields only).
```
python .scratch/wp-doc-ingest/canonicalize_<cl>_ids.py
```

**5. Ingest — delete-first (ids change on a re-run, so a plain MERGE would duplicate).**
```
curl -s -X DELETE  http://localhost:8000/cluster<N>/all
curl -s -X POST    http://localhost:8000/cluster<N>/populate -H "Content-Type: application/json" -d '{"preview": true}'   # dry run
curl -s -X POST    http://localhost:8000/cluster<N>/populate -H "Content-Type: application/json" -d '{"preview": false}'  # write
```

**6. Verify** (`GET /cluster<N>/nodes`, nodes wrapped under `"n"`): expected call count, TRL count > 0,
**0 stale ids, 0 duplicate ids**, PDF-only topics present. Then drive the UI: `?g=Cluster_<N>`, drill the
new destination → tap a document topic → confirm the **TECHNOLOGY READINESS LEVEL** section + indicative
labels render (Cytoscape is canvas — drive the cy instance's `tap` events; see the `drive*.js` in the
session scratchpad).

---

## Cluster-specific variations you MUST check (each cluster differs)

- **ID vintage aliases** (step 4): CL4 = `MATERIALS-PRODUCTION`↔`MAT-PROD`. Others may have their own — detect, don't assume.
- **Non-`CL<n>` namespaces in the WP:** CL4 has EUSPA (Space). Broaden the parser, but keep excluding true cross-cluster refs.
- **Destination-code schemes:** CL5 topics carry `-D<n>-` codes and the prior art regroups destinations by them; CL3/4/6 use header/ToC destinations.
- **API-only topics (keep them — additive):** CL3 has 9 `CS-ECCC` topics in the API but not the PDF. The merge keeps `content_source=api`. **Verified for CL3:** all 9 survived ingest as `content_source=api`.
- **Two-stage placeholders** (`HORIZON-CL<n>-YYYY-NN-two-stage` with no topic suffix) are call-level, not topics — they stay API-only, never matched to a PDF topic.
- **In-block cross-references to prior-year predecessors** (CL3: `2027-01-INFRA-01`'s narrative cites `2025-01-INFRA-01`). The prior-art `parse_call_block` re-derives `call_id` from the block and gets hijacked by the cross-ref — it drops the real topic and injects a phantom old-year one. **Fix: pin `rec["call_id"]` to the header id, don't trust the engine's derived id** (see gotcha #9). Check any cluster with year-over-year topic continuity.

## Gotchas / lessons (the expensive ones)

1. **`Specific conditions` count ≠ topic count.** Ground-truth the topic set with the `Proposals are invited against the following topic(s):` marker.
2. **PDF budgets are in millions** — convert ×1,000,000 for the raw-euro schema.
3. **Verify state freshness before "rebuilding."** CL4's grouped file was a stale *vintage* but not stale *data* (0/64 date diffs vs the dump) — a full rebuild-from-dump was unwarranted; only the ids needed fixing.
4. **Delete-before-populate whenever ids change** — MERGE alone leaves the old-id nodes as duplicates.
5. **TRL + provenance ride `_description_section_keys`** (no builder change). Productionisation: promote TRL to a first-class prop in `_build_call_props`.
6. **`status` is derived from dates at merge time** (deterministic `f(opening, deadline)`), never imported from the stale API snapshot (36% of dump statuses were stale/pre-close).
7. **Route prefix is `/cluster<N>`, not `/cl<N>`.**
8. **Pre-existing `min__contribution` typo** (double underscore) in some grouped files → builder reads `min_contribution` → drops the numeric min. Fix if you touch those calls. **Scope check: it is on 100% of CL3 grouped calls** (0/47 use the correct key) and partial on CL4 — so it's a cross-cluster grouped-file bug, best fixed once for all clusters, not per-merge.
9. **Pin `call_id` to the PDF header, not the parser's derived id.** The prior-art `parse_call_block` scans the block for a topic id and an in-block cross-reference to a prior-year predecessor can hijack it (CL3 `2027-01-INFRA-01` → mislabelled `2025-01-INFRA-01`). Set `rec["call_id"] = cid` (the HDR-captured header) unconditionally — the block content is correct, only the label was wrong. (CL4 used `rec.get("call_id") or cid` and got lucky; CL3 did not.)

## Non-Horizon programmes (DEP, Creative Europe, Euratom, Erasmus+, CEF)

Per ADR-0008, their WP documents carry **no topic-ID calls**, so this merge does not apply — they stay
**API-only**. A WP doc there can contribute programme/destination *context* (attach to structure nodes),
never calls. Don't run this pipeline for them expecting topics.

## Recommended generalisation (turn the CL4 templates into cluster tools)

- `wp_parser.py <cluster>`: a `CLUSTERS` config (token, PDF, namespace regex, alias map) like the reconcile diff already has.
- `merge.py <cluster>`: parameterise `GRP`, `WP_EDITION`, alias, destination label.
- `canonicalize.py <cluster>`: **auto-derive** the alias by diffing grouped ids vs dump ids (no per-cluster hardcoding).
- `run_cluster.py <cluster>`: chain steps 1-6 with the gate as a guard.

## "Done" checklist

- [ ] Gate shows non-zero bucket B/C for the cluster.
- [ ] Parser topic count == `Proposals are invited…` topic count.
- [ ] Merged file additive (all API topics present), TRL populated, provenance stamped, 0 stale ids.
- [ ] Graph: expected count, TRL > 0, 0 stale ids, 0 duplicates, PDF-only topics present.
- [ ] UI: a document topic renders TRL + indicative labels.
