import os
from fastapi import FastAPI
from routes import nodes, relationships
from fastapi.middleware.cors import CORSMiddleware
from routes import integrate
from routes import email_routes
from auth import auth
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded
from fastapi.responses import JSONResponse
from utils.rate_limiter import limiter
from chatbot import chatbot_api 
from routes.new_pipeline.cl3_routes import router as cl3
from routes.new_pipeline.cl4_routes import router as cl4
from routes.new_pipeline.cl5_routes import router as cl5
from routes.new_pipeline.cl1_routes import router as cl1
from routes.new_pipeline.cl6_routes import router as cl6
# Load .env file if not in production
if os.getenv("ENVIRONMENT") != "production":
    from dotenv import load_dotenv 
    load_dotenv(dotenv_path=".env.development")

ENVIRONMENT = os.getenv("ENVIRONMENT", "development")
print("ENVIRONMENT:", ENVIRONMENT)

app = FastAPI()

app.state.limiter = limiter

app.include_router(nodes.router)
app.include_router(relationships.router)
app.include_router(integrate.router)
app.include_router(cl3)
app.include_router(cl4)
app.include_router(cl5)
app.include_router(cl1)
app.include_router(cl6)
app.include_router(email_routes.router)
app.include_router(auth.router)
app.include_router(chatbot_api.router)

if ENVIRONMENT == "production":
    allowed_origins = [ "http://localhost:3000", "https://knowledge-graph-frontend-production.up.railway.app"]
else:
    allowed_origins = ["http://localhost:3000", "http://localhost:3001"]

@app.exception_handler(RateLimitExceeded)
def rate_limit_handler(request, exc):
    return JSONResponse(
        status_code=429,
        content={"detail": "Rate limit exceeded"}
    )

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
def health_check():
    return {"status": "OK", "env": ENVIRONMENT}
