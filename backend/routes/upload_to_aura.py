import requests
import os

# Replace this with the deployed Railway backend URL once known
BASE_URL = "https://knowledge-graph-backend-production.up.railway.app"

# Step 1: Delete existing graphs
print("Deleting old Cluster 2 and 4 graphs...")
requests.delete(f"{BASE_URL}/cluster2/")
requests.delete(f"{BASE_URL}/cluster4/") 
print(BASE_URL)
# Step 2: Regenerate new graphs
print("Repopulating Cluster 2 graph...")
res_cl2 = requests.post(f"{BASE_URL}/cluster2/")
print("Cluster 2:", res_cl2.status_code, res_cl2.json())

print("Repopulating Cluster 4 graph...")
res_cl4 = requests.post(f"{BASE_URL}/cluster4/")
print("Cluster 4:", res_cl4.status_code, res_cl4.json())

# Step 3: Upload integrated nodes/relationships
# Step 3: Upload integrated nodes/relationships/summaries
print("Uploading nodes, relationships, and topic summaries to /integrate/...")

with open("../correctly_processed_nodes.json", "rb") as nodes_f, \
     open("../canonical_topic_relationships.json", "rb") as rels_f, \
     open("../topic_summaries_generated.json", "rb") as summaries_f:

    files = {
        "nodes_file": ("correctly_processed_nodes.json", nodes_f, "application/json"),
        "relationships_file": ("canonical_topic_relationships.json", rels_f, "application/json"),
        "topic_summaries_file": ("topic_summaries_generated.json", summaries_f, "application/json")
    }

    response = requests.post(f"{BASE_URL}/integrate/", files=files)
    print("Integration upload status:", response.status_code)
    print("Response:", response.text)
'''
print("Deleting integrated graph in AuraDB...")
res_delete = requests.delete(f"{BASE_URL}/integrate/")
print("DELETE /integrate/ status:", res_delete.status_code)
print("Response:", res_delete.text)
'''