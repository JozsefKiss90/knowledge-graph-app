# CL3 — document+API merge, verified through the builder

**Status:** done 2026-07-09 · **Relates to:** ADR-0008, PRD `.scratch/wp-doc-ingest/PRD.md`,
`RUNBOOK.md`, reconciliation-report.md, `cl4-pilot-report.md` (the pilot this follows) ·
**Artifacts (this dir):** `cl3_wp_parser.py`, `cl3_merge.py`, `cluster_CL3.merged.json`,
`cluster_CL3.grouped.PREPILOT.bak`, `cl3-ui-topic.png`, `_refs/` (recovered prior-art parser).

CL3 (Civil Security for Society, WP Part 6) is the second cluster run through the CL4 recipe. It is a
**pure TRL-enrichment** case — simpler than the pilot in two ways and it exposed one new parser gotcha.

## Outcome — the TRL win lands as ingestable node props

Verified by driving the **real** `ClusterGraphBuilderCL3._build_call_props` on every merged call
(offline; the builder falls back to a `_DummyDB` without Neo4j), then re-verified on the live graph:

- **47/47 calls build cleanly, 0 errors** — ingests with **zero builder changes**.
- **TRL: 34 node props** (was **0/47**) — the 34 current CL3 topics whose WP document states a
  Technology Readiness Level. Closes the reconciliation bucket-B (TRL 30) for CL3 and then some (the
  merge fills TRL wherever the *grouped* file was blank — all 47 — not only the 30 where the API
  narrative also lacked it).
- **Additive:** 38 document-enriched + 9 API-only = 47; every original API topic preserved.
- **No coverage gap to fill (no bucket C).** Unlike CL4 (15 Space topics the API omits), every current
  CL3 PDF topic is already in the API, so **nothing is appended** — the merge is enrichment-only.
- **Provenance flows** via the existing `_description_section_keys` extension point: `content_source`
  (47: merged 38, api 9), `wp_edition` (47), `field_provenance` (38, JSON, marks the document-sourced
  fields per call).
- **`status` recomputed deterministically from dates** (status = f(opening, deadline); session date
  2026-07-09): **Forthcoming 22, Open 25** — no stale snapshot.

## How it works

1. **`cl3_wp_parser.py`** — reuses the recovered prior-art engine (`parse_call_block`/`extract_sections`/
   helpers) with real-definition-aware block splitting (block = one real def → next real def). CL3 is a
   single standard namespace (`HORIZON-CL3-20{26,27}-…`), so no EUSPA/agency broadening was needed.
   Output: **38 CL3 current topics, TRL 34/38, narrative (outcome+scope) 38/38.**
2. **`cl3_merge.py`** — ADR-0008 precedence: starts from the ingested `cluster_CL3.grouped.json` (47
   calls, API state), enriches each matched call with document-only content (TRL + any blank content
   field) tagging `field_provenance`, recomputes `status` from dates, stamps provenance, and advertises
   the extra fields via `_description_section_keys` so the builder ingests them. **No Space-append
   branch** (CL3 has no PDF-only topics) and **no id alias** (see below).

## CL3-specific findings (how it differs from the CL4 pilot)

- **No vintage id alias — nothing to canonicalise.** CL4 needed `MATERIALS-PRODUCTION → MAT-PROD` on 30
  ids. For CL3 the three id sets line up exactly: **parser ids ⊆ grouped ids, and grouped ids == current
  dump ids (0 stale, 0 missing, 47 == 47).** So `norm_key` carries no cluster rename and step 4
  (canonicalise) is skipped entirely.
