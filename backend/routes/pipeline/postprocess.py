from typing import List, Dict

def filter_entities(entities: List[Dict[str, str]]) -> List[Dict[str, str]]:
    filtered = []
    for e in entities:
        name = e["name"].strip()
        # Exclude overly long entities
        if len(name.split()) > 15 or len(name) > 120:
            continue
        # Exclude composite or meta-list style entities
        if re.search(r" - ", name) and all(w in name.lower() for w in ["programmes", "missions", "clusters"]):
            continue
        # Remove known boilerplate or footer patterns
        if name.lower().startswith("european commission b-1049") or name.lower().startswith("the european commission"):
            continue
        # Exclude vague, inferred phrases
        if name.lower().startswith("the ") or name.lower().startswith("europe is"):
            continue
        filtered.append(e)
    return filtered
'''

# Save the new postprocess module
postprocess_path = Path("/mnt/data/postprocess.py")
postprocess_path.write_text(postprocess_code)'''