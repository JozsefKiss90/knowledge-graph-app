
from transformers import pipeline, AutoTokenizer, AutoModelForSeq2SeqLM
from typing import List, Dict
import re

# Load models
entity_model_name = "google/flan-t5-base"
summary_model_name = "facebook/bart-large-cnn"
classifier_model_name = "MoritzLaurer/deberta-v3-large-zeroshot-v1"

entity_tokenizer = AutoTokenizer.from_pretrained(entity_model_name)
entity_model = AutoModelForSeq2SeqLM.from_pretrained(entity_model_name)
entity_pipeline = pipeline("text2text-generation", model=entity_model, tokenizer=entity_tokenizer)

summary_pipeline = pipeline("summarization", model=summary_model_name)
classifier_pipeline = pipeline("zero-shot-classification", model=classifier_model_name)

ENTITY_LABELS = ["impact_area", "cluster", "pillar", "mission", "objective", "research_theme", "strategy", "policy", "programme", "institution"]

def regex_sentence_split(text: str) -> List[str]:
    return re.split(r'(?<=[.!?])\s+(?=[A-Z])', text)

def smart_chunk_by_regex_sentences(text: str, prompt: str, max_tokens: int = 512) -> List[str]:
    sentences = regex_sentence_split(text)
    sub_chunks = []
    current = ""
    for sent in sentences:
        candidate = current + " " + sent
        if len(entity_tokenizer.encode(prompt + candidate)) < max_tokens:
            current = candidate
        else:
            if current.strip():
                sub_chunks.append(prompt + current.strip())
            current = sent
    if current.strip():
        sub_chunks.append(prompt + current.strip())
    return sub_chunks

def clean_entity_name(name: str) -> str:
    name = name.strip()
    name = re.sub(r"[\s]+", " ", name)
    name = re.sub(r"\s*[,|–|-]\s*", " - ", name)
    return name[:120].strip()

def extract_entities(text: str, debug: bool = False) -> List[str]: 
    prompt = (
        "Extract relevant EU policy concepts from this text: programmes, clusters, pillars, missions, objectives, research themes, strategies, policies, impact areas, institutions. "
        "Only list the names. One per line."
    )
    segments = smart_chunk_by_regex_sentences(text, prompt)
    entities = set()
    for input_text in segments:
        if debug:
            print("🔍 Prompt (truncated):", input_text[:300])
        output = entity_pipeline(input_text, max_new_tokens=150)[0]["generated_text"]
        lines = [line.strip("- ").strip() for line in output.split("\n") if len(line.strip()) > 3]
        entities.update(lines)
    return list(entities)

def classify_entities(entities: List[str]) -> List[Dict[str, str]]:
    classified = []
    for entity in entities:
        entity = clean_entity_name(entity)
        result = classifier_pipeline(entity, candidate_labels=ENTITY_LABELS)
        best_label = result["labels"][0]
        confidence = result["scores"][0]
        classified.append({
            "name": entity,
            "type": best_label,
            "confidence": round(confidence, 3),
            "top_3": result["labels"][:3]
        })
    return classified
