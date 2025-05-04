
import re
from typing import List, Dict

# Keywords to allow if long entries exist
KEYWORDS = [
    "cluster", "pillar", "mission", "strategy", "policy", "programme", "research",
    "transition", "innovation", "impact area", "objective", "europe", "eu"
]

def is_meta_list(name: str) -> bool:
    tokens = [t.strip().lower() for t in re.split(r"[-–|]", name)]
    count_keywords = sum(any(k in token for k in KEYWORDS) for token in tokens)
    return len(tokens) >= 4 and count_keywords >= 4

def filter_entities(entities: List[Dict[str, str]]) -> List[Dict[str, str]]:
    filtered = []
    seen = set()

    for e in entities:
        name = e["name"].strip()
        name_lower = name.lower()

        # Skip exact or near-duplicate repetition-based spam
        if re.search(r"(\b[a-z]+\b)(?:\s+\1){2,}", name_lower):
            continue

        # Skip composite/meta lists
        if is_meta_list(name):
            continue

        # Skip very short garbage
        if len(name_lower) < 5:
            continue

        # Allow longer entries only if they contain meaningful keywords
        if len(name.split()) > 20 and not any(k in name_lower for k in KEYWORDS):
            continue

        if name_lower in seen:
            continue

        seen.add(name_lower)
        filtered.append(e)

    return filtered
