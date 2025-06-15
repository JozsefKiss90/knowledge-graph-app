import json
import re

LABELS = {
    "expected_eu_contribution": ["Expected EU contribution per project", "EU contribution"],
    "indicative_budget": ["Indicative budget", "Total budget"],
    "type_of_action": ["Type of Action", "Action type"],
    "admissibility_conditions": ["Admissibility conditions"],
    "eligibility_conditions": ["Eligibility conditions"],
    "technology_readiness_level": ["Technology Readiness Level", "TRL"],
    "procedure": ["Procedure"],
    "legal_and_financial_setup": ["Legal and financial", "Legal and financial set-up of the Grant Agreements"],
    "exceptional_page_limits": ["Exceptional page limits to proposals/applications", "Page limits"]
}


def normalize(text):
    for field, variants in LABELS.items():
        for v in variants:
            text = re.sub(re.escape(v), field.upper(), text, flags=re.IGNORECASE)
    return text


def locate_label_positions(text):
    """Locate all label start positions in normalized text"""
    positions = {}
    for field in LABELS:
        match = re.search(rf"{field.upper()}\b", text)
        if match:
            positions[field] = match.start()
    return dict(sorted(positions.items(), key=lambda x: x[1]))


def extract_section(text, start_pos, end_pos):
    snippet = text[start_pos:end_pos].strip()
    snippet = re.sub(r"\s+", " ", snippet)
    return snippet.split(" ", 1)[1].strip() if " " in snippet else None


def parse_call_blocks(input_file, output_file):
    with open(input_file, "r", encoding="utf-8") as f:
        data = json.load(f)

    parsed = []

    for block in data:
        raw = block["raw_text"]
        norm = normalize(raw)

        call_id = None
        match = re.search(r"(HORIZON-CL[24]-[\w-]+)", block["call_id_line"])
        if match:
            call_id = match.group(1)

        # Title: next line after call_id_line if it’s not a known label
        lines = raw.splitlines()
        call_title = None
        for i, line in enumerate(lines):
            if block["call_id_line"].strip() in line:
                if i + 1 < len(lines):
                    next_line = lines[i + 1].strip()
                    if not any(next_line.lower().startswith(l.lower()) for l in ["Call:", "Expected Outcome", "Scope", "Type of Action"]):
                        call_title = next_line
                break

        # Call section
        call_section = None
        m = re.search(r"Call:\s*(.*?)\n\s*\nSpecific conditions", raw, re.DOTALL)
        if m:
            call_section = m.group(1).strip()

        # Anchor-based extraction
        field_data = {}
        positions = locate_label_positions(norm)
        fields = list(positions.keys())

        for i, field in enumerate(fields):
            start = positions[field]
            end = positions[fields[i + 1]] if i + 1 < len(fields) else len(norm)
            content = extract_section(norm, start, end)
            field_data[field] = content

        parsed.append({
            "call_id": call_id,
            "call_title": call_title,
            "call_type": field_data.get("type_of_action"),
            "call_section": call_section,
            **field_data,
            "expected_outcome": block.get("expected_outcome"),
            "scope": block.get("scope")
        })

    with open(output_file, "w", encoding="utf-8") as f:
        json.dump(parsed, f, indent=2, ensure_ascii=False)

    print(f"✅ Parsed {len(parsed)} calls saved to {output_file}")

 
if __name__ == "__main__":
    parse_call_blocks(
        "routes/pipeline/output_files/enhanced_raw_call_blocks_cleaned.json",
        "routes/pipeline/output_files/parsed_call_tables.json" 
    )
