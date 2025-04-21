from fastapi import APIRouter, HTTPException, Body, Query
from pydantic import BaseModel
from database import db
from typing import Optional

router = APIRouter(prefix="/relationships", tags=["Relationships"])

class RelationshipCreateRequest(BaseModel):
    from_name: str
    to_name: str
    relation_type: str

@router.post("/")
def create_relationship(request: RelationshipCreateRequest = Body(...)):
    try:
        cypher = f"""
        MATCH (a {{name: $from}}), (b {{name: $to}})
        CREATE (a)-[r:{request.relation_type}]->(b)
        RETURN a, r, b
        """
        result = db.query(cypher, {
            "from": request.from_name,
            "to": request.to_name
        })
        return {"relationship": result}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to create relationship: {str(e)}")

from fastapi import APIRouter, HTTPException, Query
from typing import Optional
from database import db

router = APIRouter(prefix="/relationships", tags=["Relationships"])

@router.get("/")
def get_relationships(from_name: Optional[str] = Query(None)):
    try:
        if from_name:
            cypher = """
            MATCH (a {name: $from})-[r]->(b)
            RETURN a, r, b
            """
            result = db.query(cypher, {"from": from_name})
        else:
            cypher = "MATCH (a)-[r]->(b) RETURN a, r, b"
            result = db.query(cypher)

        return {"relationships": result}

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch relationships: {str(e)}")

@router.delete("/")
def delete_relationship(from_name: str = Query(...), to_name: str = Query(...), relation_type: str = Query(...)):
    try:
        cypher = f"""
        MATCH (a {{name: $from}})-[r:{relation_type}]->(b {{name: $to}})
        DELETE r
        RETURN a, b
        """
        result = db.query(cypher, {"from": from_name, "to": to_name})
        return {"deleted_relationship": result}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to delete relationship: {str(e)}")
