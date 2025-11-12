from fastapi import APIRouter, HTTPException, Path, Query, Depends
from pydantic import BaseModel
from typing import Dict, Any, Optional
from pathlib import Path
import json
from database import db
from auth.auth import require_admin
from utils.rate_limiter import limiter
from utils.validation import validate_cypher_identifier 

router = APIRouter(prefix="/nodes", tags=["Nodes"])

def format_label(key: str) -> str:
    return key.replace("_", " ").title()

class NodeCreateRequest(BaseModel):
    label: str
    properties: Dict[str, Any]

class NodeUpdateRequest(BaseModel):
    label: str
    name: str  # Unique identifier
    updates: Dict[str, Any]

@router.post("/", dependencies=[Depends(require_admin)])
def create_node(request: NodeCreateRequest):
    try:
        validate_cypher_identifier(request.label)
        cypher = f"CREATE (n:{request.label}) SET n += $props RETURN n"
        result = db.query(cypher, {"props": request.properties})
        return {"node": result}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to create node: {str(e)}")
    
@router.get("/")
def list_nodes(label: Optional[str] = None):
    try:
        if label:
            validate_cypher_identifier(label)
            cypher = f"MATCH (n:{label}) RETURN n"
        else:
            cypher = """
            MATCH (n)
            WHERE (n.id IS NOT NULL AND n.name IS NOT NULL)
            AND (n.source IS NULL OR (n.source <> 'cluster_4' AND n.source <> 'cluster_2' AND n.source <> 'cluster_3'))
            RETURN n
            """
        result = db.query(cypher)
        filtered_result = [r for r in result if r.get("n", {}).get("name")]

            # Also include all topic nodes from Neo4j (no hardcoding)
        topic_cypher = "MATCH (t:Topic) RETURN t"
        topic_nodes = db.query(topic_cypher)
        for r in topic_nodes:
            t = r["t"]
            filtered_result.append({
                "n": {
                    "id": t.get("id"),
                    "name": format_label(t.get("name", t.get("id"))),
                    "type": "topic",
                    "summary": t.get("summary", "")
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


@router.put("/", dependencies=[Depends(require_admin)])
def update_node(request: NodeUpdateRequest):
    try:
        validate_cypher_identifier(request.label)
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
        validate_cypher_identifier(label)
        cypher = f"""
        MATCH (n:{label} {{name: $name}})
        DETACH DELETE n
        RETURN n
        """ 
        result = db.query(cypher, {"name": name})
        return {"deleted": result}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to delete node: {str(e)}")