# Execution Plan — **B6: Hop-on host finder (projects a widening partner can join)**

> Consumer of the data backbone (`CORDIS_PLANS/00-data-backbone.md`) and A2's subject-area links
> (`CORDIS_PLANS/02-A2…`). Built **entirely on properties already on `(:CordisProject)`** (`status`,
> `endDate`, `fundingScheme`, `masterCall`, `frameworkProgramme`) plus the existing `PARTICIPATED_IN`
> participants and their `country`. **B6 adds no new ingestion** — no parser/builder/tagger change, no new
> node/edge/property. It is a **pure read feature**: one new endpoint + a finder drawer (B4 pattern) + an
> optional badge in A2's funded-projects panel.
>
> Process: this plan is the review checkpoint required before coding (ideas doc §"mandatory process").
> Status: **IMPLEMENTED & VERIFIED (offline unit + live dev-DB smoke) on branch `cordis`.**
>
> **Built:** (backend) `cordis_routes.py` — `HOP_ON_PROVENANCE`, `HOP_ON_HOSTS_CAP`,
> `HOP_ON_DEFAULT_MAX_AGE_MONTHS`, `ELIGIBLE_PROGRAMME_PREFIXES`, `PROGRAMME_LABELS`, `WIDENING_*`, the pure
> helpers `_is_collaborative_scheme` / `_programme_of` / `_months_between` / `_shape_hop_on_host` /
> `_hop_on_facets` / `_rank_hop_on_hosts`, and `GET /cordis/hop-on-hosts`. No parser/builder/tagger change.
> (frontend) `GraphPage/HopOn/{useHopOnHosts.js, HopOnHostsDrawer.jsx}`, `styles/components/_hop-on.scss`
> (+ `main.scss` import), a `GroupAdd` toggle in `SidebarControls.jsx` (gated `!isHEWiki`), state + threading
> in `GraphPage.js` / `RightControlsColumn.jsx`, drawer mounted in `GraphMainColumn.jsx`.
>
> **Post-design correction (adversarial multi-agent review).** The first implementation gated on *remaining
> runtime* (`endDate ≥ today + N months`). A policy-fidelity reviewer caught — and a verifier confirmed
> against the official Hop-on FAQ — that the real eligibility axis is **project AGE**: the host must be
> *recently started* (≈ first 12 months / still in its first reporting period) so a partner can be added.
> Gating on remaining-runtime produced false positives (old-but-still-running projects). **Fixed:** the gate
> is now `startDate ≥ today − max_age_months` (default 12) + still ongoing (`endDate ≥ today`); the response
> carries `monthsSinceStart`/`startDate`; ranking is freshest-start-first; the UI control is "Started within";
> all captions/provenance updated. Five smaller verified findings also fixed (provenance wording vs. the
> widening gap, refetch-collapses-filters UX, `top_n` clamp, empty-state route string, numeric filter type).
>
> **Verified:** 45/45 offline pure-helper assertions pass; live dev-DB smoke returns **289 early-stage
> eligible hosts** across all six clusters + EIC Pathfinder (`missing_country=PT → 215`, negative `top_n`
> clamped). Frontend build passes (+~1.8 kB JS), no new warnings.
>
> **Pool already verified present (live dev Neo4j, 2026-06-18, read-only profiling):** 28,722 CORDIS
> projects total; 7,122 HORIZON of which **6,583 SIGNED (ongoing)**; 1,449 Pillar II cluster projects
> (`HORIZON-CL*`) + 218 EIC-Pathfinder; a first-cut eligibility filter (HORIZON + CL/Pathfinder + SIGNED +
> future `endDate` + >1 participant) already returns **1,262 candidate host projects** — and that is an
> *undercount* because Cluster 1 Health uses the `HORIZON-HLTH` prefix (387 projects), which the naive
> `HORIZON-CL` test misses. **Conclusion: no top-up ingest is needed to build or ship B6.** All eligibility
> fields are populated. (Data-freshness — pulling the very newest grant-signed projects — is an optional,
> separate refresh, never a blocker.)

---

## 0. TL;DR

