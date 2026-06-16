"""FastAPI routes for CORDIS funded-projects data (source='cordis').

Endpoints:
    POST   /cordis/fetch          - LIVE: run a CORDIS extraction for a query, parse it, ingest. Needs CORDIS_API_KEY.
    POST   /cordis/ingest-local   - DEV/offline: parse an extraction already on disk and ingest it (no API call).
    GET    /cordis/stats          - counts of ingested nodes.
    GET    /cordis/area           - funded projects linked to a given call/topic code.
    DELETE /cordis/all            - delete all CORDIS-sourced nodes/relationships.
"""
import os
import tempfile

from fastapi import APIRouter, BackgroundTasks, HTTPException
from pydantic import BaseModel

from database import db
from .cordis_parser import parse_extraction
from .cordis_builder import CordisGraphBuilder, SOURCE_TAG

router = APIRouter(prefix="/cordis", tags=["CORDIS funded projects"])


class FetchPayload(BaseModel):
    query: str
    preview: bool = False


class IngestLocalPayload(BaseModel):
    path: str            # path to a json.zip or an extraction dir already on disk
    preview: bool = False


class TagCallsPayload(BaseModel):
    source: str          # cluster source tag whose Call nodes to tag, e.g. "cluster_3"
    top_n: int = 6
    preview: bool = False
    ingest_projects: bool = True   # A2: also ingest projects + create subject-area evidence links


@router.post("/fetch")
def fetch(payload: FetchPayload):
    """Run a CORDIS extraction for ``query``, parse the result, and ingest it. Requires CORDIS_API_KEY."""
    try:
        from .cordis_client import CordisClient, CordisError
        try:
            client = CordisClient()
        except CordisError as e:
            raise HTTPException(status_code=503, detail=str(e))

        dest = tempfile.mkdtemp(prefix="cordis_")
        json_zip = client.run_extraction(payload.query, dest_dir=dest)
        projects = parse_extraction(json_zip)
        stats = CordisGraphBuilder(preview=payload.preview).ingest(projects)
        return {"status": "success", "query": payload.query, "parsed_projects": len(projects), **stats}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"CORDIS fetch failed: {str(e)}")


@router.post("/ingest-local")
def ingest_local(payload: IngestLocalPayload):
    """DEV/offline utility: parse an extraction already on disk and ingest it (no CORDIS API call)."""
    try:
        if not os.path.exists(payload.path):
            raise HTTPException(status_code=404, detail=f"Path not found: {payload.path}")
        projects = parse_extraction(payload.path)
        stats = CordisGraphBuilder(preview=payload.preview).ingest(projects)
        return {"status": "success", "path": payload.path, "parsed_projects": len(projects), **stats}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"CORDIS ingest-local failed: {str(e)}")


@router.post("/tag-calls")
def tag_calls_endpoint(payload: TagCallsPayload, background_tasks: BackgroundTasks):
    """Start the CORDIS tag/ingest job for a cluster **in the background** and return immediately.

    Each distinct call subject is a CORDIS extraction (minutes each), so running the whole cluster
    inline would make this HTTP request hang and time out. So this endpoint validates the API key,
    kicks off the job in the background, and returns right away. Poll GET /cordis/stats and
    GET /cordis/call-evidence for progress. Needs CORDIS_API_KEY + Neo4j.
    """
    try:
        from .cordis_client import CordisClient, CordisError
        from .cordis_tagger import tag_calls, load_curated_queries
        query_map = load_curated_queries(payload.source)
        try:
            CordisClient()  # fail fast with 503 if the key is missing
        except CordisError as e:
            raise HTTPException(status_code=503, detail=str(e))

        def _run():
            try:
                tag_calls(source=payload.source, top_n=payload.top_n, mode="live",
                          preview=payload.preview, query_map=query_map,
                          ingest_projects=payload.ingest_projects)
            except Exception:
                pass  # per-subject errors are already handled inside tag_calls

        background_tasks.add_task(_run)
        return {
            "status": "started",
            "source": payload.source,
            "curated_subjects": len(query_map or {}),
            "message": ("Job started in the background — this endpoint returns immediately. Each subject "
                        "is a CORDIS extraction (a few minutes), so the full cluster takes a while. "
                        "Poll GET /cordis/stats for progress; tagged calls appear via GET /cordis/call-evidence."),
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"CORDIS tag-calls failed to start: {str(e)}")


