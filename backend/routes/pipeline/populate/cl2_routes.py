from fastapi import APIRouter, HTTPException
from routes.pipeline.cl2_cluster_builder import ClusterGraphBuilderCL2
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

@router.get("/relationships")
def get_cluster2_relationships():
    try:
        query = """
        MATCH (a)-[r]->(b)
        WHERE a.source = 'cluster_2' AND b.source = 'cluster_2'
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
        raise HTTPException(status_code=500, detail=f"Failed to fetch Cluster 2 relationships: {str(e)}")

@router.post("/")
def populate_cluster2():
    try:
        builder = ClusterGraphBuilderCL2()
        path = "routes/pipeline/output_files/nested_parsed_cl2_call_tables.json"
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
