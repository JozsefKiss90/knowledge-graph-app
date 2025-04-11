from neo4j import GraphDatabase
import os

NEO4J_URI = os.getenv("NEO4J_URI", "bolt://neo4j:7687")
NEO4J_USER = os.getenv("NEO4J_USER", "neo4j")
NEO4J_PASSWORD = os.getenv("NEO4J_PASSWORD", "password")

class Neo4jConnection:
    def __init__(self):
        self.driver = GraphDatabase.driver(NEO4J_URI, auth=(NEO4J_USER, NEO4J_PASSWORD))

    def close(self):
        if self.driver:
            self.driver.close()

    def query(self, cypher, parameters=None):
        with self.driver.session() as session:
            result = session.run(cypher, parameters or {})
            return [record.data() for record in result]

db = Neo4jConnection()
