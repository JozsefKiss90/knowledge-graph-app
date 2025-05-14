import fitz  # PyMuPDF
import re
import json

def extract_call_blocks(pdf_path, output_path, start_page=26, end_page=292):
    doc = fitz.open(pdf_path)
    text = "\n".join(doc[i].get_text("text") for i in range(start_page, end_page + 1))
    text = re.sub(r"(?<=\w)-\n(?=\w)", "", text)
    text = re.sub(r"\n+", "\n", text)
    text = re.sub(r"[ \t]+", " ", text)

    call_pattern = re.compile(
        r"^ *(HORIZON-CL4-[^\n]+?:.*?)\n(.*?)(?=^ *HORIZON-CL4-[^\n]+?:|\Z)",
        re.DOTALL | re.MULTILINE
    )

    def extract_section(text, label):
        pattern = rf"{label}:\s*(.*?)(?=\n[A-Z][a-z]+:|\n\Z|\nHORIZON-CL4-|\Z)"
        match = re.search(pattern, text, re.IGNORECASE | re.DOTALL)
        if match:
            return re.sub(r"\s+", " ", match.group(1).strip())
        return None

    blocks = []
    for match in call_pattern.finditer(text):
        call_id_line = match.group(1).strip()
        call_body = match.group(2).strip()
        full_block = f"{call_id_line}\n{call_body}"

        expected_outcome = extract_section(call_body, "Expected Outcome")
        scope = extract_section(call_body, "Scope")

        blocks.append({
            "call_id_line": call_id_line,
            "raw_text": full_block,
            "expected_outcome": expected_outcome,
            "scope": scope
        })

    with open(output_path, "w", encoding="utf-8") as f:
        json.dump(blocks, f, indent=2, ensure_ascii=False)

    print(f"✅ Extracted {len(blocks)} call blocks with Expected Outcome and Scope.")

if __name__ == "__main__":
    extract_call_blocks(
        pdf_path="/pdf_files/HE_CL4_2025.pdf",
        output_path="routes/pipeline/output_files/enhanced_raw_call_blocks.json",
        start_page=26,
        end_page=292
    )
