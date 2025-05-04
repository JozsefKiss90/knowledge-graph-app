
import json

def save_nodes_to_json(nodes: list, path: str = "neo4j_nodes.json"):
    with open(path, "w", encoding="utf-8") as f:
        json.dump(nodes, f, indent=2, ensure_ascii=False)
