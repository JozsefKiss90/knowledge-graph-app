from database import db

print("=== Distinct Call sources ===")
for r in db.query("MATCH (c:Call) RETURN c.source AS source, count(*) AS n ORDER BY n DESC"):
    print(r)

print("\n=== Calls with cluster_3 source ===")
print(db.query("MATCH (c:Call {source:'cluster_3'}) RETURN count(c) AS n"))

print("\n=== Calls with related_topics set (any source) ===")
print(db.query("MATCH (c:Call) WHERE c.related_topics IS NOT NULL RETURN count(c) AS n"))

print("\n=== Sample tagged calls ===")
for r in db.query("MATCH (c:Call) WHERE c.related_topics IS NOT NULL RETURN c.id AS id, c.source AS source, c.related_topics AS topics, c.cordis_tag_query AS q LIMIT 5"):
    print(r)

print("\n=== HAS_FUNDED_PROJECT links ===")
print(db.query("MATCH (:Call)-[r:HAS_FUNDED_PROJECT]->() RETURN count(r) AS n"))

print("\n=== CordisProject count ===")
print(db.query("MATCH (p:CordisProject) RETURN count(p) AS n"))

print("\n=== Calls with cordis_area_query set ===")
print(db.query("MATCH (c:Call) WHERE c.cordis_area_query IS NOT NULL RETURN count(c) AS n"))
