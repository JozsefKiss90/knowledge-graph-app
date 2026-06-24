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
from . import cordis_cache

router = APIRouter(prefix="/cordis", tags=["CORDIS funded projects"])

# Last background tag-calls run result, so the silent BackgroundTask becomes inspectable
# (which subjects were tagged vs. returned no CORDIS data vs. errored). Reset on each start.
_last_tag_run: dict = {"status": "idle"}


class FetchPayload(BaseModel):
    query: str
    preview: bool = False


class IngestLocalPayload(BaseModel):
    path: str            # path to a json.zip or an extraction dir already on disk
    preview: bool = False


class TagCallsPayload(BaseModel):
    source: str          # Call.source tag whose Call nodes to tag — a cluster ("cluster_1".."cluster_6")
                         # or a non-cluster programme ("dep","crea","widera","erasmus")
    top_n: int = 6
    preview: bool = False
    ingest_projects: bool = True   # A2: also ingest projects + create subject-area evidence links
    only_untagged: bool = False    # resume: only process Call subjects not yet tagged (related_topics IS NULL)


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
        if not payload.preview:           # A3: new data landed -> drop stale dashboard aggregates
            cordis_cache.invalidate()
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
        if not payload.preview:           # A3: new data landed -> drop stale dashboard aggregates
            cordis_cache.invalidate()
        return {"status": "success", "path": payload.path, "parsed_projects": len(projects), **stats}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"CORDIS ingest-local failed: {str(e)}")


@router.post("/tag-calls")
def tag_calls_endpoint(payload: TagCallsPayload, background_tasks: BackgroundTasks):
    """Start the CORDIS tag/ingest job for a programme **in the background** and return immediately.

    ``source`` is any Call.source tag: a cluster ("cluster_1".."cluster_6") or a non-cluster programme
    ("dep" Digital Europe, "crea" Creative Europe, "widera", "erasmus"). Curated queries live in
    curated_queries/<source>.json (one per programme); when that file is present, subjects without a
    curated entry are skipped, so the curated file must cover every subject you want tagged.

    Each distinct call subject is a CORDIS extraction (minutes each), so running the whole programme
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
            global _last_tag_run
            _last_tag_run = {"status": "running", "source": payload.source}
            try:
                result = tag_calls(source=payload.source, top_n=payload.top_n, mode="live",
                                   preview=payload.preview, query_map=query_map,
                                   ingest_projects=payload.ingest_projects,
                                   only_untagged=payload.only_untagged)
                _last_tag_run = {"status": "finished", "source": payload.source, **result}
            except Exception as e:  # whole-run failure (per-subject errors are captured inside tag_calls)
                import traceback
                _last_tag_run = {"status": "error", "source": payload.source,
                                 "error": str(e), "traceback": traceback.format_exc()}
            finally:
                # A3 (critical): /tag-calls returns to the client BEFORE this background job runs, so the cache
                # must be invalidated HERE — after the data has actually landed — not in the handler (which
                # would clear it before the new data exists and immediately re-warm it with stale results).
                # Use finally because tag_calls() writes incrementally per subject: even a mid-run failure may
                # have landed real new data for the earlier subjects, so the cache must be dropped on the
                # failure path too. Preview writes nothing, so skip it then.
                if not payload.preview:
                    cordis_cache.invalidate()

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


@router.get("/tag-status")
def tag_status():
    """Inspect the last background tag-calls run: which subjects were tagged, returned no CORDIS
    data (``empty_detail``), or errored (``failed_detail``). 'running' means it's still in progress."""
    return _last_tag_run


@router.delete("/tags")
def clear_tags_endpoint(source: str):
    """Remove A1's CORDIS tags (related_topics/keywords/provenance) from a cluster's Call nodes."""
    try:
        from .cordis_tagger import clear_tags
        result = clear_tags(source)
        cordis_cache.invalidate()         # A3: tags removed -> drop stale dashboard aggregates
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"CORDIS clear-tags failed: {str(e)}")


@router.get("/stats")
def stats():
    def _compute():
        rows = db.query(
            "MATCH (pr:CordisProject {source:$s}) WITH count(pr) AS projects "
            "OPTIONAL MATCH (og:CordisOrganisation {source:$s}) WITH projects, count(og) AS organisations "
            "OPTIONAL MATCH (c:Country {source:$s}) WITH projects, organisations, count(c) AS countries "
            "OPTIONAL MATCH (rf:ResearchField {source:$s}) "
            "RETURN projects, organisations, countries, count(rf) AS fields",
            {"s": SOURCE_TAG},
        )
        return rows[0] if rows else {"projects": 0, "organisations": 0, "countries": 0, "fields": 0}
    try:
        return cordis_cache.get_or_compute("stats", None, _compute)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"CORDIS stats failed: {str(e)}")


PORTFOLIO_PROVENANCE = ("Funded projects linked to tracked Horizon Europe calls (CORDIS, FP7-Horizon "
                        "Europe). EU-funded participation and awarded EU contribution — not scientific "
                        "quality or impact. Counts and euros are separate measures.")


def _shape_portfolio_summary(proj_row, call_row, org_row, field_row):
    """F1 funded-reality KPI band: assemble the portfolio totals from the per-measure Cypher rows. Pure — no
    DB — so it is unit-testable offline against real parsed data (mirrors ``_aggregate_call_trend`` /
    ``_rank_area_organisations``). Each argument is the single dict the matching query returns (or ``None``/
    ``{}`` when that match yielded no rows, e.g. before any ingest). Counts and euros are kept as **separate**
    measures and never blended; ``None`` collapses to ``0`` so an empty graph yields an all-zero band (which
    the frontend treats as 'no CORDIS data' and hides the section)."""
    p = proj_row or {}
    c = call_row or {}
    o = org_row or {}
    f = field_row or {}
    return {
        "projectCount": (p.get("projectCount") or 0),
        "totalEcContribution": (p.get("totalEcContribution") or 0),
        "callCount": (c.get("callCount") or 0),
        "organisationCount": (o.get("organisationCount") or 0),
        "countryCount": (o.get("countryCount") or 0),
        "fieldCount": (f.get("fieldCount") or 0),
        "provenance": PORTFOLIO_PROVENANCE,
    }


@router.get("/portfolio-summary")
def portfolio_summary():
    """F1 funded-reality KPI band: portfolio-wide totals over the CORDIS projects **linked to tracked calls**
    (HAS_FUNDED_PROJECT) — funded projects, EU contribution awarded, organisations, countries, and research
    fields, plus the number of tracked calls with any CORDIS evidence.

    Restricted to call-linked projects (not every ingested CordisProject) so the band describes the tracked
    portfolio the dashboard is about and reconciles with the per-call A2 panels. Counts and euros are reported
    as separate measures. Returns all-zero before any ingest (drives the frontend hide-when-empty gate).
    """
    def _compute():
        s = SOURCE_TAG
        # B3: collapse the four separate full traversals into ONE round-trip via independent CALL {} subqueries
        # (Neo4j 5). Each subquery ends in an aggregation, so each yields exactly one row and the uncorrelated
        # blocks combine to a single result row carrying every measure. Cypher is otherwise identical to the
        # old four queries (distinct call-linked projects; null/blank country ignored by the CASE), so
        # _shape_portfolio_summary's contract is unchanged — the single row is fed to all four slots, each of
        # which reads only its own keys.
        rows = db.query(
            "CALL { MATCH (:Call)-[:HAS_FUNDED_PROJECT]->(pr:CordisProject {source:$s}) WITH DISTINCT pr "
            "       RETURN count(pr) AS projectCount, sum(pr.ecContribution) AS totalEcContribution } "
            "CALL { MATCH (c:Call)-[:HAS_FUNDED_PROJECT]->(:CordisProject {source:$s}) "
            "       RETURN count(DISTINCT c) AS callCount } "
            "CALL { MATCH (:Call)-[:HAS_FUNDED_PROJECT]->(pr:CordisProject {source:$s}) WITH DISTINCT pr "
            "       MATCH (og:CordisOrganisation {source:$s})-[:PARTICIPATED_IN]->(pr) "
            "       RETURN count(DISTINCT og) AS organisationCount, "
            "              count(DISTINCT CASE WHEN og.country IS NOT NULL AND og.country <> '' "
            "                                  THEN og.country END) AS countryCount } "
            "CALL { MATCH (:Call)-[:HAS_FUNDED_PROJECT]->(pr:CordisProject {source:$s}) WITH DISTINCT pr "
            "       MATCH (pr)-[:CLASSIFIED_AS]->(rf:ResearchField {source:$s}) "
            "       RETURN count(DISTINCT rf) AS fieldCount } "
            "RETURN projectCount, totalEcContribution, callCount, organisationCount, countryCount, fieldCount",
            {"s": s},
        )
        row = rows[0] if rows else None
        return _shape_portfolio_summary(row, row, row, row)
    try:
        return cordis_cache.get_or_compute("portfolio-summary", None, _compute)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"CORDIS portfolio-summary failed: {str(e)}")


