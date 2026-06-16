# Execution Plan — **B5: Research-field explorer**

> Consumer of the data backbone (`CORDIS_PLANS/00-data-backbone.md`) and of A1/A2's research-field
> classifications + subject-area links. Built on the **same** `HAS_FUNDED_PROJECT` + `CLASSIFIED_AS`
> edges already in Neo4j — **B5 adds no new ingestion, only two new read endpoints + a new frontend
> drawer**. Like B3, it is a **pure read feature**.
> Process: this plan is the review checkpoint required before coding (ideas doc §"mandatory process").
> Status: **IMPLEMENTED & VERIFIED (offline)** on branch `cordis`.
>
> **Placement decision (confirmed with the user):** a **side drawer** over the graph, opened by a new
> sidebar button — the exact pattern of the existing Compare drawer (`createPortal` to `document.body`,
> toggled from `SidebarControls`). Chosen over a full-page route and a dashboard-style view mode because it
> is the lightest-touch, most consistent surface and keeps the user in graph context.
>
> **Built:** (backend) `_field_segments` + pure `_build_field_tree` + `GET /cordis/field-tree` +
> `GET /cordis/field-calls` + `FIELD_TREE_PROVENANCE`/`FIELD_CALLS_PROVENANCE`/`FIELD_CALLS_CAP` in
> `cordis_routes.py` — pure read over the existing `HAS_FUNDED_PROJECT` + `CLASSIFIED_AS` edges; **no new
> ingestion, no tagger/builder/parser change**. (frontend) `GraphPage/CordisFields/{useCordisFieldTree.js,
> useCordisFieldCalls.js, CordisFieldExplorerDrawer.jsx}`, `styles/components/_cordis-fields.scss`
> (+ `main.scss` import); `fieldsOpen` state in `GraphPage.js` drilled to `GraphMainColumn` (renders the
> drawer next to `CompareDrawer`, gated `!isHEWiki`) and `RightControlsColumn → SidebarControls` (a new
> `AccountTreeIcon` toggle button). Calls link to `/node/:id` via the same `getDatasetConfigForId` resolver
> as B3's `CordisRelatedPanel`.
>
> **Verified offline (real extractions, no mocks):** built per-field `{code,title,projectIds,callIds}` rows
> from all 30 on-disk extractions and ran the **real** `_build_field_tree` — roots are the 6 EuroSciVoc top
> domains; `/27` & `/21/41` correctly **synthesised + flagged** (labelled by code, no invented name); AI
> (`/23/47/297`) nests under computer&info (`/23/47`) under natural sciences (`/23`); the **distinct rollup
> is the union, not the sum** of descendants (e.g. `/23` → 36 487 distinct projects, matching the computed
> union and far above the naive child-sum, proving cross-branch overlap is handled honestly); every
> non-synthetic title comes from CORDIS data. Frontend build passes with **no new warnings** (+1.9 kB JS).
>
> **Adversarially reviewed** (3 independent reviewers — backend/Cypher, frontend/React, honesty-guardrail —
> each finding adversarially verified). 2 confirmed defects fixed: (1) **HIGH** — `field-calls` sliced to
> `top_n=50` while `capped` keyed off the 100-cap, silently hiding calls for 51–100-call fields (a "no
> silent caps" violation); fixed to a **single disclosed bound** (`calls` = the DB-`LIMIT` rows;
> `capped = fieldCallCount > returnedCount`; the drawer note now reads "Showing the top N of M calls").
> (2) **LOW (latent)** — a present-but-blank-title field would render as a bare code styled like a real
> name; fixed by treating a blank/whitespace title as synthetic (muted "field group {code}"). One finding
> (unbounded internal id arrays in `/field-tree`) was **rejected** — it is necessary internal aggregation
> that never reaches the client, bounded by ingest size, and breaches no display rule.
>
> **Refinement (user feedback, 2026-06-16) — relevance-ranked calls.** First live look showed the
> per-field call list was too loose: because EuroSciVoc tags each *project* with several broad labels, a
> single broad call (e.g. a quantum-networks or AI-security call) surfaced under many unrelated fields via
> one tangential project, and raw-count ranking did not separate them. Fixed by ranking calls by
> **relevance = the share of a call's classified funded projects that fall in the field**
> (`projectsInField / classifiedProjects`) and **trimming calls below a 20 % floor** as only incidentally
> related — disclosed (`hiddenIncidental`, never silently dropped), with the per-call share shown. New pure
> helper `_rank_field_calls` (offline-tested); `field-calls` now returns one candidate row per touching call
> (in-field + total-classified counts) and the helper ranks/trims/caps. See §3c. *User-chosen behaviour
> (over "rank only, show all" and "primary field only").*
>
> **Remaining (user — needs Neo4j + key):** after A2's `POST /cordis/tag-calls {"source":"cluster_3"}`
> ingest, open the **Research fields** drawer from the sidebar → browse the tree → click a field → its
> calls list (now relevance-ranked, loosely-related trimmed) → click a call → the detail page navigates to
> it. B5 writes nothing, so it has no data-rollback — removing the routes + frontend files fully reverts it.