@router.delete("/tags")
def clear_tags_endpoint(source: str):
    """Remove A1's CORDIS tags (related_topics/keywords/provenance) from a cluster's Call nodes."""
    try:
        from .cordis_tagger import clear_tags
        return clear_tags(source)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"CORDIS clear-tags failed: {str(e)}")


@router.get("/stats")
def stats():
    try:
        rows = db.query(
            "MATCH (pr:CordisProject {source:$s}) WITH count(pr) AS projects "
            "OPTIONAL MATCH (og:CordisOrganisation {source:$s}) WITH projects, count(og) AS organisations "
            "OPTIONAL MATCH (c:Country {source:$s}) WITH projects, organisations, count(c) AS countries "
            "OPTIONAL MATCH (rf:ResearchField {source:$s}) "
            "RETURN projects, organisations, countries, count(rf) AS fields",
            {"s": SOURCE_TAG},
        )
        return rows[0] if rows else {"projects": 0, "organisations": 0, "countries": 0, "fields": 0}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"CORDIS stats failed: {str(e)}")


@router.get("/area")
def area(call_code: str):
    """Funded projects linked to a given call/topic code (the app's Call.call_id / topic code)."""
    try:
        rows = db.query(
            "MATCH (pr:CordisProject {source:$s}) WHERE pr.masterCall=$code OR pr.topicCode=$code "
            "OPTIONAL MATCH (og:CordisOrganisation)-[r:PARTICIPATED_IN]->(pr) "
            "RETURN pr, collect(DISTINCT {name:og.name, country:og.country, role:r.role}) AS participants "
            "ORDER BY pr.startDate DESC",
            {"s": SOURCE_TAG, "code": call_code},
        )
        return {"call_code": call_code, "count": len(rows), "projects": rows}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"CORDIS area query failed: {str(e)}")


@router.get("/call-evidence")
def call_evidence(call_id: str, top_n: int = 5):
    """A2 funded-projects panel: aggregate the CORDIS projects linked to a call's subject AREA
    (HAS_FUNDED_PROJECT), independent of exact call-code matching. Counts and euros are kept separate."""
    try:
        s = SOURCE_TAG
        summary = db.query(
            "MATCH (c:Call {id:$cid})-[:HAS_FUNDED_PROJECT]->(pr:CordisProject {source:$s}) "
            "RETURN count(DISTINCT pr) AS projectCount, "
            "       sum(pr.ecContribution) AS totalEcContribution, "
            "       head(collect(c.cordis_area_query)) AS subject",
            {"cid": call_id, "s": s},
        )
        fp = db.query(
            "MATCH (c:Call {id:$cid})-[:HAS_FUNDED_PROJECT]->(pr:CordisProject {source:$s}) "
            "WITH coalesce(pr.frameworkProgramme,'Unknown') AS fp, "
            "     count(DISTINCT pr) AS n, sum(pr.ecContribution) AS funding "
            "RETURN fp, n, funding ORDER BY n DESC",
            {"cid": call_id, "s": s},
        )
        top_orgs = db.query(
            "MATCH (c:Call {id:$cid})-[:HAS_FUNDED_PROJECT]->(pr:CordisProject {source:$s}) "
            "MATCH (og:CordisOrganisation)-[:PARTICIPATED_IN]->(pr) "
            "WITH og, count(DISTINCT pr) AS n "
            "RETURN og.name AS name, og.country AS country, n "
            "ORDER BY n DESC LIMIT $k",
            {"cid": call_id, "s": s, "k": top_n},
        )
        top_countries = db.query(
            "MATCH (c:Call {id:$cid})-[:HAS_FUNDED_PROJECT]->(pr:CordisProject {source:$s}) "
            "MATCH (og:CordisOrganisation)-[:PARTICIPATED_IN]->(pr) "
            "WHERE og.country IS NOT NULL AND og.country <> '' "
            "WITH og.country AS country, count(DISTINCT og) AS orgs "
            "RETURN country, orgs ORDER BY orgs DESC LIMIT $k",
            {"cid": call_id, "s": s, "k": top_n},
        )
        head = summary[0] if summary else {}
        return {
            "call_id": call_id,
            "subject": head.get("subject"),
            "projectCount": head.get("projectCount", 0) or 0,
            "totalEcContribution": head.get("totalEcContribution", 0) or 0,
            "frameworkBreakdown": [r for r in fp if r.get("n")],
            "topOrganisations": top_orgs,
            "topCountries": top_countries,
            "provenance": "Funded projects matching this call's subject (CORDIS, FP7-Horizon Europe)",
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"CORDIS call-evidence failed: {str(e)}")