FUNDING_BY_PROGRAMME_PROVENANCE = (
    "EU contribution awarded to funded projects under each programme's tracked calls (CORDIS, FP7-Horizon "
    "Europe). Awarded euros are historical and span several Framework Programmes; the planned budget is the "
    "current work programme's indicative offer — the two are different measures, not a like-for-like delta.")


def _aggregate_funding_by_programme(rows):
    """F2 Planned vs Awarded: shape + rank the per-programme awarded totals. Pure — no DB — so it is
    unit-testable offline against real parsed data (mirrors ``_aggregate_call_trend`` /
    ``_rank_area_organisations``). ``rows`` are dicts ``{source, awardedEc, projectCount, callCount}``
    exactly as the Cypher returns them — **one per raw ``Call.source`` group** (e.g. ``cluster_1``). The
    raw source code is passed through untouched: mapping it to the dashboard's programme key/label is the
    frontend's job (same "backend returns raw codes, presentation is the frontend's" rule as ``/call-trend``).

    ``awardedEc`` is the distinct-project EU contribution sum for the programme (a project linked to several
    calls in the same programme is counted/summed once — the Cypher collapses to distinct projects before the
    sum). ``projectCount`` and ``awardedEc`` are kept as separate measures, never blended into a €-per-project
    figure. Blank/missing sources are dropped (never surfaced as an empty-labelled bar). Sorted by awarded €
    desc, then projects desc, then source."""
    out = []
    for r in rows:
        source = (r.get("source") or "").strip()
        if not source:
            continue
        out.append({
            "source": source,
            "awardedEc": (r.get("awardedEc") or 0),
            "projectCount": (r.get("projectCount") or 0),
            "callCount": (r.get("callCount") or 0),
        })
    out.sort(key=lambda x: (-x["awardedEc"], -x["projectCount"], x["source"]))
    return {"programmes": out, "provenance": FUNDING_BY_PROGRAMME_PROVENANCE}


@router.get("/funding-by-programme")
def funding_by_programme():
    """F2 Planned vs Awarded: the EU contribution actually **awarded** to funded projects, grouped by the
    programme (``Call.source``, e.g. ``cluster_1``) of the tracked calls those projects are linked to. The
    awarded counterpart to the work-programme's planned indicative budget the dashboard already computes
    client-side — shown side by side, never subtracted (different measures across different eras).

    Counts and euros are reported as separate measures. A project linked to several calls in the SAME
    programme is counted/summed once (the Cypher collapses to ``collect(DISTINCT pr)`` before the euro sum,
    so the awarded total is distinct-project-safe). Raw ``Call.source`` codes are returned as-is — the
    frontend maps them to programme keys/labels. Returns an empty ``programmes`` list before any ingest.
    """
    def _compute():
        s = SOURCE_TAG
        rows = db.query(
            "MATCH (c:Call)-[:HAS_FUNDED_PROJECT]->(pr:CordisProject {source:$s}) "
            "WHERE c.source IS NOT NULL AND c.source <> '' "
            "WITH c.source AS source, count(DISTINCT c) AS callCount, collect(DISTINCT pr) AS projs "
            "RETURN source, callCount, size(projs) AS projectCount, "
            "       reduce(tot = 0.0, p IN projs | tot + coalesce(p.ecContribution, 0)) AS awardedEc",
            {"s": s},
        )
        return _aggregate_funding_by_programme(rows)
    try:
        return cordis_cache.get_or_compute("funding-by-programme", None, _compute)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"CORDIS funding-by-programme failed: {str(e)}")


@router.get("/area")
def area(call_code: str):
    """Funded projects linked to a given call/topic code (the app's Call.call_id / topic code)."""
    def _compute():
        rows = db.query(
            "MATCH (pr:CordisProject {source:$s}) WHERE pr.masterCall=$code OR pr.topicCode=$code "
            "OPTIONAL MATCH (og:CordisOrganisation)-[r:PARTICIPATED_IN]->(pr) "
            "RETURN pr, collect(DISTINCT {name:og.name, country:og.country, role:r.role}) AS participants "
            "ORDER BY pr.startDate DESC",
            {"s": SOURCE_TAG, "code": call_code},
        )
        return {"call_code": call_code, "count": len(rows), "projects": rows}
    try:
        return cordis_cache.get_or_compute("area", {"call_code": call_code}, _compute)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"CORDIS area query failed: {str(e)}")


@router.get("/call-evidence")
def call_evidence(call_id: str, top_n: int = 5):
    """A2 funded-projects panel: aggregate the CORDIS projects linked to a call's subject AREA
    (HAS_FUNDED_PROJECT), independent of exact call-code matching. Counts and euros are kept separate."""
    def _compute():
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
    try:
        return cordis_cache.get_or_compute("call-evidence", {"call_id": call_id, "top_n": top_n}, _compute)
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
    def _compute():
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
    try:
        return cordis_cache.get_or_compute("call-trend", {"call_id": call_id}, _compute)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"CORDIS call-trend failed: {str(e)}")


PORTFOLIO_TREND_PROVENANCE = ("Funded activity across the tracked Horizon Europe portfolio, by project start "
                              "year and Framework-Programme era (CORDIS, FP7-Horizon Europe). Counts and euros "
                              "are separate measures; awarded euros are historical EU contribution, not "
                              "scientific quality or impact.")


@router.get("/portfolio-trend")
def portfolio_trend():
    """F3 funded-activity-over-eras: the whole-portfolio version of A6's per-call trend — how the CORDIS
    projects linked to ANY tracked call (HAS_FUNDED_PROJECT) are distributed across project START YEAR and
    FRAMEWORK-PROGRAMME era (FP7 -> Horizon 2020 -> Horizon Europe, plus any earlier/non-FP codes the data
    carries).

    Reuses the A6 pure pivot ``_aggregate_call_trend`` unchanged — the only difference from /call-trend is
    the Cypher drops the per-call filter and dedupes projects across calls (``WITH DISTINCT pr``) so a
    project linked to several calls is counted/summed once. Counts and euros stay separate; projects with no
    parseable 4-digit start year are reported as ``undatedCount`` (never silently dropped). Raw
    ``frameworkProgramme`` codes are returned as-is, eras ordered chronologically — labels/colours/bucketing
    are the frontend's. Returns all-zero/empty before any ingest.
    """
    def _compute():
        s = SOURCE_TAG
        # Headline totals over ALL distinct call-linked projects (reconciles with the F1 KPI band).
        head = db.query(
            "MATCH (:Call)-[:HAS_FUNDED_PROJECT]->(pr:CordisProject {source:$s}) "
            "WITH DISTINCT pr "
            "RETURN count(pr) AS projectCount, sum(pr.ecContribution) AS totalEcContribution",
            {"s": s},
        )
        # Year x era buckets over the SAME distinct projects — only those whose startDate yields a 4-digit
        # year (toInteger -> null for malformed dates, filtered out and reconciled as undated via head).
        rows = db.query(
            "MATCH (:Call)-[:HAS_FUNDED_PROJECT]->(pr:CordisProject {source:$s}) "
            "WITH DISTINCT pr "
            "WHERE pr.startDate IS NOT NULL AND pr.startDate <> '' "
            "WITH pr, toInteger(left(pr.startDate,4)) AS yr, "
            "     coalesce(pr.frameworkProgramme,'Unknown') AS fp, pr.ecContribution AS ec "
            "WHERE yr IS NOT NULL "
            "RETURN yr, fp, count(DISTINCT pr) AS n, sum(ec) AS funding ORDER BY yr, fp",
            {"s": s},
        )
        h = head[0] if head else {}
        result = _aggregate_call_trend(
            rows,
            project_count=h.get("projectCount", 0) or 0,
            total_ec=h.get("totalEcContribution", 0) or 0,
            subject=None,
            call_id=None,
        )
        # Portfolio scope, not a single call's subject — override the call-specific framing the shared
        # helper bakes in (rollback leaves the helper untouched for A6).
        result["provenance"] = PORTFOLIO_TREND_PROVENANCE
        result.pop("call_id", None)
        result.pop("subject", None)
        return result
    try:
        return cordis_cache.get_or_compute("portfolio-trend", None, _compute)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"CORDIS portfolio-trend failed: {str(e)}")


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
    def _compute():
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
    try:
        return cordis_cache.get_or_compute("related-calls", {"call_id": call_id, "top_n": top_n}, _compute)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"CORDIS related-calls failed: {str(e)}")


