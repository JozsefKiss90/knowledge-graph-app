from __future__ import annotations
from abc import ABC, abstractmethod
import json, os, re
from typing import Dict, Any

try:
    from database import db
except Exception:
    class _DummyDB:
        def query(self, q, p=None): pass
    db = _DummyDB()

def _slugify(text: str) -> str:
    text = re.sub(r"\s+", " ", (text or "").strip())
    text = re.sub(r"[^a-zA-Z0-9\-._() ]+", "", text)
    return re.sub(r"[ ]+", "-", text).lower()

class BaseClusterBuilder(ABC):
    """Abstract builder for all Horizon clusters (CL2/3/4/5/...)."""

    @property
    @abstractmethod
    def cluster_id(self) -> str: ...           # e.g. "CL3"
    @property
    @abstractmethod
    def cluster_name(self) -> str: ...         # UI label
    @property
    @abstractmethod
    def source_tag(self) -> str: ...           # e.g. "cluster_3"

    def __init__(self, preview: bool = False):
        self.preview = preview

    # ---- infra ----
    def _run(self, query: str, params: Dict[str, Any] | None = None):
        if self.preview:
            return
        db.query(query, params or {})

    def _get_summary(self, summaries: Dict[str, Any], key: str) -> str:
        if key in summaries and isinstance(summaries[key], dict):
            return summaries[key].get("summary", "") or ""
        m = re.match(r"^(.*)\s+\(\d{4}\)$", key or "")
        if m:
            base = m.group(1)
            if base in summaries and isinstance(summaries[base], dict):
                return summaries[base].get("summary", "") or ""
        return ""

    # ---- main API ----
    def create_graph_from_files(self, grouped_calls_path: str, destination_summaries_path: str):
        if not os.path.exists(grouped_calls_path):
            raise FileNotFoundError(f"Grouped file not found: {grouped_calls_path}")
        if not os.path.exists(destination_summaries_path):
            raise FileNotFoundError(f"Summary file not found: {destination_summaries_path}")
        print(destination_summaries_path)
        grouped = json.load(open(grouped_calls_path, "r", encoding="utf-8"))
        summaries = json.load(open(destination_summaries_path, "r", encoding="utf-8"))

        # cluster node
        cluster_summary = self._get_summary(summaries, self.cluster_name)
        self._run(
            """
            MERGE (c:Cluster {id: $id})
            SET c.name=$name, c.source=$source, c.type='Cluster', c.summary=$summary
            """,
            {"id": self.cluster_id, "name": self.cluster_name, "source": self.source_tag, "summary": cluster_summary},
        )

        # destinations + calls
        for dest in grouped:
            dest_name = dest.get("destination") or "_unknown_destination"
            dest_id = f"{self.cluster_id}:{_slugify(dest_name)}"
            dest_summary = self._get_summary(summaries, dest_name)

            self._run(
                """
                MERGE (d:Destination {id: $id})
                SET d.name=$name, d.source=$source, d.type='Destination', d.summary=$summary
                """,
                {"id": dest_id, "name": dest_name, "source": self.source_tag, "summary": dest_summary},
            )

            self._run(
                "MATCH (c:Cluster {id:$cid}),(d:Destination {id:$did}) MERGE (c)-[:HAS_DESTINATION]->(d)",
                {"cid": self.cluster_id, "did": dest_id},
            )

            for call in dest.get("calls", []):
                call_id = call.get("call_id")
                if not call_id:
                    continue
                props = {
                    "id": call_id,
                    "name": call.get("call_title") or "",
                    "source": self.source_tag,
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

                self._run(
                    """
                    MERGE (c:Call {id:$id})
                    SET  c.name=$name, c.source=$source, c.type=$type,
                         c.call_type=$call_type, c.call_section=$call_section,
                         c.min_contribution=$min_contribution, c.max_contribution=$max_contribution,
                         c.expected_eu_contribution=$expected_eu_contribution,
                         c.indicative_budget=$indicative_budget, c.type_of_action=$type_of_action,
                         c.expected_outcome=$expected_outcome, c.scope=$scope,
                         c.funding_link=$funding_link, c.opening_date=$opening_date,
                         c.deadline=$deadline, c.deadline_model=$deadline_model,
                         c.status=$status, c.max_funded_projects=$max_funded_projects
                    """,
                    props,
                )

                self._run(
                    "MATCH (d:Destination {id:$did}),(c:Call {id:$cid}) MERGE (d)-[:HAS_CALL]->(c)",
                    {"did": dest_id, "cid": call_id},
                )
