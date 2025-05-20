import fitz  # PyMuPDF
import re
import json


def parse_cleaned_blocks(pdf_path, start_page=26, end_page=292):
    """Parses PDF using visual cleanup (removing headers/footers)."""
    doc = fitz.open(pdf_path)
    cleaned_pages = []

    for i in range(start_page, end_page + 1):
        blocks = doc[i].get_text("blocks")
        page_text = "\n".join(
            block[4] for block in blocks if 100 < block[1] < 750  # body region
        )
        cleaned_pages.append(page_text)

    text = "\n".join(cleaned_pages)
    text = re.sub(r"(?<=\w)-\n(?=\w)", "", text)  # fix hyphenation
    text = re.sub(r"(?:\n\s*){1,2}\d{1,3}\s+.*?(?=\n\s*\n|\Z)", "", text, flags=re.DOTALL)  # remove page footers
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

    return cleaned_blocks


def parse_all_expected_and_scope_fields(pdf_path, start_page=26, end_page=292):
    """Full parsing to retrieve all expected_outcome and scope fields."""
    doc = fitz.open(pdf_path)
    full_text = "\n".join(doc[i].get_text("text") for i in range(start_page, end_page + 1))
    full_text = re.sub(r"(?<=\w)-\n(?=\w)", "", full_text)
    full_text = re.sub(r"\n+", "\n", full_text)
    full_text = re.sub(r"[ \t]+", " ", full_text)

    call_pattern = re.compile(
        r"(?P<call_id>HORIZON-CL4-[^\n:]+(?:-[^\n:]+)*:\s?[^\n]+?)\n(?P<content>.*?)(?=^HORIZON-CL4-[^\n]+?:|\Z)",
        re.DOTALL | re.MULTILINE
    )

    def extract_section(section_text, label):
        label_pattern = rf"{label}\s*:? "
        split_sections = re.split(r"\n(?=[A-Z][^\n]{3,80}?:)", section_text)
        for section in split_sections:
            if re.match(label_pattern, section.strip(), re.IGNORECASE):
                cleaned = re.sub(label_pattern, "", section, flags=re.IGNORECASE).strip()
                return re.sub(r"\s+", " ", cleaned)
        return None

    parsed = {}
    for match in call_pattern.finditer(full_text):
        call_id_line = match.group("call_id").strip()
        content = match.group("content").strip()
        parsed[call_id_line] = {
            "expected_outcome": extract_section(content, "Expected Outcome"),
            "scope": extract_section(content, "Scope")
        }

    return parsed


def merge_expected_scope_fields(cleaned_blocks, full_field_map):
    """Update only the missing expected_outcome and scope fields."""
    updated = 0

    for block in cleaned_blocks:
        cid = block["call_id_line"]
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
    output_path = "routes/pipeline/output_files/enhanced_raw_call_blocks.json"

    # Step 1: Get cleaned blocks (initial parse)
    cleaned = parse_cleaned_blocks(pdf_path)

    # Step 2: Parse full version to extract missing values
    all_extracted = parse_all_expected_and_scope_fields(pdf_path)

    # Step 3: Update only the missing fields
    merged, updated_count = merge_expected_scope_fields(cleaned, all_extracted)

    # Step 4: Save
    with open(output_path, "w", encoding="utf-8") as f:
        json.dump(merged, f, indent=2, ensure_ascii=False)

    print(f"✅ Final blocks written. {updated_count} fields updated.")
