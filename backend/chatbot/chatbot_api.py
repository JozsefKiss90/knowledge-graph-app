from fastapi import APIRouter
from pydantic import BaseModel
import os
import requests
from fastapi import HTTPException

router = APIRouter()
 
class ChatRequest(BaseModel):
    question: str

@router.post("/chatbot/query")
async def chatbot_query(request: ChatRequest):
    question = request.question
    try:
        answer = call_llm(question)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    return {"answer": answer}

def call_llm(prompt: str) -> str:
    api_key = os.getenv("OPENROUTER_API_KEY")
    if not api_key:
        raise Exception("OPENROUTER_API_KEY is not set in the backend environment")

    print("OPENROUTER_API_KEY present:", bool(api_key))
    print("OPENROUTER_API_KEY repr:", repr(api_key[:12] + "..." + api_key[-6:]))
    print("OPENROUTER_API_KEY length:", len(api_key))
    print("Prompt repr:", repr(prompt))

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
                "content": "You are a helpful assistant that answers questions about the Horizon Europe 2025 programme. Be concise and clear."
            },
            {"role": "user", "content": prompt},
        ],
    }

    response = requests.post(
        "https://openrouter.ai/api/v1/chat/completions",
        headers=headers,
        json=data,
        timeout=60,
    )

    print("OpenRouter status:", response.status_code)
    print("OpenRouter body:", response.text)

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