FIELD_TREE_PROVENANCE = ("EuroSciVoc research fields of CORDIS-funded projects linked to Horizon Europe "
                         "calls (CORDIS, FP7-Horizon Europe). A project can sit in several fields, so "
                         "counts overlap across branches.")
FIELD_CALLS_PROVENANCE = ("Horizon Europe calls whose CORDIS-funded projects are classified in this "
                          "research field (CORDIS, FP7-Horizon Europe)")
FIELD_CALLS_CAP = 100   # bound the per-field call set; disclosed via relevantCallCount/cap/capped
# A call is RELEVANT to a field when at least this share of its classified funded projects fall in the
# field (projectsInField / classifiedProjects). EuroSciVoc tags every project with several broad labels, so
# a single broad call (e.g. a quantum-networks or AI-security call) otherwise leaks into many unrelated
# fields via a single tangential project. Calls below the floor are disclosed as "loosely related, hidden",
# never silently dropped, and the per-call share is shown so the user can judge.
FIELD_CALLS_RELEVANCE_FLOOR = 0.2


def _field_segments(code):
    """EuroSciVoc code -> its non-empty path segments. '/23/47' -> ['23','47']; a non-path code -> [code]."""
    return [s for s in (code or "").split("/") if s]


def _build_field_tree(rows):
    """Build the EuroSciVoc hierarchy with rolled-up funded-project/call counts from per-field rows. Pure
    (no DB) -> unit-testable offline against real parsed data, mirroring ``_aggregate_call_trend`` /
    ``_rank_related_calls``.

    ``rows`` are dicts ``{code, title, projectIds, callIds}`` exactly as the /field-tree Cypher returns
    them (one per ResearchField on the Call->project->field path). The hierarchy is the slash-path ``code``
    (a code is a child of its prefix path). A field's rolled count = the number of DISTINCT project/call ids
    at that code OR any descendant (union, not sum — a project classified at several nested codes counts
    once per field). Counts overlap across BRANCHES by design (a project has several classifications, often
    in different domains). Ancestor codes referenced by a descendant but never classified directly are
    SYNTHESISED (``synthetic=True``, code used as the label) so the tree stays connected without inventing an
    EuroSciVoc name."""
    nodes = {}   # code -> node dict

    def ensure(code, title=None, synthetic=False):
        n = nodes.get(code)
        if n is None:
            n = nodes[code] = {"code": code, "title": title, "synthetic": synthetic,
                               "_proj": set(), "_call": set(), "children": []}
        if title and not n.get("title"):
            n["title"], n["synthetic"] = title, False
        return n

    for r in rows:
        code = r.get("code")
        if not code:
            continue
        n = ensure(code, r.get("title"))
        n["_proj"].update(r.get("projectIds") or [])
        n["_call"].update(r.get("callIds") or [])
        segs = _field_segments(code)
        # synthesise every missing ancestor on the path so the tree is connected
        for i in range(1, len(segs)):
            ensure("/" + "/".join(segs[:i]), synthetic=True)

    roots = []
    for code, n in nodes.items():
        segs = _field_segments(code)
        parent = ("/" + "/".join(segs[:-1])) if len(segs) > 1 else None
        if parent and parent in nodes:
            nodes[parent]["children"].append(n)
        else:
            roots.append(n)

    def rollup(n):
        proj, call = set(n["_proj"]), set(n["_call"])
        for ch in n["children"]:
            cp, cc = rollup(ch)
            proj |= cp
            call |= cc
        n["projectCount"], n["callCount"] = len(proj), len(call)
        n["directProjectCount"], n["directCallCount"] = len(n["_proj"]), len(n["_call"])
        return proj, call

    for r in roots:
        rollup(r)

    def shape(n):
        kids = sorted((shape(c) for c in n["children"]),
                      key=lambda x: (-x["projectCount"], (x["title"] or x["code"] or "").lower()))
        raw_title = (n["title"] or "").strip()
        # A node with no usable title — a synthesised ancestor OR a field that was classified but carries a
        # blank EuroSciVoc title — is shown as a muted "field group {code}", never as a bare code
        # masquerading as a real field name (honesty: no invented names, no raw codes surfaced as titles).
        return {
            "code": n["code"],
            "title": raw_title or n["code"],
            "synthetic": bool(n["synthetic"]) or not raw_title,
            "depth": len(_field_segments(n["code"])),
            "projectCount": n["projectCount"],
            "callCount": n["callCount"],
            "directProjectCount": n["directProjectCount"],
            "directCallCount": n["directCallCount"],
            "children": kids,
        }

    return sorted((shape(r) for r in roots),
                  key=lambda x: (-x["projectCount"], (x["title"] or x["code"] or "").lower()))


def _rank_field_calls(rows, floor=FIELD_CALLS_RELEVANCE_FLOOR, cap=FIELD_CALLS_CAP):
    """Rank a field's candidate calls by RELEVANCE and trim the ones only incidentally related. Pure (no DB)
    -> unit-testable offline, like ``_build_field_tree`` / ``_aggregate_call_trend``.

    Each ``rows`` item is a dict ``{id, name, callId, identifier, subject, projectCount, callProjectCount}``
    where ``projectCount`` = the call's distinct funded projects classified in this field (or its subtree)
    and ``callProjectCount`` = the call's distinct funded projects that carry ANY EuroSciVoc classification.
    Relevance is the SHARE ``projectCount / callProjectCount`` — what fraction of the call's classified
    research actually sits in this field. EuroSciVoc tags each project with several broad labels, so ranking
    by absolute ``projectCount`` lets a broad call surface in every field a single tangential project
    touches; ranking by share keeps the calls a field is genuinely about on top.

    Calls below ``floor`` are dropped as incidental (disclosed to the user via the returned hidden count, not
    silently); the rest are sorted by share desc (then in-field count, then name) and capped at ``cap``.
    Returns ``(calls, relevant_count, hidden_incidental)`` where ``calls`` carry an added ``share`` float.
    """
    enriched = []
    for r in rows:
        total = r.get("callProjectCount") or 0
        in_field = r.get("projectCount") or 0
        share = (in_field / total) if total > 0 else 0.0
        enriched.append({**r, "share": share})
    relevant = [r for r in enriched if r["share"] >= floor]
    hidden_incidental = len(enriched) - len(relevant)
    relevant.sort(key=lambda r: (-r["share"], -(r.get("projectCount") or 0), (r.get("name") or "").lower()))
    return relevant[:cap], len(relevant), hidden_incidental


@router.get("/field-tree")
def field_tree():
    """B5 research-field explorer: the EuroSciVoc field hierarchy with rolled-up funded-project and call
    counts, reconstructed from the existing CLASSIFIED_AS/HAS_FUNDED_PROJECT edges (no new ingestion).
    Returns an empty ``tree`` when no CORDIS field data is linked to calls (drives the drawer empty state).

    Honest framing: counts are EU-funded participation, NOT scientific quality or impact; a project carries
    several EuroSciVoc classifications, so counts overlap across branches.
    """
    def _compute():
        s = SOURCE_TAG
        rows = db.query(
            "MATCH (c:Call)-[:HAS_FUNDED_PROJECT]->(pr:CordisProject {source:$s})"
            "-[:CLASSIFIED_AS]->(rf:ResearchField {source:$s}) "
            "WITH rf, collect(DISTINCT pr.id) AS projectIds, collect(DISTINCT c.id) AS callIds "
            "RETURN rf.code AS code, rf.title AS title, projectIds, callIds",
            {"s": s},
        )
        totals = db.query(
            "MATCH (c:Call)-[:HAS_FUNDED_PROJECT]->(pr:CordisProject {source:$s}) "
            "RETURN count(DISTINCT pr) AS projects, count(DISTINCT c) AS calls",
            {"s": s},
        )
        t = totals[0] if totals else {}
        return {
            "tree": _build_field_tree(rows),
            "totalProjects": (t.get("projects") or 0),
            "totalCalls": (t.get("calls") or 0),
            "fieldCount": len(rows),
            "provenance": FIELD_TREE_PROVENANCE,
        }
    try:
        return cordis_cache.get_or_compute("field-tree", None, _compute)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"CORDIS field-tree failed: {str(e)}")


