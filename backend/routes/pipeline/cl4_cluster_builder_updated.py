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

        # Load external summaries for destinations and themes
        summaries = {}
        try:
            with open("routes/pipeline/output_files/destination_and_theme_summaries_corrected.json", "r", encoding="utf-8") as f:
                for item in json.load(f):
                    summaries[item["id"]] = item["summary"]
        except FileNotFoundError:
            pass

        # Root node
        root_id = "cluster_4"
        root_summary = summaries.get(root_id, "")
        self.run_query(
            """
            MERGE (c:Cluster {id: $id})
            SET c.name = "Cluster 4 - Digital, Industry and Space",
                c.source = 'cluster_4',
                c.type = 'Work Programme',
                c.summary = $summary
            """,
            {"id": root_id, "summary": root_summary}
        )

        for d in data:
            dest_id = f"cluster4_destination_{d['destination']}"
            dest_summary = summaries.get(d["destination"], "")
            self.run_query(
                """
                MERGE (d:Destination {id: $id})
                SET d.name = $name,
                    d.source = 'cluster_4',
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

            for theme_obj in d.get("themes", []):
                theme_id = f"cluster4_theme_{theme_obj['theme']}"
                theme_summary = summaries.get(theme_obj["theme"], "")
                self.run_query(
                    """
                    MERGE (t:Theme {id: $id})
                    SET t.name = $name,
                        t.source = 'cluster_4',
                        t.type = 'Theme',
                        t.summary = $summary
                    """,
                    {"id": theme_id, "name": theme_obj["theme"], "summary": theme_summary}
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
                            c.funding_link = $funding_link,
                            c.max_funded_projects = $max_funded_projects,
                            c.opening_date = $opening_date,
                            c.deadline = $deadline,
                            c.source = 'cluster_4',
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
                            "destination": d.get("destination", ""),
                            "funding_link": call.get("funding_link", ""),
                            "max_funded_projects": call.get("max_funded_projects", ""),
                            "opening_date": call.get("opening_date", ""),
                            "deadline": call.get("deadline", "")
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
                        MATCH (t:Theme {id: $theme_id}), (c:Call {id: $call_id})
                        MERGE (t)-[:HAS_CALL]->(c)
                        """,
                        {"theme_id": theme_id, "call_id": call_id}
                    )

if __name__ == "__main__":
    builder = ClusterGraphBuilder()
    builder.create_graph_from_file("routes/pipeline/output_files/nested_parsed_call_tables_with_deadlines_inserted.json")