# Chronological order across the FULL programme history (real CORDIS data spans FP2..HORIZON plus
# non-FP codes like CIP/COST/Euratom); unknown/non-FP codes sort last, then by first year.
_ERA_ORDER = {"FP1": 1, "FP2": 2, "FP3": 3, "FP4": 4, "FP5": 5, "FP6": 6,
              "FP7": 7, "H2020": 8, "HORIZON": 9}

TREND_PROVENANCE = "Funded activity on this call's subject, by project start year (CORDIS, FP7-Horizon Europe)"


def _aggregate_call_trend(rows, project_count, total_ec, subject, call_id):
    """Pivot grouped (year, framework-programme) rows into the A6 trend response. Pure — no DB — so it
    is unit-testable offline against real parsed data. ``rows`` are dicts ``{yr, fp, n, funding}`` exactly
    as the Cypher returns them (one per year x framework-programme). Counts and euros stay separate."""
    years: dict = {}
    eras: dict = {}
    dated = 0
    for r in rows:
        yr, fp = r["yr"], r["fp"]
        n = r["n"] or 0
        funding = r["funding"] or 0
        dated += n
        yb = years.setdefault(yr, {"year": yr, "count": 0, "funding": 0.0, "byFp": []})
        yb["count"] += n
        yb["funding"] += funding
        yb["byFp"].append({"fp": fp, "n": n, "funding": funding})
        er = eras.setdefault(fp, {"fp": fp, "count": 0, "funding": 0.0,
                                  "firstYear": yr, "lastYear": yr})
        er["count"] += n
        er["funding"] += funding
        er["firstYear"] = min(er["firstYear"], yr)
        er["lastYear"] = max(er["lastYear"], yr)

    year_buckets = [years[y] for y in sorted(years)]
    era_list = sorted(eras.values(), key=lambda e: (_ERA_ORDER.get(e["fp"], 99), e["firstYear"]))
    peak = max(year_buckets, key=lambda b: b["count"], default=None)

    return {
        "call_id": call_id,
        "subject": subject,
        "projectCount": project_count,
        "totalEcContribution": total_ec,
        "datedProjectCount": dated,
        "undatedCount": max(project_count - dated, 0),
        "firstYear": year_buckets[0]["year"] if year_buckets else None,
        "lastYear": year_buckets[-1]["year"] if year_buckets else None,
        "eraCount": len(era_list),
        "peakYear": peak["year"] if peak else None,
        "peakCount": peak["count"] if peak else 0,
        "yearBuckets": year_buckets,
        "eras": era_list,
        "provenance": TREND_PROVENANCE,
    }