@router.get("/field-calls")
def field_calls(code: str):
    """B5: Horizon Europe calls funded in a selected EuroSciVoc research field, rolled up over the field's
    subtree by code prefix (exact code OR ``code + '/'`` prefix — the trailing slash excludes
    sibling-prefix codes such as /23/47/2970 when the field is /23/47/297).

    Calls are ranked by RELEVANCE, not raw count: each call carries ``projectCount`` (its distinct funded
    projects classified in the field) and ``callProjectCount`` (its distinct funded projects with ANY
    EuroSciVoc classification); the share between them drives the ranking (see ``_rank_field_calls``). Calls
    whose share is below ``FIELD_CALLS_RELEVANCE_FLOOR`` are only incidentally related and are trimmed —
    disclosed via ``hiddenIncidental`` (never silently dropped). The remaining list is capped at
    ``FIELD_CALLS_CAP``; ``capped`` is true only when the relevant-call count exceeds what was returned.
    """
    def _compute():
        s = SOURCE_TAG
        prefix = (code or "").rstrip("/") + "/"
        title_row = db.query(
            "MATCH (rf:ResearchField {code:$code, source:$s}) RETURN rf.title AS title",
            {"code": code, "s": s},
        )
        head = db.query(
            "MATCH (c:Call)-[:HAS_FUNDED_PROJECT]->(pr:CordisProject {source:$s})"
            "-[:CLASSIFIED_AS]->(rf:ResearchField {source:$s}) "
            "WHERE rf.code = $code OR rf.code STARTS WITH $prefix "
            "RETURN count(DISTINCT pr) AS projects",
            {"code": code, "prefix": prefix, "s": s},
        )
        # One row per call that touches the field, carrying both the in-field project count and the call's
        # total classified-project count (the relevance denominator). Ranking/trimming is done in the pure
        # _rank_field_calls helper so it stays offline-testable; only the candidate set (one small row per
        # touching call, bounded by the ingested call set) crosses the DB boundary.
        rows = db.query(
            "MATCH (c:Call)-[:HAS_FUNDED_PROJECT]->(pr:CordisProject {source:$s})"
            "-[:CLASSIFIED_AS]->(rf:ResearchField {source:$s}) "
            "WHERE rf.code = $code OR rf.code STARTS WITH $prefix "
            "WITH c, count(DISTINCT pr) AS inField "
            "MATCH (c)-[:HAS_FUNDED_PROJECT]->(pr2:CordisProject {source:$s})"
            "-[:CLASSIFIED_AS]->(:ResearchField {source:$s}) "
            "WITH c, inField, count(DISTINCT pr2) AS total "
            "RETURN c.id AS id, c.name AS name, c.call_id AS callId, c.identifier AS identifier, "
            "       c.cordis_area_query AS subject, inField AS projectCount, total AS callProjectCount",
            {"code": code, "prefix": prefix, "s": s},
        )
        h = head[0] if head else {}
        calls, relevant_count, hidden_incidental = _rank_field_calls(rows)
        return {
            "code": code,
            "title": (title_row[0]["title"] if title_row else None),
            "fieldProjectCount": (h.get("projects") or 0),
            "fieldCallCount": len(rows),            # all calls that touch the field
            "relevantCallCount": relevant_count,    # calls meeting the relevance floor
            "calls": calls,
            "returnedCount": len(calls),
            "hiddenIncidental": hidden_incidental,  # touching but below the floor (disclosed, not silent)
            "relevanceFloor": FIELD_CALLS_RELEVANCE_FLOOR,
            "cap": FIELD_CALLS_CAP,
            # capped iff the cap (not the floor) hides relevant calls — keeps the two disclosures distinct.
            "capped": relevant_count > len(calls),
            "provenance": FIELD_CALLS_PROVENANCE,
        }
    try:
        return cordis_cache.get_or_compute("field-calls", {"code": code}, _compute)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"CORDIS field-calls failed: {str(e)}")


ORG_TYPE_LABELS = {
    "HES": "University / education",
    "PRC": "Company",
    "REC": "Research organisation",
    "PUB": "Public body",
    "IND": "Individual",
    "OTH": "Other",
}
PARTNERS_PROVENANCE = ("Organisations participating in this call's CORDIS-funded projects, by role "
                       "(CORDIS, FP7-Horizon Europe). EU-funded participation, not scientific quality.")
PARTNERS_CAP = 200   # bound the ranked org list; disclosed via filteredCount/cap/capped


def _rank_area_organisations(rows, top_n, cap=PARTNERS_CAP):
    """Shape + rank the organisations active in a call's CORDIS-funded area. Pure — no DB — so it is
    unit-testable offline against real participation data (mirrors ``_rank_related_calls`` /
    ``_aggregate_call_trend``). ``rows`` are dicts
    ``{id, name, country, orgType, coordinatedCount, partneredCount}`` exactly as the Cypher returns them
    (one per organisation, already filtered by country/type in Cypher).

    ``projectCount`` = coordinated + partnered (an organisation's role on a given project is single, so the
    two role buckets are disjoint and never double-count). Coordinated and partnered are kept as **separate**
    measures — never blended into a merit/quality score. Ranked by total projects desc, then coordinated
    desc, then name; sliced to ``min(top_n, cap)`` (the caller discloses the cap)."""
    out = []
    for r in rows:
        coord = r.get("coordinatedCount") or 0
        partner = r.get("partneredCount") or 0
        code = (r.get("orgType") or "").strip()
        out.append({
            "id": r.get("id"),
            "name": r.get("name") or r.get("id"),
            "country": r.get("country") or "",
            "orgType": code,
            "orgTypeLabel": ORG_TYPE_LABELS.get(code, "Unknown"),
            "coordinatedCount": coord,
            "partneredCount": partner,
            "projectCount": coord + partner,
        })
    out.sort(key=lambda x: (-x["projectCount"], -x["coordinatedCount"], (x["name"] or "").lower()))
    return out[:min(top_n, cap)]


