import re

# Load the JSON file
input_path = Path("routes/pipeline/output_files/nested_parsed_call_tables_with_funding_links.json")
with input_path.open("r", encoding="utf-8") as f:
    data = json.load(f)

def extract_budget(text):
    """Extracts the numeric EUR value from a string like 'EUR 13.00 million'."""
    if not text:
        return None
    match = re.search(r"EUR\s*([\d.,]+)\s*million", text, re.IGNORECASE)
    if match:
        return float(match.group(1).replace(",", ""))
    return None

# Update each call with estimated max_funded_projects based on budget / contribution
updated_count = 0
for cluster in data:
    for theme in cluster.get("themes", []):
        for call in theme.get("calls", []):
            budget_str = call.get("indicative_budget", "")
            contribution_str = call.get("expected_eu_contribution", "")

            budget = extract_budget(budget_str)
            contribution = extract_budget(contribution_str)

            if budget and contribution and contribution > 0:
                max_projects = int(budget // contribution)
                call["max_funded_projects"] = max_projects
                updated_count += 1

# Save updated file
output_path = Path("/mnt/data/nested_parsed_call_tables_with_links_and_projects.json")
with output_path.open("w", encoding="utf-8") as f:
    json.dump(data, f, indent=2, ensure_ascii=False)

output_path.name, updated_count
