
from fastapi import APIRouter, UploadFile, File
from typing import List
import fitz  # PyMuPDF
import re

router = APIRouter(prefix="/segment", tags=["PDF Segmentation"])

@router.post("/segment-pdf", response_model=List[dict])
async def segment_pdf(file: UploadFile = File(...)) -> List[dict]:
    # Read the uploaded file content into memory
    contents = await file.read()
    doc = fitz.open(stream=contents, filetype="pdf")

    # Step 1: Extract TOC from page 4 (0-based index = 3)
    toc_text = doc[3].get_text("text")
    toc_entries = re.findall(r'([A-Z0-9].*?)\s+\.{{3,}}\s*(\d+)', toc_text)

    parsed_toc = []
    for title, page in toc_entries:
        title_clean = re.sub(r'\s+', ' ', title).strip()
        parsed_toc.append({
            "title": title_clean,
            "start_page": int(page)
        })

    # Step 2: Determine end pages
    for i in range(len(parsed_toc) - 1):
        parsed_toc[i]["end_page"] = parsed_toc[i + 1]["start_page"] - 1
    parsed_toc[-1]["end_page"] = doc.page_count

    # Step 3: Extract section texts
    section_blocks = []
    for section in parsed_toc:
        start_idx = section["start_page"] - 1
        end_idx = section["end_page"]
        text = ""
        for i in range(start_idx, end_idx):
            if 0 <= i < len(doc):
                page_text = doc[i].get_text("text")
                cleaned_text = re.sub(r'\s+', ' ', page_text).strip()
                text += cleaned_text + " "
        section_blocks.append({
            "title": section["title"],
            "start_page": section["start_page"],
            "end_page": section["end_page"],
            "text": text.strip()
        })

    return section_blocks
