
import json
import sys
from pathlib import Path

BASE_URL = "https://ec.europa.eu/info/funding-tenders/opportunities/portal/screen/opportunities/topic-details/"

def add_funding_links(input_file: str, output_file: str):
    with open(input_file, "r", encoding="utf-8") as f:
        data = json.load(f)

    updated_count = 0
    for cluster in data:
        for theme in cluster.get("themes", []):
            for call in theme.get("calls", []):
                call_id = call.get("call_id")
                if call_id and isinstance(call_id, str):
                    call["funding_link"] = BASE_URL + call_id
                    updated_count += 1

    with open(output_file, "w", encoding="utf-8") as f:
        json.dump(data, f, indent=2, ensure_ascii=False)

    print(f"✅ Added funding_link to {updated_count} calls.")
    print(f"📁 Output saved to: {output_file}")

if __name__ == "__main__":
    if len(sys.argv) != 3:
        print("Usage: python add_funding_links.py <input_json> <output_json>")
        sys.exit(1)

    input_path = sys.argv[1]
    output_path = sys.argv[2]
    add_funding_links(input_path, output_path)
