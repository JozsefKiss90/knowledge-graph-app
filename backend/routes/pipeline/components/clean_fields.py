import json
import re

# Matches the work programme footer
footer_pattern = re.compile(
    r"(Horizon Europe\s*-\s*)?Work Programme 2025 Digital, Industry and Space Part 7\s*-\s*Page \d+ of \d+",
    re.IGNORECASE
)

# Matches footnotes as two- or three-digit numbers followed by a space
footnote_index_pattern = re.compile(r"\b\d{2,3}\s")

def clean_field_text(text: str) -> str:
    if not text:
        return text

    # Find the footer position
    footer_match = footer_pattern.search(text)
    if footer_match:
        # From footer start, look backward for any 2–3 digit footnote index
        start = footer_match.start()
        prefix = text[:start]

        # Search for last footnote index before the footer
        footnotes = list(footnote_index_pattern.finditer(prefix))
        if footnotes:
            cut_pos = footnotes[0].start()  # cut from the first one before footer
            text = text[:cut_pos]
        else:
            text = prefix  # just cut footer, no footnote detected

    # Final normalize
    return re.sub(r"\s+", " ", text).strip() if text.strip() else None


def clean_expected_and_scope_fields(json_path_in, json_path_out):
    with open(json_path_in, "r", encoding="utf-8") as f:
        data = json.load(f)

    cleaned = 0
    for entry in data:
        eo = entry.get("expected_outcome")
        sc = entry.get("scope")

        new_eo = clean_field_text(eo)
        new_sc = clean_field_text(sc)

        if new_eo != eo:
            entry["expected_outcome"] = new_eo
            cleaned += 1

        if new_sc != sc:
            entry["scope"] = new_sc
            cleaned += 1

    with open(json_path_out, "w", encoding="utf-8") as f:
        json.dump(data, f, indent=2, ensure_ascii=False)

    print(f"✅ Cleaned {cleaned} field(s) with footnote or footer metadata.")
if __name__ == "__main__":
    clean_expected_and_scope_fields(
        json_path_in="routes/pipeline/output_files/enhanced_raw_call_blocks.json",
        json_path_out="routes/pipeline/output_files/enhanced_raw_call_blocks_cleaned.json"
    )
