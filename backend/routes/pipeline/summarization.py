import json
import re
from sentence_transformers import SentenceTransformer, util

# Load files
with open("HE_2025_context_by_page.json", "r", encoding="utf-8") as f:
    pages = json.load(f)
with open("neo4j_nodes_llm_refined.json", "r", encoding="utf-8") as f:
    nodes = json.load(f)

# Function to split page content into clean, meaningful chunks
def split_text(text):
    paragraphs = re.split(r"\n{2,}", text)
    chunks = []
    for para in paragraphs:
        para = para.strip()
        if para:
            sentences = re.split(r'(?<=[.!?])\s+(?=[A-Z])', para)
            chunks.extend([s.strip() for s in sentences if len(s.strip()) > 50])
    return chunks

# Prepare chunks
all_chunks = []
chunk_map = {}
for page_id, text in pages.items():
    for chunk in split_text(text):
        idx = len(all_chunks)
        all_chunks.append(chunk)
        chunk_map[idx] = chunk

# Embed nodes and chunks
model = SentenceTransformer("all-MiniLM-L6-v2")
chunk_embeddings = model.encode(all_chunks, convert_to_tensor=True)
node_names = [node["name"] for node in nodes]
node_embeddings = model.encode(node_names, convert_to_tensor=True)

# Match top-5 chunks per node
refined_matches = {}
for i, node in enumerate(nodes):
    sims = util.cos_sim(node_embeddings[i], chunk_embeddings)[0]
    top_indices = sims.topk(5).indices.tolist()
    top_chunks = list({chunk_map[idx] for idx in top_indices})
    refined_matches[node["name"]] = top_chunks

# Save
with open("matched_pages_for_nodes.json", "w", encoding="utf-8") as f:
    json.dump(refined_matches, f, indent=2, ensure_ascii=False)

'''import json
import re
from sentence_transformers import SentenceTransformer, util
from transformers import pipeline

# Load files
with open("HE_2025_context_by_page.json", "r", encoding="utf-8") as f:
    pages = json.load(f)
with open("neo4j_nodes_llm_refined.json", "r", encoding="utf-8") as f:
    nodes = json.load(f)

# Cleaner function
def split_text(text):
    paragraphs = re.split(r"\n{2,}", text)
    clean_chunks = []
    for para in paragraphs:
        para = para.strip()
        if len(para) < 50:
            continue
        if re.match(r"^\d{1,3}$", para):  # page numbers
            continue
        if re.match(r"^[A-Z\s\d]{5,}$", para):  # section headers
            continue
        if para.lower().count("cluster") > 2:
            continue
        if any(x in para.lower() for x in ["doi:", "isbn", "email:", "http", "europa.eu", "©", "publications office"]):
            continue
        sentences = re.split(r'(?<=[.!?])\s+(?=[A-Z])', para)
        clean_chunks.extend([s.strip() for s in sentences if len(s.strip()) > 50])
    return clean_chunks

# Prepare chunks
all_chunks = []
chunk_map = {}
for page_id, text in pages.items():
    for chunk in split_text(text):
        idx = len(all_chunks)
        all_chunks.append(chunk)
        chunk_map[idx] = chunk

# Embeddings
model = SentenceTransformer("all-MiniLM-L6-v2")
chunk_embeddings = model.encode(all_chunks, convert_to_tensor=True)
node_names = [n["name"] for n in nodes]
node_embeddings = model.encode(node_names, convert_to_tensor=True)

# Load validation LLM
validator = pipeline("text2text-generation", model="google/flan-t5-base")

# Run embedding match + LLM filter
final_matches = {}
for i, node in enumerate(nodes):
    name = node["name"]
    sims = util.cos_sim(node_embeddings[i], chunk_embeddings)[0]
    top_indices = sims.topk(5).indices.tolist()
    top_chunks = [chunk_map[idx] for idx in top_indices]

    # Validate with LLM
    validated = []
    for chunk in top_chunks:
        prompt = f"Does the following paragraph describe the topic '{name}'? Answer YES or NO.\n\n{chunk}"
        answer = validator(prompt, max_new_tokens=5)[0]["generated_text"].strip().lower()
        if "yes" in answer:
            validated.append(chunk)
        if len(validated) == 2:
            break

    final_matches[name] = validated

# Save output
with open("refined_llm_validated_chunks.json", "w", encoding="utf-8") as f:
    json.dump(final_matches, f, indent=2, ensure_ascii=False)'''