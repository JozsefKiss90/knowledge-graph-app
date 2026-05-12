"""
FastAPI routes for the HE Wiki Knowledge Graph.

Endpoints:
    GET  /hewiki/nodes          - all HEWikiNode nodes
    GET  /hewiki/relationships   - all relationships between he_wiki nodes
    GET  /hewiki/node/{id}       - single node by id
    POST /hewiki/populate        - run builder from JSON files
    DELETE /hewiki/all           - delete all he_wiki nodes + relationships
"""

from typing import Optional
from pathlib import Path
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from database import db
from .he_wiki_builder import HEWikiGraphBuilder, SOURCE_TAG, DEFAULT_NODES_PATH, DEFAULT_RELS_PATH

router = APIRouter(prefix="/hewiki", tags=["HE Wiki Knowledge Graph"])

BASE_DIR = Path(__file__).resolve().parent


class PopulatePayload(BaseModel):
    nodes_path: Optional[str] = None
    relationships_path: Optional[str] = None
    preview: bool = False


def _resolve(path_str: Optional[str], default: str) -> str:
    if path_str in (None, "", "string"):
        return default
    p = Path(path_str)
    if not p.is_absolute():
        p = (BASE_DIR / path_str).resolve()
    return str(p)


@router.get("/nodes")
def get_nodes():
    try:
        rows = db.query("""
            MATCH (n:HEWikiNode)
            WHERE n.source = $source AND n.id IS NOT NULL AND n.name IS NOT NULL
            RETURN n
            ORDER BY n.category, n.name
        """, {"source": SOURCE_TAG})
        return {"status": "success", "count": len(rows), "data": rows}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to query HE Wiki nodes: {str(e)}")


@router.get("/relationships")
def get_relationships(from_id: Optional[str] = None):
    try:
        if from_id:
            q = """
            MATCH (a:HEWikiNode {id: $id})-[r]->(b:HEWikiNode)
            WHERE a.source = $source AND b.source = $source
            RETURN DISTINCT a, b, type(r) AS type, properties(r) AS props
            """
            rows = db.query(q, {"id": from_id, "source": SOURCE_TAG})
        else:
            q = """
            MATCH (a:HEWikiNode)-[r]->(b:HEWikiNode)
            WHERE a.source = $source AND b.source = $source
            RETURN DISTINCT a, b, type(r) AS type, properties(r) AS props
            """
            rows = db.query(q, {"source": SOURCE_TAG})

        cleaned = []
        seen = set()
        for rec in rows:
            a, b, t, props = rec["a"], rec["b"], rec["type"], rec["props"]
            key = (a["id"], b["id"], t)
            if key in seen:
                continue
            seen.add(key)
            cleaned.append({
                "id": f"{a['id']}->{b['id']}",
                "source": a["id"],
                "target": b["id"],
                "type": t,
                "label": t,
                **(props or {}),
            })
        return {"relationships": cleaned}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to query HE Wiki relationships: {str(e)}")


@router.get("/node/{id}")
def get_node(id: str):
    try:
        res = db.query("MATCH (n:HEWikiNode {id: $id}) RETURN n", {"id": id})
        if not res:
            raise HTTPException(status_code=404, detail="Node not found")
        return res[0]["n"]
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch node: {str(e)}")


@router.post("/populate")
def populate(payload: PopulatePayload):
    try:
        nodes_path = _resolve(payload.nodes_path, DEFAULT_NODES_PATH)
        rels_path = _resolve(payload.relationships_path, DEFAULT_RELS_PATH)

        builder = HEWikiGraphBuilder(preview=payload.preview)
        stats = builder.create_graph_from_files(nodes_path, rels_path)

        return {
            "status": "success",
            "source": SOURCE_TAG,
            "preview": payload.preview,
            **stats,
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to populate HE Wiki graph: {str(e)}")


@router.delete("/all")
def delete_all():
    try:
        db.query("MATCH (n:HEWikiNode) WHERE n.source = $source DETACH DELETE n", {"source": SOURCE_TAG})
        return {"status": "success", "message": "Deleted all HE Wiki nodes & relationships.", "scope": SOURCE_TAG}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to delete HE Wiki graph: {str(e)}")
