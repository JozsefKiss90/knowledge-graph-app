# CORDIS go-live — per-source coverage state (Step 2 pre-flight result)

**Status:** ready-for-human (decisions logged 2026-07-07) · **Relates to:** PHASE-PLAN Step 2, ADR-0004,
ADR-0006, `CORDIS_PLANS/13` · **Source:** Step 2 sub-step 1 pre-flight
(`preflight_curated_coverage.py`) run against the local dev graph.

## What the pre-flight found

The local dev Neo4j is **already bulk-populated** — 101,457 `CordisProject`, 238,099
`CordisOrganisation`, ~596k `HAS_FUNDED_PROJECT` edges (matches the 2026-06-24 measurement in
`CORDIS_PLANS/13`). The A2 (`/call-evidence`), B2 (`/area-organisations`) and B5
(`/field-tree` + `/field-calls`) endpoints were verified this session returning **real, rich data**
on a live call (e.g. `HORIZON-HLTH-2026-01-STAYHLTH-03`: 4,023 funded projects, €16.1B EC
contribution, top orgs CNRS/CSIC/CNR; field tree rolls up 101,431 projects across 6 EuroSciVoc roots).
So Step 2's **goal — the Awarded half renders real evidence — is met locally** for the tagged sources.

`tag-calls`/`related_topics` tagging state by source (calls · tagged · area-linked):

| Populated (demo-bearing) | Curated file, still untagged | No curated file |
|---|---|---|
| cluster_1 (38·38), cluster_2 (54), cluster_3 (47), cluster_4 (62/64), cluster_5 (127), cluster_6 (111/113), dep (26), crea (15/20), erasmus (44/61), widera (12/14), infra (21/22) | cef, eic, eie, erc, euratom, msca (~26 subjects) | **horizon_miss** (EU Missions, 32 calls / 31 subjects) |

## Decisions (2026-07-07)

1. **Untagged research sources (cef/eic/eie/erc/euratom/msca) — LEFT EMPTY for now.** They render
   honest ADR-0006 empty states. These are broad instruments (ERC/MSCA/EIC funding schemes, CEF
   infrastructure) where CORDIS evidence is only "thematically related research," low demo value; the
   six clusters carry the four-beat demo. Curated files already exist, so lighting them up later is
   just a live `POST /cordis/tag-calls {"source": …}` run — no code or content work outstanding.
2. **horizon_miss / EU Missions — DEFERRED (out of go-live surface).** It is the **only** source with
   no `curated_queries/<source>.json`, so `POST /cordis/tag-calls {"source":"horizon_miss"}` correctly
   **400s** (the ADR-0004 guard, working as designed). Lighting it up needs ~31 curated,
   adversarially-verified CORDIS queries authored first — a content sub-project gated on a product call
   (is EU Missions in the launch surface?). Its 32 calls show honest empty evidence until then.
3. **Railway seed + cutover (Step 2 sub-step 3) — SEPARATE OPS SESSION.** `CORDIS_PLANS/13` is a
   multi-phase runbook needing Railway + Docker Hub credentials and **production secret rotation**
   (`CORDIS_API_KEY`, Aura password). Not a fire-and-forget; done hands-on in its own session. The
   local graph verified above is the seed source (dump-and-load, not a pipeline re-run).

## Fixed this session

- **erasmus curated-key gap.** The three `ERASMUS-EDU-2026-PI-ALL-INNO-*` calls (Blueprint /
  Education-Enterprises / STEM) all carry the **same** `Call.topic_title`
  "Partnerships for Innovation - Alliances for Innovation", so the tagger groups them as one subject —
  but the curated file only had the three longer per-call names, none of which the tagger ever sees.
  Added the merged short key (+ a note in `erasmus.json`'s `_about`). Takes effect on the next erasmus
  ingest run; until then those 3 calls stay honestly untagged.

## Known data gap (not a curated-file issue)

- **`HORIZON-INFRA-2026-SERV-01-02`** has an empty `name` **and** empty `topic_title` — no subject to
  query — so the tagger correctly skips it (the pre-flight's "infra missing: 1" is this blank subject,
  not a curated-map hole). This is an upstream work-programme load gap (a title-less call), worth a
  separate data-quality look; it is **not** a Step 2 blocker and needs no curated entry.

## Deliverables (in-repo, this session)

- `backend/routes/new_pipeline/cordis/test_cordis_tagger.py` — locks the ADR-0004 guard
  (`.scratch/cordis-ingest/0002`): missing map raises, `allow_raw` passes, unmapped subjects skipped,
  route 400s. 4/4 pass in-container; `py_compile` clean on the tagger + routes (closes the open
  verification in `.scratch/cordis-ingest/0001`).
- `backend/routes/new_pipeline/cordis/preflight_curated_coverage.py` — the read-only per-source
  coverage checker; re-run before any future ingest of a new source.

## To resume the ingest later (per source with a curated file)

```
POST /cordis/tag-calls {"source": "<cef|eic|eie|erc|euratom|msca|erasmus>"}   # live; needs CORDIS_API_KEY
GET  /cordis/tag-status     # inspect which subjects tagged / empty / errored
```
The route invalidates `cordis_cache` in its `finally`, so the dashboard picks up new numbers.
