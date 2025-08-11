from fastapi import APIRouter
from pydantic import BaseModel
import os
import requests

router = APIRouter()
 
class ChatRequest(BaseModel):
    question: str

@router.post("/chatbot/query")
async def chatbot_query(request: ChatRequest):
    question = request.question
    try:
        answer = call_llm(question)
    except Exception as e:
        return {"answer": f"Sorry, an error occurred: {str(e)}"}
    return {"answer": answer}

def call_llm(prompt: str) -> str:
    headers = {
        "Authorization": f"Bearer {os.getenv('OPENROUTER_API_KEY')}",
        "HTTP-Referer": "http://localhost:3000",
        "Content-Type": "application/json"
    }
    data = {
        "model": "mistralai/mistral-7b-instruct:free",  # ✅ confirmed to exist
        "messages": [
            {"role": "system", "content": "You are a helpful assistant that answers questions about the Horizon Europe 2025 programme. Be concise and clear."},
            {"role": "user", "content": prompt}
        ]
    }

    response = requests.post("https://openrouter.ai/api/v1/chat/completions", headers=headers, json=data)

    if response.status_code != 200:
        print("🔴 OpenRouter Error:")
        print("Status:", response.status_code)
        print("Response:", response.text)
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
