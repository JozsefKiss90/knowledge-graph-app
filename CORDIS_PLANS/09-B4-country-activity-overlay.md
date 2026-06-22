# Execution Plan — **B4: Country activity overlay**

> Consumer of the data backbone (`CORDIS_PLANS/00-data-backbone.md`) and A2's subject-area links
> (`CORDIS_PLANS/02-A2…`). Built on the **same** `HAS_FUNDED_PROJECT` + `PARTICIPATED_IN {role}` edges and
> `CordisOrganisation.country` already in Neo4j — **B4 adds no new ingestion**, only **one new read
> endpoint + a graph overlay + a control drawer**. No parser/builder/tagger change, no new node/edge/property.
>
> Process: this plan is the review checkpoint required before coding (ideas doc §"mandatory process").
> Status: **IMPLEMENTED & VERIFIED (offline)** on branch `cordis`.
>
> **Built:** (backend) `cordis_routes.py` — `COUNTRY_ACTIVITY_PROVENANCE`, `COUNTRY_AREAS_CAP`, the pure
> `_rank_country_areas` helper, and `GET /cordis/country-activity` (facets + covered set always; per-call
> role split + the active/coordinated/covered id sets when a country is given). **No parser/builder/tagger
> change.** (frontend) `GraphPage/CountryActivity/{useCountryActivity.js, CountryActivityDrawer.jsx}`,
> three `palette.js` overlay classes (`country-coord` / `country-part` / `country-dim`), a paint effect +
> single fetch in `GraphMainColumn.jsx`, the drawer mounted next to `CordisFieldExplorerDrawer`, a `PublicIcon`
> toggle in `SidebarControls.jsx` (gated `!isHEWiki`), state + threading in `GraphPage.js` /
> `RightControlsColumn.jsx`, and `styles/components/_country-activity.scss` (+ `main.scss` import).
>
> **Verified offline (no DB):** `_rank_country_areas` over synthesised per-call rows — ranking is projects
> desc → coordinated desc → name (tie-breaks confirmed: equal-project calls order by led count; a
> participated-only call with 0 led ranks below a led one), `projectCount` is preserved (not summed from the
> role counts), and `min(top_n, cap)` honoured; the route's id-set derivations confirmed —
> `activeCallIds` = all rows, `coordinatedCallIds` = rows with ≥1 led (participated-only call excluded), and
> the led/joined totals sum correctly. Frontend build passes (+1.47 kB JS / +286 B CSS) with **no new
> warnings**.
>
> **Post-implementation tweak (user feedback):** the drawer's ranked list originally showed the **Horizon
> Europe call titles** (open funding opportunities / tenders), which misleadingly implied those open calls had
> been funded. Changed to list the **CORDIS research subjects** (`cordis_area_query`) the funded projects
> belong to — one deduped row per research area, with the country's led/joined/project counts and org count,
> no call titles and no per-call navigation. Backend now aggregates the drawer list **per subject** (a new
> `subject_rows` query + a country-wide distinct-totals query), while keeping the **per-call id sets**
> (`activeCallIds`/`coordinatedCallIds`) that the graph overlay paints with — the overlay still highlights the
> call nodes drawn on the graph, which is correct. `_rank_country_areas` reshaped to `{subject, …}`; the
> frontend drops the `Link`/`getDatasetConfigForId` import. Re-verified offline (subject-grouped ranking) and
> the build stays clean.
>
> **Remaining (user — needs Neo4j + key):** after an A2 ingest (`POST /cordis/tag-calls {"source":"cluster_1"}`),
> `GET /cordis/country-activity` returns the country facets; add `?country=DE` for the ranked areas + id sets;
> in the app, the globe button opens the **Country activity** drawer → pick a country → on a
> programme/destination layer the call nodes paint (green led / light-green joined / dimmed covered-but-absent),
> the drawer lists the top areas, each links to its call detail. B4 writes nothing — removing the route +
> frontend files fully reverts it (rollback §8).
>
> Decisions applied (recommended defaults, see §9): overlay scope = **Call nodes** (the same nodes A2/A6/B3
> key on, and the only CORDIS-linked nodes Cytoscape ever shows) · country is **user-selectable, any country**
> present in the data (facet-driven dropdown, not tied to one) · two honest highlight levels —
> **coordinated** (led) vs **participated** (joined) — plus a **meaningful-absence dim** only for calls that
> *have* CORDIS data but no activity for the chosen country (calls with **no** CORDIS data stay neutral, never
> dimmed as if "inactive") · a side **drawer** (B5 field-explorer pattern) with the country picker + a ranked
> list of the areas where the country is most active, so the feature gives value **even on layers where no
> call nodes are on screen** · honest framing — EU-funded participation, not quality/impact; absence ≠ no
> activity.

