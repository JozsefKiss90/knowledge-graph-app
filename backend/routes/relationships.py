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
            MATCH (a)-[r]->(b)
            WHERE exists(a.id) AND exists(b.id)
            RETURN a, r, b
            """
        result = db.query(cypher, {
            "from": request.from_name,
            "to": request.to_name
        })
        return {"relationship": result}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to create relationship: {str(e)}")

@router.get("/")
def get_relationships(from_id: Optional[str] = Query(None), from_name: Optional[str] = Query(None)):
    try:
        cleaned_relationships = []  # ✅ always define it first

        if from_id:
            cypher = """
            MATCH (a {id: $from_id})-[r]->(b)
            RETURN a, b, type(r) AS type, properties(r) AS props
            """
            result = db.query(cypher, {"from_id": from_id})
        else:
            cypher = """
            MATCH (a)-[r]->(b)
            RETURN a, b, type(r) AS type, properties(r) AS props
            """
            result = db.query(cypher)

        for record in result:
            a = record["a"]
            b = record["b"]
            rel_type = record["type"]
            props = record["props"]

            cleaned_relationships.append({
                "id": f"{a['id']}->{b['id']}",
                "source": a["id"],
                "target": b["id"],
                "type": rel_type,
                "label": rel_type,
                **props
            })
        return {"relationships": cleaned_relationships}
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


@router.get("/debug_unprocessed/")
def debug_unprocessed_relationships():
    try:
        cypher = """
        MATCH (a)-[r]->(b)
        RETURN a, b, type(r) AS type, properties(r) AS props
        """ 
        result = db.query(cypher)

        relationships = []

        for record in result:
            a = record["a"]
            b = record["b"]
            rel_type = record["type"]
            props = record["props"]
            
            relationships.append({
                "source": a.get("id"),
                "target": b.get("id"),
                "type": rel_type,
                **props
            })

        
        return {"raw_result": relationships}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch raw relationships: {str(e)}")

