# Execution Plan — **A2: Funded-projects panel (CORDIS landscape behind a call)**

> Second consumer of the data backbone (`CORDIS_PLANS/00-data-backbone.md`), built on top of A1
> (`CORDIS_PLANS/01-A1-topic-tags-on-calls.md`).
> Process: this plan is the review checkpoint required before coding (ideas doc §"mandatory process").
> Status: **PLAN — awaiting review.** Branch `cordis`.

---

## 0. TL;DR

For a Horizon Europe call on screen, A2 shows the **real CORDIS funded-project landscape behind that
call's subject area**: how many EU-funded projects exist on the subject, their total EU contribution,
the top organisations and countries, and the spread across framework programmes (FP7 / Horizon 2020 /
Horizon Europe). The honest headline is *"funded projects on this call's subject (CORDIS, FP7–Horizon
Europe)"* — **not** the call's official budget or scope.

The key efficiency move: A1's curated fetch already pulls every funded project for a subject but **only
aggregates EuroSciVoc fields and throws the projects away**. A2 makes that same fetch **also ingest the
full projects** (via the existing `CordisGraphBuilder.ingest`) and **link them to the call's area** with
a new `(:Call)-[:HAS_FUNDED_PROJECT]->(:CordisProject)` edge. One fetch then yields **both** A1's tags and
A2's queryable project/org/country/funding data (and the substrate for later B1/B4). A new read endpoint
`GET /cordis/call-evidence?call_id=…` serves the panel. Frontend renders a new collapsible section in
`NodeDetail.js` (and optionally 1–2 compact hover metrics). Empty state where CORDIS has no data — never
fabricated.

---

## 1. Goal & exactly what the panel shows (verified frontend anchors)

For the call currently open in the detail page, render a **"Funded projects on this subject (CORDIS)"**
card showing:

| Element | Value | Honesty note |
|---|---|---|
| **Funded projects** | `count` — distinct `CordisProject` linked to this call's area | a count, not funding, not impact |
| **Total EU contribution** | `SUM(ecContribution)` across those projects | EU money actually awarded on the subject, not the call's budget |
| **Top organisations** | top 5 by number of those projects they participated in (with country) | participation, not funding share |
| **Top countries** | top 5 by org count on those projects | where the funded orgs are registered |
| **Framework-programme spread** | counts (and funding) per FP7 / Horizon 2020 / Horizon Europe | shows the historical landscape; omit programmes with 0 |
| **Provenance caption** | the curated subject/query + project count + "CORDIS, FP7–Horizon Europe" | mirrors A1's `cordis_tag_*` convention |

**Where it attaches (verified):**

- **Primary — NodeDetail call view.** `frontend/src/components/NodeDetail.js`. The call view renders cards
  in `.nd-main-column`: "Key Information" (`NodeDetail.js:1171–1249`) then the TRL card (`:1251–1264`)
  then `textFieldConfig.map(... TextSectionFromField ...)` (`:1266+`). The A2 card is a **new
  `nd-card`** inserted **after the TRL card (post line 1264)**, following the exact `nd-card` /
  `nd-card-header` / `nd-card-body` / `nd-metrics-grid` markup already used at `:1171–1248`.
- **Call identity (verified):** `NodeDetail.js:1146–1151` shows the Call node carries `identifier`,
  `topic_id`, `call_id`, plus `id` and `name`. A2 fetches by **`nodeData.id`** (the stable node id used
  by the `HAS_FUNDED_PROJECT` edge), with `call_id`/`identifier`/`topic_id` as the human label.
- **Optional — hover card.** `frontend/.../HoveredNodeInfo/hooks/useHoveredNodeModel.js:275–293` builds
  the call `metricCards` array (`{key,label,value,variant,fullWidth}`), rendered by
  `MetricCards.jsx`. A2 appends **1–2 compact metrics** ("Funded projects", "EU contribution") to that
  loop — no new component. (Hover is **opt-in**, see §9 decision 1.)

The panel is honest evidence about the **subject area**, deliberately separate from the call's own
"Key Information" budget metrics (`minContribution` / `maxContribution` / `totalBudget` at
`NodeDetail.js:1185–1201`), which describe the call itself.

---

## 2. The data link — how funded projects relate to a call

