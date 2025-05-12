import os
import fitz  # PyMuPDF
import tiktoken
import json
from pathlib import Path


class PDFChunker:
    def __init__(self, document_path: str, output_dir: str, tokens_per_chunk: int = 512):
        self.document_path = document_path
        self.output_dir = output_dir
        self.tokens_per_chunk = tokens_per_chunk
        self.encoding = tiktoken.get_encoding("cl100k_base")

    def _token_count(self, text: str) -> int:
        return len(self.encoding.encode(text))

    def _chunk_text(self, text: str) -> list:
        sentences = text.split(". ")
        chunks = []
        current_chunk = ""
        for sentence in sentences:
            test_chunk = f"{current_chunk}{sentence}. "
            if self._token_count(test_chunk) > self.tokens_per_chunk:
                chunks.append(current_chunk.strip())
                current_chunk = f"{sentence}. "
            else:
                current_chunk = test_chunk

        if current_chunk:
            chunks.append(current_chunk.strip())
        return chunks

    def run(self) -> list:
        doc = fitz.open(self.document_path)
        all_chunks = []

        for page_num, page in enumerate(doc):
            text = page.get_text()
            chunks = self._chunk_text(text)
            for i, chunk in enumerate(chunks):
                all_chunks.append({
                    "page": page_num + 1,
                    "chunk_index": i,
                    "text": chunk
                })

        output_path = Path(self.output_dir) / "chunks.json"
        with open(output_path, "w", encoding="utf-8") as f:
            json.dump(all_chunks, f, indent=2, ensure_ascii=False)

        return all_chunks
