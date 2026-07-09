# Work-programme document ingest — hybrid content+state call sourcing (Health 2026 pilot)

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

## Step 1 result — audit gate run 2026-07-09 (full report: `reconciliation-health-2026.md`)

Ran the three-way diff on Health + a CL3 control. **The document's value is cluster-dependent:**
- **Health: low ROI.** All 38 topics already in API+grouped with full narrative/conditions/budget/dates;
  Health WP uses **no TRL and no per-topic Expected Impact** rows, so bucket B ≈ 0. Only real gap = a
  bucket-A extractor blank (`status` empty on 38/38 while API returns "Forthcoming").
- **CL3: real ROI.** TRL and Expected Impact are genuine **bucket B** — API carries TRL for only 4/47
  topics and Impact for 0/47, while the document has TRL ~14/26 and Impact ~7. Only the PDF can supply them.
- **Edition management is mandatory:** `pdf_files/HORIZON_2026/` mixes editions (the CL3 PDF is 2025 while
  its calls are 2026-2027 — zero overlap). A merge must parse the edition matching the call year.
- **Cheap bucket-A cleanup exists** independent of the PDF: grouped files are inconsistently populated
  (Health blanks `status`; CL3 blanks `min_contribution`) — the two extraction paths disagree.

**Consequence for this PRD:** the pilot cluster is **re-scoped away from Health** (kept only as parser
smoke-test) toward a TRL/Impact-heavy cluster (CL3/CL4) **once its matching 2026-2027 WP PDF is added** to
`pdf_files/`. Do the `status`/`expected_eu_contribution` extractor fix first regardless — it's near-free.

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

## Scope — Health 2026 pilot only

**In:** `pdf_files/HORIZON_2026/wp-4-health_horizon-2026-2027_en.pdf` (211 pp., ~43–49 topics, verified
templated + topic IDs present in the text layer). Full loop: parse → API state pull → merge → grouped
JSON with provenance → ingest → verify honest labels in the graph.

**Out (pilot):** all other clusters/programmes; the `proposal-monitoring-app` extractor blank-field
fixes (bucket 1 — separate, upstream); DEP/Creative-Europe document *context* extraction (they have no
topic-ID calls — stay API-only per ADR-0008); any UI copy work beyond confirming labels render honestly.

## Grain & join key

PDF rows are **topics**; the API "call" bundles topics and often dates them at the *call-batch* level.
Keep the **topic** as the atomic `:Call` node (matches today). Join on the full topic code; attach batch
metadata via `callIdentifier`/`callccm2Id` (already in schema). Prior art matched on the 4-token call
prefix `HORIZON-AREA-YEAR-NN` via `call_id.startswith(prefix)` — reuse for the batch-level date window,
exact-match on the full code for content.

## Work breakdown

1. **Reconciliation diff (audit gate). — DONE 2026-07-09** (`reconcile_health_2026.py`,
   `reconciliation-health-2026.md`). Result above: Health low-ROI, CL3 real bucket-B, edition management
   required. Gate outcome: fix extractor blanks first; re-scope pilot to a TRL/Impact cluster with its
   matching-edition PDF. Diff is parameterised (`… <cluster>`) as the standing per-cluster QA check.
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

- Reconciliation diff produced; three gap buckets quantified for Health 2026.
- `cluster_HLTH.grouped.json` validates against the current call schema (`base_cluster_builder.py:205-286`)
  and ingests with **zero** builder changes.
- Every call has `content_source`/`schedule_source`; document-sourced dates carry indicative provenance.
- No topic present in today's API Health data is missing after the merge (additive proof).
- At least the *Specific conditions* fields (TRL, EU-contribution-per-project) are populated for pilot
  topics where the API had boilerplate — the concrete demonstration of the document's added value.

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
runs as a **fast-follow after the CORDIS Railway seed**, piloted on Health 2026 first to measure
parser-maintenance cost before scaling to other clusters/programmes.

## Key references

- Canonical call schema / provenance seam: `backend/routes/new_pipeline/base_cluster_builder.py:205-286`, `:222`, `:166-175`
- Ingest endpoint: `backend/routes/new_pipeline/cluster_routes_factory.py:104-119`
- Chatbot coupling: `backend/chatbot/call_index.py:86-90`
- Prior art (deleted, in git `HEAD`): `backend/routes/new_pipeline/parsers/he_wp_parser*.py`, `patch_call_dates.py`, `update_call_dates.py`, `extract_destinations_and_calls.py`, `cl2_full_destinations_allfields.json`, `destination-dates/destination_dates_cl*.json`
- API extractor: `C:\Code\proposal-monitoring-app\app` — `fetch_call_metadata.py`, `fetch_frameworks.py`, `programme_groupers.py`, `split_framework_calls_normalized.py`
- Pilot PDF: `pdf_files/HORIZON_2026/wp-4-health_horizon-2026-2027_en.pdf`
