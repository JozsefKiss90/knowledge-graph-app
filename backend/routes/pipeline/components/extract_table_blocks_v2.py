import fitz  # PyMuPDF
import re
import json

def extract_table_blocks():

    # Load the PDF
    pdf_path = "/pdf_files/HE_CL4_2025.pdf"
    output_path = "enhanced_raw_call_blocks.json"

    # Open document
    doc = fitz.open(pdf_path)

    # Extract text from pages 27–292 (0-based index: 26–292 inclusive)
    start_page = 26
    end_page = 292
    text = "\n".join(doc[i].get_text("text") for i in range(start_page, end_page + 1))

    # Normalize formatting
    text = re.sub(r"(?<=\w)-\n(?=\w)", "", text)  # fix hyphenated line breaks
    text = re.sub(r"\n+", "\n", text)            # collapse extra newlines
    text = re.sub(r"[ \t]+", " ", text)          # normalize whitespace

    # Regex to extract call blocks:
    # Starts with a line beginning with HORIZON-CL4-... and ends before the next such line or "Expected Outcome:"
    pattern = re.compile(
        r"^ *(HORIZON-CL4-[^\n]+?:.*?)\n(.*?)(?=^ *HORIZON-CL4-[^\n]+?:|^ *Expected Outcome:|\Z)",
        re.DOTALL | re.MULTILINE
    )

    matches = pattern.finditer(text)

    # Extract and format results
    call_blocks = []
    for match in matches:
        call_id_line = match.group(1).strip()
        call_body = match.group(2).strip()
        full_block = f"{call_id_line}\n{call_body}"
        call_blocks.append({
            "call_id_line": call_id_line,
            "raw_text": full_block
        })

    # Save to JSON
    with open(output_path, "w", encoding="utf-8") as f:
        json.dump(call_blocks, f, indent=2, ensure_ascii=False)

    print(f"✅ Extracted {len(call_blocks)} call tables to '{output_path}'")

if __name__ == "__main__":
    extract_table_blocks()


