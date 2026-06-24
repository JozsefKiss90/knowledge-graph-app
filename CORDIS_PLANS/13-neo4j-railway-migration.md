# 13 — Migrate Neo4j (work programmes + CORDIS) from Aura to a self-hosted Railway container

## Goal

Move the **entire** Neo4j database — both the Horizon Europe / DEP / Erasmus / WIDERA work-programme graph **and** the CORDIS enrichment — off Neo4j Aura and onto **one self-hosted Neo4j Community container on Railway**, in the same project as the existing backend + frontend services.

This keeps the two datasets in **one graph** (which the dashboard's cross-dataset Cypher requires — see the `(:Call)-[:HAS_FUNDED_PROJECT]->(:CordisProject)` traversals), removes the Aura free-tier node cap that currently blocks CORDIS, and cuts hosting cost from ~$131/mo (AuraDB Professional) to ~$25–65/mo (Railway).

### Why this is low-risk for our code
- `backend/database.py:21` is the **only** `GraphDatabase.driver()` call. It reads `NEO4J_URI` from env and passes it through unmodified — it does **not** assume `neo4j+s://`/TLS. Switching the scheme is a **config change, not a code change**.
- Every route/builder uses the shared `db` singleton (`from database import db`). Nothing opens its own driver.
- No `CALL apoc` exists in Python; only plain-Cypher `CREATE INDEX … IF NOT EXISTS`. **Community Edition is sufficient** — no Enterprise license.
- The local dev DB already holds both datasets, so seeding Railway is a **dump-and-load of existing data**, not a re-run of the multi-day CORDIS pipeline.

### Outcome / acceptance
- Railway Neo4j service running a **pinned** Neo4j version, data on a **persistent volume at `/data`**, reachable only over **private networking** (`neo4j.railway.internal:7687`).
- Backend on Railway connects to it; `/health/db` returns OK; the dashboard's CORDIS panels render (cross-dataset joins return rows).
- A working **backup** (Railway volume schedule + off-box `neo4j-admin dump`), a tested **rollback** to Aura, and **secrets removed from git**.

---

## Pre-flight decisions (lock these before starting)

| Decision | Recommendation | Notes |
|---|---|---|
| Edition | **Community** (free) | No code uses Enterprise features. |
| Pinned version | One **exact** tag, identical on local-dump-source and Railway target | Never `:latest` for a stateful DB — a pull can trigger an irreversible on-disk store upgrade. |
| Railway plan | **Hobby ($5)** to start; Pro ($20) if you want headroom/seats | DB is always-on, so usage is billed on top. |
| Container RAM | **3–4 GB** (measured: heap 2g + pagecache 512m + ~1.5g OS) | Store is only ~0.5 GB, so a 512m page cache holds the whole working set. |
| Seeding method | **Seed image** (bake `neo4j.dump`, load on first boot) | Cleanest Railway-native load; fits our existing Docker Hub push flow. |
| Internal networking | Private (`*.railway.internal`), Bolt **not** public | `bolt://` (unencrypted) is correct inside Railway's private net. |

---

## Phase 0 — Measure & pin the version (local)

> **Measured 2026-06-24** (container `kg-dev-neo4j-1`, dev volume `kg-dev_neo4j_data`):
> - **Neo4j `2026.02.2`** (the dev `neo4j:latest`; CalVer, not 5.x) → use as `NEO4J_TAG` on both the dump source and Railway.
> - **Store `/data/databases/neo4j` = 481 MB** (data + native indexes ≈ 493 MB; Lucene 0). `/data/transactions/neo4j` = 2.1 GB of tx logs — **excluded** from a dump, so the seed stays ~0.5 GB.
> - **≈341k nodes:** CordisOrganisation 238,099 · CordisProject 101,457 · ResearchField 1,060 · Call 645 · Country 217 · Destination 156 · Document 59 · HEWikiNode 54 · Cluster 18 · Topic 11.
> - **`(:Call)-[:HAS_FUNDED_PROJECT]->(:CordisProject)` = 595,994 edges** → the datasets are one tightly-joined graph (far over Aura Free's ~200k node cap; a physical split would sever ~600k edges).
> - **Memory (4 GB container):** heap 2g, pagecache 512m, ~1.5g OS, + crash-on-OOM. Store is small → a 3–4 GB instance is ample.

1. **Find the current local Neo4j version** (so dump source and target match exactly):
   ```powershell
   docker compose -f docker-compose.dev.yml exec neo4j neo4j --version
   ```
   Measured: **`2026.02.2`**. Use **that exact tag** everywhere below (`NEO4J_TAG`). If you prefer to move to an LTS, upgrade local first, confirm the app still works, then proceed — do **not** dump from one major and load into another.

2. **Measure the store size** (drives RAM sizing):
   ```powershell
   docker compose -f docker-compose.dev.yml exec neo4j du -sh /data/databases/neo4j
   ```
   Then get concrete memory numbers:
   ```powershell
   docker compose -f docker-compose.dev.yml exec neo4j `
     neo4j-admin server memory-recommendation --memory=4g --docker
   ```
   Use its `heap` / `pagecache` output for the Railway env vars in Phase 3.

3. **Confirm only the `neo4j` database exists on Aura** (Community can't hold extra DBs). In the Aura console / Neo4j Browser: `SHOW DATABASES` — expect only `system` + `neo4j`. (We dump from local anyway, but verify Aura has no extra DBs you'd lose.)

4. **Pin the driver** in `backend/requirements.txt` (currently unpinned `neo4j`; note the file is UTF-16 — keep the encoding). Change `neo4j` → `neo4j==5.<minor>` matching the server major. (Also drop the duplicate `python-dotenv` line while here.)

---

## Phase 1 — Secret hygiene (do immediately; independent of migration)

**Verified scope (`git ls-files`):** the **only** secret-bearing file tracked in git is the **root `.env`**, which holds `AURA_DB_PASSWORD` and the live `CORDIS_API_KEY`. The `backend/.env.backend.production`, `backend/.env*`, and `frontend/.env*` files exist on disk but are **already untracked** (ignored) — no git action needed; just keep them ignored. (An earlier review over-stated this; corrected here.)

`.env` is itself already matched by `.gitignore` (`.env` / `.env.*`), so it was force-added or predates the rule — the fix is untrack + rotate. Full step-by-step: **`CORDIS_PLANS/13a-secrets-removal-runbook.md`**. In short:
1. Ensure the values live where they're consumed (Railway backend var + local `backend/.env` for dev), then `git rm --cached .env` and commit (file stays on disk).
2. **Rotate** both exposed secrets — they're in git history, so untracking alone is not remediation: regenerate the `CORDIS_API_KEY` (CORDIS portal) and the Aura password.
3. Optionally purge `.env` from history (`git filter-repo` / BFG) and force-push.

> Standalone value; de-risks the rest (we set Railway vars, not committed files).

---

## Phase 2 — Build the seed image from local data

Goal: a one-shot Docker image that loads our existing local graph into the Railway volume on first boot, then behaves as a normal Neo4j.

1. **Export a consistent dump** from the local DB (Community dump requires the DB **offline**):
   ```powershell
   docker compose -f docker-compose.dev.yml stop neo4j
   docker volume ls   # confirm the volume name, e.g. knowledge-graph-app_neo4j_data
   docker run --rm `
     -v knowledge-graph-app_neo4j_data:/data `
     -v ${PWD}/neo4j-seed:/backups `
     neo4j:$NEO4J_TAG `
     neo4j-admin database dump neo4j --to-path=/backups
   docker compose -f docker-compose.dev.yml start neo4j
   ```
   Produces `./neo4j-seed/neo4j.dump`.

2. **Create the seed image** under `neo4j-seed/`:

   `neo4j-seed/Dockerfile`
   ```dockerfile
   FROM neo4j:${NEO4J_TAG}
   COPY neo4j.dump /seed/neo4j.dump
   COPY seed-entrypoint.sh /seed/seed-entrypoint.sh
   RUN chmod +x /seed/seed-entrypoint.sh
   ENTRYPOINT ["/seed/seed-entrypoint.sh"]
   ```

   `neo4j-seed/seed-entrypoint.sh`
   ```bash
   #!/bin/bash
   set -e
   # Idempotent: only load once. Marker lives on the persistent volume (/data).
   if [ ! -f /data/.seeded ]; then
     echo "Seeding neo4j database from /seed/neo4j.dump ..."
     neo4j-admin database load neo4j --from-path=/seed --overwrite-destination=true
     touch /data/.seeded
     echo "Seed complete."
   else
     echo "Volume already seeded; skipping load."
   fi
   # Hand off to the stock Neo4j entrypoint (sets password from NEO4J_AUTH, starts server)
   exec /startup/docker-entrypoint.sh neo4j
   ```
   - The load runs **before** Neo4j starts (offline file op, satisfies Community's offline-only constraint).
   - The `.seeded` marker on `/data` means redeploys/restarts won't re-load.
   - Verify `/startup/docker-entrypoint.sh` is the official image's entrypoint path for `NEO4J_TAG` (stable across recent images).

3. **Build & push** (reuse the existing Docker Hub account `jozsefkiss90`):
   ```powershell
   cd neo4j-seed
   docker build -t jozsefkiss90/knowledge-graph-neo4j-seed:$NEO4J_TAG .
   docker push jozsefkiss90/knowledge-graph-neo4j-seed:$NEO4J_TAG
   ```

> Note: the image embeds the graph data. Keep the repo private, or after first successful boot (Phase 3) switch the service to the vanilla `neo4j:$NEO4J_TAG` image — the volume is already seeded, so the dump is no longer needed.

---

## Phase 3 — Provision & deploy the Railway Neo4j service

In the **same Railway project** as backend/frontend:

1. **New service → Docker Image** → `jozsefkiss90/knowledge-graph-neo4j-seed:$NEO4J_TAG`.
2. **Attach a Volume** mounted at **`/data`** (start ~10 GB; can grow, never shrink). Without this, every redeploy wipes the graph.
3. **Variables** (use the `_max__size` double-underscore convention; values from Phase 0's memory recommendation):
   ```
   NEO4J_AUTH=neo4j/<strong-password>
   NEO4J_PLUGINS=["apoc"]
   NEO4J_server_memory_heap_initial__size=2g
   NEO4J_server_memory_heap_max__size=2g
   NEO4J_server_memory_pagecache_size=512m
   NEO4J_server_jvm_additional=-XX:+ExitOnOutOfMemoryError
   NEO4J_server_default__listen__address=0.0.0.0
   NEO4J_dbms_security_procedures_unrestricted=apoc.*
   ```
   - APOC isn't load-bearing (no `CALL apoc` in code) but keep it for dev parity. For strict prod hygiene, bake a pinned APOC jar into `/plugins` instead of letting `NEO4J_PLUGINS` download at boot.
   - **IPv6 caveat:** if this Railway environment was **created before Oct 16, 2025**, internal DNS is **IPv6-only** — set `NEO4J_server_default__listen__address=::` instead of `0.0.0.0`, or the backend can't reach it. Verify the environment's age first.
4. **Do not** add a public domain / TCP proxy for Bolt. Leave it private. (Only add one temporarily if you need Neo4j Browser, then remove it.)
5. **Deploy.** Watch logs for "Seeding…" → "Seed complete." → Neo4j "Started." Confirm the volume shows usage.
6. **Sanity-check the data loaded** (one-off, e.g. via `railway ssh` + `cypher-shell`, or a temporary private query):
   ```cypher
   MATCH (n) RETURN labels(n)[0] AS label, count(*) ORDER BY count(*) DESC;
   MATCH (:Call)-[:HAS_FUNDED_PROJECT]->(:CordisProject) RETURN count(*);
   ```
   The second count must be > 0 (proves the cross-dataset edges survived the dump/load).

---

## Phase 4 — Repoint the backend + add resilience

1. **Backend service → Variables** (Railway dashboard, not the committed file):
   ```
   NEO4J_URI=bolt://<neo4j-service-name>.railway.internal:7687
   NEO4J_USER=neo4j
   NEO4J_PASSWORD=<same as NEO4J_AUTH above>
   ENVIRONMENT=production
   ```
   No build-arg or image rebuild is needed — Neo4j config is runtime-only. `build_push_prod.bat` is untouched.

2. **Add a startup connectivity retry** in `backend/database.py` (the driver is lazy and there's no retry today; internal DNS can lag a few seconds after deploy). Wrap `get_driver()` to call `driver.verify_connectivity()` with a short bounded retry loop before returning, so the backend tolerates the DB coming up moments later instead of failing the first query. Keep `connection_timeout=10`.

3. The existing `cron-pinger` already hits `/health/db` (`backend/main.py`), which runs `RETURN 1` — keep it; it doubles as a warm-keeper and connectivity monitor.

---

## Phase 5 — Backups (mandatory — Railway does not back up volumes by default)

1. **Railway volume backup schedule:** enable **Daily** on the Neo4j volume (kept 6 days). Cheap copy-on-write snapshots. Note: a block snapshot is **not** a Neo4j-consistent dump.
2. **Off-box logical dumps:** schedule a periodic `neo4j-admin database dump` (offline window) shipped to object storage (S3/rclone/scp), kept non-world-readable. Because the graph is also reproducible from the ingestion pipeline, this is belt-and-suspenders — but a tested `load` restore is the real DR guarantee.
3. **Write a 5-line restore runbook** and rehearse it once into a throwaway service.

---

## Phase 6 — Cutover & verify

1. Trigger a backend redeploy/restart so it picks up the new `NEO4J_URI`.
2. Verify:
   - `GET /health/db` → 200.
   - Frontend loads; the graph layers render (work-programme path).
   - **CORDIS dashboard panels populate** — `/cordis/portfolio-summary`, `/cordis/funding-by-programme`, `/cordis/related-calls` return rows (these are the cross-dataset joins; non-empty = the single graph is intact).
   - Backend logs show `NEO4J_URI: bolt://…railway.internal` and "Neo4j driver initialized".
3. Monitor RAM/CPU on the Neo4j service for a day; adjust heap/pagecache and the container size if it trends toward the limit (OOM-kill risk if heap+pagecache approach the cap).

---

## Phase 7 — Decommission Aura (only after stable operation)

1. Keep Aura **running and reachable** for a buffer period (e.g. 1–2 weeks) as the rollback target.
2. Once confident: pause, then delete the Aura instance. Remove `AURA_DB_PASSWORD`, `AURA_BACKEND_URL`, and Aura-specific notes. `upload_to_aura.py` can be renamed/retargeted (it's just an HTTP orchestrator against the backend's `/<dataset>/populate` endpoints; it still works against the new DB if you ever need a full rebuild — though prefer dump/load).
3. Optionally promote the seed service to the vanilla `neo4j:$NEO4J_TAG` image (volume already seeded) so the data-bearing seed image isn't kept around.

---

## Rollback

The cutover is a single env-var swap, so rollback is trivial **as long as Aura still exists**:
- Set the backend `NEO4J_URI`/`NEO4J_USER`/`NEO4J_PASSWORD` vars back to the Aura values; redeploy backend.
- The Railway Neo4j service and its volume are untouched, so you can retry later.
- This is why Phase 7 (deleting Aura) is deliberately last and gated on a stable buffer period.

---

## Risk register

| Risk | Severity | Mitigation |
|---|---|---|
| No persistent volume at `/data` | **Critical** | Phase 3 step 2 — attach volume; verify usage grows after seed. |
| `:latest` triggers store-format upgrade | High | Pin `NEO4J_TAG` on both dump source and target (Phase 0). |
| Dump/load version mismatch | High | Same exact tag both sides; load fails loudly if incompatible. |
| Volume loss = data loss (no auto-backup) | High | Phase 5 — Railway schedule **+** off-box dumps; graph also reproducible from pipeline. |
| Legacy IPv6-only internal DNS | Medium | Phase 3 — set listen address to `::`; verify env age. |
| Heap+pagecache > container RAM → OOM-kill | Medium | Phase 0 memory-recommendation; reserve ~1 GB OS headroom; monitor. |
| Committed live secrets | High | Phase 1 — git-remove, move to Railway vars, rotate. |
| Backend boots before DB ready | Low | Phase 4 — startup `verify_connectivity` retry. |
| Community offline-only backup window | Low | Brief scheduled maintenance window for dumps; app traffic is low. |

---

## Work-item checklist

- [ ] P0: record `NEO4J_TAG`, store size, memory recommendation; confirm Aura has only `system`+`neo4j`; pin driver in `requirements.txt`.
- [ ] P1: move secrets to Railway vars, `git rm --cached` the env file, rotate, reconcile `AURA_DB_PASSWORD`.
- [ ] P2: dump local DB; create `neo4j-seed/` (Dockerfile + entrypoint); build & push seed image.
- [ ] P3: create Railway Neo4j service (image, `/data` volume, env vars, private only); deploy; verify seed load + cross-dataset count.
- [ ] P4: set backend `NEO4J_URI` to `*.railway.internal`; add `verify_connectivity` retry to `database.py`.
- [ ] P5: enable Railway volume backup schedule; set up off-box dump job; write restore runbook.
- [ ] P6: redeploy backend; verify `/health/db` + CORDIS dashboard panels; monitor memory.
- [ ] P7: buffer period; then decommission Aura and clean up Aura references.
