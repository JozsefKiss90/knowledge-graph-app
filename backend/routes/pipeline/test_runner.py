#test_runner.py
import sys
import os
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "../")))  
from pipeline.chunking import chunk_pdf
from pipeline.cleaning import clean_text
from pipeline.extraction import extract_entities, classify_entities
from pipeline.summarization import summarize_entity
from pipeline.merging import merge_entities
from pipeline.output import save_nodes_to_json
from pipeline.filter_entities import filter_entities
import json
from pipeline.postprocess import refine_entities

# STEP 1: Chunk the PDF
#chunks = chunk_pdf("/pdf_files/HE_2025.pdf")
#print(f"🔹 Chunks found: {len(chunks)}")
from transformers import AutoTokenizer

refine_entities()



"""
# Setup tokenizer for measuring token length
tokenizer = AutoTokenizer.from_pretrained("google/flan-t5-base")

# Load chunks
with open("chunks.json", "r", encoding="utf-8") as f:
    chunks = json.load(f)

# Debug processing loop
for i, chunk in enumerate(chunks[:20]):
    clean = clean_text(chunk)
    token_count = len(tokenizer.encode(clean, truncation=True))
    print(f"\n📄 Chunk {i + 1} — Characters: {len(clean)}, Tokens: {token_count}")
    print(f"↳ Preview:\n{clean[:300]}{'...' if len(clean) > 300 else ''}\n")

    raw_entities = extract_entities(clean, debug=False)
    if not raw_entities:
        print("🔍 No entities extracted.")
        continue

    classified = classify_entities(raw_entities)
    filtered_entities = filter_entities(classified)


    print(f"🔍 Filtered entities with types and confidence:")
    for ent in filtered_entities:
        print(f" - {ent['name']} ({ent['type']}, confidence: {ent['confidence']}) Top 3: {ent['top_3']}")
    print("-" * 80)

# STEP 2: Clean and extract entities
entities, mentions = [], defaultdict(list)
for i, chunk in enumerate(chunks[:20]):  # Test on a few chunks
    clean = clean_text(chunk) 
    extracted = extract_entities(clean)
    print(f"🧠 Chunk {i} entities: {extracted}")

    for e in extracted:
        info = classify_entity(e)
        entities.append(info)
        mentions[e.lower()].append(clean)
        
# STEP 3: Merge similar entities
merged = merge_entities(entities)
print(f"🔗 Merged entities: {[m['name'] for m in merged]}")

# STEP 4: Add summary + contexts
for ent in merged:
    key = ent["name"].lower()
    ent["contexts"] = mentions.get(key, [])[:3]
    ent["summary"] = summarize_entity(ent["name"], ent["contexts"])
    ent["id"] = key.replace(" ", "_")

# STEP 5: Save final output
save_nodes_to_json(merged)
print("✅ Final nodes saved to neo4j_nodes.json")
"""