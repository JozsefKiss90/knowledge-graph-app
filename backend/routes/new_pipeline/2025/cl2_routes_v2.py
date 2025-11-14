# cl2_routes_v2.py
from fastapi import APIRouter, HTTPException, Depends, Body
from .cl2_cluster_builder_v2 import ClusterGraphBuilderCL2v2, CLUSTER_ID, CLUSTER_NAME
from database import db
from auth.auth import require_admin
from utils.rate_limiter import limiter
from utils.validation import validate_cypher_identifier

router = APIRouter(prefix="/cluster2-v2", tags=["Cluster 2 Graph Population (v2)"])

@router.get("/nodes")
def get_cluster2_nodes():
    try:
        query = """
        MATCH (n)
        WHERE n.source = 'cluster_2' AND n.id IS NOT NULL AND n.name IS NOT NULL
        RETURN labels(n) AS labels, n.id AS id, n.name AS name, n.type AS type, n.source AS source
        ORDER BY labels(n), n.name
        """
        rows = db.query(query)
        return {"status": "success", "count": len(rows), "data": rows}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to query Cluster 2 nodes: {str(e)}")

@router.post("/populate")
@limiter.limit("5/minute")
def populate_cluster2(payload: dict = Body(...), user=Depends(require_admin)):
    """
    Body:
    {
      "grouped": "app/data/cluster_CL2.json",
      "summaries": "app/data/destination_summaries_cl2.json",
      "preview": false
    }
    """
    try:
        grouped = payload.get("grouped")
        summaries = payload.get("summaries")
        preview = bool(payload.get("preview", False))
        if not grouped or not summaries:
            raise HTTPException(status_code=400, detail="Missing 'grouped' or 'summaries' path.")
        builder = ClusterGraphBuilderCL2v2(preview=preview)
        builder.create_graph_from_files(grouped, summaries)
        return {"status": "success", "cluster": CLUSTER_ID, "name": CLUSTER_NAME, "preview": preview}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to populate Cluster 2 graph (v2): {str(e)}")

@router.delete("/all")
def delete_cluster2_data(user=Depends(require_admin)):
    try:
        query = """
        MATCH (n)
        WHERE n.source = 'cluster_2'
        DETACH DELETE n
        """
        db.query(query)
        return {"status": "success", "message": "Deleted all Cluster 2 (v2) nodes & relationships.", "scope": "cluster_2"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to delete Cluster 2 (v2): {str(e)}")