- **State is fresh, not stale.** Diffing the pre-pilot grouped file against the current dump: **0 of 47
  topics differ on opening_date or deadline.** A rebuild-from-dump would refresh nothing (same lesson as
  CL4 gotcha #3).
- **9 `CS-ECCC` topics stay API-only (additive).** `HORIZON-CL3-{2026,2027}-02-CS-ECCC[-0x]` are
  cybersecurity/ECCC calls present in the API but absent from the WP PDF (separate ECCC programme
  section). The merge keeps them verbatim as `content_source=api` — never dropped.
- **New parser gotcha — an in-block cross-reference can hijack the engine's `call_id`.** The prior-art
  `parse_call_block` re-derives `call_id` by scanning the block, so when `HORIZON-CL3-2027-01-INFRA-01`'s
  narrative cites its 2025 predecessor, the engine mislabelled the whole block
  `HORIZON-CL3-2025-01-INFRA-01` (dropping the real 2027 topic, injecting a phantom 2025 one). Fix:
  **pin `rec["call_id"]` to the header id `cid`** (the block's own definition header is authoritative;
  block *content* was correct — only the label was wrong). This lesson generalises to any cluster whose
  topics reference prior-year predecessors.

## Notable pre-existing bug — `min__contribution` typo on 100% of CL3 calls

**All 47** CL3 grouped calls carry the numeric minimum under the double-underscore key
`min__contribution`; **0** use the correct `min_contribution` the builder reads. So the builder drops
the numeric MIN for every CL3 call and the UI renders **MIN CONTRIBUTION "—"** (visible in
`cl3-ui-topic.png`, where min == max == €6M but shows "—"). This is the pre-existing pipeline typo
flagged in RUNBOOK gotcha #8, and it is worse in CL3 (100%) than in CL4 (partial). Not a correctness or
honesty problem — the value is simply not surfaced — but the single highest-value **productionisation**
follow-up for this cluster. Left unfixed here to keep the merge identical in scope to the CL4 pilot (a
blanket `min__contribution → min_contribution` rename likely touches CL1/CL2/CL6 too and should be a
deliberate cross-cluster fix, not smuggled into the CL3 doc-merge).

## Promoted live + UI-verified — 2026-07-09

`cluster_CL3.merged.json` was **copied over** `output_files/cluster_CL3.grouped.json` (pre-pilot file
backed up to `cluster_CL3.grouped.PREPILOT.bak`; git-tracked, revertible) and ingested into the running
dev stack (`kg-dev-*` Docker) via `DELETE /cluster3/all` → `POST /cluster3/populate` (route prefix is
**`/cluster3`**, not `/cl3`; delete-first even though ids didn't change here, per the runbook).

- **Graph (`GET /cluster3/nodes`):** 47 Call nodes, **`technology_readiness_level` on 34** (was 0),
  `content_source` = {merged 38, api 9}, **0 stale ids, 0 duplicates**, 9 `CS-ECCC` preserved,
  status {Forthcoming 22, Open 25}. The INFRA-01 misparse is gone (both `2026-01-INFRA-01` and
  `2027-01-INFRA-01` present with correct ids).
- **UI driven** (headless Chrome via puppeteer-core; Cytoscape is canvas so navigation drives the cy
  instance's `tap` events): Cluster 3 → **"Resilient Infrastructure"** destination (LEVEL 3) → the topic
  `HORIZON-CL3-2027-01-INFRA-01` "Enhancing physical protection of critical infrastructures",
  **Forthcoming**, **PLANNED — ON OFFER (WORK PROGRAMME)**, IA, deadline Nov 4 2027, budget
  MAX €6M / TOTAL €12M / 2 projects, and a **TECHNOLOGY READINESS LEVEL** section ("Activities are
  expected to achieve TRL 6-7 by the end of the project – see General Annex B…"). CORDIS half shows the
  honest empty state ("Checking CORDIS…"). Screenshot: `cl3-ui-topic.png`.

Full path verified end-to-end: **PDF → merge → Neo4j → API → live UI.** Nothing committed — production
`cluster_CL3.grouped.json` is a working-tree change; revert with `git checkout --` (or restore the .bak).

## Productionisation checklist (not done here)

- **Fix the `min__contribution` typo** (double underscore → `min_contribution`) — **100% of CL3 calls**;
  cross-cluster (do it once for all grouped files, not per-cluster).
- **Promote TRL to a first-class builder prop** (`_build_call_props`) instead of riding
  `_description_section_keys` — it's a core field, not a description section.
- **Cosmetic:** `EXPECTED EU CONTRIBUTION` renders the raw string `6000000 - 6000000` while MAX/TOTAL
  render formatted `6 000 000 €` — a UI formatting gap, not a data issue (same as CL4).
