# Execution Plan — **Data Backbone: fetch CORDIS via the API → Neo4j**

> Prerequisite that unlocks the other ideas (see `CORDIS_FEATURE_IDEAS.md` → "The data backbone").
> Process: this is the plan checkpoint required before coding (ideas doc §"mandatory process").
> Status: **IMPLEMENTED & VERIFIED (offline)** on branch `cordis`.
>
> **Verification results:**
> - Parser (`cordis_parser.py`) run against a **real** extraction (`…/cybersecurity…_q02/json.zip`)
>   produced **exactly** the known truth: **278 projects**; roles **coordinator 278 / participant 3275 /
>   associatedPartner 378 / thirdParty 208**; every organisation has a country; 278 master-call links;
>   framework programme = HORIZON.
> - Builder (`cordis_builder.py`) preview-ingest over that real data ran clean: 278 projects, 2,291
>   unique organisations (deduped from 4,139 participations), 154 research fields.
> - All four modules `py_compile` + import OK; `/cordis/fetch`, `/ingest-local`, `/stats`, `/area`,
>   `/all` are registered in the FastAPI app.
> - **Not runnable in this environment:** the LIVE fetch (no `CORDIS_API_KEY` set) and actual Neo4j
>   writes (no running DB). Both are ready: set `CORDIS_API_KEY` in the backend env + start Neo4j, then
>   `POST /cordis/fetch {"query": "..."}`.

---

## 0. Goal

A backend module that, given a **research-area search query**, **fetches matching funded projects from
the CORDIS API**, parses the real extraction, and **stores them in Neo4j** as new nodes/relationships
**linked to the app's existing Call nodes**. The frontend then reads CORDIS-derived data through the
backend like any other graph. **No hardcoded/fabricated data; nothing reused from the separate
methodology project** (its extracted files are used only as offline test fixtures to validate the parser).

This backbone is the data source for: topic tags on calls, funded-projects panel, planned-vs-awarded
funding, relatedness filter, funding-history, collaboration network, partner finder, country overlay,
research-field explorer.

---

## 1. The CORDIS API (verified contract)

Base URL `https://cordis.europa.eu/api/dataextractions`. Asynchronous:
1. `GET /getExtraction?query=<q>&key=<KEY>&outputFormat=json&archived=false` → `payload.taskID`.
2. `GET /getExtractionStatus?key=<KEY>&taskId=<id>` → poll until `progress=="Finished"` (case-insensitive)
   **and** `destinationFileUri` present.
3. Download the `destinationFileUri` ZIP → unzip → it contains a nested **`json.zip`** of one
   `project-rcn-*_en.json` per project (+ `information.zip`, `metadata.json`).

Trap (handled): the **request param is `taskId`** (lowercase d); the **response field is `taskID`**
(uppercase). Key is read from env **`CORDIS_API_KEY`**, never logged (redacted). HTTP via `requests`
(already a backend dependency) with timeout + retries. **No key is committed.**

> In this environment `CORDIS_API_KEY` is **not set**, so the live fetch can't run here. The parser and
> ingestion are verified offline against a real extraction; live fetch is ready once the key is set.

## 2. Real project-record structure (verified against actual extractions, not assumed)

Per `project-rcn-*_en.json`:
- **Scalars:** `id`, `acronym`, `title`, `status`, `startDate`, `endDate`, `objective`, `teaser`,
  `totalCost`, `ecMaxContribution`, `contentUpdateDate`.
- **`relations.associations[]`** — each item's `attributes` is a **stringified Python dict**
  (`ast.literal_eval`); discriminate on `attributes.type`:
  - `coordinator` / `participant` / `associatedPartner` / `thirdParty` → **organisation**:
    `legalName`, `shortName`, `id`, `address.country` (ISO, e.g. `DK`), `address.city`,
    `attributes.ecContribution`, `attributes.order`. **Role = `attributes.type`.**
  - `relatedMasterCall` / `relatedSubCall` → `identifier` (the **call code**, e.g. `HORIZON-CL3-2026-01`,
    `ERC-2021-COG`) — the link to the app's Call nodes.
  - `relatedTopic` → `code` (topic code), `id`, `title`, `frameworkProgramme` (`HORIZON`/`H2020`/`FP7`).
