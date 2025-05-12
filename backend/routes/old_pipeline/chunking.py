
import fitz  # PyMuPDF
import re
import json

def chunk_pdf(pdf_path: str, max_tokens: int = 512):
    doc = fitz.open(pdf_path)
    full_text = " ".join(page.get_text("text") for page in doc)
    sentences = re.split(r'(?<=[.!?]) +', full_text)
    chunks, chunk = [], ""
    for sentence in sentences:
        if len(chunk.split()) + len(sentence.split()) < max_tokens:
            chunk += " " + sentence
        else:
            chunks.append(chunk.strip())
            chunk = sentence
    if chunk:
        chunks.append(chunk.strip())
    with open("chunks.json", "w", encoding="utf-8") as f:
        json.dump(chunks, f, indent=2, ensure_ascii=False)    
    return chunks
