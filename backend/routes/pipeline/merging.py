
from sentence_transformers import SentenceTransformer, util
from collections import Counter

embedding_model = SentenceTransformer("all-MiniLM-L6-v2")

def merge_entities(entities: list):
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
        type_votes = Counter(e["type"] for e in group if e["type"] != "unknown")
        final_type = type_votes.most_common(1)[0][0] if type_votes else "unknown"
        base = max(group, key=lambda x: len(x["name"]))
        base["type"] = final_type
        merged.append(base)
    return merged
