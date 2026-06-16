# Launch Plan — Populate CORDIS data for the remaining clusters (CL1, CL2, CL4, CL5, CL6)

> Status: **READY TO LAUNCH — nothing live has been run.** Branch `cordis`.
> Goal: extend the CORDIS enrichment that already exists for **Cluster 3** to the other five thematic
> Horizon Europe clusters, using the existing `POST /cordis/tag-calls` endpoint. No code changes.

---

## 0. Where we are (verified against the live backend on `:8000`)

- **Mechanism (unchanged):** `POST /cordis/tag-calls {source}` enriches a cluster **only if**
  `backend/routes/new_pipeline/cordis/curated_queries/<source>.json` exists — a hand-reviewed
  *subject → CORDIS-query* map. For each distinct call subject it fetches the curated query from the
  CORDIS DET API, **ingests** the funded projects, **links** every call on that subject to them
  (`(:Call)-[:HAS_FUNDED_PROJECT]->(:CordisProject)`), and **tags** the calls with the dominant
  EuroSciVoc research fields (`related_topics` / `keywords`).
- **Already done:** `cluster_3.json` (44 curated queries) → CL3 fully enriched. Global CORDIS pool today:
  **12,233 projects · 42,275 organisations · 170 countries · 942 fields.**
- **Authored, not yet installed:** verified queries for the other five clusters were drafted +
  adversarially reviewed and saved to **`_cordis_work/workflow_result.json`** (idx → query). Coverage is
  **100%** of distinct subjects:

  | source | theme | distinct subjects | queries authored |
  |---|---|---|---|
  | cluster_1 | Health | 38 | 38 |
  | cluster_2 | Culture, Creativity & Inclusive Society | 54 | 54 |
  | cluster_4 | Digital, Industry & Space | 58 | 58 |
  | cluster_5 | Climate, Energy & Mobility | 123 | 123 |
  | cluster_6 | Food, Bioeconomy, Agriculture & Environment | 105 | 105 |
  | **total** | | **378** | **378** |

- **Out of scope (by design):** the bottom-up areas (ERC, MSCA, EIC, Missions, Infra, …). Their calls are
  field-agnostic, so EuroSciVoc tagging would be meaningless (per `01-A1` §2). Excluded unless you ask.

---

## 1. Prerequisites (confirm once, before any launch)

1. Backend up on `:8000` — `curl http://localhost:8000/` → `{"status":"OK"}`. ✅ (already true)
2. Neo4j reachable — `curl http://localhost:8000/health/db` → `{"status":"ok"}`.
3. `CORDIS_API_KEY` set in `backend/.env`. ✅ (CL3's 12k projects prove the live path works)
4. The five clusters' base graphs are loaded (Call nodes exist). ✅ (CL1 38 / CL2 54 / CL4 64 / CL5 127 /
   CL6 113 calls confirmed via `/clusterN/nodes`).

---

## 2. Step 1 — Install the curated query files (local, inert, reversible)

Write the authored queries into the live `curated_queries/` dir (the assembler joins each query back to the
**byte-exact** subject string the tagger looks up, so keys match — no agent-echoed strings trusted):

```powershell
python C:\Code\knowledge-graph-app\_cordis_work\assemble.py
```

Produces `curated_queries/cluster_{1,2,4,5,6}.json` and prints `38/38, 54/54, 58/58, 123/123, 105/105`.
These files are **inert** — nothing fetches until you call `tag-calls`. They are meant to be hand-edited
(`"Edit freely; re-run tagging"`), so review/tweak any query before launching.

**Offline lint (no API spend)** — sanity-check every query before spending quota:

```powershell
python C:\Code\knowledge-graph-app\_cordis_work\lint_queries.py   # (to be added: checks each value
# starts with contenttype=project, balanced quotes/parens, multi-word terms quoted, non-empty)
```

**Optional cheap live spot-check** — validate that a *sample* query actually returns projects, without
touching the graph (`preview` ingests nothing but still does the live fetch):

```powershell
curl -s -X POST http://localhost:8000/cordis/fetch -H "Content-Type: application/json" `
  -d '{"query":"contenttype=project AND (\"gene therapy\" OR \"cell therapy\")","preview":true}'
# -> {"parsed_projects": <n>, ...}  ; n>0 and not an error = the query shape is good
```

---

## 3. Step 2 — Launch order (one cluster at a time)

Run the **smallest cluster first as a pilot**, audit it end-to-end, fix any weak queries, then proceed.
**Do one cluster at a time** — each cluster's job runs its subjects **sequentially** (create→poll→download,
minutes each) and CORDIS caps stored extractions; running several clusters at once risks hitting that cap.

Recommended order (small → large): **cluster_1 → cluster_2 → cluster_4 → cluster_6 → cluster_5.**

Per cluster:

```powershell
# Kick off (returns immediately; the job runs in the background on the server)
curl -s -X POST http://localhost:8000/cordis/tag-calls -H "Content-Type: application/json" `
  -d '{"source":"cluster_1","top_n":6,"ingest_projects":true}'
