from fastapi import APIRouter, HTTPException
from routes.pipeline.cluster_builder import ClusterGraphBuilder
import traceback

router = APIRouter(prefix="/populate", tags=["Cluster Graph Population"])

@router.post("/cluster4")
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

@router.delete("/cluster4")
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