**A call is about a subject, not (yet) a code.** Per the verified constraint
(`00-data-backbone.md:83–87`, `01-A1…md:7–14`): the literal call-code join
`(:CordisProject)-[:FUNDED_UNDER]->(:Call)` is **empty for the app's 2026 calls** — nothing has been
awarded under `HORIZON-CL3-2026-01`-style codes yet. So "the funded projects for this call" **cannot** be
retrieved by exact code. CL3 calls also have **no `topic_title`**; their subject is the call title stored
on `Call.name` (`cordis_tagger.py:55–61` coalesces `topic_title`→`name`).

**The area link.** A2 reuses A1's per-subject curated query (`curated_queries/cluster_3.json`, 44 reviewed
subject→query entries) as the relevance filter. For each subject, the projects CORDIS returns **are** the
funded landscape of that subject area. A2 links them to **every call sharing that subject** with a new
relationship:

```
(:Call {id})-[:HAS_FUNDED_PROJECT {linkType:"subject"}]->(:CordisProject {source:"cordis"})
```

This is a **semantic "evidence" link by subject area**, distinct from the exact-code `FUNDED_UNDER` edge
(`cordis_builder.py:118–128`). It works for 2026 calls precisely because it does **not** depend on a code
match.

**Design decisions:**

1. **Reuse A1's fetch, don't add a second one.** A CORDIS extraction is slow (create→poll minutes→download,
   `00-data-backbone.md:38–47`). Fetching once for A1 (tags) and again for A2 (projects) is wasteful and
   risks the server-side extraction cap. A2 makes A1's existing fetch (`cordis_tagger.tag_calls`, which
   already calls `_projects_for_subject` at `:121`) **also ingest the full projects and create the area
   link**, in the same loop iteration, from the **same `projects` list** already in memory.
2. **Link belongs in the tagger, not the builder.** `CordisGraphBuilder.ingest` (`cordis_builder.py:49`)
   ingests raw CORDIS data and does **exact-code** call linking only — it has no subject context. The
   **subject→call** mapping lives in the tagger (`by_subject` at `cordis_tagger.py:92–96`). So the
   `HAS_FUNDED_PROJECT` link is created in `tag_calls` after `ingest`, iterating the subject's `call_ids`.
3. **Idempotent.** Both `ingest` (`MERGE`-based) and the area link (`MERGE`) re-run cleanly — running the
   job twice creates no duplicates.
4. **Serve pre-aggregated, on demand.** The panel reads through the backend (single auditable source of
   truth) via a new aggregation endpoint — the browser never fetches CORDIS directly (honesty rule).

---

## 3. Backend changes

### 3a. Make the curated fetch ALSO ingest projects + create the area link

In `backend/routes/new_pipeline/cordis/cordis_tagger.py`, inside `tag_calls`'s per-subject loop, **after
`projects` is obtained (`:121`) and before `aggregate_fields` (`:125`)**, add ingest + area-link:

```python
from .cordis_builder import CordisGraphBuilder   # top of file

# ... inside the loop, after: projects = _projects_for_subject(query, mode, local_path, client)

# A2: ingest the full projects (idempotent MERGE) so they are queryable, not just aggregated.
if ingest_projects:                                   # new param, default True
    ing = CordisGraphBuilder(preview=preview).ingest(projects)
    for k in ("projects", "organisations", "fields", "participations", "calls_linked"):
        ingest_totals[k] += ing.get(k, 0)

# A2: link EVERY call on this subject to EVERY fetched project (area-based evidence link).
area_links = 0
if ingest_projects and not preview:
    pids = [p["id"] for p in projects if p.get("id")]
    for cid in call_ids:
        res = db.query(
            "MATCH (c:Call {id:$cid}) "
            "SET c.cordis_area_query=$subj, "
            "    c.cordis_area_project_count=$n, "
            "    c.cordis_area_link_source=$src "
            "WITH c UNWIND $pids AS pid "
            "MATCH (pr:CordisProject {id:pid, source:'cordis'}) "
            "MERGE (c)-[r:HAS_FUNDED_PROJECT]->(pr) SET r.linkType='subject' "
            "RETURN count(r) AS n",
            {"cid": cid, "subj": subject, "n": len(projects),
             "pids": pids, "src": AREA_LINK_LABEL},
        )
        area_links += (res[0]["n"] if res else 0)
    area_links_total += area_links
```