@router.get("/area-organisations")
def area_organisations(call_id: str, country: str = None, org_type: str = None, top_n: int = 15):
    """B2 partner finder: organisations active in a call's CORDIS-funded research area (HAS_FUNDED_PROJECT),
    ranked by participation, with their coordinate-vs-partner role split, country, and organisation type.
    Filterable by ``country`` and ``org_type`` (server-side, so the cap can't silently hide filtered-out
    matches). Facets (all countries / types present in the area, with org counts) are computed over the
    UNFILTERED area so the dropdowns stay stable. Returns an empty ``organisations`` list when the call has
    no CORDIS participation (drives the frontend hide-when-empty).

    Honest framing: this is EU-funded participation, NOT scientific quality or impact; 'most active' is not
    'best', and organisations funded nationally/privately don't appear.
    """
    country = (country or "").strip() or None
    org_type = (org_type or "").strip() or None

    def _compute():
        s = SOURCE_TAG
        # Facets + headline counts over the UNFILTERED area (stable dropdowns regardless of active filter).
        head = db.query(
            "MATCH (c:Call {id:$cid})-[:HAS_FUNDED_PROJECT]->(pr:CordisProject {source:$s}) "
            "RETURN count(DISTINCT pr) AS projectCount, head(collect(c.cordis_area_query)) AS subject",
            {"cid": call_id, "s": s},
        )
        org_count = db.query(
            "MATCH (c:Call {id:$cid})-[:HAS_FUNDED_PROJECT]->(:CordisProject {source:$s})"
            "<-[:PARTICIPATED_IN]-(og:CordisOrganisation {source:$s}) "
            "RETURN count(DISTINCT og) AS n",
            {"cid": call_id, "s": s},
        )
        country_facets = db.query(
            "MATCH (c:Call {id:$cid})-[:HAS_FUNDED_PROJECT]->(:CordisProject {source:$s})"
            "<-[:PARTICIPATED_IN]-(og:CordisOrganisation {source:$s}) "
            "WHERE og.country IS NOT NULL AND og.country <> '' "
            "WITH og.country AS code, count(DISTINCT og) AS orgs "
            "RETURN code, orgs ORDER BY orgs DESC, code",
            {"cid": call_id, "s": s},
        )
        type_facets = db.query(
            "MATCH (c:Call {id:$cid})-[:HAS_FUNDED_PROJECT]->(:CordisProject {source:$s})"
            "<-[:PARTICIPATED_IN]-(og:CordisOrganisation {source:$s}) "
            "WITH coalesce(og.orgType,'') AS code, count(DISTINCT og) AS orgs "
            "RETURN code, orgs ORDER BY orgs DESC, code",
            {"cid": call_id, "s": s},
        )

        # Ranked organisations over the FILTERED set. Coordinated vs partnered counted independently so the
        # two role measures never double-count a project (an org's role on a project is single).
        clauses = ""
        params = {"cid": call_id, "s": s, "cap": PARTNERS_CAP}
        if country:
            clauses += " AND og.country = $country"
            params["country"] = country
        if org_type:
            clauses += " AND coalesce(og.orgType,'') = $orgType"
            params["orgType"] = org_type
        rows = db.query(
            "MATCH (c:Call {id:$cid})-[:HAS_FUNDED_PROJECT]->(pr:CordisProject {source:$s})"
            "<-[r:PARTICIPATED_IN]-(og:CordisOrganisation {source:$s}) "
            "WHERE true" + clauses + " "
            "WITH og, "
            "     count(DISTINCT CASE WHEN r.role='coordinator' THEN pr END) AS coordinatedCount, "
            "     count(DISTINCT CASE WHEN r.role<>'coordinator' THEN pr END) AS partneredCount "
            "WITH og, coordinatedCount, partneredCount, (coordinatedCount + partneredCount) AS total "
            "ORDER BY total DESC LIMIT $cap "
            "RETURN og.id AS id, og.name AS name, og.country AS country, og.orgType AS orgType, "
            "       coordinatedCount, partneredCount",
            params,
        )
        # filteredCount = distinct orgs matching the filters (for honest cap disclosure, computed exactly).
        fc = db.query(
            "MATCH (c:Call {id:$cid})-[:HAS_FUNDED_PROJECT]->(:CordisProject {source:$s})"
            "<-[:PARTICIPATED_IN]-(og:CordisOrganisation {source:$s}) "
            "WHERE true" + clauses + " "
            "RETURN count(DISTINCT og) AS n",
            {k: v for k, v in params.items() if k != "cap"},
        )

        organisations = _rank_area_organisations(rows, top_n)
        filtered_count = (fc[0]["n"] if fc else 0) or 0
        h = head[0] if head else {}
        return {
            "call_id": call_id,
            "subject": h.get("subject"),
            "projectCount": (h.get("projectCount") or 0),
            "organisationCount": (org_count[0]["n"] if org_count else 0) or 0,
            "filteredCount": filtered_count,
            "returnedCount": len(organisations),
            "cap": PARTNERS_CAP,
            "capped": filtered_count > len(organisations),
            "filters": {"country": country, "orgType": org_type},
            "facets": {
                "countries": [{"code": r["code"], "orgs": r["orgs"]} for r in country_facets],
                "orgTypes": [{"code": r["code"],
                              "label": ORG_TYPE_LABELS.get(r["code"], "Unknown"),
                              "orgs": r["orgs"]} for r in type_facets],
            },
            "organisations": organisations,
            "provenance": PARTNERS_PROVENANCE,
        }
    try:
        return cordis_cache.get_or_compute(
            "area-organisations",
            {"call_id": call_id, "country": country, "org_type": org_type, "top_n": top_n},
            _compute,
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"CORDIS area-organisations failed: {str(e)}")


TOP_ORGS_PROVENANCE = ("Organisations across all tracked CORDIS-funded projects, by role (CORDIS, FP7-Horizon "
                       "Europe). EU-funded participation, not scientific quality; 'most active' is not 'best'.")
TOP_ORGS_CAP = 200   # bound the ranked org list; disclosed via returnedCount/organisationCount/cap/capped


def _rank_top_organisations(rows, top_n, cap=TOP_ORGS_CAP):
    """F6 portfolio org leaderboard: shape + rank the organisations most active across ALL tracked CORDIS-
    funded projects. Pure — no DB — so it is unit-testable offline against real participation data (mirrors
    the per-call B2 twin ``_rank_area_organisations``). ``rows`` are dicts
    ``{id, name, country, orgType, coordinatedCount, partneredCount}`` exactly as the Cypher returns them
    (one per organisation; the two role buckets are counted independently in Cypher).

    ``projectCount`` = coordinated + partnered. An organisation's role on a given project is single, so the
    two role buckets are DISJOINT and never double-count a project. Coordinated and partnered are kept as
    **separate** measures — never blended into a merit/quality score. Ranked by total projects desc, then
    coordinated desc, then name; sliced to ``min(top_n, cap)`` (the route discloses the cap)."""
    out = []
    for r in rows:
        coord = r.get("coordinatedCount") or 0
        partner = r.get("partneredCount") or 0
        code = (r.get("orgType") or "").strip()
        out.append({
            "id": r.get("id"),
            "name": r.get("name") or r.get("id"),
            "country": r.get("country") or "",
            "orgType": code,
            "orgTypeLabel": ORG_TYPE_LABELS.get(code, "Unknown"),
            "coordinatedCount": coord,
            "partneredCount": partner,
            "projectCount": coord + partner,
        })
    out.sort(key=lambda x: (-x["projectCount"], -x["coordinatedCount"], (x["name"] or "").lower()))
    return out[:min(top_n, cap)]


@router.get("/top-organisations")
def top_organisations(top_n: int = 15):
    """F6 portfolio org leaderboard: the organisations most active across ALL tracked CORDIS-funded projects
    (HAS_FUNDED_PROJECT / PARTICIPATED_IN), with their coordinate-vs-partner role split, country, and type —
    the aggregate counterpart to B2's per-call partner finder.

    Coordinated and partnered are counted independently (an org's role on a project is single, so the two
    buckets are disjoint and never double-count) and kept as separate measures, never a single merit score.
    ``count(DISTINCT pr)`` keeps a project single even when it is linked to several calls. The ranked set is
    bounded by ``TOP_ORGS_CAP`` in Cypher then sliced to ``top_n``; ``returnedCount``/``organisationCount``/
    ``cap``/``capped`` disclose the truncation (no silent caps). Returns an empty list before any ingest.

    Honest framing: EU-funded participation, NOT scientific quality or impact; 'most active' is not 'best',
    and organisations funded nationally/privately don't appear.
    """
    def _compute():
        s = SOURCE_TAG
        # B4: single pass — collect every org with its role-split counts, read the distinct-org TOTAL from the
        # collected size, then UNWIND + rank + LIMIT to the cap. Replaces the old second full traversal that
        # existed only to count distinct organisations. Coordinated vs partnered are counted as distinct
        # projects (an org's role on a project is single) so the two role measures never double-count.
        rows = db.query(
            "MATCH (:Call)-[:HAS_FUNDED_PROJECT]->(pr:CordisProject {source:$s})"
            "<-[r:PARTICIPATED_IN]-(og:CordisOrganisation {source:$s}) "
            "WITH og, "
            "     count(DISTINCT CASE WHEN r.role='coordinator' THEN pr END) AS coordinatedCount, "
            "     count(DISTINCT CASE WHEN r.role<>'coordinator' THEN pr END) AS partneredCount "
            "WITH collect({id: og.id, name: og.name, country: og.country, orgType: og.orgType, "
            "              coordinatedCount: coordinatedCount, partneredCount: partneredCount, "
            "              total: coordinatedCount + partneredCount}) AS orgs "
            "WITH orgs, size(orgs) AS organisationCount "
            "UNWIND orgs AS o "
            "WITH organisationCount, o ORDER BY o.total DESC LIMIT $cap "
            "RETURN organisationCount, o.id AS id, o.name AS name, o.country AS country, "
            "       o.orgType AS orgType, o.coordinatedCount AS coordinatedCount, "
            "       o.partneredCount AS partneredCount",
            {"s": s, "cap": TOP_ORGS_CAP},
        )
        organisations = _rank_top_organisations(rows, top_n)
        # The distinct-org total rides on every row (same value); take it from the first, defaulting to 0 when
        # the graph has no participation (UNWIND of an empty collect yields no rows).
        total_count = (rows[0]["organisationCount"] if rows else 0) or 0
        return {
            "organisations": organisations,
            "returnedCount": len(organisations),
            "organisationCount": total_count,
            "cap": TOP_ORGS_CAP,
            "capped": total_count > len(organisations),
            "provenance": TOP_ORGS_PROVENANCE,
        }
    try:
        return cordis_cache.get_or_compute("top-organisations", {"top_n": top_n}, _compute)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"CORDIS top-organisations failed: {str(e)}")


COUNTRY_ACTIVITY_PROVENANCE = ("Organisations from the chosen country participating in CORDIS-funded "
                               "projects, by area and role (CORDIS, FP7-Horizon Europe). EU-funded "
                               "participation, not scientific quality; absence is not absence of activity.")