---

## 0. TL;DR

An optional, toggleable overlay: pick a **country**, and every **call (area)** on the graph is highlighted
by how active that country's organisations have been in it — **green border = a project led (coordinated)
by one of the country's orgs**, **light green = joined (partnered)**, **dimmed = the area is EU-funded but
this country's orgs have no recorded participation**, **neutral = no CORDIS data**. A side drawer carries the
country picker and a ranked "where is this country most active" list (each area links to its call detail), so
the overlay is useful on every layer, including ones where no call nodes are currently drawn.

The data is **already in Neo4j**: A2 stored
`(:Call)-[:HAS_FUNDED_PROJECT]->(:CordisProject)<-[:PARTICIPATED_IN {role}]-(:CordisOrganisation {country})`.
So B4 is a **pure read feature**: one endpoint `GET /cordis/country-activity?country=…` that aggregates each
country's coordinate/partner activity per call, and a frontend overlay+drawer that maps it onto the graph.
Nothing hardcoded; an absent country/area simply doesn't light up.

---

## 1. Goal & exactly what the overlay shows

**Trigger.** A new globe button in the right `SidebarControls` (next to Compare / Timeline / Research-fields),
hidden on the flat HE Wiki graph (`graphName === "HE_2025"`, like Compare/Timeline/Fields). Toggling it opens
the **Country activity** drawer.

**Drawer (the control + the always-useful list):**

| Element | Value | Honesty note |
|---|---|---|
| **Country** dropdown | every country present in CORDIS participation, with its area count, default "Select a country" — **any** country, user-chosen | facet over all CORDIS-linked calls |
| **Headline** | `{country}`: active in **N areas**, **X led** · **Y joined** (distinct projects) | participation, not quality; led/joined kept separate |
| **Ranked areas list** | top areas where the country is most active — each row: call **name** (links to `/node/:id`), subject, a **coordinate/partner split** (X led · Y joined), distinct project count | "most active" ≠ "best"; two role measures, never a blended score |
| **Legend** | green = led here · light green = joined here · dimmed = EU-funded but this country absent · (neutral = no CORDIS data) | explains every graph state plainly |
| **Provenance** | CORDIS / FP7–Horizon Europe; EU-funded participation only; absence ≠ no activity | the standing CORDIS caption |

**Graph overlay (applied to Call nodes currently drawn):**

- `country-coord` — at least one of the country's orgs **coordinated** (led) a funded project in this call's
  area → strong green border + overlay.
- `country-part` — the country **participated** (joined) but did not lead → lighter green border.
- `country-dim` — the call **has** CORDIS data but the chosen country's orgs have **no** recorded
  participation in it → faded (meaningful absence).
- *neutral* — the call has **no** CORDIS data at all → untouched (we cannot speak to a country's activity
  there, so we never imply "inactive").

The overlay only paints when the drawer is open **and** a country is selected; clearing the country or
closing the drawer removes all four classes. It re-applies on every layer change (same as the assistant
overlay) so highlights follow the country wherever call nodes appear.

**Where call nodes appear.** Call nodes exist on programme / destination layers (and are promotable); on
ROOT / pillar layers there are none, so the graph shows no paint there — the drawer's ranked list still
answers "where is this country strong?" The drawer hint says where highlights show.

---

## 2. The data — already present, nothing new ingested

B4 reads exactly the edges A2 created (and B2 already aggregates per call):

```
(:Call)-[:HAS_FUNDED_PROJECT]->(:CordisProject {source:"cordis"})<-[:PARTICIPATED_IN {role}]-(:CordisOrganisation {source:"cordis", country})
```

- A country's **activity in an area** = the distinct `CordisProject`s, funded under a call, that an
  organisation **with that `country`** `PARTICIPATED_IN`.
