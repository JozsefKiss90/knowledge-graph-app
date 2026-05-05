import fitz
import re
import json

def extract_onepage_call(pdf_path: str, output_path: str):
    doc = fitz.open(pdf_path)
    text = "\n".join(page.get_text() for page in doc)

    call_id = call_title = call_type = call_section = None

    match = re.search(
        r"(HORIZON-CL4-[\w\d-]+):\s*(.*?)\s*\(.*?\)\s*\((RIA|IA|CSA)\)",
        text, re.DOTALL
    )
    if match:
        call_id = match.group(1).strip()
        call_title = re.sub(r"\s+", " ", match.group(2).strip())
        call_type = match.group(3).strip()

    match = re.search(r"Call:\s*(\w+)", text)
    if match:
        call_section = match.group(1).strip()

    def extract_block(label, fallback=None, until_pattern=None):
        start_pattern = re.escape(label)
        if until_pattern:
            pattern = rf"{start_pattern}[\s\n]*(.*?)(?=\n{until_pattern}|$)"
        else:
            pattern = rf"{start_pattern}[\s\n]*(.*?)\n\n"
        match = re.search(pattern, text, re.DOTALL)
        if match:
            return re.sub(r"\s+", " ", match.group(1).strip())
        elif fallback:
            match = re.search(fallback, text, re.DOTALL | re.IGNORECASE)
            if match:
                return re.sub(r"\s+", " ", match.group(1).strip())
        return None

    result = {
        "call_id": call_id,
        "call_title": call_title,
        "call_type": call_type,
        "call_section": call_section,
        "expected_eu_contribution": extract_block(
            "Expected EU contribution per project",
            r"contribution of between\s+(.*?)\s+would allow"
        ),
        "indicative_budget": extract_block("Indicative budget", until_pattern="Type of Action"),
        "type_of_action": extract_block("Type of Action", until_pattern="Technology Readiness"),
        "technology_readiness_level": extract_block(
            "Technology Readiness Level",
            r"expected to start at\s+(TRL \d.*?)\s+by the end"
        ),
        "legal_and_financial_setup": extract_block(
            "Eligible costs will take the form of",
            r"(Eligible costs will take the form of.*?)\d+\.",
            until_pattern="Exceptional page limits"
        ),
        "exceptional_page_limits": extract_block(
            "Exceptional page limits to proposals/applications",
            r"Exceptional page limits to\s+proposals/applications\s+(.*?)\n\s*\d{1,2}\s+This decision"
        )
    }

    with open(output_path, "w", encoding="utf-8") as f:
        json.dump(result, f, indent=2, ensure_ascii=False)

    print(f"✅ Extracted call data saved to: {output_path}")

if __name__ == "__main__":
    extract_onepage_call("/pdf_files/onepage.pdf", "onepage_extracted_call.json")
