"""Offline unit tests for cordis_cache (plan 12, §D). Pure — no DB, no FastAPI — so they run anywhere:

    python -m pytest backend/routes/new_pipeline/cordis/test_cordis_cache.py
    python backend/routes/new_pipeline/cordis/test_cordis_cache.py    # no pytest needed

Covers the cache contract the endpoints rely on: key building, hit (compute once), expiry (recompute),
invalidate (drop all), and bounded eviction.
"""
import os
import sys

# Allow running the file directly (python test_cordis_cache.py) by importing as a sibling module.
sys.path.insert(0, os.path.dirname(__file__))
import cordis_cache  # noqa: E402


def _counter():
    """A compute() that records how many times it actually ran (cache misses)."""
    calls = {"n": 0}

    def compute():
        calls["n"] += 1
        return calls["n"]

    return calls, compute


def test_make_key_param_free():
    assert cordis_cache._make_key("portfolio-summary", None) == "portfolio-summary"
    assert cordis_cache._make_key("portfolio-summary", {}) == "portfolio-summary"


def test_make_key_drops_none_and_sorts():
    # None values are dropped; remaining items sorted so order is deterministic regardless of dict order.
    k1 = cordis_cache._make_key("country-activity", {"top_n": 15, "country": "DE"})
    k2 = cordis_cache._make_key("country-activity", {"country": "DE", "top_n": 15})
    assert k1 == k2 == "country-activity|country=DE|top_n=15"
    # country=None collapses to the param-free-ish key (only top_n remains).
    assert cordis_cache._make_key("country-activity", {"country": None, "top_n": 15}) == "country-activity|top_n=15"


def test_hit_computes_once():
    cordis_cache.invalidate()
    calls, compute = _counter()
    a = cordis_cache.get_or_compute("k", None, compute)
    b = cordis_cache.get_or_compute("k", None, compute)
    assert a == b == 1
    assert calls["n"] == 1   # second call served from cache


def test_distinct_params_are_distinct_entries():
    cordis_cache.invalidate()
    calls, compute = _counter()
    cordis_cache.get_or_compute("top-organisations", {"top_n": 15}, compute)
    cordis_cache.get_or_compute("top-organisations", {"top_n": 30}, compute)
    assert calls["n"] == 2   # different params -> different keys -> two computes


def test_expiry_recomputes():
    cordis_cache.invalidate()
    calls, compute = _counter()
    # ttl=0 -> expires_at == now, and the next call's now is >= that, so it's always a miss.
    cordis_cache.get_or_compute("k", None, compute, ttl=0)
    cordis_cache.get_or_compute("k", None, compute, ttl=0)
    assert calls["n"] == 2


def test_invalidate_during_compute_is_not_cached():
    # If a mutation invalidates the cache WHILE compute() is running (e.g. a background /tag-calls finishes
    # mid-compute), the just-computed value is derived from now-stale data and must NOT be cached for a full
    # TTL. It is returned to this caller, but the next request must recompute against the new generation.
    cordis_cache.invalidate()
    calls = {"n": 0}

    def compute():
        calls["n"] += 1
        cordis_cache.invalidate()   # simulate an ingest/tag landing while we compute
        return calls["n"]

    a = cordis_cache.get_or_compute("k", None, compute)   # computed, but invalidate() bumped gen -> not stored
    b = cordis_cache.get_or_compute("k", None, compute)   # must recompute (not served from a poisoned entry)
    assert a == 1 and b == 2
    assert calls["n"] == 2


def test_invalidate_drops_all():
    cordis_cache.invalidate()
    calls, compute = _counter()
    cordis_cache.get_or_compute("k", None, compute)
    cordis_cache.invalidate()
    cordis_cache.get_or_compute("k", None, compute)
    assert calls["n"] == 2   # recomputed after invalidate


def test_eviction_bounds_the_store():
    cordis_cache.invalidate()
    _, compute = _counter()
    # Insert more distinct keys than the cap; the store must stay bounded.
    for i in range(cordis_cache._MAX_ENTRIES + 50):
        cordis_cache.get_or_compute("k", {"i": i}, compute)
    assert len(cordis_cache._store) <= cordis_cache._MAX_ENTRIES
    cordis_cache.invalidate()


if __name__ == "__main__":
    failures = 0
    for name, fn in sorted(globals().items()):
        if name.startswith("test_") and callable(fn):
            try:
                fn()
                print(f"PASS {name}")
            except AssertionError as e:
                failures += 1
                print(f"FAIL {name}: {e}")
    print(f"\n{'OK' if not failures else str(failures) + ' FAILURE(S)'}")
    sys.exit(1 if failures else 0)
