"""Tiny, dependency-free, thread-safe in-process cache for the CORDIS read endpoints (plan 12, Part A).

The dashboard aggregates only change when an ingest/tag/delete mutation runs, yet they were recomputed on
every load (~15-20 Neo4j round-trips per dashboard open). This caches each endpoint's shaped response keyed
by its parameters, with an explicit ``invalidate()`` called from every write path (see cordis_routes.py §A3)
and a TTL as a safety net (correctness comes from invalidate-on-ingest; the TTL bounds staleness if a worker
misses an invalidation — see the multi-worker caveat in §A4 of the plan).

FastAPI runs sync endpoints in a threadpool, so all access to the shared store is guarded by a
``threading.Lock``. The ``compute`` callable runs OUTSIDE the lock so concurrent requests for *different*
keys don't serialise their DB work.
"""
import threading
import time
from typing import Any, Callable

_TTL_SECONDS = 600          # safety net; correctness comes from invalidate-on-ingest (A3)
_MAX_ENTRIES = 512          # bound parametrised keys (per-call, per-country) so memory can't grow unbounded
_lock = threading.Lock()
_store: "dict[str, tuple[float, Any]]" = {}   # key -> (expires_at, value)
_generation = 0             # bumped on every invalidate(); see the invalidate-during-compute guard below


def _make_key(name: str, params: "dict | None") -> str:
    """Stable cache key from an endpoint name + its params. ``None`` values are dropped (so the param-free
    dashboard call and an explicit ``country=None`` collapse to the same key) and the remaining items are
    sorted so key order is deterministic regardless of dict insertion order."""
    if not params:
        return name
    items = sorted((k, v) for k, v in params.items() if v is not None)
    return name + "|" + "|".join(f"{k}={v}" for k, v in items)


def get_or_compute(name: str, params: "dict | None", compute: Callable[[], Any], ttl: int = _TTL_SECONDS) -> Any:
    """Return the cached value for ``(name, params)`` if present and unexpired, else call ``compute()`` and
    cache its result. ``compute`` runs outside the lock; exceptions propagate (nothing is cached on failure,
    so a transient DB error is retried on the next request rather than poisoning the cache)."""
    key = _make_key(name, params)
    now = time.time()
    with _lock:
        hit = _store.get(key)
        if hit and hit[0] > now:
            return hit[1]
        gen = _generation                  # snapshot the generation this computation is based on
    value = compute()                      # computed OUTSIDE the lock (don't serialise all DB work)
    with _lock:
        # If invalidate() ran while compute() was in flight, `value` may be derived from data that has since
        # changed (e.g. a background /tag-calls finished mid-compute). Hand it back to THIS caller but do NOT
        # cache it — caching it would re-poison the store with stale data for a full TTL, defeating the
        # invalidate-on-ingest guarantee. The next request recomputes against the new generation.
        if _generation == gen:
            if len(_store) >= _MAX_ENTRIES:    # cheap eviction: drop expired, then oldest
                _evict_locked(now)
            _store[key] = (now + ttl, value)
    return value


def invalidate() -> None:
    """Drop every cached entry and bump the generation so any in-flight compute() started before this call
    won't be cached (see get_or_compute). Called after each CORDIS mutation so the dashboard reflects new
    data immediately (rather than waiting out the TTL)."""
    global _generation
    with _lock:
        _generation += 1
        _store.clear()


def _evict_locked(now: float) -> None:
    """Bound the store: drop expired entries first, and if still at capacity drop the ~10% oldest by expiry.
    Caller must hold ``_lock``."""
    expired = [k for k, (exp, _) in _store.items() if exp <= now]
    for k in expired:
        _store.pop(k, None)
    if len(_store) >= _MAX_ENTRIES:        # still full -> drop ~10% oldest by expiry
        for k in sorted(_store, key=lambda k: _store[k][0])[: max(1, _MAX_ENTRIES // 10)]:
            _store.pop(k, None)
