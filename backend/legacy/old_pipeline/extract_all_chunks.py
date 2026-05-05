
import sys
import os
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "../")))  
import json
from pipeline.cleaning import clean_text
from pipeline.extraction import extract_entities, classify_entities
from pipeline.filter_entities import filter_entities

def main():
    with open("chunks.json", "r", encoding="utf-8") as f:
        chunks = json.load(f)

    output = []
    for i, chunk in enumerate(chunks):
        cleaned = clean_text(chunk)
        raw_entities = extract_entities(cleaned, debug=False)
        typed_entities = classify_entities(raw_entities)
        filtered_entities = filter_entities(typed_entities)
        output.append({
            "chunk": i + 1,
            "entities": filtered_entities
        })

    with open("full_extracted_entities.json", "w", encoding="utf-8") as f:
        json.dump(output, f, indent=2, ensure_ascii=False)

    print(f"✅ Saved {len(output)} chunk entries with extracted entities to full_extracted_entities.json")

if __name__ == "__main__":
    main()
