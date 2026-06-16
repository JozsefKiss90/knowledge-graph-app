# Execution Plan — **B3: Related-calls explorer**

> Consumer of the data backbone (`CORDIS_PLANS/00-data-backbone.md`) and of A1's research-field
> classifications + A2's subject-area links (`CORDIS_PLANS/01-A1…`, `02-A2…`). Built on the **same**
> `HAS_FUNDED_PROJECT` + `CLASSIFIED_AS` edges already in Neo4j — **B3 adds no new ingestion, only a new
> read endpoint + a new frontend card**.
> Process: this plan is the review checkpoint required before coding (ideas doc §"mandatory process").
> Status: **IMPLEMENTED & VERIFIED (offline)** on branch `cordis`.
>
> **Built:** (backend) `GET /cordis/related-calls` in `cordis_routes.py` — a pure read endpoint
> (`_rank_related_calls` helper + the route + `RELATED_PROVENANCE`/`RELATED_CANDIDATE_CAP`) over the
> existing `HAS_FUNDED_PROJECT` + `CLASSIFIED_AS` edges; **no new ingestion, no tagger/builder/parser
> change**. (frontend) `GraphPage/CordisEvidence/{useCordisRelated.js, CordisRelatedPanel.jsx}`,
> `styles/components/_cordis-related.scss` (+ `main.scss` import), mounted in `NodeDetail.js` after
> `CordisTrendPanel`, gated on `viewModel.kind==="call"`. Each related call links to `/node/:id` via the
> same React-Router mechanism as `NodeConnections`, reusing the exported `getDatasetConfigForId` resolver.
>
> **Verified offline (real extractions, no mocks):** built each curated subject's distinct EuroSciVoc
> field set from `parse_extraction`, synthesised the candidate rows the Cypher returns, and ran the **real**
> `_rank_related_calls` — Jaccard scores exact, sorted desc, zero-overlap dropped, name tie-break correct;
> for target *trustworthy/sovereign AI* the top related are the AI-cluster subjects (AI-for-health 0.64,
> data-spaces 0.56, research-automation 0.56) and **quantum software** ranks last (0.20). Frontend build
> passes with **no new warnings**.
>
> **Adversarially reviewed** (2 independent reviewers: backend/Cypher + frontend/navigation) — no
> critical/high/medium defects. Applied the low/nit findings: `ResearchField` matches gated on
> `{source:"cordis"}` (consistency with `/stats`); added a `capped` disclosure flag to the response
> (the cap orders by raw shared count before the Jaccard re-rank); cross-theme bar-track colour
> (`var(--muted)`); corrected a misleading SCSS comment.
>
> **Remaining (user — needs Neo4j + key):** after A2's `POST /cordis/tag-calls {"source":"cluster_3"}`
> ingest, open a CL3 call → the "Related calls (CORDIS)" card lists related calls with shared-field chips;
> click one → the detail page navigates to it (and its CORDIS cards reload). B3 writes nothing, so it has
> no data-rollback — removing the route + frontend files fully reverts it.
>
> Decisions applied (recommended defaults, see §9): relatedness = **Jaccard overlap of the distinct
> EuroSciVoc research fields** of the two calls' funded projects (faithful to the doc's "EuroSciVoc
> overlap between calls") · separate **"Related calls"** card after the A6 trend panel · hide-when-empty
> (same gate as A2/A6) · each related call is a **clickable link that navigates to its detail page**
> (`/node/:id`, mirroring `NodeConnections`) · shared research fields shown as chips · ranking shown as a
> subtle overlap bar — **honest: this is research-field overlap of funded projects, not call similarity,
> quality, or impact**.

---

## 0. TL;DR

From a call on screen, B3 shows **"more calls like this"**: other Horizon Europe calls whose funded
projects sit in the **same EuroSciVoc research fields**. Each related call is listed with the **shared
research fields** (chips), a shared-field count, and a one-click **jump to that call's detail page**. It
turns the app's programme-first drill-down into a **subject-adjacency** path between calls.