---

## 0. TL;DR

B5 is a **subject-first way into the graph**: a drawer that lets you **browse the EuroSciVoc research-field
hierarchy** (the EU's standard tree of research fields — *natural sciences → computer & information
sciences → artificial intelligence*) and, for any field, see **how many EU-funded projects** sit under it
and **which Horizon Europe calls** are funded in that field. Click a call → its detail page opens
(`/node/:id`, the same navigation B3 uses). It complements the app's existing **programme-first**
drill-down (Pillar → Programme → Destination → Call) with a **field-first** one.

The data is **already in Neo4j**: the backbone stored
`(:CordisProject {source:"cordis"})-[:CLASSIFIED_AS]->(:ResearchField {code,title})` (EuroSciVoc) and A2
linked `(:Call)-[:HAS_FUNDED_PROJECT]->(:CordisProject)`. The EuroSciVoc **hierarchy is encoded in the
`ResearchField.code`** — a slash-separated path (`/23` = *natural sciences*, `/23/47` = *computer &
information sciences*, `/23/47/297` = *artificial intelligence*). So B5 reconstructs the tree from those
codes and rolls up counts — **no new node/edge/property, nothing hardcoded, no new fetch**.

Two new read endpoints: `GET /cordis/field-tree` (the hierarchy with rolled-up project + call counts) and
`GET /cordis/field-calls?code=…` (the calls under a selected field). One new frontend drawer renders the
tree and the per-field call list.

---

## 1. Goal & exactly what the drawer shows

A drawer titled **"Research fields (CORDIS)"** with two stacked sections:

**(a) The field tree** — a collapsible hierarchy of EuroSciVoc fields. Each row shows:

| Element | Value | Honesty note |
|---|---|---|
| **Field name** | `ResearchField.title` (e.g. *artificial intelligence*) | the official EuroSciVoc field name, straight from CORDIS |
| **Funded projects** | distinct CORDIS projects classified under this field **or any descendant** (rolled up) | a count of EU-funded projects, not funding, not impact |
| **Calls** | distinct app calls with ≥1 funded project under this field (rolled up) | how many calls this field reaches — the navigation payoff |
| **expand/collapse** | ▸/▾ when the field has children | structural only |

Roots are the EuroSciVoc top domains (*medical & health sciences, natural sciences, engineering &
technology, agriculture, social sciences, humanities*). Sorted by funded-project count desc, then name.

**(b) Calls in the selected field** — when a field row is clicked, the section below lists the Horizon
Europe calls funded in that field (rolled up over its subtree), **ranked by relevance** (the share of each
call's classified funded projects that fall in the field), with only-incidentally-related calls (share
below the 20 % floor) trimmed and the trimmed count disclosed. Each row:

| Element | Value |
|---|---|
| **Call name** (link) | links to `/node/:id` — opens the call's detail page (its A2/A6/B3 cards reload) |
| **Subject** | the call's `cordis_area_query` (its CORDIS subject area), muted |
| **Relevance + projects** | `N% · M proj` — `N%` = the share of the call's classified funded projects in this field (drives the ranking); `M` = the count of those in-field projects. Tooltip spells out "M of T classified funded projects" |

**Empty / no data → an honest empty state inside the drawer** (the user opened a tool, so render a message,
not nothing): *"No CORDIS research-field data yet. Run the CORDIS ingest (`/cordis/tag-calls`) to populate
it."* (This differs from A2/A6/B3's *hide-when-empty*, which is correct for auto-rendered per-call cards but
wrong for a user-invoked tool — a button that opens to nothing looks broken.)

