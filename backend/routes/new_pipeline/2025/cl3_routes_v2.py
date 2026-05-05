# cl3_routes_v2.py
from fastapi import APIRouter, HTTPException, Depends, Body
from .cl3_cluster_builder_v2 import ClusterGraphBuilderCL3v2, CLUSTER_ID, CLUSTER_NAME
from database import db
from auth.auth import require_admin
from utils.rate_limiter import limiter
from typing import Optional

router = APIRouter(prefix="/cluster3-v2", tags=["Cluster 3 Graph Population (v2)"])

@router.get("/nodes") 
def get_cluster3_nodes():
    try:
        query = """
        MATCH (n)
        WHERE n.source = 'cluster_3' AND n.id IS NOT NULL AND n.name IS NOT NULL
        RETURN labels(n) AS labels, n.id AS id, n.name AS name, n.type AS type, n.source AS source
        ORDER BY labels(n), n.name
        """
        rows = db.query(query)
        return {"status": "success", "count": len(rows), "data": rows}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to query Cluster 3 nodes: {str(e)}")

@router.post("/populate")
def populate_cluster3():
    try:
        grouped = "routes/new_pipleline/output_files/cluster_CL3_grouped.json"
        summaries = "routes/new_pipleline/output_files/destination_summaries_cl3.json"

        builder = ClusterGraphBuilderCL3v2(preview=False)
        builder.create_graph_from_files(grouped, summaries)

        return {
            "status": "success",
            "message": "Cluster 3 graph successfully populated in Neo4j.",
            "source_files": [grouped, summaries]
        }
    except FileNotFoundError as fnf:
        raise HTTPException(status_code=404, detail=f"File not found: {fnf}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"An error occurred: {str(e)}")

@router.get("/node/{id}")
def get_cluster3_node_by_id(id: str):
    try:
        result = db.query("MATCH (n {id: $id}) RETURN n", {"id": id})
        if not result:
            raise HTTPException(status_code=404, detail="Node not found")
        return result[0]["n"]
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch Cluster 3 node: {str(e)}")

@router.get("/relationships")
def get_cluster3_relationships(from_id: Optional[str] = None):
    """
    Returns relationships in the same shape your CL2 endpoint emits.
    Optional query param:
      - from_id: only edges that start at this node id are returned
    """
    try:
        if from_id:
            query = """
            MATCH (a {id: $from_id})-[r]->(b)
            WHERE a.source = 'cluster_3' AND b.source = 'cluster_3'
            RETURN DISTINCT a, b, type(r) AS type, properties(r) AS props
            """
            params = {"from_id": from_id}
        else:
            query = """
            MATCH (a)-[r]->(b)
            WHERE a.source = 'cluster_3' AND b.source = 'cluster_3'
            RETURN DISTINCT a, b, type(r) AS type, properties(r) AS props
            """
            params = {}

        result = db.query(query, params)

        cleaned = []
        seen_edges = set()

        for rec in result:
            a, b, rel_type, props = rec["a"], rec["b"], rec["type"], rec["props"]

            # If from_id is provided, only keep edges where 'from_id' is the source node
            if from_id and a.get("id") != from_id:
                continue
            if from_id and b.get("id") == from_id:
                continue  # skip reverse hits if any

            # label is the rendered text on the edge (same as CL2)
            label = rel_type  # in v2 we create HAS_DESTINATION and HAS_CALL
            key = (a["id"], b["id"], rel_type)
            if key in seen_edges:
                continue
            seen_edges.add(key)

            cleaned.append({
                "id": f"{a['id']}->{b['id']}",
                "source": a["id"],
                "target": b["id"],
                "type": rel_type,
                "label": label,
                **(props or {})
            })

        return {"relationships": cleaned}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch Cluster 3 relationships: {str(e)}")

@router.delete("/all")
def delete_cluster3_data():
    try:
        query = """
        MATCH (n)
        WHERE n.source = 'cluster_3'
        DETACH DELETE n
        """
        db.query(query)
        return {"status": "success", "message": "Deleted all Cluster 3 (v2) nodes & relationships.", "scope": "cluster_3"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to delete Cluster 3 (v2): {str(e)}")
