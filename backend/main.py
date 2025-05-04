from fastapi import FastAPI
from routes import nodes, relationships
from fastapi.middleware.cors import CORSMiddleware
from routes import populate  
'''from routes import extraction_pipeline
from routes import segment_pdf'''
from routes import integrate

app = FastAPI()
app.include_router(nodes.router)
app.include_router(relationships.router)
app.include_router(integrate.router)
'''app.include_router(extraction_pipeline.router)
app.include_router(segment_pdf.router)'''
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:3001"],
    allow_credentials=True,
    allow_methods=["*"], 
    allow_headers=["*"],
) 
app.include_router(populate.router)

@app.get("/")
def health_check():
    return {"status": "OK"}
