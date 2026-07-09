# Reconciliation diff — Horizon clusters (Health, CL2, CL3, CL4, CL6)

**Status:** ready-for-human (run 2026-07-09, matching-edition 2026-2027 WPs) · **Relates to:** PRD
`.scratch/wp-doc-ingest/PRD.md` Step 1 (audit gate), ADR-0008 · **Tool:** `reconcile_health_2026.py`
(read-only, per-cluster) · supersedes the Health-only `reconciliation-health-2026.md`.

> **▶ To reproduce the CL4 document+API merge on another cluster/programme, follow `RUNBOOK.md`**
> (this dir) — the step-by-step recipe, per-cluster inputs, cluster-specific variations, and gotchas.
> This report tells you *which* clusters are worth doing (bucket B/C); the runbook tells you *how*.

## Verdict (TL;DR)

With the **matching 2026-2027 editions** now on disk, the earlier Health-only conclusion is overturned:
the work-programme document's value is **strongly cluster-dependent**, and it is clearly justified for the
tech/science clusters.

- **Tech/science clusters (CL3, CL4, CL6) → build the PDF pipeline.** Each carries per-topic **TRL that
  the API structurally lacks** (bucket B: 30 / 38 / 39 topics) — and TRL is blank in **100% of grouped
  topics across every cluster**, so it is unrecoverable without the document.
- **CL4 is the clear pilot.** Biggest TRL gap (38) **plus** the only real coverage gap: **15 Space
  (`SPACE-03-*`) topics that are genuine calls in the WP but entirely absent from the API** (bucket C,
  verified — real definitions with budget/conditions blocks). Without the document the app would simply
  *miss 15 fundable Space calls*.
- **Social/health clusters (Health, CL2) → don't build; just fix the extractor.** They use no TRL and no
  per-topic Impact, the API already carries full content, and the only gap is a cheap **bucket-A blank**
  (`status` empty on all their grouped topics).

## Cross-cluster results

