# Test the ADR-0004 curated-query guard

**Labels:** ready-for-agent · **Relates to:** ADR-0004, `.scratch/cordis-ingest/0001-tagger-curated-guard.md` · **Source:** ADR-conformance audit (follow-up to this session's fix)

## What to build

This session closed the ADR-0004 silent-fallback: `tag_calls` now refuses to tag by raw subject when no
curated map is present (raises unless `allow_raw=True`), and `POST /cordis/tag-calls` returns HTTP 400
for a source with no `curated_queries/<source>.json`. There is currently **no test covering
`tag_calls`**, so a future refactor could silently reopen the fallback. Add a focused test that locks
the guard behaviour.

## Acceptance criteria

- [ ] `tag_calls(calls=[{"id": "c", "topic_title": "x"}], query_map=None, ingest_projects=False)` raises
      `ValueError`, and the message references ADR-0004 / curated queries.
- [ ] `tag_calls(..., query_map=None, allow_raw=True, ...)` does **not** raise the guard `ValueError`
      (it may fail later for unrelated reasons — assert specifically that it gets *past* the guard).
- [ ] With a curated `query_map` supplied, a subject absent from the map is skipped and reported
      ("no curated query"), never queried by raw title or tagged.
- [ ] If a route/FastAPI test harness exists: `POST /cordis/tag-calls` for a source with no curated file
      returns 400. Follow existing backend test patterns for prior art.

## Blocked by

None — the code change is already in place (this session).
