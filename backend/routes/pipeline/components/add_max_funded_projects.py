
import json
import re
import sys
from pathlib import Path

BASE_URL = "https://ec.europa.eu/info/funding-tenders/opportunities/portal/screen/opportunities/topic-details/"

def extract_lowest_eur_million(text):
    """Extract the smallest float value in millions from a EUR phrase like 'between EUR 5.00 and 7.00 million'."""
    matches = re.findall(r"EUR\s*([\d.]+)", text, re.IGNORECASE)
    if not matches:
        return None
    return min(float(val) for val in matches)

def add_max_funded_projects(input_file: str, output_file: str):
    with open(input_file, "r", encoding="utf-8") as f:
        data = json.load(f)

    updated_count = 0
    for cluster in data:
        for theme in cluster.get("themes", []):
            for call in theme.get("calls", []):
                budget_text = call.get("indicative_budget", "")
                contrib_text = call.get("expected_eu_contribution", "")
                total_budget = extract_lowest_eur_million(budget_text)
                per_project_contrib = extract_lowest_eur_million(contrib_text)

                if total_budget and per_project_contrib and per_project_contrib > 0:
                    call["max_funded_projects"] = int(total_budget // per_project_contrib)
                    updated_count += 1
                else:
                    call["max_funded_projects"] = None

    with open(output_file, "w", encoding="utf-8") as f:
        json.dump(data, f, indent=2, ensure_ascii=False)

    print(f"✅ Added max_funded_projects to {updated_count} calls.")
    print(f"📁 Output saved to: {output_file}")

if __name__ == "__main__":
    if len(sys.argv) != 3:
        print("Usage: python add_max_funded_projects.py <input_json> <output_json>")
        sys.exit(1)

    input_path = sys.argv[1]
    output_path = sys.argv[2]
    add_max_funded_projects(input_path, output_path)
