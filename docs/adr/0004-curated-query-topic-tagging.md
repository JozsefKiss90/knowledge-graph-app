# Call↔project topic tagging uses curated per-subject queries — no auto-querying

The thematic bridge between calls and CORDIS projects (the `HAS_FUNDED_PROJECT` evidence of ADR-0001,
plus the EuroSciVoc tags on calls) is built from **hand-curated CORDIS queries, one per subject**,
reviewed per source and stored in `curated_queries/<source>.json`. The tag-calls route always loads
the source's curated map; a subject with no entry in the map is **skipped and reported** ("no curated
query") — it is never queried by its raw title (`cordis_tagger.py`).

This looks like the kind of thing that should be automated, which is exactly why it is recorded:
auto-generated queries were tried and mis-tag ambiguous subjects, pulling unrelated projects in — and
wrong evidence under a call is worse than no evidence (the honesty contract forbids dressing noise up
as track record). The accepted trade-off is **coverage and effort**: every new source needs its query
file written and reviewed by a human before its calls get evidence, so uncovered subjects show honest
empty states instead of fabricated matches.

Since the positioning decision (Q3.2), this curation is also the moat: the underlying sources are
public, so what compounds and is hard to copy is precisely the reviewed subject→query map. Deleting
the curation "to simplify," or replacing it with auto-queries "for coverage," would delete the edge.

**Enforced in code** (was a known trap). Previously `load_curated_queries` returned `None` for a source
with *no curated file at all*, and `tag_calls` then silently fell back to raw-subject queries — the exact
failure mode this decision exists to prevent. That fallback is now closed on the live path:

- `tag_calls` raises `ValueError` when `query_map is None` unless an explicit `allow_raw=True` is passed
  (offline experiments only, where noisy tags are acceptable) — `cordis_tagger.py`.
- `POST /cordis/tag-calls` rejects a source with no `curated_queries/<source>.json` up front with HTTP 400,
  so an uncovered source can't even start a run — `cordis_routes.py`.

The operational rule — **a source gets its curated query file before it gets tag-calls** — is now
guaranteed by the code, not merely documented.
