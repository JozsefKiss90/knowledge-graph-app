from fastapi import APIRouter, HTTPException
from routes.pipeline.cl4_cluster_builder import ClusterGraphBuilder
import traceback
from database import db
from typing import Optional

router = APIRouter(prefix="/cluster4", tags=["Cluster 4 Graph Population"])

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

@router.get("/node/{node_id}")
def get_cl4_node_by_id(node_id: str):
    try:
        cypher = "MATCH (n {id: $id}) WHERE n.source = 'cluster_4' RETURN n"
        result = db.query(cypher, {"id": node_id})
        if not result:
            raise HTTPException(status_code=404, detail="Node not found")
        n = result[0]["n"]

        # Return all possible keys with fallback to empty string
        return n

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch CL4 node: {str(e)}")

@router.get("/relationships")
def get_cluster4_relationships(from_id: Optional[str] = None):
    try:
        if not from_id:
            query = """
            MATCH (a)-[r]->(b)
            WHERE a.source = 'cluster_4' AND b.source = 'cluster_4'
            RETURN DISTINCT a, b, type(r) AS type, properties(r) AS props
            """
            params = {}
        else:
            # Determine node type to filter relationships
            node_type_res = db.query("MATCH (n {id: $id}) RETURN n.type AS type", {"id": from_id})
            if not node_type_res:
                raise HTTPException(status_code=404, detail="Node not found")
            node_type = node_type_res[0]["type"]

            if node_type == "Call":
                query = """
                MATCH (a:Call {id: $from_id})-[r]->(b)
                WHERE a.source = 'cluster_4' AND b.source = 'cluster_4' AND type(r) <> 'HAS_THEME'
                RETURN a, b, type(r) AS type, properties(r) AS props
                """
            elif node_type == "Destination":
                query = """
                MATCH (a:Destination {id: $from_id})-[r]->(b)
                WHERE a.source = 'cluster_4' AND b.source = 'cluster_4' AND type(r) = 'HAS_THEME'
                RETURN a, b, type(r) AS type, properties(r) AS props
                """
            elif node_type == "Theme":
                query = """
                MATCH (a:Theme {id: $from_id})-[r]->(b)
                WHERE a.source = 'cluster_4' AND b.source = 'cluster_4' AND type(r) = 'HAS_CALL'
                RETURN a, b, type(r) AS type, properties(r) AS props
                """
            else:
                # Default case for other types
                query = """
                MATCH (a {id: $from_id})-[r]->(b)
                WHERE a.source = 'cluster_4' AND b.source = 'cluster_4'
                RETURN a, b, type(r) AS type, properties(r) AS props
                """
            params = {"from_id": from_id}

        result = db.query(query, params)

        cleaned = []
        seen_edges = set()

        for record in result:
            a, b, rel_type, props = record["a"], record["b"], record["type"], record["props"]
            key = (a["id"], b["id"], rel_type)
            if key in seen_edges:
                continue
            seen_edges.add(key)
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