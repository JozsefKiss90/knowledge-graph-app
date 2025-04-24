import json
from transformers import pipeline

# Load input files
with open("neo4j_nodes_llm_refined.json", "r", encoding="utf-8") as f:
    nodes = json.load(f)
with open("matched_chunks_for_nodes.json", "r", encoding="utf-8") as f:
    context_map = json.load(f)

# Initialize BART summarization pipeline
summarizer = pipeline("summarization", model="facebook/bart-large-cnn")
tokenizer = summarizer.tokenizer

# Truncate context to avoid exceeding input length
def truncate_context(context_paragraphs, tokenizer, max_tokens=1024):
    context_text = " ".join(context_paragraphs)
    tokens = tokenizer(context_text, truncation=True, max_length=max_tokens, return_tensors="pt")
    return tokenizer.decode(tokens["input_ids"][0], skip_special_tokens=True)

# Summarize node using chunk context directly
def summarize_node(context_text, retries=2):
    for attempt in range(retries):
        summary = summarizer(context_text, max_length=300, min_length=150, do_sample=False)[0]['summary_text'].strip()
        sentence_count = summary.count(".")
        if sentence_count >= 3:
            return summary
    return summary  # Return best-effort if retry fails

# Main loop with logging and duplicate detection
summary_cache = {}
for node in nodes:
    name = node["name"]
    context_paragraphs = context_map.get(name, [])
    
    if context_paragraphs:
        context_text = truncate_context(context_paragraphs, tokenizer)
        summary = summarize_node(context_text)
        
        # Deduplicate summaries based on text
        if summary in summary_cache.values():
            print(f"♻️ Duplicate detected for: {name}")
        summary_cache[name] = summary
        node["summary"] = summary

        print(f"🧠 Node: {name}")
        print(f"📄 Summary ({summary.count('.') + 1} sentences): {summary}")
        print("-" * 80)
    else:
        node["summary"] = "No matched context available."
        print(f"⚠️ No context found for: {name}")

# Save output
with open("neo4j_nodes_with_summaries.json", "w", encoding="utf-8") as f:
    json.dump(nodes, f, indent=2, ensure_ascii=False)

print(f"✅ Final summaries written for {len(nodes)} nodes.")
