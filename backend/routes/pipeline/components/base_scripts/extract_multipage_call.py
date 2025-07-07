import fitz
import re
import json

def extract_multipage_call(pdf_path: str, output_path: str):
    doc = fitz.open(pdf_path)
    text = "\n".join(page.get_text("text") for page in doc)

    # Normalize multi-line labels in raw text
    text = text.replace(
        "Exceptional page limits to \nproposals/applications",
        "Exceptional page limits to proposals/applications"
    )
    text = text.replace(
        "Legal and financial set-up \nof the Grant Agreements",
        "Legal and financial set-up of the Grant Agreements"
    )
    text = text.replace(
        "Technology Readiness \nLevel",
        "Technology Readiness Level"
    )

    # Extract metadata
    call_match = re.search(
        r"(HORIZON-CL4-[\w\d-]+):\s*(.*?)\s*\(.*?\)\s*\((RIA|IA|CSA)\)",
        text, re.DOTALL
    )
    call_id = call_title = call_type = call_section = None
    if call_match:
        call_id = call_match.group(1).strip()
        call_title = re.sub(r"\s+", " ", call_match.group(2)).strip()
        call_type = call_match.group(3).strip()

    section_match = re.search(r"Call:\s*([A-Z\s\-]+(?:two-stage)?)", text)
    if section_match:
        call_section = section_match.group(1).strip()

    # Robust field extractor
    def extract_block(label, until_label=None, fallback=None):
        label = re.escape(label)
        if until_label:
            until_label = re.escape(until_label)
            pattern = rf"{label}[\s\n]*(.*?)(?=\n{until_label}|$)"
        else:
            pattern = rf"{label}[\s\n]*(.*?)(?=\n[A-Z][^\n]+|$)"
        match = re.search(pattern, text, re.DOTALL)
        if match:
            return re.sub(r"\s+", " ", match.group(1).strip())
        if fallback:
            match = re.search(fallback, text, re.DOTALL | re.IGNORECASE)
            if match:
                return re.sub(r"\s+", " ", match.group(1).strip())
        return None

    # Build result
    result = {
        "call_id": call_id,
        "call_title": call_title,
        "call_type": call_type,
        "call_section": call_section
    }

    # Field mappings with label boundaries
    result["expected_eu_contribution"] = extract_block(
        "Expected EU contribution per project",
        until_label="Indicative budget",
        fallback=r"contribution of (?:around|between)\s+(.*?)\s+would allow"
    )

    result["indicative_budget"] = extract_block(
        "Indicative budget",
        until_label="Type of Action"
    )

    result["type_of_action"] = extract_block(
        "Type of Action",
        until_label="Admissibility conditions"
    )

    result["admissibility_conditions"] = extract_block(
        "Admissibility conditions",
        until_label="Technology Readiness Level"
    )

    result["technology_readiness_level"] = extract_block(
        "Technology Readiness Level",
        until_label="Procedure",
        fallback=r"(TRL \d.*?)\s+by the end"
    )

    result["procedure"] = extract_block(
        "Procedure",
        until_label="Legal and financial set-up of the Grant Agreements"
    )

    result["legal_and_financial_setup"] = extract_block(
        "Legal and financial set-up of the Grant Agreements",
        until_label="Exceptional page limits to proposals/applications",
        fallback=r"Eligible costs will take the form of(.*?)(\n|$)"
    )

    result["exceptional_page_limits"] = extract_block(
        "Exceptional page limits to proposals/applications",
        fallback=r"(In order to include.*?exceptionally extended by \d+ pages)"
    )

    # Save
    with open(output_path, "w", encoding="utf-8") as f:
        json.dump(result, f, indent=2, ensure_ascii=False)

    print(f"✅ Extracted data saved to: {output_path}")


if __name__ == "__main__":
    extract_multipage_call("/pdf_files/twopage_2.pdf", "twopage_extracted_call.json")
