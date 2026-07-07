# CORDIS data is ingested server-side into the single Neo4j graph — never called live from the browser

Both halves of the app live in **one Neo4j graph**: the work-programme hierarchy (Advertised) and the
CORDIS evidence (Awarded — projects, organisations, countries, EuroSciVoc fields) as node/relationship
types linked to the existing call nodes. The CORDIS side is populated by a backend ingest job — create
extraction → poll until finished → download ZIP → parse → write to Neo4j
(`backend/routes/new_pipeline/cordis/`) — and the frontend reads it through the backend API exactly
the way it reads the rest of the graph, behind a server-side cache (`cordis_cache.py`, which every
mutation must invalidate). Where that graph is *hosted* is deliberately swappable (env-var cutover;
see `CORDIS_PLANS/13`) and is not part of this decision.

Why not call CORDIS live from the client, which would always be fresh? Because the CORDIS
data-extraction API forbids the pattern: it is asynchronous (a single extraction takes minutes), it
requires an API key (unshippable to a browser), and it caps stored extractions per profile (slots
must be freed after download). And because the join is the product (ADR-0001): evidence must sit in
the same graph as the calls to be queried against them in one hop, carry provenance, and stay
honestly labelled. The accepted trade-off is **freshness**: data changes only when an ingest is
re-run (on demand), so the UI must say what was ingested and when, and never imply live coverage.

A future reader seeing stale or missing evidence should reach for the ingest jobs (populate /
tag-calls, then cache invalidation) — not for a client-side CORDIS call.