The data is **already in Neo4j**: the backbone stored `(:CordisProject)-[:CLASSIFIED_AS]->(:ResearchField)`
(EuroSciVoc) and A2 linked `(:Call)-[:HAS_FUNDED_PROJECT]->(:CordisProject)`. So B3 is a **pure read
feature**: one aggregation endpoint `GET /cordis/related-calls?call_id=…` that computes the field overlap
between calls, and one frontend card that lists the results and links to them. No backbone/tagger/builder
change, no new ingestion, nothing hardcoded.

---

## 1. Goal & exactly what the card shows

For the call open in the detail page, render a **"Related calls (CORDIS)"** card showing a ranked list
(top ~6) of other calls that share research fields with this call's funded projects. Each row:

| Element | Value | Honesty note |
|---|---|---|
| **Call name** (link) | the related call's `name`, linking to `/node/:id` | navigation, not a recommendation |
| **Subject** | the related call's `cordis_area_query` (its CORDIS subject area) | plain subject, no jargon |
| **Shared research fields** | the EuroSciVoc field titles in common (chips, up to ~5 + "+k more") | the actual basis of the link |
| **Overlap** | `sharedCount` shared fields + a thin bar sized by the Jaccard score | a structural overlap measure, **not** similarity/quality |

Plus a header hint and a provenance caption. **Empty/`projectCount===0` or no related calls → the card is
hidden** (same gate as A2/A6 — never an empty card, never fabricated rows).

**Where it attaches.** `frontend/src/components/NodeDetail.js`, **immediately after** the A6
`CordisTrendPanel` mount (`NodeDetail.js:1268–1273`), inside the same `viewModel.kind === "call"` block,
with the same `callId={nodeData.id || id}` identity used by A2/A6.

**Honest framing.** This is **research-field overlap of EU-funded projects**, i.e. two areas have been
funded in the same EuroSciVoc fields — it is **not** a claim that the calls are equivalent, of similar
quality, or that one is a substitute for another. The header says so plainly.

---

## 2. The data — already present, nothing new ingested

B3 reads the exact edges A1/A2 already created:

```
(:Call)-[:HAS_FUNDED_PROJECT]->(:CordisProject {source:"cordis"})-[:CLASSIFIED_AS]->(:ResearchField)
```

A call's **research-field set** = the distinct `ResearchField` nodes reachable from it through its funded
projects (`ResearchField.code` = the EuroSciVoc hierarchical path = the identity; `ResearchField.title` =
the human field name, used for the chips). The relatedness of call **A** and call **B** is the **Jaccard
overlap** of their field-code sets:

```
score(A,B) = |fields(A) ∩ fields(B)| / |fields(A) ∪ fields(B)|
```

**Verified against the real on-disk extractions** (the EuroSciVoc data B3 actually uses). Building each
curated subject's distinct field set from its extraction and computing pairwise Jaccard yields an
intuitive, defensible adjacency — e.g. for **trustworthy/sovereign AI**: AI-for-health **0.64**, data
spaces/digital twins **0.56**, research-automation/AI-for-science **0.56**, cybersecurity **0.26**,
quantum software **0.20** (quantum is the consistent outlier across all subjects, ~0.15–0.20). This proves
the metric ranks genuinely related areas above unrelated ones, **from real EuroSciVoc classifications, no
fabrication**.

