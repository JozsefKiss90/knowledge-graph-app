import json
from database import db

class ClusterGraphBuilder:
    def __init__(self):
        self.db = db

    def run_query(self, query, parameters=None):
        self.db.query(query, parameters or {})

    def create_graph_from_file(self, nested_json_path):
        with open(nested_json_path, "r", encoding="utf-8") as f:
            data = json.load(f)

        # Root node
        root_id = "cluster_4"
        self.run_query(
            """
            MERGE (c:Cluster {id: $id})
            SET c.name = "Cluster 4 - Digital, Industry and Space",
                c.source = 'cluster_4'
            """,
            {"id": root_id}
        )

        for d in data:
            dest_id = f"cluster4_destination_{d['destination']}"
            self.run_query(
                """
                MERGE (d:Destination {id: $id})
                SET d.name = $name,
                    d.source = 'cluster_4'
                """,
                {"id": dest_id, "name": d["destination"]}
            )
            self.run_query(
                """
                MATCH (c:Cluster {id: $cluster_id}), (d:Destination {id: $dest_id})
                MERGE (c)-[:HAS_DESTINATION]->(d)
                """,
                {"cluster_id": root_id, "dest_id": dest_id}
            )

            for theme_obj in d.get("themes", []):
                theme_id = f"cluster4_theme_{theme_obj['theme']}"
                self.run_query(
                    """
                    MERGE (t:Theme {id: $id})
                    SET t.name = $name,
                        t.source = 'cluster_4'
                    """,
                    {"id": theme_id, "name": theme_obj["theme"]}
                )
                self.run_query(
                    """
                    MATCH (d:Destination {id: $dest_id}), (t:Theme {id: $theme_id})
                    MERGE (d)-[:HAS_THEME]->(t)
                    """,
                    {"dest_id": dest_id, "theme_id": theme_id}
                )

                for call in theme_obj.get("calls", []):
                    raw_call_id = call.get("call_id")
                    call_id = f"cluster4_call_{raw_call_id}"
                    self.run_query(
                        """
                        MERGE (c:Call {id: $id})
                        SET c.title = $title,
                            c.type = $type,
                            c.section = $section,
                            c.trl = $trl,
                            c.budget = $budget,
                            c.expected_contribution = $contribution,
                            c.expected_outcome = $outcome,
                            c.scope = $scope,
                            c.source = 'cluster_4'
                        """,
                        {
                            "id": call_id,
                            "title": call.get("call_title"),
                            "type": call.get("call_type"),
                            "section": call.get("call_section"),
                            "trl": call.get("technology_readiness_level"),
                            "budget": call.get("indicative_budget"),
                            "contribution": call.get("expected_eu_contribution"),
                            "outcome": call.get("expected_outcome"),
                            "scope": call.get("scope")
                        }
                    )
                    self.run_query(
                        """
                        MATCH (t:Theme {id: $theme_id}), (c:Call {id: $call_id})
                        MERGE (t)-[:HAS_CALL]->(c)
                        """,
                        {"theme_id": theme_id, "call_id": call_id}
                    )

if __name__ == "__main__":
    builder = ClusterGraphBuilder()
    builder.create_graph_from_file("routes/pipeline/output_files/nested_parsed_call_tables.json")
