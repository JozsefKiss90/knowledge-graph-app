from fastapi import FastAPI
from routes import nodes, relationships
from fastapi.middleware.cors import CORSMiddleware
from routes import integrate
from routes.pipeline.populate import cl4_routes

app = FastAPI()
app.include_router(nodes.router)
app.include_router(relationships.router)
app.include_router(integrate.router)
app.include_router(cl4_routes.router)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:3001"],
    #allow_origins=["https://knowledge-graph-frontend-production.up.railway.app"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
def health_check():
    return {"status": "OK"}
