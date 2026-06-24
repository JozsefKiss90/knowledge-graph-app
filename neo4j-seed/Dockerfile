# Seed image: bakes a Neo4j dump and loads it into the volume on first boot,
# then behaves as a normal Neo4j container. See CORDIS_PLANS/13 (Phases 2-3).
#
# Pin NEO4J_TAG to the EXACT version of the DB the dump was taken from
# (CORDIS_PLANS/13 Phase 0):
#   docker compose -f docker-compose.dev.yml exec neo4j neo4j --version
# Build (after producing neo4j.dump in this folder):
#   docker build --build-arg NEO4J_TAG=2026.02.2 -t jozsefkiss90/knowledge-graph-neo4j-seed:2026.02.2 .
ARG NEO4J_TAG=2026.02.2
FROM neo4j:${NEO4J_TAG}

# Dump produced by `neo4j-admin database dump neo4j --to-path=.` (gitignored).
COPY neo4j.dump /seed/neo4j.dump
COPY seed-entrypoint.sh /seed/seed-entrypoint.sh
RUN chmod +x /seed/seed-entrypoint.sh

ENTRYPOINT ["/seed/seed-entrypoint.sh"]
