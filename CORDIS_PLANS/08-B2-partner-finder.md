# Execution Plan — **B2: "Who works in this area" / partner finder**

> Consumer of the data backbone (`CORDIS_PLANS/00-data-backbone.md`) and A2's subject-area links
> (`CORDIS_PLANS/02-A2…`). Built on the **same** `HAS_FUNDED_PROJECT` + `PARTICIPATED_IN` edges already in
> Neo4j, **plus one new ingestion field**: the organisation's **activity type** (university / company /
> research org / public body / other), which the parser/builder do not yet capture but the CORDIS data
> already contains. So B2 = **one small parser+builder addition** (org type) **+ one new read endpoint +
> one new frontend card**. No new node/edge type.
>
> Process: this plan is the review checkpoint required before coding (ideas doc §"mandatory process").
> Status: **IMPLEMENTED & VERIFIED (offline)** on branch `cordis`.
>
> **Built:** (backend) `cordis_parser.py` — `_relations` + `_activity_type` helpers, `orgType` on each
> org dict; `cordis_builder.py` — `orgType` added to the `CordisOrganisation` MERGE props; `cordis_routes.py`
> — `ORG_TYPE_LABELS`, `PARTNERS_PROVENANCE`, `PARTNERS_CAP`, the pure `_rank_area_organisations` helper, and
> `GET /cordis/area-organisations` (server-side country/type filtering, unfiltered facets, honest cap
> disclosure). (frontend) `GraphPage/CordisEvidence/{useCordisOrganisations.js, CordisPartnersPanel.jsx}`,
> `styles/components/_cordis-partners.scss` (+ `main.scss` import), mounted in `NodeDetail.js` after
> `CordisRelatedPanel`, gated on `viewModel.kind==="call"`.
>
> **Verified offline (real extractions, no mocks):** parsed real extractions → every org carries a real
> activity-type code (`HES/PRC/REC/PUB/OTH/IND` or `""`); pooled one curated subject's 6,449 distinct
> projects into 27,087 distinct orgs, aggregated per-org coordinated/partnered distinct-project counts
> exactly as the Cypher does, and ran the **real** `_rank_area_organisations`: top orgs are Fraunhofer (437
> proj, 57 led / 380 joined), CNRS, CNR, CEA — ranking desc, `projectCount = coordinated + partnered`,
> labels mapped to plain language; `country=DE` narrows to Fraunhofer/DLR/TU München, `org_type=PRC` narrows
> to Atos/Engineering. All from parsed dicts — no hardcoded values. Frontend build passes with **no new
> warnings** (+1.07 kB JS).
>
> **Remaining (user — needs Neo4j + key):** re-run an ingest so `orgType` is populated
> (`POST /cordis/tag-calls {"source":"cluster_1"}` or `/cordis/ingest-local`), then open a tagged call →
> the "Who works in this area (CORDIS)" card lists ranked orgs with the coordinate/partner split; the
> country and type dropdowns filter the list. Orgs ingested before this change show type "Unknown" until
> re-ingested. The read path is code-only; `orgType` is an additive, idempotent property (rollback in §8).

---

## 0. TL;DR

From a call on screen, B2 answers **"who works in this area?"**: a ranked list of the organisations most
active in the call's CORDIS-funded research area, showing for each how often it **coordinates** vs.
**partners**, its **country**, and its **organisation type** (university / company / research org / public
body / other). The list is **filterable by country** (any country, user-chosen — not tied to one) **and by
organisation type**. It turns A2's static "top organisations" line into an interactive partner-finder.

The participation data is **already in Neo4j**: A2 stored `(:CordisOrganisation)-[:PARTICIPATED_IN {role}]
->(:CordisProject)<-[:HAS_FUNDED_PROJECT]-(:Call)` and the org's `country`. The **one missing piece** is
the organisation's **activity type**, which CORDIS provides on each organisation
(`relations.categories` → `classification == "organizationActivityType"`, codes `/HES /PRC /REC /PUB /OTH`)
but the current parser drops. B2 adds that single field to ingestion and otherwise only **reads**.

---

## 1. Goal & exactly what the card shows

For the call open in the detail page, render a **"Who works in this area (CORDIS)"** card: a ranked list
(top ~15) of organisations active on the call's funded-project area, with two filter controls and an
honest provenance caption.

**Filter controls (top of card):**

| Control | Behaviour | Source |
|---|---|---|
| **Country** | dropdown of every country present in this area (with org counts), default "All countries" — **any** country, not tied to one | facet computed over the area |
| **Organisation type** | university / company / research org / public body / other (with counts), default "All types" | facet computed over the area |

