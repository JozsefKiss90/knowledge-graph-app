# neo4j-seed

One-shot Docker image that **seeds a Railway Neo4j volume** with our existing graph
(work programmes + CORDIS) on first boot, then runs as a normal Neo4j container.

Part of `CORDIS_PLANS/13-neo4j-railway-migration.md` (Phases 2–3).

## Why this exists
Railway gives no SFTP into a volume, and Neo4j **Community** can only load a dump
while the DB is **stopped**. So we bake the dump into an image whose entrypoint runs
`neo4j-admin database load` *before* starting Neo4j, guarded by a `/data/.seeded`
marker so it runs exactly once per volume.

## Order of operations

> **Automated:** from the repo root run **`build_push_seed.bat`** — it runs the dump → build → push in one shot (briefly stopping the dev DB), same as `build_push_prod.bat` does for the app images. The manual steps below are the equivalent if you'd rather run them by hand or tweak a step.

1. **Pin the version** (must match the dump source — plan Phase 0):
   ```
   docker exec kg-dev-neo4j-1 neo4j --version   # -> 2026.02.2
   ```

2. **Produce the dump** from the local DB (Community dump needs the DB stopped):
   ```
   docker stop kg-dev-neo4j-1
   docker run --rm \
     -v kg-dev_neo4j_data:/data \
     -v ${PWD}/neo4j-seed:/backups \
     neo4j:2026.02.2 \
     neo4j-admin database dump neo4j --to-path=/backups
   docker start kg-dev-neo4j-1
   ```
   This writes `neo4j-seed/neo4j.dump` (gitignored).

3. **Build & push** (same Docker Hub account as the app images):
   ```
   cd neo4j-seed
   docker build --build-arg NEO4J_TAG=2026.02.2 \
     -t jozsefkiss90/knowledge-graph-neo4j-seed:2026.02.2 .
   docker push jozsefkiss90/knowledge-graph-neo4j-seed:2026.02.2
   ```

4. **Deploy on Railway** (plan Phase 3): new service from this image, attach a
   volume at `/data`, set the `NEO4J_*` env vars, keep it private (no public Bolt).

## Notes / gotchas
- **Run as root.** The load + the official entrypoint's `chown` need root. On
  Railway set `RAILWAY_RUN_UID=0` for this service. (The official image normally
  starts as root and drops privileges itself.)
- **Same major version both sides.** A dump from 5.x must load into the same (or
  newer) Neo4j major. Pin `NEO4J_TAG` identically on the dump source and here.
- **After the first successful boot** the volume is seeded; you can switch the
  Railway service to the vanilla `neo4j:<tag>` image so you don't carry the
  data-bearing seed image around. The `.seeded` marker also makes redeploys of
  the seed image safe (it won't reload).
- `neo4j.dump` is **gitignored** — a data artifact produced at migration time,
  not committed.