- `ingest_projects: bool = True` is a new `tag_calls` kwarg so A1-only runs (tags without projects) remain
  possible (§9 decision 4).
- `AREA_LINK_LABEL = "Funded projects matching this call's subject (CORDIS, FP7-Horizon Europe)"` — a new
  module constant alongside `TAG_SOURCE_LABEL` (`cordis_tagger.py:27`).
- Provenance written to the Call node (`cordis_area_query`, `cordis_area_project_count`,
  `cordis_area_link_source`) mirrors A1's `cordis_tag_*` props (`cordis_tagger.py:133–137`) so the panel
  can show a fast headline even before hitting the aggregation endpoint.
- The ingest reuses the **already-verified** `CordisGraphBuilder.ingest` (`cordis_builder.py:49–130`); no
  builder change. The `ingest_totals` / `area_links_total` accumulators are merged into `tag_calls`'s
  return dict (`cordis_tagger.py:141–148`) for visibility.
- `clear_tags` (`cordis_tagger.py:151`) gains a sibling removing the area props (see 3c).

### 3b. Serving endpoint — `GET /cordis/call-evidence`

New route in `cordis_routes.py` (alongside the existing `/area` at `:125–138`, which stays as the
exact-code lookup):

```python
@router.get("/call-evidence")
def call_evidence(call_id: str, top_n: int = 5):
    """A2 funded-projects panel: aggregate the CORDIS projects linked to a call's subject AREA
    (HAS_FUNDED_PROJECT), independent of exact call-code matching."""
    s = SOURCE_TAG
    summary = db.query(
        "MATCH (c:Call {id:$cid})-[:HAS_FUNDED_PROJECT]->(pr:CordisProject {source:$s}) "
        "RETURN count(DISTINCT pr) AS projectCount, "
        "       sum(pr.ecContribution) AS totalEcContribution, "
        "       c.cordis_area_query AS subject",
        {"cid": call_id, "s": s},
    )
    fp = db.query(
        "MATCH (c:Call {id:$cid})-[:HAS_FUNDED_PROJECT]->(pr:CordisProject {source:$s}) "
        "WITH coalesce(pr.frameworkProgramme,'Unknown') AS fp, "
        "     count(DISTINCT pr) AS n, sum(pr.ecContribution) AS funding "
        "RETURN fp, n, funding ORDER BY n DESC",
        {"cid": call_id, "s": s},
    )
    top_orgs = db.query(
        "MATCH (c:Call {id:$cid})-[:HAS_FUNDED_PROJECT]->(pr:CordisProject {source:$s}) "
        "MATCH (og:CordisOrganisation)-[:PARTICIPATED_IN]->(pr) "
        "WITH og, count(DISTINCT pr) AS n "
        "RETURN og.name AS name, og.country AS country, n "
        "ORDER BY n DESC LIMIT $k",
        {"cid": call_id, "s": s, "k": top_n},
    )
    top_countries = db.query(
        "MATCH (c:Call {id:$cid})-[:HAS_FUNDED_PROJECT]->(pr:CordisProject {source:$s}) "
        "MATCH (og:CordisOrganisation)-[:PARTICIPATED_IN]->(pr) "
        "WHERE og.country IS NOT NULL AND og.country <> '' "
        "WITH og.country AS country, count(DISTINCT og) AS orgs "
        "RETURN country, orgs ORDER BY orgs DESC LIMIT $k",
        {"cid": call_id, "s": s, "k": top_n},
    )
    head = summary[0] if summary else {}
    return {
        "call_id": call_id,
        "subject": head.get("subject"),
        "projectCount": head.get("projectCount", 0) or 0,
        "totalEcContribution": head.get("totalEcContribution", 0) or 0,
        "frameworkBreakdown": [r for r in fp if r.get("n")],
        "topOrganisations": top_orgs,
        "topCountries": top_countries,
        "provenance": "Funded projects matching this call's subject (CORDIS, FP7-Horizon Europe)",
    }
```

**Exact response shape the frontend consumes:**

