import json
from pathlib import Path
from typing import List, Dict

from components.cleaning import clean_text
from components.extract_entities import extract_calls_and_titles

class EntityExtractor:
    def __init__(self, chunks_path: str, output_path: str):
        self.chunks_path = Path(chunks_path)
        self.output_path = Path(output_path)

    def load_chunks(self) -> List[Dict]:
        with open(self.chunks_path, "r", encoding="utf-8") as f:
            return json.load(f)

    def run(self) -> List[Dict]:
        chunks = self.load_chunks()
        all_entities = []

        for chunk in chunks:
            cleaned_text = clean_text(chunk["text"])
            entities = extract_calls_and_titles(cleaned_text)

            for ent in entities:
                ent["page"] = chunk["page"]
                ent["chunk_index"] = chunk["chunk_index"]
                all_entities.append(ent)

        with open(self.output_path, "w", encoding="utf-8") as f:
            json.dump(all_entities, f, indent=2, ensure_ascii=False)

        return all_entities
