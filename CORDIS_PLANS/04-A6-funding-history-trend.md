# Execution Plan — **A6: Funding-history trend for a research area**

> Consumer of the data backbone (`CORDIS_PLANS/00-data-backbone.md`) and of A2's subject-area link
> (`CORDIS_PLANS/02-A2-funded-projects-panel.md`). Built on the **same** `HAS_FUNDED_PROJECT` edges and
> already-ingested `CordisProject` props — **A6 adds no new ingestion, only a new read endpoint + a new
> frontend card**.
> Process: this plan is the review checkpoint required before coding (ideas doc §"mandatory process").
> Status: **IMPLEMENTED & VERIFIED (offline)** on branch `cordis`.
>
> Decisions applied (recommended defaults, see §9): separate **"Funding history (CORDIS)"** card mounted
> directly after the A2 panel in `NodeDetail` · hide-when-empty (same gate as A2) · year bars grouped &
> coloured by **framework-programme era** · a **Projects / EU funding** measure toggle (counts ≠ funding
> stays clean) · honest factual summary (year span, eras, peak year) — **no fabricated "growing" claim**.
>
> **Built:** (backend) `GET /cordis/call-trend` in `cordis_routes.py` — a pure read endpoint
> (`_aggregate_call_trend` helper + the route) over the existing `HAS_FUNDED_PROJECT` links; **no new
> ingestion, no tagger/builder/parser change**. (frontend) `GraphPage/CordisEvidence/{useCordisTrend.js,
> CordisTrendPanel.jsx}`, `styles/components/_cordis-trend.scss` (+ `main.scss` import), mounted in
> `NodeDetail.js` after `CordisEvidencePanel`, gated on `viewModel.kind==="call"`.
>
> **Verified offline (real extractions, no mocks):** single-era fixture (cybersecurity q02) → 278
> projects, years 2022–2027 (53/70/61/55/36/3), €1,467,874,630, 0 undated, single HORIZON era, peak 2023
> (70) — asserted through the real `_aggregate_call_trend`. Multi-era fixture (cybersecurity q05) →
> chronological era ordering FP4→FP5→FP6→FP7→H2020→HORIZON→Unknown-last, count/undated reconciliation and
> per-year `byFp` integrity hold. Frontend build passes with **no new warnings**.
>
> **Adversarially reviewed** (9-agent workflow: backend / frontend / honesty-process, each finding
> verified): 5 confirmed findings fixed — measure-toggle segment truncation (now measure-filtered +
> legend mirrors drawn eras), funding toggle hidden when no EU contribution exists, `count(DISTINCT pr)`
> for consistency with `/call-evidence`, `mergeByEra` segment field-map, and plan/summary-text alignment.
>
> **Remaining (user — needs Neo4j + key):** after A2's `POST /cordis/tag-calls {"source":"cluster_3"}`
> ingest, open a CL3 call → the "Funding history (CORDIS)" card shows the year bars + era summary; toggle
> Projects ↔ EU funding. A6 writes nothing, so it has no data-rollback — removing the route + frontend
> files fully reverts it.

---

## 0. TL;DR

For a Horizon Europe call on screen, A6 shows **how EU-funded activity on that call's subject area has
evolved over time** — a small **bar chart of funded projects (or EU funding) per start year**, with the
bars grouped and coloured by **framework-programme era** (FP7 → Horizon 2020 → Horizon Europe), plus an
**era summary** (each era's year span, project count and EU funding) and a plain-language factual line
(*"Funded activity spans 2022–2027, all under Horizon Europe; peak year 2023 with 70 projects"*).

The honest headline is *"funded activity on this call's subject, by project start year (CORDIS,
FP7–Horizon Europe)"* — **not** the call's own budget or timeline.

The efficiency move: the data is **already in Neo4j**. A2's `/tag-calls` ingest already created
`(:Call)-[:HAS_FUNDED_PROJECT]->(:CordisProject)` and the builder already stores `pr.startDate`,
`pr.frameworkProgramme`, and `pr.ecContribution` on every project. So A6 is a **pure read feature**: one
new aggregation endpoint `GET /cordis/call-trend?call_id=…` that buckets those linked projects by start
year and era, and one new frontend card that renders it. No tagger/builder/parser change; no second
fetch; nothing hardcoded.

---

## 1. Goal & exactly what the card shows

For the call open in the detail page, render a **"Funding history (CORDIS)"** card showing:

| Element | Value | Honesty note |
|---|---|---|
| **Year bar chart** | one bar per start year from first→last funded year; bar height ∝ the selected measure; segments coloured by framework-programme era | shows the *shape over time* (growing / steady / winding down) — by **project start year**, not award date |
| **Measure toggle** | **Projects** (count) ↔ **EU funding** (€) — switches the bar heights | counts and euros are **separate measures**, never the same bar |
| **Era summary** | per era present (FP7 / Horizon 2020 / Horizon Europe): year span + project count + EU funding | how long the area has been funded, era by era |
| **Factual summary line** | single era → "Funded activity spans `{first}–{last}` all under `{era label}`."; multi era → "…across `{N}` EU programmes (`{oldest}` to `{newest}`)."; then "Peak year `{peakYear}` (`{peakCount}` projects).", + "(+`{N}` projects with no start date.)" when any are undated | computed from data only — **no editorialised trend verdict**; the single-era case **names** its one programme (clearer than a bare "1 programme" count, and still unmistakably single-era) |
| **Provenance caption** | the subject + "by project start year · CORDIS, FP7–Horizon Europe" | mirrors A1/A2 provenance convention |

**Where it attaches.** `frontend/src/components/NodeDetail.js`, **immediately after** the A2
`CordisEvidencePanel` mount (`NodeDetail.js:1267–1269`), inside the same `viewModel.kind === "call"`
block. Same `callId={nodeData.id || id}` identity A2 uses (the stable node id on the `HAS_FUNDED_PROJECT`
edge). A6 and A2 therefore appear / disappear together (both gate on the same evidence link).

