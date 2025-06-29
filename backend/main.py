import os
from fastapi import FastAPI
from routes import nodes, relationships
from fastapi.middleware.cors import CORSMiddleware
from routes import integrate
from routes.pipeline.populate import cl4_routes
from routes.pipeline.populate import cl2_routes
from routes import email_routes
from routes import auth

# Load .env file if not in production
if os.getenv("ENVIRONMENT") != "production":
    from dotenv import load_dotenv 
    load_dotenv(dotenv_path=".env.development")

ENVIRONMENT = os.getenv("ENVIRONMENT", "development")
print("ENVIRONMENT:", ENVIRONMENT)

app = FastAPI()

app.include_router(nodes.router)
app.include_router(relationships.router)
app.include_router(integrate.router)
app.include_router(cl4_routes.router)
app.include_router(cl2_routes.router)
app.include_router(email_routes.router)
app.include_router(auth.router)

if ENVIRONMENT == "production":
    allowed_origins = [ "http://localhost:3000", "https://knowledge-graph-frontend-production.up.railway.app"]
else:
    allowed_origins = ["http://localhost:3000", "http://localhost:3001"]

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
