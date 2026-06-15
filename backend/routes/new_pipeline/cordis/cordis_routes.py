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

from fastapi import APIRouter, HTTPException
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
def tag_calls_endpoint(payload: TagCallsPayload):
    """Tag the Call nodes of a cluster with research-field tags from CORDIS (idea A1).

    Groups calls by distinct ``topic_title``, fetches each subject from the CORDIS API once, and writes
    the top research fields onto ``related_topics``/``keywords``. Needs CORDIS_API_KEY + Neo4j.
    """
    try:
        from .cordis_client import CordisError
        from .cordis_tagger import tag_calls, load_curated_queries
        query_map = load_curated_queries(payload.source)
        try:
            stats_out = tag_calls(source=payload.source, top_n=payload.top_n, mode="live",
                                  preview=payload.preview, query_map=query_map)
        except CordisError as e:
            raise HTTPException(status_code=503, detail=str(e))
        return {"status": "success", "source": payload.source,
                "curated_queries": bool(query_map), **stats_out}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"CORDIS tag-calls failed: {str(e)}")


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


@router.delete("/all")
def delete_all():
    try:
        CordisGraphBuilder().delete_all()
        return {"status": "success", "message": "Deleted all CORDIS-sourced nodes & relationships."}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"CORDIS delete failed: {str(e)}")
