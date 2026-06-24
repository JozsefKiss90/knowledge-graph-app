#!/bin/bash
set -euo pipefail

# One-time, idempotent seed. The marker lives on the persistent /data volume,
# so only the first boot of a fresh volume runs the load; redeploys skip it.
if [ ! -f /data/.seeded ]; then
  echo "[seed] /data/.seeded not found -> loading 'neo4j' database from /seed/neo4j.dump"
  neo4j-admin database load neo4j --from-path=/seed --overwrite-destination=true
  touch /data/.seeded
  # Ensure the neo4j user owns the loaded store before the server drops privileges.
  if [ "$(id -u)" = "0" ]; then
    chown -R neo4j:neo4j /data || true
  fi
  echo "[seed] load complete; wrote marker /data/.seeded"
else
  echo "[seed] /data/.seeded present -> skipping load"
fi

# Hand off to the stock Neo4j entrypoint (applies NEO4J_AUTH, starts the server).
exec /startup/docker-entrypoint.sh neo4j
