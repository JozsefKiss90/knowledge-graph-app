"""Offline unit tests for the ADR-0004 curated-query guard in cordis_tagger
(.scratch/cordis-ingest/0002). Pure — no live DB, no network — so they run anywhere:

    python -m pytest backend/routes/new_pipeline/cordis/test_cordis_tagger.py
    python backend/routes/new_pipeline/cordis/test_cordis_tagger.py    # no pytest needed

Locks the guard behaviour so a refactor can't silently reopen the raw-subject fallback:
tag_calls refuses to run without a curated query map, allow_raw=True is the only way past
the guard, subjects absent from a supplied map are skipped + reported (never queried by raw
title, never tagged), and POST /cordis/tag-calls returns 400 for a source with no curated file.
"""
import os
import sys

# The tagger uses package-relative imports, so import it as part of the `cordis` package
# (sys.path gets the new_pipeline dir). `database` is not importable from there, so the
# module's _DummyDB fallback keeps the import offline; each test additionally swaps in its
# own recording fakes for `db` / `_projects_for_subject`, so the tests stay pure even where
# the real backend root is importable (e.g. inside the dev container).
_HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.dirname(_HERE))
from cordis import cordis_tagger  # noqa: E402
from cordis.cordis_tagger import tag_calls  # noqa: E402


class _Skip(Exception):
    """Raised (or converted to pytest.skip) when a test's prerequisites aren't importable here."""


class _RecordingDB:
    def __init__(self):
        self.queries = []   # (cypher, params) of every write/read attempted

    def query(self, q, p=None):
        self.queries.append((q, p or {}))
        return []


class _RecordingFetch:
    """Stands in for _projects_for_subject: records each query actually fetched."""
    def __init__(self, projects=None):
        self.fetched = []
        self.projects = projects or []

    def __call__(self, query, mode, local_path, client=None):
        self.fetched.append(query)
        return self.projects


def _patched(db=None, fetch=None):
    """Swap the module's db / _projects_for_subject; returns a restore() callable."""
    orig_db, orig_fetch = cordis_tagger.db, cordis_tagger._projects_for_subject
    if db is not None:
        cordis_tagger.db = db
    if fetch is not None:
        cordis_tagger._projects_for_subject = fetch

    def restore():
        cordis_tagger.db, cordis_tagger._projects_for_subject = orig_db, orig_fetch
    return restore


def test_missing_query_map_raises_adr_0004():
    """No curated map -> ValueError citing ADR-0004/curated queries, before anything is fetched or written."""
    rec_db, rec_fetch = _RecordingDB(), _RecordingFetch()
    restore = _patched(db=rec_db, fetch=rec_fetch)
    try:
        try:
            tag_calls(calls=[{"id": "c", "topic_title": "x"}], query_map=None, ingest_projects=False)
            assert False, "expected the ADR-0004 guard ValueError"
        except ValueError as e:
            msg = str(e)
            assert "ADR-0004" in msg, f"guard message must cite ADR-0004, got: {msg}"
            assert "curated" in msg.lower(), f"guard message must mention curated queries, got: {msg}"
        assert rec_fetch.fetched == []   # refused before any CORDIS fetch
        assert rec_db.queries == []      # ...and before any DB write
    finally:
        restore()


def test_allow_raw_gets_past_the_guard():
    """allow_raw=True (explicit offline opt-in) must NOT trip the guard: the raw subject is fetched."""
    rec_db, rec_fetch = _RecordingDB(), _RecordingFetch()
    restore = _patched(db=rec_db, fetch=rec_fetch)
    try:
        result = tag_calls(calls=[{"id": "c", "topic_title": "x"}], query_map=None, allow_raw=True,
                           ingest_projects=False, mode="local")
        # Past the guard: the subject was queried RAW (the opt-in branch), and the run completed.
        assert rec_fetch.fetched == ["x"]
        assert result["subjects"] == 1
        assert result["empty_subjects"] == 1   # recorder returned no projects -> honest untagged
    finally:
        restore()


def test_unmapped_subject_skipped_never_raw_queried():
    """With a curated map, a subject absent from it is skipped + reported ('no curated query') —
    never queried by its raw title, never tagged. Mapped subjects use the curated query text."""
    rec_db = _RecordingDB()
    rec_fetch = _RecordingFetch(projects=[{"id": "proj-1", "fields": [{"title": "Robotics"}]}])
    restore = _patched(db=rec_db, fetch=rec_fetch)
    try:
        result = tag_calls(
            calls=[{"id": "call-mapped", "topic_title": "mapped subject"},
                   {"id": "call-unmapped", "topic_title": "unmapped subject"}],
            query_map={"mapped subject": "curated query text"},
            ingest_projects=False, mode="local",
        )
        # Only the curated query text was ever fetched — not the raw titles of either subject.
        assert rec_fetch.fetched == ["curated query text"]
        # The unmapped subject is reported, not silently dropped.
        assert result["failed_subjects"] == 1
        assert result["failed_detail"] == [{"subject": "unmapped subject", "error": "no curated query"}]
        # The mapped call was tagged; the unmapped call was never written to.
        assert result["calls_tagged"] == 1
        tag_writes = [p for q, p in rec_db.queries if "related_topics" in q and "SET" in q]
        assert [p.get("id") for p in tag_writes] == ["call-mapped"]
    finally:
        restore()


def test_route_refuses_source_with_no_curated_file():
    """POST /cordis/tag-calls for a source with no curated_queries/<source>.json -> HTTP 400 (ADR-0004),
    before the background job is created. Needs the backend deps (fastapi, neo4j driver) importable —
    skipped elsewhere; runs for real inside the dev backend container."""
    os.environ.setdefault("NEO4J_CONNECT_RETRIES", "0")   # importing database must not block on a DB
    backend_root = os.path.dirname(os.path.dirname(os.path.dirname(_HERE)))
    sys.path.insert(0, backend_root)
    try:
        from fastapi import HTTPException
        from fastapi.background import BackgroundTasks
        from cordis import cordis_routes
    except Exception as e:  # fastapi / database / neo4j not installed here
        _skip(f"backend deps not importable here ({e.__class__.__name__}: {e}) — run in the dev container")
        return
    payload = cordis_routes.TagCallsPayload(source="__no_such_source__")
    try:
        cordis_routes.tag_calls_endpoint(payload, BackgroundTasks())
        assert False, "expected HTTPException(400) for a source with no curated file"
    except HTTPException as e:
        assert e.status_code == 400
        assert "ADR-0004" in e.detail
        assert "__no_such_source__" in e.detail


def _skip(msg):
    try:
        import pytest
        pytest.skip(msg)
    except ImportError:
        raise _Skip(msg)


if __name__ == "__main__":
    failures = 0
    for name, fn in sorted(globals().items()):
        if name.startswith("test_") and callable(fn):
            try:
                fn()
                print(f"PASS {name}")
            except _Skip as e:
                print(f"SKIP {name}: {e}")
            except AssertionError as e:
                failures += 1
                print(f"FAIL {name}: {e}")
    print(f"\n{'OK' if not failures else str(failures) + ' FAILURE(S)'}")
    sys.exit(1 if failures else 0)
