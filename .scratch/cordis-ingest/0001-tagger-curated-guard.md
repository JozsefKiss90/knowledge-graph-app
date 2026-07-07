# Close ADR-0004 silent raw-subject fallback in the tagger

**Status:** resolved · **Labels:** ready-for-human (verify on next tag run) · **Relates to:** ADR-0004, ADR-0006, phase = CORDIS go-live

## Problem

`load_curated_queries(source)` returns `None` when `curated_queries/<source>.json` is absent. `tag_calls`
then dropped to its `else: query = subject` branch and queried CORDIS by the **raw subject title** — the
noisy auto-query ADR-0004 exists to forbid. It happened **silently**, so a source shipped without its
curated file would quietly write wrong evidence into the graph. Because `tag-calls` runs per source
during the go-live ingest (the phase headline), this could corrupt the launch evidence — the honesty
contract (ADR-0006) is the moat, so this was a pre-ingest blocker, not backlog.

## Change

- `cordis_tagger.py` — added `allow_raw: bool = False`. Before the subject loop, `tag_calls` now raises
  `ValueError` when `query_map is None and not allow_raw` (message cites ADR-0004). The raw-subject
  `else` branch is reachable **only** under the explicit `allow_raw=True` opt-in (offline experiments).
- `cordis_routes.py` — `POST /cordis/tag-calls` now returns **HTTP 400** when the source has no
  `curated_queries/<source>.json`, before starting the background job. The live route never passes
  `allow_raw`, so the live path is curated-only by construction (defence in depth).
- `docs/adr/0004-*.md` — "Known trap" section rewritten to "Enforced in code."

## Verification

- Verified by inspection of the authoritative file state (guard present; `else` gated on `allow_raw`;
  helpers intact). The workspace bash sandbox was out of sync with the file-tool writes this session, so
  a live run/`py_compile` there was unreliable — **please confirm locally**:
  - `python -m py_compile backend/routes/new_pipeline/cordis/cordis_tagger.py backend/routes/new_pipeline/cordis/cordis_routes.py`
  - unit check: `tag_calls(calls=[{"id":"c","topic_title":"x"}], query_map=None, ingest_projects=False)`
    should raise `ValueError` mentioning ADR-0004; with `allow_raw=True` it should get past the guard.
  - route check: `POST /cordis/tag-calls` with a source that has no curated file should return 400.

## Follow-ups (optional)

- Add a fast test asserting the guard + the 400 (currently no test covers `tag_calls`).