```json
{
  "call_id": "cl3-2026-...-id",
  "subject": "Post-quantum cryptography for secure software",
  "projectCount": 278,
  "totalEcContribution": 612345678.0,
  "frameworkBreakdown": [
    { "fp": "HORIZON", "n": 278, "funding": 612345678.0 }
  ],
  "topOrganisations": [
    { "name": "Technical University ...", "country": "DE", "n": 14 }
  ],
  "topCountries": [
    { "country": "DE", "orgs": 121 }
  ],
  "provenance": "Funded projects matching this call's subject (CORDIS, FP7-Horizon Europe)"
}
```

Cypher reuses the verified `OPTIONAL MATCH … PARTICIPATED_IN … collect/aggregate` idiom from the existing
`/area` endpoint (`cordis_routes.py:131–133`) and the `/stats` aggregation pattern (`:112–118`). `count` vs
`sum` are kept as **separate fields** (honesty: counts ≠ funding). The endpoint returns `projectCount:0`
with empty arrays when no area link exists → drives the frontend empty state. The pydantic model
`TagCallsPayload` (`cordis_routes.py:33`) gains an optional `ingest_projects: bool = True` so the
`/tag-calls` route passes it through to `tag_calls`.

### 3c. Cleanup (DELETE)

New route, separate from `DELETE /all` (`cordis_routes.py:141`, which nukes all cordis nodes) and from
`DELETE /tags` (`:99`, which clears A1 tag props):

```python
@router.delete("/area-links")
def delete_area_links(source: str | None = None):
    """Remove A2 area links + area provenance, leaving ingested projects/A1 tags intact."""
    db.query("MATCH (:Call)-[r:HAS_FUNDED_PROJECT]->() DELETE r")
    db.query("MATCH (c:Call) "
             + ("WHERE c.source=$s " if source else "")
             + "REMOVE c.cordis_area_query, c.cordis_area_project_count, c.cordis_area_link_source",
             {"s": source} if source else {})
    return {"status": "cleared", "scope": source or "all"}
```

This lets `tag_calls` be re-run cleanly (re-link) without re-deleting the ingested projects. To remove the
ingested projects/orgs entirely, the existing `DELETE /cordis/all` (`:141–147` → `delete_all`,
`cordis_builder.py:132–138`) still applies. A matching `clear_area_links()` helper is added to
`cordis_tagger.py` next to `clear_tags` (`:151`).

---

## 4. Frontend

### 4a. Primary — NodeDetail section

**File:** `frontend/src/components/NodeDetail.js`. **Placement:** a new `nd-card` **after the TRL card
(post line 1264)**, before the `textFieldConfig.map` (`:1266`).

**Fetch (new hook):** `frontend/src/components/GraphPage/CordisEvidence/useCordisEvidence.js`
- Inputs: `nodeData.id` (and `kind === "call"` gate from the call detection at
  `NodeDetail.js:658–672`).
- `GET /cordis/call-evidence?call_id=<id>`; cache by `call_id` (Map ref) so hover→detail→back doesn't
  refetch — same async/cache pattern as the destination fetch at `HoveredNodeInfo.jsx:156–203`.
- Returns `{ loading, data, error }` where `data` is the §3b shape; `null`/`projectCount===0` → empty
  state.

**Render (`CordisEvidencePanel.jsx`):** mirrors the existing `nd-card` markup (`NodeDetail.js:1171–1248`).
Sub-blocks:
- **KPI row** — two `nd-metric` cells: "Funded projects" (`projectCount.toLocaleString()`) and
  "Total EU contribution" (`formatBudget(totalEcContribution)`).
- **Framework-programme spread** — a small bar list reusing the dashboard bar pattern: container
  `dash-funding__bars`, rows `dash-funding__row` / `dash-funding__bar-track` / `dash-funding__bar-fill`
  (`_dashboard.scss:230–265`), one bar per `frameworkBreakdown[]` entry. Bars sized by `n` (count) with the
  funding shown as the row value; **omit programmes with `n===0`** (never a zero bar).
- **Top organisations** — up to 5 rows `name — country (n projects)`.
- **Top countries** — up to 5 rows `country (orgs orgs)`.
- **Provenance caption** — small muted line rendering `data.provenance` + `subject`.