**Each organisation row:**

| Element | Value | Honesty note |
|---|---|---|
| **Name** | the organisation's `name` | plain name, no acronym jargon |
| **Country · Type** | `country` + plain-language type label | the basis of the filters |
| **Coordinates / partners** | `coordinatedCount` projects led + `partneredCount` projects joined, as a small split bar | role mix, two distinct counts — never summed into a fake "score" |
| **Projects** | `projectCount` distinct funded projects in the area | participation, **not** quality/impact |

Plus a header hint and provenance. **`projectCount===0` / no organisations → the card is hidden** (same
gate as A2/A6/B3 — never an empty card, never fabricated rows).

**Where it attaches.** `frontend/src/components/NodeDetail.js`, **immediately after** the B3
`CordisRelatedPanel` mount (`NodeDetail.js:1273`), inside the same `viewModel.kind === "call"` block, with
the same `callId={nodeData.id || id}` identity used by A2/A6/B3.

**Honest framing.** This is **EU-funded participation** in the area, **not** scientific quality or impact;
"most active" is **not** "best". Organisations not in CORDIS (nationally/privately funded) simply don't
appear — **absence ≠ no activity**. The header says so plainly.

---

## 2. The data — one new ingestion field, the rest already present

### 2a. Already in Neo4j (read-only, from A2)

```
(:Call)-[:HAS_FUNDED_PROJECT]->(:CordisProject {source:"cordis"})<-[:PARTICIPATED_IN {role}]-(:CordisOrganisation {source:"cordis", name, country})
```

- An org's **activity in the area** = the distinct `CordisProject`s it `PARTICIPATED_IN` that are
  `HAS_FUNDED_PROJECT` of this call.
- **Coordinates vs. partners** comes from the existing `PARTICIPATED_IN.role` (`coordinator` →
  *coordinates*; `participant`/`associatedPartner`/`thirdParty` → *partners*). Counted as two distinct
  measures, never merged.
- **Country** is the existing `CordisOrganisation.country`.

### 2b. New ingestion field — organisation **activity type**

The current parser captures the org's consortium **role** (coordinator/participant) but **not** its
**activity type** (what kind of organisation it is). CORDIS provides this on every organisation
association under its nested `relations.categories`, as a category whose
`attributes.classification == "organizationActivityType"`:

| CORDIS code | CORDIS title | Plain B2 label (jargon-free) |
|---|---|---|
| `/HES` | Higher or Secondary Education Establishments | **University / education** |
| `/PRC` | Private for-profit entities | **Company** |
| `/REC` | Research Organisations | **Research organisation** |
| `/PUB` | Public bodies | **Public body** |
| `/OTH` | Other | **Other** |
| *(missing)* | — | **Unknown** (disclosed; not fabricated) |

Verified present across the real on-disk extractions (`CORDIS/data/extracted/…`): a survey of the first
extractions found all five codes (HES 1391, PRC 1227, REC 818, PUB 210, OTH 191) — **real data, no
fabrication**. The label mapping lives in **the backend** (one dict) so the UI shows plain language; the
raw code is also returned for transparency.

**Storage.** Add `orgType` (the bare code, e.g. `HES`) to the `CordisOrganisation` node in the builder.
This is the **only** schema addition. No new node or relationship type.