| Cluster (token) | PDF | API | GRP | both | **B: TRL** (PDF-has / API-has) | **C: real PDF-only** | **A: `status` blank** | Verdict |
|---|---|---|---|---|---|---|---|---|
| Health (HLTH) | 38 | 38 | 38 | 38 | **0** (0 / 1) | 0 | **38/38** | Low — fix status |
| CL2 Culture/Society | 55 | 55 | 55 | 52 | **0** (1 / 1) | 0 | **52/52** | Low — fix status |
| CL3 Civil Security | 39 | 47 | 47 | 38 | **30** (34 / 4) | 0 · *(9 API-only)* | 0 | **High** |
| CL4 Digital/Industry/**Space** | 78 | 64 | 64 | 62 | **38** (53 / 2) | **15 (Space)** | 0 | **Pilot** |
| CL6 Food/Bioeconomy | 110 | 113 | 113 | 107 | **39** (43 / 5) | 1 | 0 | High |

*"TRL PDF-has / API-has" = topics where the document states a TRL / where the API narrative carries any
TRL text. Grouped TRL fill is **0/N for every cluster** — the pipeline never extracts it.*

## The three buckets, read across clusters

**Bucket B — TRL is the load-bearing, API-impossible field.** On CL3/CL4/CL6 the document states TRL for
34/39, 53/78, 43/110 topics respectively, while the API carries TRL text for only 4, 2, 5 — and the
grouped files carry it for **zero**. So even a perfect extractor could not source TRL from the API; only
the PDF has it. On Health/CL2 the document itself has no TRL rows (social/culture science), so bucket B is
genuinely empty there — not a parser miss (Health: 0 "Technology Readiness Level" in 211 pp.; CL2: 0).
Per-topic *Expected Impact* is mostly retired in the 2026-2027 editions (bucket B: CL6 7, CL2 2, rest 0).
The *EU-contribution-per-project phrase* shows a high bucket B everywhere (34–97) but is low-value —
redundant with the `min/max_contribution` numbers the API already supplies.

**Bucket C — CL4 Space is the standout, and it is real.** 15/15 `HORIZON-CL4-{2026,2027}-SPACE-03-*`
topics were verified as real topic definitions in the WP (each has a `Call: SPACE` + `Specific conditions`
+ `Expected EU contribution` block) **and confirmed absent from the API dump**. Space topics are routinely
published in the work programme but delayed/withheld from the public portal — exactly the timing/coverage
gap the document closes. No other cluster shows a material bucket C in this snapshot (CL6: 1; the rest 0).

**Bucket A — a cheap, extractor-only cleanup, independent of any PDF work.** `status` is blank on
**Health (38/38) and CL2 (52/52)** but fully populated on CL3/CL4/CL6 — the two extraction paths in
`proposal-monitoring-app` disagree. The API supplies `status` for all of them, so this is a pure
pipeline fix (~90 topics). (`expected_eu_contribution` is likewise blank on Health/CL2 but present on the
others.)

## Reverse gap — API-only topics (why the merge must stay additive)

CL3 has **9 `CS-ECCC` topics in the API but not matched in the PDF** (cybersecurity/ECCC calls — either a
separate WP section/annex or a distinct ECCC programme). CL4/CL6 API-only entries are `…-two-stage`
call-level placeholders, not topics. Lesson: the merge is **additive** (ADR-0008) — API-only topics are
kept, never dropped, and the PDF layer only enriches/extends.

## Recommendation

1. **Pilot the merge on CL4** (`wp-7-digital-industry-and-space`). It maximises demonstrable value: 38
   TRL topics the API can't provide **and** 15 Space calls the API omits entirely — a concrete
   "the document surfaces calls and rigour the portal hides" story.
2. **Ship the bucket-A extractor fix separately and first** — unblank `status`/`expected_eu_contribution`
   on Health + CL2 (and reconcile the two paths). Near-free, no PDF pipeline required.
3. **Add TRL as a first-class extracted field** — it is blank in 100% of grouped topics today and is the
   single field where the document is the *only* viable source across all tech clusters.
4. Keep Health/CL2 on API-only; keep this diff as the **per-cluster QA gate** before each cluster's merge.

## Limitations / caveats (honest)

- **Parser precision (audit-grade, not production).** CL4 has 89 "Specific conditions" tables but the
  quick parser resolved 78 real defs — so bucket-B TRL (38) is a *floor*, likely higher. Cross-reference
  false positives (old-year IDs cited in narrative prose) are now separated out by an edition filter;
  the production `is_real_call_block` + dedup (git prior art) removes them properly.
- **Single API snapshot.** Bucket C (and vanished *closed* calls) is under-observed — it would grow if
  the API were re-fetched after topics close. The 15 Space topics are a lower bound on the coverage gap.
- **Field presence/length measured, not deep content quality** (e.g. how much the API's Annex-pointer
  conditions text loses vs the PDF's spelled-out conditions). A follow-up refinement.
- **Wrapped-title mismatches** reported by the diff are cosmetic (quick parser truncates at first
  line-wrap); the production parser's `_join_wrapped_title` resolves them. Zero real title divergence.

## How to run

```
python .scratch/wp-doc-ingest/reconcile_health_2026.py <health|cl2|cl3|cl4|cl6>
# add clusters via the CLUSTERS dict at the top of the script as their WP PDFs land
```

Writes `reconciliation-<cluster>.json` (per-topic detail) next to the script. Missing clusters this run:
CL5 (`wp-8`, not on disk) and WIDERA (`wp-11` is still the 2025 edition — edition-mismatched).

## Artifacts

- `reconcile_health_2026.py` — parameterised diff (standing QA gate; graduates to `parsers/` on promotion)
- `reconciliation-{health,cl2,cl3,cl4,cl6}.json` — machine-readable per-cluster detail
