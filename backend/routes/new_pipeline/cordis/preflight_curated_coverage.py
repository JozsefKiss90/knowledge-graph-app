"""Pre-flight for the CORDIS go-live ingest (PHASE-PLAN Step 2 #1, ADR-0004).

For every ``Call.source`` in the graph, compare the distinct call SUBJECTS (topic_title, falling
back to name — exactly the tagger's ``_calls_in_scope`` rule) against ``curated_queries/<source>.json``.
Reports, per source: calls, distinct subjects, curated-map coverage, and the subjects that would be
skipped ("no curated query") or refused (no curated file at all). Read-only — writes nothing.

Run inside the dev backend container (has the neo4j driver + live DB):
    docker exec kg-dev-backend-1 python /app/routes/new_pipeline/cordis/preflight_curated_coverage.py
"""
import json
import os
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
# backend root = .../backend (this file is backend/routes/new_pipeline/cordis/); add it so `database`
# imports whether run in the dev container (/app) or from a host checkout.
_BACKEND_ROOT = os.path.dirname(os.path.dirname(os.path.dirname(HERE)))
sys.path.insert(0, _BACKEND_ROOT)
from database import db  # noqa: E402


def load_map(source):
    path = os.path.join(HERE, "curated_queries", f"{source}.json")
    if not os.path.isfile(path):
        return None
    with open(path, encoding="utf-8") as f:
        data = json.load(f)
    return data.get("queries", data if isinstance(data, dict) else None)


def main():
    rows = db.query(
        "MATCH (c:Call) "
        "WITH c, CASE WHEN c.topic_title IS NULL OR c.topic_title = '' THEN c.name ELSE c.topic_title END AS subject "
        "WITH c.source AS source, subject, "
        "     max(CASE WHEN c.related_topics IS NOT NULL AND size(c.related_topics) > 0 THEN 1 ELSE 0 END) AS tagged "
        "RETURN source, subject, tagged ORDER BY source, subject"
    )
    by_source = {}
    for r in rows:
        by_source.setdefault(r["source"], []).append((r["subject"], r["tagged"]))

    blockers = 0
    for source in sorted(by_source):
        subjects = by_source[source]
        qmap = load_map(source)
        if qmap is None:
            blockers += 1
            print(f"\n=== {source}: NO curated_queries/{source}.json — tag-calls would 400 (ADR-0004)")
            print(f"    {len(subjects)} distinct subjects, {sum(1 for _, t in subjects if t)} already tagged")
            continue
        missing = [(s, t) for s, t in subjects if s not in qmap]
        untagged_covered = [s for s, t in subjects if s in qmap and not t]
        print(f"\n=== {source}: {len(subjects)} subjects | curated entries: {len(qmap)} | "
              f"missing from map: {len(missing)} | covered-but-untagged: {len(untagged_covered)}")
        for s, t in missing:
            print(f"    MISSING {'(tagged anyway?)' if t else '':18s} {s[:100]}")
        for s in untagged_covered:
            print(f"    UNTAGGED (covered, ingest will fill) {s[:100]}")

    print(f"\n{'BLOCKERS: ' + str(blockers) + ' source(s) with no curated file' if blockers else 'No missing curated files.'}")


if __name__ == "__main__":
    main()