Note on granularity: A2 links **every call on a curated subject** to the **same** project set, so calls on
the *same* subject share an identical field set (Jaccard 1.0) and rank highest ("the same area, other
calls"); calls on *different* subjects rank by genuine field overlap ("adjacent areas"). Both are useful
"more calls like this." B3 cannot relate calls with no CORDIS data (no `HAS_FUNDED_PROJECT`) — those simply
don't appear, consistent with A2/A6.

No new node/edge/property is introduced. B3 inherits A1/A2's honesty guarantees for free.

---

## 3. Backend — one new read endpoint

New route in `backend/routes/new_pipeline/cordis/cordis_routes.py`, alongside `/call-evidence` and
`/call-trend`. Two queries (target field count; candidate calls with shared/own field counts + shared
titles) + a **pure** Python ranking helper `_rank_related_calls` (offline-testable, mirroring A6's
`_aggregate_call_trend`).

```python
RELATED_PROVENANCE = ("Calls whose CORDIS-funded projects share EuroSciVoc research fields with this call "
                      "(CORDIS, FP7-Horizon Europe)")
RELATED_CANDIDATE_CAP = 100   # bound the candidate set (ordered by shared-field count) before ranking


def _rank_related_calls(rows, target_field_count, top_n):
    """Rank candidate calls by Jaccard overlap of EuroSciVoc field sets. Pure (no DB) → unit-testable
    offline. ``rows`` = dicts {id,name,callId,identifier,subject,subjectProjectCount,shared,oN,sharedTitles}
    exactly as the Cypher returns them (one per candidate call). ``shared`` = |A∩B|, ``oN`` = |fields(B)|,
    target_field_count = |fields(A)|. Jaccard = shared / (|A| + |B| - shared)."""
    out = []
    for r in rows:
        shared = r.get("shared") or 0
        if shared <= 0:
            continue
        oN = r.get("oN") or 0
        union = target_field_count + oN - shared
        score = (shared / union) if union > 0 else 0.0
        out.append({
            "id": r.get("id"),
            "name": r.get("name") or r.get("callId") or r.get("identifier") or r.get("id"),
            "callId": r.get("callId"),
            "identifier": r.get("identifier"),
            "subject": r.get("subject"),
            "subjectProjectCount": r.get("subjectProjectCount") or 0,
            "sharedCount": shared,
            "sharedFields": (r.get("sharedTitles") or [])[:12],
            "score": round(score, 4),
        })
    out.sort(key=lambda x: (-x["score"], -x["sharedCount"], (x["name"] or "").lower()))
    return out[:top_n]


@router.get("/related-calls")
def related_calls(call_id: str, top_n: int = 6):
    """B3 related-calls explorer: other calls whose CORDIS-funded projects share EuroSciVoc research
    fields with this call. Ranked by Jaccard field overlap. Returns [] when the call has no CORDIS
    research fields or no overlapping calls (drives the frontend hide-when-empty)."""
    try:
        s = SOURCE_TAG
        tgt = db.query(
            "MATCH (c:Call {id:$cid})-[:HAS_FUNDED_PROJECT]->(:CordisProject {source:$s})"
            "-[:CLASSIFIED_AS]->(rf:ResearchField) "
            "RETURN count(DISTINCT rf) AS cN, head(collect(c.cordis_area_query)) AS subject",
            {"cid": call_id, "s": s},
        )
        target_field_count = (tgt[0]["cN"] if tgt else 0) or 0
        subject = tgt[0]["subject"] if tgt else None
        rows = []
        if target_field_count > 0:
            # Pass 1 — candidate calls sharing >=1 research field, with shared count + titles. Grouped by
            # the candidate node only (scalar key), capped by raw shared count.
            rows = db.query(
                "MATCH (c:Call {id:$cid})-[:HAS_FUNDED_PROJECT]->(:CordisProject {source:$s})"
                "-[:CLASSIFIED_AS]->(rf:ResearchField) "
                "WITH collect(DISTINCT rf) AS tfs "
                "UNWIND tfs AS rf "
                "MATCH (rf)<-[:CLASSIFIED_AS]-(:CordisProject {source:$s})"
                "<-[:HAS_FUNDED_PROJECT]-(o:Call) "
                "WHERE o.id <> $cid "
                "WITH o, count(DISTINCT rf) AS shared, collect(DISTINCT rf.title) AS sharedTitles "
                "ORDER BY shared DESC LIMIT $cap "
                "RETURN o.id AS id, o.name AS name, o.call_id AS callId, o.identifier AS identifier, "
                "       o.cordis_area_query AS subject, "
                "       o.cordis_area_project_count AS subjectProjectCount, shared, sharedTitles",
                {"cid": call_id, "s": s, "cap": RELATED_CANDIDATE_CAP},
            )
            # Pass 2 — each candidate's OWN distinct research-field count (the Jaccard union term),
            # grouped by o.id (scalar). Merged into the pass-1 rows by id.
            ids = [r["id"] for r in rows if r.get("id")]
            if ids:
                counts = db.query(
                    "MATCH (o:Call)-[:HAS_FUNDED_PROJECT]->(:CordisProject {source:$s})"
                    "-[:CLASSIFIED_AS]->(orf:ResearchField) WHERE o.id IN $ids "
                    "RETURN o.id AS id, count(DISTINCT orf) AS oN",
                    {"ids": ids, "s": s},
                )
                on_by_id = {c["id"]: c["oN"] for c in counts}
                for r in rows:
                    r["oN"] = on_by_id.get(r["id"], 0)
        related = _rank_related_calls(rows, target_field_count, top_n)
        return {
            "call_id": call_id,
            "subject": subject,
            "targetFieldCount": target_field_count,
            "candidatesConsidered": len(rows),
            "candidateCap": RELATED_CANDIDATE_CAP,
            "related": related,
            "provenance": RELATED_PROVENANCE,
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"CORDIS related-calls failed: {str(e)}")
```

**Exact response shape the frontend consumes:**

```json
{
  "call_id": "HORIZON-CL3-...-id",
  "subject": "Post-quantum cryptography for secure software",
  "targetFieldCount": 134,
  "candidatesConsidered": 37,
  "candidateCap": 100,
  "capped": false,
  "related": [
    {
      "id": "HORIZON-CL3-2026-...-other",
      "name": "Secure-by-design digital systems",
      "callId": "HORIZON-CL3-2026-01-...",
      "identifier": "HORIZON-CL3-2026-01-...",
      "subject": "Secure software supply chains",
      "subjectProjectCount": 211,
      "sharedCount": 71,
      "sharedFields": ["cryptography", "computer security", "artificial intelligence"],
      "score": 0.41
    }
  ],
  "provenance": "Calls whose CORDIS-funded projects share EuroSciVoc research fields with this call (CORDIS, FP7-Horizon Europe)"
}
```

Cypher notes: **two scalar-grouped passes** (every aggregation groups by a node or `id`, never by a
computed list) keep the queries unambiguously valid. Pass 1 is **bounded** — it pre-orders candidates by
raw shared-field count and caps at `RELATED_CANDIDATE_CAP` (100) before the Jaccard re-rank, so one
ubiquitous field can't make it unbounded; pass 2 fetches the capped candidates' own field counts by id.
`candidatesConsidered` / `candidateCap` are returned so the cap is **never silent**. `count(DISTINCT …)`
is used throughout (consistent with `/call-evidence`, `/call-trend`). The Jaccard formula + sort + final
`top_n` slice live in the pure `_rank_related_calls` (verifiable offline against real field sets).

---

## 4. Frontend

### 4a. Fetch hook — `GraphPage/CordisEvidence/useCordisRelated.js`

Mirror `useCordisTrend.js` / `useCordisEvidence.js` exactly (per-`call_id` `Map` cache, request-race
guard): `GET /cordis/related-calls?call_id=<id>` → `{ loading, data, error }`. Placed in the existing
`CordisEvidence/` folder with the other CORDIS detail hooks.

### 4b. Card — `GraphPage/CordisEvidence/CordisRelatedPanel.jsx`

Mirrors the A2/A6 `nd-card` markup and hide-when-empty contract (`return null` when `!callId`, `loading`,
`!data`, or `data.related.length === 0`). Sub-blocks:

- **Header** `nd-card-header` → title **"Related calls (CORDIS)"**.
- **Hint** (`cordis-related__hint`): *"Other calls whose EU-funded projects sit in the same research
  fields (EuroSciVoc) as this one — a path to adjacent areas. This is field overlap of funded projects,
  not a measure of similarity, quality, or substitutability."*
- **Related list** (`cordis-related__list`): one row per related call —
  - the call **name** as a router `<Link>` to `/node/:id` (see 4c);
  - its **subject** line (muted);
  - **shared-field chips** (up to 5 from `sharedFields`, then `+k more`);
  - a right-aligned **overlap** cell: `sharedCount` + a thin bar (`cordis-related__bar-fill`) whose width
    = `score` relative to the top row's score (so the strongest match fills the bar), with the score as a
    `title`/tooltip. Counts and the overlap measure are distinct, labelled values.
- **Provenance** (`cordis-related__prov`): `data.provenance` + `— "{subject}"`.

### 4c. Navigation — jump to the related call (reuse the canonical resolver)

Each related call links to its detail page exactly as `NodeConnections` does (`NodeConnections.js:350–358`):

```jsx
import { Link } from "react-router-dom";
import { getDatasetConfigForId } from "../../NodeDetalParts/useNodeDetail"; // already exported

const graphName = getDatasetConfigForId(c.id).graphName;   // canonical id→dataset resolver, no duplication
<Link
  to={`/node/${encodeURIComponent(c.id)}`}
  state={{ graphName, returnGraphName: graphName }}
  onClick={() => localStorage.setItem("graphName", graphName)}
  className="cordis-related__name"
>{c.name}</Link>
```

`useNodeDetail` already resolves a node from its id alone (`getDatasetConfigForId` matchers, e.g.
`HORIZON-CL3-…` → Cluster_3), so the link works with just the id; `state` + `localStorage.graphName` are
the same reliability/return-path hints `NodeConnections` sets. Navigating re-mounts the detail page for the
target call, re-running its A2/A6/B3 panels — the "more calls like this" path. **No graph-highlight/zoom**
is added here (that overlaps A3/A5 and is out of scope for B3).

### 4d. Styles — `styles/components/_cordis-related.scss` (+ `main.scss` import)

New partial imported in `styles/main/main.scss` next to `cordis-trend` (`:31`). Holds only B3-specific
classes (list rows, name link, subject line, shared-field chips, the overlap bar, hint/prov captions),
reusing `nd-card*` and CSS vars (`--foreground-muted`, `--border`, `--muted`) for dark/light. The chip
style can mirror `cordis-ev__chip` / `cordis-trend` conventions.

### 4e. Mount — `NodeDetail.js`

Extend the existing call-only block to render the third CORDIS card:

```jsx
{viewModel.kind === "call" && (
  <>
    <CordisEvidencePanel callId={nodeData.id || id} />
    <CordisTrendPanel callId={nodeData.id || id} />
    <CordisRelatedPanel callId={nodeData.id || id} />
  </>
)}
```

plus one import line next to the other two CORDIS panels (`NodeDetail.js:21–22`).

---

## 5. Honesty & provenance (mapped to concrete UI)

1. **Real data only.** Every row comes from `CLASSIFIED_AS`/`HAS_FUNDED_PROJECT` in Neo4j via
   `/related-calls`. No hardcoded/placeholder rows; empty → hide the card.
2. **Overlap ≠ similarity/quality.** The hint states the link is **research-field overlap of funded
   projects**, not call similarity, quality, impact, or substitutability ("most funded" ≠ "best", per the
   ideas doc). The bar is labelled "research-field overlap", and the **shared fields themselves are shown**
   so the user sees the basis, not just a number.
3. **EU-funded only; absence ≠ no activity.** Calls with no CORDIS-funded projects simply don't appear; the
   provenance caption names CORDIS / FP7–Horizon Europe.
4. **No methodology jargon.** Only plain field titles (EuroSciVoc names) and the human subject; no query
   strings, task IDs, or `cluster_3` artefacts in the UI.
5. **No silent caps.** `candidatesConsidered` / `candidateCap` / `capped` are returned; the cap orders by
   raw shared-field count before the Jaccard re-rank (reaching it needs >100 calls sharing a field), and
   the `capped` flag lets the client disclose truncation. All `ResearchField` matches are gated on
   `{source:"cordis"}` for consistency with `/stats`.

---

## 6. Step-by-step

1. **Backend (3):** add `_rank_related_calls` (pure) + `GET /cordis/related-calls` to `cordis_routes.py`.
   No tagger/builder/parser change.
2. **Offline verify (3, §7):** build per-subject field sets from the real extractions, synthesise the
   candidate rows the Cypher would return, run them through the real `_rank_related_calls`, and assert the
   ranking matches hand-computed Jaccard (AI-cluster above quantum/cyber outliers).
3. **Frontend (4a–4d):** `useCordisRelated.js`, `CordisRelatedPanel.jsx`, `_cordis-related.scss` +
   `main.scss` import; navigation via `<Link>` + `getDatasetConfigForId`.
4. **Mount (4e):** add the import + render `CordisRelatedPanel` after `CordisTrendPanel` in `NodeDetail.js`.
5. **Build** the frontend; adversarial review; update this file's Status to *Implemented & Verified
   (offline)*.

---

## 7. Verification

**Offline (real data on disk — primary correctness proof).** Using the extractions under
`C:\Code\knowledge-graph-app\CORDIS\data\extracted\…`:
- Build each curated subject's distinct EuroSciVoc field-code set + code→title map from
  `parse_extraction`.
- For a target subject, synthesise the candidate rows exactly as the Cypher returns them
  (`shared = |∩|`, `oN = |fields(other)|`, `sharedTitles`), run the **real** `_rank_related_calls`, and
  assert: the returned `score` equals hand-computed Jaccard; ordering is by score desc; for target
  **trustworthy/sovereign AI** the top related are the AI-cluster subjects (AI-for-health, data-spaces,
  research-automation; all Jaccard ≳ 0.55) and **quantum software** ranks last (~0.20); `sharedFields` are
  real EuroSciVoc titles. **No hardcoded values** — all derived from parsed dicts.

**Live end-to-end (user — needs `CORDIS_API_KEY` + Neo4j).**
1. Run A2's ingest once: `POST /cordis/tag-calls {"source":"cluster_3"}`.
2. `GET /cordis/related-calls?call_id=<a CL3 call id>` → non-empty `related` with shared fields + scores.
3. In the app: open that call's detail → the "Related calls (CORDIS)" card lists related calls; click one
   → the detail page navigates to it (and its own CORDIS cards load). A call with no CORDIS data → no card.

**Frontend build.** `node node_modules/react-scripts/bin/react-scripts.js build` (npx is broken on this
Windows setup, per project memory). Pre-existing warnings expected; B3 must add none new.

---

## 8. Rollback

- **Code only — B3 writes no data.** Delete the `GET /cordis/related-calls` handler + `_rank_related_calls`
  + the two module constants; delete `CordisRelatedPanel.jsx`, `useCordisRelated.js`,
  `_cordis-related.scss`; remove the `main.scss` import and the one import + render line in `NodeDetail.js`.
  No schema/data migration to undo (B3 introduces no nodes, edges, or properties).

---

## 9. Decisions (recommended defaults applied; flagged for review)

1. **Relatedness metric:** **Jaccard overlap of funded-project EuroSciVoc field sets** (applied — the
   doc's literal "EuroSciVoc overlap between calls"; richer than the A1 top-6 tag overlap) vs. overlap on
   the A1 `related_topics` top-6 tags (lighter, but coarser).
2. **Placement:** **separate "Related calls" card after the A6 panel** (applied — independently
   rollback-able; consistent with A2/A6) vs. a section inside an existing card.
3. **Navigation:** **router `<Link>` to `/node/:id`** reusing `getDatasetConfigForId` (applied — the exact
   `NodeConnections` mechanism; no duplicated id→graph logic) vs. a graph highlight/zoom (rejected — that is
   A3/A5 territory, out of B3's scope).
4. **Score presentation:** **shared-field chips + count + a subtle overlap bar** (applied — shows the basis,
   honest) vs. a bare "relatedness %" (rejected — implies false precision / call-level similarity).
5. **Candidate bound:** **cap 100 candidates by raw shared-field count before the Jaccard re-rank**
   (applied — bounds the query; surfaced via `candidatesConsidered`/`candidateCap`, never silent).
