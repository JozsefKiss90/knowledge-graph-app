from fastapi import APIRouter, HTTPException, Path, Query
from pydantic import BaseModel
from typing import Dict, Any, Optional
from pathlib import Path
import json
from database import db

router = APIRouter(prefix="/nodes", tags=["Nodes"])

class NodeCreateRequest(BaseModel):
    label: str
    properties: Dict[str, Any]

class NodeUpdateRequest(BaseModel):
    label: str
    name: str  # Unique identifier
    updates: Dict[str, Any]

@router.post("/")
def create_node(request: NodeCreateRequest):
    try:
        cypher = f"CREATE (n:{request.label}) SET n += $props RETURN n"
        result = db.query(cypher, {"props": request.properties})
        return {"node": result}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to create node: {str(e)}")
    
@router.get("/")
def list_nodes(label: Optional[str] = None):
    try:
        if label:
            cypher = f"MATCH (n:{label}) RETURN n"
        else:
            cypher = """
            MATCH (n)
            WHERE n.id IS NOT NULL AND n.name IS NOT NULL
            RETURN n
            """
        result = db.query(cypher)
        filtered_result = [r for r in result if r.get("n", {}).get("name")]

        # ✅ Patch in canonical topics
        topic_path = Path("canonical_topic_nodes.json")
        if topic_path.exists():
            with open(topic_path) as f:
                topic_data = json.load(f)
                for topic in topic_data:
                    filtered_result.append({
                        "n": {
                            "id": topic["id"],
                            "name": topic["label"],
                            "type": "topic",
                            "summary": ""
                        }
                    })

        return {"nodes": filtered_result}

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to list nodes: {str(e)}")

@router.get("/{node_id}")
def get_node_by_id(node_id: str):
    try:
        cypher = "MATCH (n {id: $id}) RETURN n"
        result = db.query(cypher, {"id": node_id})
        if not result:
            raise HTTPException(status_code=404, detail="Node not found")
        n = result[0]["n"]
        return {
            "id": n.get("id"),
            "name": n.get("name"),
            "summary": n.get("summary", ""),
            "type": n.get("type", "")
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch node: {str(e)}")


@router.put("/")
def update_node(request: NodeUpdateRequest):
    try:
        cypher = f"""
        MATCH (n:{request.label} {{name: $name}})
        SET n += $updates
        RETURN n
        """
        result = db.query(cypher, {"name": request.name, "updates": request.updates})
        return {"updated_node": result}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to update node: {str(e)}")

@router.delete("/")
def delete_node(label: str = Query(...), name: str = Query(...)):
    try:
        cypher = f"""
        MATCH (n:{label} {{name: $name}})
        DETACH DELETE n
        RETURN n
        """ 
        result = db.query(cypher, {"name": name})
        return {"deleted": result}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to delete node: {str(e)}")

@router.get("/raw_nodes/")
async def get_raw_nodes():
    query = """
    MATCH (n)
    RETURN n
    """
    try:
        result = db.query(query)
        nodes = []
        for record in result:
            n = record.get("n", {})
            nodes.append({
                "id": n.get("id"),
                "name": n.get("name", "Unnamed"),
                "summary": n.get("summary", ""),
                "type": n.get("type", "")
            })
        return {"nodes": nodes}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch raw nodes: {str(e)}")

