from fastapi import APIRouter, HTTPException, Path, Query
from pydantic import BaseModel
from typing import Dict, Any, Optional
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
            cypher = "MATCH (n) RETURN n"
        result = db.query(cypher)
        return {"nodes": result}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to list nodes: {str(e)}")

@router.get("/{name}")
def get_node_by_name(name: str):
    try:
        cypher = "MATCH (n {name: $name}) RETURN n"
        result = db.query(cypher, {"name": name})
        if not result:
            raise HTTPException(status_code=404, detail="Node not found")
        return {"node": result[0]}  # Return the first matched node
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
