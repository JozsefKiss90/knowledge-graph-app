
from transformers import pipeline

ENTITY_LABELS = ["impact_area", "cluster", "mission", "objective", "research_theme", "strategy", "policy", "programme"]
classifier_pipeline = pipeline("zero-shot-classification", model="facebook/bart-large-mnli")

def classify_entity(entity: str):
    result = classifier_pipeline(entity, candidate_labels=ENTITY_LABELS)
    labels = result["labels"][:3]
    scores = result["scores"][:3]
    best_label = labels[0] if scores[0] >= 0.6 else "unknown"
    return {"name": entity, "type": best_label, "confidence": scores[0], "top_3": labels}
