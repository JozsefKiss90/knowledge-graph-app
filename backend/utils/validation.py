import re
from fastapi import HTTPException

def validate_cypher_identifier(name: str, field_name: str = "label"):
    if not re.fullmatch(r"[A-Za-z_][A-Za-z0-9_]*", name):
        raise HTTPException(status_code=400, detail=f"Invalid {field_name}: {name}")