COUNTRY_AREAS_CAP = 200   # bound the ranked area list; disclosed via areaCount/cap/capped


def _rank_country_areas(rows, top_n, cap=COUNTRY_AREAS_CAP):
    """Shape + rank the CORDIS research SUBJECTS (areas) where a country is active. Pure — no DB — so it is
    unit-testable offline against real participation data (mirrors ``_rank_area_organisations``). ``rows`` are
    dicts ``{subject, coordinatedCount, partneredCount, projectCount, orgCount}`` exactly as the Cypher
    returns them — **one per CORDIS research subject** the country took part in, NOT one per Horizon Europe
    call. Grouping by subject is deliberate: it reflects the *funded research areas* the country is active in,
    not the advertised call/tender titles (which are open opportunities, not evidence of funded activity).

    ``projectCount`` (distinct funded projects in the subject) is the headline measure. Because a country can
    field SEVERAL orgs on one project — one coordinating, another partnering — ``coordinatedCount`` and
    ``partneredCount`` are per-role distinct-project counts that can OVERLAP; they are kept as two separate
    measures and never summed into a merit score. Ranked by distinct projects desc, then coordinated desc,
    then subject; sliced to ``min(top_n, cap)`` (the caller discloses the cap)."""
    out = []
    for r in rows:
        out.append({
            "subject": (r.get("subject") or "").strip(),
            "coordinatedCount": r.get("coordinatedCount") or 0,
            "partneredCount": r.get("partneredCount") or 0,
            "projectCount": r.get("projectCount") or 0,
            "orgCount": r.get("orgCount") or 0,
        })
    out.sort(key=lambda x: (-x["projectCount"], -x["coordinatedCount"], (x["subject"] or "").lower()))
    return out[:min(top_n, cap)]


@router.get("/country-activity")
def country_activity(country: str = None, top_n: int = 15):
    """B4 country activity overlay: how active a chosen country's organisations have been across the graph's
    CORDIS-funded areas. Returns the dropdown FACETS (every country present, with org/area counts) and the
    COVERED set (all calls with any CORDIS participation) regardless of selection; when ``country`` is given,
    also returns the ranked list of CORDIS research **subjects** the country is active in (``areas`` —
    grouped by ``cordis_area_query``, the funded research area, NOT the Horizon Europe call/tender titles),
    plus the full call-id sets the frontend overlay paints the graph with (active / coordinated / covered).

    Honest framing: this is EU-funded participation, NOT scientific quality or impact ('most active' is not
    'best'); organisations funded nationally/privately don't appear, so absence is not absence of activity.
    Calls with no CORDIS data are reported in neither set, so the overlay leaves them neutral (never dimmed
    as if 'inactive').
    """
    country = (country or "").strip() or None

    def _compute():
        s = SOURCE_TAG
        # Facets over ALL CORDIS-linked calls — stable dropdown regardless of the active selection.
        facet_rows = db.query(
            "MATCH (c:Call)-[:HAS_FUNDED_PROJECT]->(:CordisProject {source:$s})"
            "<-[:PARTICIPATED_IN]-(og:CordisOrganisation {source:$s}) "
            "WHERE og.country IS NOT NULL AND og.country <> '' "
            "WITH og.country AS code, count(DISTINCT og) AS orgs, count(DISTINCT c) AS areas "
            "RETURN code, orgs, areas ORDER BY areas DESC, orgs DESC, code",
            {"s": s},
        )

        covered_ids = []
        areas, active_ids, coordinated_ids = [], [], []
        area_count = total_coord = total_partner = 0
        if country:
            # B2: the covered/active/coordinated id sets feed ONLY the graph overlay, which paints only when a
            # country is selected; the param-free dashboard call (country="") never reads them. So compute the
            # 'covered' traversal HERE, inside the country branch, instead of on every call — the dashboard's
            # country="" call now runs a single facets traversal instead of two.
            covered = db.query(
                "MATCH (c:Call)-[:HAS_FUNDED_PROJECT]->(:CordisProject {source:$s})"
                "<-[:PARTICIPATED_IN]-(:CordisOrganisation {source:$s}) "
                "RETURN collect(DISTINCT c.id) AS ids",
                {"s": s},
            )
            covered_ids = (covered[0]["ids"] if covered else []) or []

            # Per-CALL role counts → the graph-overlay id sets. The overlay paints the call nodes drawn on the
            # graph, so the active/coordinated sets are keyed by call id (one lightweight row per active call).
            call_rows = db.query(
                "MATCH (c:Call)-[:HAS_FUNDED_PROJECT]->(pr:CordisProject {source:$s})"
                "<-[r:PARTICIPATED_IN]-(og:CordisOrganisation {source:$s}) "
                "WHERE og.country = $country "
                "WITH c.id AS id, count(DISTINCT CASE WHEN r.role='coordinator' THEN pr END) AS coord "
                "RETURN id, coord",
                {"s": s, "country": country},
            )
            active_ids = [r["id"] for r in call_rows if r.get("id")]
            coordinated_ids = [r["id"] for r in call_rows if r.get("id") and (r.get("coord") or 0) > 0]

            # Per-SUBJECT aggregation → the drawer list. We list the CORDIS research SUBJECTS the funded
            # projects belong to (c.cordis_area_query), NOT the Horizon Europe call/tender titles — the call
            # titles are open opportunities and listing them as "active areas" is misleading. Grouping by
            # subject also dedupes the many calls A2 links to the same project set; count(DISTINCT pr) keeps a
            # project single even though several calls point at it.
            subject_rows = db.query(
                "MATCH (c:Call)-[:HAS_FUNDED_PROJECT]->(pr:CordisProject {source:$s})"
                "<-[r:PARTICIPATED_IN]-(og:CordisOrganisation {source:$s}) "
                "WHERE og.country = $country "
                "  AND c.cordis_area_query IS NOT NULL AND c.cordis_area_query <> '' "
                "WITH c.cordis_area_query AS subject, "
                "     count(DISTINCT CASE WHEN r.role='coordinator' THEN pr END) AS coordinatedCount, "
                "     count(DISTINCT CASE WHEN r.role<>'coordinator' THEN pr END) AS partneredCount, "
                "     count(DISTINCT pr) AS projectCount, count(DISTINCT og) AS orgCount "
                "RETURN subject, coordinatedCount, partneredCount, projectCount, orgCount "
                "ORDER BY projectCount DESC",
                {"s": s, "country": country},
            )
            areas = _rank_country_areas(subject_rows, top_n)
            area_count = len(subject_rows)

            # Country-wide DISTINCT role totals for the headline (distinct projects, so projects shared across
            # subjects/calls aren't double-counted — summing the per-subject rows would over-count them).
            totals = db.query(
                "MATCH (:Call)-[:HAS_FUNDED_PROJECT]->(pr:CordisProject {source:$s})"
                "<-[r:PARTICIPATED_IN]-(og:CordisOrganisation {source:$s}) "
                "WHERE og.country = $country "
                "RETURN count(DISTINCT CASE WHEN r.role='coordinator' THEN pr END) AS led, "
                "       count(DISTINCT CASE WHEN r.role<>'coordinator' THEN pr END) AS joined",
                {"s": s, "country": country},
            )
            t = totals[0] if totals else {}
            total_coord = t.get("led") or 0
            total_partner = t.get("joined") or 0

        return {
            "country": country,
            "facets": {"countries": [{"code": r["code"], "orgs": r["orgs"], "areas": r["areas"]}
                                     for r in facet_rows]},
            "coveredCallCount": len(covered_ids),
            "areaCount": area_count,
            "totalCoordinated": total_coord,
            "totalPartnered": total_partner,
            "returnedCount": len(areas),
            "cap": COUNTRY_AREAS_CAP,
            "capped": area_count > len(areas),
            "areas": areas,
            "activeCallIds": active_ids,
            "coordinatedCallIds": coordinated_ids,
            "coveredCallIds": covered_ids,
            "provenance": COUNTRY_ACTIVITY_PROVENANCE,
        }
    try:
        return cordis_cache.get_or_compute("country-activity", {"country": country, "top_n": top_n}, _compute)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"CORDIS country-activity failed: {str(e)}")


HOP_ON_PROVENANCE = ("Early-stage, ongoing Horizon Europe Pillar II and EIC Pathfinder collaborative "
                     "projects whose profile matches the Hop-on Facility host criteria (CORDIS). The Hop-on "
                     "rule is that the host action is recently started (roughly its first 12 months / first "
                     "reporting period), so a widening-country partner can still be added. A shortlist to "
                     "investigate, not an official confirmation of eligibility — the final decision and the "
                     "exact reporting-period rule are set by the current Work Programme and the project's "
                     "consent. EU-funded participation only — not scientific quality or impact.")
