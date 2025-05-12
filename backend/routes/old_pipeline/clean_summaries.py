import json
import re

# Load the summarized nodes
with open("neo4j_nodes_with_summaries.json", "r", encoding="utf-8") as f:
    nodes = json.load(f)

# Cleaning helper functions
def clean_summary(text):
    if not text or text.strip() == "No matched context available.":
        return text

    # Remove URLs
    text = re.sub(r'http\S+', '', text)
    text = re.sub(r'www\.\S+', '', text)

    # Remove suicide hotlines, Samaritans, confidential support notes
    text = re.sub(r'For confidential support.*?(\.|$)', '', text, flags=re.IGNORECASE)
    text = re.sub(r'Samaritans.*?(\.|$)', '', text, flags=re.IGNORECASE)
    text = re.sub(r'National Suicide Prevention Line.*?(\.|$)', '', text, flags=re.IGNORECASE)

    # Remove references to Publications Office, links to external resources
    text = re.sub(r'Publications Office.*?(\.|$)', '', text, flags=re.IGNORECASE)
    text = re.sub(r'European Commission, Directorate.*?(\.|$)', '', text, flags=re.IGNORECASE)

    # Fix common OCR issues
    text = text.replace('˚', 'f')
    text = text.replace('Œ', ' ')
    text = text.replace('˙', 'e')

    # Remove repeated whitespaces and trim
    text = re.sub(r'\s+', ' ', text)
    text = text.strip()

    return text

# Apply cleaning
for node in nodes:
    original_summary = node.get("summary", "")
    cleaned_summary = clean_summary(original_summary)
    node["summary"] = cleaned_summary

# Save cleaned nodes
with open("neo4j_nodes_cleaned.json", "w", encoding="utf-8") as f:
    json.dump(nodes, f, indent=2, ensure_ascii=False)

print(f"✅ Cleaned summaries written to neo4j_nodes_cleaned.json ({len(nodes)} nodes).")
