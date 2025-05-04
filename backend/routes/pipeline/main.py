
from pipeline.chunking import chunk_pdf
from pipeline.extraction import extract_entities
from backend.routes.pipeline.entity_typing import classify_entity
from pipeline.cleaning import clean_text
from pipeline.summarization import summarize_entity
from pipeline.merging import merge_entities
from pipeline.output import save_nodes_to_json
from collections import defaultdict

def run_pipeline(pdf_path: str):
    chunks = chunk_pdf(pdf_path)
    entities, mentions = [], defaultdict(list)

    for i, chunk in enumerate(chunks):
        chunk_clean = clean_text(chunk)
        extracted = extract_entities(chunk_clean)
        for e in extracted:
            info = classify_entity(e)
            mentions[e.lower()].append(chunk_clean)
            entities.append(info)

    merged = merge_entities(entities)

    for ent in merged:
        ent["id"] = ent["name"].lower().replace(" ", "_")
        ent["contexts"] = mentions.get(ent["name"].lower(), [])[:3]
        ent["summary"] = summarize_entity(ent["name"], ent["contexts"])

    save_nodes_to_json(merged)
    return "neo4j_nodes.json"
