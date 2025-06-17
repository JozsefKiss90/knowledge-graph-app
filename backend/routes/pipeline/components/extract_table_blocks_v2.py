import fitz  # PyMuPDF
import re
import json

def parse_cleaned_blocks(pdf_path, start_page=26, end_page=292):
    """Parses cleaned blocks from PDF using improved call pattern."""
    doc = fitz.open(pdf_path)
    cleaned_pages = []

    for i in range(start_page, end_page + 1):
        blocks = doc[i].get_text("blocks")
        page_text = "\n".join(
            block[4] for block in blocks if 100 < block[1] < 750
        )
        cleaned_pages.append(page_text)

    text = "\n".join(cleaned_pages)
    text = re.sub(r"(?<=\w)-\n(?=\w)", "", text)  # fix hyphenation
    text = re.sub(r"\n+", "\n", text)
    text = re.sub(r"[ \t]+", " ", text)

    # ✅ Improved pattern: non-greedy capture + flexible matching
    call_pattern = re.compile(
        r"(?P<call_id>HORIZON-CL4-[\w\d-]+):\s*(?P<call_title>[^\n]+)\n(?P<content>.*?)(?=HORIZON-CL4-[\w\d-]+:|\Z)",
        re.DOTALL
    )

    def extract_section(text, label):
        pattern = rf"{label}\s*:\s*(.*?)(?=\n[A-Z][^\n]+?:|\n\Z|\nHORIZON-CL4-|\Z)"
        match = re.search(pattern, text, re.IGNORECASE | re.DOTALL)
        if match:
            return re.sub(r"\s+", " ", match.group(1).strip())
        return None

    cleaned_blocks = []
    for match in call_pattern.finditer(text):
        call_id = match.group("call_id").strip()
        title = match.group("call_title").strip()
        content = match.group("content").strip()

        full_text = f"{call_id}: {title}\n{content}"
        cleaned_blocks.append({
            "call_id_line": f"{call_id}: {title}",
            "raw_text": full_text,
            "expected_outcome": extract_section(content, "Expected Outcome"),
            "scope": extract_section(content, "Scope")
        })

    return cleaned_blocks

# Same fallback mechanism and merge logic as before
def parse_all_expected_and_scope_fields(pdf_path, start_page=26, end_page=292):
    doc = fitz.open(pdf_path)
    full_text = "\n".join(doc[i].get_text("text") for i in range(start_page, end_page + 1))
    full_text = re.sub(r"(?<=\w)-\n(?=\w)", "", full_text)
    full_text = re.sub(r"\n+", "\n", full_text)
    full_text = re.sub(r"[ \t]+", " ", full_text)

    call_pattern = re.compile(
        r"(?P<call_id>HORIZON-CL4-[^\n:]+(?:-[^\n:]+)*):\s?[^\n]*?\n(?P<content>.*?)(?=HORIZON-CL4-[^\n:]+:|\Z)",
        re.DOTALL
    )

    def extract_section(section_text, label):
        pattern = rf"{label}\s*:\s*(.*?)(?=\n[A-Z][^\n]+?:|\n\Z|\nHORIZON-CL4-|\Z)"
        match = re.search(pattern, section_text, re.IGNORECASE | re.DOTALL)
        if match:
            return re.sub(r"\s+", " ", match.group(1).strip())
        return None

    parsed = {}
    for match in call_pattern.finditer(full_text):
        cid = match.group("call_id").strip()
        content = match.group("content").strip()
        parsed[cid] = {
            "expected_outcome": extract_section(content, "Expected Outcome"),
            "scope": extract_section(content, "Scope")
        }

    return parsed

def merge_expected_scope_fields(cleaned_blocks, full_field_map):
    updated = 0
    for block in cleaned_blocks:
        cid_line = block.get("call_id_line", "")
        cid_match = re.match(r"(HORIZON-CL4-[\w\d-]+)", cid_line)
        if not cid_match:
            continue
        cid = cid_match.group(1)
        full_fields = full_field_map.get(cid)
        if not full_fields:
            continue

        if not block["expected_outcome"] or "expected" in block["expected_outcome"].lower():
            if full_fields["expected_outcome"]:
                block["expected_outcome"] = full_fields["expected_outcome"]
                updated += 1

        if not block["scope"] or len(block["scope"] or "") < 50:
            if full_fields["scope"]:
                block["scope"] = full_fields["scope"]
                updated += 1

    return cleaned_blocks, updated

if __name__ == "__main__":
    pdf_path = "/pdf_files/HE_CL4_2025.pdf"
    output_path = "routes/pipeline/output_files/enhanced_raw_call_blocks_v2.json"

    cleaned = parse_cleaned_blocks(pdf_path)
    all_fields = parse_all_expected_and_scope_fields(pdf_path)
    merged, updates = merge_expected_scope_fields(cleaned, all_fields)

    with open(output_path, "w", encoding="utf-8") as f:
        json.dump(merged, f, indent=2, ensure_ascii=False)

    print(f"✅ Final blocks written. {updates} fields updated.")