- **Coordinated vs participated** comes from the existing `PARTICIPATED_IN.role` (`coordinator` → *led*;
  anything else → *joined*), counted as two distinct measures.
- **Country** is the existing `CordisOrganisation.country` (ISO-style code, as B2 already surfaces).

No new node/edge/property. B4 inherits A2/B2's honesty guarantees. Note (disclosed in the helper docstring):
because a country can field **several** orgs on one project — one coordinating, another partnering — the
per-call `coordinatedCount` and `partneredCount` are **distinct-project counts per role** and may overlap;
`projectCount` (distinct projects the country took part in) is the true single headline measure. The two role
counts are shown as a split, never summed into a score.

---

## 3. Backend — one new read endpoint

New route in `cordis_routes.py`, alongside `/area-organisations` (B2), with a **pure** ranking helper
`_rank_country_areas` (offline-testable, mirroring `_rank_area_organisations` / `_rank_related_calls`).

```python
COUNTRY_ACTIVITY_PROVENANCE = ("Organisations from the chosen country participating in CORDIS-funded "
                               "projects, by area and role (CORDIS, FP7-Horizon Europe). EU-funded "
                               "participation, not scientific quality; absence is not absence of activity.")
COUNTRY_AREAS_CAP = 200   # bound the ranked area list; disclosed via areaCount/cap/capped


def _rank_country_areas(rows, top_n, cap=COUNTRY_AREAS_CAP):
    """Shape + rank the areas (calls) where a country is active. Pure — no DB — so it is unit-testable
    offline (mirrors ``_rank_area_organisations``). ``rows`` are dicts
    {id,name,callId,subject,coordinatedCount,partneredCount,projectCount,orgCount} exactly as the Cypher
    returns them (one per active call). Ranked by distinct projects desc, then coordinated desc, then name;
    sliced to min(top_n, cap)."""
    out = []
    for r in rows:
        out.append({
            "id": r.get("id"),
            "name": r.get("name") or r.get("callId") or r.get("id"),
            "callId": r.get("callId"),
            "subject": r.get("subject"),
            "coordinatedCount": r.get("coordinatedCount") or 0,
            "partneredCount": r.get("partneredCount") or 0,
            "projectCount": r.get("projectCount") or 0,
            "orgCount": r.get("orgCount") or 0,
        })
    out.sort(key=lambda x: (-x["projectCount"], -x["coordinatedCount"], (x["name"] or "").lower()))
    return out[:min(top_n, cap)]
```

**Route `GET /cordis/country-activity?country=…&top_n=15`:**

- **Facets** (always — drives the dropdown): one query over **all** CORDIS-linked calls — distinct countries
  with org count + area (distinct-call) count, ordered by areas desc. Independent of the selected country, so
  the dropdown is stable.
- **Covered set** (always): `collect(DISTINCT c.id)` of every call with **any** CORDIS participation →
  `coveredCallIds` (drives the honest dim: a call must be CORDIS-covered to be dimmed) + `coveredCallCount`.
- **Per-call activity** (only when `country` given): one row per call the country is active in, with
  `coordinatedCount` / `partneredCount` / `projectCount` / `orgCount` (all `count(DISTINCT …)`, role split via
  `count(DISTINCT CASE WHEN r.role='coordinator' THEN pr END)` so the two role measures stay independent).
  From these rows the route derives:
  - `areas` = `_rank_country_areas(rows, top_n)` — the drawer's ranked, capped list;
  - `activeCallIds` = **all** ids in rows (graph highlight — participated set);
  - `coordinatedCallIds` = ids where `coordinatedCount > 0` (graph highlight — led set);
  - `areaCount` (= len rows), `totalCoordinated`, `totalPartnered` (sums for the headline);
  - `capped = areaCount > returnedCount` (never silent).

  The full id arrays (bounded by the ingested call set — hundreds, ~tens of KB) are returned so the **graph
  overlay** can light up *every* active node, not just the top-N shown in the drawer list.

**Response shape the frontend consumes:**

