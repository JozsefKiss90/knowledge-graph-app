# cl2_cluster_builder_v2.py
"""
Builder for Cluster 2 (Culture, Creativity and Inclusive Society) using the *new* grouped JSONs.

Inputs:
- grouped_calls_path: JSON list of {"destination": str, "calls": [call_obj, ...]}
- destination_summaries_path: JSON map { "<cluster or destination name>": {"summary": "..."} }
    e.g. keys like "Cluster 2 - Culture, Creativity and Inclusive Society" and
    "Innovative Research on Democracy and Governance (2025)".

Creates in Neo4j:
(:Cluster {id, name, source, type, summary})
(:Destination {id, name, source, type, summary})
(:Call {id, name, source, type, ...})
Relationships:
(Cluster)-[:HAS_DESTINATION]->(Destination)
(Destination)-[:HAS_CALL]->(Call)

Usage (CLI):
python cl2_cluster_builder_v2.py --grouped /path/cluster_CL2.json --summaries /path/destination_summaries_cl2.json

You can also import ClusterGraphBuilderCL2v2 and call .create_graph_from_files(...).
"""
import argparse
import json
import re

try:
    from database import db
except Exception:
    class _DummyDB:
        def query(self, q, p=None):
            # Offline preview fallback: do nothing
            pass
    db = _DummyDB()

SOURCE_TAG = "cluster_2"
CLUSTER_ID = "CL2"
CLUSTER_NAME = "Cluster 2 - Culture, Creativity and Inclusive Society"

def slugify(text: str) -> str:
    text = re.sub(r'\s+', ' ', (text or "").strip())
    # Keep alnum and a few safe chars, turn spaces to dashes
    text = re.sub(r'[^a-zA-Z0-9\-._() ]+', '', text)
    return re.sub(r'[ ]+', '-', text).lower()

class ClusterGraphBuilderCL2v2:
    def __init__(self, preview: bool = False):
        self.preview = preview

    def run_query(self, query, parameters=None):
        if self.preview:
            print("CY: ", query.strip().replace("\n", " ")[:350], "...")
            print("PA: ", {k: (str(v)[:120] + "…" if isinstance(v, str) and len(v) > 120 else v) for k, v in (parameters or {}).items()})
            return
        db.query(query, parameters or {})

    def _get_summary(self, summaries, key: str) -> str:
        if key in summaries and isinstance(summaries[key], dict):
            return summaries[key].get("summary", "") or ""
        # try to strip a trailing " (YYYY)"
        m = re.match(r"^(.*)\s+\(\d{4}\)$", key or "")
        if m:
            k2 = m.group(1)
            if k2 in summaries and isinstance(summaries[k2], dict):
                return summaries[k2].get("summary", "") or ""
        return ""

    def create_graph_from_files(self, grouped_calls_path: str, destination_summaries_path: str):
        with open(grouped_calls_path, "r", encoding="utf-8") as f:
            grouped = json.load(f)
        with open(destination_summaries_path, "r", encoding="utf-8") as f:
            summaries = json.load(f)

        cluster_summary = self._get_summary(summaries, CLUSTER_NAME)

        # --- MERGE Cluster node
        self.run_query(
            """
            MERGE (c:Cluster {id: $id})
            SET c.name = $name,
                c.source = $source,
                c.type = 'Cluster',
                c.summary = $summary
            """,
            {"id": CLUSTER_ID, "name": CLUSTER_NAME, "source": SOURCE_TAG, "summary": cluster_summary}
        )

        for dest in grouped:
            dest_name = dest.get("destination") or "_unknown_destination"
            dest_id = f"{CLUSTER_ID}:{slugify(dest_name)}"
            dest_summary = self._get_summary(summaries, dest_name)

            # Destination
            self.run_query(
                """
                MERGE (d:Destination {id: $id})
                SET d.name = $name,
                    d.source = $source,
                    d.type = 'Destination',
                    d.summary = $summary
                """,
                {"id": dest_id, "name": dest_name, "source": SOURCE_TAG, "summary": dest_summary}
            )

            # Link Cluster -> Destination
            self.run_query(
                """
                MATCH (c:Cluster {id: $cluster_id}), (d:Destination {id: $dest_id})
                MERGE (c)-[:HAS_DESTINATION]->(d)
                """,
                {"cluster_id": CLUSTER_ID, "dest_id": dest_id}
            )

            # Calls
            for call in dest.get("calls", []):
                call_id = call.get("call_id")
                if not call_id:
                    continue
                props = {
                    "id": call_id,
                    "name": call.get("call_title") or "",
                    "source": SOURCE_TAG,
                    "type": "Call",
                    "call_type": call.get("call_type") or "",
                    "call_section": call.get("call_section") or "",
                    "min_contribution": call.get("min__contribution") or call.get("min_contribution"),
                    "max_contribution": call.get("max_contribution"),
                    "expected_eu_contribution": call.get("expected_eu_contribution") or "",
                    "indicative_budget": call.get("indicative_budget"),
                    "type_of_action": call.get("type_of_action") or "",
                    "expected_outcome": call.get("expected_outcome") or "",
                    "scope": call.get("scope") or "",
                    "funding_link": call.get("funding_link") or "",
                    "opening_date": call.get("opening_date") or "",
                    "deadline": call.get("deadline") or "",
                    "deadline_model": call.get("deadline_model") or "",
                    "status": call.get("status") or "",
                    "max_funded_projects": call.get("max_funded_projects"),
                }

                self.run_query(
                    """
                    MERGE (c:Call {id: $id})
                    SET  c.name = $name,
                         c.source = $source,
                         c.type = $type,
                         c.call_type = $call_type,
                         c.call_section = $call_section,
                         c.min_contribution = $min_contribution,
                         c.max_contribution = $max_contribution,
                         c.expected_eu_contribution = $expected_eu_contribution,
                         c.indicative_budget = $indicative_budget,
                         c.type_of_action = $type_of_action,
                         c.expected_outcome = $expected_outcome,
                         c.scope = $scope,
                         c.funding_link = $funding_link,
                         c.opening_date = $opening_date,
                         c.deadline = $deadline,
                         c.deadline_model = $deadline_model,
                         c.status = $status,
                         c.max_funded_projects = $max_funded_projects
                    """,
                    props
                )

                # Destination -> Call
                self.run_query(
                    """
                    MATCH (d:Destination {id: $dest_id}), (c:Call {id: $call_id})
                    MERGE (d)-[:HAS_CALL]->(c)
                    """,
                    {"dest_id": dest_id, "call_id": call_id}
                )

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--grouped", required=True, help="Path to cluster_CL2.json (grouped by destination)")
    ap.add_argument("--summaries", required=True, help="Path to destination_summaries_cl2.json")
    ap.add_argument("--preview", action="store_true", help="Print queries instead of executing them")
    args = ap.parse_args()

    builder = ClusterGraphBuilderCL2v2(preview=args.preview)
    builder.create_graph_from_files(args.grouped, args.summaries)

if __name__ == "__main__":
    main()
