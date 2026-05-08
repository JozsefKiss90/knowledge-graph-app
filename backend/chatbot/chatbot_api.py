from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
import os
import requests

from chatbot.call_search import search_metadata
from chatbot.context_builder import build_context

router = APIRouter()

class ChatRequest(BaseModel):
    question: str

@router.post("/chatbot/query")
async def chatbot_query(request: ChatRequest):
    question = request.question
    try:
        matches = search_metadata(question)
        context = build_context(matches, question)
        answer = call_llm(question, context)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    return {
        "answer": answer,
        "sources": [m["identifier"] for m in matches],
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

