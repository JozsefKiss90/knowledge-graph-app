from fastapi import APIRouter, HTTPException
from routes.pipeline.cluster_builder import ClusterGraphBuilder
import traceback
from database import db

router = APIRouter(prefix="/cluster4", tags=["Cluster Graph Population"])

@router.get("/nodes") 
def get_cluster4_nodes(): 
    try:
        query = """
        MATCH (n)
        WHERE n.source = 'cluster_4' AND n.id IS NOT NULL AND n.name IS NOT NULL
        RETURN n
        """
        result = db.query(query)
        return {"nodes": result}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch Cluster 4 nodes: {str(e)}")
    
@router.get("/relationships")
def get_cluster4_relationships():
    try:
        query = """
        MATCH (a)-[r]->(b)
        WHERE a.source = 'cluster_4' AND b.source = 'cluster_4'
        RETURN a, b, type(r) AS type, properties(r) AS props
        """
        result = db.query(query)

        cleaned = []
        for record in result:
            a, b, rel_type, props = record["a"], record["b"], record["type"], record["props"]
            cleaned.append({
                "id": f"{a['id']}->{b['id']}",
                "source": a["id"],
                "target": b["id"],
                "type": rel_type,
                "label": rel_type,
                **props
            })

        return {"relationships": cleaned}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch Cluster 4 relationships: {str(e)}")


@router.post("/")
def populate_cluster4():
    try:
        builder = ClusterGraphBuilder()
        path = "routes/pipeline/output_files/nested_parsed_call_tables.json"
        builder.create_graph_from_file(path)

        return {
            "status": "success",
            "message": "Cluster 4 graph successfully populated in Neo4j.",
            "source_file": path
        }
    except FileNotFoundError as fnf:
        raise HTTPException(status_code=404, detail=f"File not found: {fnf}")
    except Exception as e:
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"An error occurred: {str(e)}") 

@router.delete("/")
def delete_cluster4():
    try:
        query = """
        MATCH (n)
        WHERE n.source = 'cluster_4'
        DETACH DELETE n
        """
        db.query(query)
        return {
            "status": "success",
            "message": "All nodes and relationships from Cluster 4 have been deleted.",
            "scope": "cluster_4"
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to delete Cluster 4 data: {str(e)}")