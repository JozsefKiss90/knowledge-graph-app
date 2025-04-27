from PyPDF2 import PdfReader
import os
import json

# Load the HE_2025.pdf to extract raw context
pdf_path = "/mnt/data/HE_2025.pdf"
reader = PdfReader(pdf_path)

# Extract text from all pages and create a list of page texts
document_pages = [page.extract_text() for page in reader.pages]

# Save each page into a dictionary with page numbers as keys (for traceability)
document_context = {f"page_{i+1}": text for i, text in enumerate(document_pages) if text}

# Save the context as a JSON file to be reused in summarization
output_path = "/mnt/data/HE_2025_context_by_page.json"
with open(output_path, "w", encoding="utf-8") as f:
    json.dump(document_context, f, ensure_ascii=False, indent=2)

output_path
