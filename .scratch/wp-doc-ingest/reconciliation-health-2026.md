# Reconciliation diff — Health 2026 (with a CL3 control)

**Status:** ready-for-human (run 2026-07-09) · **Relates to:** PRD `.scratch/wp-doc-ingest/PRD.md` Step 1
(audit gate), ADR-0008 · **Tool:** `reconcile_health_2026.py` (read-only) · **Data:** local `output_files/`
+ `pdf_files/HORIZON_2026/`

## Verdict (TL;DR)

The perceived "the API is thinner than the work-programme document" gap is **cluster-dependent**, and it
splits cleanly by the three ADR-0008 buckets:

- **Health 2026 → the PDF adds almost nothing.** All 38 topics are already in the API *and* the grouped
  file, with full Expected Outcome + Scope, all conditions, budgets, dates, and #projects. The Health WP
  uses **no per-topic TRL and no per-topic Expected Impact rows** (0 and 1 occurrences in 211 pages), so
  there is nothing structural for the document to add. The only genuine document-only field is the
  *"EU contribution per project"* phrase (34/38) — and that's redundant with the min/max numbers the API
  already provides. The one real gap is a **bucket-A extractor blank**: `status` is empty on all 38
  grouped topics while the API returns "Forthcoming" for every one. **→ A PDF pipeline is low-ROI for Health.**
- **CL3 (control) → the PDF adds real value.** Civil-Security topics use TRL and Expected Impact heavily,
  and the API structurally lacks them: TRL text in only **4/47** API topics, Expected Impact in **0/47** —
  while the document carries TRL on ~14/26 and Impact on ~7. Even a perfect extractor could not recover
  these from the API. **→ A PDF pipeline earns its keep on TRL/Impact-heavy clusters (CL3, and by
  extension CL4).**

Two operational findings fell out of the run:

- **`pdf_files/HORIZON_2026/` is edition-mixed.** The CL3 PDF on disk (`wp-6-civil-security…horizon-2025`)
  is the **2025** edition (all `CL3-2025-…` topics), while the calls in the API/graph are **2026-2027**
  (`CL3-2026/2027-…`) — **zero topic overlap**. Any real merge must parse the *edition that matches the
  calls*; **edition management is mandatory**, not optional.
- **The grouped files are inconsistently populated.** Health blanks `status`/`expected_eu_contribution`;
  CL3 fills those but blanks `min_contribution`. Consistent with the two extraction paths in
  `proposal-monitoring-app` (`programme_groupers` vs `fetch_api_batch`). A cheap **bucket-A cleanup**
  independent of any PDF work.

## Method

Three local sources for the *same* calls, so each bucket is directly measurable:

| Source | File | Represents |
|---|---|---|
| **PDF** | `pdf_files/HORIZON_2026/wp-4-health…pdf` | what the document has |
| **API-raw** | `fetched_call_metadata_2026_2027.json` → `raw.metadata` | what SEDIA actually returns |
| **GROUPED** | `cluster_CL1.grouped.json` (Health = Cluster 1) | what the pipeline ingests today |

Bucket **A** = blank in GROUPED but present in API-raw (cheap upstream fix). Bucket **B** = present in PDF
but absent/boilerplate in API-raw (only the PDF can fill). Bucket **C** = topic in PDF but not in API at
all (timing/permanence).

## Health 2026 — results

**Topic coverage** (join key = portal topic code)

| | PDF | API-raw | GROUPED | overlap | PDF-only (C) | API-only |
|---|---|---|---|---|---|---|
| Health | 38 | 38 | 38 | **38** | **0** | 0 |

Validated: "Specific conditions" appears exactly **38×** in the PDF (the 48 topic-ID header hits include
10 ToC/cross-reference lines) — so 38 is the true topic count, not a parser undercount. The API dump
already includes 2027 forthcoming topics, so **bucket C = 0 in this snapshot**.

**Bucket A — extractor blanks**

| Field | GROUPED blank | of which API-raw has it | Read |
|---|---|---|---|
| `status` | 38/38 | **38/38** | Pure extractor bug — API returns "Forthcoming" for all. Trivial fix. |
| `expected_eu_contribution` (narrative) | 38/38 | 0/38 | API narrative lacks the phrase, but `min/max_contribution` are populated 38/38 — data exists, phrasing doesn't. |
| `technology_readiness_level` | 38/38 | 1/38 | API has TRL for 1 topic; PDF has it for 0 → not recoverable, not needed for Health. |

