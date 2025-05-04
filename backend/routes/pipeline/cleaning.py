
import re

def clean_text(text: str) -> str:
    return re.sub(r"[\n\r\t\u2022\u0007]", " ", text).strip()
