from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
import os
import requests

from chatbot.call_search import search_metadata, _detect_filters
from chatbot.context_builder import build_context, _format_budget

router = APIRouter()

class ChatRequest(BaseModel):
    question: str

def _call_card(doc: dict) -> dict:
    """Extract the fields the frontend needs for a call card."""
    budget = doc.get("budget")
    return {
        "identifier": doc["identifier"],
        "title": doc.get("title", ""),
        "deadline": doc.get("deadline", ""),
        "budget_label": _format_budget(budget),
        "budget_total": budget["total_eur"] if budget else None,
        "action_type": doc.get("action_type", ""),
        "cluster": doc.get("call_identifier", ""),
        "url": doc.get("url", ""),
    }

def _build_chips(matches: list, filters: dict) -> list:
    """Build filter chips from matched calls and detected filters."""
    from datetime import date

    chips = []
    today = date.today().isoformat()

    # Work programmes (deduplicated, from matched calls' call_title)
    programmes = {}
    for m in matches:
        ct = m.get("call_title") or m.get("call_identifier") or ""
        if ct and ct not in programmes:
            programmes[ct] = True
    for prog in programmes:
        chips.append({"type": "programme", "label": prog})

    # Open / closed call counts
    open_count = sum(1 for m in matches if (m.get("deadline") or "") >= today)
    closed_count = len(matches) - open_count
    if open_count:
        chips.append({"type": "status", "label": f"Open calls: {open_count}"})
    if closed_count:
        chips.append({"type": "status", "label": f"Closed calls: {closed_count}"})

    # Action types from filters
    if "action_types" in filters:
        for at in sorted(filters["action_types"]):
            chips.append({"type": "action_type", "label": at})

    return chips

@router.post("/chatbot/query")
async def chatbot_query(request: ChatRequest):
    question = request.question
    try:
        matches = search_metadata(question)
        filters = _detect_filters(question)
        context = build_context(matches, question)
        answer = call_llm(question, context)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    return {
        "answer": answer,
        "sources": [m["identifier"] for m in matches],
        "matched_calls": [_call_card(m) for m in matches],
        "filters": _build_chips(matches, filters),
        "total_matches": len(matches),
    }

_SYSTEM_PROMPT = """You are a Horizon Europe 2026-2027 call assistant. Answer the user's question using ONLY the call metadata provided below.

Rules:
- Answer ONLY from the supplied metadata. Do not use outside knowledge.
- If the information is not present in the metadata, say clearly that the metadata does not contain it.
- When referencing calls, always include the full identifier (e.g. HORIZON-CL2-2026-01-DEMOCRACY-01).
- Be concise and factual. Use bullet points for lists.
- If multiple calls match, summarise the key differences.
- Include the call URL when it would be helpful for the user.

=== CALL METADATA ===
{context}
=== END METADATA ==="""


def call_llm(question: str, context: str) -> str:
    api_key = os.getenv("OPENROUTER_API_KEY")
    if not api_key:
        raise Exception("OPENROUTER_API_KEY is not set in the backend environment")

    headers = {
        "Authorization": f"Bearer {api_key.strip()}",
        "HTTP-Referer": "http://localhost:3000",
        "X-OpenRouter-Title": "EU Graphs Chatbot",
        "Content-Type": "application/json",
    }

    data = {
        "model": "openrouter/free",
        "messages": [
            {
                "role": "system",
                "content": _SYSTEM_PROMPT.format(context=context),
            },
            {"role": "user", "content": question},
        ],
    }

    response = requests.post(
        "https://openrouter.ai/api/v1/chat/completions",
        headers=headers,
        json=data,
        timeout=60,
    )

    if response.status_code != 200:
        raise Exception(f"{response.status_code} - {response.text}")

    return response.json()["choices"][0]["message"]["content"].strip()

@router.get("/chatbot/models")
def list_openrouter_models():
    headers = {
        "Authorization": f"Bearer " + os.getenv("OPENROUTER_API_KEY"),
        "HTTP-Referer": "http://localhost:3000",
    }
    response = requests.get("https://openrouter.ai/api/v1/models", headers=headers)

    if response.status_code != 200:
        return {"error": response.text}

    models = response.json().get("data", [])
    return {"models": [m["id"] for m in models]}