**Where it attaches.** A new `fieldsOpen` boolean in `GraphPage.js`, drilled to (1) `GraphMainColumn` which
renders `<CordisFieldExplorerDrawer open={fieldsOpen && !isHEWiki} … />` next to `<CompareDrawer>` inside
`.graph-main`, and (2) `RightControlsColumn → SidebarControls` which adds the toggle button. Gated
`!isHEWiki` exactly like Compare/Timeline (the flat HE-Wiki graph is a separate entity network).

---

## 2. The data — already present, nothing new ingested

B5 reads the exact edges A1/A2 already created, anchored (like A2/A6/B3) on the subject-area link so the
explorer reflects the app's real call landscape:

```
(:Call)-[:HAS_FUNDED_PROJECT]->(:CordisProject {source:"cordis"})-[:CLASSIFIED_AS]->(:ResearchField {source:"cordis"})
```

**The hierarchy is the `ResearchField.code`.** EuroSciVoc codes are slash-separated paths; a code is a child
of its prefix-path. Verified against the real on-disk extractions:

```
/21 medical and health sciences   /23 natural sciences   /25 engineering and technology
/29 social sciences   /31 humanities   (and /27 agriculture, see gaps below)
/23/47 computer and information sciences   →   /23/47/297 artificial intelligence
                                            →   /23/47/295/917 cryptography
```

A field's **funded-project count** = distinct projects classified at its code **or any descendant code**
(rolled up by path prefix). Its **call count** = distinct calls that fund ≥1 of those projects.

**Counts overlap across branches (honest, by design).** A project carries several EuroSciVoc
classifications, often in different domains (e.g. AI *and* electrical engineering), so it is counted under
each. Top-level counts can therefore sum to more than the total project count — this is faithful to the
multi-classification taxonomy, not a bug. The drawer states this plainly.

**Ancestor gaps (verified, handled honestly).** A few intermediate codes are referenced by descendants but
were never classified directly, so they have **no `ResearchField` node/title** — in the offline fixtures
exactly two: `/27` (referenced by 40 descendants) and `/21/41`. B5 **synthesises** these missing ancestors
so the tree stays connected, **without inventing a name**: a synthetic node carries `synthetic:true` and
its **code as its label** (the frontend renders it muted, e.g. *"field group /27"*). We never hardcode the
official EuroSciVoc name for a code absent from our data (honesty rule).

**No new node/edge/property is introduced. B5 inherits A1/A2's honesty guarantees for free**, and is purely
additive read logic — the same posture as B3.

---

## 3. Backend — two new read endpoints + one pure helper

New code in `backend/routes/new_pipeline/cordis/cordis_routes.py`, alongside `/related-calls`.

### 3a. Pure tree builder `_build_field_tree(rows)` (offline-testable, no DB)

Mirrors A6's `_aggregate_call_trend` / B3's `_rank_related_calls`: a pure function over the rows the Cypher
returns, so the hierarchy + rollup logic is unit-tested offline against real parsed data.

```python
def _build_field_tree(rows):
    """Build the EuroSciVoc hierarchy with rolled-up project/call counts from per-field rows. Pure (no DB)
    -> unit-testable offline. ``rows`` = dicts {code,title,projectIds,callIds} (one per ResearchField on the
    Call->project->field path). Hierarchy = the slash-path code; a field's rolled count = distinct ids at it
    OR any descendant. Missing ancestor codes are synthesised (synthetic=true, code as label) so the tree
    stays connected without inventing EuroSciVoc names. Counts overlap across branches by design (a project
    has several classifications)."""
    def segs(code):
        return [s for s in (code or "").split("/") if s]
    def parent_of(code):
        s = segs(code)
        return ("/" + "/".join(s[:-1])) if len(s) > 1 else None

    nodes = {}   # code -> node dict
    def ensure(code, title=None, synthetic=False):
        n = nodes.get(code)
        if n is None:
            n = nodes[code] = {"code": code, "title": title, "synthetic": synthetic,
                               "_proj": set(), "_call": set(), "children": []}
        if title and not n["title"]:
            n["title"], n["synthetic"] = title, False
        return n

    for r in rows:
        code = r.get("code")
        if not code:
            continue
        n = ensure(code, r.get("title"))
        n["_proj"].update(r.get("projectIds") or [])
        n["_call"].update(r.get("callIds") or [])
        # synthesise every missing ancestor on the path
        s = segs(code)
        for i in range(1, len(s)):
            ensure("/" + "/".join(s[:i]), synthetic=True)

    roots = []
    for code, n in nodes.items():
        p = parent_of(code)
        if p and p in nodes:
            nodes[p]["children"].append(n)
        else:
            roots.append(n)

    def rollup(n):
        proj, call = set(n["_proj"]), set(n["_call"])
        for ch in n["children"]:
            cp, cc = rollup(ch)
            proj |= cp; call |= cc
        n["projectCount"], n["callCount"] = len(proj), len(call)
        n["directProjectCount"], n["directCallCount"] = len(n["_proj"]), len(n["_call"])
        return proj, call
    for r in roots:
        rollup(r)

    def shape(n):
        kids = sorted((shape(c) for c in n["children"]),
                      key=lambda x: (-x["projectCount"], (x["title"] or x["code"] or "").lower()))
        return {"code": n["code"], "title": n["title"] or n["code"], "synthetic": n["synthetic"],
                "depth": len(segs(n["code"])),
                "projectCount": n["projectCount"], "callCount": n["callCount"],
                "directProjectCount": n["directProjectCount"], "directCallCount": n["directCallCount"],
                "children": kids}
    return sorted((shape(r) for r in roots),
                  key=lambda x: (-x["projectCount"], (x["title"] or x["code"] or "").lower()))
```