HOP_ON_HOSTS_CAP = 300            # bound the ranked host list; disclosed via hostCount/cap/capped
# The Hop-on host must be EARLY in its lifecycle (the real policy axis is time-since-START, not time-
# remaining): per the Facility rules the action is ~1-12 months from its start and still in its first
# reporting period when a partner joins. We approximate that with a max age-since-start window. Confirm the
# exact figure against the current WIDERA Work Programme.
HOP_ON_DEFAULT_MAX_AGE_MONTHS = 12

# Horizon Europe Pillar-II 'main work programme' cluster prefixes a widening partner can hop onto.
# NOTE the mapping is NOT uniform: Cluster 1 (Health) uses 'HORIZON-HLTH', not 'HORIZON-CL1' — a naive
# 'HORIZON-CL' prefix test silently drops every Health host. EIC Pathfinder is matched separately (below).
# Deliberately excluded: Missions (HORIZON-MISS), partnership JUs (HORIZON-JU), the widening WP itself
# (HORIZON-WIDERA, incl. the Hop-on call), Infrastructures, MSCA, ERC, EIC Accelerator/Transition — none are
# Pillar-II-main collaborative actions in the Hop-on sense. Confirm the exact set against the current WP.
ELIGIBLE_PROGRAMME_PREFIXES = ("HORIZON-CL2", "HORIZON-CL3", "HORIZON-CL4", "HORIZON-CL5", "HORIZON-CL6",
                               "HORIZON-HLTH")
EIC_PATHFINDER_CODE = "EIC-PATHFINDER"   # synthetic programme code for EIC Pathfinder hosts
PROGRAMME_LABELS = {
    "HORIZON-HLTH": "Cluster 1 — Health",
    "HORIZON-CL2": "Cluster 2 — Culture, Creativity & Inclusive Society",
    "HORIZON-CL3": "Cluster 3 — Civil Security for Society",
    "HORIZON-CL4": "Cluster 4 — Digital, Industry & Space",
    "HORIZON-CL5": "Cluster 5 — Climate, Energy & Mobility",
    "HORIZON-CL6": "Cluster 6 — Food, Bioeconomy, Natural Resources & Environment",
    EIC_PATHFINDER_CODE: "EIC Pathfinder",
}

# Horizon Europe 'widening' countries — an OFFICIAL EU reference list (confirm against the current WP annex),
# treated like ORG_TYPE_LABELS: a transparent reference constant, NOT a CORDIS-derived figure. Codes are
# matched as CORDIS stores them (note Greece is 'EL', Kosovo 'XK'). The widening GAP a host exposes is this
# set minus the consortium's own countries — i.e. widening countries that could still hop on. It is NOT a
# measure of any country's CORDIS activity: a widening country absent from the data is precisely an untapped
# opening, so it is deliberately kept in the gap (the dropdown facet, by contrast, lists only widening codes
# actually present in eligible consortia).
WIDENING_MEMBER_STATES = {"BG", "HR", "CY", "CZ", "EE", "EL", "HU", "LV", "LT", "MT", "PL", "PT", "RO",
                          "SK", "SI"}
WIDENING_ASSOCIATED = {"AL", "AM", "BA", "FO", "GE", "XK", "MD", "ME", "MA", "MK", "RS", "TN", "TR", "UA"}
WIDENING_COUNTRIES = WIDENING_MEMBER_STATES | WIDENING_ASSOCIATED


def _is_collaborative_scheme(scheme):
    """True if ``scheme`` is a collaborative R&I action (RIA/IA) a widening partner can be ADDED to — the
    Hop-on host criterion. Pure (no DB), so it is unit-testable offline against the real, messy CORDIS
    ``fundingScheme`` strings (e.g. the double-spaced 'HORIZON  Research and Innovation Actions', plus
    'Research and Innovation action', 'HORIZON Innovation Actions', 'Innovation action'). Coordination &
    support actions, COFUND, and JU-support schemes are explicitly rejected (a CSA has nothing to hop onto)."""
    s = " ".join((scheme or "").lower().split())
    if not s:
        return False
    if "coordination" in s or "support action" in s or "cofund" in s:
        return False
    if "research and innovation action" in s or "innovation action" in s:
        return True
    return s in {"ria", "ia"}


def _programme_of(master_call):
    """Map a project's ``masterCall`` to its eligible Hop-on host programme code, or ``None`` if it is not an
    eligible Pillar-II-main / EIC-Pathfinder action. Pure — unit-testable offline. Returns the matched prefix
    (e.g. 'HORIZON-CL3', 'HORIZON-HLTH') or the synthetic 'EIC-PATHFINDER' for EIC Pathfinder calls."""
    mc = (master_call or "").upper()
    for p in ELIGIBLE_PROGRAMME_PREFIXES:
        if mc.startswith(p):
            return p
    if "EIC" in mc and "PATHFINDER" in mc:
        return EIC_PATHFINDER_CODE
    return None


def _months_between(start, end):
    """Whole months from ISO date string ``start`` (YYYY-MM-DD...) to ``end``, or ``None`` if unparseable.
    Pure — takes both dates as strings so it is deterministic and offline-testable (no clock inside)."""
    import datetime
    try:
        a = datetime.date.fromisoformat(str(start)[:10])
        b = datetime.date.fromisoformat(str(end)[:10])
    except Exception:
        return None
    months = (b.year - a.year) * 12 + (b.month - a.month)
    if b.day < a.day:
        months -= 1
    return months


def _shape_hop_on_host(r, today):
    """Shape one eligible-host Cypher row into the response dict, or ``None`` if its funding scheme is not a
    collaborative R&I action (the scheme test lives here because the real strings are too messy for a clean
    Cypher predicate). Pure — no DB, ``today`` passed in — so it is unit-testable offline. ``r`` is a dict
    {id, acronym, title, masterCall, fundingScheme, startDate, endDate, coordinatorCountry, countries[],
    fields[]} as the Cypher returns it. Computes the programme code/label, the project's age since start
    (``monthsSinceStart`` — the policy-relevant axis for Hop-on eligibility), the months remaining (shown for
    context), and the widening GAP (widening countries NOT already in the consortium).

    Eligibility nuance: Pillar-II cluster hosts must be a collaborative RIA/IA scheme (CSAs etc. excluded).
    EIC Pathfinder is collaborative *by nature* but CORDIS records its scheme as 'HORIZON EIC Grants' (not
    RIA/IA), so for Pathfinder the multi-participant check (applied in the Cypher) governs and the RIA/IA
    string test is skipped. The age window itself is applied in the Cypher (against ``startDate``)."""
    programme = _programme_of(r.get("masterCall"))
    if not programme:
        return None
    if programme != EIC_PATHFINDER_CODE and not _is_collaborative_scheme(r.get("fundingScheme")):
        return None
    countries = sorted({(c or "").strip() for c in (r.get("countries") or []) if (c or "").strip()})
    widening_gap = sorted(WIDENING_COUNTRIES - set(countries))
    fields = [{"code": f.get("code"), "title": f.get("title")}
              for f in (r.get("fields") or []) if f and f.get("code")]
    remaining = _months_between(today, r.get("endDate"))
    since_start = _months_between(r.get("startDate"), today)
    return {
        "id": r.get("id"),
        "acronym": (r.get("acronym") or "").strip() or (r.get("title") or "").strip(),
        "title": (r.get("title") or "").strip(),
        "masterCall": (r.get("masterCall") or "").strip(),
        "programme": programme,
        "programmeLabel": PROGRAMME_LABELS.get(programme, programme),
        "fundingScheme": (r.get("fundingScheme") or "").strip(),
        "startDate": (r.get("startDate") or "").strip(),
        "endDate": (r.get("endDate") or "").strip(),
        "monthsSinceStart": max(since_start, 0) if since_start is not None else None,
        "monthsRemaining": max(remaining, 0) if remaining is not None else None,
        "coordinatorCountry": (r.get("coordinatorCountry") or "").strip(),
        "orgCount": r.get("orgCount") or 0,
        "countries": countries,
        "wideningGap": widening_gap,
        "fields": fields,
        "url": "https://cordis.europa.eu/project/id/" + str(r.get("id") or ""),
    }