@router.get("/call-trend")
def call_trend(call_id: str):
    """A6 funding-history trend: how the CORDIS projects linked to a call's subject AREA
    (HAS_FUNDED_PROJECT) are distributed across project START YEAR and FRAMEWORK-PROGRAMME era.

    Counts and euros are reported as separate measures; projects with no parseable 4-digit start year
    are reported as ``undatedCount`` (never silently dropped from the headline). The endpoint returns
    every raw ``frameworkProgramme`` code as-is and orders eras chronologically — presentation choices
    (labels, colours, bucketing of minor programmes) are the frontend's, so the data stays honest.
    """
    try:
        s = SOURCE_TAG
        # Headline totals over ALL linked projects (matches A2 /call-evidence so the two cards agree).
        head = db.query(
            "MATCH (c:Call {id:$cid})-[:HAS_FUNDED_PROJECT]->(pr:CordisProject {source:$s}) "
            "RETURN count(DISTINCT pr) AS projectCount, sum(pr.ecContribution) AS totalEcContribution, "
            "       head(collect(c.cordis_area_query)) AS subject",
            {"cid": call_id, "s": s},
        )
        # Year x era buckets — only projects whose startDate yields a 4-digit year (toInteger -> null
        # for malformed dates, filtered out and counted as undated via the headline reconciliation).
        rows = db.query(
            "MATCH (c:Call {id:$cid})-[:HAS_FUNDED_PROJECT]->(pr:CordisProject {source:$s}) "
            "WHERE pr.startDate IS NOT NULL AND pr.startDate <> '' "
            "WITH pr, toInteger(left(pr.startDate,4)) AS yr, "
            "     coalesce(pr.frameworkProgramme,'Unknown') AS fp, pr.ecContribution AS ec "
            "WHERE yr IS NOT NULL "
            "RETURN yr, fp, count(DISTINCT pr) AS n, sum(ec) AS funding ORDER BY yr, fp",
            {"cid": call_id, "s": s},
        )

        h = head[0] if head else {}
        return _aggregate_call_trend(
            rows,
            project_count=h.get("projectCount", 0) or 0,
            total_ec=h.get("totalEcContribution", 0) or 0,
            subject=h.get("subject"),
            call_id=call_id,
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"CORDIS call-trend failed: {str(e)}")


RELATED_PROVENANCE = ("Calls whose CORDIS-funded projects share EuroSciVoc research fields with this call "
                      "(CORDIS, FP7-Horizon Europe)")
RELATED_CANDIDATE_CAP = 100   # bound the candidate set (ordered by shared-field count) before ranking


def _rank_related_calls(rows, target_field_count, top_n):
    """Rank candidate calls by Jaccard overlap of their EuroSciVoc research-field sets. Pure — no DB — so
    it is unit-testable offline against real parsed data. ``rows`` are dicts
    ``{id,name,callId,identifier,subject,subjectProjectCount,shared,oN,sharedTitles}`` exactly as the
    Cypher returns them (one per candidate call). ``shared`` = |fields(A) ∩ fields(B)|, ``oN`` =
    |fields(B)|, ``target_field_count`` = |fields(A)|. Jaccard = shared / (|A| + |B| - shared)."""
    out = []
    for r in rows:
        shared = r.get("shared") or 0
        if shared <= 0:
            continue
        oN = r.get("oN") or 0
        union = target_field_count + oN - shared
        score = (shared / union) if union > 0 else 0.0
        out.append({
            "id": r.get("id"),
            "name": r.get("name") or r.get("callId") or r.get("identifier") or r.get("id"),
            "callId": r.get("callId"),
            "identifier": r.get("identifier"),
            "subject": r.get("subject"),
            "subjectProjectCount": r.get("subjectProjectCount") or 0,
            "sharedCount": shared,
            "sharedFields": (r.get("sharedTitles") or [])[:12],
            "score": round(score, 4),
        })
    out.sort(key=lambda x: (-x["score"], -x["sharedCount"], (x["name"] or "").lower()))
    return out[:top_n]


