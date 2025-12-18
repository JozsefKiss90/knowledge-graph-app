import requests
import os

BASE_URL = "https://knowledge-graph-backend-production.up.railway.app"

print("Deleting old Cluster graphs...")
for i in range(1, 7):
    r = requests.delete(f"{BASE_URL}/cluster{i}/all")
    print(f"DELETE /cluster{i}/all ->", r.status_code, r.text)

print("Repopulating Cluster graphs...")
for i in range(1, 7):
    r = requests.post(f"{BASE_URL}/cluster{i}/populate", json={})
    print(f"POST /cluster{i}/populate ->", r.status_code, r.text)

# Step 3: Upload integrated nodes/relationships/summaries
#print("Uploading nodes, relationships, and topic summaries to /integrate/...")

'''with open("../correctly_processed_nodes.json", "rb") as nodes_f, \
     open("../canonical_topic_relationships.json", "rb") as rels_f, \
     open("../topic_summaries_generated.json", "rb") as summaries_f:

    files = {
        "nodes_file": ("correctly_processed_nodes.json", nodes_f, "application/json"),
        "relationships_file": ("canonical_topic_relationships.json", rels_f, "application/json"),
        "topic_summaries_file": ("topic_summaries_generated.json", summaries_f, "application/json")
    }

    response = requests.post(f"{BASE_URL}/integrate/", files=files)
    print("Integration upload status:", response.status_code)
    print("Response:", response.text)'''
'''
print("Deleting integrated graph in AuraDB...")
res_delete = requests.delete(f"{BASE_URL}/integrate/")
print("DELETE /integrate/ status:", res_delete.status_code)
print("Response:", res_delete.text)
'''