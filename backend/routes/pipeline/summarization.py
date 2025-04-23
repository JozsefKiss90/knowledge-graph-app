
from transformers import pipeline

summary_pipeline = pipeline("summarization", model="facebook/bart-large-cnn")

def summarize_entity(entity: str, contexts: list):
    joined = " ".join(contexts[:3])[:1500]
    prompt = f"What is '{entity}' in the Horizon Europe Strategic Plan?\n\n{joined}"
    summary = summary_pipeline(prompt, max_length=180, min_length=60, do_sample=False)
    return summary[0]['summary_text']
