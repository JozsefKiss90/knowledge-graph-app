"""Ingest normalised CORDIS project records into Neo4j (all tagged ``source = "cordis"``).

Model (see CORDIS_PLANS/00-data-backbone.md §3):
    (:CordisProject)   (:CordisOrganisation)   (:Country)   (:ResearchField)
    (org)-[:PARTICIPATED_IN {role, ecContribution, order}]->(project)
    (project)-[:CLASSIFIED_AS]->(field)          # EuroSciVoc research field
    (org)-[:REGISTERED_IN]->(country)
    (project)-[:FUNDED_UNDER]->(:Call)           # only where the call code matches an existing Call node

Mirrors the existing he_wiki_builder pattern: defensive ``db`` import, ``preview`` mode, MERGE upserts.
"""
import json
from typing import Any, Dict, List, Optional

try:
    from database import db
except Exception:  # allows importing/testing without a live database
    class _DummyDB:
        def query(self, q, p=None):
            return []
    db = _DummyDB()

SOURCE_TAG = "cordis"

# MERGE/MATCH keys the ingest hits on every project, org, field and country. Without backing indexes
# each MERGE is a full label scan, so ingestion degrades quadratically as the graph grows (at ~30k
# projects it crawls to ~1 project/sec). Created once per process before the first ingest.
_INDEX_STATEMENTS = (
    "CREATE INDEX cordis_project_id IF NOT EXISTS FOR (n:CordisProject) ON (n.id)",
    "CREATE INDEX cordis_org_id IF NOT EXISTS FOR (n:CordisOrganisation) ON (n.id)",
    "CREATE INDEX cordis_field_code IF NOT EXISTS FOR (n:ResearchField) ON (n.code)",
    "CREATE INDEX cordis_country_code IF NOT EXISTS FOR (n:Country) ON (n.code)",
    "CREATE INDEX app_call_id IF NOT EXISTS FOR (n:Call) ON (n.id)",
)
_indexes_ensured = False


def ensure_indexes() -> None:
    """Idempotently create the property indexes the CORDIS ingest/tag queries rely on. ``IF NOT EXISTS``
    makes this a no-op once the indexes are online, and the module-level guard runs it at most once per
    process so it adds no per-subject overhead."""
    global _indexes_ensured
    if _indexes_ensured:
        return
    for stmt in _INDEX_STATEMENTS:
        try:
            db.query(stmt)
        except Exception:  # never let index setup abort an ingest (e.g. read-only role)
            pass
    _indexes_ensured = True


def _v(x: Any) -> Any:
    if x is None or isinstance(x, (str, int, float, bool)):
        return x
    if isinstance(x, (dict, list)):
        return json.dumps(x, ensure_ascii=False)
    return str(x)


def _props(d: Dict[str, Any]) -> Dict[str, Any]:
    return {k: _v(v) for k, v in d.items() if v is not None and v != ""}


