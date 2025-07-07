# Re-run code block after kernel reset to regenerate the full pipeline script

from transformers import pipeline, AutoTokenizer, AutoModelForSeq2SeqLM
from typing import List, Dict
from itertools import combinations
import fitz  # PyMuPDF
import re
import json

# Load models
entity_model_name = "google/flan-t5-base"
summary_model_name = "facebook/bart-large-cnn"
classifier_model_name = "facebook/bart-large-mnli"

entity_tokenizer = AutoTokenizer.from_pretrained(entity_model_name)
entity_model = AutoModelForSeq2SeqLM.from_pretrained(entity_model_name)
entity_pipeline = pipeline("text2text-generation", model=entity_model, tokenizer=entity_tokenizer)

summary_pipeline = pipeline("summarization", model=summary_model_name)
classifier_pipeline = pipeline("zero-shot-classification", model=classifier_model_name)

ENTITY_LABELS = ["impact_area", "cluster", "pillar" "mission", "objective", "research_theme", "strategy", "policy", "programme"]

def extract_entities(text: str) -> List[str]: 
    prompt = (
        "Extract all relevant EU policy concepts, programmes, clusters, or impact areas from this text. "
        "List them one per line:\n\n" + text
    )
    output = entity_pipeline(prompt, max_new_tokens=150)[0]["generated_text"]
    entities = [line.strip("- ").strip() for line in output.split("\n") if len(line.strip()) > 3]
    return list(set(entities))

def classify_entities(entities: List[str]) -> List[Dict[str, str]]:
    classified = []
    for entity in entities:
        result = classifier_pipeline(entity, candidate_labels=ENTITY_LABELS)
        best_label = result["labels"][0]
        classified.append({"name": entity, "type": best_label})
    return classified

def extract_relationships_pairwise(text: str, entities: List[Dict[str, str]]) -> List[Dict[str, str]]:
    pairs = combinations(entities, 2)
    relationships = []
    for a, b in pairs:
        prompt = (
            f"Determine the relationship (if any) between the following entities based on the policy text:\n"
            f"Entity A: {a['name']} ({a['type']})\nEntity B: {b['name']} ({b['type']})\n\n"
            f"Text:\n{text}\n\nReturn in format: {{'source': ..., 'target': ..., 'relation': ...}}"
        )
        output = entity_pipeline(prompt, max_new_tokens=64)[0]["generated_text"]
        try:
            rel = eval(re.search(r"{[^}]+}", output).group())
            if "source" in rel and "target" in rel and "relation" in rel:
                relationships.append(rel)
        except:
            continue
    return relationships 

def summarize_entity(text: str, entity: str) -> str:
    input_text = f"What is the role of {entity} in this policy context?\n\n{text}"
    words = input_text.split() 
    if len(words) > 512:
        input_text = " ".join(words[:512])
    summary = summary_pipeline(input_text, max_length=60, min_length=20, do_sample=False)
    return summary[0]['summary_text']

def chunk_text(text: str, max_tokens: int = 512) -> List[str]:
    # Replace NLTK with naive regex-based sentence splitter
    import re
    sentences = re.split(r'(?<=[.!?]) +', text)
    chunks = []
    chunk = ""

    for sentence in sentences:
        if len(chunk.split()) + len(sentence.split()) < max_tokens:
            chunk += " " + sentence
        else:
            chunks.append(chunk.strip())
            chunk = sentence
    if chunk:
        chunks.append(chunk.strip())
    return chunks


def deduplicate_entities(entities: List[Dict[str, str]]) -> List[Dict[str, str]]:
    seen = {}
    for ent in entities:
        key = ent["name"].strip().lower()
        if key not in seen:
            seen[key] = ent
    return list(seen.values())

def run_full_pipeline_from_pdf(pdf_path: str, output_path: str = "output.json"):
    doc = fitz.open(pdf_path)
    full_text = ""
    for page in doc:
        full_text += page.get_text("text") + "\n"

    chunks = chunk_text(full_text)
    print(f"📄 Split PDF into {len(chunks)} chunks.")

    all_entities = []
    all_relationships = []

    for i, chunk in enumerate(chunks):
        print(f"🔍 Processing chunk {i + 1}/{len(chunks)}...")
        raw_entities = extract_entities(chunk)
        typed_entities = classify_entities(raw_entities)
        relationships = extract_relationships_pairwise(chunk, typed_entities)

        for ent in typed_entities:
            ent["summary"] = summarize_entity(chunk, ent["name"])

        all_entities.extend(typed_entities)
        all_relationships.extend(relationships)
 
    deduped_entities = deduplicate_entities(all_entities)

    result = {
        "entities": deduped_entities,
        "relationships": all_relationships
    }

    with open(output_path, "w", encoding="utf-8") as f:
        json.dump(result, f, indent=2, ensure_ascii=False)

    return output_path
