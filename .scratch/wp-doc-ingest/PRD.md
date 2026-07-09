# Work-programme document ingest — hybrid content+state call sourcing (CL4 pilot)

**Status:** ready-for-human (spec drafted 2026-07-09) · **Relates to:** ADR-0008 (this feature's
decision record), ADR-0006 (honesty/provenance), ADR-0003 (grouped-JSON ingest seam), PHASE-PLAN
(sequenced *after* CORDIS go-live — see §Sequencing) · **Owner:** unassigned

## Problem

The `:Call` layer is sourced today entirely from the F&T portal API (SEDIA), normalised in the sibling
repo `C:\Code\proposal-monitoring-app\app` and delivered as `*.grouped.json` files that
`BaseClusterBuilder` ingests. Three deficiencies motivate adding the official work-programme PDF as a
second source (full analysis in ADR-0008):

1. **Extractor blanks (cheap to fix, not this feature's job):** the Horizon grouper hardcodes
   `status = ""`, top-level `title` is `null`, `expected_eu_contribution` is emitted `""`. The API
   *returns* these — the extractor drops them. Flagged here so the pilot's reconciliation diff
   distinguishes them from real API gaps; the fix belongs in `proposal-monitoring-app`.
2. **API structural gaps (document fills):** per-topic *Specific conditions* (TRL,
   EU-contribution-per-project, procedure, page limits) are Annex-pointer boilerplate in
   `topicConditions`; per-topic `expected_impact` is only at destination level in the API.
3. **Timing & permanence gaps (document fills):** the API is `forthcoming`+`open` only, so 2027/later
   topics aren't indexed yet and closed topics disappear; the PDF is the full, permanent, citeable
   two-year programme, available months before calls open.

## Step 1 result — audit gate, matching editions run 2026-07-09 (full report: `reconciliation-report.md`)

Ran the three-way diff across **Health, CL2, CL3, CL4, CL6** on the matching 2026-2027 WP editions.
**The document's value is strongly cluster-dependent** (per-cluster numbers in the report):

- **CL3 / CL4 / CL6 (tech/science): build the pipeline.** Each carries per-topic **TRL that the API
  structurally lacks** — bucket B = 30 / 38 / 39 topics; TRL is blank in **100% of grouped topics across
  every cluster** and present for only 2–5 topics in the API, so it is unrecoverable without the document.
- **CL4 is the pilot.** Biggest TRL gap (38) **plus** the only real coverage gap: **15 `SPACE-03-*`
  topics that are genuine WP calls but entirely absent from the API** (bucket C, verified real + API-absent).
- **Health / CL2 (social/health): don't build.** No TRL/Impact used, API already has full content; the
  only gap is a **bucket-A blank** (`status` empty on Health 38/38 and CL2 52/52 — the two extraction paths
  disagree; CL3/CL4/CL6 fill it). Cheap pipeline fix, no PDF needed.
- **Merge stays additive:** CL3 has 9 `CS-ECCC` topics in the API but not the PDF — API-only topics are
  kept, never dropped.

**Consequences for this PRD:** (1) pilot re-scoped to **CL4** (Space bucket-C is the headline demo);
(2) ship the `status`/`expected_eu_contribution` extractor fix separately and first (near-free);
(3) **edition management is mandatory** — the folder still mixes editions (WIDERA `wp-11` is 2025; CL5
`wp-8` absent). Caveat: CL4 parser is audit-grade (78 of 89 "Specific conditions" resolved) so bucket-B
TRL is a floor — the production parser (resurrected prior art) is needed for complete extraction.

## Bucket-A extractor-blank fix — SHIPPED 2026-07-09 (in-repo data correction)

Split the two blank fields by their nature:

- **`expected_eu_contribution` (static WP figure) — FIXED.** Backfilled on the 9 old-schema grouped
  files (`cluster_CL1/CL2` + `HORIZON-ERC/MSCA/INFRA/EIC/EIE/MISS/WIDERA`), **183 records**, formatted
  `"{min} - {max}"` from the min/max already present (matching the old CL3–CL6 format; zero treated as
  absent so no `"0 - 0"`). Tool: `backfill_expected_eu_contribution.py` (idempotent; git-tracked files =
  undo). Verified: all 9 valid JSON, reconcile bucket-A `expected_eu_contribution` now **0 blank**,
  builder reads it at `base_cluster_builder.py:244`.
- **`status` (dynamic) — DELIBERATELY NOT backfilled.** The only in-repo source
  (`fetched_call_metadata_2026_2027.json`) is a **stale pre-close snapshot**: 160/444 calls have
  deadlines before today yet are still "Forthcoming"/"Open", and **0** are "Closed". Importing it would
  assert wrong current state (ADR-0006 #7). Finding: the existing CL3–CL6 `status` values are equally
  stale → **status honesty depends on the ADR-0008 live state-join**, not a backfill. Left blank.

**Not fixed in-repo:** `status` for the 7 non-cluster programmes (their raw data lives only in the
extractor). **Root cause (for durability, apply when the extractor repo is clean — it is currently
mid-refactor on `eu-funding-pipeline-refactor`, so NOT applied here):**
`proposal-monitoring-app/app/infrastructure/parsers/programme_groupers.py:241` (`status = ""` → resolve
from `actions[0].status.description`) and `split_calls_by_cluster.py:~358` (add
`expected_eu_contribution = f"{int(mn)} - {int(mx)}"` in `normalize_budget_fields`).

## CL4 pilot — DONE 2026-07-09 (full report: `cl4-pilot-report.md`)

Steps 2–5 executed and **verified through the real builder** (`_build_call_props`, offline via `_DummyDB`):
`cl4_wp_parser.py` (77 topics, TRL 53/77, reuses recovered prior-art engine) + `cl4_merge.py` →
`cluster_CL4.merged.json`. Result: **79/79 calls build clean, 0 errors; TRL now 53 node props (was 0/64);
15 Space topics surfaced (additive, 64 API + 15 doc); provenance + wp_edition flow via
`_description_section_keys` (zero builder change); status recomputed from dates (37 Closed / 42 Forthcoming).**
Finding: the ingested grouped file is a stale Jan vintage (`MATERIALS-PRODUCTION` vs the current dump/PDF
`MAT-PROD`) — pilot canonicalises the alias; productionisation should rebuild from the current dump.
**PROMOTED LIVE + UI-verified 2026-07-09**: copied over `cluster_CL4.grouped.json` (backup `.PREPILOT.bak`),
ingested via `POST /cluster4/populate` into the running `kg-dev` stack → graph has 53 TRL + 15 Space; drove
the UI (headless Chrome) to a Space topic card showing TRL + indicative labels (`cl4-pilot-ui-space-topic.png`).
Nothing committed (working-tree change). Remaining: rebuild-from-current-dump + tighten parser to full ~89.

## Decision (recap — see ADR-0008)

One merged record per topic, **keyed on the portal topic code**, with fixed per-field precedence and
recorded provenance. Content → document; state → API. The merge is additive (never drops API-only or
closed calls, never regresses a programme). PDF-only topics are kept as **indicative/forthcoming**.
Output is the **same grouped-JSON contract** the graph already ingests — so `BaseClusterBuilder`,
routes, and Neo4j populate are untouched.

### Per-field precedence

| Field(s) | Source of truth | Notes |
|---|---|---|
| `scope`, `expected_outcome` | **document** → API fallback | Identical text once API loads; PDF earlier |
| `expected_impact` (per topic) | **document** | API has it only at destination level |
| `technology_readiness_level`, `expected_eu_contribution` (per project), `procedure`, `legal_and_financial_setup`, `exceptional_page_limits`, `eligibility_conditions`, `admissibility_conditions` | **document** | API = Annex-pointer boilerplate |
| `indicative_budget`, `min_contribution`, `max_contribution`, `indicative_number_of_projects` | **document** planned → **API** confirms when live | Label planned figure as indicative |
| `call_id` / topic code | **API canonical** (PDF must match) | The join key |
| `call_title`, `type_of_action` | Either (API code + PDF readable title) | Both reliable |
| `opening_date`, `deadline`, `deadline_model`/stages | **API** | PDF timetable is indicative only ("Deadline" 7× in 211 pp.) |
| `status` (forthcoming/open/closed) | **API** | Dynamic |
| `funding_link`, `callccm2Id`, `callIdentifier` | **API** | Portal-only |
| `keywords`, `tags` | **API** | Portal taxonomy |

### Provenance to add (ADR-0006 #7)

Today there is **no field-level provenance** — only a node-level `source` pipeline tag injected at
`base_cluster_builder.py:222`. Add at that same seam:

- record-level `content_source` ∈ {`document`, `api`, `merged`} and `schedule_source` ∈ {`api`, `document`};
- `wp_edition` (e.g. `"HORIZON 2026-2027 / Part 4 Health"`) on document-sourced content;
- a `field_provenance` map (or `_src` suffixes) on the fields that can diverge, so the UI can render a
  document-only date as **"indicative (work programme)"** and never as a portal deadline.

## Scope — CL4 (Digital, Industry & Space) pilot

**Re-scoped from Health after the Step-1 audit** — CL4 maximises demonstrable value (38 TRL topics the
API lacks + 15 Space calls the API omits). **In:** `pdf_files/HORIZON_2026/wp-7-digital-industry-and-space_horizon-2026-2027_en.pdf`
(314 pp., ~78–89 topics). Full loop: parse (production parser — resurrect prior art) → API state pull →
merge → grouped JSON with provenance → ingest → verify honest labels + the 15 Space topics surfacing.
Health/CL2 stay API-only (kept as parser smoke-tests).

**Out (pilot):** other clusters/programmes; the `proposal-monitoring-app` extractor blank-field fixes
(ship separately & first, upstream in `proposal-monitoring-app`); DEP/Creative-Europe document *context* extraction
(no topic-ID calls — stay API-only per ADR-0008); UI copy beyond confirming labels render honestly.

## Grain & join key

PDF rows are **topics**; the API "call" bundles topics and often dates them at the *call-batch* level.
Keep the **topic** as the atomic `:Call` node (matches today). Join on the full topic code; attach batch
metadata via `callIdentifier`/`callccm2Id` (already in schema). Prior art matched on the 4-token call
prefix `HORIZON-AREA-YEAR-NN` via `call_id.startswith(prefix)` — reuse for the batch-level date window,
exact-match on the full code for content.

## Work breakdown

1. **Reconciliation diff (audit gate). — DONE 2026-07-09** (`reconcile_health_2026.py`,
   `reconciliation-report.md`, 5 clusters). Result above: CL3/CL4/CL6 real bucket-B (TRL); CL4 also 15
   Space bucket-C; Health/CL2 low-ROI (status blank only); merge additive. Gate outcome: pilot on CL4;
   ship the extractor-blank fix first. Diff is parameterised (`… <cluster>`) as the standing QA check.
2. **Resurrect + adapt the parser.** Restore the deleted chain from git
   (`git show HEAD:backend/routes/new_pipeline/parsers/he_wp_parser_merged_patched_with_dates.py`, etc.),
   point it at `wp-4-health…pdf`. Health uses `-CARE-/-DISEASE-/-TOOL-/-STAYHLTH-/-ENVHLTH-` codes, not
   `-D<n>-`, so destination grouping is header/ToC-based (CL5's D-code path N/A). Emit the rich content
   fields from the *Specific conditions* table + Expected Outcome/Scope. Handle text artifacts
   (soft-hyphens, `�` smart quotes, wrapped titles) — machinery already exists in the recovered code.
3. **Automate the state pull.** Replace the hand-maintained `destination_dates_clX.json` with a live
   per-topic API fetch (reuse `proposal-monitoring-app` SEDIA client) returning `opening_date`,
   `deadline(s)`, `deadline_model`, `status`, `funding_link`, `callccm2Id`, `budgetOverview`. Key on the
   topic code.
4. **Merge → grouped JSON with provenance.** Apply the precedence table; stamp `content_source` /
   `schedule_source` / `wp_edition` / `field_provenance`. Output `output_files/cluster_HLTH.grouped.json`
   (or overwrite the Health cluster file) in the exact envelope `BaseClusterBuilder` reads. **Never** let
   a failed PDF parse blank a call — fall back to API-only for that topic.
5. **Ingest + verify.** `POST /{health-prefix}/populate` (preview first), read back via `/nodes`,
   confirm: merged content present, dates labelled indicative where document-sourced, closed topics (if
   any) shown closed, API-only topics still present. Drive the actual call flow in the UI (per /verify).
6. **Chatbot coupling (follow-up, flagged not done):** `backend/chatbot/call_index.py:86-90` builds its
   index **directly from the raw API file**, bypassing grouped files — so the assistant will still answer
   from thinner API text unless repointed at merged content. Out of pilot scope; logged so it isn't lost.

## Acceptance criteria

- Reconciliation diff produced; three gap buckets quantified across Health/CL2/CL3/CL4/CL6. **(DONE)**
- Merged `cluster_CL4.grouped.json` validates against the current call schema (`base_cluster_builder.py:205-286`)
  and ingests with **zero** builder changes.
- Every call has `content_source`/`schedule_source`; document-sourced dates carry indicative provenance.
- No topic present in today's API CL4 data is missing after the merge (additive proof).
- **TRL is populated for the ~53 CL4 topics the document states it** (0 today) and **the 15 Space
  (`SPACE-03-*`) topics missing from the API are surfaced** — the concrete demonstration of the document's
  added value.

## Risks / watch-outs

- **Parser maintenance is the recurring cost**, not the build. Keep it rule-based; add the reconciliation
  diff as a *standing QA gate* per run. Consider an LLM pass **only** for the conditions table, never the
  whole doc.
- **Don't regress / don't lose closed calls** — the merge is additive; the document is the permanence layer.
- **`min__contribution` typo** (double underscore) in the CL4 file is silently dropped by the canonical
  props; don't reintroduce it — emit `min_contribution`.

## Open decisions (for the human)

1. **Where the merge lives.** Pilot recommendation: in the main repo under
   `backend/routes/new_pipeline/parsers/` (where the prior art already sat) + a small API-fetch step,
   emitting grouped JSON. Longer term: does parse+merge belong upstream in `proposal-monitoring-app`
   (which already owns extraction), leaving this repo a pure consumer of grouped files?
2. **Extraction method.** Rule-based (resurrect prior art) vs. rule-based + targeted LLM for the messy
   conditions table. Recommendation: start rule-based; add LLM only if the diff shows the conditions
   table is the dominant failure.

## Sequencing

Not go-live-blocking: every programme already has calls from the API, so this is content-depth +
earlier-coverage *enrichment*. Per PHASE-PLAN / CLAUDE.md ("a phase with two headlines has none"), this
runs as a **fast-follow after the CORDIS Railway seed**, piloted on **CL4** first to measure
parser-maintenance cost before scaling to CL3/CL6 and the other programmes.

## Key references

- Canonical call schema / provenance seam: `backend/routes/new_pipeline/base_cluster_builder.py:205-286`, `:222`, `:166-175`
- Ingest endpoint: `backend/routes/new_pipeline/cluster_routes_factory.py:104-119`
- Chatbot coupling: `backend/chatbot/call_index.py:86-90`
- Prior art (deleted, in git `HEAD`): `backend/routes/new_pipeline/parsers/he_wp_parser*.py`, `patch_call_dates.py`, `update_call_dates.py`, `extract_destinations_and_calls.py`, `cl2_full_destinations_allfields.json`, `destination-dates/destination_dates_cl*.json`
- API extractor: `C:\Code\proposal-monitoring-app\app` — `fetch_call_metadata.py`, `fetch_frameworks.py`, `programme_groupers.py`, `split_framework_calls_normalized.py`
- Pilot PDF: `pdf_files/HORIZON_2026/wp-4-health_horizon-2026-2027_en.pdf`