### 3b. `GET /cordis/field-tree`

One scalar-grouped query (group by the field node) returning each field's distinct project + call ids on
the Call path; the pure builder does the hierarchy + rollup.

```python
FIELD_TREE_PROVENANCE = ("EuroSciVoc research fields of CORDIS-funded projects linked to Horizon Europe "
                         "calls (CORDIS, FP7-Horizon Europe). A project can sit in several fields, so "
                         "counts overlap across branches.")

@router.get("/field-tree")
def field_tree():
    """B5 research-field explorer: the EuroSciVoc field hierarchy with rolled-up funded-project and call
    counts. Returns an empty tree when no CORDIS field data is linked to calls (drives the drawer's empty
    state). Honest framing: counts are EU-funded participation, not scientific quality or impact."""
    try:
        s = SOURCE_TAG
        rows = db.query(
            "MATCH (c:Call)-[:HAS_FUNDED_PROJECT]->(pr:CordisProject {source:$s})"
            "-[:CLASSIFIED_AS]->(rf:ResearchField {source:$s}) "
            "WITH rf, collect(DISTINCT pr.id) AS projectIds, collect(DISTINCT c.id) AS callIds "
            "RETURN rf.code AS code, rf.title AS title, projectIds, callIds",
            {"s": s},
        )
        totals = db.query(
            "MATCH (c:Call)-[:HAS_FUNDED_PROJECT]->(pr:CordisProject {source:$s}) "
            "RETURN count(DISTINCT pr) AS projects, count(DISTINCT c) AS calls",
            {"s": s},
        )
        t = totals[0] if totals else {}
        return {
            "tree": _build_field_tree(rows),
            "totalProjects": (t.get("projects") or 0),
            "totalCalls": (t.get("calls") or 0),
            "fieldCount": len(rows),
            "provenance": FIELD_TREE_PROVENANCE,
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"CORDIS field-tree failed: {str(e)}")
```

### 3c. `GET /cordis/field-calls?code=…`

The calls under a selected field, rolled up over its subtree via path-prefix matching (`= code` OR
`STARTS WITH code + "/"` — the trailing slash prevents sibling-prefix collisions).

**Relevance ranking + a trim floor (user-feedback refinement).** EuroSciVoc tags each *project* with several
broad labels, so listing every call that has ≥1 funded project in a field — ranked by raw project count —
let broad calls (a quantum-networks call, an AI-security call) leak into many unrelated fields through a
single tangential project (the user saw exactly this). Fix: rank by **relevance = share** — for each call,
`projectsInField / classifiedFundedProjects` — i.e. *what fraction of the call's classified research sits in
this field*. Calls below `FIELD_CALLS_RELEVANCE_FLOOR` (0.2) are trimmed as incidental and **disclosed** via
`hiddenIncidental` (never silently dropped); the per-call `share` is returned so the drawer can show it. The
ranking/trim/cap is done in the **pure** `_rank_field_calls` helper (offline-testable, like
`_build_field_tree`); the Cypher only produces one small candidate row per touching call carrying the
in-field count **and** the call's total classified-project count (the relevance denominator).

