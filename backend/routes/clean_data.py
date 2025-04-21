import json
import re
from difflib import get_close_matches
from pathlib import Path

# Load raw output
with open("/mnt/data/output.json", "r", encoding="utf-8") as f:
    raw_data = json.load(f)

entities = raw_data.get("entities", [])

# Helper to slugify and normalize names
def normalize_name(name: str) -> str:
    name = re.sub(r"[^\w\s]", "", name)  # remove punctuation
    name = re.sub(r"\s+", " ", name).strip()  # collapse whitespace
    name = name.lower()
    return name

def slugify(text: str) -> str:
    text = text.lower()
    text = re.sub(r"[^\w\s-]", "", text)
    text = re.sub(r"[-\s]+", "_", text)
    return text.strip("_")

# Deduplication based on normalized name + fuzzy matching
name_map = {}
cleaned_entities = []

for ent in entities:
    raw_name = ent["name"].strip()
    normalized = normalize_name(raw_name)

    # skip if the name is excessively long
    if len(raw_name.split()) > 15 or len(raw_name) > 120:
        continue

    # fuzzy match to existing names
    match = get_close_matches(normalized, name_map.keys(), cutoff=0.85, n=1)
    if match:
        existing_key = match[0]
        # keep the better summary if longer
        if len(ent.get("summary", "")) > len(name_map[existing_key]["summary"]):
            name_map[existing_key]["summary"] = ent.get("summary", "")
        continue

    # accept new node
    name_map[normalized] = {
        "id": slugify(raw_name),
        "name": raw_name,
        "type": ent.get("type", "unknown"),
        "summary": ent.get("summary", "")
    }

# Limit to ~50 most unique and usable entities
cleaned_entities = list(name_map.values())
cleaned_entities = sorted(cleaned_entities, key=lambda x: len(x["summary"]), reverse=True)[:50]

# Save final result
final_path = "/mnt/data/neo4j_nodes_cleaned.json"
with open(final_path, "w", encoding="utf-8") as f:
    json.dump(cleaned_entities, f, indent=2, ensure_ascii=False)

final_path