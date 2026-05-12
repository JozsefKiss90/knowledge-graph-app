"""
Load HE Wiki JSON files into Neo4j.

Nodes get label :HEWikiNode, all tagged with source='he_wiki'.
Relationships: RELATES_TO (frontmatter) and WIKI_LINK (body wikilinks).
"""

import json
import os
from pathlib import Path
from typing import Any, Dict, List, Optional

try:
    from database import db
except Exception:
    class _DummyDB:
        def query(self, q, p=None):
            pass
    db = _DummyDB()

SCRIPT_DIR = Path(__file__).resolve().parent
DEFAULT_NODES_PATH = str(SCRIPT_DIR / "output" / "he_wiki_nodes.json")
DEFAULT_RELS_PATH = str(SCRIPT_DIR / "output" / "he_wiki_relationships.json")

SOURCE_TAG = "he_wiki"


def _neo4j_value(v: Any) -> Any:
    if v is None:
        return None
    if isinstance(v, (str, int, float, bool)):
        return v
    if isinstance(v, dict):
        return json.dumps(v, ensure_ascii=False, sort_keys=True)
    if isinstance(v, list):
        return [str(item) for item in v if item is not None]
    return str(v)


def _sanitize_props(props: Dict[str, Any]) -> Dict[str, Any]:
    return {k: _neo4j_value(v) for k, v in props.items()}


class HEWikiGraphBuilder:
    SOURCE_TAG = SOURCE_TAG

    def __init__(self, preview: bool = False):
        self.preview = preview
        self._log: List[str] = []

    def _run(self, query: str, params: Optional[Dict[str, Any]] = None):
        if self.preview:
            return
        db.query(query, params or {})

    def create_graph_from_files(
        self,
        nodes_path: str = DEFAULT_NODES_PATH,
        relationships_path: str = DEFAULT_RELS_PATH,
    ) -> Dict[str, int]:
        if not os.path.exists(nodes_path):
            raise FileNotFoundError(f"Nodes file not found: {nodes_path}")
        if not os.path.exists(relationships_path):
            raise FileNotFoundError(f"Relationships file not found: {relationships_path}")

        with open(nodes_path, "r", encoding="utf-8") as f:
            nodes = json.load(f)
        with open(relationships_path, "r", encoding="utf-8") as f:
            relationships = json.load(f)

        # Create nodes
        for node in nodes:
            props = _sanitize_props({
                "id": node["id"],
                "name": node["name"],
                "type": node.get("type", ""),
                "source": SOURCE_TAG,
                "category": node.get("category", ""),
                "summary": node.get("summary", ""),
                "keywords": node.get("keywords", []),
                "aliases": node.get("aliases", []),
                "source_documents": node.get("source_documents", []),
                "body": node.get("body", ""),
                "status": node.get("status", "active"),
            })

            self._run(
                """
                MERGE (n:HEWikiNode {id: $id})
                SET n += $props
                """,
                {"id": node["id"], "props": props},
            )

        # Create relationships
        rels_created = 0
        for rel in relationships:
            rel_type = rel.get("type", "RELATES_TO")
            origin = rel.get("origin", "")

            if rel_type == "RELATES_TO":
                self._run(
                    """
                    MATCH (a:HEWikiNode {id: $source}), (b:HEWikiNode {id: $target})
                    MERGE (a)-[r:RELATES_TO]->(b)
                    SET r.origin = $origin
                    """,
                    {"source": rel["source"], "target": rel["target"], "origin": origin},
                )
            else:
                self._run(
                    """
                    MATCH (a:HEWikiNode {id: $source}), (b:HEWikiNode {id: $target})
                    MERGE (a)-[r:WIKI_LINK]->(b)
                    SET r.origin = $origin
                    """,
                    {"source": rel["source"], "target": rel["target"], "origin": origin},
                )
            rels_created += 1

        return {
            "nodes_created": len(nodes),
            "relationships_created": rels_created,
        }
