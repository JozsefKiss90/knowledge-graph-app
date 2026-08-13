# Restore Plan — recreate the dev stack and repopulate all lost data

> ## ✅ EXECUTED 2026-07-14 — Path A (dump restore) + widera gap-fill
> The dev stack was rebuilt and the data restored. Outcome:
> - Pinned `docker-compose.dev.yml` neo4j → `neo4j:2026.02.2` (was `latest`); brought the stack up on a
>   fresh volume `knowledge-graph-app-dev_neo4j_data`; loaded `neo4j-seed/neo4j.dump` (50 files / 2.475 GiB).
> - **The Jun-24 dump was far more complete than the old planning docs implied** — it restored
>   **101,457 CORDIS projects / 238k orgs / 557 tagged calls**, with **0 untagged calls in every source that
>   was ever tagged** (all 6 clusters + dep/crea/erasmus/cef/euratom/infra). So the big `tag-calls` sweep in
>   Path B was **not needed** — "all CORDIS data" came back with the dump.
> - Ran `tag-calls {widera, only_untagged}` to fill widera's 2 stragglers → now 14/14 tagged (+2,182 projects).
>   Final: **101,505 projects · 559 calls with evidence**. Frontend/backend/neo4j all healthy.
> - **Left untagged by choice** (were never tagged even in the dump): `eic/eie/erc/msca` (20 calls; docs call
>   field-tagging these instruments "meaningless") and `missions`/`horizon_miss` (32 calls; **no curated file**).
> - **Known staleness (not addressed):** the base graph is the Jun-24 shape, so the **Jul-9 CL3/CL4 TRL /
>   doc-merge enrichment is NOT present** (doc topics won't show a TRL section). Run **Path C** for CL3/CL4 if
>   that's wanted — it forces a re-tag of those clusters. Also: the `neo4j:2026.02.2` pin is **uncommitted**.


> **Situation.** The `frontend`, `backend`, and `neo4j` containers were destroyed **and** the Neo4j
> data volume went with them. Because the volume held the graph, everything in Neo4j is gone:
> the base work‑programme structure (every programme's Cluster→Destination→Call subgraph) **and**
> the entire CORDIS layer (projects, organisations, countries, research fields, the
> `HAS_FUNDED_PROJECT` links, and the `related_topics`/`keywords` call tags produced by
> `/cordis/tag-calls`).
>
> The **code and the source data files are untouched** — the grouped JSONs in
> `backend/routes/new_pipeline/output_files/`, the curated CORDIS query files in
> `.../cordis/curated_queries/`, and a **full Neo4j dump** at `neo4j-seed/neo4j.dump` all survive.
> So this is a data‑restore job, not a rebuild-from-nothing.

---

## TL;DR — which path to take

| | **Path A — Restore the dump** | **Path B — Rebuild from source** |
|---|---|---|
| What it does | Loads `neo4j-seed/neo4j.dump` into a fresh volume | `populate` every programme, then re‑run `tag-calls` for every source |
| Time | **~5–15 min** | **~1 working day** (CORDIS extractions are minutes each) |
| CORDIS API quota | None | **Consumes your full quota** (hundreds of extractions) |
| Data freshness | **As of the dump (2026‑06‑24)** — stale | **Current** (uses today's grouped files + live CORDIS) |
| Risk | Missing the Jul‑9 CL1–CL4 regen + TRL/doc‑merge enrichment; missing any CORDIS tagging done after Jun 24 | None (authoritative), but long and quota‑heavy |

**Recommendation:** **Path A first** to get the stack back online in minutes with a complete, internally
consistent graph. Then, only if you need the recent CL1–CL4 doc‑merge enrichment (TRL etc.) or CORDIS
coverage newer than Jun 24, apply **Path C (top‑up)**. Reserve **Path B** for when you specifically want a
from‑source‑of‑record graph or don't trust the dump.

> **Why the dump is stale.** It was produced 2026‑06‑24 (see `neo4j-seed/README.md` /
> `CORDIS_PLANS/13`). Since then the CL1–CL4 grouped files were regenerated on **2026‑07‑09**
> (`git log` on `cluster_CL{1..4}.grouped.json`) and the CL3/CL4 doc‑merge added TRL — none of which
> is in the Jun‑24 dump. Everything older than that (CL5, CL6, non‑cluster programmes, and the ~12k‑project
> CORDIS pool, which is historical and doesn't change) is fine to take from the dump.

---

## 0. Prerequisites (all paths)

1. **Docker Desktop running.**
2. **Repo root:** `C:\Code\knowledge-graph-app`, dev compose file `docker-compose.dev.yml`, project name
   `knowledge-graph-app-dev` (from `deploy_dev.bat`).
   - ⚠️ Note a naming inconsistency: `build_push_seed.bat` hardcodes `kg-dev-neo4j-1` /
     `kg-dev_neo4j_data`, implying the stack has at times been run under `-p kg-dev`. **Confirm the
     real names before running any volume command** (Step 1).
3. **CORDIS_API_KEY** — present in `backend/.env`, `backend/.env.backend.development`,
   `backend/.env.backend.production` (verified). Required only for Paths B/C (re‑tagging); Path A needs
   no key.
4. **Neo4j version pin.** The dump was taken from **Neo4j 2026.02.2** and production runs that exact tag.
   `docker-compose.dev.yml` currently uses `neo4j:latest`. For a clean dump load, **pin dev to
   `neo4j:2026.02.2`** (see Path A, Step 2). A dump only loads into the same or a newer major.

---

## 1. Confirm the actual container/volume names

```powershell
docker ps -a --filter "name=neo4j"          # find the neo4j container name (if any survived)
docker volume ls | Select-String neo4j_data # find the data volume name
```
Expect one of: `knowledge-graph-app-dev_neo4j_data` (matches `deploy_dev.bat`) **or**
`kg-dev_neo4j_data` (matches `build_push_seed.bat`). Use whatever actually exists in the commands below —
referred to as `<VOLUME>` and the compose project as `<PROJECT>` (`knowledge-graph-app-dev`).

If the volume still exists and you want a truly clean slate, remove it first:
```powershell
docker compose -p <PROJECT> -f docker-compose.dev.yml down -v --remove-orphans
```

---

## Path A — Restore from the seed dump (recommended, fast)

Gets the whole graph back exactly as of 2026‑06‑24. Mirrors the dump procedure in
`build_push_seed.bat`, run in reverse (load instead of dump).

**A1. Pin the Neo4j image to match the dump.** Edit `docker-compose.dev.yml`:
```yaml
  neo4j:
    image: neo4j:2026.02.2   # was neo4j:latest — match the dump's major version
```

**A2. Build images and create the containers + fresh volume:**
```powershell
docker compose -p <PROJECT> -f docker-compose.dev.yml up -d --build
```

**A3. Stop Neo4j (Community can only load a dump while the DB is stopped):**
```powershell
docker compose -p <PROJECT> -f docker-compose.dev.yml stop neo4j
```

**A4. Load the dump into the volume** (one‑off admin container; `${PWD}` must be the repo root):
```powershell
docker run --rm `
  -v <VOLUME>:/data `
  -v "${PWD}/neo4j-seed:/backups" `
  neo4j:2026.02.2 `
  neo4j-admin database load neo4j --from-path=/backups --overwrite-destination=true
```

**A5. Start Neo4j again:**
```powershell
docker compose -p <PROJECT> -f docker-compose.dev.yml start neo4j
```

**A6. Verify** (see the [Verification](#verification-checklist) section). Expected ballpark from the dump:
~341,776 nodes / ~595,994 `HAS_FUNDED_PROJECT` edges; `/cordis/stats` ≈ 12k projects / 42k orgs.

> If you're **done** after Path A, stop here. Only continue to Path C if you need the newer data.

---

## Path C — Top‑up after a dump restore (optional)

Use this when Path A is in place but you want the **2026‑07‑09 CL1–CL4 enrichment** (regenerated grouped
files + TRL/doc‑merge) and/or CORDIS coverage newer than the dump. It re‑does only the changed clusters,
not the whole graph.

> ⚠️ **Footgun:** `DELETE /clusterN/all` detach‑deletes that cluster's Call nodes, which **also drops the
> dump's `HAS_FUNDED_PROJECT` links and CORDIS tags for those calls**. So re‑populating a cluster forces a
> re‑tag of that cluster. That's why Path C is scoped to the few clusters that actually changed
> (CL1–CL4), not all of them.

For each of `cluster1, cluster2, cluster3, cluster4` (prefix `/clusterN`, source `cluster_N`):
```powershell
# 1. Re-populate the base subgraph from the current grouped file (delete-first because ids may change)
curl.exe -s -X DELETE http://localhost:8000/cluster3/all
curl.exe -s -X POST http://localhost:8000/cluster3/populate -H "Content-Type: application/json" -d '{\"preview\": false}'

# 2. Re-tag CORDIS for that source (background job; see Path B Step B3 for monitoring)
curl.exe -s -X POST http://localhost:8000/cordis/tag-calls -H "Content-Type: application/json" -d '{\"source\": \"cluster_3\", \"top_n\": 6, \"ingest_projects\": true}'
```
CL5, CL6, all non‑cluster programmes, and the bulk CORDIS project pool stay as restored from the dump.

> **Uncommitted CL3 note.** `output_files/cluster_CL3.grouped.json` has **working‑tree changes** (per
> `git status`) plus untracked merge artifacts in `.scratch/wp-doc-ingest/` (`cluster_CL3.merged.json`,
> `cluster_CL3.grouped.PREPILOT.bak`). Whatever is on disk now is what `populate` will ingest — confirm
> it's the version you want (the wp‑doc `RUNBOOK.md` step 3 "promote" copies the merged file over the
> grouped file) before running Step 1 above.

---

## Path B — Full rebuild from source (authoritative, slow)

Skip the dump entirely and reconstruct the graph from the committed source files + live CORDIS. Use this
if you distrust the dump or want a guaranteed‑current, from‑source graph. **Budget ~1 working day and your
CORDIS API quota.**

**B1. Bring the stack up on a fresh volume** (the `neo4j:latest` pin is fine here — nothing is being
loaded):
```powershell
docker compose -p <PROJECT> -f docker-compose.dev.yml down -v --remove-orphans
docker compose -p <PROJECT> -f docker-compose.dev.yml up -d --build
# health
curl.exe -s http://localhost:8000/            # {"status":"OK"}
curl.exe -s http://localhost:8000/health/db   # {"status":"ok"}
```

**B2. Populate every programme's base subgraph.** Each endpoint has built‑in default paths (the grouped +
summaries files under `output_files/`, all confirmed present), so an empty body works. The volume is
fresh, so no delete‑first is needed. Order doesn't matter.

```powershell
$base = "http://localhost:8000"
$progs = @(
  "cluster1","cluster2","cluster3","cluster4","cluster5","cluster6",  # thematic clusters
  "dep","crea","widera","erasmus","cef","euratom",                    # non-cluster programmes
  "eic","eie","erc","infra","msca","missions"                         # bottom-up / other
)
foreach ($p in $progs) {
  Write-Host "Populating $p ..."
  Invoke-RestMethod -Method Post -Uri "$base/$p/populate" -ContentType "application/json" -Body '{"preview": false}'
}
```
(See the [Appendix](#appendix--programme--source-inventory) for the prefix→source→grouped‑file mapping.)

Spot‑check a couple: `curl.exe -s "http://localhost:8000/cluster3/nodes"` → `count` > 0.

**B3. Re‑tag CORDIS for every source with a curated query file.** This is the long, quota‑heavy part.
Each `tag-calls` call **returns immediately** and runs a **background** job that processes the source's
subjects **sequentially** (one CORDIS extraction each, minutes apiece). **Run ONE source at a time** —
CORDIS caps stored extractions, so parallel runs risk hitting the cap (per `CORDIS_PLANS/07`).

Recommended order (small → large, per `CORDIS_PLANS/07`): `cluster_1 → cluster_2 → cluster_4 →
cluster_6 → cluster_5 → cluster_3`, then the non‑cluster programmes.

For each source:
```powershell
# kick off (this is exactly the command that originally populated the tags)
curl.exe -s -X POST http://localhost:8000/cordis/tag-calls -H "Content-Type: application/json" `
  -d '{\"source\": \"cluster_1\", \"top_n\": 6, \"ingest_projects\": true, \"only_untagged\": true}'
# -> {"status":"started","source":"cluster_1","curated_subjects":38,...}
```
- `curated_subjects` must be **non‑zero** and match the [Appendix](#appendix--programme--source-inventory)
  counts. `0` means the curated file is missing/misnamed — **stop and fix**, or the tagger would mis‑tag.
- `only_untagged: true` makes each run **resumable** — it skips subjects already tagged, so a re‑run only
  fills gaps (safe to re‑issue after a failure).

**Monitor** (the HTTP call is fire‑and‑forget — watch DB state, not the response):
```powershell
curl.exe -s http://localhost:8000/cordis/tag-status   # last run: running / finished / error + per-subject detail
curl.exe -s http://localhost:8000/cordis/stats        # global pool grows as projects ingest; poll until it plateaus
```
Only start the next source once `tag-status` shows `finished` (or `stats` has plateaued) for the current one.

**Sources with curated query files** (candidates for tagging): the six clusters
(`cluster_1`…`cluster_6`) plus `dep, crea, widera, erasmus, cef, euratom, eic, eie, erc, infra, msca`.

> **Which sources to actually tag?** The thematic clusters + `widera` are the highest‑value (WIDERA *is*
> Horizon Europe → best coverage). `dep/crea/erasmus` deployment/culture/education subjects often return
> few/zero CORDIS projects (honest, expected). The bottom‑up areas (`erc, msca, eic, infra, eie`) were
> flagged "out of scope by design" for field tagging in `CORDIS_PLANS/07` even though curated files were
> later authored — tag them only if you know they were live before the wipe. `missions` has **no** curated
> file, so it can't be tagged (it stays base‑only). The exact post‑Jun‑24 tagging set isn't recorded in
> any artifact, so if in doubt, restore the dump (Path A) instead of guessing here.

---

## Verification checklist

Backend + DB health:
```powershell
curl.exe -s http://localhost:8000/            # {"status":"OK"}
curl.exe -s http://localhost:8000/health/db   # {"status":"ok"}
```

Base graph (per programme — non‑zero counts):
```powershell
curl.exe -s "http://localhost:8000/cluster3/nodes"   # {"count": <expected calls>, ...}
```
Expected call counts (from `CORDIS_PLANS/07`, for sanity): CL1 ≈ 38, CL2 ≈ 54, CL4 ≈ 64, CL5 ≈ 127,
CL6 ≈ 113 (CL3 ≈ 44–47).

CORDIS layer:
```powershell
curl.exe -s http://localhost:8000/cordis/stats             # projects / organisations / countries / fields
curl.exe -s "http://localhost:8000/cordis/call-evidence?call_id=<some-tagged-call-id>"  # A2 panel data
curl.exe -s http://localhost:8000/cordis/portfolio-summary # F1 KPI band (non-zero once linked)
```

UI: open **http://localhost:3001**, drill Pillar → Programme → Destination → Call, and confirm a tagged
call shows its funded‑projects panel (A2) and field/topic chips (A1). Neo4j browser:
**http://localhost:7474** (`neo4j` / `password`).

> **Cache note.** CORDIS read endpoints are server‑cached and every mutation invalidates the cache in a
> `finally` (`cordis_cache.py`). After a **dump restore** (Path A) the process starts fresh so the cache is
> empty — no action needed. If numbers ever look stale after a manual DB change, restart the backend
> container to clear the in‑process cache.

---

## Gotchas (carried over from the runbooks)

- **Neo4j version match (Path A):** load only into the same or a newer major. Pin dev to `neo4j:2026.02.2`
  to match the dump and production.
- **Delete‑before‑populate whenever call ids may change** (Path C): a bare `populate` MERGE would leave
  old‑id nodes as duplicates. A fresh volume (Path B) needs no delete.
- **`tag-calls` needs the base calls to exist first** — it links `(:Call)-[:HAS_FUNDED_PROJECT]->`. Always
  populate (B2) before tagging (B3).
- **One CORDIS source at a time** — the extraction cap makes parallel tagging fail.
- **Route prefix is `/clusterN`, not `/clN`;** CORDIS source strings are lowercase (`cluster_3`, `dep`,
  `widera`, …), not the uppercase cluster ids (`CL3`).
- **`neo4j.dump` is gitignored** — it's a local artifact. If it's ever missing, it can only be regenerated
  from a live DB (`build_push_seed.bat`), so don't delete it.

---

## Appendix — programme & source inventory

| Populate prefix | `source` | Base grouped file (`output_files/`) | CORDIS curated file? | Curated subjects |
|---|---|---|---|---|
| `/cluster1` | `cluster_1` | `cluster_CL1.grouped.json` | `cluster_1.json` | 38 |
| `/cluster2` | `cluster_2` | `cluster_CL2.grouped.json` | `cluster_2.json` | 54 |
| `/cluster3` | `cluster_3` | `cluster_CL3.grouped.json` | `cluster_3.json` | 44 |
| `/cluster4` | `cluster_4` | `cluster_CL4.grouped.json` | `cluster_4.json` | 58 |
| `/cluster5` | `cluster_5` | `cluster_CL5.grouped.json` | `cluster_5.json` | 123 |
| `/cluster6` | `cluster_6` | `cluster_CL6.grouped.json` | `cluster_6.json` | 105 |
| `/dep` | `dep` | `DEP.grouped.json` | `dep.json` | 47 |
| `/crea` | `crea` | `CREA.grouped.json` | `crea.json` | 19 |
| `/widera` | `widera` | `HORIZON-WIDERA.json` | `widera.json` | 13 |
| `/erasmus` | `erasmus` | `ERASMUS.grouped.json` | `erasmus.json` | 24 |
| `/cef` | `cef` | `CEF.grouped.json` | `cef.json` | 3 |
| `/euratom` | `euratom` | `EURATOM.grouped.json` | `euratom.json` | 6 |
| `/eic` | `eic` | `HORIZON-EIC.json` | `eic.json` | 5 |
| `/eie` | `eie` | `HORIZON-EIE.json` | `eie.json` | 5 |
| `/erc` | `erc` | `HORIZON-ERC.json` | `erc.json` | 4 |
| `/infra` | `infra` | `HORIZON-INFRA.json` | `infra.json` | 20 |
| `/msca` | `msca` | `HORIZON-MSCA.json` | `msca.json` | 6 |
| `/missions` | `horizon_miss` | `HORIZON-MISS.json` | — (none) | — |

Notes: subject counts are from `CORDIS_PLANS/07` and the `cordis-noncluster-programmes` notes (may drift ±
a few from the current curated files — trust the `curated_subjects` figure returned by `tag-calls`). The
ROOT → HE_ROOT → PILLAR → Programme scaffolding above the programme level is assembled by the **frontend**
(`NestedGraphController` / `GRAPH_ENDPOINTS`); the backend stores each programme's Cluster→Destination→Call
subgraph, so restoring the per‑programme subgraphs (or the dump) restores everything the backend owns.
