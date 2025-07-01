import fitz  # PyMuPDF
import json
import re
from typing import List, Dict
from transformers import pipeline, AutoTokenizer, AutoModelForSeq2SeqLM
from sentence_transformers import SentenceTransformer, util
from collections import defaultdict, Counter

# === Load Models ===
entity_model = "google/flan-t5-base"
summary_model = "facebook/bart-large-cnn"
classifier_model = "facebook/bart-large-mnli"
entity_pipeline = pipeline("text2text-generation", model=entity_model)
summary_pipeline = pipeline("summarization", model=summary_model)
classifier_pipeline = pipeline("zero-shot-classification", model=classifier_model)
embedding_model = SentenceTransformer("all-MiniLM-L6-v2")

ENTITY_LABELS = ["impact_area", "cluster", "mission", "objective", "research_theme", "strategy", "policy", "programme"]

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
        "Return one per line:"
    )
    output = entity_pipeline(f"{prompt}\n\n{chunk}", max_new_tokens=100)[0]["generated_text"]
    entities = [line.strip("-•—– ").strip() for line in output.split("\n") if len(line.split()) < 10 and len(line.strip()) > 3]
    return list(set(entities))

# === Step 3: Entity Typing with Scores ===
def classify_entities(entities: List[str]) -> List[Dict[str, str]]:
    result = []
    for entity in entities:
        out = classifier_pipeline(entity, candidate_labels=ENTITY_LABELS)
        best_label = out["labels"][0]
        confidence = out["scores"][0]
        result.append({"name": entity, "type": best_label if confidence >= 0.6 else "unknown", "score": confidence})
    return result

# === Step 4: Entity-Aware Summarization ===
def summarize_entity(entity: str, context_chunks: List[str]) -> str:
    context = " ".join(context_chunks[:3])[:1500]
    prompt = (
        f"What is the role of '{entity}' in the Horizon Europe 2025–2027 Strategic Plan? "
        f"Describe its purpose, thematic links, and expected impacts.\n\n{context}"
    )
    output = summary_pipeline(prompt, max_length=180, min_length=60, do_sample=False)
    return output[0]["summary_text"]

# === Step 5: Deduplication (name-normalized)
def deduplicate_entities(entities: List[Dict[str, str]]) -> List[Dict[str, str]]:
    seen, unique = {}, []
    for ent in entities:
        key = ent["name"].lower().strip()
        if key not in seen:
            seen[key] = ent
            unique.append(ent)
    return unique

# === Step 6: Entity Merging by Embedding + Voting
def merge_entities(entities: List[Dict[str, str]]) -> List[Dict[str, str]]:
    names = [e["name"] for e in entities]
    embeddings = embedding_model.encode(names, convert_to_tensor=True)
    merged, used = [], set()

    for i, ent in enumerate(entities):
        if i in used:
            continue
        group = [ent]
        for j in range(i + 1, len(entities)):
            if j in used:
                continue
            if util.cos_sim(embeddings[i], embeddings[j]) >= 0.88:
                group.append(entities[j])
                used.add(j)
        used.add(i)
        # Voting logic
        type_votes = Counter(e["type"] for e in group if e["type"] != "unknown")
        final_type = type_votes.most_common(1)[0][0] if type_votes else "unknown"
        base = max(group, key=lambda x: len(x["name"]))
        base["type"] = final_type
        merged.append(base)
    return merged

# === Step 7: Clean Context and Track Mentions
def clean_text(text: str) -> str:
    return re.sub(r"[\n\r\t\u2022\u0007]", " ", text).strip()

# === Step 8: Run Pipeline
def run_pipeline(pdf_path: str, output_path: str = "neo4j_nodes_refactored.json") -> str:
    chunks = chunk_pdf(pdf_path)
    entity_chunks = defaultdict(list)
    entity_mentions = defaultdict(list)
    raw_entities = []

    for i, chunk in enumerate(chunks):
        print(f"🔍 Chunk {i+1}/{len(chunks)}")
        extracted = extract_entities(chunk)
        typed = classify_entities(extracted)
        for ent in typed:
            name_key = ent["name"].lower().strip()
            entity_chunks[name_key].append(clean_text(chunk))
            entity_mentions[name_key].append(i)
        raw_entities.extend(typed)

    deduped = deduplicate_entities(raw_entities)
    merged = merge_entities(deduped)

    for ent in merged:
        norm = ent["name"].lower().strip()
        ent["id"] = re.sub(r"[^a-z0-9]+", "_", norm).strip("_")
        ent["mentions"] = sorted(entity_mentions.get(norm, []))
        ent["contexts"] = entity_chunks.get(norm, [])[:3]
        ent["summary"] = summarize_entity(ent["name"], ent["contexts"])

    with open(output_path, "w", encoding="utf-8") as f:
        json.dump(merged, f, indent=2, ensure_ascii=False)

    print(f"✅ Saved {len(merged)} enriched nodes to {output_path}")
    return output_path
