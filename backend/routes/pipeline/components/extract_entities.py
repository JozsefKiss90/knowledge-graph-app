import re
from typing import List, Dict

def extract_calls_and_titles(text: str) -> List[Dict[str, str]]:
    """
    Extract call IDs, full titles, and types (IA, RIA, CSA) from cleaned chunk text.
    """
    # Match examples like:
    # HORIZON-CL4-INDUSTRY-2025-01-TWIN-TRANSITION-01: Integrated approaches for remanufacturing (Made in Europe Partnership) (IA)
    pattern = r"(HORIZON-CL4-[\w\d-]+)[\s:–]+(.*?)(?:\((IA|RIA|CSA)\))"
    matches = re.findall(pattern, text, re.DOTALL)

    structured = []
    for call_id, raw_title, call_type in matches:
        # Clean extra parenthetical content (e.g. partnership names)
        title = re.sub(r"\([^()]*\)", "", raw_title).strip(" :–\n\t")
        title = re.sub(r"\s{2,}", " ", title)
        structured.append({
            "call_id": call_id.strip(),
            "call_title": title.strip(),
            "call_type": call_type.strip()
        })

    return structured