**Re-ingestion.** `orgType` is populated when projects are ingested (A2's `POST /cordis/tag-calls
{ingest_projects:true}` or `/cordis/ingest-local`). Organisations ingested **before** this change have no
`orgType` until re-ingested — B2 **degrades honestly**: such orgs show type **"Unknown"**, the type facet
only lists types actually present, and the country filter + ranking still work fully. No migration is
forced; re-running the ingest backfills `orgType` (MERGE upsert, idempotent).

No methodology-project jargon, no hardcoded values — every figure comes from these edges/fields.

---

## 3. Backend — one parser change, one builder change, one read endpoint

### 3a. Parser — `cordis_parser.py`

In `normalise_project`, when building each organisation dict, extract the activity-type **code** from the
association's nested `relations.categories` (the entry whose `attributes.classification ==
"organizationActivityType"`), stripping the leading `/`. Defensive about stringified dicts exactly like the
existing `_attrs`/`_addr_field` helpers (CORDIS serialises nested objects as Python-repr strings). Add a
small helper `_activity_type(assoc)` and set `org["orgType"]` (e.g. `"HES"`, or `""` when absent). Pure, no
DB/network — unit-testable offline against a real extraction.

### 3b. Builder — `cordis_builder.py`

Add `orgType` to the `CordisOrganisation` MERGE props (next to `name`, `country`, `city`). `_props` already
drops empties, so a missing type stores nothing (→ "Unknown" downstream). One line; idempotent upsert.

### 3c. Endpoint — `GET /cordis/area-organisations` in `cordis_routes.py`

A pure read endpoint alongside `/call-evidence` and `/related-calls`, with a **pure** ranking helper
`_rank_area_organisations` (offline-testable, mirroring `_aggregate_call_trend` / `_rank_related_calls`).

**Filtering is server-side** (so the documented cap can never silently interact with a filter): the
country/type filters are applied in Cypher, ranking runs over the filtered set, and the result is capped
and the cap **disclosed**. The **facets** (all countries / all types present in the area, with org counts)
are computed over the **unfiltered** area so the dropdowns are stable regardless of the active filter.

```python
ORG_TYPE_LABELS = {
    "HES": "University / education",
    "PRC": "Company",
    "REC": "Research organisation",
    "PUB": "Public body",
    "OTH": "Other",
}
PARTNERS_PROVENANCE = ("Organisations participating in this call's CORDIS-funded projects, by role "
                       "(CORDIS, FP7-Horizon Europe). EU-funded participation, not scientific quality.")
PARTNERS_CAP = 200   # bound the ranked org list; disclosed via organisationCount/cap/capped


def _rank_area_organisations(rows, top_n, cap=PARTNERS_CAP):
    """Shape + rank the area's organisations. Pure (no DB) -> unit-testable offline. ``rows`` are dicts
    {id,name,country,orgType,coordinatedCount,partneredCount} (one per org, already filtered in Cypher).
    projectCount = coordinated + partnered (distinct projects; an org's role on a project is single).
    Ranked by total projects desc, then coordinated desc, then name. Capped; caller discloses the cap."""
    out = []
    for r in rows:
        coord = r.get("coordinatedCount") or 0
        partner = r.get("partneredCount") or 0
        code = r.get("orgType") or ""
        out.append({
            "id": r.get("id"),
            "name": r.get("name") or r.get("id"),
            "country": r.get("country") or "",
            "orgType": code,
            "orgTypeLabel": ORG_TYPE_LABELS.get(code, "Unknown"),
            "coordinatedCount": coord,
            "partneredCount": partner,
            "projectCount": coord + partner,
        })
    out.sort(key=lambda x: (-x["projectCount"], -x["coordinatedCount"], (x["name"] or "").lower()))
    return out[:min(top_n, cap)]
```

Route sketch (`country`, `org_type` optional; `top_n` default 15):

- **Facets** (one query, unfiltered area): distinct countries with org counts; distinct `orgType` codes
  with org counts (missing type bucketed as `""` → "Unknown"). Returned so the UI can populate both
  dropdowns with totals.
- **Ranked orgs** (one query, filtered): match the area's orgs, optional `WHERE og.country = $country`,
  optional `WHERE coalesce(og.orgType,'') = $org_type`; per org count distinct coordinated projects
  (`role='coordinator'`) and distinct partnered projects (`role <> 'coordinator'`); pre-order by total and
  `LIMIT $cap`; pass through `_rank_area_organisations`.
- `organisationCount` (distinct orgs in unfiltered area), `filteredCount` (distinct matching the filters),
  `returnedCount`, `cap`, `capped = filteredCount > returnedCount` — **no silent caps**.

**Response shape the frontend consumes:**

```json
{
  "call_id": "HORIZON-CL1-...",
  "subject": "AI for health and personalised care",
  "projectCount": 312,
  "organisationCount": 1180,
  "filteredCount": 1180,
  "returnedCount": 15,
  "cap": 200,
  "capped": false,
  "filters": { "country": null, "orgType": null },
  "facets": {
    "countries": [{ "code": "DE", "orgs": 142 }, { "code": "ES", "orgs": 121 }],
    "orgTypes": [
      { "code": "HES", "label": "University / education", "orgs": 410 },
      { "code": "PRC", "label": "Company", "orgs": 360 },
      { "code": "REC", "label": "Research organisation", "orgs": 290 }
    ]
  },
  "organisations": [
    {
      "id": "999978591", "name": "Universitat Politecnica de Valencia",
      "country": "ES", "orgType": "HES", "orgTypeLabel": "University / education",
      "coordinatedCount": 7, "partneredCount": 23, "projectCount": 30
    }
  ],
  "provenance": "Organisations participating in this call's CORDIS-funded projects, by role (CORDIS, FP7-Horizon Europe). EU-funded participation, not scientific quality."
}
```

Cypher notes: every aggregation groups by a **node/scalar** (the org), consistent with the existing CORDIS
routes; `count(DISTINCT …)` throughout; coordinated vs. partnered split with
`count(DISTINCT CASE WHEN r.role='coordinator' THEN pr END)` so the two role measures stay independent and
a project is never double-counted. The label map + sort + slice live in the pure helper (verifiable
offline against real participation rows).

---

## 4. Frontend

### 4a. Fetch hook — `GraphPage/CordisEvidence/useCordisOrganisations.js`

Mirror `useCordisEvidence.js` (per-key `Map` cache, request-race guard). Cache key =
`callId|country|orgType` so each filter combination is fetched once and re-used. Signature
`useCordisOrganisations(callId, { country, orgType })` → `{ loading, data, error }`; builds
`GET /cordis/area-organisations?call_id=…[&country=…][&org_type=…]`.

### 4b. Card — `GraphPage/CordisEvidence/CordisPartnersPanel.jsx`

Mirrors the A2/B3 `nd-card` markup and **hide-when-empty** contract. Because filters change the list, the
hide gate uses the **unfiltered** signal: keep an `everHadData` ref (or read `organisationCount`) so the
card doesn't vanish when a user filters down to zero — instead it shows a small "No organisations match
these filters" inline note with a reset, while a truly empty area (`organisationCount===0`) hides the card
entirely. Sub-blocks:

- **Header** → title **"Who works in this area (CORDIS)"**.
- **Hint** (`cordis-partners__hint`): *"Organisations funded to work on this research area, and how often
  they lead (coordinate) vs. join (partner) projects. EU-funded participation only — not a measure of
  quality or impact, and organisations funded nationally or privately won't appear."*
- **Filters** (`cordis-partners__filters`): a **Country** `<select>` (All countries + each facet country
  with its count) and an **Organisation type** `<select>` (All types + each facet type label with its
  count). Local `useState`; changing either re-fetches via the hook. Native `<select>` keeps it dependency-
  light and consistent with the app's plain controls.
- **List** (`cordis-partners__list`): one row per org — name; `country · type label` (muted); a
  **coordinate/partner split bar** (two segments sized by `coordinatedCount` / `partneredCount`, with a
  legend the first time) + the numeric `projectCount`. The split is two labelled values, never a single
  blended score.
- **Caps note**: if `capped`, a muted line "Showing top {returnedCount} of {filteredCount} — refine with
  the filters." (disclosed, never silent).
- **Provenance** (`cordis-partners__prov`): `data.provenance` + `— "{subject}"`.

### 4c. Styles — `styles/components/_cordis-partners.scss` (+ `main.scss` import)

New partial imported in `styles/main/main.scss` next to `cordis-related` (`:32`). Holds only B2 classes
(filter row, org rows, the coordinate/partner split bar + legend, hint/prov captions), reusing `nd-card*`
and CSS vars (`--foreground-muted`, `--border`, `--muted`) for dark/light. Chips/bars mirror the
`cordis-ev` / `cordis-related` conventions.

### 4d. Mount — `NodeDetail.js`

Add the import next to the other three CORDIS panels and render after `CordisRelatedPanel`:

```jsx
{viewModel.kind === "call" && (
  <>
    <CordisEvidencePanel callId={nodeData.id || id} />
    <CordisTrendPanel callId={nodeData.id || id} />
    <CordisRelatedPanel callId={nodeData.id || id} />
    <CordisPartnersPanel callId={nodeData.id || id} />
  </>
)}
```

---

## 5. Honesty & provenance (mapped to concrete UI)

1. **Real data only.** Every row/facet comes from `PARTICIPATED_IN`/`HAS_FUNDED_PROJECT` + the org's
   `country`/`orgType` in Neo4j. No hardcoded rows; empty area → hide the card.
2. **Participation ≠ quality.** Hint + provenance state this is EU-funded participation, not quality or
   impact ("most active" ≠ "best"). Coordinate and partner counts are shown **separately**, never summed
   into a ranking score that implies merit.
3. **EU-funded only; absence ≠ no activity.** Provenance names CORDIS / FP7–Horizon Europe; the hint notes
   nationally/privately funded orgs won't appear.
4. **Country filter is general.** Works for **any** country present in the area (facet-driven), not tied to
   one country (ideas doc B2 note).
5. **No methodology jargon.** Organisation types shown in plain language (University / Company / Research
   organisation / Public body / Other); the raw EuroSciVoc/activity codes never surface as labels. Missing
   type shown as "Unknown", never guessed.
6. **No silent caps.** `organisationCount` / `filteredCount` / `cap` / `capped` returned and surfaced when
   the list is truncated.

---

## 6. Step-by-step

1. **Parser (3a):** add `_activity_type` + set `orgType` on each org in `cordis_parser.normalise_project`.
2. **Builder (3b):** add `orgType` to the `CordisOrganisation` MERGE props in `cordis_builder.py`.
3. **Endpoint (3c):** add `ORG_TYPE_LABELS`, `PARTNERS_PROVENANCE`, `PARTNERS_CAP`,
   `_rank_area_organisations` (pure), and `GET /cordis/area-organisations` to `cordis_routes.py`.
4. **Offline verify (§7):** parse a real extraction → assert `orgType` populated with real codes; build the
   participation rows the Cypher returns and run the **real** `_rank_area_organisations` → assert the
   coordinate/partner split, project totals, ranking order, and label mapping are correct.
5. **Frontend (4a–4c):** `useCordisOrganisations.js`, `CordisPartnersPanel.jsx`, `_cordis-partners.scss` +
   `main.scss` import.
6. **Mount (4d):** import + render `CordisPartnersPanel` after `CordisRelatedPanel` in `NodeDetail.js`.
7. **Build** the frontend; update this file's Status to *Implemented & Verified (offline)*.

---

## 7. Verification

**Offline (real data on disk — primary correctness proof).** Using the extractions under
`CORDIS/data/extracted/…`:
- Parse a real extraction with the updated parser → assert every org dict carries an `orgType` drawn from
  the real activity-type codes (`HES/PRC/REC/PUB/OTH` or `""`), and that the per-org role is preserved.
- Synthesise the per-org participation rows exactly as the `/area-organisations` Cypher returns them
  (`coordinatedCount`, `partneredCount`, `orgType`, `country`), run the **real**
  `_rank_area_organisations`, and assert: `projectCount = coordinated + partnered`; ordering is by total
  desc then coordinated desc then name; `orgTypeLabel` maps codes to the plain labels (and `""`/unknown →
  "Unknown"). **No hardcoded values** — all derived from parsed dicts.

**Live end-to-end (user — needs `CORDIS_API_KEY` + Neo4j).**
1. Re-run an ingest so `orgType` is populated: `POST /cordis/tag-calls {"source":"cluster_1"}` (or
   `/cordis/ingest-local` on an extraction). *(Existing orgs without `orgType` show "Unknown" until then.)*
2. `GET /cordis/area-organisations?call_id=<a tagged call id>` → ranked orgs with coordinate/partner split
   + facets; add `&country=DE` / `&org_type=HES` → list narrows, facets stable.
3. In the app: open that call's detail → the "Who works in this area" card lists orgs; the country and type
   dropdowns filter the list; a call with no CORDIS data → no card.

**Frontend build.** `node node_modules/react-scripts/bin/react-scripts.js build` (npx is broken on this
Windows setup, per project memory). Pre-existing warnings expected; B2 must add none new.

---

## 8. Rollback

- **Code-only for the read path** (endpoint + helper + 3 frontend files + `main.scss`/`NodeDetail.js`
  lines) — removing them fully reverts the feature.
- **Ingestion field** `orgType` is an **additive, optional** property (MERGE-set, empties dropped). Leaving
  it in place is harmless; if undesired, `MATCH (og:CordisOrganisation) REMOVE og.orgType` clears it.
  Reverting the parser/builder lines stops new ingests from setting it. No node/edge type is added, so
  there is no structural migration to undo.

---

## 9. Decisions (recommended defaults applied; flagged for review)

1. **Org-type filter requires a new ingestion field.** Applied — parse + store `orgType` (the activity
   type is in the CORDIS data already, just dropped today). The B2 idea explicitly requires the type
   filter, so the alternative (drop the type filter) would not satisfy the feature. Additive/idempotent;
   degrades to "Unknown" pre-re-ingest.
2. **Placement:** **separate "Who works in this area" card after B3** (applied — independently
   rollback-able; consistent with A2/A6/B3) vs. expanding A2's existing top-orgs line (rejected — would
   couple two features and lose independent rollback).
3. **Filtering server-side** (applied — keeps the documented cap from silently interacting with filters;
   facets computed over the unfiltered area for stable dropdowns) vs. fetch-all + filter client-side
   (rejected — a cap + client filter can hide ranked-out matches without disclosure).
4. **Coordinate vs. partner shown as two separate counts + a split bar** (applied — honest role mix) vs. a
   single blended "activity score" (rejected — implies merit/quality the data can't support).
5. **Scope = the call's CORDIS subject area** via `HAS_FUNDED_PROJECT` (applied — same area definition as
   A2/A6/B3, so the cards agree) vs. exact call-code matching (rejected — far sparser, inconsistent with
   the sibling cards).