**Single disclosed cap (kept from the prior review fix).** Two *distinct* disclosures: `hiddenIncidental`
(below the relevance floor) and `capped` (relevant set exceeds `FIELD_CALLS_CAP`). `capped` is keyed off the
relevant-call count, not the raw total, so the cap note always matches what was rendered.

```python
FIELD_CALLS_PROVENANCE = ("Horizon Europe calls whose CORDIS-funded projects are classified in this "
                          "research field (CORDIS, FP7-Horizon Europe)")
FIELD_CALLS_CAP = 100
FIELD_CALLS_RELEVANCE_FLOOR = 0.2   # a call is relevant when >= this share of its classified projects are here

def _rank_field_calls(rows, floor=FIELD_CALLS_RELEVANCE_FLOOR, cap=FIELD_CALLS_CAP):
    """Pure: rank a field's candidate calls by relevance (share = projectCount/callProjectCount), trim
    below `floor`, sort by share desc -> in-field count -> name, cap. Returns (calls, relevant_count,
    hidden_incidental). Offline-testable, no DB — like _build_field_tree / _aggregate_call_trend."""
    enriched = []
    for r in rows:
        total = r.get("callProjectCount") or 0
        in_field = r.get("projectCount") or 0
        share = (in_field / total) if total > 0 else 0.0
        enriched.append({**r, "share": share})
    relevant = [r for r in enriched if r["share"] >= floor]
    hidden_incidental = len(enriched) - len(relevant)
    relevant.sort(key=lambda r: (-r["share"], -(r.get("projectCount") or 0), (r.get("name") or "").lower()))
    return relevant[:cap], len(relevant), hidden_incidental

@router.get("/field-calls")
def field_calls(code: str):
    """B5: Horizon Europe calls funded in a selected EuroSciVoc research field (rolled up over the subtree by
    code prefix), RANKED BY RELEVANCE (share of the call's classified funded projects in the field) with
    incidental calls (< floor) trimmed + disclosed via hiddenIncidental, the rest capped at FIELD_CALLS_CAP."""
    try:
        s = SOURCE_TAG
        prefix = (code or "").rstrip("/") + "/"
        title_row = db.query(
            "MATCH (rf:ResearchField {code:$code, source:$s}) RETURN rf.title AS title",
            {"code": code, "s": s},
        )
        head = db.query(
            "MATCH (c:Call)-[:HAS_FUNDED_PROJECT]->(pr:CordisProject {source:$s})"
            "-[:CLASSIFIED_AS]->(rf:ResearchField {source:$s}) "
            "WHERE rf.code = $code OR rf.code STARTS WITH $prefix "
            "RETURN count(DISTINCT pr) AS projects",
            {"code": code, "prefix": prefix, "s": s},
        )
        # One row per touching call: in-field count + the call's total classified-project count (denominator).
        rows = db.query(
            "MATCH (c:Call)-[:HAS_FUNDED_PROJECT]->(pr:CordisProject {source:$s})"
            "-[:CLASSIFIED_AS]->(rf:ResearchField {source:$s}) "
            "WHERE rf.code = $code OR rf.code STARTS WITH $prefix "
            "WITH c, count(DISTINCT pr) AS inField "
            "MATCH (c)-[:HAS_FUNDED_PROJECT]->(pr2:CordisProject {source:$s})"
            "-[:CLASSIFIED_AS]->(:ResearchField {source:$s}) "
            "WITH c, inField, count(DISTINCT pr2) AS total "
            "RETURN c.id AS id, c.name AS name, c.call_id AS callId, c.identifier AS identifier, "
            "       c.cordis_area_query AS subject, inField AS projectCount, total AS callProjectCount",
            {"code": code, "prefix": prefix, "s": s},
        )
        h = head[0] if head else {}
        calls, relevant_count, hidden_incidental = _rank_field_calls(rows)
        return {
            "code": code,
            "title": (title_row[0]["title"] if title_row else None),
            "fieldProjectCount": (h.get("projects") or 0),
            "fieldCallCount": len(rows),
            "relevantCallCount": relevant_count,
            "calls": calls,
            "returnedCount": len(calls),
            "hiddenIncidental": hidden_incidental,
            "relevanceFloor": FIELD_CALLS_RELEVANCE_FLOOR,
            "cap": FIELD_CALLS_CAP,
            "capped": relevant_count > len(calls),
            "provenance": FIELD_CALLS_PROVENANCE,
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"CORDIS field-calls failed: {str(e)}")
```

