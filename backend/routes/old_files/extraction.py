from transformers import pipeline, AutoTokenizer, AutoModelForSeq2SeqLM
from typing import List, Dict
from itertools import combinations
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

ENTITY_LABELS = ["impact_area", "cluster", "pillar", "mission", "objective", "research_theme", "strategy", "policy", "programme"]

def extract_entities(text: str) -> List[str]: 
    prompt = (
        "Extract all relevant EU policy concepts and constructs such as programmes, clusters, pillars, missions, objectives, research_themes, strategies or impact areas from this text. "
        "List them one per line:\n\n" + text
    )
    output = entity_pipeline(prompt, max_new_tokens=150)[0]["generated_text"]
    entities = [line.strip("- ").strip() for line in output.split("\n") if len(line.strip()) > 3]
    return list(set(entities))

def classify_entities(entities: List[str]) -> List[Dict[str, str]]:
    classified = []
    for entity in entities:
        entity = clean_entity_name(entity)
        result = classifier_pipeline(entity, candidate_labels=ENTITY_LABELS)
        best_label = result["labels"][0]
        classified.append({"name": entity, "type": best_label})
    return classified

def clean_entity_name(name: str) -> str:
    name = name.strip()
    name = re.sub(r"[\s]+", " ", name)
    name = re.sub(r"\s*[,|–|-]\s*", " - ", name)
    return name[:120].strip()

"""
with open("chunks.json", "r", encoding="utf-8") as f:
    chunks = json.load(f)

extracted_entities = []
for i, chunk in enumerate(chunks[:16]):
    clean = clean_text(chunk) 
    raw_entitiy = extract_entities(clean)
    typed_entities = classify_entities(raw_entitiy)
    print(f"🔍 Entity for chunk {i + 1}: {typed_entities}.")
    """