- **`relations.categories[]`** — discriminate on `attributes.classification`:
  - `euroSciVoc` → **research field**: `title` (field name) + `code` (hierarchical path).
  - `projectFundingSchemeCategory` → `title` = **funding scheme**.
  - `policyPriorities` → `title` (captured but not central to the backbone).

## 3. Neo4j model (new; all tagged `source = "cordis"`)

Nodes:
- `(:CordisProject {id, acronym, title, status, startDate, endDate, ecContribution, totalCost,
   frameworkProgramme, fundingScheme, masterCall, topicCode, objective, source})`
- `(:CordisOrganisation {id, name, shortName, country, city, source})` — dedup by `id`.
- `(:Country {code, source})` — e.g. `DK` (enables country views).
- `(:ResearchField {code, title, source})` — EuroSciVoc field, dedup by `code` (the path).

Relationships:
- `(:CordisOrganisation)-[:PARTICIPATED_IN {role, ecContribution, order}]->(:CordisProject)`
- `(:CordisProject)-[:CLASSIFIED_AS]->(:ResearchField)`
- `(:CordisOrganisation)-[:REGISTERED_IN]->(:Country)`
- `(:CordisProject)-[:FUNDED_UNDER]->(:Call)` — **created only where `masterCall`/`topicCode` matches an
  existing `Call.call_id`/`identifier`/`topic_id`.** Unmatched calls keep the code as a property for
  later semantic linking (research-field overlap), per the verified constraint that the literal join is
  often empty for the app's 2026 calls.

## 4. Files (new module `backend/routes/new_pipeline/cordis/`)

| File | Purpose |
|---|---|
| `__init__.py` | package marker |
| `cordis_client.py` | `CordisClient` — DET API: create → poll → download → unzip; key from env, redacted; `requests` + retries. Plus `run_extraction(query) -> path_to_json_zip`. |
| `cordis_parser.py` | `parse_extraction(json_zip_path) -> list[dict]` — normalises real project JSON (§2) using `ast.literal_eval`. **Pure, no DB, no network → unit-testable offline.** |
| `cordis_builder.py` | `CordisGraphBuilder` — MERGE the §3 model into Neo4j (`db.query`, `_sanitize_props`, `preview` mode), linking to existing `Call` nodes where codes match. Mirrors `he_wiki_builder.py`. |
| `cordis_routes.py` | `APIRouter(prefix="/cordis")`: `POST /fetch` (live: query→ingest, needs key), `POST /ingest-local` (parse+ingest an already-downloaded extraction — dev/offline), `GET /projects`, `GET /area` (by call code/field), `GET /organisations`, `GET /stats`, `DELETE /all`. |

Plus one line in **`backend/main.py`**: import + `app.include_router(cordis_router)`.

## 5. Step-by-step

1. `cordis_parser.py` first (it's the testable core), grounded in §2.
2. `cordis_client.py` (DET contract §1; key from `CORDIS_API_KEY`, redacted).
3. `cordis_builder.py` (§3 model; defensive `from database import db` like `he_wiki_builder`).
4. `cordis_routes.py` (endpoints §4) + register in `main.py`.
5. **Verify** (§6).

## 6. Verification

- **Parser correctness (offline, real data):** run `cordis_parser.parse_extraction()` against a real
  extraction already on disk (`CORDIS/data/extracted/.../*_q02/json.zip`) and assert the counts match the
  known truth for that extraction — e.g. cybersecurity q02 = **278 projects, 278 coordinators, 3275
  participants** (from the role distribution already observed). This proves the parser reads real CORDIS
  output correctly **without** depending on that project's data in the app.
- **Imports/syntax:** import each backend module (the Neo4j driver is lazy, so import needs no live DB).
- **Live path:** documented as ready; runs once `CORDIS_API_KEY` is set and Neo4j is up (`POST /cordis/fetch`).
- **No ingestion of the methodology project's data into the app** — `ingest-local` is a dev utility,
  clearly labelled; the app's real data comes from `POST /cordis/fetch`.

## 7. Rollback

Delete the `backend/routes/new_pipeline/cordis/` folder and remove the two `main.py` lines. No schema
migration to undo (new labels only); `DELETE /cordis/all` clears any ingested `source="cordis"` data.

## 8. Out of scope (later, their own plans)

Frontend consumption (the actual features), background/async job queue for long extractions, scheduled
refresh, and semantic (research-field) call linking beyond exact code match.