The user's question — *"which already-funded projects can a widening-country partner join via the Hop-on
Facility?"* — is about the **host** actions, not the Hop-on call itself. B6 answers it: a **"Hop-on
opportunities"** finder that lists the **ongoing Horizon Europe Pillar II / EIC Pathfinder collaborative
projects** that are eligible to be hopped onto, and — the genuinely useful part — for each one shows **which
widening countries are *not yet* in the consortium** (the real opening). It is filterable by **research
field**, **cluster/programme**, **how recently the host started**, and **"missing widening country"**.

Every eligibility test maps to a property B6 already reads off `(:CordisProject)`:

| Eligibility rule (Hop-on host) | Stored field | Predicate |
|---|---|---|
| Horizon Europe (not FP7/H2020) | `frameworkProgramme` | `= "HORIZON"` |
| Pillar II **main WP** cluster **or** EIC Pathfinder | `masterCall` | prefix in the eligible-programme set (§2b) |
| Collaborative R&I action (RIA/IA), not CSA/ERC/MSCA | `fundingScheme` | normalised RIA/IA match (§2c) |
| Multi-beneficiary (a partner can be *added*) | `PARTICIPATED_IN` count | `> 1` |
| **Early in its lifecycle** (the real Hop-on axis) + still running | `status` + `startDate` + `endDate` | `status="SIGNED"`, `startDate ≥ today − N months` (N=12 default), `endDate ≥ today` |

The data is **already in Neo4j**; B6 introduces **no fabricated values**. The one non-CORDIS input is the
**official EU widening-country list** — treated like the existing `ORG_TYPE_LABELS` map: a transparent EU
reference constant, *not* a data figure. The per-host **gap** is that list minus the consortium's own
countries (a widening country absent from CORDIS is precisely an untapped opening, so it is deliberately
kept); the dropdown facet, by contrast, lists only widening codes actually present in eligible consortia
(§2d, decision §9.4).

---

## 1. Goal & exactly what the finder shows

**Trigger.** A new button in the right `SidebarControls` (next to Country-activity / Research-fields),
hidden on the flat HE Wiki graph (`graphName === "HE_2025"`, like Compare/Timeline/Fields/Country). Toggling
it opens the **Hop-on opportunities** drawer.

**Drawer (control + list):**

| Element | Value | Honesty note |
|---|---|---|
| **Header** | "Hop-on opportunities (CORDIS)" | — |
| **Hint** | what the list is + the data caveats (below) | participation, not quality |
| **Research field** `<select>` | EuroSciVoc field facet over eligible hosts (optional) | facet-driven |
| **Cluster / programme** `<select>` | the eligible programmes present (CL2–CL6, Health, EIC Pathfinder) with counts | facet-driven |
| **"Missing widening country"** `<select>` | pick a widening country → show only hosts whose consortium does **not** already include it | the actual opening |
| **"Started within"** control | filter by host age `today − startDate` (last 6/12/18/24 months); default 12 (§9.3) | the real Hop-on axis |
| **Ranked host list** | one row per eligible project | see below |
| **Provenance** | the standing CORDIS caption + the Hop-on definition + the eligibility caveat | honest framing |

**Each host row:**

| Element | Value | Source |
|---|---|---|
| **Acronym — title** | `acronym` / `title` | `CordisProject` |
| **Programme · scheme** | e.g. `HORIZON-CL3 · Innovation action` | `masterCall` / `fundingScheme` |
| **Started / runs until** | `startDate` (+ "≈ N months ago") · `endDate` | `startDate` / `endDate` |
| **Consortium** | participant count · coordinator country | `PARTICIPATED_IN` / `country` |
| **Countries present** | the consortium's country codes (chips) | `country` |
| **Widening gap** | widening countries **not** in the consortium (chips, muted) | derived (§2d) |
| **Open project ↗** | link to the CORDIS project page (`https://cordis.europa.eu/project/id/{id}`) | `id` |

`status === "SIGNED"` + recent `startDate` (within the age window) + future `endDate` is the eligibility
gate; an empty result set → an honest "No ongoing eligible host projects match these filters" note, never a
fabricated row.