class CordisGraphBuilder:
    SOURCE_TAG = SOURCE_TAG

    def __init__(self, preview: bool = False):
        self.preview = preview

    def _run(self, q: str, p: Optional[Dict[str, Any]] = None):
        if self.preview:
            return []
        return db.query(q, p or {})

    # Projects per write batch. Each batch collapses thousands of per-row MERGEs into ~8 UNWIND queries,
    # while keeping any single query's parameter payload bounded (a CORDIS subject can return up to the
    # 25k-result cap, so we never send it all in one statement).
    CHUNK = 500

    def ingest(self, projects: List[Dict[str, Any]]) -> Dict[str, int]:
        if not self.preview:
            ensure_indexes()
        stats = {"projects": 0, "organisations": 0, "fields": 0, "participations": 0, "calls_linked": 0}
        # Node MERGEs are deduped across the WHOLE ingest call (an org/field that recurs in later chunks
        # is upserted once), matching the old per-row `seen_*` semantics — both for fewer writes and so the
        # `organisations`/`fields` stats stay "distinct new nodes", not row counts.
        seen_orgs, seen_fields = set(), set()

        chunk: List[Dict[str, Any]] = []
        for p in projects:
            if not p.get("id"):
                continue
            chunk.append(p)
            if len(chunk) >= self.CHUNK:
                self._ingest_chunk(chunk, stats, seen_orgs, seen_fields)
                chunk = []
        if chunk:
            self._ingest_chunk(chunk, stats, seen_orgs, seen_fields)
        return stats

    def _ingest_chunk(self, projects, stats, seen_orgs, seen_fields) -> None:
        """Upsert one chunk of projects with a fixed handful of UNWIND queries (instead of O(rows) single
        MERGEs). Mutates ``stats``/``seen_*`` in place. Each ``_run`` is a no-op under ``preview``, so the
        Python-side counting below still produces the same preview stats the row-at-a-time version did."""
        project_rows, field_rows, classified_rows = [], [], []
        org_rows, country_codes, registered_rows, participation_rows = [], set(), [], []
        funded_rows = []

        for p in projects:
            pid = p["id"]
            project_rows.append({"id": pid, "props": _props({
                "id": pid, "acronym": p.get("acronym"), "title": p.get("title"),
                "status": p.get("status"), "startDate": p.get("startDate"), "endDate": p.get("endDate"),
                "ecContribution": p.get("ecContribution"), "totalCost": p.get("totalCost"),
                "frameworkProgramme": p.get("frameworkProgramme"), "fundingScheme": p.get("fundingScheme"),
                "masterCall": p.get("masterCall"), "topicCode": p.get("topicCode"),
                "objective": p.get("objective"), "source": SOURCE_TAG,
            })})

            for f in p.get("fields", []):
                code = f.get("code") or f.get("title")
                if not code:
                    continue
                if code not in seen_fields:
                    seen_fields.add(code)
                    field_rows.append({"code": code, "title": f.get("title", "")})
                    stats["fields"] += 1
                classified_rows.append({"pid": pid, "code": code})

            for o in p.get("organisations", []):
                oid = o.get("id")
                if not oid:
                    continue
                if oid not in seen_orgs:
                    seen_orgs.add(oid)
                    org_rows.append({"id": oid, "props": _props({
                        "id": oid, "name": o.get("name"), "shortName": o.get("shortName"),
                        "country": o.get("country"), "city": o.get("city"),
                        "orgType": o.get("orgType"), "source": SOURCE_TAG,
                    })})
                    stats["organisations"] += 1
                    # REGISTERED_IN is established only the first time an org is seen (matches the old code).
                    if o.get("country"):
                        country_codes.add(o["country"])
                        registered_rows.append({"oid": oid, "code": o["country"]})
                participation_rows.append({"oid": oid, "pid": pid, "role": o.get("role"),
                                           "ec": o.get("ecContribution"), "order": _v(o.get("order"))})
                stats["participations"] += 1

            # Candidate codes to link this project to an existing app Call (masterCall preferred, then
            # topicCode). FUNDED_UNDER is the exact-code edge (unused by the app's subject-area panels and
            # empty for 2026 calls); batching links via any matching code rather than stopping at the first.
            seen_codes = set()
            for code in filter(None, [p.get("masterCall"), p.get("topicCode")]):
                if code not in seen_codes:
                    seen_codes.add(code)
                    funded_rows.append({"pid": pid, "code": code})

        stats["projects"] += len(project_rows)

        # ~8 queries per chunk, in dependency order (nodes before the relationships that MATCH them).
        self._run("UNWIND $rows AS row MERGE (pr:CordisProject {id:row.id}) SET pr += row.props",
                  {"rows": project_rows})
        if field_rows:
            self._run("UNWIND $rows AS row MERGE (rf:ResearchField {code:row.code}) "
                      "SET rf.title=row.title, rf.source=$src", {"rows": field_rows, "src": SOURCE_TAG})
        if classified_rows:
            self._run("UNWIND $rows AS row MATCH (pr:CordisProject {id:row.pid}),(rf:ResearchField {code:row.code}) "
                      "MERGE (pr)-[:CLASSIFIED_AS]->(rf)", {"rows": classified_rows})
        if country_codes:
            self._run("UNWIND $codes AS code MERGE (c:Country {code:code}) SET c.source=$src",
                      {"codes": sorted(country_codes), "src": SOURCE_TAG})
        if org_rows:
            self._run("UNWIND $rows AS row MERGE (og:CordisOrganisation {id:row.id}) SET og += row.props",
                      {"rows": org_rows})
        if registered_rows:
            self._run("UNWIND $rows AS row MATCH (og:CordisOrganisation {id:row.oid}),(c:Country {code:row.code}) "
                      "MERGE (og)-[:REGISTERED_IN]->(c)", {"rows": registered_rows})
        if participation_rows:
            self._run("UNWIND $rows AS row MATCH (og:CordisOrganisation {id:row.oid}),(pr:CordisProject {id:row.pid}) "
                      "MERGE (og)-[r:PARTICIPATED_IN]->(pr) "
                      "SET r.role=row.role, r.ecContribution=row.ec, r.order=row.order",
                      {"rows": participation_rows})
        if funded_rows:
            res = self._run(
                "UNWIND $rows AS row MATCH (pr:CordisProject {id:row.pid}) "
                "MATCH (call:Call) WHERE call.call_id=row.code OR call.identifier=row.code OR call.topic_id=row.code "
                "MERGE (pr)-[:FUNDED_UNDER]->(call) RETURN count(*) AS n",
                {"rows": funded_rows})
            if res and res[0].get("n"):
                stats["calls_linked"] += res[0]["n"]

    def delete_all(self) -> None:
        self._run(
            "MATCH (n) WHERE n.source=$src AND "
            "(n:CordisProject OR n:CordisOrganisation OR n:ResearchField OR n:Country) "
            "DETACH DELETE n",
            {"src": SOURCE_TAG},
        )
