# 12 — Dashboard data-load performance: server-side caching + query/index optimization

> **Status:** plan only (not yet implemented).
> **Goal:** make the portfolio dashboard (and the CORDIS tool panel) load fast. Today, opening the dashboard
> fires ~6 CORDIS endpoints = ~15–20 Neo4j queries, several of them full traversals of the entire funded
> portfolio, **recomputed on every load with no server-side cache**.
> **Chosen approach:** *Both* — server-side caching with ingest invalidation **and** the query/index rewrites
> (plus an optional frontend lazy-load pass for perceived latency).

---

## 0. Diagnosis (why it's slow)

Evidence from the code (`backend/routes/new_pipeline/cordis/cordis_routes.py`, `database.py`,
`cordis_builder.py`):

- **`SOURCE_TAG = "cordis"` is a single constant** (`cordis_builder.py:23`). Every query filters
  `{source:"cordis"}`, which matches **every** CORDIS node. ⇒ **an index on `source` is useless** (zero
  selectivity). The existing indexes (`cordis_builder.py:28–34`) cover only `.id`/`.code`.
- **Each dashboard open fires these endpoints** (via `PortfolioDashboard.jsx` hooks), gated on
  `/portfolio-summary` returning `projectCount > 0`:
  - `/portfolio-summary` — **4** separate full traversals (`cordis_routes.py:208–236`)
  - `/funding-by-programme` — 1 full traversal (`:295`)
  - `/portfolio-trend` — **2** full traversals (`:494`, `:502`)
  - `/field-tree` — 2 full traversals (`:774`, `:781`)
  - `/country-activity` (`country=""`) — facets traversal **+ a second identical `covered` traversal**
    (`:1146`, `:1155`)
  - `/top-organisations` — ranked traversal **+ a second total-count traversal** (`:1062`, `:1075`)
  - (panel) `/hop-on-hosts` — **full `CordisProject` label scan** with regex `=~` + date arithmetic on every
    node (`:1435`)
- **`db.query` opens a fresh `session()` per call** (`database.py:39–42`). The driver is a pooled singleton,
  but each query is a separate round-trip ⇒ ~15–20 round-trips per dashboard load.
- **No server-side cache.** The aggregates only change when ingest runs, yet they recompute every load. The
  frontend module caches (e.g. `useCordisPortfolio.js:9`) only help within one browser session; every fresh
  load / new visitor pays full cost.

**Conclusion:** the dominant win is **caching** (data is static between ingests). Query/index rewrites cut the
**cold** (post-invalidation / first) load. Frontend lazy-load improves perceived latency only.

---

## Part A — Server-side caching (biggest win, low risk)

### A1. New module: `backend/routes/new_pipeline/cordis/cordis_cache.py`

A tiny, dependency-free, thread-safe in-process cache with TTL + explicit invalidation. (FastAPI runs sync
endpoints in a threadpool, so a `threading.Lock` is required.)

```python
# cordis_cache.py
import threading, time
from typing import Any, Callable

_TTL_SECONDS = 600          # safety net; correctness comes from invalidate-on-ingest
_MAX_ENTRIES = 512          # bound parametrized keys (per-call, per-country) so memory can't grow unbounded
_lock = threading.Lock()
_store: "dict[str, tuple[float, Any]]" = {}   # key -> (expires_at, value)

def _make_key(name: str, params: dict | None) -> str:
    if not params:
        return name
    items = sorted((k, v) for k, v in params.items() if v is not None)
    return name + "|" + "|".join(f"{k}={v}" for k, v in items)

def get_or_compute(name: str, params: dict | None, compute: Callable[[], Any], ttl: int = _TTL_SECONDS) -> Any:
    key = _make_key(name, params)
    now = time.time()
    with _lock:
        hit = _store.get(key)
        if hit and hit[0] > now:
            return hit[1]
    value = compute()                      # computed OUTSIDE the lock (don't serialize all DB work)
    with _lock:
        if len(_store) >= _MAX_ENTRIES:    # cheap eviction: drop expired, then oldest
            _evict_locked(now)
        _store[key] = (now + ttl, value)
    return value

def invalidate() -> None:
    with _lock:
        _store.clear()

def _evict_locked(now: float) -> None:
    expired = [k for k, (exp, _) in _store.items() if exp <= now]
    for k in expired:
        _store.pop(k, None)
    if len(_store) >= _MAX_ENTRIES:        # still full → drop ~10% oldest by expiry
        for k in sorted(_store, key=lambda k: _store[k][0])[: max(1, _MAX_ENTRIES // 10)]:
            _store.pop(k, None)
```