**Eligibility is shown, not claimed.** The hint states plainly: *this lists ongoing Horizon Europe Pillar II
and EIC Pathfinder collaborative projects whose profile matches the Hop-on Facility's host criteria — it is a
**shortlist to investigate**, not an official confirmation of Hop-on eligibility (the final decision and the
exact reporting-period rule are set by the current Work Programme and the project's consent).*

---

## 2. The data — all present, nothing new ingested

### 2a. Already in Neo4j (read-only)

```
(:CordisProject {source:"cordis", status, endDate, fundingScheme, masterCall, frameworkProgramme})
   <-[:PARTICIPATED_IN {role}]- (:CordisOrganisation {source:"cordis", country})
(:CordisProject)-[:CLASSIFIED_AS]->(:ResearchField {code,title})      # field facet
(:Call)-[:HAS_FUNDED_PROJECT]->(:CordisProject)                        # only for A2-tagged subjects (used for the field/subject facet, not required for eligibility)
```

Every eligibility property (`status`, `endDate`, `fundingScheme`, `masterCall`, `frameworkProgramme`) is
already MERGE-set by `cordis_builder.py:57-67` and confirmed populated by the §0 profiling. **No parser /
builder / tagger change.**

### 2b. Eligible-programme set (the careful bit — the naive prefix is wrong)

Horizon Europe Pillar II cluster prefixes are **not uniform**: Cluster 1 Health is `HORIZON-HLTH`, not
`HORIZON-CL1`. So the host filter uses an **explicit prefix whitelist**, not `STARTS WITH 'HORIZON-CL'`:

```python
ELIGIBLE_PROGRAMME_PREFIXES = (
    "HORIZON-CL2", "HORIZON-CL3", "HORIZON-CL4", "HORIZON-CL5", "HORIZON-CL6",  # Pillar II clusters 2-6
    "HORIZON-HLTH",                                                              # Pillar II cluster 1 (Health)
)
# EIC Pathfinder matched separately: masterCall contains "EIC" AND "PATHFINDER".
```

**Deliberately excluded by default** (flagged §9.2): `HORIZON-MISS` (Missions — separate WP), `HORIZON-JU`
(partnership JUs), `HORIZON-WIDERA` (the widening WP itself, incl. the Hop-on call), `HORIZON-INFRA`,
`HORIZON-MSCA`, `ERC-*`, EIC Accelerator/Transition. These are not Pillar-II-main collaborative actions in
the Hop-on sense. The exact set is a **decision to confirm against the current Hop-on Work Programme** — it
lives in **one named constant**, easy to adjust.

### 2c. Collaborative-action (RIA/IA) match — strings are messy

`fundingScheme` values are inconsistent (the profiling found `"HORIZON  Research and Innovation Actions"`
with a double space, `"Research and Innovation action"`, `"HORIZON Innovation Actions"`, `"Innovation
action"`, plus legacy variants, and CSAs like `"HORIZON Coordination and Support Actions"` = 602 that **must
be excluded**). So match on a **normalised** scheme (lower-case, collapse whitespace) against an RIA/IA
predicate, and explicitly reject CSA/COFUND/JU-support:

```python
def _is_collaborative_scheme(scheme: str) -> bool:
    s = " ".join((scheme or "").lower().split())
    if "coordination" in s or "support action" in s or "cofund" in s:
        return False
    return ("research and innovation action" in s) or ("innovation action" in s) or s in {
        "ria", "ia",
    }
```

This is a **pure helper** (offline-testable against the real scheme strings the §0 profiling enumerated).

### 2d. Widening-country gap — the one non-CORDIS reference input

The **widening-country list** is an official EU eligibility definition, not a CORDIS figure. It is treated
exactly like the existing backend `ORG_TYPE_LABELS` map — a transparent reference constant in the backend,
**not** fabricated data:

```python
# Horizon Europe "widening" countries (EU reference list — confirm against the current WP annex).
# NOTE: CORDIS country codes must be matched as CORDIS stores them (e.g. Greece = "EL").
WIDENING_MEMBER_STATES = {"BG","HR","CY","CZ","EE","EL","HU","LV","LT","MT","PL","PT","RO","SK","SI"}
WIDENING_ASSOCIATED   = {"AL","AM","BA","FO","GE","XK","MD","ME","MA","MK","RS","TN","TR","UA"}
WIDENING_COUNTRIES = WIDENING_MEMBER_STATES | WIDENING_ASSOCIATED
```

For a host project, **`wideningGap` = `WIDENING_COUNTRIES − {countries already in the consortium}`** — the
widening countries that could still hop on. The "missing widening country" filter keeps only hosts where the
chosen country is in that gap. The per-host gap is **deliberately NOT intersected** with codes present in
CORDIS — a widening country absent from the data is precisely an untapped opening, so hiding it would defeat
the feature (the original "intersected" wording was a review finding and was corrected). Only the **dropdown
facet** (`wideningPresent`) lists widening codes actually present in eligible consortia, for relevance. The
provenance discloses the list is an EU reference definition (gap = list − consortium), not a CORDIS-derived
number. (Decision §9.4 — this is the single honesty-sensitive constant in B6.)

---

## 3. Backend — one new read endpoint

New route in `cordis_routes.py`, alongside `/area-organisations` (B2) and `/country-activity` (B4), with the
two pure helpers above plus a pure ranking helper `_rank_hop_on_hosts` (offline-testable, mirroring
`_rank_area_organisations` / `_rank_country_areas`).

```python
HOP_ON_PROVENANCE = ("Ongoing Horizon Europe Pillar II and EIC Pathfinder collaborative projects whose "
                     "profile matches the Hop-on Facility host criteria (CORDIS). A shortlist to "
                     "investigate, not official confirmation of eligibility; EU-funded participation only.")
HOP_ON_HOSTS_CAP = 300       # bound the ranked list; disclosed via hostCount/cap/capped
HOP_ON_DEFAULT_MAX_AGE_MONTHS = 12   # host-age default (the real Hop-on axis); confirm against the WP (§9.3)
```

**Route `GET /cordis/hop-on-hosts`** — query params (all optional): `field` (EuroSciVoc code),
`programme` (a prefix from the eligible set), `missing_country` (a widening code), `max_age_months` (int,
default `HOP_ON_DEFAULT_MAX_AGE_MONTHS`), `top_n` (default 25; clamped ≥ 0).

- **Eligibility match (Cypher)** — the gate is project **age** (recently started), not remaining runtime:
  ```cypher
  MATCH (pr:CordisProject {source:'cordis'})
  WHERE pr.frameworkProgramme = 'HORIZON'
    AND pr.status = 'SIGNED'
    AND pr.startDate =~ '\\d{4}-\\d{2}-\\d{2}.*' AND pr.endDate =~ '\\d{4}-\\d{2}-\\d{2}.*'   // guard dates
    AND date(substring(pr.startDate,0,10)) >= date() - duration({months:$max_age})            // early in life
    AND date(substring(pr.endDate,0,10))   >= date()                                          // still running
    AND ( any(p IN $prefixes WHERE pr.masterCall STARTS WITH p)
          OR (toUpper(pr.masterCall) CONTAINS 'EIC' AND toUpper(pr.masterCall) CONTAINS 'PATHFINDER') )
  MATCH (og:CordisOrganisation {source:'cordis'})-[:PARTICIPATED_IN]->(pr)
  WITH pr, count(DISTINCT og) AS orgCount, ...
  WHERE orgCount > 1                                            // multi-beneficiary
  ...
  ```
  The **RIA/IA scheme test runs in Python** via `_is_collaborative_scheme` (the strings are too messy for a
  clean Cypher predicate) over the matched rows — keeping the gnarly normalisation in one unit-tested place.
  **EIC Pathfinder is exempt** from the RIA/IA string test (its CORDIS scheme is `HORIZON EIC Grants`); the
  multi-beneficiary check governs it instead.
- **Per host**: `acronym`, `title`, `masterCall`, `fundingScheme`, `startDate`, `endDate`, `monthsSinceStart`,
  `monthsRemaining`, coordinator country, the participant country codes, and the EuroSciVoc `fields`.
  `wideningGap` is `WIDENING_COUNTRIES − consortium countries`; the `missing_country` filter tests membership
  in that gap.
- **Facets** (always, over the eligible set, independent of the list filters so the dropdowns are stable):
  `programmes` (eligible code → label + count), `fields` (EuroSciVoc code/title → count), `wideningPresent`
  (widening codes that appear in ≥1 eligible consortium → count). Computed once.
- **Ranking** (`_rank_hop_on_hosts`): by **freshest start asc** (`monthsSinceStart`; most clearly inside the
  eligibility window, most time to prepare a proposal), then **largest widening gap desc** (most opportunity),
  then acronym. Sliced to `min(top_n, cap)`; `hostCount` / `returnedCount` / `cap` / `capped` returned —
  **no silent caps**.

**Response shape the frontend consumes:**

```json
{
  "maxAgeMonths": 12,
  "eligibleCount": 289,
  "hostCount": 289,
  "returnedCount": 25,
  "cap": 300,
  "capped": true,
  "filters": { "field": null, "programme": null, "missingCountry": null },
  "facets": {
    "programmes": [{ "code": "HORIZON-CL6", "label": "Cluster 6 — Food, Bioeconomy…", "hosts": 73 }],
    "fields": [{ "code": "/25/…", "title": "artificial intelligence", "hosts": 64 }],
    "wideningPresent": [{ "code": "EL", "hosts": 125 }, { "code": "PT", "hosts": 74 }]
  },
  "hosts": [
    { "id": "101112233", "acronym": "GANNDALF", "title": "…",
      "masterCall": "HORIZON-CL3-2024-FCT-01", "fundingScheme": "HORIZON Research and Innovation Actions",
      "startDate": "2026-01-01", "endDate": "2029-09-30", "monthsSinceStart": 5, "monthsRemaining": 39,
      "coordinatorCountry": "DE", "countries": ["DE","ES","FR","IT","NL"],
      "wideningGap": ["AL","AM","BA","BG","CY","CZ","EE","EL","HR","HU","LT","LV","…"],
      "url": "https://cordis.europa.eu/project/id/101112233" }
  ],
  "provenance": "Early-stage, ongoing Horizon Europe Pillar II and EIC Pathfinder collaborative projects whose profile matches the Hop-on Facility host criteria (CORDIS). A shortlist to investigate, not an official confirmation of eligibility; EU-funded participation only."
}
```

Cypher notes: `count(DISTINCT …)`/`collect(DISTINCT …)` throughout (consistent with the other CORDIS routes);
all matches gated on `{source:"cordis"}`; date math guarded against malformed `endDate`. The scheme filter,
widening-gap derivation, ranking, and slice live in pure helpers verifiable offline against real rows.

---

## 4. Frontend

### 4a. Fetch hook — `GraphPage/HopOn/useHopOnHosts.js`
Mirror `useCountryActivity.js` (module `Map` cache, request-race guard). Signature
`useHopOnHosts(filters, open)` → `{ loading, data, error }`; fetches only when `open`; cache key =
`field|programme|missingCountry|minMonths`. Builds `GET /cordis/hop-on-hosts?…`.

### 4b. Drawer — `GraphPage/HopOn/HopOnHostsDrawer.jsx`
Mirrors `CountryActivityDrawer.jsx` (`createPortal` to `document.body`; header + hint + filters + list +
provenance). Filters = four native `<select>`/number controls (field, programme, missing-country,
min-months) driven by `data.facets`; list = the host rows of §1; widening-gap chips reuse the country-chip
idiom; "Open project ↗" is an external link to the CORDIS project page. Empty/loading states mirror the
field-explorer drawer ("No CORDIS data yet — run the ingest" when facets are empty; "No ongoing eligible
host projects match these filters" when filtered to zero). Caps note when `capped`.

### 4c. Control wiring — `SidebarControls.jsx`, `RightControlsColumn.jsx`, `GraphPage.js`
Add `hopOnOpen` / `setHopOnOpen` state in `GraphPage.js`; close it on the `graphName === "HE_2025"` branch of
the layer-change effect (like Compare/Fields/Country). Thread to `RightControlsColumn` → `SidebarControls`
(a new icon button inside the existing `!isHEWiki` block, active-styled when open) and mount the drawer in
`GraphMainColumn.jsx` next to `CountryActivityDrawer`, gated `hopOnOpen && !isHEWiki`.

### 4d. Optional secondary surface — badge in A2 (`CordisEvidencePanel`/funded-projects panel)
In the A2 funded-projects list, mark any project that satisfies the host predicate with a small **"Hop-on
host"** badge (computed by reusing the same eligibility logic, e.g. an `eligibleHostIds` set returned by an
A2 query addition, or a per-project flag). **Decision §9.5** — ship the drawer first; the badge is additive
and independently rollback-able.

### 4e. Styles — `styles/components/_hop-on.scss` (+ `main.scss` import)
New partial imported in `main.scss` next to `_country-activity` (`:34`). Drawer chrome reusing the
`country-activity` / `cordis-fields` drawer layout; the filter row; host rows; country + widening-gap chips
(muted for "gap"); hint/provenance captions — all via CSS vars for dark/light.

---

## 5. Honesty & provenance (mapped to concrete UI)

1. **Real data only.** Every host/facet comes from `CordisProject` properties + `PARTICIPATED_IN` + `country`
   in Neo4j. No hardcoded rows; empty result → an honest empty note, never a fabricated host.
2. **Shortlist, not a ruling.** Hint + provenance state this is a *profile match* to the Hop-on host
   criteria — a shortlist to investigate, **not** an official eligibility confirmation (the WP and the
   project's consent decide).
3. **Participation ≠ quality.** Standard CORDIS caption; "eligible host" ≠ "good project".
4. **Widening list is a transparent EU reference, not data.** Disclosed as such (like `ORG_TYPE_LABELS`); the
   per-host gap is the reference list minus the consortium's own countries (not a measure of any country's
   CORDIS activity — captions say so exactly). Codes shown as CORDIS stores them (e.g. Greece `EL`).
5. **Absence ≠ no activity / EU-funded only.** Nationally/privately funded actions aren't in CORDIS.
6. **No silent caps / no methodology jargon.** `hostCount`/`returnedCount`/`cap`/`capped` surfaced; plain
   labels (cluster names, scheme names, country codes), no query strings or role codes exposed.

---

## 6. Step-by-step

1. **Backend (3):** add `HOP_ON_PROVENANCE`, `HOP_ON_HOSTS_CAP`, `HOP_ON_DEFAULT_MAX_AGE_MONTHS`,
   `ELIGIBLE_PROGRAMME_PREFIXES`, `WIDENING_*` constants, the pure `_is_collaborative_scheme` and
   `_rank_hop_on_hosts` helpers, and `GET /cordis/hop-on-hosts` to `cordis_routes.py`. No
   parser/builder/tagger change.
2. **Offline verify (§7):** parse real on-disk extractions → assert the scheme/programme/widening logic on
   real rows; assert ranking + gap derivation + cap disclosure.
3. **Frontend (4a–4b, 4e):** `useHopOnHosts.js`, `HopOnHostsDrawer.jsx`, `_hop-on.scss` (+ `main.scss`).
4. **Wiring (4c):** GraphPage state + threading; RightControlsColumn pass-through; SidebarControls button;
   drawer mount in GraphMainColumn.
5. **(Optional) Badge (4d)** in A2 — only after the drawer is verified.
6. **Build** the frontend; update this file's Status to *Implemented & Verified (offline)*.

---

## 7. Verification

**Offline (real data on disk — primary correctness proof).** Using the extractions under
`CORDIS/data/extracted/…` parsed with `parse_extraction`:
- Run `_is_collaborative_scheme` over the **actual** scheme strings present → assert RIA/IA accepted, CSA /
  COFUND / coordination rejected (incl. the double-space `"HORIZON  Research and Innovation Actions"`).
- Build host candidate rows from parsed projects, run the **real** `_shape_hop_on_host` / `_rank_hop_on_hosts`
  → assert: only eligible-prefix/Pathfinder + collaborative-scheme (Pathfinder exempt) rows survive;
  `monthsSinceStart` computed from `startDate`, `monthsRemaining` from `endDate`; `wideningGap =
  WIDENING_COUNTRIES − consortium countries`; `missing_country` filter keeps only hosts whose gap contains it;
  ranking by freshest-start asc then gap-size desc then acronym; cap honoured and disclosed; `top_n` clamp.
  **No hardcoded values** — all derived from parsed dicts (the widening set is the declared reference
  constant, asserted to be a documented EU list, not a data figure).
  *(Actual result: 45/45 assertions pass — `backend/_verify_hopon.py`.)*

**Live end-to-end (needs Neo4j; the §0 pool already exists — actual results in brackets).**
1. `GET /cordis/hop-on-hosts` → non-empty `hosts` + `facets` *(289 early-stage eligible hosts across all six
   clusters + EIC Pathfinder)*. Add `?missing_country=PT` → only hosts without a Portuguese partner *(215)*;
   add `&programme=HORIZON-CL3` / `&field=…` / `&max_age_months=18` → list narrows, facets stable.
2. In the app: open the **Hop-on opportunities** drawer (non-HE-Wiki graph) → eligible host projects listed
   with their widening gap; filters work; "Open project ↗" opens the CORDIS page. A graph with no CORDIS data
   → the empty note.

**Frontend build.** `node node_modules/react-scripts/bin/react-scripts.js build` (npx is broken on this
Windows setup, per project memory). Pre-existing warnings expected; B6 must add none new.

---

## 8. Rollback

- **Code only — B6 writes no data.** Delete the `GET /cordis/hop-on-hosts` handler + the two pure helpers +
  the module constants; delete `HopOnHostsDrawer.jsx`, `useHopOnHosts.js`, `_hop-on.scss`; remove the
  `main.scss` import, the `GraphMainColumn` mount + hook, the `SidebarControls` button, the
  GraphPage/RightControlsColumn threading, and (if built) the A2 badge. No schema/data migration to undo
  (B6 introduces no nodes, edges, or properties).

---

## 9. Decisions (recommended defaults applied; flagged for review)

1. **Pure read feature, no top-up ingest** (applied — §0 confirms all eligibility fields are populated and a
   sizable host pool already exists) vs. a fresh "fetch all Pillar II ongoing projects" ingest (rejected for
   v1 — unnecessary to ship; a freshness refresh can come later, independently).
2. **Explicit eligible-programme whitelist incl. `HORIZON-HLTH`, Missions/JU/WIDERA excluded** (applied —
   the naive `HORIZON-CL` prefix under-counts Health and over-reaches; the set is one constant) — **confirm
   the exact set against the current Hop-on Work Programme** before shipping.
3. **Host-age gate = started within last 12 months** (applied — this is the REAL Hop-on eligibility axis,
   per the official FAQ: the action must be early in its life / first reporting period when a partner joins).
   **Corrected after the adversarial review**, which caught the original (wrong) "remaining-runtime ≥ N
   months" gate that admitted old-but-still-running false positives. The "Started within" control lets the
   user widen/narrow the window; **confirm the WP's exact reporting-period figure**. `monthsRemaining` is
   still shown for context, but is not the gate.
4. **Widening-country list as a transparent EU reference constant** (applied — mirrors `ORG_TYPE_LABELS`; the
   single non-CORDIS input, fully disclosed) vs. omitting the widening gap (rejected — the gap is the
   feature's core value) / deriving "widening" from data (impossible — it's a policy definition, not a data
   attribute). **Corrected after review:** the per-host **gap is the full reference list minus the
   consortium's own countries — deliberately NOT intersected with codes present in CORDIS** (a widening
   country absent from the data is precisely an untapped opening; intersecting would hide the prime
   candidates). Only the dropdown *facet* lists present codes. The captions were corrected to state this
   exactly (the original wording falsely claimed an intersection). **Validate the code set against CORDIS's
   codes (e.g. Greece `EL`, Kosovo `XK`).**
5. **Finder drawer first; A2 "Hop-on host" badge optional/second** (applied — drawer is the primary,
   broadly-useful surface and independently shippable) vs. badge-only (rejected — call-scoped, doesn't answer
   "find me the opportunities" across the pool).
6. **Drawer surface (not a graph overlay)** (applied — eligibility lives on project properties, and hosts
   link to app `Call` nodes only for A2-tagged subjects, so an overlay would be sparse/misleading) vs. a
   Cytoscape overlay (rejected for v1 — partial call linkage; revisit if/when project↔call coverage grows).