**Honesty framing.** This card is about the **subject area over time**, deliberately distinct from the
call's own budget block ("Key Information", `NodeDetail.js:1185–1201`) and from the app's open-calls
timeline scrubber (which only covers the current programme's open calls). The single-era case is shown
honestly: when every project is Horizon Europe (as in the verified fixture), the chart shows one era and
the factual line says so — it never invents an FP7/H2020 history.

---

## 2. The data — already present, nothing new ingested

A6 reads the **exact same** projects A2 links to a call:

```
(:Call {id})-[:HAS_FUNDED_PROJECT]->(:CordisProject {source:"cordis"})
```

and uses three properties the backbone builder already writes on every `CordisProject`
(`cordis_builder.py:57–67`):

- `startDate` — ISO `YYYY-MM-DD` string → **start year** = `toInteger(left(startDate,4))`.
- `frameworkProgramme` — `HORIZON` / `H2020` / `FP7` (the **era**), from `relatedTopic`
  (`cordis_parser.py:89–91`). Coalesced to `Unknown` when absent.
- `ecContribution` — EU money awarded (€), for the funding measure.

**Verified against the real on-disk extraction** (cybersecurity q02, the backbone/A1/A2 fixture):
278 projects, **all `frameworkProgramme = HORIZON`**, start-year distribution
**2022:53 · 2023:70 · 2024:61 · 2025:55 · 2026:36 · 2027:3**, total EU contribution **€1,467,874,630**,
**0 undated**. So A6's chart for this subject is a 6-year, single-era (Horizon Europe) trend peaking in
2023 — exactly the honest single-era case.

**But the data is richer than the headline "FP7 → H2020 → Horizon Europe".** Scanning every extraction on
disk shows `frameworkProgramme` in real CORDIS data spans the **full programme history** — `FP2, FP3, FP4,
FP5, FP6, FP7, H2020, HORIZON` — **and** a long tail of non-framework / unclassified codes (`CIP`,
`IC-COST`, `IC`, `ECSC`, `EAEC_FWP`, `ENG`, `ENV`, `ET`, `HS`, `IS`, `REG`, and empty). The curated queries
A2 ingests are focused (the canonical one is HORIZON-only), but A6 **must not assume only the three
headline eras**: it must group by **whatever** programme codes the linked projects actually carry, order
them chronologically, and degrade gracefully for unknown codes. This is now a first-class design constraint
(see §3a ERA_ORDER and §4b FP_META + "Other programmes" bucketing).

No new node/edge/property is introduced. A6 cannot show data A2 hasn't already linked, so it inherits
A2's honesty guarantees for free.

---

## 3. Backend — one new read endpoint

### 3a. `GET /cordis/call-trend`

New route in `backend/routes/new_pipeline/cordis/cordis_routes.py`, alongside `/call-evidence`
(`:159–207`). It runs **one** aggregation query (year × era) and pivots in Python into the year buckets,
era summary, and totals the frontend needs. Counts and euros are kept as **separate fields**.

```python
@router.get("/call-trend")
def call_trend(call_id: str):
    """A6 funding-history trend: how the CORDIS funded projects linked to a call's subject AREA
    (HAS_FUNDED_PROJECT) are distributed across project START YEAR and FRAMEWORK-PROGRAMME era.
    Counts and euros are reported separately; projects with no parseable start date are reported
    as `undatedCount`, never silently dropped from the headline."""
    try:
        s = SOURCE_TAG
        # Headline totals (all linked projects — matches A2's /call-evidence so the two cards agree).
        head = db.query(
            "MATCH (c:Call {id:$cid})-[:HAS_FUNDED_PROJECT]->(pr:CordisProject {source:$s}) "
            "RETURN count(DISTINCT pr) AS projectCount, sum(pr.ecContribution) AS totalEcContribution, "
            "       head(collect(c.cordis_area_query)) AS subject",
            {"cid": call_id, "s": s},
        )
        # Year × era buckets (only projects with a parseable 4-digit start year).
        rows = db.query(
            "MATCH (c:Call {id:$cid})-[:HAS_FUNDED_PROJECT]->(pr:CordisProject {source:$s}) "
            "WHERE pr.startDate IS NOT NULL AND pr.startDate <> '' "
            "WITH toInteger(left(pr.startDate,4)) AS yr, "
            "     coalesce(pr.frameworkProgramme,'Unknown') AS fp, pr.ecContribution AS ec "
            "WHERE yr IS NOT NULL "
            "RETURN yr, fp, count(*) AS n, sum(ec) AS funding ORDER BY yr, fp",
            {"cid": call_id, "s": s},
        )

        h = head[0] if head else {}
        project_count = h.get("projectCount", 0) or 0
        total_ec = h.get("totalEcContribution", 0) or 0

        # Pivot rows -> per-year buckets {year, count, funding, byFp:[{fp,n,funding}]}
        years = {}
        eras = {}
        dated = 0
        for r in rows:
            yr, fp = r["yr"], r["fp"]
            n = r["n"] or 0
            funding = r["funding"] or 0
            dated += n
            yb = years.setdefault(yr, {"year": yr, "count": 0, "funding": 0.0, "byFp": []})
            yb["count"] += n
            yb["funding"] += funding
            yb["byFp"].append({"fp": fp, "n": n, "funding": funding})
            er = eras.setdefault(fp, {"fp": fp, "count": 0, "funding": 0.0,
                                      "firstYear": yr, "lastYear": yr})
            er["count"] += n
            er["funding"] += funding
            er["firstYear"] = min(er["firstYear"], yr)
            er["lastYear"] = max(er["lastYear"], yr)

        year_buckets = [years[y] for y in sorted(years)]
        # Eras ordered chronologically across the FULL programme history (real data has FP2..HORIZON
        # plus non-FP codes). Unknown/non-FP codes sort last, then by first year. Backend stays HONEST
        # and COMPLETE: it returns every raw code as-is; the frontend (FP_META) decides presentation.
        ERA_ORDER = {"FP1": 1, "FP2": 2, "FP3": 3, "FP4": 4, "FP5": 5, "FP6": 6,
                     "FP7": 7, "H2020": 8, "HORIZON": 9}
        era_list = sorted(eras.values(),
                          key=lambda e: (ERA_ORDER.get(e["fp"], 99), e["firstYear"]))
        peak = max(year_buckets, key=lambda b: b["count"], default=None)

        return {
            "call_id": call_id,
            "subject": h.get("subject"),
            "projectCount": project_count,
            "totalEcContribution": total_ec,
            "datedProjectCount": dated,
            "undatedCount": max(project_count - dated, 0),
            "firstYear": year_buckets[0]["year"] if year_buckets else None,
            "lastYear": year_buckets[-1]["year"] if year_buckets else None,
            "eraCount": len(era_list),
            "peakYear": peak["year"] if peak else None,
            "peakCount": peak["count"] if peak else 0,
            "yearBuckets": year_buckets,
            "eras": era_list,
            "provenance": "Funded activity on this call's subject, by project start year "
                          "(CORDIS, FP7-Horizon Europe)",
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"CORDIS call-trend failed: {str(e)}")
```

**Exact response shape the frontend consumes** (values from the verified fixture):

```json
{
  "call_id": "cl3-2026-...-id",
  "subject": "Post-quantum cryptography for secure software",
  "projectCount": 278,
  "totalEcContribution": 1467874629.74,
  "datedProjectCount": 278,
  "undatedCount": 0,
  "firstYear": 2022,
  "lastYear": 2027,
  "eraCount": 1,
  "peakYear": 2023,
  "peakCount": 70,
  "yearBuckets": [
    { "year": 2022, "count": 53, "funding": 293047314.0, "byFp": [ { "fp": "HORIZON", "n": 53, "funding": 293047314.0 } ] },
    { "year": 2023, "count": 70, "funding": 408632234.0, "byFp": [ { "fp": "HORIZON", "n": 70, "funding": 408632234.0 } ] }
  ],
  "eras": [
    { "fp": "HORIZON", "count": 278, "funding": 1467874629.74, "firstYear": 2022, "lastYear": 2027 }
  ],
  "provenance": "Funded activity on this call's subject, by project start year (CORDIS, FP7-Horizon Europe)"
}
```

Cypher notes: `left(startDate,4)` + `toInteger(...)` extracts the year using **built-in** Cypher string
functions (no APOC); malformed dates become `null` and are filtered (`WHERE yr IS NOT NULL`), and counted
into `undatedCount` via `projectCount - datedProjectCount` — **honest, nothing silently dropped**. Returns
`projectCount:0` with empty `yearBuckets`/`eras` when no area link exists → drives the frontend
hide-when-empty. **No `DELETE`/cleanup route is needed** — A6 writes nothing; its rollback is purely code
(remove the route + frontend files).

---

## 4. Frontend

### 4a. Fetch hook — `GraphPage/CordisEvidence/useCordisTrend.js`

Mirror `useCordisEvidence.js` exactly (per-`call_id` `Map` cache, request-race guard): `GET
/cordis/call-trend?call_id=<id>` → `{ loading, data, error }`. Placed in the existing `CordisEvidence/`
folder (sibling of the A2 hook) so both CORDIS detail cards live together.

### 4b. Card — `GraphPage/CordisEvidence/CordisTrendPanel.jsx`

Mirrors `CordisEvidencePanel.jsx`'s `nd-card` markup and hide-when-empty contract (`return null` when
`!callId`, `loading`, `!data`, or `projectCount === 0`). Sub-blocks:

- **Header** `nd-card-header` → title **"Funding history (CORDIS)"**.
- **Hint** (`cordis-trend__hint`): *"How EU-funded activity on this research area has evolved by project
  start year, across framework programmes — not this call's budget or timeline."*
- **Measure toggle** (`useState("projects")`): two buttons **Projects** / **EU funding**, reusing the
  dashboard tab idiom (`FundingByProgramme.jsx:19–30`, classes `dash-card__tab(--active)`) so it matches
  existing UI. Selected measure picks `count` vs `funding` for bar heights.
- **Year bar chart** (`cordis-trend__chart`, plain CSS flex — **no SVG**, far simpler than
  `TimelineBarChart.jsx`): build a **dense year axis** from `firstYear`→`lastYear` (gap years rendered as
  empty zero-height slots so a tail-off is visible). Each year is a vertical bar whose height ∝
  `metric(year) / maxMetric`; the bar is a **stack of era-coloured segments** from `byFp` (segment height
  ∝ its share of that year's metric). `title` attribute per bar = `"<year> · <n> projects · <€funding> ·
  <era label(s)>"` for an accessible hover tooltip. Year labels under the axis, **thinned** when the span
  is wide (≤10 years → all; else ~6 evenly spaced, always including first & last).
- **Era legend** (`cordis-trend__legend`): a colour key for **only the eras present**, using the shared
  `FP_META` map (label + colour). Single-era subjects show one key — honest, not padded.
- **Era summary** (`cordis-trend__eras`, a list, deliberately *not* bars — distinct from A2's FP-spread
  bars): one row per era → `Horizon Europe · 2022–2027 — 278 projects · €1.5B`.
- **Factual summary** (`cordis-trend__summary`): single-era → *"Funded activity spans 2022–2027 all under
  Horizon Europe. Peak year 2023 (70 projects)."*; multi-era → *"…across 3 EU programmes (FP7 to Horizon
  Europe). Peak year …"* + *"(+N projects with no start date.)"* only when `undatedCount > 0`. Built purely
  from the response — **no "growing/declining" editorialising**.
- **Provenance** (`cordis-trend__prov`): `data.provenance` + `— "{subject}"`.

**Formatter:** reuse the identical `formatBudget` already copied into `CordisEvidencePanel.jsx:6–12`
(`€X.XB/€X.XM/€XK/—`); counts use `.toLocaleString()`. **Counts and euros are never combined** in one
number.

**Shared era metadata + bucketing** (single source of truth, top of `CordisTrendPanel.jsx`). Real
`frameworkProgramme` values span the whole programme history plus a tail of non-FP/unclassified codes
(§2), so A6 maps the **named framework programmes** to a chronological colour ramp and **collapses every
other code into one "Other programmes" bucket** — keeping the chart, legend, and era summary readable
without hiding that other funded activity exists:

```js
const FP_META = {
  HORIZON: { label: "Horizon Europe", color: "#34d399", order: 9 }, // newest → green
  H2020:   { label: "Horizon 2020",   color: "#60a5fa", order: 8 }, // blue
  FP7:     { label: "FP7",            color: "#a78bfa", order: 7 }, // violet
  FP6:     { label: "FP6",            color: "#c084fc", order: 6 },
  FP5:     { label: "FP5",            color: "#e879f9", order: 5 },
  FP4:     { label: "FP4",            color: "#f472b6", order: 4 },
  FP3:     { label: "FP3",            color: "#fb7185", order: 3 },
  FP2:     { label: "FP2",            color: "#fda4af", order: 2 }, // oldest → rose
};
const OTHER_ERA = { label: "Other programmes", color: "#94a3b8", order: 100 };
const eraMeta = (fp) => FP_META[fp] || OTHER_ERA;          // unknown/empty/non-FP → "Other"
const eraKey  = (fp) => (FP_META[fp] ? fp : "__other");     // merge-key for bucketing
```

The frontend re-aggregates the backend's raw `byFp` / `eras` by `eraKey` so the year-bar segments, the
legend, and the era-summary rows each show **named FP eras + a single "Other programmes" row** — never a
dozen unreadable colours, never a fabricated era. Segment/legend/summary stacking order follows
`eraMeta(fp).order` (oldest at the bottom of each bar, newest on top), matching chronology.

### 4c. Styles — `styles/components/_cordis-trend.scss` (+ `main.scss` import)

New partial imported in `styles/main/main.scss` (next to the A2 `cordis-evidence` import at `:30`). Holds
only A6-specific classes: the flex chart (`cordis-trend__chart`, `__bar`, `__bar-seg`, `__axis`,
`__axis-label`), legend chips, era list, hint/summary/prov captions. Bar **segment colours are applied
inline** from `FP_META[fp].color` (so the bars are visibly coloured — A2's reused `dash-funding__bar-fill`
class carries no default fill). Dark/light handled via existing CSS vars (`--foreground-muted`, `--border`,
`--muted`).

### 4d. Mount — `NodeDetail.js`

Extend the existing call-only block (`:1267–1269`) to render both CORDIS cards:

```jsx
{viewModel.kind === "call" && (
  <>
    <CordisEvidencePanel callId={nodeData.id || id} />
    <CordisTrendPanel callId={nodeData.id || id} />
  </>
)}
```

plus one import line next to `CordisEvidencePanel`'s (`NodeDetail.js:21`).

---

## 5. Honesty & provenance (mapped to concrete UI)

Per `CORDIS_FEATURE_IDEAS.md:27–87` and the verified constraints:

1. **Real data only.** Every figure comes from `parse_extraction` → `ingest` → Neo4j → the
   `/call-trend` aggregation. No hardcoded/placeholder values in `CordisTrendPanel.jsx`. Empty/`projectCount
   === 0` → render nothing (hide-when-empty), never zeros-as-claims.
2. **Counts ≠ funding.** The measure **toggle** keeps projects (count) and EU funding (€) on separate
   bars with their own formatters; they are never summed or mixed in one figure.
3. **By start year, stated as such.** Labels and provenance say "by project start year" — A6 does not
   claim award dates, spend schedules, or impact over time.
4. **Single-era honesty.** When all projects are one era (the fixture's all-Horizon-Europe case), the
   chart shows one era and the factual line reads "all under Horizon Europe" — it names the single
   programme (unmistakably single-era) and never fabricates an FP7/H2020 history or a multi-era "decline".
5. **No fabricated trend verdict.** The summary line states only data-derived facts (span, era count,
   peak year). It does **not** assert "growing/winding down" — the user reads that from the chart shape.
6. **Undated projects surfaced, not dropped.** `undatedCount` is shown when > 0 so the chart's totals
   reconcile with A2's headline; nothing is silently excluded.
7. **Subject area, NOT the call's budget/timeline.** The hint and provenance state this explicitly; the
   card is visually separate from the call's "Key Information" budget block and from the open-calls
   timeline scrubber.
8. **No methodology jargon.** Only the human subject (`Call.cordis_area_query`) and plain labels; no
   query strings, task IDs, or `cluster_3` artefacts in the UI.

---

## 6. Step-by-step

1. **Backend (3a):** add `GET /cordis/call-trend` to `cordis_routes.py` (year × era aggregation + Python
   pivot). No tagger/builder/parser change.
2. **Offline verify (3a logic, §7):** compute the same aggregation from the parsed real fixture in pure
   Python and assert it matches the known truth (278 / years 2022–2027 / single HORIZON era / €1.47B /
   0 undated).
3. **Frontend (4a–4c):** `useCordisTrend.js`, `CordisTrendPanel.jsx`, `_cordis-trend.scss` + `main.scss`
   import.
4. **Mount (4d):** add the import + render `CordisTrendPanel` after `CordisEvidencePanel` in `NodeDetail.js`.
5. **Build** the frontend; adversarial review; update this file's Status to *Implemented & Verified
   (offline)*.

---

## 7. Verification

**Offline (real data on disk — primary correctness proof).** Fixture
`C:\Code\knowledge-graph-app\CORDIS\data\extracted\cybersecurity_pqc_secure_software\cybersecurity_pqc_secure_software_q02\json.zip`.
- `parse_extraction(<path>)` → 278 projects (parser is pure; no DB).
- **Aggregation in isolation:** replicate the §3a year × era pivot directly from the parsed dicts and
  assert: `projectCount == 278`; `yearBuckets` years/counts ==
  `{2022:53, 2023:70, 2024:61, 2025:55, 2026:36, 2027:3}`; `eras == [{fp:"HORIZON", count:278,
  firstYear:2022, lastYear:2027}]` (proves single-era is shown honestly, no fake FP7/H2020 bars);
  `round(totalEcContribution) == 1467874630`; `undatedCount == 0`; `peakYear == 2023`, `peakCount == 70`.
  **No hardcoded values** — all from parsed dicts.

**Live end-to-end (user — needs `CORDIS_API_KEY` + Neo4j, neither in the sandbox).**
1. Run A2's ingest once: `POST /cordis/tag-calls {"source":"cluster_3"}` (creates the
   `HAS_FUNDED_PROJECT` links A6 reads).
2. `GET /cordis/call-trend?call_id=<a CL3 call id>` → non-zero `projectCount`, populated `yearBuckets`
   and `eras`.
3. In the app: open that call's detail → the "Funding history (CORDIS)" card shows the year bars + era
   summary; toggle Projects ↔ EU funding; open a call with no curated subject → no card (hide-when-empty).

**Frontend build.** `node node_modules/react-scripts/bin/react-scripts.js build` (npx is broken on this
Windows setup, per project memory). Pre-existing warnings are expected; A6 must add none new.

---

## 8. Rollback

- **Code only — A6 writes no data.** Delete the `GET /cordis/call-trend` handler; delete
  `CordisTrendPanel.jsx`, `useCordisTrend.js`, `_cordis-trend.scss`; remove the `main.scss` import and the
  one import + render line in `NodeDetail.js`. No schema/data migration to undo (A6 introduces no nodes,
  edges, or properties). A2's `DELETE /cordis/area-links` still governs the underlying links.

---

## 9. Decisions (recommended defaults applied; flagged for review)

1. **Placement:** **separate "Funding history" card after the A2 panel** (applied — keeps A6 independently
   rollback-able and mirrors A2 being a separate card after the TRL card) vs. a section inside the A2 card.
2. **Measure:** **Projects / EU funding toggle** (applied — serves the counts≠funding honesty rule and lets
   the user read the trend in both measures) vs. count-only bars.
3. **Empty subjects:** **hide the card** (applied — identical gate to A2; the two cards appear together)
   vs. an empty-state message.
4. **Bar grouping:** **stacked era-coloured segments per year** (applied — honest for overlap years and
   shows the era transition) vs. a single dominant-era colour per bar.
5. **Trend verdict:** **factual summary only** (span / era count / peak year; applied) vs. a computed
   "growing/steady/winding-down" label (rejected — risks over-claiming on sparse or single-era data).
