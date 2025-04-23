import fitz  # PyMuPDF
import json
import re
from typing import List, Dict
from transformers import pipeline, AutoTokenizer, AutoModelForSeq2SeqLM
from sentence_transformers import SentenceTransformer, util
from collections import defaultdict, Counter

# === Load Models ===
entity_model_name = "google/flan-t5-base"
summary_model_name = "facebook/bart-large-cnn"
classifier_model_name = "facebook/bart-large-mnli"

entity_tokenizer = AutoTokenizer.from_pretrained(entity_model_name)
entity_model = AutoModelForSeq2SeqLM.from_pretrained(entity_model_name)
entity_pipeline = pipeline("text2text-generation", model=entity_model, tokenizer=entity_tokenizer)
summary_pipeline = pipeline("summarization", model=summary_model_name)
classifier_pipeline = pipeline("zero-shot-classification", model=classifier_model_name)
embedding_model = SentenceTransformer("all-MiniLM-L6-v2")

# === Ontology and Labels ===
ENTITY_LABELS = ["impact_area", "cluster", "mission", "objective", "research_theme", "strategy", "policy", "programme"]

def normalize_name(name: str) -> str:
    return name.strip().lower()

# === Step 1: PDF Chunking ===
def chunk_pdf(pdf_path: str, max_tokens: int = 512) -> List[str]:
    doc = fitz.open(pdf_path)
    full_text = " ".join(page.get_text("text") for page in doc)
    sentences = re.split(r'(?<=[.!?]) +', full_text)
    chunks, chunk = [], ""
    for sentence in sentences:
        if len(chunk.split()) + len(sentence.split()) < max_tokens:
            chunk += " " + sentence
        else:
            chunks.append(chunk.strip())
            chunk = sentence
    if chunk:
        chunks.append(chunk.strip())
    return chunks

# === Step 2: Structured Entity Extraction ===
def extract_entities(chunk: str) -> List[str]:
    prompt = (
        "Extract key Horizon Europe entities from this text, including policies, clusters, missions, programmes, strategies, impact areas.\n"
        f"Text:\n{chunk}\nList them one per line."
    )
    output = entity_pipeline(prompt, max_new_tokens=150)[0]["generated_text"]
    entities = [line.strip("- ").strip() for line in output.split("\n") if len(line.strip()) > 3]
    return list(set(entities))

# === Step 3: Entity Typing ===
def classify_entities(entities: List[str]) -> List[Dict[str, str]]:
    classified = []
    for entity in entities:
        result = classifier_pipeline(entity, candidate_labels=ENTITY_LABELS)
        best_label = result["labels"][0]
        classified.append({"name": entity, "type": best_label})
    return classified

# === Step 4: Summarization with Context ===
def summarize_entity(entity: str, relevant_chunks: List[str]) -> str:
    joined_context = " ".join(relevant_chunks)[:1500]
    prompt = f"What is the role of {entity} in Horizon Europe 2025–2027?\n\n{joined_context}"
    summary = summary_pipeline(prompt, max_length=120, min_length=60, do_sample=False)
    return summary[0]['summary_text']

# === Step 5: Entity Deduplication ===
def deduplicate_entities(entities: List[Dict[str, str]]) -> List[Dict[str, str]]:
    seen, unique = {}, []
    for ent in entities:
        key = normalize_name(ent["name"])
        if key not in seen:
            seen[key] = ent
            unique.append(ent)
    return unique

# === Step 6: Merge Similar Entities by Embedding ===
def merge_similar_entities(entities: List[Dict[str, str]]) -> List[Dict[str, str]]:
    embeddings = embedding_model.encode([e["name"] for e in entities], convert_to_tensor=True)
    grouped, used = [], set()
    for i, ent in enumerate(entities):
        if i in used:
            continue
        group = [ent]
        for j in range(i + 1, len(entities)):
            if j in used:
                continue
            sim = util.cos_sim(embeddings[i], embeddings[j]).item()
            if sim >= 0.88:
                group.append(entities[j])
                used.add(j)
        used.add(i)

        type_counts = Counter([e["type"] for e in group if e["type"] != "unknown"])
        best_type = type_counts.most_common(1)[0][0] if type_counts else "unknown"
        base = max(group, key=lambda x: len(x.get("summary", "")))
        base["type"] = best_type
        grouped.append(base)
    return grouped

# === Step 7: Run Full Pipeline ===
def run_pipeline(pdf_path: str, output_path: str = "neo4j_nodes_refactored.json") -> str:
    chunks = chunk_pdf(pdf_path)
    entity_to_chunks = defaultdict(list)
    entity_mentions = defaultdict(list)
    all_entities = []

    for i, chunk in enumerate(chunks):
        print(f"🔍 Chunk {i+1}/{len(chunks)}")
        raw_entities = extract_entities(chunk)
        typed_entities = classify_entities(raw_entities)
        for ent in typed_entities:
            name = normalize_name(ent["name"])
            entity_to_chunks[name].append(chunk)
            entity_mentions[name].append(i)
        all_entities.extend(typed_entities)

    deduped = deduplicate_entities(all_entities)
    merged = merge_similar_entities(deduped)

    for ent in merged:
        norm_name = normalize_name(ent["name"])
        ent["mentions"] = entity_mentions.get(norm_name, [])
        ent["contexts"] = [chunks[i] for i in ent["mentions"][:3]]
        ent["summary"] = summarize_entity(ent["name"], entity_to_chunks[norm_name])
        ent["id"] = re.sub(r"[^a-z0-9]+", "_", ent["name"].lower()).strip("_")

    with open(output_path, "w", encoding="utf-8") as f:
        json.dump(merged, f, indent=2, ensure_ascii=False)

    print(f"✅ Extracted and saved {len(merged)} entities to {output_path}")
    return output_path