Cypher notes: scalar-grouped aggregations only (group by a node, never a computed list) — consistent with
`/call-evidence`/`/call-trend`/`/related-calls`. `count(DISTINCT …)` throughout. All `ResearchField`
matches gated on `{source:"cordis"}` (consistency with `/stats`). The candidate set is one small row per
touching call (bounded by the ingested call set); relevance ranking, the 20 % trim, and the
`FIELD_CALLS_CAP` cap are applied in `_rank_field_calls`, with both bounds disclosed.

---

## 4. Frontend — new drawer (Compare pattern), two hooks, one stylesheet

New folder `frontend/src/components/GraphPage/CordisFields/`.

### 4a. `useCordisFieldTree.js` — fetch the hierarchy once

Mirrors `useCordisRelated.js` (module-level cache + request-race guard) but **no id arg** — one fetch of
`GET /cordis/field-tree`, cached under a constant key. `{ loading, data, error }`.

### 4b. `useCordisFieldCalls.js` — fetch calls for the selected field

Mirrors `useCordisRelated.js` keyed by the field `code`: `GET /cordis/field-calls?code=<code>`, per-code
`Map` cache, race guard. `{ loading, data, error }`. No-op when `code` is null.

### 4c. `CordisFieldExplorerDrawer.jsx`

`createPortal` to `document.body`, same shell as `CompareDrawer` (`.cordis-fields-drawer` header with icon
+ title + close button). Internal state: `expanded` (Set of open field codes) and `selectedCode`. Blocks:

- **Header** — `AccountTreeIcon` + **"Research fields (CORDIS)"** + close button (`onClose`).
- **Hint** — *"Browse EU-funded research fields (EuroSciVoc) and the Horizon Europe calls funded in each.
  A project can sit in several fields, so counts overlap across branches. These are EU-funded participation
  counts — not scientific quality or impact."*
- **Tree** (`.cordis-fields__tree`, scrollable): a recursive `FieldRow` — indent by `depth`, ▸/▾ toggle when
  `children.length`, the title (synthetic → muted, shows the code), and a right-aligned count cell
  `N proj · M calls`. Clicking the label selects the field (sets `selectedCode`); clicking the toggle
  expands/collapses. Top two domains expanded by default for orientation.
- **Calls section** (`.cordis-fields__calls`): when `selectedCode` set → header *"Calls in {title}"* +
  *"most relevant first"*, then the **relevance-ranked** call list. Each call: a router `<Link>` to
  `/node/:id` (reusing `getDatasetConfigForId(c.id).graphName` + `localStorage.graphName`, exactly as
  `CordisRelatedPanel`), its subject (muted), and a right cell `N% · M proj` (relevance share + in-field
  project count, tooltip "M of T classified funded projects"). Below the list a disclosure line combines the
  `hiddenIncidental` trim ("N loosely-related calls hidden (under 20 % …)") and the `capped` note. A field
  that has touching calls but none above the floor shows a distinct honest message (not the empty state).
- **Empty state** — when the tree fetch returns an empty `tree` (or errors): the honest message in §1(b).
- **Provenance** — `data.provenance` (muted footer).

Navigation, dataset resolution, and the API base URL all reuse the **exact** B3 mechanisms (no new
id→graph logic, no new fetch plumbing).

### 4d. `_cordis-fields.scss` (+ `main.scss` import)

New partial imported in `styles/main/main.scss` next to `cordis-related` (`:32`). Reuses the
`.compare-drawer` geometry (fixed, right-anchored, `createPortal`) and CSS vars (`--card`, `--border`,
`--foreground-muted`, `--muted`) for dark/light. B5-specific classes only: tree rows + indent + toggle,
count cell, the calls list/link/subject, synthetic-node muting, hint/empty/provenance captions. Drawer is a
bit wider than Compare (≈460px) to fit the tree; the tree area scrolls independently.

### 4e. Wiring (state drilled exactly like `compareOpen`)

- `GraphPage.js`: add `const [fieldsOpen, setFieldsOpen] = useState(false);`. In the `graphName` effect, add
  `if (graphName === "HE_2025") setFieldsOpen(false);` (mirrors the Compare reset). Pass
  `fieldsOpen`/`setFieldsOpen` to `GraphMainColumn` and `RightControlsColumn`.
