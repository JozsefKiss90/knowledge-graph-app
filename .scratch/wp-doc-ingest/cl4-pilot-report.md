# CL4 pilot — document+API merge, verified through the builder

**Status:** done 2026-07-09 · **Relates to:** ADR-0008, PRD `.scratch/wp-doc-ingest/PRD.md` (Steps 2–5),
reconciliation-report.md · **Artifacts (this dir):** `cl4_wp_parser.py`, `cl4_merge.py`,
`cluster_CL4.merged.json`, `_refs/` (recovered prior-art parser, reference only — not un-deleted).

## Outcome — both headline wins land as ingestable node props

Verified by driving the **real** `BaseClusterBuilder._build_call_props` on every merged call (offline;
the builder falls back to a `_DummyDB` without Neo4j):

- **79/79 calls build cleanly, 0 errors** — ingests with **zero builder changes**.
- **TRL: 53 node props** (was **0/64**) — 38 enriched API topics + 15 Space, each carrying the
  document's Technology Readiness Level. Closes the reconciliation bucket-B (TRL 38) for CL4.
- **15 Space (`SPACE-03-*`) topics surfaced** as real ingestable calls (bucket-C) — with narrative,
  conditions, budget (unit-converted M→€), and `expected_eu_contribution`.
- **Additive:** 64 API + 15 document = 79; every original API topic preserved.
- **Provenance flows** via the existing `_description_section_keys` extension point: `content_source`
  (79), `wp_edition` (79), `field_provenance` (77, JSON), Space carry `provenance_note` + indicative labels.
- **`status` recomputed deterministically from dates** (status = f(opening, deadline); session date
  2026-07-09): 37 Closed, 42 Forthcoming — no stale snapshot.

## How it works

1. **`cl4_wp_parser.py`** — reuses the recovered prior-art engine (`parse_call_block`/`extract_sections`/
   helpers) but drives it with **real-definition-aware splitting** (block = one real def → next real def),
   so same-cluster cross-references don't truncate blocks. Output: 77 CL4 topics, TRL 53/77, narrative 77/77.
2. **`cl4_merge.py`** — ADR-0008 precedence: starts from the ingested `cluster_CL4.grouped.json` (API
   state), enriches each matched call with document content (TRL + any blank content field) tagging
   `field_provenance`, appends the 15 PDF-only Space topics as document-sourced records (budget M→€,
   `status=Forthcoming` indicative), recomputes `status` from dates, stamps provenance, and advertises the
   extra fields via `_description_section_keys` so the builder ingests them.

## Notable finding — the ingested grouped file is a stale vintage (ID alias)

The PDF and the **current** raw API dump both use the abbreviated destination token `MAT-PROD`
(e.g. `HORIZON-CL4-2026-01-MAT-PROD-01`), but the ingested `cluster_CL4.grouped.json` is an **older
(Jan) vintage** spelling it `MATERIALS-PRODUCTION` — so 30 topics failed to join until canonicalised
(`api∩grouped` was only 34 vs `pdf∩api` 62). For the pilot this is handled with a single alias in
`norm_key`. **Productionisation should instead rebuild from the current dump** (whose IDs already match
the PDF), which also refreshes state and removes the alias hack. This is the same stale-vintage issue
the bucket-A audit surfaced (Jan grouped files vs May dump).

## Productionisation checklist (not done in the pilot)

- **Rebuild the API side from the current dump** (`fetched_call_metadata_2026_2027.json`, MAT-PROD IDs)
  rather than alias-patching the stale grouped file — fixes IDs + refreshes state in one move.
- **Promote TRL to a first-class builder prop** (`_build_call_props`) instead of riding
  `_description_section_keys` — it's a core field, not a description section.
- **Fix the pre-existing `min__contribution` typo** in CL4 grouped (double underscore → builder reads
  `min_contribution` → drops it; sample showed `min_contribution=None` while `expected_eu_contribution`
  was correct).
- **Parser coverage:** 77 of ~89 "Specific conditions" blocks resolved — the remaining ~12 need the
  parser's destination/two-stage edge-cases tightened for full extraction.
- **Honesty (ADR-0006):** Space topics render dates/status as **indicative (work programme)**;
  `field_provenance` already marks document-sourced fields.

## Promoted live + UI-verified — 2026-07-09

`cluster_CL4.merged.json` was **copied over** `output_files/cluster_CL4.grouped.json` (pre-pilot file
backed up to `cluster_CL4.grouped.PREPILOT.bak`; git-tracked, revertible) and ingested into the running
dev stack (`kg-dev-*` Docker) via `POST /cluster4/populate` (route prefix is **`/cluster4`**, not `/cl4`).

- **Graph (`GET /cluster4/nodes`):** 79 Call nodes, **`technology_readiness_level` on 53** (was 0),
  **15 `SPACE-03` calls**, `content_source` = {merged 62, document 15, api 2}.
- **UI driven** (headless Chrome via puppeteer-core; Cytoscape is canvas so navigation drives the cy
  instance's `tap` events): Cluster 4 → **"Space (Work Programme)"** destination (LEVEL 3) → a Space topic
  card renders the document data — `HORIZON-CL4-2027-SPACE-03-71` "Quantum Space Gravimetry topic",
  **Forthcoming**, **PLANNED — ON OFFER (WORK PROGRAMME)**, budget €14–15M / €29.2M / 2 projects, RIA, and
  a **TECHNOLOGY READINESS LEVEL** section ("TRL 4-6 … ISO 16290:2013"). CORDIS half shows the honest
  empty state. Screenshot: `cl4-pilot-ui-space-topic.png`.

Full path verified end-to-end: **PDF → merge → Neo4j → API → live UI.** Nothing committed — production
`cluster_CL4.grouped.json` is a working-tree change; revert with `git checkout --` (or restore the .bak).

## Minor follow-ups seen in the UI

- The `EXPECTED EU CONTRIBUTION` field renders the raw string `14000000 - 15000000` while MIN/MAX render
  formatted `14 000 000 €` — a cosmetic UI formatting gap, not a data issue.
- `min_contribution` ingested as a string (`"14000000"`); pre-existing `min__contribution` typo on the
  API-side CL4 calls still drops their numeric min (productionisation item, already noted).