```json
{
  "country": "DE",
  "facets": { "countries": [{ "code": "DE", "orgs": 142, "areas": 88 }, { "code": "ES", "orgs": 121, "areas": 80 }] },
  "coveredCallCount": 320,
  "areaCount": 88,
  "totalCoordinated": 41,
  "totalPartnered": 260,
  "returnedCount": 15,
  "cap": 200,
  "capped": true,
  "areas": [
    { "id": "HORIZON-CL1-…", "name": "AI for personalised care", "callId": "HORIZON-CL1-2024-…",
      "subject": "AI for health and personalised care",
      "coordinatedCount": 3, "partneredCount": 11, "projectCount": 13, "orgCount": 9 }
  ],
  "activeCallIds": ["HORIZON-CL1-…", "HORIZON-CL3-…"],
  "coordinatedCallIds": ["HORIZON-CL1-…"],
  "coveredCallIds": ["HORIZON-CL1-…", "HORIZON-CL3-…", "HORIZON-CL4-…"],
  "provenance": "Organisations from the chosen country participating in CORDIS-funded projects, by area and role (CORDIS, FP7-Horizon Europe). EU-funded participation, not scientific quality; absence is not absence of activity."
}
```

When `country` is omitted/blank: `facets` + `coveredCallIds`/`coveredCallCount` are returned and the
`areas`/`activeCallIds`/`coordinatedCallIds` are empty (the dropdown populates before a pick; the overlay
paints nothing).

Cypher notes: every aggregation groups by a node/scalar (the call, or a country code), `count(DISTINCT …)`
throughout (consistent with the other CORDIS routes); `CordisProject`/`CordisOrganisation` matches gated on
`{source:"cordis"}`. The shape+rank+slice live in the pure `_rank_country_areas` (verifiable offline against
real participation rows).

---

## 4. Frontend

### 4a. Fetch hook — `GraphPage/CountryActivity/useCountryActivity.js`

Mirror `useCordisOrganisations.js` (module `Map` cache, request-race guard). Signature
`useCountryActivity(country, open)` → `{ loading, data, error }`. Fetches only when `open` (so the overlay
costs nothing until used); cache key = `country || ""` so the facet-only response and each country are fetched
once. Builds `GET /cordis/country-activity[?country=…]`.

### 4b. Drawer — `GraphPage/CountryActivity/CountryActivityDrawer.jsx`

Mirrors `CordisFieldExplorerDrawer.jsx` (`createPortal` to `document.body`, header + hint + body +
provenance). Receives `open`, `onClose`, `country`, `setCountry`, `data`, `loading`. Sub-blocks:

- **Header** → globe icon + title **"Country activity (CORDIS)"** + close.
- **Hint**: *"Pick a country to see where its organisations have been funded across the graph. Green call
  nodes are areas it has led (coordinated); lighter green it has joined (partnered); dimmed areas are
  EU-funded but have no recorded activity from this country. Highlights show on layers where call nodes are
  visible. EU-funded participation only — not a measure of quality, and organisations funded nationally or
  privately won't appear."*
- **Country `<select>`** (facet-driven; "Select a country" + each `code (areas)` ); calls `setCountry`.
- **Headline** (once a country is picked): `{country} — active in {areaCount} areas · {totalCoordinated}
  led · {totalPartnered} joined`.
- **Ranked areas list** (`data.areas`): one row per area — call **name** as a router `<Link to=/node/:id>`
  (reusing `getDatasetConfigForId` like B3/B5), subject (muted), and a **coordinate/partner split** (the
  `cordis-partners` split-bar idiom: `X led · Y joined`, `projectCount` proj). Empty when the country has no
  activity → inline "No recorded CORDIS activity for {country}."
- **Capped note**: if `capped`, "Showing the top {returnedCount} of {areaCount} areas."
- **Provenance** (`data.provenance`).

Empty/loading states mirror the field-explorer drawer (loading text; "No CORDIS data yet — run the ingest"
when `facets.countries` is empty).

### 4c. Graph overlay — effect in `GraphMainColumn.jsx`

A new `useEffect` next to the assistant-overlay effect, keyed on
`[cyInstance, graphName, countryOverlayOpen, countryOverlayCode, countryData]`:

```jsx
useEffect(() => {
  const cy = cyInstance;
  if (!cy || cy.destroyed?.()) return;
  const calls = cy.nodes("[type = 'Call'], [category = 'Call']");
  cy.batch(() => {
    calls.removeClass("country-coord country-part country-dim");
    if (!countryOverlayOpen || !countryOverlayCode || !countryData) return;
    const coord   = new Set((countryData.coordinatedCallIds || []).map(String));
    const active  = new Set((countryData.activeCallIds      || []).map(String));
    const covered = new Set((countryData.coveredCallIds     || []).map(String));
    calls.forEach((n) => {
      const id = String(n.id());
      if (coord.has(id)) n.addClass("country-coord");
      else if (active.has(id)) n.addClass("country-part");
      else if (covered.has(id)) n.addClass("country-dim");
      // else: no CORDIS data → leave neutral (honest)
    });
  });
}, [cyInstance, graphName, countryOverlayOpen, countryOverlayCode, countryData]);
```

The hook is called once in `GraphMainColumn`
(`const { loading: countryLoading, data: countryData } = useCountryActivity(countryOverlayCode, countryOverlayOpen);`)
and its result feeds both the effect and the drawer (single fetch). The drawer renders inside `.graph-main`
next to `CordisFieldExplorerDrawer`, gated `countryOverlayOpen && !isHEWiki`.

### 4d. Cytoscape classes — `GraphView/cy/palette.js`

Three classes appended to `extraStyles` (green = activity; distinct from compare blue, assistant violet, the
amber Call fill):

```js
{ selector: "node.country-coord", style: { "border-width": 5, "border-color": "#10b981",
    "border-opacity": 1, "overlay-color": "#10b981", "overlay-opacity": 0.18, "z-index": 9998 } },
{ selector: "node.country-part",  style: { "border-width": 4, "border-color": "#6ee7b7",
    "border-opacity": 1, "overlay-color": "#34d399", "overlay-opacity": 0.10 } },
{ selector: "node.country-dim",   style: { opacity: 0.2 } },
```

### 4e. Control wiring — `SidebarControls.jsx`, `RightControlsColumn.jsx`, `GraphPage.js`

- **GraphPage.js**: add `countryOverlayOpen` / `setCountryOverlayOpen` and `countryOverlayCode` /
  `setCountryOverlayCode` state; on the `graphName === "HE_2025"` branch of the layer-change effect, close it
  (`setCountryOverlayOpen(false)`), like Compare/Fields. Thread the four props to `GraphMainColumn` and the
  open/setter pair to `RightControlsColumn`.
- **RightControlsColumn.jsx**: pass `countryOverlayOpen` / `setCountryOverlayOpen` through to
  `SidebarControls`.
- **SidebarControls.jsx**: a `PublicIcon` toggle button inside the existing `!isHEWiki` block (after
  Research-fields), active-styled when `countryOverlayOpen`.

### 4f. Styles — `styles/components/_country-activity.scss` (+ `main.scss` import)

New partial imported in `main.scss` next to `cordis-fields` (`:34`). Holds the drawer chrome (reusing the
`cordis-fields-drawer` layout idiom), the country `<select>`, the headline, the area rows + coordinate/partner
split bar (mirroring `_cordis-partners.scss`), the legend swatches (green/light-green/dim), and the
hint/provenance captions — all via CSS vars (`--foreground-muted`, `--border`, `--primary`) for dark/light.

---

## 5. Honesty & provenance (mapped to concrete UI)

1. **Real data only.** Every highlight/row/facet comes from `PARTICIPATED_IN`/`HAS_FUNDED_PROJECT` +
   `og.country` in Neo4j via `/country-activity`. No hardcoded paint; a country/area with no data simply
   doesn't light up.
2. **Participation ≠ quality.** Hint + provenance state this is EU-funded participation, not quality/impact
   ("most active" ≠ "best"). Coordinated and partnered are shown **separately** (split bar + the two graph
   tints), never blended into a merit score.
3. **Absence ≠ no activity.** Only **CORDIS-covered** calls are dimmed when a country is absent; calls with no
   CORDIS data stay **neutral** (we never imply "inactive" where we have no data). The provenance says so.
4. **Country picker is general.** Any country present in the data (facet-driven), not tied to one (ideas doc
   B4 note).
5. **No methodology jargon.** Plain labels (led/joined, country codes); no query strings, cluster tags, or
   role codes surfaced.
6. **No silent caps.** `areaCount` / `returnedCount` / `cap` / `capped` returned and surfaced; the graph uses
   the **full** active id sets so no highlight is hidden by the drawer-list cap.

---

## 6. Step-by-step