# -> {"status":"started","source":"cluster_1","curated_subjects":38, ...}
```

`curated_subjects` should equal the table in §0. If it's `0`, the curated file is missing/misnamed — stop
and fix Step 1 (a missing file makes the tagger fall back to raw subjects, which mis-tags — see `01-A1`).

### Time / quota budget (plan for it)
- Each subject ≈ one CORDIS extraction (minutes). Sequential per cluster:
  CL1 ~38, CL2 ~54, CL4 ~58, CL6 ~105, CL5 ~123 extractions → **roughly 1–4 h per large cluster**,
  on the order of a **full working day** for all five. It consumes your CORDIS API quota.

---

## 4. Step 3 — Monitor (the endpoint is fire-and-forget)

The background job's per-run summary (`failed_subjects` etc.) is **not** returned by the HTTP call, so watch
the **database state** instead:

```powershell
# Global pool grows as projects ingest — poll until it plateaus for this cluster
curl -s http://localhost:8000/cordis/stats   # {"projects":..,"organisations":..,"countries":..,"fields":..}
```

**Post-run audit (which subjects succeeded vs. need a better query):** a subject is "done" when its calls have
`related_topics`. Untagged calls = the query returned nothing or failed (over the 25 000-result cap / timeout).

```powershell
# Per-cluster tagged-vs-total (run after stats plateaus)
python C:\Code\knowledge-graph-app\_cordis_work\audit.py cluster_1   # (to be added: tagged N / total,
# lists untagged subjects so you know exactly which queries to refine)
```

Spot-check quality in the app or via `GET /cordis/call-evidence?call_id=<id>` (funded-projects panel data)
and `GET /cordis/call-trend?call_id=<id>` (funding history). Confirm the tags read on-topic (the CL3 bar:
e.g. *Missing persons* → forensic sciences/DNA/law, **not** oncology/nutrition).

---

## 5. Iterate on weak queries

For any untagged/empty subject from the audit:
1. Edit its query in `curated_queries/<source>.json` (broaden a too-narrow AND, or narrow a >25k-cap query).
2. Re-run `tag-calls` for that source — **ingest is idempotent** (`MERGE`), so re-running only adds the
   newly-matched projects and re-tags; it does not duplicate.

---

## 6. Rollback (per cluster) — ⚠ read the area-links footgun

- **Tags only (safe, scoped):** `DELETE http://localhost:8000/cordis/tags?source=cluster_1`
  → removes `related_topics`/`keywords`/`cordis_tag_*` from that cluster's calls.
- **Area links — ⚠ NOT scoped:** `DELETE /cordis/area-links?source=cluster_1` deletes **ALL**
  `HAS_FUNDED_PROJECT` relationships across **every** cluster (including CL3); only the *provenance props*
  are scoped (verified in `cordis_tagger.clear_area_links`). Avoid it unless you intend to rebuild every
  cluster's links (re-run all `tag-calls` afterwards). For a single cluster, prefer just `DELETE /cordis/tags`.
- **Nuclear:** `DELETE /cordis/all` wipes every `source="cordis"` node (projects/orgs/countries/fields) —
  this also removes CL3's data. Last resort only.

The ingested `CordisProject` pool is shared (deduped by id across clusters); deleting one cluster's tags does
not remove projects another cluster also uses.

---

## 7. What lights up in the app once a cluster is populated

Same features that CL3 has today, now for the new cluster's calls:
- **A1** hover tag chips + topic search + Compare topic-overlap (`related_topics`/`keywords`).
- **A2** funded-projects panel (`/cordis/call-evidence`).
- **A6** funding-history trend (`/cordis/call-trend`).
- **B3** related-calls explorer (`/cordis/related-calls`) — richer as more clusters share EuroSciVoc fields.
- **B5** research-field explorer (`/cordis/field-tree`, `/cordis/field-calls`) — the field hierarchy fills out
  across all populated clusters.

---

## 8. Pre-launch checklist

- [ ] Step 1: `assemble.py` run; five files present; counts match §0; queries eyeballed/linted.
- [ ] Prereqs §1 green (`/`, `/health/db`, key set).
- [ ] Pilot **cluster_1** launched; `curated_subjects:38`; stats grew; audit shows high tag coverage.
- [ ] Quality spot-check passes (tags on-topic) before launching the larger clusters.
- [ ] Proceed cluster_2 → cluster_4 → cluster_6 → cluster_5, auditing each.
