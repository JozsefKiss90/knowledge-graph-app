import json
import re

# Load the summarized nodes
with open("../../neo4j_nodes_with_summaries.json", "r", encoding="utf-8") as f:
    nodes = json.load(f)

# Cleaning helper functions
def clean_summary(text):
    if not text or text.strip() == "No matched context available.":
        return text

    # Remove URLs
    text = re.sub(r'http\S+', '', text)
    text = re.sub(r'www\.\S+', '', text)

    # Remove suicide hotlines, Samaritans, confidential support notes
    
    text = re.sub(r"(?i)for confidential support.*?(\.|\n|$)", "", text)
    text = re.sub(r"(?i)samaritans.*?(\.|\n|$)", "", text)
    text = re.sub(r"(?i)national suicide prevention.*?(\.|\n|$)", "", text)
    text = re.sub(r"C\s?\(\d{4}\)\d+[^.,]*[.,]", "", text)
    text = re.sub(r"\d{1,2}\.\d{1,2}\.\d{4}", "", text)
    text = re.sub(r"(?i)clusters?\s+\d+(?:,\s*\d+)+", "Clusters", text)
    text = re.sub(r"https?://\S+|www\.\S+", "", text)
    text = re.sub(r"\b(\d{1,3})(,\s*\1)+\b", r"\1", text)
    text = re.sub(r"[.]{2,}|[,]{2,}", ".", text)
    text = re.sub(r"\b(?!EU|AI|UN|EC|ICT)\b[A-Z]{3,}\b", "", text)
    text = text.replace("˚", "f").replace("Œ", " ").replace("˙", "e")
    text = re.sub(r"\s+", " ", text).strip()

    return text

# Apply cleaning
for node in nodes:
    original_summary = node.get("summary", "")
    cleaned_summary = clean_summary(original_summary)
    node["summary"] = cleaned_summary

# Save cleaned nodes
with open("neo4j_nodes_cleaned_2.json", "w", encoding="utf-8") as f:
    json.dump(nodes, f, indent=2, ensure_ascii=False)

print(f"✅ Cleaned summaries written to neo4j_nodes_cleaned.json ({len(nodes)} nodes).")
