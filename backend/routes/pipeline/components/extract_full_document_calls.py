import fitz
import re
import json

def clean(text: str) -> str:
    """Normalize and clean extracted text."""
    return re.sub(r"\s+", " ", text.strip())

def parse_table_blocks(text: str) -> list:
    """Extract table field-value pairs from one chunk of text."""
    fields = {
        "Call": "call_section",
        "Expected EU contribution per project": "expected_eu_contribution",
        "Indicative budget": "indicative_budget",
        "Type of Action": "type_of_action",
        "Technology Readiness Level": "technology_readiness_level",
        "Procedure": "procedure",
        "Admissibility conditions": "admissibility_conditions",
        "Legal and financial set-up of the Grant Agreements": "legal_and_financial_setup",
        "Exceptional page limits to proposals/applications": "exceptional_page_limits"
    }

    block = {}
    for label, key in fields.items():
        pattern = rf"{re.escape(label)}[\s:\n]+(.*?)(?=\n[A-Z][^\n]*:|\n{re.escape(label)}|$)"
        match = re.search(pattern, text, re.DOTALL)
        if match:
            value = clean(match.group(1))
            if len(value) > 2:
                block[key] = value
    return block

def extract_all_table_blocks(pdf_path: str, output_path: str):
    doc = fitz.open(pdf_path)
    current_block = ""
    results = []

    for page in doc:
        text = page.get_text()
        current_block += "\n" + text

        # Detect clear end of a call table block
        if "Exceptional page limits" in text or "Exceptional page limits to proposals/applications" in text:
            table_data = parse_table_blocks(current_block)
            if table_data:
                results.append(table_data)
            current_block = ""  # Reset for next block

    # Final flush (in case last block isn't closed by page break)
    table_data = parse_table_blocks(current_block)
    if table_data:
        results.append(table_data)

    with open(output_path, "w", encoding="utf-8") as f:
        json.dump(results, f, indent=2, ensure_ascii=False)

    print(f"✅ Extracted {len(results)} table blocks → {output_path}")


if __name__ == "__main__":
    extract_all_table_blocks("/pdf_files/HE_CL4_2025.pdf", "full_document_extracted_call.json")