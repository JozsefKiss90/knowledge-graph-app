# Data dictionary notes

This document lists the CORDIS fields the project relies on, split into:

- **(a) CONFIRMED** - fields decoded directly from the official Swagger for the CORDIS Data
  Extraction (DET) API (`WEB-UX Swagger.pdf` in the repo root). These are the extraction
  *task* fields and *create* parameters.
- **(b) ASSUMED / TO BE CONFIRMED** - the *project-record* fields that `parse_exports.py`
  reads out of a downloaded export. **None of these have been verified against real
  downloaded data**, because at build time there is no `.env` and no API key, so no live
  extraction has been run. They are best-effort assumptions based on the task description and
  general CORDIS structure, and **must be reconciled after the first live extraction.**

> Rule followed here: no fields are invented beyond what the task / Swagger imply, and
> everything uncertain is explicitly marked **ASSUMED**.

---

## (a) CONFIRMED - DET extraction API (from Swagger)

### Create parameters (`GET /getExtraction`)

| Param          | Status    | Notes |
|----------------|-----------|-------|
| `query`        | CONFIRMED | Required. The extraction query string. |
| `key`          | CONFIRMED | Required. API key; read from `.env` at runtime, never logged, always redacted. |
| `outputFormat` | CONFIRMED | Required. One of `xml`, `csv`, `json`, `xlsx`, `summary`. Project default `json`. |
| `archived`     | CONFIRMED | Optional. `"true"` / `"false"`; default `"false"`. |

### Status / list payload fields (`GET /getExtractionStatus`, `GET /listExtractions`)

These are the fields of each status object (in `listExtractions` they appear inside
`payload.result[]`):

| Field                         | Status    | Notes |
|-------------------------------|-----------|-------|
| `taskID`                      | CONFIRMED | **Response** field, uppercase `ID`. (Request param is `taskId`, lowercase `d` - see `cordis_api_workflow.md`.) |
| `progress`                    | CONFIRMED | Free-form string; `"Finished"` (case-insensitive) is terminal success. |
| `query`                       | CONFIRMED | Echo of the submitted query. |
| `numberOfRecords`             | CONFIRMED | Total records for the extraction. |
| `numberOfRecordsEstimated`    | CONFIRMED | Estimated total (used for progress display). |
| `numberOfProcessedRecords`    | CONFIRMED | Records processed so far. |
| `remainingTime`               | CONFIRMED | Estimated time remaining. |
| `averageSpeed`                | CONFIRMED | Processing speed. |
| `destinationFileUri`          | CONFIRMED | URI of the result **ZIP**; present when finished; downloaded by the client. |

### Top-level envelope and other endpoints

| Item                                   | Status    | Notes |
|----------------------------------------|-----------|-------|
| `status` (bool) + `payload` (object)   | CONFIRMED | Top-level shape of every response. |
| `cancelExtraction` payload (`taskID`, `query`/`progress`/`message`) | CONFIRMED | Housekeeping. |
| `deleteExtraction` payload (`taskID`, `progress`, `message`)        | CONFIRMED | DELETE method. |

Base URL (CONFIRMED): `https://cordis.europa.eu/api/dataextractions`.

---

## (b) ASSUMED / TO BE CONFIRMED - project-record fields read by `parse_exports.py`

The DET API returns an archive of **project records**; the *internal structure* of those
records is **not specified in the extraction Swagger** and has **not been seen against real
data**. Everything in this section is **ASSUMED** and read defensively (`dict.get`
everywhere; missing -> empty string / `None`; never crash). After the first successful
extraction, open an actual export and reconcile these names; rename in `parse_exports.py` and
update the normalised-column contract if they differ.

### `projects.csv` (one row per project) - ASSUMED source fields

