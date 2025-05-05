import requests

# Endpoint
url = "http://localhost/api/integrate/"

# Open files as file objects
with open("backend/neo4j_nodes_cleaned.json", "rb") as nodes_f, \
     open("backend/canonical_topic_relationships.json", "rb") as rels_f:

    files = {
        "nodes_file": ("neo4j_nodes_cleaned.json", nodes_f, "application/json"),
        "relationships_file": ("canonical_topic_relationships.json", rels_f, "application/json")
    }

    response = requests.post(url, files=files)

    print("Status Code:", response.status_code)
    print("Response:", response.text)