**Bucket B — PDF fills, API lacks**

| Field | PDF-has, API-lacks | Note |
|---|---|---|
| `technology_readiness_level` | 0 | Health WP has no TRL rows (0 in 211 pp.) |
| `expected_impact` (per topic) | 0 | Health WP has no per-topic Impact rows (1 in 211 pp.) |
| `expected_eu_contribution` phrase | 34 | Only genuine doc-only text — redundant with API min/max numbers |

**Narrative parity:** API 38/38 and GROUPED 38/38 both carry Expected Outcome + Scope. The PDF's
narrative is not richer for loaded topics — only earlier/permanent (not observable in one snapshot).

**Title "mismatches": 21 — all extraction artifacts.** Every PDF title is a clean prefix of the API
title (the quick parser stops at the first line-wrap; the production parser's `_join_wrapped_title`
resolves it). **Zero real title divergence.**

## CL3 — control (shows what Health hides)

**Topic coverage** — note the edition mismatch:

| | PDF (2025 ed.) | API-raw (2026-27) | GROUPED | overlap |
|---|---|---|---|---|
| CL3 | 26 | 47 | 47 | **0** |

The "26 PDF-only / 47 API-only" is **not** a timing gap — it's a 2025 document vs 2026-2027 calls. Use it
only as structural evidence.

**The decisive comparison (TRL & Impact):**

| Field | GROUPED (2026-27) | API-raw (2026-27) | PDF (2025 ed.) | Bucket |
|---|---|---|---|---|
| `technology_readiness_level` | 0/47 | **4/47** | ~14/26 | **B** — API structurally lacks it; only the doc has it |
| `expected_impact` (per topic) | 0/47 | **0/47** | ~7/26 | **B** — API never has it; only the doc has it |
| `expected_outcome` / `scope` | 47/47 | 47/47 | present | — parity |
| `status` | 47/47 | present | — | (extractor fills it here, unlike Health) |

Document structural facts (CL3 2025 PDF): "Specific conditions" 25, "Technology Readiness Level" 16,
"Expected Impact" 6.

## What this means for the pipeline

1. **Value is cluster-dependent.** Build the PDF pipeline for clusters where bucket B is non-zero
   (TRL/Impact-heavy: CL3, CL4, likely CL5/CL6), **not** for Health, where the API already suffices and
   the gap is a 1-field extractor blank.
2. **Fix the cheap bucket-A blanks first**, independent of any PDF work: reconcile the two extraction
   paths so `status`, `expected_eu_contribution`, `min_contribution` are consistently populated wherever
   the API carries them. Health's empty `status` is the clearest quick win.
3. **Edition management is mandatory.** The doc folder mixes 2025 and 2026-2027 editions; a merge must
   pull the WP edition matching the call year, keyed per programme+edition.

## Recommendation

**Re-scope the pilot away from Health.** Health was chosen for clean parsing, but it is the case where
the document adds least. Pilot instead on **CL3 or CL4 with the matching 2026-2027 WP PDF** (which must
first be added to `pdf_files/` — the current CL3 PDF is the wrong edition), where TRL + Expected Impact
give a measurable, API-impossible payoff. Keep Health as the parser's easy smoke-test.

## Limitations

- **Single API snapshot** — bucket C (timing/permanence, incl. vanished closed calls) is under-observed;
  it would grow if the API were re-fetched after topics close. Not a one-shot-measurable bucket.
- **CL3 document is the 2025 edition** — used as structural proxy only; not joinable to 2026-2027 calls.
- Measures field **presence/length**, not a deep content-quality diff (e.g. how much the API's
  Annex-pointer conditions text loses vs the PDF's spelled-out conditions). A follow-up refinement.
- Quick PDF parser truncates wrapped titles (cosmetic; production parser resolves).

## How to run

```
python .scratch/wp-doc-ingest/reconcile_health_2026.py health   # default
python .scratch/wp-doc-ingest/reconcile_health_2026.py cl3
# add clusters via the CLUSTERS dict at the top of the script
```

Outputs `reconciliation-<cluster>.json` (per-topic detail) next to the script.

## Artifacts

- `reconcile_health_2026.py` — the parameterised diff (standing QA gate; graduates to `parsers/` when the pipeline is promoted)
- `reconciliation-health.json`, `reconciliation-cl3.json` — machine-readable per-run detail
