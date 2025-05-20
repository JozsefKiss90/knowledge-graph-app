
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
        "Admissibility conditions"
    ],
    "eligibility_conditions": [
        "Eligibility conditions"
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
    stop_labels = next_labels + ["Expected Outcome:", "Scope:", "Expected Outcome", "Scope"]
    for nl in stop_labels:
        if nl in text[start_index + len(start_label):]:
            candidate_end = text.index(nl, start_index + len(start_label))
            if candidate_end < end_index:
                end_index = candidate_end
    return clean_field_output(text[start_index + len(start_label):end_index])


def parse_enhanced_call_blocks(input_json, output_json):
    with open(input_json, "r", encoding="utf-8") as f:
        call_blocks = json.load(f)

    parsed_calls = []
    call_type = None
    for block in call_blocks:
        raw = block["raw_text"]
        raw = re.sub(r"(Admissibility)\s*\n\s*(conditions)", r"\1 \2", raw, flags=re.IGNORECASE)
        raw = re.sub(r"(Eligibility)\s*\n\s*(conditions)", r"\1 \2", raw, flags=re.IGNORECASE)
        raw = re.sub(r"(Exceptional page limits to)\s*\n\s*(proposals/applications)", r"\1 \2", raw)
        raw = re.sub(r"(Exceptional page limits to)\s*/\s*(applications)", r"\1 proposals/applications", raw)

        text = normalize_labels(raw)
        # Get call ID and title
        # Improved extraction of full call_title from raw text
        call_title = None
        lines = raw.splitlines()
        call_id_line = block["call_id_line"].strip()

        for i, line in enumerate(lines):
            if call_id_line == line.strip():
                # Collect title lines until "Call:" or blank line
                title_lines = []
                for j in range(i + 1, len(lines)):
                    next_line = lines[j].strip()
                    if not next_line or next_line.lower().startswith("call:"):
                        break
                    title_lines.append(next_line)
                call_title = " ".join(title_lines).strip()
                break

        match = re.search(r"(HORIZON-CL[24]-[\w\d-]+)", block["call_id_line"])
        if match:
            call_id = match.group(1).strip()
        
        section_match = re.search(r"Call:\s*(.+?)(?:\n|$)", raw)
        if section_match:
            call_section = section_match.group(1).strip()

        # Extract only the call ID from call_id_line (CL2 or CL4)
        match = re.search(r"(HORIZON-CL[24]-[\w\d-]+)", block["call_id_line"])
        if match:
            call_id = match.group(1).strip()

        # Fallback for type if not captured
        if not call_type and "Type of Action" in raw:
            match_type = re.search(r"Type of Action\s*\n(.*?)\n", raw)
            if match_type:
                call_type = match_type.group(1).strip()

        section_match = re.search(r"Call:\s*([A-Z\s\-]+(?:two-stage)?)", text)
        section_match = re.search(r"Call:\s*(.+?)(?:\n|$)", raw)
        if section_match:
            call_section = section_match.group(1).strip()

        field_keys = list(label_variants.keys())
        extracted = {}
        for i, key in enumerate(field_keys):
            next_keys = [label.upper() for label in field_keys[i+1:]]
            result = extract_between(text, key.upper(), next_keys)
            extracted[key] = result

        if not extracted["admissibility_conditions"] and "General Annex A" in text:
            extracted["admissibility_conditions"] = "The conditions are described in General Annex A."
        if not extracted["eligibility_conditions"] and "General Annex B" in text:
            extracted["eligibility_conditions"] = "The conditions are described in General Annex B."

        expected_outcome = block.get("expected_outcome")
        scope = block.get("scope")

        parsed_calls.append({
            "call_id": call_id,
            "call_title": call_title,
            "call_type": call_type,
            "call_section": call_section,
            **extracted,
            "expected_outcome": expected_outcome,
            "scope": scope
        })

    with open(output_json, "w", encoding="utf-8") as f:
        json.dump(parsed_calls, f, indent=2, ensure_ascii=False)

    print(f"✅ Parsed {len(parsed_calls)} calls saved to: {output_json}")


if __name__ == "__main__":
    parse_enhanced_call_blocks(
        "routes/pipeline/output_files/enhanced_raw_cl2_call_blocks.json",
        "routes/pipeline/output_files/parsed_cl2_call_tables.json"
    )