> **Thundering-herd note (optional enhancement):** right after `invalidate()`, N concurrent requests for the
> same key all recompute. For the dashboard this is acceptable (a handful of widgets). If it matters, add a
> per-key compute lock (mirrors the frontend in-flight dedupe added in `useCountryActivity.js`). Document as a
> follow-up, not v1.

### A2. Wrap the read endpoints

Refactor each cached endpoint so the existing body becomes an inner `_compute()` and the handler returns
`cordis_cache.get_or_compute(name, params, _compute)`. Keep the Cypher identical — only wrap.

| Endpoint | Cache key params | Notes |
|---|---|---|
| `/portfolio-summary` | — | param-free; hot |
| `/funding-by-programme` | — | param-free; hot |
| `/portfolio-trend` | — | param-free; hot |
| `/field-tree` | — | param-free; hot |
| `/stats` | — | param-free |
| `/top-organisations` | `top_n` | heavy scan; key by `top_n` |
| `/country-activity` | `country`, `top_n` | `country=""` (facets+covered) is the hot dashboard call |
| `/hop-on-hosts` | `field, programme, missing_country, max_age_months, top_n` | heavy scan; many keys → relies on `_MAX_ENTRIES`/TTL. **Better:** see B6 (cache the raw scan by `max_age_months`, filter in Python) so all filter combos share one cached scan |
| `/field-calls` | `code` | per selected field |
| `/related-calls`, `/call-evidence`, `/call-trend`, `/area`, `/area-organisations` | their `call_id`/`code` (+ `top_n`) | per-call (node-detail panels); lower priority, same pattern |

Sketch:

```python
@router.get("/portfolio-summary")
def portfolio_summary():
    def _compute():
        ... existing body ...
        return _shape_portfolio_summary(...)
    try:
        return cordis_cache.get_or_compute("portfolio-summary", None, _compute)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"CORDIS portfolio-summary failed: {str(e)}")
```

### A3. Invalidate on every mutation

Call `cordis_cache.invalidate()` at the end of each write path:

| Mutation | File / location | Hook |
|---|---|---|
| `POST /cordis/fetch` | `cordis_routes.py:46` | after `ingest(...)` succeeds |
| `POST /cordis/ingest-local` | `:67` | after `ingest(...)` |
| `POST /cordis/tag-calls` | `:82` → background `_run()` (`:105`) | **inside `_run`, after `tag_calls(...)` finishes** (it's async — the HTTP response returns before data lands, so the endpoint itself must NOT invalidate; the background task must) |
| `DELETE /cordis/tags` | `:141` | after `clear_tags(...)` |
| `DELETE /cordis/area-links` | `:1494` | after `clear_area_links(...)` |
| `DELETE /cordis/all` | `:1504` | after `delete_all()` |

> **Critical:** `/tag-calls` returns immediately and ingests in the background (`background_tasks`). Invalidate
> in `_run()` **after** `tag_calls()` returns, not in the handler — otherwise the cache is cleared before the
> new data exists and immediately re-warms with stale results.

### A4. Multi-worker caveat (read before deploying)

An in-process dict cache is **per worker**. If the app runs under multiple uvicorn/gunicorn workers,
`invalidate()` only clears the worker that handled the mutation; others serve stale data until the **TTL**
(A1, 600 s) expires. Options, in order of effort:
- **Dev / single worker:** nothing to do (the common case here).
- **Keep TTL short-ish** (e.g. 300–600 s) so staleness self-heals — acceptable because ingest is infrequent.
- **Shared cache:** Redis (or a tiny `cache_version` row in Neo4j bumped on mutation and checked cheaply per
  request) if strong cross-worker freshness is required. Out of scope for v1; note it.

---

## Part B — Query & index optimization (cuts the cold / first load)

### B1. Useful indexes — `cordis_builder.py` `_INDEX_STATEMENTS` (`:28`) + `ensure_indexes()` (`:38`)

Add (and **document why `source` is intentionally NOT indexed** — it's the constant `"cordis"`):

```python
"CREATE INDEX cordis_project_fp IF NOT EXISTS FOR (n:CordisProject) ON (n.frameworkProgramme)",
"CREATE INDEX cordis_project_status IF NOT EXISTS FOR (n:CordisProject) ON (n.status)",
# Optional composite (Neo4j 5+) — lets hop-on narrow to HORIZON+SIGNED before the regex/date work:
"CREATE INDEX cordis_project_fp_status IF NOT EXISTS FOR (n:CordisProject) ON (n.frameworkProgramme, n.status)",
```

`ensure_indexes()` is already called before ingest and is idempotent (`IF NOT EXISTS`). These help **`/hop-on-hosts`** most (it starts from a full `CordisProject` scan). The traversal-anchored dashboard queries are
bounded by relationship counts, not property lookups, so indexes help them little — caching (Part A) is their
lever.

### B2. `/country-activity` — don't compute `covered` when no country is picked

`cordis_routes.py:1146–1161`: the `facets` traversal **and** the `covered` traversal both run on every
param-free dashboard call. `covered`/`active`/`coordinated` id sets are only used by the **graph overlay**,
i.e. only when a `country` is selected. Move the `covered` query **inside the `if country:` block** (`:1165`).
The dashboard's country leaderboard (`country=""`) then runs **one** traversal instead of two.

### B3. `/portfolio-summary` — collapse 4 round-trips into 1

`cordis_routes.py:208–236` runs four queries that each re-traverse
`(:Call)-[:HAS_FUNDED_PROJECT]->(pr) WITH DISTINCT pr`. Combine with `CALL {}` subqueries (Neo4j 5) or a
single pipeline so it's **one** session/round-trip:

```cypher
CALL { MATCH (:Call)-[:HAS_FUNDED_PROJECT]->(pr:CordisProject {source:$s}) WITH DISTINCT pr
       RETURN count(pr) AS projectCount, sum(pr.ecContribution) AS totalEcContribution }
CALL { MATCH (c:Call)-[:HAS_FUNDED_PROJECT]->(:CordisProject {source:$s})
       RETURN count(DISTINCT c) AS callCount }
CALL { MATCH (:Call)-[:HAS_FUNDED_PROJECT]->(pr:CordisProject {source:$s}) WITH DISTINCT pr
       MATCH (og:CordisOrganisation {source:$s})-[:PARTICIPATED_IN]->(pr)
       RETURN count(DISTINCT og) AS organisationCount,
              count(DISTINCT CASE WHEN og.country IS NOT NULL AND og.country <> '' THEN og.country END) AS countryCount }
CALL { MATCH (:Call)-[:HAS_FUNDED_PROJECT]->(pr:CordisProject {source:$s}) WITH DISTINCT pr
       MATCH (pr)-[:CLASSIFIED_AS]->(rf:ResearchField {source:$s})
       RETURN count(DISTINCT rf) AS fieldCount }
RETURN projectCount, totalEcContribution, callCount, organisationCount, countryCount, fieldCount
```

`_shape_portfolio_summary` stays the same (feed it the single row). Net: 4 round-trips → 1.

### B4. `/top-organisations` — fold the total-count into the ranked query

`cordis_routes.py:1062` + `:1075` traverse the same set twice (ranked top-N + total distinct-org count).
Combine via a `CALL {}` subquery for the total, or compute the total in the same pass. Saves one full
traversal.

### B5. `/hop-on-hosts` — narrow before the regex; consider a parsed-date property

- With B1's `frameworkProgramme`/`status` indexes, reorder the `WHERE` so `frameworkProgramme = 'HORIZON' AND
  status = 'SIGNED'` prunes first, *then* the regex/date checks run on the survivors (`cordis_routes.py:1437`).
- The two `=~ '\d{4}-\d{2}-\d{2}.*'` regexes run per node. **Optional, larger:** at ingest
  (`cordis_builder.py`) precompute a `startDateParsed` (`date`) / `isHorizonSigned` boolean so the endpoint
  filters on indexed/typed properties instead of regex. Defer unless hop-on stays slow after caching+indexes.
- **With caching (A2)** the heavy scan runs once per `(filters)` until the next ingest, so B5 is a cold-load
  refinement. Pair with: cache the **raw eligible-host scan keyed only by `max_age_months`** and apply the
  `field`/`programme`/`missing_country` filters in Python (they already are — `:1469–1475`), so all filter
  combinations share one cached scan instead of one cache entry per combo.

### B6. (Optional) fewer sessions per request

`database.py:39` opens a session per `db.query`. For endpoints that still issue multiple statements, add a
helper that runs them in **one** session/transaction (e.g. `db.query_many([...])` or a
`session.execute_read(fn)` variant). Marginal next to caching; do only if profiling shows session setup is
material.

---

## Part C — Frontend (perceived latency; optional polish)

The hero + KPI band can paint immediately; the heavy CORDIS section and leaderboards are below the fold.

- **Lazy-load below-the-fold widgets** with an `IntersectionObserver` (or a small `useInView` hook): gate
  `useFundingByProgramme` / `useCordisPortfolioTrend` / `useCordisFieldTree` / `useCountryActivity` /
  `useTopOrganisations` (`PortfolioDashboard.jsx:32–50`) on their card scrolling into view, instead of firing
  all at once when `cordisActive` flips true.
- The existing per-session module caches (e.g. `useCordisFieldTree.js`, `useCountryActivity.js`) already avoid
  refetch within a session and **share** between the dashboard widgets and the tool panel — keep them; the
  server cache complements them across sessions/visitors.
- Keep showing skeletons/loaders per card so a slow cold call never blocks the whole dashboard.

---

## Part D — Measurement & validation

**Before/after timing**
- Browser **Network** tab: record each `/cordis/*` request's time on a cold dashboard load, then after
  caching (second load should be ~single-digit ms server-side).
- Backend: temporary timing log around `get_or_compute` (compute-time vs cache-hit), or wrap `db.query` with a
  duration log behind an env flag.
- Neo4j: `PROFILE`/`EXPLAIN` the heavy queries (country-activity facets, top-organisations, hop-on scan,
  field-tree) in Neo4j Browser to confirm db-hits drop after B1–B5.

**Correctness**
- After each mutation (`/tag-calls` finish, `/cordis/all` delete, `/tags`, `/area-links`), reload the
  dashboard and confirm numbers updated (cache invalidated). Specifically test the **background** `/tag-calls`
  path (A3 critical note).
- Unit-test `cordis_cache` (hit/expiry/invalidate/eviction) — pure, no DB.
- The `_shape_*`/`_aggregate_*`/`_build_field_tree`/`_rank_*` helpers stay pure and unchanged, so existing
  offline tests still cover the response shaping.

---

## Sequencing & expected payoff

1. **Phase 1 — Caching (A1–A4).** Highest leverage, lowest risk, dataset-independent. Repeat loads go from
   ~15–20 heavy queries to ~0 (cache hits). Ship and measure first.
2. **Phase 2 — Query/index (B1–B5).** Cuts the cold/first-load and post-ingest re-warm. B2 + B3 + B4 alone
   remove ~5 full traversals per dashboard load.
3. **Phase 3 — Frontend lazy-load (C).** Perceived-latency polish; do after the backend wins.

## Risks & tradeoffs

- **Staleness:** bounded by TTL + invalidation. Must hook **every** mutation, especially the background
  `/tag-calls` completion (A3). 
- **Memory:** parametrized keys (per-call, per-country, per-hop-on-filter) bounded by `_MAX_ENTRIES` + TTL
  eviction; the B6/A2 "cache the raw scan, filter in Python" pattern keeps hop-on to one entry per
  `max_age_months`.
- **Multi-worker deploys:** in-process cache is per worker (A4) — fine for single-worker/dev; use TTL or a
  shared cache (Redis) if running multiple workers with strict freshness needs.
- **Query rewrites (B3/B4):** keep the pure shaping helpers unchanged and assert response shape is identical
  (same keys/semantics) so the frontend contract doesn't move.

## Touched files (when implemented)

- **New:** `backend/routes/new_pipeline/cordis/cordis_cache.py` (+ a unit test).
- **Edit:** `cordis_routes.py` (wrap reads A2; invalidate in mutations A3; query rewrites B2–B5),
  `cordis_builder.py` (indexes B1).
- **Optional:** `database.py` (B6 multi-statement helper), `PortfolioDashboard.jsx` + a `useInView` hook (C).
