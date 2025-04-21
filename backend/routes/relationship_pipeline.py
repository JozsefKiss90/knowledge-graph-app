
import json
import re
from typing import List, Dict
from itertools import combinations
from transformers import pipeline

# Load the language model for relationship inference
model_name = "google/flan-t5-base"
inference_pipeline = pipeline("text2text-generation", model=model_name)

# Define valid directed type-based relationship schemas
VALID_RELATION_SCHEMAS = {
    ("policy", "mission"): ["supports", "guides"],
    ("mission", "cluster"): ["implemented_by", "drives"],
    ("programme", "cluster"): ["funds", "aligns_with"],
    ("cluster", "impact_area"): ["contributes_to", "targets"],
}

def load_nodes(path: str) -> List[Dict]:
    with open(path, "r", encoding="utf-8") as f:
        return json.load(f)

def is_valid_pair(type_a: str, type_b: str) -> bool:
    return (type_a, type_b) in VALID_RELATION_SCHEMAS

def generate_prompt(a: Dict, b: Dict) -> str:
    return (
        f"Entity A: {a['name']} ({a['type']})\n"
        f"Summary: {a.get('summary', '')}\n\n"
        f"Entity B: {b['name']} ({b['type']})\n"
        f"Summary: {b.get('summary', '')}\n\n"
        f"What is the relationship between these entities in the EU strategic policy context?\n"
        f"Respond with a JSON triple in the format:\n"
        f'{{"source": "{a["id"]}", "target": "{b["id"]}", "relation": "..."}}\n'
        f"If no clear relationship exists, respond with 'None'."
    )

def extract_relationships(nodes: List[Dict]) -> List[Dict]:
    relationships = []
    pair_count = 0
    for a, b in combinations(nodes, 2):
        if not is_valid_pair(a["type"], b["type"]):
            continue
        pair_count += 1
        prompt = generate_prompt(a, b)
        print(f"🧪 Checking relation between: {a['name']} → {b['name']}")
        print(prompt)
        result = inference_pipeline(prompt, max_new_tokens=64, do_sample=False)[0]["generated_text"]
        print(f"📝 Model output: {result}")
        if "None" in result or "none" in result:
            continue
        try:
            match = re.search(r"{[^}]+}", result)
            if match:
                rel = eval(match.group())
                if all(k in rel for k in ("source", "target", "relation")):
                    print(f"✅ Relation extracted: {rel}")
                    relationships.append(rel)
        except Exception as e:
            print(f"❌ Failed to parse relation: {e}")
            continue
    print(f"🔍 Checked {pair_count} valid pairs")
    print(f"✅ Found {len(relationships)} valid relationships")
    return relationships

def run_pipeline(node_path: str, output_path: str = "relationship_output.json"):
    nodes = load_nodes(node_path)
    print(f"📦 Loaded {len(nodes)} nodes")
    edges = extract_relationships(nodes)
    with open(output_path, "w", encoding="utf-8") as f:
        json.dump(edges, f, indent=2, ensure_ascii=False)
    print(f"📤 Saved {len(edges)} relationships to {output_path}")
    return output_path
