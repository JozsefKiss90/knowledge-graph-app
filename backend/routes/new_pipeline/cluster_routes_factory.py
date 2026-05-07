# backend/routes/new_pipleline/cluster_routes_factory.py
from typing import Optional, List
from pathlib import Path
from fastapi import APIRouter, HTTPException, Depends, Body
from pydantic import BaseModel
from database import db
from auth.auth import require_admin

class PopulatePayload(BaseModel):
    grouped: Optional[str] = None
    summaries: Optional[str] = None
    preview: bool = False

def make_cluster_router(
    prefix: str,
    tags: List[str],
    source: str,
    cluster_id: str,
    cluster_name: str,
    builder_cls,
    default_grouped_path: Optional[str] = None,
    default_summaries_path: Optional[str] = None,
    base_dir: Optional[str] = None
):
    router = APIRouter(prefix=prefix, tags=tags)
    base_dir_path = Path(base_dir).resolve() if base_dir else Path(__file__).resolve().parent

    @router.get("/nodes")
    def get_nodes():
        try:
            rows = db.query("""
                MATCH (n)
                WHERE n.source = $source AND n.id IS NOT NULL AND n.name IS NOT NULL
                RETURN n
                ORDER BY labels(n), n.name
            """, {"source": source})
            return {"status": "success", "count": len(rows), "data": rows}
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Failed to query {cluster_id} nodes: {str(e)}")

    @router.get("/relationships")
    def get_relationships(from_id: Optional[str] = None):
        try:
            if from_id:
                q = """
                MATCH (a {id:$id})-[r]->(b)
                WHERE a.source = $source AND b.source = $source
                RETURN DISTINCT a,b,type(r) AS type, properties(r) AS props
                """
                rows = db.query(q, {"id": from_id, "source": source})
            else:
                q = """
                MATCH (a)-[r]->(b)
                WHERE a.source = $source AND b.source = $source
                RETURN DISTINCT a,b,type(r) AS type, properties(r) AS props
                """
                rows = db.query(q, {"source": source})

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
                    **(props or {})
                })
            return {"relationships": cleaned}
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Failed to query {cluster_id} relationships: {str(e)}")

    @router.get("/node/{id}")
    def get_node(id: str):
        try:
            res = db.query("MATCH (n {id:$id}) RETURN n", {"id": id})
            if not res:
                raise HTTPException(status_code=404, detail="Node not found")
            return res[0]["n"]
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Failed to fetch node: {str(e)}")

    def _resolve(path_str: Optional[str], default_rel: Optional[str]) -> Optional[str]:
        """
        Use payload path if provided and not 'string'; otherwise use default_rel.
        Resolve relative paths against base_dir_path. Return absolute string or None.
        """
        candidate = path_str
        if candidate in (None, "", "string"):
            candidate = default_rel
        if candidate is None:
            return None
        p = Path(candidate)
        if not p.is_absolute():
            p = (base_dir_path / candidate).resolve()
        return str(p)

    @router.post("/populate")
    def populate(payload: PopulatePayload):
        try:
            grouped_path = _resolve(payload.grouped, default_grouped_path)
            summaries_path = _resolve(payload.summaries, default_summaries_path)

            if not grouped_path or not summaries_path:
                raise HTTPException(status_code=400, detail="Missing grouped/summaries path (no payload and no defaults).")

            builder = builder_cls(preview=payload.preview)
            builder.create_graph_from_files(grouped_path, summaries_path)
            return {"status": "success", "cluster": cluster_id, "name": cluster_name, "preview": payload.preview}
        except HTTPException:
            raise
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Failed to populate {cluster_id}: {str(e)}")

    @router.delete("/all")
    def delete_all():
        try:
            db.query("MATCH (n) WHERE n.source=$source DETACH DELETE n", {"source": source})
            return {"status": "success", "message": f"Deleted all {cluster_id} nodes & relationships.", "scope": source}
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Failed to delete {cluster_id}: {str(e)}")

    return router
