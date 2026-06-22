"""Tag the app's Call nodes with research-field tags from CORDIS (idea A1).

For each distinct call subject (its ``topic_title``), the dominant **EuroSciVoc research-field titles**
among the EU-funded projects on that subject become the call's tags. They are written to:
  - ``Call.related_topics``  -> hover tag chips + Compare topic-overlap (frontend reads these);
  - ``Call.keywords``        -> topic search.
plus provenance props (``cordis_tag_source`` / ``cordis_tag_query`` / ``cordis_tag_project_count``).

Honesty: tags are research fields of FUNDED PROJECTS on the subject, **not** the call's official scope.
Calls whose subject returns no CORDIS data stay untagged — nothing is fabricated.
"""
import json
import os
from collections import Counter, defaultdict
from typing import Any, Dict, List, Optional

try:
    from database import db
except Exception:  # importable/testable without a live database
    class _DummyDB:
        def query(self, q, p=None):
            return []
    db = _DummyDB()

from .cordis_parser import parse_extraction
from .cordis_builder import CordisGraphBuilder

TAG_SOURCE_LABEL = "Research fields of EU-funded projects on this subject (CORDIS, FP7-Horizon Europe)"
# A2: label for the subject-area evidence link from a Call to its funded CORDIS projects.
AREA_LINK_LABEL = "Funded projects matching this call's subject (CORDIS, FP7-Horizon Europe)"


def aggregate_fields(projects: List[Dict[str, Any]], top_n: int = 6) -> List[str]:
    """Top-N EuroSciVoc field titles by number of DISTINCT projects carrying them (not field-rows)."""
    per_project_count = Counter()
    for p in projects:
        titles = {(f.get("title") or "").strip() for f in p.get("fields", [])}
        for t in titles:
            if t:
                per_project_count[t] += 1
    return [title for title, _ in per_project_count.most_common(top_n)]


def load_curated_queries(source: str) -> Optional[Dict[str, str]]:
    """Load the reviewed subject->query map for a cluster (curated_queries/<source>.json), if present.
    Curated queries are required for good tags — auto-generating them mis-tags ambiguous subjects."""
    path = os.path.join(os.path.dirname(__file__), "curated_queries", f"{source}.json")
    if not os.path.isfile(path):
        return None
    with open(path, encoding="utf-8") as f:
        data = json.load(f)
    return data.get("queries", data if isinstance(data, dict) else None)


def _calls_in_scope(source: str, only_untagged: bool = False) -> List[Dict[str, str]]:
    # The subject is the call's topic title where present, else its name (clusters populate `name`
    # from the call title, e.g. CL3 has no `topic_title`). Both are stored on the Call node.
    # When ``only_untagged`` (resume mode), skip calls already tagged so an interrupted run can be
    # finished without re-fetching the subjects already done.
    untagged_clause = "AND (c.related_topics IS NULL OR size(c.related_topics) = 0) " if only_untagged else ""
    rows = db.query(
        "MATCH (c:Call {source:$s}) "
        "WITH c, CASE WHEN c.topic_title IS NULL OR c.topic_title = '' THEN c.name ELSE c.topic_title END AS subject "
        "WHERE subject IS NOT NULL AND subject <> '' " + untagged_clause +
        "RETURN c.id AS id, subject AS subject",
        {"s": source},
    )
    return [{"id": r.get("id"), "topic_title": r.get("subject")} for r in rows]


def _projects_for_subject(subject: str, mode: str, local_path: Optional[str], client=None) -> List[Dict[str, Any]]:
    if mode == "local":
        # Dev/offline: parse a real extraction already on disk (used only to test the orchestration —
        # NOT the app's live data source).
        return parse_extraction(local_path)
    # Live: fetch this subject from the CORDIS API (reusing one client across subjects).
    import tempfile
    json_zip = client.run_extraction(subject, dest_dir=tempfile.mkdtemp(prefix="cordis_tag_"))
    return parse_extraction(json_zip)


