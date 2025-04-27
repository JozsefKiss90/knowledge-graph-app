from fastapi import APIRouter, UploadFile, File
import json
from database import db

router = APIRouter(prefix="/integrate", tags=["Graph Integration"])

@router.post("/")
async def integrate_graph( 
    nodes_file: UploadFile = File(...),
    relationships_file: UploadFile = File(...)
):
    # Load files into Python data
    nodes = json.loads((await nodes_file.read()).decode("utf-8"))
    relationships = json.loads((await relationships_file.read()).decode("utf-8"))

    # Step 1: Create all document nodes
    for node in nodes:
        props = {
            "id": node["id"],
            "name": node["name"],
            "summary": node["summary"],
            "type": node["type"]
        }
        cypher = """
        MERGE (n:Document {id: $id})
        SET n += $props 
        """
        db.query(cypher, {"id": node["id"], "props": props})

    # Step 2: Create Topic nodes
    topic_ids = {rel["target"] for rel in relationships if rel["target"].startswith("topic_")}
    for topic_id in topic_ids:
        cypher = """
        MERGE (t:Topic {id: $id})
        """
        db.query(cypher, {"id": topic_id})
 
    # Step 3: Create relationships
    for rel in relationships:
        props = {"keywords": rel.get("keywords", [])}
        if rel["relation"] == "belongs_to_topic":
            cypher = """
            MATCH (a:Document {id: $source}), (b:Topic {id: $target})
            MERGE (a)-[r:BELONGS_TO_TOPIC]->(b)
            SET r.keywords = $keywords
            """
        elif rel["relation"] == "shared_topic":
            cypher = """
            MATCH (a:Document {id: $source}), (b:Document {id: $target})
            MERGE (a)-[r:SHARED_TOPIC]->(b)
            SET r.score = $score, r.topic_id = $topic_id, r.keywords = $keywords
            """
            props.update({"score": rel["score"], "topic_id": rel["topic_id"]})
        elif rel["relation"] == "cross_topic_similarity":
            cypher = """
            MATCH (a:Document {id: $source}), (b:Document {id: $target})
            MERGE (a)-[r:CROSS_TOPIC_SIMILARITY]->(b)
            SET r.score = $score 
            """
            props.update({"score": rel["score"]})
        else:
            continue  # Skip unknown relations

        db.query(cypher, {"source": rel["source"], "target": rel["target"], **props})

    return {
        "nodes_inserted": len(nodes),
        "topics_inserted": len(topic_ids),
        "relationships_inserted": len(relationships)
    }
