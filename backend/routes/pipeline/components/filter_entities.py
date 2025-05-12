from typing import List, Dict

def filter_entities(entities: List[Dict]) -> List[Dict]:
    filtered = []
    for entity in entities:
        text = entity.get("word") or entity.get("entity_group") or ""
        if not text:
            continue

        text = text.strip().lower()

        # Heuristic filters for noisy patterns or too short terms
        if len(text) <= 2 or any(c in text for c in ["[", "]", "(", ")"]):
            continue
        if text in {"eu", "us", "uk", "ie"}:
            continue

        # Optional: add simple label remapping or keep the original label
        label = entity.get("entity_group", entity.get("entity", "unknown"))

        filtered.append({
            "text": entity.get("word", text),
            "label": label,
            "score": float(entity.get("score", 0))
        })
    return filtered