- `GraphMainColumn.jsx`: accept the two props; render `<CordisFieldExplorerDrawer open={fieldsOpen && !isHEWiki}
  onClose={() => setFieldsOpen(false)} />` inside `.graph-main`, next to `<CompareDrawer>`.
- `RightControlsColumn.jsx`: pass the two props through to `SidebarControls`.
- `SidebarControls.jsx`: inside the `!isHEWiki` block, add a `Tooltip`+`IconButton` (`AccountTreeIcon`,
  title *"Browse research fields"*) toggling `fieldsOpen`, with the `--active` class when open — same shape
  as the Compare button.

---

## 5. Honesty & provenance (mapped to concrete UI)

1. **Real data only.** Every field, count, and call comes from `CLASSIFIED_AS`/`HAS_FUNDED_PROJECT` in Neo4j
   via `/field-tree` + `/field-calls`. No hardcoded vocabulary, counts, or rows; empty data → the honest
   empty state, never fabricated nodes.
2. **No invented field names.** Synthetic ancestor nodes (gap codes) show their **code**, flagged
   `synthetic`, never a guessed EuroSciVoc name.
3. **Counts ≠ funding ≠ impact.** "Funded projects" and "Calls" are distinct, labelled counts; the hint
   states they are EU-funded participation, not quality or impact ("most funded" ≠ "best", per the doc).
4. **Counts overlap across branches** — stated in the hint, because a project has several classifications.
5. **EU-funded only; absence ≠ no activity.** The provenance caption names CORDIS / FP7–Horizon Europe.
   Fields/calls with no CORDIS data simply don't appear.
6. **No silent caps, no silent filtering.** `field-calls` has two *disclosed* reductions, never silent:
   (a) calls below the 20 % relevance floor are reported via `hiddenIncidental` ("N loosely-related calls
   hidden (under 20 % …)"), and (b) the `FIELD_CALLS_CAP` cap is reported via `capped`/`relevantCallCount`
   ("top N of M relevant calls"). The per-call `share` is shown so the user sees *why* a call ranks where it
   does and can judge the trim; relevance is the share of the call's EU-funded participation in the field —
   still participation, not quality or impact.
7. **No methodology jargon.** Only plain EuroSciVoc field titles and the human subject — no query strings,
   task IDs, or `cluster_3` artefacts in the UI.

---

## 6. Step-by-step

1. **Backend (3):** add `_build_field_tree` (pure) + `GET /cordis/field-tree` + `GET /cordis/field-calls` +
   the three provenance/cap constants to `cordis_routes.py`. No tagger/builder/parser change.
2. **Offline verify (3a, §7):** build the field-tree rows from the real extractions, run the **real**
   `_build_field_tree`, and assert the hierarchy/rollup/synthetic-node behaviour. `py_compile` the module.
3. **Frontend (4a–4d):** `useCordisFieldTree.js`, `useCordisFieldCalls.js`, `CordisFieldExplorerDrawer.jsx`,
   `_cordis-fields.scss` + `main.scss` import.
4. **Wiring (4e):** `fieldsOpen` state in `GraphPage.js`; drill through `GraphMainColumn` (render) +
   `RightControlsColumn` → `SidebarControls` (button).
5. **Build** the frontend; adversarial review; update this file's Status to *Implemented & Verified
   (offline)*.

---

## 7. Verification

**Offline (real data on disk — primary correctness proof).** Using the extractions under
`C:\Code\knowledge-graph-app\CORDIS\data\extracted\…`:
- Parse every extraction, build per-field `{code, title, projectIds, callIds}` rows exactly as the
  `/field-tree` Cypher returns them (callIds simulated by the extraction subject so the rollup has both
  measures), and run the **real** `_build_field_tree`.
- Assert: roots are the EuroSciVoc top domains (`/21,/23,/25,/27,/29,/31`); `/27` is **synthetic** (no
  title in the data) while `/23`,`/25` etc. carry real titles; *artificial intelligence* (`/23/47/297`)
  nests under *computer and information sciences* (`/23/47`) under *natural sciences* (`/23`); a parent's
  rolled `projectCount` ≥ each child's and ≥ its own `directProjectCount`; the rollup is **distinct** (a
  parent's count is the size of the union, not the sum, of its descendants' project sets); titles are real
  EuroSciVoc names. **No hardcoded values** — all derived from parsed dicts.
