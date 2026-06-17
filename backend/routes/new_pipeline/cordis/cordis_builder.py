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

    def ingest(self, projects: List[Dict[str, Any]]) -> Dict[str, int]:
        stats = {"projects": 0, "organisations": 0, "fields": 0, "participations": 0, "calls_linked": 0}
        seen_orgs, seen_fields = set(), set()

        for p in projects:
            pid = p.get("id")
            if not pid:
                continue
            self._run(
                "MERGE (pr:CordisProject {id:$id}) SET pr += $props",
                {"id": pid, "props": _props({
                    "id": pid, "acronym": p.get("acronym"), "title": p.get("title"),
                    "status": p.get("status"), "startDate": p.get("startDate"), "endDate": p.get("endDate"),
                    "ecContribution": p.get("ecContribution"), "totalCost": p.get("totalCost"),
                    "frameworkProgramme": p.get("frameworkProgramme"), "fundingScheme": p.get("fundingScheme"),
                    "masterCall": p.get("masterCall"), "topicCode": p.get("topicCode"),
                    "objective": p.get("objective"), "source": SOURCE_TAG,
                })},
            )
            stats["projects"] += 1

            for f in p.get("fields", []):
                code = f.get("code") or f.get("title")
                if not code:
                    continue
                if code not in seen_fields:
                    self._run(
                        "MERGE (rf:ResearchField {code:$code}) SET rf.title=$title, rf.source=$src",
                        {"code": code, "title": f.get("title", ""), "src": SOURCE_TAG},
                    )
                    seen_fields.add(code)
                    stats["fields"] += 1
                self._run(
                    "MATCH (pr:CordisProject {id:$pid}),(rf:ResearchField {code:$code}) "
                    "MERGE (pr)-[:CLASSIFIED_AS]->(rf)",
                    {"pid": pid, "code": code},
                )

            for o in p.get("organisations", []):
                oid = o.get("id")
                if not oid:
                    continue
                if oid not in seen_orgs:
                    self._run(
                        "MERGE (og:CordisOrganisation {id:$id}) SET og += $props",
                        {"id": oid, "props": _props({
                            "id": oid, "name": o.get("name"), "shortName": o.get("shortName"),
                            "country": o.get("country"), "city": o.get("city"),
                            "orgType": o.get("orgType"), "source": SOURCE_TAG,
                        })},
                    )
                    seen_orgs.add(oid)
                    stats["organisations"] += 1
                    if o.get("country"):
                        self._run("MERGE (c:Country {code:$code}) SET c.source=$src",
                                  {"code": o["country"], "src": SOURCE_TAG})
                        self._run(
                            "MATCH (og:CordisOrganisation {id:$id}),(c:Country {code:$code}) "
                            "MERGE (og)-[:REGISTERED_IN]->(c)",
                            {"id": oid, "code": o["country"]},
                        )
                self._run(
                    "MATCH (og:CordisOrganisation {id:$oid}),(pr:CordisProject {id:$pid}) "
                    "MERGE (og)-[r:PARTICIPATED_IN]->(pr) "
                    "SET r.role=$role, r.ecContribution=$ec, r.order=$order",
                    {"oid": oid, "pid": pid, "role": o.get("role"),
                     "ec": o.get("ecContribution"), "order": _v(o.get("order"))},
                )
                stats["participations"] += 1

            # Link to an existing app Call node where the call/topic code matches.
            for code in filter(None, [p.get("masterCall"), p.get("topicCode")]):
                res = self._run(
                    "MATCH (pr:CordisProject {id:$pid}) "
                    "MATCH (call:Call) WHERE call.call_id=$code OR call.identifier=$code OR call.topic_id=$code "
                    "MERGE (pr)-[:FUNDED_UNDER]->(call) RETURN count(call) AS n",
                    {"pid": pid, "code": code},
                )
                if res and res[0].get("n"):
                    stats["calls_linked"] += res[0]["n"]
                    break

        return stats

    def delete_all(self) -> None:
        self._run(
            "MATCH (n) WHERE n.source=$src AND "
            "(n:CordisProject OR n:CordisOrganisation OR n:ResearchField OR n:Country) "
            "DETACH DELETE n",
            {"src": SOURCE_TAG},
        )
