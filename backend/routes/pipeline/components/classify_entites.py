import re
from typing import List, Dict

def classify_extracted_lines(lines: List[str]) -> List[Dict[str, str]]:
    entries = []
    current_entry = {"call_id": None, "call_title": None, "call_type": None}

    for line in lines:
        if line.lower().startswith("call id"):
            current_entry["call_id"] = re.sub(r"^Call ID:\s*", "", line, flags=re.I).strip()
        elif line.lower().startswith("call title"):
            current_entry["call_title"] = re.sub(r"^Call Title:\s*", "", line, flags=re.I).strip()
        elif line.lower().startswith("call type"):
            current_entry["call_type"] = re.sub(r"^Call Type:\s*", "", line, flags=re.I).strip()

        if current_entry["call_id"] and current_entry["call_title"]:
            entries.append(current_entry.copy())
            current_entry = {"call_id": None, "call_title": None, "call_type": None}

    return entries
