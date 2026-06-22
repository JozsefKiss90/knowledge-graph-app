# Execution Plan — **Dashboard CORDIS features (portfolio-wide funded reality)**

> Consumer of the data backbone (`CORDIS_PLANS/00-data-backbone.md`) and the A1/A2 links it created
> (`HAS_FUNDED_PROJECT`, `PARTICIPATED_IN {role, ecContribution}`, `CLASSIFIED_AS`, `CordisOrganisation.country`,
> `CordisProject.{ecContribution, frameworkProgramme, startDate}`). These features add **portfolio-wide read
> aggregates** to the existing **`PortfolioDashboard`** — they introduce **no new ingestion** and **no new
> node/edge/property**. They only add **read endpoints + dashboard cards**.
>
> Process: this plan is the review checkpoint required before coding (ideas doc §"mandatory process").
> Status: **F1–F6 ALL IMPLEMENTED & VERIFIED (offline)** (each independently shippable, built **one at a
> time**, each verified and its sub-status flipped to *Implemented & Verified* before the next). The whole
> "Funded reality (CORDIS)" dashboard section is now complete; live end-to-end (Neo4j + key, after an A2
> ingest) remains the user's step.
>
> Scope guardrail (ideas doc): real CORDIS data only (no hardcoded/mocked/fabricated values, no methodology-
> project jargon); counts (projects/orgs) and euros are **separate measures**, never conflated; "most funded"
> is not "best"; CORDIS is **EU-funded participation only**, so absence ≠ no activity. Every card carries the
> standing CORDIS provenance caption.

---

## 0. TL;DR & the non-redundancy principle

The dashboard today (`GraphPage/Dashboard/PortfolioDashboard.jsx`) is **100% work-programme data** via
`useDashboardData(loadFromStore)` — the **money on offer** half (indicative budgets of open calls, deadlines,
calls-over-time, topic buckets). It shows **zero CORDIS data**.

Every CORDIS feature built so far (A2/A6/B2/B3/B5/B4) is a **per-call graph drawer**: select a node → see *that
one call's* funded landscape (`CordisEvidence/`, `CordisFields/`, `CountryActivity/`). **None of them answer
portfolio-level questions.**

So the non-redundant opportunity is the **funded-reality counterpart to the planned-funding dashboard** — a set
of **portfolio-wide aggregates** rolled up over *all* CORDIS projects linked to the tracked calls. Each card
below is the aggregate twin of a per-call drawer and never duplicates it:

| Dashboard card (this plan) | Scope | Per-call drawer it complements (not duplicates) |
|---|---|---|
| **F1** Funded-reality KPI band | whole portfolio totals | — (A2 shows one call's totals) |
| **F2** Planned vs Awarded (idea **A4**, never built) | per programme/cluster, offered € vs awarded € | — (A2 shows one call's awarded €) |
| **F3** Funded activity over eras | whole-portfolio FP7→Horizon timeline | A6 (one call's trend) |
| **F4** Funded-field portfolio mix | top EuroSciVoc domains across portfolio | B5 (drill one field → its calls) |
| **F5** Top countries leaderboard | portfolio country ranking | B4 (overlay one chosen country on the graph) |
| **F6** Top funded organisations | portfolio org leaderboard | B2 (one call's partners) |

**Shared architecture.** A new dashboard section — **"Funded reality (CORDIS)"** — rendered at the bottom of
the dashboard grid, **hidden entirely when no CORDIS data is ingested** (hide-when-empty, exactly like the
drawers). One thin fetch hook per feature (the `CordisEvidence/use*` pattern: module `Map` cache + request-race
guard), each hitting one read endpoint. F4/F5 **reuse existing endpoints** (`/field-tree`, `/country-activity`
facets) — zero backend cost; F1/F2/F3/F6 each add **one** read endpoint with a **pure, offline-testable rank/
aggregate helper** (mirroring `_aggregate_call_trend` / `_rank_area_organisations` / `_rank_country_areas`).

**Honesty backbone applied everywhere.** Counts and euros shown as distinct figures; programmes/fields/countries
with no CORDIS match shown as **"no data"**, never as a fabricated zero; a standing provenance caption per card;
no methodology jargon (plain labels only). Nothing hardcoded — an empty graph yields empty cards.

---

## F1 — Funded-reality KPI band  *(cheapest; build first — it proves the section + the gate)*

> Status: **IMPLEMENTED & VERIFIED (offline)** on branch `cordis`.
>
> **Built:** (backend) `cordis_routes.py` — `PORTFOLIO_PROVENANCE`, the pure `_shape_portfolio_summary` helper,
> and `GET /cordis/portfolio-summary` (distinct call-linked projects → count + awarded euros; distinct calls;
> distinct orgs + non-blank countries; distinct research fields — all over `HAS_FUNDED_PROJECT`). No
> parser/builder/tagger change; no new node/edge/property. (frontend) `Dashboard/useCordisPortfolio.js` (singleton
> cached fetch + the section gate), `Dashboard/CordisKpiRow.jsx` (five `KpiCard`s, euros via the existing
> `unit="currency"`), the gated `dash-grid__cordis` block in `PortfolioDashboard.jsx` (section header + provenance
> caption + a "across N tracked calls / counts ≠ euros" note), and `styles/components/_dashboard-cordis.scss`
> (+ `main.scss` import) with a 5-column KPI grid variant.
>
> **Verified offline (no DB):** `_shape_portfolio_summary` over synthesised rows — populated totals preserved,
> empty graph (all `None`) → all-zero (drives hide-when-empty), and `None`/partial rows coalesce to 0 (null euros
> and null country count → 0). Frontend build compiles with **no new warnings**.
>
> **Remaining (user — needs Neo4j + key):** after an A2 ingest (`POST /cordis/tag-calls {"source":"cluster_1"}`),
> `GET /cordis/portfolio-summary` returns non-zero `projectCount`; the dashboard then shows the "What's actually
> been funded (CORDIS)" band under the planned KPIs. With no CORDIS data the section is absent. F1 writes nothing
> — removing the route + frontend files fully reverts it (§F1.6).

### F1.1 Goal
A KPI row mirroring the existing `KpiCardsRow`, directly under it, headed **"What's actually been funded
(CORDIS)"**: the portfolio totals of the funded reality — **funded projects**, **EU € awarded**,
**organisations**, **countries**, **research fields** — rolled up over the CORDIS projects **linked to tracked
calls**. This is the headline counterpart to the planned KPIs ("Total committed / Open calls / …").

### F1.2 Data — already in Neo4j, nothing new
```
(:Call)-[:HAS_FUNDED_PROJECT]->(pr:CordisProject {source:"cordis"})
pr<-[:PARTICIPATED_IN]-(og:CordisOrganisation {source:"cordis", country})
pr-[:CLASSIFIED_AS]->(rf:ResearchField {source:"cordis"})
```
- **funded projects** = `count(DISTINCT pr)` linked to any Call; **EU € awarded** = `sum(pr.ecContribution)`
  over those distinct projects; **organisations / countries / research fields** = distinct `og` / `og.country` /
  `rf` reachable from those projects.
- Restricted to **call-linked** projects (not every ingested `CordisProject`) so the band describes the *tracked
  portfolio* the dashboard is about — and so it reconciles with the per-call A2 panels.

> Note vs. existing `/cordis/stats`: `/stats` counts **all** ingested nodes (source-tagged), with **no euros**
> and **no call-linked restriction**. F1 needs call-linked counts **plus `sum(ecContribution)`**, so it is a new
> endpoint, not `/stats`. (`/stats` stays as the ingestion-health probe it is.)

### F1.3 Backend — `GET /cordis/portfolio-summary`
New route in `cordis_routes.py`. No parser/builder/tagger change. A small **pure** shaper
`_shape_portfolio_summary(rows)` (counts vs euros kept separate; nulls → 0) for offline testing.
```json
{
  "projectCount": 1840, "totalEcContribution": 5234000000.0,
  "organisationCount": 6120, "countryCount": 41, "fieldCount": 318,
  "callCount": 320,
  "provenance": "Funded projects linked to tracked Horizon Europe calls (CORDIS, FP7-Horizon Europe). EU-funded participation and awarded EU contribution — not scientific quality or impact."
}
```
`countCalls`/`callCount` lets the frontend phrase coverage honestly ("across N tracked calls").

### F1.4 Frontend
- `Dashboard/useCordisPortfolio.js` — fetch hook (mirrors `CordisEvidence/useCordisEvidence.js`: `Map` cache,
  race guard). Returns `{ loading, data, error }`. **This hook also drives the whole section's gate** (`data &&
  data.projectCount > 0` → render the CORDIS section; else render nothing).
- `Dashboard/CordisKpiRow.jsx` — reuses `KpiCard` (existing `unit="currency"` formatting works for the awarded
  €). Five cards: Funded projects · EU € awarded · Organisations · Countries · Research fields. A muted caption
  under the row carries the provenance + "Counts and euros are separate measures."
- `PortfolioDashboard.jsx` — call the hook once; when gated on, render a new `dash-grid__cordis` block (section
  title + `CordisKpiRow`). The hook's `data` is **passed down** to F2–F6 so the section fetches its summary once.
- `styles/components/_dashboard-cordis.scss` (+ `@import` in `styles/main/main.scss` next to `dashboard`) — the
  section header, the muted provenance caption, and a "no data" gate that simply renders nothing.

### F1.5 Verify
Offline: `_shape_portfolio_summary` over synthesised rows (null euros → 0; distinct counts preserved). Build
clean (no new warnings). Live (user, needs Neo4j+key, after an A2 ingest): `GET /cordis/portfolio-summary`
returns non-zero `projectCount`; the dashboard shows the band; with **no** CORDIS data the section is absent.

### F1.6 Rollback
Delete the route + `_shape_portfolio_summary`; delete `useCordisPortfolio.js`, `CordisKpiRow.jsx`,
`_dashboard-cordis.scss` + its import; remove the `dash-grid__cordis` block + hook call from
`PortfolioDashboard.jsx`. No data to undo.

---

## F2 — Planned vs Awarded  *(idea A4 — the flagship; never implemented)*

> Status: **IMPLEMENTED & VERIFIED (offline)** on branch `cordis`.
>
> **Built:** (backend) `cordis_routes.py` — `FUNDING_BY_PROGRAMME_PROVENANCE`, the pure
> `_aggregate_funding_by_programme` helper, and `GET /cordis/funding-by-programme` (groups
> `(:Call)-[:HAS_FUNDED_PROJECT]->(pr)` by `Call.source`; `collect(DISTINCT pr)` → `size()` = projectCount and
> a `reduce` euro sum so awarded € is distinct-project-safe across multiple calls of the same programme;
> `count(DISTINCT c)` = callCount; raw `Call.source` returned untouched). No parser/builder/tagger change; no
> new node/edge/property. (frontend) `Dashboard/useFundingByProgramme.js` (singleton cached fetch gated by an
> `enabled` flag + the `sourceToProgKey`/`mapAwardedToProgrammeKeys` source→progKey mappers), `useDashboardData`
> gained a `plannedByProgrammeKey` map (per-progKey budget+callCount alongside the existing top-level
> `callsByProgramme`), `FundingByProgramme.jsx` reworked into **Planned / Awarded / Both** tabs (merged on the
> union of programme keys, per-measure scaling, "no data" markers, hatched awarded bars, footnote that the two
> are different measures), and `PortfolioDashboard.jsx` wiring. F2 styles appended to `_dashboard-cordis.scss`.
>
> **Verified offline (no DB):** `_aggregate_funding_by_programme` over synthesised rows — populated rows sorted
> by awarded € desc (counts/euros preserved as separate measures), null fields → 0, blank/`None` sources
> dropped (never an empty-labelled bar), empty graph → empty `programmes` (drives the disabled Awarded/Both
> tabs), tie-break (projects desc, then source). Frontend build compiles with **no new warnings**.
>
> **Remaining (user — needs Neo4j + key):** after an A2 ingest, `GET /cordis/funding-by-programme` returns
> non-empty `programmes`; the dashboard's Funding-by-programme card then enables the Awarded/Both tabs at
> per-cluster granularity. With no CORDIS data the card is unchanged (top-level planned bars; Awarded/Both
> disabled). F2 writes nothing — §F2.6 fully reverts it.

### F2.1 Goal
Per **programme/cluster**, compare the **indicative budget offered** (work programme — what the dashboard
already computes) against the **EU contribution actually awarded** historically (CORDIS). Surfaces, at a glance,
which areas have a long funded track record behind the money now on offer. **Repurposes the three currently-dead
`FundingByProgramme` tabs** (today `committed`/`spot`/`forecast` render identical bars) into **Planned** /
**Awarded** / **Both** — so this lands inside the existing card with no new chart widget.

### F2.2 Data
- **Planned** (already loaded): the indicative budget per programme, computed client-side in
  `useDashboardData` from `loadFromStore`. F2 needs it **per programme key** (Cluster_1…, ERC, MSCA, …), so
  `useDashboardData` gains a `budgetByProgrammeKey` map alongside the existing top-level `callsByProgramme`
  (cheap — the per-call budgets are already summed; just also key them by `progKey`).
- **Awarded** (CORDIS): `sum(pr.ecContribution)` of projects linked to calls, **grouped by the call's programme**
  = `Call.source` (the cluster/programme tag the tagger set, e.g. `cluster_1`). The backend returns the **raw**
  `Call.source` group; the **frontend** maps it to the dashboard's `progKey` (`cluster_1`→`Cluster_1`, etc.) —
  same "backend returns raw codes, presentation is the frontend's" rule as `/call-trend`.

### F2.3 Backend — `GET /cordis/funding-by-programme`
New route + pure helper `_aggregate_funding_by_programme(rows)`:
```json
{
  "programmes": [
    { "source": "cluster_1", "awardedEc": 812000000.0, "projectCount": 240, "callCount": 51 },
    { "source": "cluster_4", "awardedEc": 1130000000.0, "projectCount": 388, "callCount": 73 }
  ],
  "provenance": "EU contribution awarded to funded projects under each programme's tracked calls (CORDIS, FP7-Horizon Europe). Awarded euros are historical and span several Framework Programmes; the planned budget is the current work programme's indicative offer — the two are different measures, not a like-for-like delta."
}
```
Cypher groups `(:Call)-[:HAS_FUNDED_PROJECT]->(pr {source})` by `Call.source`, `sum(DISTINCT-safe ecContribution)`
+ `count(DISTINCT pr)` + `count(DISTINCT c)`. (Distinct-project guard: a project linked to several calls in the
same programme is counted once; the helper documents this.)

### F2.4 Frontend
- `FundingByProgramme.jsx` — accept new props `awardedByProgrammeKey` + `plannedByProgrammeKey` and a `mode`
  from the (renamed) tabs **Planned / Awarded / Both**. *Planned* = today's bars. *Awarded* = awarded € bars
  (programmes with **no** CORDIS match render a muted **"no data"** marker, never a zero bar). *Both* = a
  paired/overlaid bar per programme (planned vs awarded) so the contrast is the story.
- Merge keying: union of programme keys present in either map; label/colour reuse `PROGRAMME_DISPLAY`. A footnote
  caption states planned-vs-awarded are different measures (offer vs historical award across eras).
- `PortfolioDashboard.jsx` passes the F2 hook's `awardedByProgrammeKey` (+ the new `plannedByProgrammeKey` from
  `useDashboardData`) into `FundingByProgramme`. The Awarded/Both tabs are **disabled with a tooltip** when no
  CORDIS data (keeps the card working on a CORDIS-less install).
- `useFundingByProgramme.js` hook (or fold into the F1 `useCordisPortfolio` if consolidating — see §Decisions).

### F2.5 Verify
Offline: `_aggregate_funding_by_programme` over synthesised per-source rows (distinct-project sum; missing
programme → absent, surfaced as "no data" client-side). Build clean. Live: tab through Planned/Awarded/Both;
a programme with no CORDIS match shows "no data", not €0.

### F2.6 Rollback
Delete the route + helper + `useFundingByProgramme.js`; revert `FundingByProgramme.jsx` to the planned-only
bars and the `committed/spot/forecast` tabs; drop `budgetByProgrammeKey` from `useDashboardData`.

---

## F3 — Funded activity over eras  *(portfolio twin of A6)*

> Status: **IMPLEMENTED & VERIFIED (offline)** on branch `cordis`.
>
> **Built:** (backend) `cordis_routes.py` — `PORTFOLIO_TREND_PROVENANCE` + `GET /cordis/portfolio-trend`,
> which runs the A6 year×era Cypher with the per-call filter dropped and projects deduped across calls
> (`WITH DISTINCT pr`, so a project linked to several calls is counted/summed once), then calls the **shared,
> unchanged** `_aggregate_call_trend` helper with portfolio totals and overrides the call-specific
> `provenance`/`call_id`/`subject` framing. No parser/builder/tagger change; no new node/edge/property; the
> A6 helper is reused as-is (rollback leaves it). (frontend) `Dashboard/useCordisPortfolioTrend.js` (singleton
> cached fetch, gated by an `enabled` flag), `Dashboard/CordisActivityTrend.jsx` (a `dash-card` reusing the A6
> `.cordis-trend__*` chart idiom: dense year-bar axis with chronological era segments, a Projects/EU-funding
> toggle showing the two measures one at a time, era legend + summary, peak-year + "X undated, not shown"
> callouts, provenance caption), and its mount in the gated `dash-grid__cordis` section of
> `PortfolioDashboard.jsx`. No new SCSS (reuses `_cordis-trend.scss`; theme vars are global).
>
> **Verified offline (no DB):** real-shaped year×era rows through `_aggregate_call_trend` with portfolio
> totals — chronological era ordering (FP7→H2020→HORIZON, non-FP codes last), undated reconciliation
> (`datedProjectCount` + `undatedCount` = total), peak year, per-era count/euro sums kept separate, the
> route's provenance/field overrides, and empty graph → empty buckets/eras (drives hide-when-empty). Frontend
> build compiles with **no new warnings**.
>
> **Remaining (user — needs Neo4j + key):** after an A2 ingest, `GET /cordis/portfolio-trend` spans the real
> FP7→Horizon Europe history with real counts/€; the card appears in the dashboard's CORDIS section. With no
> CORDIS data the section (and card) is absent. F3 writes nothing — §F3.5 fully reverts it.

### F3.1 Goal
A whole-portfolio timeline of funded activity: **project count + EU € awarded by project start year**, bucketed
into Framework-Programme eras (**FP7 → Horizon 2020 → Horizon Europe**, plus any earlier/non-FP codes the data
carries). Answers "is the funded research behind this portfolio growing, steady, or winding down?" — the
aggregate version of A6's per-call trend.

### F3.2 Backend — `GET /cordis/portfolio-trend`
Reuse the **existing** pure pivot `_aggregate_call_trend` (it already takes raw `{yr, fp, n, funding}` rows and
returns year buckets + chronologically-ordered eras + peak + undated reconciliation). The new route runs the
same year×era Cypher **without** the per-call filter (over all call-linked projects), then calls the **same**
helper with portfolio totals. Undated projects (no 4-digit `startDate`) reported as `undatedCount`, never
dropped. Counts and euros separate (already the helper's contract).

### F3.3 Frontend
- `Dashboard/useCordisPortfolioTrend.js` + `Dashboard/CordisActivityTrend.jsx` — a card reusing the dashboard's
  existing bar/area idiom (the `CallsOverTime` / `CordisTrendPanel` visual language): year buckets as bars with
  an era band beneath, a count/€ toggle (the two measures shown one at a time, never stacked together), and the
  "X undated (not shown)" + peak-year callouts. Provenance caption.

### F3.4 Verify
Offline: feed real parsed rows through `_aggregate_call_trend` with portfolio totals → assert era ordering,
undated reconciliation, peak. Build clean. Live: the card spans FP7→Horizon Europe with real counts/€.

### F3.5 Rollback
Delete the route (helper is shared with A6 — leave it); delete the hook + card + its mount.

---

## F4 — Funded-field portfolio mix  *(portfolio twin of B5; reuses `/field-tree`)*

> Status: **IMPLEMENTED & VERIFIED (offline)** on branch `cordis`.
>
> **Built:** (backend) none — reuses `GET /cordis/field-tree` unchanged. (frontend) `Dashboard/CordisFieldMix.jsx`
> (a `dash-card` reusing the `.dash-funding` bar idiom: the depth-1 field-tree roots ranked by share of funded
> projects, top 8 + a "+N smaller domains" remainder, overlap honesty caption), reusing the existing
> `CordisFields/useCordisFieldTree.js` hook (shares its module cache with the B5 drawer; gated by the F1
> summary). Mounted in the gated `dash-grid__cordis` section of `PortfolioDashboard.jsx`. Small F4 styles
> appended to `_dashboard-cordis.scss` (wider label/value columns + the "others" row).
>
> **Read-only (no B5 deep-link):** the field-explorer drawer is only mounted in graph mode and its open
> state + selected code live in `GraphMainColumn` across the dashboard/graph boundary, so wiring a click-through
> would be invasive — the plan flags the deep-link optional, so the card is read-only (the B5 drawer remains
> the drill-down path).
>
> **Verified offline (no DB):** `_build_field_tree` over rows where a project is classified in two domains —
> roots are depth-1 with rolled `projectCount`, and the sum of root counts (5) EXCEEDS the distinct
> `totalProjects` (4) because shares overlap. Confirms F4's transform must divide by `totalProjects` (not sum
> the roots) and that the overlap caption is justified (shares summed >100%). Frontend build compiles with
> **no new warnings**.
>
> **Remaining (user — needs Neo4j + key):** after an A2 ingest, the card ranks the real top EuroSciVoc domains
> by funded-project share. With no CORDIS field data the card (and section) is absent. F4 writes nothing and
> adds no endpoint — deleting the card + its mount + the small SCSS fully reverts it (§F4.5).

### F4.1 Goal
A compact **research-domain snapshot**: the top EuroSciVoc **top-level domains** (depth-1 nodes) across all
funded projects, as a donut / ranked bars by funded-project count — a subject-first read of where the funded
money sits, complementing the planned-funding view's call-derived topic buckets. Clicking a domain can deep-link
into the existing **B5 field-explorer drawer** (reuse, not rebuild).

### F4.2 Backend — none
**Reuses the existing `GET /cordis/field-tree`** (returns the rolled hierarchy with `projectCount`/`callCount`
per node + `totalProjects`/`totalCalls`). F4 reads only the **root-level** nodes (`depth === 1`). Zero backend
cost.

### F4.3 Frontend
- Reuse the existing `CordisFields/useCordisFieldTree.js` hook (already implemented). New
  `Dashboard/CordisFieldMix.jsx` — take `tree` roots, sort by `projectCount`, render the top ~8 as a donut or
  ranked bars (% of `totalProjects`), with an "others" remainder. Honesty caption: a project carries several
  EuroSciVoc classifications, so domain shares **overlap and don't sum to 100%** (this is the B5 framing,
  surfaced here too). Optional: row click sets the shared field-explorer `open` + selected code (if wired into
  the dashboard's parent; otherwise the card is read-only).

### F4.4 Verify
Offline: the existing `_build_field_tree` tests already cover roll-up; F4 adds a tiny client transform
(roots→shares) — assert shares use `totalProjects` denominator and the overlap caption is present. Build clean.

### F4.5 Rollback
Delete `CordisFieldMix.jsx` + its mount. No backend/data change.

---

## F5 — Top countries leaderboard  *(portfolio twin of B4; reuses `/country-activity` facets)*

> Status: **IMPLEMENTED & VERIFIED (offline)** on branch `cordis`.
>
> **Built:** (backend) none — reuses `GET /cordis/country-activity` (called with no `country`, returning
> `facets.countries = [{code, orgs, areas}]`) unchanged. (frontend) `Dashboard/CordisCountryLeaderboard.jsx`
> (a `dash-card` reusing the F2 two-measure bar idiom: top 10 countries ranked by organisations active, with
> organisations and research areas as TWO separate bars per row + a "+N more countries" remainder + an
> inline country-code→name map covering EU/associated/CORDIS-quirk codes, raw code as fallback), reusing the
> existing `CountryActivity/useCountryActivity.js` hook called with `country=""` (shares its module cache with
> the B4 drawer; gated by the F1 summary). Mounted in the gated `dash-grid__cordis` section of
> `PortfolioDashboard.jsx`. Small F5 style (wider label column) appended to `_dashboard-cordis.scss`.
>
> **Verified offline:** facet shaping is unchanged (already covered by B4); the F5 client sort/slice asserted
> in isolation — ranking by orgs desc → areas desc → code asc (tie-breaks confirmed), top-N slice +
> `othersCount`, independent per-measure maxima, and orgs/areas carried as distinct measures (never blended).
> Frontend build compiles with **no new warnings**.
>
> **Remaining (user — needs Neo4j + key):** after an A2 ingest, the card ranks the real most-present countries
> with org/area counts. With no CORDIS participation the card (and section) is absent. F5 writes nothing and
> adds no endpoint — deleting the card + its mount + the small SCSS fully reverts it (§F5.5).

### F5.1 Goal
A portfolio **ranking of countries** by funded participation (organisations active, areas touched) — the
aggregate counterpart to B4's single-country graph overlay. Answers "which countries' organisations are most
present across the tracked funded portfolio?"

### F5.2 Backend — none
**Reuses `GET /cordis/country-activity`** with **no `country`** — it already returns
`facets.countries = [{code, orgs, areas}]` over all CORDIS-linked calls. Zero backend cost.

### F5.3 Frontend
- Reuse `CountryActivity/useCountryActivity.js` (called with `country=""`, `open=true`). New
  `Dashboard/CordisCountryLeaderboard.jsx` — top ~10 countries as ranked bars (orgs and areas shown as the two
  distinct measures, not blended), with a country-code→name map for labels. Honesty caption: participation, not
  quality; nationally/privately funded work isn't in CORDIS, so absence ≠ no activity.

### F5.4 Verify
Offline: the facet shaping is already covered by B4; F5 adds the client sort/slice — assert top-N by `orgs`/
`areas` and the two-measure rendering. Build clean.

### F5.5 Rollback
Delete `CordisCountryLeaderboard.jsx` + its mount. No backend/data change.

---

## F6 — Top funded organisations  *(portfolio twin of B2)*

### F6.1 Goal
A portfolio **leaderboard of the most active organisations** across all tracked funded projects, with their
**coordinate-vs-partner** role split, country, and type — the aggregate counterpart to B2's per-call partner
finder. Answers "who are the established players across the whole portfolio?"

> Status: **IMPLEMENTED & VERIFIED (offline)** on branch `cordis`.
>
> **Built:** (backend) `cordis_routes.py` — `TOP_ORGS_PROVENANCE`, `TOP_ORGS_CAP`, the pure
> `_rank_top_organisations(rows, top_n, cap)` helper (mirrors `_rank_area_organisations`: disjoint
> coordinated/partnered role buckets, `projectCount = coordinated + partnered`, `orgType` via the existing
> `ORG_TYPE_LABELS`, ranked projects→coordinated→name, sliced to `min(top_n, cap)`), and
> `GET /cordis/top-organisations?top_n=15` (aggregates over ALL `(:Call)-[:HAS_FUNDED_PROJECT]->(pr)
> <-[:PARTICIPATED_IN]-(og)` with no per-call filter; `count(DISTINCT pr)` keeps a project single across
> multiple calls; discloses `returnedCount`/`organisationCount`/`cap`/`capped`). No parser/builder/tagger
> change; no new node/edge/property. (frontend) `Dashboard/useTopOrganisations.js` (singleton cached fetch,
> gated by an `enabled` flag) + `Dashboard/CordisTopOrgs.jsx` (a `dash-card` reusing the B2
> `.cordis-partners` split-bar idiom — name, country + type meta, a led/joined split bar, "N projects · X
> led · Y joined", "Showing top N of M" when capped, provenance caption). Mounted in the gated
> `dash-grid__cordis` section of `PortfolioDashboard.jsx`. No new SCSS (reuses `_cordis-partners.scss`).
>
> **Verified offline (no DB):** `_rank_top_organisations` over synthesised participation rows —
> `projectCount` = coord + partner (role buckets disjoint, never double-counted), ranking
> projects→coordinated→name (tie-breaks confirmed), `top_n` slice, `min(top_n, cap)`, `ORG_TYPE_LABELS`
> mapping with Unknown/blank fallbacks, null coalesce to 0 (name falls back to id), and empty → []. Frontend
> build compiles with **no new warnings**.
>
> **Remaining (user — needs Neo4j + key):** after an A2 ingest, the card ranks the real most-active funded
> organisations with their role split; with no CORDIS participation the card (and section) is absent. F6
> writes nothing — §F6.5 (delete route + helper + hook + card + mount) fully reverts it.

### F6.2 Backend — `GET /cordis/top-organisations?top_n=15`
New route + pure helper `_rank_top_organisations(rows, top_n, cap)` mirroring `_rank_area_organisations`
(coordinated vs partnered counted independently via `count(DISTINCT CASE WHEN r.role='coordinator' …)`,
`projectCount = coordinated + partnered`, `orgType` mapped via the existing `ORG_TYPE_LABELS`). Aggregates over
**all** `(:Call)-[:HAS_FUNDED_PROJECT]->(pr)<-[:PARTICIPATED_IN {role}]-(og)` (no per-call filter). Discloses
`cap`/`capped`. Same honesty as B2 (most-active ≠ best).
```json
{ "organisations": [ { "id": "...", "name": "...", "country": "DE", "orgType": "REC",
    "orgTypeLabel": "Research organisation", "coordinatedCount": 18, "partneredCount": 64, "projectCount": 82 } ],
  "returnedCount": 15, "cap": 200, "capped": true,
  "provenance": "Organisations across all tracked CORDIS-funded projects, by role (CORDIS, FP7-Horizon Europe). EU-funded participation, not scientific quality; 'most active' is not 'best'." }
```

### F6.3 Frontend
- `Dashboard/useTopOrganisations.js` + `Dashboard/CordisTopOrgs.jsx` — a ranked list reusing the
  `_cordis-partners.scss` coordinate/partner split-bar idiom (X led · Y joined · N projects), country + type
  chips. "Showing top N of …" when `capped`. Provenance caption.

### F6.4 Verify
Offline: `_rank_top_organisations` over synthesised participation rows — assert role split is disjoint per
project, `projectCount` = coord+partner, ranking by projects→coordinated→name, `min(top_n, cap)`. Build clean.

### F6.5 Rollback
Delete the route + helper + hook + card + mount. No data change.

---

## Shared §S1. Honesty & provenance (mapped to concrete UI)
1. **Real data only** — every figure derives from `HAS_FUNDED_PROJECT` / `PARTICIPATED_IN` / `CLASSIFIED_AS` +
   `ecContribution`/`country`/`frameworkProgramme`/`startDate` via the read endpoints. No hardcoded values; an
   empty graph renders an absent section (the F1 hook is the gate).
2. **Counts ≠ euros** — project/org counts and awarded € are always shown as **separate** figures; never a €
   "per project" blend implying efficiency/merit.
3. **Planned ≠ awarded** (F2) — offered indicative budget vs historical EU award across several eras; captioned
   as different measures, not a delta. Missing programme → "no data", never €0.
4. **Participation ≠ quality** (F5/F6) — "most active/funded" ≠ "best"; coordinated and partnered shown as two
   measures, never a single score.
5. **Overlapping field shares** (F4) — a project has several EuroSciVoc tags, so domain shares overlap and don't
   sum to 100% (captioned).
6. **Absence ≠ no activity** — CORDIS is EU-funded only; nationally/privately funded work isn't present.
7. **No silent caps** — F6 (and any capped list) returns `cap`/`capped`/`returnedCount`, surfaced in the UI.
8. **No methodology jargon** — plain labels (led/joined, country/era names); no query strings, cluster source
   tags, or role codes surfaced (cluster `source` is normalised to the programme label client-side).

## Shared §S2. Build & verify
- **Backend** new endpoints all follow the established CORDIS pattern: a **pure** rank/aggregate/shape helper
  (offline unit-testable against real parsed extractions, like `_aggregate_call_trend` /
  `_rank_area_organisations`) + a thin Cypher route. No parser/builder/tagger changes; no new node/edge/property.
- **Frontend** build with `node node_modules/react-scripts/bin/react-scripts.js build` (npx is broken on this
  Windows setup, per project memory). Pre-existing warnings expected; each feature must add **none new**.
- **Offline is the primary correctness proof** for each helper (real data on disk under `CORDIS/data/extracted/…`
  parsed with `parse_extraction`); **live end-to-end** is the user's step (needs `CORDIS_API_KEY` + Neo4j, after
  an A2 ingest e.g. `POST /cordis/tag-calls {"source":"cluster_1"}`).

## Shared §S3. Suggested order (each shipped + verified before the next)
1. **F1** (Funded-reality KPI band) — establishes the dashboard section, the `_dashboard-cordis.scss`, and the
   **hide-when-empty gate** every other card depends on.
2. **F2** (Planned vs Awarded) — the flagship insight; reuses the existing funding card + dead tabs.
3. **F4** + **F5** — zero-backend reuse of `/field-tree` and `/country-activity` facets (fast wins).
4. **F3** (era trend) + **F6** (top orgs) — one new endpoint each (F3 reuses the A6 helper).

## Shared §S4. Decisions (recommended defaults; flagged for review)
1. **Per-feature endpoints + per-feature hooks** (applied — matches the existing one-endpoint-per-feature CORDIS
   pattern and lets each card ship independently) vs. **one consolidated `GET /cordis/dashboard`** returning all
   aggregates in a single round-trip (rejected for v1 — bundles unrelated concerns and complicates partial
   rollout; revisit only if round-trips become a measurable cost, since all six render in one section).
2. **F2 groups at programme/cluster level** (`Call.source`) (applied — collapsing to top-level "Horizon Europe"
   would merge all clusters and bury the contrast) vs. top-level programme only (rejected — too coarse, since
   CORDIS coverage is cluster-shaped).
3. **CORDIS section gated on F1 having data** (applied — one fetch decides the whole section; no half-empty
   dashboard on a CORDIS-less install) vs. each card self-gating (rejected — redundant fetches + inconsistent
   empty states).
4. **F4/F5 reuse `/field-tree` and `/country-activity`** (applied — those globals already return exactly the
   portfolio roll-ups) vs. new dedicated endpoints (rejected — needless duplication).
5. **Awarded vs planned shown side-by-side, never subtracted** (applied — honest: different measures/eras) vs. a
   single "% awarded of planned" gauge (rejected — implies a like-for-like ratio the data doesn't support).
6. **Section placed at the dashboard bottom as an additive block** (applied — non-invasive, fully reversible,
   leaves the planned-funding dashboard intact) vs. interleaving CORDIS cards among the existing ones (rejected —
   harder to gate/rollback and muddies the planned-vs-funded separation).
