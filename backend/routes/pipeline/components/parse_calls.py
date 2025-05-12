
import re
import json

label_variants = {
    "expected_eu_contribution": [
        "Expected EU contribution per project", "EU contribution"
    ],
    "indicative_budget": [
        "Indicative budget", "Total budget", "Overall indicative budget"
    ],
    "type_of_action": [
        "Type of Action", "Action type"
    ],
    "admissibility_conditions": [
        "Admissibility conditions", "Admissibility \nconditions"
    ],
    "eligibility_conditions": [
        "Eligibility conditions", "Eligibility \nconditions"
    ],
    "technology_readiness_level": [
        "Technology Readiness Level", "TRL"
    ],
    "procedure": [
        "Procedure"
    ],
    "legal_and_financial_setup": [
        "Legal and financial set-up of the Grant Agreements", "Legal and financial"
    ],
    "exceptional_page_limits": [
        "Exceptional page limits to proposals/applications", "Page limits"
    ]
}

def normalize_labels(text):
    for key, variants in label_variants.items():
        for v in variants:
            text = re.sub(re.escape(v), key.upper(), text, flags=re.IGNORECASE)
    return text

def clean_field_output(value):
    if not value:
        return None
    # Remove document footers, links, or annex notes
    value = re.sub(r"Horizon Europe - Work Programme.*", "", value)
    value = re.sub(r"https?://\S+", "", value)
    value = re.sub(r"\bPage \d+ of \d+\b", "", value)
    value = re.sub(r"\s+", " ", value)
    return value.strip()

def extract_between(text, start_label, next_labels):
    if start_label not in text:
        return None
    start_index = text.index(start_label)
    end_index = len(text)
    for nl in next_labels:
        if nl in text[start_index + len(start_label):]:
            candidate_end = text.index(nl, start_index + len(start_label))
            if candidate_end < end_index:
                end_index = candidate_end
    return clean_field_output(text[start_index + len(start_label):end_index])

def parse_enhanced_call_blocks(input_json, output_json):
    with open(input_json, "r", encoding="utf-8") as f:
        call_blocks = json.load(f)

    for block in call_blocks:
        raw = block["raw_text"]
        # Fix wrapped headers
        raw = re.sub(r"(Admissibility)\s*\n\s*(conditions)", r"\1 \2", raw, flags=re.IGNORECASE)
        raw = re.sub(r"(Eligibility)\s*\n\s*(conditions)", r"\1 \2", raw, flags=re.IGNORECASE)
        raw = re.sub(r"(Exceptional page limits to)\s*\n\s*(proposals/applications)", r"\1 \2", raw)
        raw = re.sub(r"(Exceptional page limits to)\s*/\s*(applications)", r"\1 proposals/applications", raw)
        block["raw_text"] = raw

    parsed_calls = []

    for block in call_blocks:
        text = normalize_labels(block["raw_text"])
        call_id = call_title = call_type = call_section = None

        call_match = re.search(r"(HORIZON-CL4-[\w\d-]+):\s*(.*?)\s*\((RIA|IA|CSA)\)", text, re.DOTALL)
        if call_match:
            call_id = call_match.group(1).strip()
            call_title = re.sub(r"\s+", " ", call_match.group(2)).strip()
            call_type = call_match.group(3).strip()

        section_match = re.search(r"Call:\s*([A-Z\s\-]+(?:two-stage)?)", text)
        if section_match:
            call_section = re.sub(r"\s+", " ", section_match.group(1)).strip()

        field_keys = list(label_variants.keys())
        extracted = {}
        for i, key in enumerate(field_keys):
            next_keys = [label.upper() for label in field_keys[i+1:]]
            result = extract_between(text, key.upper(), next_keys)
            extracted[key] = result

        # Add fallback for annex-only conditions if still null
        if not extracted["admissibility_conditions"] and "General Annex A" in text:
            extracted["admissibility_conditions"] = "The conditions are described in General Annex A."
        if not extracted["eligibility_conditions"] and "General Annex B" in text:
            extracted["eligibility_conditions"] = "The conditions are described in General Annex B."

        parsed_calls.append({
            "call_id": call_id,
            "call_title": call_title,
            "call_type": call_type,
            "call_section": call_section,
            **extracted
        })

    with open(output_json, "w", encoding="utf-8") as f:
        json.dump(parsed_calls, f, indent=2, ensure_ascii=False)

    print(f"✅ Parsed {len(parsed_calls)} calls saved to: {output_json}")

if __name__ == "__main__":
    parse_enhanced_call_blocks("enhanced_raw_call_blocks.json", "parsed_call_tables.json")
