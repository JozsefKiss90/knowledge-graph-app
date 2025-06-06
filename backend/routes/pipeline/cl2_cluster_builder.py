# cl2_cluster_builder.py
import json
from database import db

class ClusterGraphBuilderCL2:
    def __init__(self):
        self.db = db

    def run_query(self, query, parameters=None):
        self.db.query(query, parameters or {})

    def create_graph_from_file(self, nested_json_path):
        with open(nested_json_path, "r", encoding="utf-8") as f:
            data = json.load(f)

        # Load external destination summaries
        summaries = {}
        try:
            with open("routes/pipeline/output_files/destination_summaries_cl2.json", "r", encoding="utf-8") as f:
                summaries_data = json.load(f)
                for key, value in summaries_data.items():
                    summaries[key] = value["summary"]
        except FileNotFoundError:
            pass

        root_id = "cluster_2"
        root_summary = summaries.get("Cluster 2 - Culture, Creativity and Inclusive Society", "")
        self.run_query(
            """
            MERGE (c:Cluster {id: $id})
            SET c.name = "Cluster 2 - Culture, Creativity and Inclusive Society",
                c.source = 'cluster_2',
                c.type = 'Work Programme',
                c.summary = $summary
            """,
            {"id": root_id, "summary": root_summary}
        )


        for d in data:
            dest_id = f"cluster2_destination_{d['destination']}"
            dest_summary = summaries.get(d["destination"], "")
            self.run_query(
                """
                MERGE (d:Destination {id: $id})
                SET d.name = $name,
                    d.source = 'cluster_2',
                    d.type = 'Destination',
                    d.summary = $summary
                """,
                {"id": dest_id, "name": d["destination"], "summary": dest_summary}
            )

            self.run_query(
                """
                MATCH (c:Cluster {id: $cluster_id}), (d:Destination {id: $dest_id})
                MERGE (c)-[:HAS_DESTINATION]->(d)
                """,
                {"cluster_id": root_id, "dest_id": dest_id}
            )

            for call in d.get("calls", []):
                raw_call_id = call.get("call_id")
                call_id = f"cluster2_call_{raw_call_id}"
                self.run_query(
                    """
                    MERGE (c:Call {id: $id})
                    SET c.name = $call_title,
                        c.call_id = $call_id,
                        c.call_type = $call_type,
                        c.call_section = $call_section,
                        c.expected_eu_contribution = $expected_eu_contribution,
                        c.indicative_budget = $indicative_budget,
                        c.type_of_action = $type_of_action,
                        c.admissibility_conditions = $admissibility_conditions,
                        c.eligibility_conditions = $eligibility_conditions,
                        c.technology_readiness_level = $technology_readiness_level,
                        c.procedure = $procedure,
                        c.legal_and_financial_setup = $legal_and_financial_setup,
                        c.exceptional_page_limits = $exceptional_page_limits,
                        c.expected_outcome = $expected_outcome,
                        c.scope = $scope,
                        c.destination = $destination,
                        c.source = 'cluster_2',
                        c.type = 'Call'
                    """,
                    {
                        "id": call_id,
                        "call_title": call.get("call_title", ""),
                        "call_id": call.get("call_id", ""),
                        "call_type": call.get("call_type", ""),
                        "call_section": call.get("call_section", ""),
                        "expected_eu_contribution": call.get("expected_eu_contribution", ""),
                        "indicative_budget": call.get("indicative_budget", ""),
                        "type_of_action": call.get("type_of_action", ""),
                        "admissibility_conditions": call.get("admissibility_conditions", ""),
                        "eligibility_conditions": call.get("eligibility_conditions", ""),
                        "technology_readiness_level": call.get("technology_readiness_level", ""),
                        "procedure": call.get("procedure", ""),
                        "legal_and_financial_setup": call.get("legal_and_financial_setup", ""),
                        "exceptional_page_limits": call.get("exceptional_page_limits", ""),
                        "expected_outcome": call.get("expected_outcome", ""),
                        "scope": call.get("scope", ""),
                        "destination": d.get("destination", "")
                    }
                )

                self.run_query(
                    """
                    MATCH (c:Call {id: $call_id}), (d:Destination {id: $dest_id})
                    MERGE (c)-[:BELONGS_TO_DESTINATION]->(d)
                    """,
                    {"call_id": call_id, "dest_id": dest_id}
                )

                self.run_query(
                    """
                    MATCH (d:Destination {id: $dest_id}), (c:Call {id: $call_id})
                    MERGE (d)-[:HAS_CALL]->(c)
                    """,
                    {"call_id": call_id, "dest_id": dest_id}
                )

if __name__ == "__main__":
    builder = ClusterGraphBuilderCL2()
    builder.create_graph_from_file("routes/pipeline/output_files/nested_parsed_cl2_call_tables.json")
