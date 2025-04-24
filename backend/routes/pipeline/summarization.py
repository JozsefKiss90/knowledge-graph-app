import json
from sentence_transformers import SentenceTransformer, util

# Load data
with open("neo4j_nodes_llm_refined.json", "r", encoding="utf-8") as f:
    nodes = json.load(f)
with open("chunks.json", "r", encoding="utf-8") as f:
    chunks = json.load(f)

# Load model
model = SentenceTransformer("all-MiniLM-L6-v2")

# Embed chunks and node names
chunk_embeddings = model.encode(chunks, convert_to_tensor=True)
node_names = [n["name"] for n in nodes]
node_embeddings = model.encode(node_names, convert_to_tensor=True)

# Match top 2 chunks per node
context_map = {}
for i, node in enumerate(nodes):
    sims = util.cos_sim(node_embeddings[i], chunk_embeddings)[0]
    top_k = sims.topk(2)
    matched = [chunks[idx] for idx in top_k.indices.tolist()]
    context_map[node["name"]] = matched

# Save
with open("matched_chunks_for_nodes.json", "w", encoding="utf-8") as f:
    json.dump(context_map, f, indent=2, ensure_ascii=False)
