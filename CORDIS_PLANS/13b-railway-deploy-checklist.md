# 13b — Railway deploy checklist (paste-through)

Companion to `CORDIS_PLANS/13`. Concrete, in-order steps for the Railway side (Phases 3–7).
Env blocks are formatted for Railway's **service → Variables → Raw Editor** (paste the whole block).

## Fill these placeholders first
| Placeholder | What | Where it must match |
|---|---|---|
| `<STRONG_PASSWORD>` | a NEW Neo4j password you choose (not the dev `password`) | identical in the **Neo4j** `NEO4J_AUTH` and the **backend** `NEO4J_PASSWORD` |
| `<NEO4J_SVC>` | the Railway **service name** you give the Neo4j service (e.g. `neo4j`) | used in the backend `NEO4J_URI` as `<NEO4J_SVC>.railway.internal` |
| `<ROTATED_CORDIS_KEY>` | the regenerated CORDIS API key (after rotation) | backend `CORDIS_API_KEY` |

## Prerequisites (off-Railway, do first)
- [ ] **Rotate** the two exposed secrets (public repo): regenerate `CORDIS_API_KEY` (CORDIS portal) and reset the Aura password (Aura console).
- [ ] **Push the seed image** (needs your Docker Hub login):
  ```
  docker push jozsefkiss90/knowledge-graph-neo4j-seed:2026.02.2
  ```
  (Already built & validated locally — loads the dump on first boot, serves 341,776 nodes / 595,994 edges.)

---

## Step 1 — Create the Neo4j service
- [ ] In the **same Railway project** as backend/frontend: **New → Docker Image**.
- [ ] Image: `jozsefkiss90/knowledge-graph-neo4j-seed:2026.02.2`
- [ ] **Private repo → add registry credentials** (or Railway can't pull it): in the image source settings, provide your Docker Hub **username** + a Docker Hub **access token** (Docker Hub → Account Settings → Personal access tokens — use a token, not your password).
- [ ] Name the service `<NEO4J_SVC>` (e.g. `neo4j`).
- [ ] **Do NOT** add a public domain / TCP proxy (keep Bolt private).

## Step 2 — Attach the volume (critical)
- [ ] Service → **Volumes → New Volume**, mount path **`/data`**, size **~10 GB**.
- [ ] Without this, every redeploy wipes the graph. (Volume can grow later, never shrink.)

## Step 3 — Neo4j service variables (paste into Raw Editor)
```
NEO4J_AUTH=neo4j/<STRONG_PASSWORD>
NEO4J_PLUGINS=["apoc"]
NEO4J_server_memory_heap_initial__size=2g
NEO4J_server_memory_heap_max__size=2g
NEO4J_server_memory_pagecache_size=512m
NEO4J_server_jvm_additional=-XX:+ExitOnOutOfMemoryError
NEO4J_server_default__listen__address=0.0.0.0
NEO4J_dbms_security_procedures_unrestricted=apoc.*
RAILWAY_RUN_UID=0
```
Notes:
- `RAILWAY_RUN_UID=0` lets the seed entrypoint write to the volume (`neo4j-admin load` + chown).
- Memory values are the measured recommendation for a ~3–4 GB instance (store is only ~0.5 GB).
- If your Railway **environment predates Oct 16 2025** (likely for this project), private DNS is **IPv6-only** → change the listen address to `::` (see Troubleshooting).

## Step 4 — Deploy & confirm the first-boot seed
- [ ] Deploy. Watch the service **logs** for:
  ```
  [seed] /data/.seeded not found -> loading 'neo4j' database from /seed/neo4j.dump
  [seed] load complete; wrote marker /data/.seeded
  ```
  then Neo4j `Started.` (first boot takes a few minutes for the ~510 MB load).
- [ ] **Verify the data** — `railway ssh` into the `<NEO4J_SVC>` service, then:
  ```
  cypher-shell -u neo4j -p <STRONG_PASSWORD> "MATCH (n) RETURN count(n);"
  cypher-shell -u neo4j -p <STRONG_PASSWORD> "MATCH (:Call)-[r:HAS_FUNDED_PROJECT]->(:CordisProject) RETURN count(r);"
  ```
  Expect **341776** and **595994**. (Or skip and verify via the backend in Step 6.)

## Step 5 — Repoint the backend (Variables → Raw Editor)
Set/update these on the **backend** service (leave existing OpenAI/SECRET_KEY/etc. untouched):
```
NEO4J_URI=bolt://<NEO4J_SVC>.railway.internal:7687
NEO4J_USER=neo4j
NEO4J_PASSWORD=<STRONG_PASSWORD>
CORDIS_API_KEY=<ROTATED_CORDIS_KEY>
ENVIRONMENT=production
```
- [ ] `bolt://` (unencrypted) is correct over Railway's private network.
- [ ] `CORDIS_API_KEY` must be set here now that root `.env` is untracked.
- [ ] Redeploy the backend (it has a startup connectivity retry, so brief DB-not-ready lag is tolerated).

## Step 6 — Verify cutover
- [ ] Backend logs show `NEO4J_URI: bolt://<NEO4J_SVC>.railway.internal:7687` and `Neo4j connectivity verified`.
- [ ] `GET https://knowledge-graph-backend-production.up.railway.app/health/db` → `{"status":"ok"}`.
- [ ] Open the app → graph layers render **and** the CORDIS dashboard panels populate (e.g. `/cordis/portfolio-summary`, `/cordis/funding-by-programme`, `/cordis/related-calls` return rows = the cross-dataset join works).
- [ ] Watch the Neo4j service memory for a day; bump the instance if it trends toward the limit.

## Step 7 — Backups (Railway does NOT auto-back-up volumes)
- [ ] Neo4j service → Volume → **enable a Daily backup schedule**.
- [ ] (Recommended) add a periodic off-box `neo4j-admin database dump` to object storage; write a 5-line restore runbook and rehearse once.

## Step 8 — (Optional) drop the data-bearing seed image
- [ ] Once data is confirmed, change the Neo4j service image from the seed image to vanilla `neo4j:2026.02.2`. The volume is already seeded and the `.seeded` marker prevents any reload, so this just avoids carrying the dump around. (Keep `RAILWAY_RUN_UID=0` and all other vars.)

## Step 9 — Decommission Aura (after a stable buffer, ~1–2 weeks)
- [ ] Keep Aura reachable as the rollback target first (rollback = revert the backend `NEO4J_*` vars to the Aura values + redeploy).
- [ ] Then pause/delete the Aura instance; remove `AURA_DB_PASSWORD` / `AURA_BACKEND_URL` references.

---

## Troubleshooting
- **Backend can't reach `<NEO4J_SVC>.railway.internal:7687`** (timeout/refused): your env is IPv6-only (legacy). Set `NEO4J_server_default__listen__address=::` on the Neo4j service and redeploy. Also confirm the backend uses the internal hostname, not a public one.
- **Neo4j restart-loops / OOM-killed**: heap + pagecache + ~1.5 GB OS must stay under the instance RAM. On a 4 GB instance the values above fit; if you size down, lower heap first.
- **Seed didn't load / empty DB**: check the volume is actually mounted at `/data` and `RAILWAY_RUN_UID=0` is set; logs should show the `[seed]` lines. If `/data/.seeded` exists from a failed attempt, the load is skipped — wipe the volume and redeploy to re-seed.
- **APOC errors**: not load-bearing (no `CALL apoc` in app code); safe to ignore, or remove `NEO4J_PLUGINS` if the boot-time download is flaky.