def _hop_on_facets(hosts):
    """Build the drawer's dropdown facets from the shaped, scheme-filtered host list (over the UNFILTERED
    eligible set, so the dropdowns are stable regardless of the active filter). Pure — offline-testable.
    Returns programmes (eligible code → label + host count), fields (EuroSciVoc code → title + host count),
    and wideningPresent (widening codes that appear in ≥1 eligible consortium → host count)."""
    prog, fields, widening = {}, {}, {}
    field_titles = {}
    for h in hosts:
        prog[h["programme"]] = prog.get(h["programme"], 0) + 1
        for f in h["fields"]:
            fields[f["code"]] = fields.get(f["code"], 0) + 1
            field_titles.setdefault(f["code"], f.get("title") or f["code"])
        for c in set(h["countries"]) & WIDENING_COUNTRIES:
            widening[c] = widening.get(c, 0) + 1
    return {
        "programmes": sorted(
            [{"code": k, "label": PROGRAMME_LABELS.get(k, k), "hosts": v} for k, v in prog.items()],
            key=lambda x: (-x["hosts"], x["code"])),
        "fields": sorted(
            [{"code": k, "title": field_titles.get(k, k), "hosts": v} for k, v in fields.items()],
            key=lambda x: (-x["hosts"], (x["title"] or "").lower()))[:200],
        "wideningPresent": sorted(
            [{"code": k, "hosts": v} for k, v in widening.items()],
            key=lambda x: (-x["hosts"], x["code"])),
    }


def _rank_hop_on_hosts(hosts, top_n, cap=HOP_ON_HOSTS_CAP):
    """Rank + slice the (already filtered) shaped hosts. Pure — offline-testable. Ranked by FRESHEST start
    first (fewest months since start → most clearly inside the Hop-on eligibility window, most time to prepare
    a hop-on proposal), then largest widening gap desc (most opportunity), then acronym; sliced to
    ``min(top_n, cap)`` (the caller discloses the cap). ``monthsSinceStart`` of ``None`` (unparseable start
    date) sorts last."""
    BIG = 10 ** 6
    out = sorted(hosts, key=lambda h: (
        (h["monthsSinceStart"] if h["monthsSinceStart"] is not None else BIG),
        -len(h["wideningGap"]),
        (h["acronym"] or "").lower(),
    ))
    return out[:min(top_n, cap)]


@router.get("/hop-on-hosts")
def hop_on_hosts(field: str = None, programme: str = None, missing_country: str = None,
                 max_age_months: int = HOP_ON_DEFAULT_MAX_AGE_MONTHS, top_n: int = 25):
    """B6 Hop-on host finder: early-stage, ongoing Horizon Europe Pillar II / EIC Pathfinder collaborative
    projects a widening-country partner could join via the Hop-on Facility, and — per host — which widening
    countries are NOT yet in the consortium (the actual opening).

    Eligibility (all from existing CordisProject properties, NO new ingestion): frameworkProgramme=HORIZON,
    status=SIGNED and still running, masterCall in the eligible Pillar-II cluster set (incl. HORIZON-HLTH for
    Health) or an EIC Pathfinder call, a collaborative RIA/IA funding scheme, more than one participant (so a
    partner can be added), and — the Hop-on policy axis — the project is EARLY in its lifecycle: it started
    within the last ``max_age_months`` months (approximating the 'first reporting period' rule, when a partner
    can still be added). Optional filters: ``field`` (EuroSciVoc code), ``programme`` (an eligible code),
    ``missing_country`` (a widening code absent from the consortium).

    Honest framing: a profile-match SHORTLIST, not an official eligibility ruling (the WP and the project's
    consent decide); EU-funded participation, not quality. The widening-country list is a disclosed EU
    reference constant; the per-host gap is that list minus the consortium's own countries (not a measure of
    any country's CORDIS activity). Returns empty before any ingest (drives the frontend hide/empty state)."""
    max_age_months = max(int(max_age_months or 0), 0)
    top_n = max(int(top_n or 0), 0)
    field = (field or "").strip() or None
    programme = (programme or "").strip() or None
    missing_country = (missing_country or "").strip().upper() or None

    def _scan():
        # B5/B6: cache the heavy eligible-host scan (full CordisProject scan + per-project shaping) keyed
        # ONLY by max_age_months, so every field/programme/missing_country filter combination shares ONE
        # cached scan instead of one cache entry per filter combo. The cheap filters/ranking/facets below run
        # per request on the shaped result. B1's frameworkProgramme/status composite index lets the WHERE
        # narrow to HORIZON+SIGNED before the per-node regex/date work runs on the survivors.
        s = SOURCE_TAG
        rows = db.query(
            "MATCH (pr:CordisProject {source:$s}) "
            "WHERE pr.frameworkProgramme = 'HORIZON' AND pr.status = 'SIGNED' "
            "  AND pr.startDate =~ '\\d{4}-\\d{2}-\\d{2}.*' AND pr.endDate =~ '\\d{4}-\\d{2}-\\d{2}.*' "
            "  AND date(substring(pr.startDate,0,10)) >= date() - duration({months:$max_age}) "
            "  AND date(substring(pr.endDate,0,10)) >= date() "
            "  AND ( any(p IN $prefixes WHERE pr.masterCall STARTS WITH p) "
            "        OR (toUpper(coalesce(pr.masterCall,'')) CONTAINS 'EIC' "
            "            AND toUpper(coalesce(pr.masterCall,'')) CONTAINS 'PATHFINDER') ) "
            "MATCH (og:CordisOrganisation {source:$s})-[:PARTICIPATED_IN]->(pr) "
            "WITH pr, count(DISTINCT og) AS orgCount, "
            "     collect(DISTINCT CASE WHEN og.country IS NOT NULL AND og.country <> '' "
            "                           THEN og.country END) AS countries, "
            "     head([(og2)-[r2:PARTICIPATED_IN]->(pr) "
            "           WHERE r2.role='coordinator' AND og2.country IS NOT NULL | og2.country]) AS coordCountry "
            "WHERE orgCount > 1 "
            "OPTIONAL MATCH (pr)-[:CLASSIFIED_AS]->(rf:ResearchField {source:$s}) "
            "WITH pr, orgCount, countries, coordCountry, "
            "     collect(DISTINCT CASE WHEN rf.code IS NOT NULL AND rf.code <> '' "
            "                           THEN {code: rf.code, title: rf.title} END) AS fields "
            "RETURN pr.id AS id, pr.acronym AS acronym, pr.title AS title, pr.masterCall AS masterCall, "
            "       pr.fundingScheme AS fundingScheme, pr.startDate AS startDate, pr.endDate AS endDate, "
            "       coordCountry AS coordinatorCountry, orgCount, countries, fields",
            {"s": s, "prefixes": list(ELIGIBLE_PROGRAMME_PREFIXES), "max_age": max_age_months},
        )

        import datetime
        today = datetime.date.today().isoformat()
        return [h for r in rows if (h := _shape_hop_on_host(r, today))]

    try:
        shaped = cordis_cache.get_or_compute("hop-on-hosts-scan", {"max_age_months": max_age_months}, _scan)
        facets = _hop_on_facets(shaped)
        filtered = shaped
        if programme:
            filtered = [h for h in filtered if h["programme"] == programme]
        if field:
            filtered = [h for h in filtered if any(f["code"] == field for f in h["fields"])]
        if missing_country:
            filtered = [h for h in filtered if missing_country in h["wideningGap"]]

        ranked = _rank_hop_on_hosts(filtered, top_n)
        return {
            "maxAgeMonths": max_age_months,
            "eligibleCount": len(shaped),
            "hostCount": len(filtered),
            "returnedCount": len(ranked),
            "cap": HOP_ON_HOSTS_CAP,
            "capped": len(filtered) > len(ranked),
            "filters": {"field": field, "programme": programme, "missingCountry": missing_country},
            "facets": facets,
            "hosts": ranked,
            "provenance": HOP_ON_PROVENANCE,
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"CORDIS hop-on-hosts failed: {str(e)}")


@router.delete("/area-links")
def delete_area_links(source: str = None):
    """A2: remove subject-area evidence links (HAS_FUNDED_PROJECT) + area provenance; keep projects/tags."""
    try:
        from .cordis_tagger import clear_area_links
        result = clear_area_links(source)
        cordis_cache.invalidate()         # A3: evidence links removed -> drop stale dashboard aggregates
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"CORDIS area-links delete failed: {str(e)}")


@router.delete("/all")
def delete_all():
    try:
        CordisGraphBuilder().delete_all()
        cordis_cache.invalidate()         # A3: everything deleted -> drop stale dashboard aggregates
        return {"status": "success", "message": "Deleted all CORDIS-sourced nodes & relationships."}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"CORDIS delete failed: {str(e)}")
