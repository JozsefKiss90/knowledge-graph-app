from fastapi import FastAPI
from routes import nodes, relationships
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI()
app.include_router(nodes.router)
app.include_router(relationships.router)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:3001"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
def health_check():
    return {"status": "OK"}
