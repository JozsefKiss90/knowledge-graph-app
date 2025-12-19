from neo4j import GraphDatabase
import os
import time

if os.getenv("ENVIRONMENT") != "production":
    from dotenv import load_dotenv
    load_dotenv() 

NEO4J_URI = os.getenv("NEO4J_URI", "bolt://neo4j:7687")
NEO4J_USER = os.getenv("NEO4J_USER", "neo4j")
NEO4J_PASSWORD = os.getenv("NEO4J_PASSWORD", "password")

print("ENVIRONMENT:", os.getenv("ENVIRONMENT"))
print("NEO4J_URI:", NEO4J_URI)



class Neo4jConnection:
    
    _driver = None

    def __init__(self):
        self.driver = GraphDatabase.driver(NEO4J_URI, auth=(NEO4J_USER, NEO4J_PASSWORD))
        print("Connected to Neo4j URI:", NEO4J_URI)

    def close(self):
        if self.driver:
            self.driver.close()

    def query(self, cypher, parameters=None):
        with self.driver.session() as session:
            result = session.run(cypher, parameters or {})
            return [record.data() for record in result]

    def get_driver():
        global _driver
        if _driver is None:
            _driver = GraphDatabase.driver(
                NEO4J_URI,
                auth=(NEO4J_USER, NEO4J_PASSWORD),
                max_connection_lifetime=300,
                connection_timeout=10,
            )
        return _driver


    def run_with_retry(fn, retries=3, delay=2):
        for i in range(retries):
            try:
                return fn()
            except Exception as e:
                if i == retries - 1:
                    raise
                time.sleep(delay * (i + 1))


db = Neo4jConnection()