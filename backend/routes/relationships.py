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
        if from_id:
            cypher = """
            MATCH (a {id: $from})-[r]->(b)
            RETURN a, r, b
            """
            result = db.query(cypher, {"from": from_id})
        elif from_name:
            cypher = """
            MATCH (a {name: $from})-[r]->(b)
            RETURN a, r, b
            """
            result = db.query(cypher, {"from": from_name})
        else:
            cypher = """
            MATCH (a)-[r]->(b)
            RETURN a, b, type(r) AS type, properties(r) AS props
            """
            result = db.query(cypher)

        # 🛠 NEW: Reformat relationships cleanly
            cleaned_relationships = []
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

@router.get("/raw_relationships/")
async def get_raw_relationships():
    try:
        cypher = """
        MATCH (a)-[r]->(b)
        RETURN a, r, b
        """
        result = db.query(cypher)

        relationships = []

        for record in result:
            a = record["a"]
            r = record["r"]
            b = record["b"]

            # 🧠 Step 1: Try to extract the true relation type
            if isinstance(r, dict):
                # Normal case: r is a relationship object with 'type' property
                relation_type = r.get("type", "UNKNOWN")
            elif isinstance(r, list):
                # Often it's a [sourceNode, 'RELATION_TYPE', targetNode]
                relation_type = next((x for x in r if isinstance(x, str)), "UNKNOWN")
            elif isinstance(r, str) and "BELONGS_TO_TOPIC" in r:
                # Fallback for serialized weird data
                relation_type = "BELONGS_TO_TOPIC"
            else:
                relation_type = "UNKNOWN"

            relationships.append({
                "id": f"{a.get('id', 'unknown')}->{b.get('id', 'unknown')}",
                "source": a.get("id", "unknown"),
                "target": b.get("id", "unknown"),
                "type": relation_type,
                "label": relation_type,
            })

        return {"relationships": relationships}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch raw relationships: {str(e)}")

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

