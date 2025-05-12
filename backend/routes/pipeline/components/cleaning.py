import re

def clean_text(text: str) -> str:
    text = re.sub(r"-\s*\n\s*", "", text)  # Remove line-break hyphenation
    text = re.sub(r"\n+", " ", text)
    text = re.sub(r"\s+", " ", text)
    return text.strip()
