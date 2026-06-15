# CORDIS Data Extraction API workflow

This document describes how the project talks to the **CORDIS Data Extraction (DET) API**,
the extraction lifecycle, and how downloaded exports become normalised tables in a
reproducible way. The contract here is decoded from the official Swagger
(`WEB-UX Swagger.pdf` in the repo root); no fields are invented.

## Base URL

```
https://cordis.europa.eu/api/dataextractions
```

All endpoints are **GET** except `deleteExtraction` (DELETE). All take **query parameters**.
The top-level response shape is always:

```json
{ "status": true, "payload": { } }
```

`status` is a boolean. An empty/`false` `status`, or a repeated identical error message, is
treated as failure. The client implementation lives in `src/cordis_client.py`
(class `CordisClient`).

## The five endpoints and their parameters

| # | Method | Endpoint                 | Required params                              | Optional params                  | Returns (in `payload`) |
|---|--------|--------------------------|----------------------------------------------|----------------------------------|------------------------|
| 1 | GET    | `/getExtraction`         | `query`, `key`, `outputFormat`               | `archived` (`"true"`/`"false"`, default `"false"`) | creates an extraction; contains `taskID` |
| 2 | GET    | `/getExtractionStatus`   | `key`, `taskId`                              | -                                | `taskID`, `progress`, `query`, `numberOfRecords`, `numberOfRecordsEstimated`, `numberOfProcessedRecords`, `remainingTime`, `averageSpeed`, `destinationFileUri` |
| 3 | GET    | `/listExtractions`       | `key`                                        | -                                | `result` = list of status objects (same shape as #2) |
| 4 | GET    | `/cancelExtraction`      | `key`, `taskId`                              | -                                | `taskID`, `query`/`progress`/`message` |
| 5 | DELETE | `/deleteExtraction`      | `key`, `taskId`                              | -                                | `taskID`, `progress`, `message` |

`outputFormat` is one of `xml`, `csv`, `json`, `xlsx`, `summary`. This project defaults to
`outputFormat=json` and `archived=false`.

## CRITICAL: request param `taskId` vs response field `taskID`

This is a real trap in the API and is handled explicitly in code:

- The **request query parameter** is spelled **`taskId`** (lowercase `d`).
- The **response field** is spelled **`taskID`** (uppercase `ID`).

Concrete example - create an extraction, then poll it:

```
# 1. Create (response field is taskID)
GET /getExtraction?query=cybersecurity&key=<KEY>&outputFormat=json&archived=false
  -> { "status": true, "payload": { "taskID": "abc123", ... } }

# 2. Poll using that id, but the REQUEST param is taskId
GET /getExtractionStatus?key=<KEY>&taskId=abc123
  -> { "status": true, "payload": { "taskID": "abc123", "progress": "Running", ... } }
```

To stay robust, `CordisClient.extract_task_id(payload)` looks for `taskID` first, then
`taskId`, including nested locations, and the client always *sends* the parameter named
`taskId` while *reading* the field named `taskID`.

## Extraction lifecycle

```
create  ->  taskID  ->  poll status until Finished  ->  destinationFileUri (ZIP)  ->  unzip  ->  parse
```

1. **Create.** `create_extraction(query, output_format="json", archived=False)` calls
   `GET /getExtraction`. On non-200 or `status:false` it raises `RuntimeError`. On success
   it returns the `payload`; the task id is read with `extract_task_id`.
2. **Poll.** `poll_until_done(task_id, timeout_s=1800, interval_s=10, on_tick=None)` repeatedly
   calls `get_status(task_id)` (`GET /getExtractionStatus`). It returns the final status dict
   when `progress == "Finished"` (**case-insensitive**) *and* a `destinationFileUri` is
   present. It raises `TimeoutError` on timeout and `RuntimeError` on a clear failure state.
   `progress` is a free-form string; only `"Finished"` is treated as terminal success. Each
   tick is logged (redacted).
3. **Download.** `download_file(url, dest_path)` streams the `destinationFileUri` (a **ZIP**)
   to disk under `data/raw/<topic_id>/<query_id>/`, creating parents. If a plain GET returns
   non-200 it retries **once**, appending `key=<api_key>` as a query param, then raises on
   failure.
4. **Unzip.** The ZIP is expanded into `data/extracted/<topic_id>/<query_id>/`, kept strictly
   separate from the raw download.
5. **Parse.** `parse_exports.py` reads the extracted files and writes normalised CSV tables
   into `data/processed/<topic_id>/<query_id>/` plus a `parse_report.json`.

`extraction_workflow.py` orchestrates steps 1-4 per configured query; the other helper
endpoints are used for housekeeping:

- `list_extractions()` -> `payload.result` (default `[]`) - inspect existing tasks.
- `cancel_extraction(task_id)` - stop a running extraction.
- `delete_extraction(task_id)` - remove a finished/cancelled extraction (DELETE).

## Polling and timeouts

- Default poll interval: **10 s**; default overall timeout: **1800 s** (30 min). Both are
  parameters of `poll_until_done`.
- Polling **always stops on timeout** (`TimeoutError`) so a stuck task cannot hang the run.
- Progress is logged each tick using `numberOfProcessedRecords` /
  `numberOfRecordsEstimated`, `progress`, `remainingTime` and `averageSpeed` from the status
  payload - all passed through redaction first.

## Networking, retries and redacted responses

- All HTTP goes through an internal `_request(method, endpoint, params)` helper using the
  `requests` library, with a **timeout** and **up to 3 retries with backoff** on network
  errors and 5xx responses.
- When `save_responses=True` (the default), each raw JSON response is dumped to
  `outputs/logs/api_responses/<endpoint>_<timestamp>.json` **after the API key is redacted**.
- All logging passes through `utils.redact_key`, so the key value and any `key=<value>`
  query parameter become `***REDACTED***`. **The API key is never printed or logged.**
- The key itself is read at runtime from `ROOT/.env` via `utils.get_api_key()`; if it is
  missing or blank the program fails with a clear, actionable message pointing at
  `.env.example`. There is no key committed to the repo.

## Parsing exports into normalised tables

`parse_exports.py` reads each extracted export defensively (`dict.get` everywhere; missing
values become empty string / `None`; never crash on absent keys) and writes these CSVs per
query, each **always with a header even if zero rows**:

- `projects.csv` - one row per project (`project_id`, `acronym`, `title`, `status`,
  `frameworkProgramme`, `fundingScheme`, dates, `topics`, `objective`, `totalCost`,
  `ecMaxContribution`, ...).
- `organizations.csv` - one row per project-organisation
  (`project_id`, `organisation_id`, `name`, `country`, `role`, `activityType`,
  `ecContribution`, ...).
- `euroSciVoc.csv` - EuroSciVoc classifications (`project_id`, `code`, `title`, `path`,
  `classification`).
- `policy_priorities.csv` - `project_id` plus one column per detected policy-priority field
  (dynamic).
- `topics.csv` - `project_id`, `topic`, `title`.

The exact column lists are the cross-module contract; downstream `analyse_topic.py` reads
these exact names. See `data_dictionary_notes.md` for which fields are confirmed from the
Swagger versus assumed at the project-record level.

## Reproducibility

The workflow is built to be re-runnable and auditable:

- **Config-driven queries.** All queries live in `config/cordis_queries.yaml` (and
  `config/pilot_topics.yaml`); nothing is hardcoded in scripts.
- **Strict separation of stages.** `data/raw/` (downloaded ZIPs + per-query
  `metadata.json`), `data/extracted/` (unzipped files) and `data/processed/` (normalised
  CSVs + `parse_report.json`) are never mixed.
- **Run logs.** Every script obtains a logger via `utils.get_logger(...)` writing to
  `outputs/logs/<name>_<timestamp>.log` (console + file), with key redaction.
- **Redacted API responses.** Raw responses are archived under
  `outputs/logs/api_responses/` with the key removed, so a run can be inspected later.
- **No-data mode.** With no `.env`/key and no downloads, the parse/analyse/evidence stages
  detect the absent inputs and emit valid empty/placeholder outputs marked
  "pending live extraction" instead of failing.
- **Reusable run IDs.** Task IDs returned by `getExtraction` are recorded in each query's
  `metadata.json`, so a run can be resumed, polled again, or cleaned up via
  `cancelExtraction` / `deleteExtraction`.