- Confirm the `field-calls` prefix logic in isolation: a code's subtree = exact code + `code + "/"` prefix,
  with the trailing slash excluding sibling-prefix codes (`/23/47/297` must not match `/23/47/2970`).
- **Relevance ranking (`_rank_field_calls`, extracted-source test — passed).** Ran the **real** helper
  source against the user's leakage scenario + edge cases: the broad calls (the AI-security / quantum
  examples, ~4–6 % share) are trimmed below the 0.2 floor while the genuine calls rank by share desc; the
  floor is inclusive (share == 0.2 kept, 0.19 dropped); ties break by in-field count then name; the cap
  returns ≤ `cap` while `relevant_count` reports the full above-floor set; `total == 0` and empty input are
  safe. All assertions pass — no hardcoded data, share derived from the row counts.

**Live end-to-end (user — needs `CORDIS_API_KEY` + Neo4j).**
1. After A2's `POST /cordis/tag-calls {"source":"cluster_3"}` ingest, `GET /cordis/field-tree` →
   non-empty tree with rolled-up counts; `GET /cordis/field-calls?code=/23/47/297` → the AI calls with
   per-call project counts.
2. In the app: open the **Research fields** drawer from the sidebar → browse the tree → click a field →
   its calls list → click a call → the detail page navigates to it (its CORDIS cards reload). No data →
   the empty state.

**Frontend build.** `node node_modules/react-scripts/bin/react-scripts.js build` (npx is broken on this
Windows setup, per project memory). Pre-existing warnings expected; B5 must add none new.

---

## 8. Rollback

- **Code only — B5 writes no data.** Delete the `GET /cordis/field-tree` + `GET /cordis/field-calls`
  handlers + `_build_field_tree` + the constants; delete the `CordisFields/` frontend folder +
  `_cordis-fields.scss`; remove the `main.scss` import and the `fieldsOpen` wiring in `GraphPage.js`,
  `GraphMainColumn.jsx`, `RightControlsColumn.jsx`, `SidebarControls.jsx`. No schema/data migration to undo
  (B5 introduces no nodes, edges, or properties).

---

## 9. Decisions (recommended defaults applied; flagged for review)

1. **Placement:** **side drawer (Compare pattern)** — *confirmed with the user* over a full-page route and a
   dashboard-style view mode.
2. **Hierarchy source:** **reconstructed from `ResearchField.code` slash-paths** (applied — the codes ARE
   the EuroSciVoc hierarchy; no external taxonomy file, nothing hardcoded) vs. a separate ingested
   parent-child edge (rejected — needless ingestion; B5 stays a pure read like B3).
3. **Rollup:** **distinct project/call sets rolled up by code prefix** (applied — honest "under this field"
   counts) vs. direct-only counts (rejected — a top domain would show ~0, defeating the browse).
4. **Project/call anchor:** **the `HAS_FUNDED_PROJECT` Call path** (applied — consistent with A2/A6/B3; the
   navigable landscape) vs. all CORDIS projects regardless of call link (rejected — unreachable dead-ends in
   a "way into the graph"; in normal ingests every project is call-linked anyway).
5. **Empty behaviour:** **honest empty state inside the drawer** (applied — a user-invoked tool must not
   open to nothing) vs. hide-when-empty (rejected here — correct for auto-rendered per-call cards, wrong for
   a button).
6. **Gap ancestors:** **synthesise with the code as label + `synthetic` flag** (applied — connected tree, no
   invented names) vs. graft orphans to roots (rejected — breaks the clean domain layer).
7. **Candidate bound:** **cap `field-calls` at 100, disclosed by `capped`/`relevantCallCount`** (applied —
   the cap note always matches the rendered list; the earlier two-bound draft that could silently drop
   51–100-call fields was a review finding, fixed).
8. **Call relevance (user-feedback refinement):** **rank by share + trim below a 20 % floor, disclosed via
   `hiddenIncidental`** (applied — *user-chosen* over "rank by share, show all" and "primary-field only").
   Share = `projectsInField / classifiedFundedProjects` is the honest, explainable signal: it separates the
   calls a field is genuinely about from those that touch it via one of EuroSciVoc's many broad
   per-project labels. The 0.2 floor and per-call share are surfaced so the trim is transparent, not opaque.
