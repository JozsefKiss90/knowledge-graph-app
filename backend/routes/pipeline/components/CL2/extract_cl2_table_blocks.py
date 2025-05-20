import fitz  # PyMuPDF
import re
import json

def parse_cleaned_blocks(pdf_path, output_path, start_page=18, end_page=121):
    """Parses PDF using visual cleanup (removing headers/footers)."""
    doc = fitz.open(pdf_path)
    cleaned_pages = []

    for i in range(start_page, end_page + 1):
        blocks = doc[i].get_text("blocks")
        page_text = "\n".join(block[4] for block in blocks)

        # Clean metadata and formatting
        page_text = re.sub(r"(?<=\w)-\n(?=\w)", "", page_text)
        page_text = re.sub(r"\n?Part\s+\d+\s+-\s+Page\s+\d+\s+of\s+\d+", "", page_text, flags=re.IGNORECASE)
        page_text = re.sub(r"\n?Horizon Europe - Work Programme.*?\n?", "", page_text, flags=re.IGNORECASE)
        page_text = re.sub(r"\n{2,}", "\n", page_text)
        page_text = re.sub(r"[ \t]+", " ", page_text)

        # Remove footnotes
        # Remove single-line or short multi-line footnotes (avoid removing call content)
        page_text = re.sub(
            r"\n\d{1,3}\s*\n(?:[^\n]*Funding and Tenders Portal[^\n]*|[^\n]*https?://[^\n]*|[^\n]*europa\.eu[^\n]*).*",
            "",
            page_text,
            flags=re.IGNORECASE
        )

        cleaned_pages.append(page_text)

    # Join all cleaned pages for regex-based call parsing
    text = "\n".join(cleaned_pages)

    call_pattern = re.compile(
        r"^\s*(HORIZON-CL2-\d{4}-\d{2}-[A-Z]+-\d{2}(?:-[a-z]+-[a-z]+)?):\s*(.+?)(?=\nHORIZON-CL2-\d{4}-\d{2}-[A-Z]+-\d{2}(?:-[a-z]+-[a-z]+)?\:|\Z)",
        re.DOTALL | re.MULTILINE
    )

    def extract_section(text, label):
        pattern = rf"{label}:\s*(.*?)(?=\n[A-Z][a-z]+:|\n\Z|\nHORIZON-CL2-|\Z)"
        match = re.search(pattern, text, re.IGNORECASE | re.DOTALL)
        if match:
            return re.sub(r"\s+", " ", match.group(1).strip())
        return None
    
    cleaned_blocks = []
    for match in call_pattern.finditer(text):
        call_id_line = match.group(1).strip()
        call_body = match.group(2).strip()
        full_block = f"{call_id_line}\n{call_body}"

        cleaned_blocks.append({
            "call_id_line": call_id_line,
            "raw_text": full_block,
            "expected_outcome": extract_section(call_body, "Expected Outcome"),
            "scope": extract_section(call_body, "Scope")
        })

    with open(output_path, "w", encoding="utf-8") as f:
        json.dump(cleaned_blocks, f, indent=2, ensure_ascii=False)

    print(f"✅ Extracted {len(cleaned_blocks)} call blocks with Expected Outcome and Scope.")

if __name__ == "__main__":
    parse_cleaned_blocks(
        pdf_path="/pdf_files/HE_CL2_2025.pdf",
        output_path="routes/pipeline/output_files/enhanced_raw_cl2_call_blocks.json",
        start_page=18,
        end_page=121
    )