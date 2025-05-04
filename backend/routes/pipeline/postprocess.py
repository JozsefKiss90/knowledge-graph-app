import json
import re
from sentence_transformers import SentenceTransformer, util
from transformers import pipeline
from typing import List, Dict
from collections import defaultdict

# Load models
embedder = SentenceTransformer("all-MiniLM-L6-v2")
zero_shot_classifier = pipeline("zero-shot-classification", model="facebook/bart-large-mnli")
canonicalizer = pipeline("text2text-generation", model="google/flan-t5-large")

DEBUG = True

def clean_name(name: str) -> str:
    return re.sub(r"\\s+", " ", name.strip())

def is_valid_entity(name: str) -> bool:
    result = zero_shot_classifier(name, candidate_labels=["valid entity", "fragment", "footer"])
    label = result["labels"][0]
    score = result["scores"][0]
    if DEBUG:
        print(f"🔍 Filtering '{name}' -> {label} ({score:.2f})")
    return label == "valid entity" and score > 0.55

def canonicalize_group(variants: List[str]) -> str:
    prompt = (
        "The following are different versions of a policy or research entity. "
        "Pick the best short and clean name using only essential keywords. "
        "Use only essential keywords. Return a short name like "
        "'Cluster 5', 'Horizon Europe', 'European Green Deal', etc. Do not repeat words."
        "Do NOT include full sentences, verbs, or phrases like 'must do', 'will promote', or 'should ensure'.\n"
    )
    for v in variants:
        prompt += f"- {v.strip()}\n"
    prompt += "Best canonical name:"

    result = canonicalizer(prompt, max_new_tokens=24)[0]["generated_text"].strip()

    # Clean result
    result = result.split(",")[0]
    result = re.sub(r"\\b(\\w+)( \\1\\b)+", r"\\1", result)
    result = re.sub(r"^(EU budget|Looking into|This strategy|The strategy|Using)", "", result)
    result = re.sub(r"[^\w\s\-\&]", "", result)
    result = re.sub(r"\\s+", " ", result).strip()
    if DEBUG:
        print(f"📌 Canonicalizing group: {variants} -> {result}")
    return result

def refine_entities(input_path: str = "full_extracted_entities.json", output_path: str = "neo4j_nodes_llm_refined.json") -> List[Dict[str, str]]:
    with open(input_path, "r", encoding="utf-8") as f:
        raw_data = json.load(f)

    entities = []
    for chunk in raw_data:
        for ent in chunk.get("entities", []):
            name = clean_name(ent["name"])
            if name and is_valid_entity(name):
                entities.append({"name": name, "type": ent.get("type", "unknown")})

    if DEBUG:
        print(f"🧠 {len(entities)} entities passed the filter.")

    names = [e["name"] for e in entities]
    embeddings = embedder.encode(names, convert_to_tensor=True)

    threshold = 0.8
    used = set()
    clusters = []

    for i, name in enumerate(names):
        if i in used:
            continue
        group = [name]
        used.add(i)
        for j in range(i + 1, len(names)):
            if j in used:
                continue
            sim = float(util.cos_sim(embeddings[i], embeddings[j]))
            if sim > threshold:
                group.append(names[j])
                used.add(j)
        clusters.append(group)

    refined = []
    seen_ids = set()
    for group in clusters:
        canonical = canonicalize_group(group)
        if not canonical or len(canonical.split()) > 10 or len(canonical) < 5:
            continue
        canonical_id = re.sub(r"[^\w]+", "_", canonical.lower()).strip("_")
        if canonical_id in seen_ids:
            continue
        seen_ids.add(canonical_id)
        type_counts = defaultdict(int)
        for g in group:
            for e in entities:
                if e["name"] == g:
                    type_counts[e["type"]] += 1
        most_common_type = max(type_counts.items(), key=lambda x: x[1])[0]
        refined.append({
            "id": canonical_id,
            "name": canonical,
            "type": most_common_type,
            "summary": ""
        })

    with open(output_path, "w", encoding="utf-8") as f:
        json.dump(refined, f, indent=2, ensure_ascii=False)

    print(f"✅ Refined and saved {len(refined)} entities to {output_path}")
    return refined