1. **Backend (3):** add `COUNTRY_ACTIVITY_PROVENANCE`, `COUNTRY_AREAS_CAP`, `_rank_country_areas` (pure), and
   `GET /cordis/country-activity` to `cordis_routes.py`. No parser/builder/tagger change.
2. **Offline verify (§7):** synthesise the per-call participation rows the Cypher returns from a real
   extraction and run the **real** `_rank_country_areas` → assert ranking/shape; assert the route's id-set
   derivations (active/coordinated/covered) are correct.
3. **Frontend (4a–4b, 4f):** `useCountryActivity.js`, `CountryActivityDrawer.jsx`, `_country-activity.scss`
   (+ `main.scss` import).
4. **Overlay + classes (4c–4d):** the `GraphMainColumn` effect + the three `palette.js` classes.
5. **Wiring (4e):** GraphPage state + threading; RightControlsColumn pass-through; SidebarControls button.
6. **Build** the frontend; update this file's Status to *Implemented & Verified (offline)*.

---

## 7. Verification

**Offline (real data on disk — primary correctness proof).** Using the extractions under
`CORDIS/data/extracted/…` (parsed with `parse_extraction`): pool a country's orgs across a subject's projects,
synthesise the per-call rows exactly as the `/country-activity` Cypher returns them
(`coordinatedCount`/`partneredCount`/`projectCount` per call), run the **real** `_rank_country_areas`, and
assert: ranking is by distinct projects desc then coordinated desc then name; `coordinatedCount`/
`partneredCount` are the per-role distinct-project counts; the derived `activeCallIds` =
{calls with any participation}, `coordinatedCallIds` = {calls with ≥1 led}, and `coveredCallIds` ⊇
`activeCallIds`. **No hardcoded values** — all derived from parsed dicts.

**Live end-to-end (user — needs `CORDIS_API_KEY` + Neo4j).**
1. After an A2 ingest (`POST /cordis/tag-calls {"source":"cluster_1"}`):
   `GET /cordis/country-activity` → non-empty `facets.countries`; add `?country=DE` → ranked `areas` + the
   three id sets.
2. In the app: open the **Country activity** drawer → pick a country → on a programme/destination layer the
   call nodes light up (green led / light-green joined / dimmed covered-but-absent), the drawer lists the top
   areas, and each links to its call detail. Closing the drawer or clearing the country removes the paint.

**Frontend build.** `node node_modules/react-scripts/bin/react-scripts.js build` (npx is broken on this
Windows setup, per project memory). Pre-existing warnings expected; B4 must add none new.

---

## 8. Rollback

- **Code only — B4 writes no data.** Delete the `GET /cordis/country-activity` handler + `_rank_country_areas`
  + the two module constants; delete `CountryActivityDrawer.jsx`, `useCountryActivity.js`,
  `_country-activity.scss`; remove the `main.scss` import, the three `palette.js` classes, the `GraphMainColumn`
  effect + hook + drawer mount, the `SidebarControls` button, and the GraphPage/RightControlsColumn threading.
  No schema/data migration to undo (B4 introduces no nodes, edges, or properties).

---

## 9. Decisions (recommended defaults applied; flagged for review)

1. **Overlay target = Call nodes** (applied — the only CORDIS-linked nodes Cytoscape draws, consistent with
   A2/A6/B3/B2 and the timeline/assistant overlays) vs. rolling activity up to destination/programme nodes
   (rejected for v1 — needs a call→parent map and muddies "each area"; the drawer's ranked list already gives
   cross-layer value).
2. **Three honest states + neutral** (led / joined / covered-but-absent dim / no-data neutral) (applied — only
   dims where absence is meaningful) vs. dimming every non-active node (rejected — would imply "inactive" on
   calls we have no CORDIS data for).
3. **Drawer (B5 pattern) housing the picker + ranked list** (applied — gives value on layers with no call
   nodes; consistent with Compare/Fields) vs. a bare dropdown in the legend (rejected — no place for the list /
   legend / provenance, and less discoverable).
4. **Green tint** for activity (applied — distinct from compare blue, assistant violet, the amber Call fill)
   vs. reusing an existing accent (rejected — would collide with another overlay's meaning).
5. **Led vs joined kept as two measures** (split bar + two graph tints) (applied — honest role mix) vs. a
   single "activity score" (rejected — implies merit the data can't support).
</content>
</invoke>