@router.get("/related-calls")
def related_calls(call_id: str, top_n: int = 6):
    """B3 related-calls explorer: other calls whose CORDIS-funded projects share EuroSciVoc research
    fields with this call, ranked by Jaccard field overlap. Returns an empty ``related`` list when the
    call has no CORDIS research fields or no overlapping calls (drives the frontend hide-when-empty).

    Honest framing: this is research-field overlap of funded projects, NOT call similarity or quality.
    """
    try:
        s = SOURCE_TAG
        tgt = db.query(
            "MATCH (c:Call {id:$cid})-[:HAS_FUNDED_PROJECT]->(:CordisProject {source:$s})"
            "-[:CLASSIFIED_AS]->(rf:ResearchField {source:$s}) "
            "RETURN count(DISTINCT rf) AS cN, head(collect(c.cordis_area_query)) AS subject",
            {"cid": call_id, "s": s},
        )
        target_field_count = (tgt[0]["cN"] if tgt else 0) or 0
        subject = tgt[0]["subject"] if tgt else None

        rows = []
        if target_field_count > 0:
            # Pass 1: candidate calls sharing >=1 research field, with their shared-field count + titles.
            # Grouped by the candidate node only (scalar key) and capped by raw shared count.
            rows = db.query(
                "MATCH (c:Call {id:$cid})-[:HAS_FUNDED_PROJECT]->(:CordisProject {source:$s})"
                "-[:CLASSIFIED_AS]->(rf:ResearchField {source:$s}) "
                "WITH collect(DISTINCT rf) AS tfs "
                "UNWIND tfs AS rf "
                "MATCH (rf)<-[:CLASSIFIED_AS]-(:CordisProject {source:$s})"
                "<-[:HAS_FUNDED_PROJECT]-(o:Call) "
                "WHERE o.id <> $cid "
                "WITH o, count(DISTINCT rf) AS shared, collect(DISTINCT rf.title) AS sharedTitles "
                "ORDER BY shared DESC LIMIT $cap "
                "RETURN o.id AS id, o.name AS name, o.call_id AS callId, o.identifier AS identifier, "
                "       o.cordis_area_query AS subject, "
                "       o.cordis_area_project_count AS subjectProjectCount, "
                "       shared, sharedTitles",
                {"cid": call_id, "s": s, "cap": RELATED_CANDIDATE_CAP},
            )
            # Pass 2: each candidate's OWN total distinct research-field count (for the Jaccard union).
            ids = [r["id"] for r in rows if r.get("id")]
            if ids:
                counts = db.query(
                    "MATCH (o:Call)-[:HAS_FUNDED_PROJECT]->(:CordisProject {source:$s})"
                    "-[:CLASSIFIED_AS]->(orf:ResearchField {source:$s}) "
                    "WHERE o.id IN $ids "
                    "RETURN o.id AS id, count(DISTINCT orf) AS oN",
                    {"ids": ids, "s": s},
                )
                on_by_id = {c["id"]: c["oN"] for c in counts}
                for r in rows:
                    r["oN"] = on_by_id.get(r["id"], 0)

        related = _rank_related_calls(rows, target_field_count, top_n)
        return {
            "call_id": call_id,
            "subject": subject,
            "targetFieldCount": target_field_count,
            "candidatesConsidered": len(rows),
            "candidateCap": RELATED_CANDIDATE_CAP,
            # The cap orders candidates by raw shared-field count before the Jaccard re-rank, so a very
            # high-overlap low-cardinality call could in principle sit beyond the cap. Disclosed (never
            # silent) so the client can note truncation; reaching it needs >100 calls sharing a field.
            "capped": len(rows) >= RELATED_CANDIDATE_CAP,
            "related": related,
            "provenance": RELATED_PROVENANCE,
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"CORDIS related-calls failed: {str(e)}")


@router.delete("/area-links")
def delete_area_links(source: str = None):
    """A2: remove subject-area evidence links (HAS_FUNDED_PROJECT) + area provenance; keep projects/tags."""
    try:
        from .cordis_tagger import clear_area_links
        return clear_area_links(source)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"CORDIS area-links delete failed: {str(e)}")


@router.delete("/all")
def delete_all():
    try:
        CordisGraphBuilder().delete_all()
        return {"status": "success", "message": "Deleted all CORDIS-sourced nodes & relationships."}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"CORDIS delete failed: {str(e)}")
