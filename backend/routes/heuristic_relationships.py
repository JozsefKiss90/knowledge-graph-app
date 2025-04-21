
import json
from typing import List, Dict
from itertools import combinations
from sentence_transformers import SentenceTransformer, util

# Load transformer for semantic similarity
model = SentenceTransformer("all-MiniLM-L6-v2")

# Heuristic rules for type-based relationships
HEURISTIC_RELATIONS = {
    ("policy", "mission"): "supports",
    ("mission", "cluster"): "drives",
    ("programme", "cluster"): "funds",
    ("cluster", "impact_area"): "contributes_to",
    ("strategy", "programme"): "guides",
    ("policy", "programme"): "aligns_with",
    ("policy", "cluster"): "guides",
    ("strategy", "mission"): "frames",
    ("programme", "programme"): "synergizes_with",
    ("cluster", "cluster"): "related_to",
    ("mission", "mission"): "related_to"
}

def load_nodes(path: str) -> List[Dict]:
    with open(path, "r", encoding="utf-8") as f:
        return json.load(f)

def lexical_boost(a: Dict, b: Dict) -> float:
    a_summary = a["summary"].lower()
    b_name = b["name"].lower()
    boost = 0.0

    # Direct mention of b in a's summary
    if b_name in a_summary:
        boost += 0.1

    # Title-based anchoring logic
    if "horizon" in a["name"].lower() and "cluster" in b["name"].lower():
        boost += 0.2
    if "green deal" in a["name"].lower() and "climate" in b["name"].lower():
        boost += 0.2
    if "mission" in a["name"].lower() and "adaptation" in b["name"].lower():
        boost += 0.1

    return boost

def infer_relationships(nodes: List[Dict], sim_threshold: float = 0.5) -> List[Dict]:
    relations = []
    embeddings = model.encode([n["summary"] for n in nodes], convert_to_tensor=True)

    for (i, a), (j, b) in combinations(enumerate(nodes), 2):
        key = (a["type"], b["type"])
        reverse_key = (b["type"], a["type"])
        if key not in HEURISTIC_RELATIONS and reverse_key not in HEURISTIC_RELATIONS:
            continue

        base_score = float(util.pytorch_cos_sim(embeddings[i], embeddings[j]))
        boost = lexical_boost(a, b)
        total_score = base_score + boost

        if total_score >= sim_threshold:
            if key in HEURISTIC_RELATIONS:
                relation = HEURISTIC_RELATIONS[key]
                relations.append({
                    "source": a["id"],
                    "target": b["id"],
                    "relation": relation,
                    "score": round(total_score, 3)
                })
            elif reverse_key in HEURISTIC_RELATIONS:
                relation = HEURISTIC_RELATIONS[reverse_key]
                relations.append({
                    "source": b["id"],
                    "target": a["id"],
                    "relation": relation,
                    "score": round(total_score, 3)
                })

    return relations

def run_pipeline(node_path: str, output_path: str = "relationship_output_enhanced2.json", threshold: float = 0.5):
    nodes = load_nodes(node_path)
    relations = infer_relationships(nodes, sim_threshold=threshold)
    with open(output_path, "w", encoding="utf-8") as f:
        json.dump(relations, f, indent=2, ensure_ascii=False)
    print(f"✅ Saved {len(relations)} relationships to {output_path}")
    return output_path