**Formatter (reuse, don't reinvent):** copy/import `formatBudget` exactly as defined in
`Dashboard/FundingByProgramme.jsx:3–9` (identical to `CompareDrawer.jsx:12–18`) → `€X.XB / €X.XM / €XK / —`.
Counts use `.toLocaleString()`. **Never** mix counts and euros in one number.

No new top-level layout/CSS surface: the card lives in `.nd-main-column`; styling reuses `nd-card*` plus a
few `dash-funding__*` classes already in `_dashboard.scss`. A tiny `_cordis-evidence.scss` (imported via
`styles/main/main.scss`) holds only minor overrides if needed.

### 4b. Optional — compact hover metrics

If decision §9.1 is "yes", extend the call `metricCards` loop in
`HoveredNodeInfo/hooks/useHoveredNodeModel.js:275–293`: after the existing `fields.forEach`, push **1–2**
entries — `{ key:"cordis_projects", label:"Funded projects", value: count, variant:"number", fullWidth:false }`
and optionally `{ key:"cordis_funding", label:"EU contribution", value: formatBudget(total) }`. These read
the **pre-computed Call props** `cordis_area_project_count` (written in 3a) so the hover card needs **no
network call** — it stays instant. `MetricCards.jsx` already renders the 2-col grid; no new component.

---

## 5. Honesty & provenance (non-negotiable, mapped to concrete UI)

Per `CORDIS_FEATURE_IDEAS.md:27–87` and the verified constraints:

1. **Real data only.** Every figure comes from `parse_extraction` → `ingest` → Neo4j → the
   `/call-evidence` aggregation. No hardcoded/placeholder values anywhere in `CordisEvidencePanel.jsx`. If
   `data` is null/`projectCount===0`, render the **empty state**, not zeros-as-claims.
2. **EU-funded only; absence ≠ no activity.** The provenance caption reads exactly
   *"Funded projects matching this call's subject (CORDIS, FP7–Horizon Europe)."* Empty state text:
   *"No CORDIS-funded projects recorded on this subject. This does not mean the area is inactive."*
3. **Counts ≠ funding ≠ impact.** "Funded projects" (a count) and "Total EU contribution" (euros) are
   **separate KPI cells** with distinct labels and formatters; top-orgs/top-countries are labelled as
   **participation/registration counts**, never as funding or impact. The framework-spread shows count
   bars with funding as a secondary value, clearly separate.
4. **Subject area, NOT the call's official budget/scope.** The A2 card is visually and textually distinct
   from the call's own budget block ("Key Information", `NodeDetail.js:1185–1201`). The card title is
   **"Funded projects on this subject (CORDIS)"**; a help line states: *"What has been funded in this
   research area across framework programmes — not this call's budget or scope."*
5. **Self-explanatory, no methodology jargon.** No internal query strings, task IDs, or "cluster_3"
   artefacts in the UI; only the human subject (`Call.cordis_area_query`) and plain labels.
6. **Provenance stored on the node.** `cordis_area_query`, `cordis_area_project_count`,
   `cordis_area_link_source` (3a) mirror A1's `cordis_tag_*` convention so the lineage is auditable from
   the graph, and the hover metrics can read counts without a fetch.

---

## 6. Step-by-step

1. **Tagger (3a):** add `ingest_projects` kwarg + `AREA_LINK_LABEL`; after `_projects_for_subject` call
   `CordisGraphBuilder.ingest(projects)` and create `HAS_FUNDED_PROJECT` for each `call_id`; write area
   provenance props; accumulate stats into the return dict.
2. **Routes (3b/3c):** add `GET /cordis/call-evidence`; add `DELETE /cordis/area-links`; add
   `ingest_projects` to `TagCallsPayload` and pass it through `/tag-calls`.
3. **Tagger cleanup helper:** add `clear_area_links()` next to `clear_tags`.
4. **Offline verify (3a/3b logic)** against the real on-disk extraction (§7) — confirm aggregation numbers
   match known truth.
5. **Frontend hook + panel (4a):** `useCordisEvidence.js`, `CordisEvidencePanel.jsx`, optional
   `_cordis-evidence.scss`; mount the card in `NodeDetail.js` after line 1264.
6. **Optional hover (4b):** extend the call metric loop in `useHoveredNodeModel.js:275–293`.
7. **Build** the frontend (§7); update this file's Status.

---

## 7. Verification

**Offline (real data on disk — primary correctness proof).** Use the verified extraction at
`C:\Code\knowledge-graph-app\CORDIS\data\extracted\cybersecurity_pqc_secure_software\cybersecurity_pqc_secure_software_q02\json.zip`
— the same fixture used for backbone/A1 verification (**278 projects, 278 coordinators, 3275 participants,
2 291 unique orgs, 154 research fields, framework programme = HORIZON**, per `00-data-backbone.md:7–14`).
- Run `parse_extraction(<that path>)` → assert 278 projects (no DB needed; parser is pure).
- **Aggregation in isolation:** compute the §3b shape directly from the parsed dicts (group by
  `frameworkProgramme`, `sum(ecContribution)`, org/country participation counts). Assert:
  `projectCount == 278`; `frameworkBreakdown` is `[{fp:"HORIZON", n:278, …}]` (100% HORIZON — proves the
  FP-spread honestly shows single-programme dominance, no fake bars); `topCountries` returns ≥10 distinct
  EU countries; `topOrganisations` returns names **with** role/country. **No hardcoded values** — all from
  parsed dicts. (Larger fixture available for a second check:
  `…\ai_for_health_mental_health_personalised_care\…_q01\json.zip`.)
- **SET/MERGE shape:** run `tag_calls(mode="local", local_path=<that path>, preview=True,
  ingest_projects=True)` to confirm the ingest + `HAS_FUNDED_PROJECT` Cypher is well-formed without
  touching the DB.

**Live end-to-end (user — needs `CORDIS_API_KEY` + Neo4j, neither in the sandbox).**
1. Populate CL3 Call nodes.
2. `POST /cordis/tag-calls {"source":"cluster_3"}` → now also ingests projects and creates area links
   (verify the response dict reports `projects`/`area_links` > 0).
3. `GET /cordis/call-evidence?call_id=<a CL3 call id>` → returns non-zero `projectCount`, `frameworkBreakdown`,
   top orgs/countries.
4. In the app: open that call's detail → the "Funded projects on this subject (CORDIS)" card shows the
   numbers; open a call whose subject has no curated query → **empty state**.

**Frontend build.** `node node_modules/react-scripts/bin/react-scripts.js build` (npx is broken on this
Windows setup, per project memory). Pre-existing warnings are expected; A2 must add none new.

---

## 8. Rollback

- **Data:** `DELETE /cordis/area-links` removes all `HAS_FUNDED_PROJECT` edges + area provenance props,
  leaving A1 tags and ingested projects intact. To also remove ingested projects/orgs:
  `DELETE /cordis/all` (existing). A1 tags revert independently via `DELETE /cordis/tags?source=cluster_3`.
- **Code:** the tagger change is gated by `ingest_projects` (default True) — set it False to restore
  A1-only behaviour without reverting. Delete `GET /cordis/call-evidence` + `DELETE /cordis/area-links`
  handlers; delete `CordisEvidence/` frontend folder; remove the one mount line in `NodeDetail.js` and the
  optional `useHoveredNodeModel.js` push. No schema migration to undo (one new relationship type + node
  props only).

---

## 9. Open decisions (confirm before I implement)

1. **Surfaces:** detail-page card **only** (recommended for v1 — richest, no hover clutter) **or** also the
   1–2 compact hover metrics (4b, reads pre-computed Call props so it's free)?
2. **Subject binding:** tie the panel to the call's **curated subject** (recommended — reuses A1's 44
   reviewed queries, one fetch serves both features) **or** allow a per-call ad-hoc query (more flexible,
   but reintroduces the unreliable auto-query A1 rejected, `01-A1…md:23–47`)?
3. **Calls with no curated query:** show the **empty state** (recommended — honest, consistent with A1
   skipping uncurated subjects) **or** hide the card entirely for those calls?
4. **Gating:** is A2 **gated behind running the (extended) `/tag-calls` ingest job**? Recommended yes — A2
   has data only where A1 has run; until then every call shows the empty state. (Set `ingest_projects=True`
   by default so the next A1 run also lights up A2.)
5. **FP-spread metric:** bars sized by **project count** (recommended — counts ≠ funding stays clean) with
   funding shown as the row value, **or** a count/funding toggle like
   `FundingByProgramme.jsx:19–30`? (A toggle adds UI; v1 recommends count bars + funding label.)