| Normalised column     | Assumed CORDIS source           | Status  |
|-----------------------|----------------------------------|---------|
| `project_id`          | project `id` / `rcn`             | ASSUMED |
| `rcn`                 | `rcn`                            | ASSUMED |
| `acronym`             | `acronym`                       | ASSUMED |
| `title`               | `title`                         | ASSUMED |
| `status`              | `status`                        | ASSUMED |
| `startDate`           | `startDate`                     | ASSUMED |
| `endDate`             | `endDate`                       | ASSUMED |
| `frameworkProgramme`  | `frameworkProgramme`            | ASSUMED |
| `fundingScheme`       | `fundingScheme`                 | ASSUMED |
| `masterCall`          | `masterCall`                    | ASSUMED |
| `subCall`             | `subCall`                       | ASSUMED |
| `topics`              | `topics`                        | ASSUMED |
| `objective`           | `objective`                     | ASSUMED |
| `keywords`            | `keywords`                      | ASSUMED |
| `totalCost`           | `totalCost`                     | ASSUMED |
| `ecMaxContribution`   | `ecMaxContribution`             | ASSUMED |
| `contentUpdateDate`   | `contentUpdateDate`             | ASSUMED |

### `organizations.csv` (one row per project-organisation) - ASSUMED source

Assumed to come from a nested **`relations.associations`** (organisation associations) block
on each project record.

| Normalised column   | Assumed CORDIS source                         | Status  |
|---------------------|------------------------------------------------|---------|
| `project_id`        | parent project id                              | ASSUMED |
| `project_acronym`   | parent project `acronym`                       | ASSUMED |
| `organisation_id`   | association `id`                               | ASSUMED |
| `name`              | association `name` / `legalName`               | ASSUMED |
| `shortName`         | association `shortName`                         | ASSUMED |
| `country`           | association `country` (ISO code, e.g. `HU`)    | ASSUMED |
| `city`              | association `city`                             | ASSUMED |
| `role`              | association `role` (e.g. coordinator/participant) | ASSUMED |
| `order`            | association `order`                            | ASSUMED |
| `activityType`      | association `activityType`                      | ASSUMED |
| `ecContribution`    | association `ecContribution`                    | ASSUMED |
| `totalCost`         | association `totalCost`                          | ASSUMED |

### `euroSciVoc.csv` (EuroSciVoc classifications) - ASSUMED source

Assumed to come from a nested **`relations.categories`** block (EuroSciVoc taxonomy).

| Normalised column | Assumed CORDIS source        | Status  |
|-------------------|-------------------------------|---------|
| `project_id`      | parent project id             | ASSUMED |
| `code`            | category `code`               | ASSUMED |
| `title`           | category `title`              | ASSUMED |
| `path`            | category `path`               | ASSUMED |
| `classification`  | category `classification`     | ASSUMED |

### `policy_priorities.csv` - ASSUMED source

`project_id` plus **one dynamic column per detected policy-priority field** (e.g.
`policyPriority` codes / AI / digital / climate / biodiversity). The presence, names and
structure of these fields are **ASSUMED** (likely under a `policyPriorities` element); the
parser discovers columns at runtime and always writes at least `project_id`.

### `topics.csv` - ASSUMED source

| Normalised column | Assumed CORDIS source | Status  |
|-------------------|------------------------|---------|
| `project_id`      | parent project id      | ASSUMED |
| `topic`           | topic `code`           | ASSUMED |
| `title`           | topic `title`          | ASSUMED |

---

## Reconciliation note

The DET extraction *task* fields in section (a) are reliable (Swagger-confirmed). The
*project-record* fields in section (b) are **not yet verified** - there is no `.env`/API key
at build time, so no real export has been downloaded. The pipeline runs in `no_data` mode
until then. **First action after a live extraction:** inspect one downloaded export, confirm
or correct the assumed field names and nesting paths (`relations.associations`,
`relations.categories`, `policyPriorities`, etc.), and update `parse_exports.py` and the
column contract accordingly. Until then, treat every section-(b) field as provisional.