def tag_calls(
    source: Optional[str] = None,
    calls: Optional[List[Dict[str, str]]] = None,
    top_n: int = 6,
    mode: str = "live",
    local_path: Optional[str] = None,
    preview: bool = False,
    query_map: Optional[Dict[str, str]] = None,
    ingest_projects: bool = True,
    only_untagged: bool = False,
) -> Dict[str, Any]:
    """Tag the calls in ``source`` (a cluster source tag) — or an explicit ``calls`` list — grouping by
    distinct subject so each subject is fetched once. When ``query_map`` is supplied, each subject is
    fetched with its **curated** query and subjects without one are skipped (no unreliable auto-query).

    When ``ingest_projects`` (default True, idea A2), the same per-subject fetch ALSO ingests the full
    projects and links every call on that subject to them via (:Call)-[:HAS_FUNDED_PROJECT]->(:CordisProject),
    so one fetch powers both the A1 tags and the A2 funded-projects panel."""
    if calls is None:
        if not source:
            raise ValueError("tag_calls needs either `source` (cluster tag) or an explicit `calls` list.")
        calls = _calls_in_scope(source, only_untagged=only_untagged)

    by_subject: Dict[str, List[str]] = defaultdict(list)
    for c in calls:
        subject = (c.get("topic_title") or "").strip()
        if subject and c.get("id"):
            by_subject[subject].append(c["id"])

    # Create the client once for live mode (raises CordisError if no key -> 503 at the route).
    client = None
    if mode == "live":
        from .cordis_client import CordisClient
        client = CordisClient()

    subjects_done = 0
    calls_tagged = 0
    empty_subjects: List[str] = []
    failed_subjects: List[Dict[str, str]] = []
    ingest_totals = {"projects": 0, "organisations": 0, "fields": 0, "participations": 0}
    area_links_total = 0

    for subject, call_ids in by_subject.items():
        # Pick the query: curated where available; raw subject only when no curated map is supplied.
        if query_map is not None:
            query = query_map.get(subject)
            if not query:
                failed_subjects.append({"subject": subject, "error": "no curated query"})
                continue
        else:
            query = subject
        # One failing subject (e.g. a query over the 25 000-result cap, a timeout) must not abort the
        # whole run — record it and continue.
        try:
            projects = _projects_for_subject(query, mode, local_path, client)
        except Exception as e:  # noqa: BLE001 - per-subject resilience
            failed_subjects.append({"subject": subject, "error": str(e)[:160]})
            continue

        # A2: ingest the full projects (idempotent MERGE) so they're queryable, and link every call on
        # this subject to them by subject AREA. Works for 2026 calls (exact call-code match is empty).
        if ingest_projects:
            ing = CordisGraphBuilder(preview=preview).ingest(projects)
            for k in ingest_totals:
                ingest_totals[k] += ing.get(k, 0)
            if not preview:
                pids = [p["id"] for p in projects if p.get("id")]
                for cid in call_ids:
                    res = db.query(
                        "MATCH (c:Call {id:$cid}) "
                        "SET c.cordis_area_query=$subj, c.cordis_area_project_count=$n, "
                        "    c.cordis_area_link_source=$src "
                        "WITH c UNWIND $pids AS pid "
                        "MATCH (pr:CordisProject {id:pid, source:'cordis'}) "
                        "MERGE (c)-[r:HAS_FUNDED_PROJECT]->(pr) SET r.linkType='subject' "
                        "RETURN count(r) AS n",
                        {"cid": cid, "subj": subject, "n": len(projects),
                         "pids": pids, "src": AREA_LINK_LABEL},
                    )
                    area_links_total += (res[0]["n"] if res else 0)

        fields = aggregate_fields(projects, top_n=top_n)
        subjects_done += 1
        if not fields:
            empty_subjects.append(subject)
            continue
        for cid in call_ids:
            if not preview:
                db.query(
                    "MATCH (c:Call {id:$id}) "
                    "SET c.related_topics=$fields, c.keywords=$fields, "
                    "c.cordis_tag_source=$src, c.cordis_tag_query=$subj, c.cordis_tag_project_count=$n",
                    {"id": cid, "fields": fields, "src": TAG_SOURCE_LABEL,
                     "subj": subject, "n": len(projects)},
                )
            calls_tagged += 1

    return {
        "subjects": subjects_done,
        "calls_tagged": calls_tagged,
        "empty_subjects": len(empty_subjects),
        "empty_detail": empty_subjects,
        "failed_subjects": len(failed_subjects),
        "failed_detail": failed_subjects[:10],
        "ingested": ingest_totals,
        "area_links": area_links_total,
        "preview": preview,
    }


def clear_tags(source: str) -> Dict[str, Any]:
    db.query(
        "MATCH (c:Call {source:$s}) "
        "REMOVE c.related_topics, c.keywords, c.cordis_tag_source, c.cordis_tag_query, "
        "c.cordis_tag_project_count",
        {"s": source},
    )
    return {"status": "cleared", "scope": source}


def clear_area_links(source: Optional[str] = None) -> Dict[str, Any]:
    """A2: remove the subject-area evidence links + area provenance, leaving ingested projects/A1 tags."""
    db.query("MATCH (:Call)-[r:HAS_FUNDED_PROJECT]->() DELETE r")
    if source:
        db.query("MATCH (c:Call {source:$s}) "
                 "REMOVE c.cordis_area_query, c.cordis_area_project_count, c.cordis_area_link_source",
                 {"s": source})
    else:
        db.query("MATCH (c:Call) "
                 "REMOVE c.cordis_area_query, c.cordis_area_project_count, c.cordis_area_link_source")
    return {"status": "cleared", "scope": source or "all"}
