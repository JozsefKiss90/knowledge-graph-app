from neo4j import GraphDatabase
from neo4j.exceptions import AuthError, ServiceUnavailable
import os
import time

if os.getenv("ENVIRONMENT") != "production":
    from dotenv import load_dotenv
    load_dotenv()

NEO4J_URI = os.getenv("NEO4J_URI", "bolt://neo4j:7687")
NEO4J_USER = os.getenv("NEO4J_USER", "neo4j")
NEO4J_PASSWORD = os.getenv("NEO4J_PASSWORD", "password")

# Bounded wait for Neo4j to accept connections on startup. The driver is lazy,
# but on a fresh Railway deploy the DB container / private DNS can lag a few
# seconds behind the backend, so we verify connectivity with a short retry loop
# instead of letting the first query fail.
NEO4J_CONNECT_RETRIES = int(os.getenv("NEO4J_CONNECT_RETRIES", "10"))
NEO4J_CONNECT_RETRY_DELAY = float(os.getenv("NEO4J_CONNECT_RETRY_DELAY", "3"))

print("ENVIRONMENT:", os.getenv("ENVIRONMENT"))
print("NEO4J_URI:", NEO4J_URI)

_driver = None


def get_driver():
    global _driver
    if _driver is None:
        _driver = GraphDatabase.driver(
            NEO4J_URI,
            auth=(NEO4J_USER, NEO4J_PASSWORD),
            max_connection_lifetime=300,
            connection_timeout=10,
        )
        print("Neo4j driver initialized")
        _verify_with_retry(_driver)
    return _driver


def _verify_with_retry(driver):
    """Best-effort wait for Neo4j to become reachable.

    Retries transient ServiceUnavailable / network errors (DB still booting or
    internal DNS not ready) up to NEO4J_CONNECT_RETRIES. Auth errors are not
    retried — a wrong password won't fix itself. Always returns so the app still
    boots; the driver's connection pool reconnects automatically once Neo4j is up.
    """
    for attempt in range(1, NEO4J_CONNECT_RETRIES + 1):
        try:
            driver.verify_connectivity()
            print(f"Neo4j connectivity verified (attempt {attempt})")
            return
        except AuthError as err:
            print(f"ERROR: Neo4j auth failed: {err}. Check NEO4J_USER / NEO4J_PASSWORD.")
            return
        except (ServiceUnavailable, OSError) as err:
            if attempt < NEO4J_CONNECT_RETRIES:
                print(
                    f"Neo4j not reachable yet "
                    f"(attempt {attempt}/{NEO4J_CONNECT_RETRIES}): {err}. "
                    f"Retrying in {NEO4J_CONNECT_RETRY_DELAY}s..."
                )
                time.sleep(NEO4J_CONNECT_RETRY_DELAY)
            else:
                print(
                    f"WARNING: Neo4j still unreachable after "
                    f"{NEO4J_CONNECT_RETRIES} attempts: {err}"
                )


class Neo4jConnection:
    def __init__(self):
        self.driver = get_driver()

    def close(self):
        if self.driver:
            self.driver.close()

    def query(self, cypher, parameters=None):
        with self.driver.session() as session:
            result = session.run(cypher, parameters or {})
            return [record.data() for record in result]


db = Neo4jConnection()
