from fastapi import APIRouter, HTTPException
from routes.pipeline.cl2_cluster_builder_updated import ClusterGraphBuilderCL2
import traceback
from database import db

router = APIRouter(prefix="/cluster2", tags=["Cluster 2 Graph Population"])

@router.get("/nodes")
def get_cluster2_nodes():
    try:
        query = """
        MATCH (n)
        WHERE n.source = 'cluster_2' AND n.id IS NOT NULL AND n.name IS NOT NULL 
        RETURN n
        """
        result = db.query(query)
        return {"nodes": result}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch Cluster 2 nodes: {str(e)}")
    
@router.get("/node/{id}")
def get_cluster2_node_by_id(id: str):
    try:
        result = db.query("MATCH (n {id: $id}) RETURN n", {"id": id})
        if not result:
            raise HTTPException(status_code=404, detail="Node not found")
        return result[0]["n"]
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch Cluster 2 node: {str(e)}")

from typing import Optional

@router.get("/relationships")
def get_cluster2_relationships(from_id: Optional[str] = None):
    try:
        if from_id:
            query = """
            MATCH (a {id: $from_id})-[r]->(b)
            WHERE a.source = 'cluster_2' AND b.source = 'cluster_2'
            RETURN DISTINCT a, b, type(r) AS type, properties(r) AS props
            """
            params = {"from_id": from_id}
        else:
            query = """
            MATCH (a)-[r]->(b)
            WHERE a.source = 'cluster_2' AND b.source = 'cluster_2'
            RETURN DISTINCT a, b, type(r) AS type, properties(r) AS props
            """
            params = {}

        result = db.query(query, params)

        cleaned = []
        seen_edges = set()

        for record in result:
            a, b, rel_type, props = record["a"], record["b"], record["type"], record["props"]

            # ✅ Only return edges where 'from_id' is the source
            if from_id and a["id"] != from_id:
                continue
            if from_id and b["id"] == from_id:
                continue  # skip relationships where the node is the target

            # ✅ Fix label mapping
            label = rel_type
            if rel_type == "BELONGS_TO_DESTINATION" and a["type"] == "Destination":
                label = "HAS_CALL"
            elif rel_type == "BELONGS_TO_DESTINATION" and a["type"] == "Call":
                label = "BELONGS_TO_DESTINATION"

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
                **props
            })

        return {"relationships": cleaned}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch Cluster 2 relationships: {str(e)}")


@router.post("/") 
def populate_cluster2():
    try:
        builder = ClusterGraphBuilderCL2()
        path = "routes/pipeline/output_files/updated_nested_parsed_cl2_calls_with_max_funded_projects.json"
        builder.create_graph_from_file(path)

        return {
            "status": "success",
            "message": "Cluster 2 graph successfully populated in Neo4j.",
            "source_file": path
        }
    except FileNotFoundError as fnf:
        raise HTTPException(status_code=404, detail=f"File not found: {fnf}")
    except Exception as e:
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"An error occurred: {str(e)}")

@router.delete("/")
def delete_cluster2():
    try:
        query = """
        MATCH (n)
        WHERE n.source = 'cluster_2'
        DETACH DELETE n
        """
        db.query(query)
        return {
            "status": "success",
            "message": "All nodes and relationships from Cluster 2 have been deleted.",
            "scope": "cluster_2"
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to delete Cluster 2 data: {str(e)}")
