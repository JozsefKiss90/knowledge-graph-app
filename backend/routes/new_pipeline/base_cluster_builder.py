# backend/routes/new_pipleline/base_cluster_builder.py
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
    """Abstract builder for all Horizon clusters (CL1/3/4/5/6...)."""

    @property
    @abstractmethod
    def cluster_id(self) -> str: ...           # e.g. "CL3"
    @property
    @abstractmethod
    def cluster_name(self) -> str: ...         # UI label (must match summaries top-level key)
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
        # direct match at top level
        if key in summaries and isinstance(summaries[key], dict):
            return summaries[key].get("summary", "") or ""

        # nested under cluster key (most of your files)
        cluster_block = summaries.get(self.cluster_name)
        if isinstance(cluster_block, dict):
            if key in cluster_block and isinstance(cluster_block[key], dict):
                return cluster_block[key].get("summary", "") or ""

        # also try stripping a trailing (YYYY), for both levels
        m = re.match(r"^(.*)\s+\(\d{4}\)$", key or "")
        if m:
            base = m.group(1)
            if base in summaries and isinstance(summaries[base], dict):
                return summaries[base].get("summary", "") or ""
            if isinstance(cluster_block, dict) and base in cluster_block and isinstance(cluster_block[base], dict):
                return cluster_block[base].get("summary", "") or ""

        return ""


    # ---- main API ----
    def create_graph_from_files(self, grouped_calls_path: str, destination_summaries_path: str):
        if not os.path.exists(grouped_calls_path):
            raise FileNotFoundError(f"Grouped file not found: {grouped_calls_path}")
        if not os.path.exists(destination_summaries_path):
            raise FileNotFoundError(f"Summary file not found: {destination_summaries_path}")

        grouped = json.load(open(grouped_calls_path, "r", encoding="utf-8"))
        summaries = json.load(open(destination_summaries_path, "r", encoding="utf-8"))

        grouped_raw = json.load(open(grouped_calls_path, "r", encoding="utf-8"))

        # Normalize to a list of destination dicts
        if isinstance(grouped_raw, dict) and "destinations" in grouped_raw:
            destinations = grouped_raw.get("destinations") or []
        elif isinstance(grouped_raw, list):
            destinations = grouped_raw
        else:
            raise ValueError("Unrecognized grouped file structure: expected list or {'destinations': [...]}")

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
        for dest in destinations:
            dest_name = ( (dest.get("destination") or dest.get("destination_title") or "").strip() or "_unknown_destination" )
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

            for call in (dest.get("calls") or []):
                call_id = call.get("call_id")
                if not call_id:
                    continue

                # Optional fields from current/next parser versions (defaults keep them harmless)
                props = {
                    # core identity
                    "id": call_id,
                    "name": call.get("call_title") or "",
                    "source": self.source_tag,
                    "type": "Call",

                    # meta / taxonomy (optional now, can be populated later)
                    "call_type": call.get("call_type") or "",
                    "call_section": call.get("call_section") or "",

                    # funding & amounts
                    "min_contribution": call.get("min__contribution") or call.get("min_contribution"),
                    "max_contribution": call.get("max_contribution"),
                    "expected_eu_contribution": call.get("expected_eu_contribution") or "",
                    "indicative_budget": call.get("indicative_budget"),
                    "indicative_number_of_projects": call.get("indicative_number_of_projects"),

                    # actions & text blobs
                    "type_of_action": call.get("type_of_action") or "",
                    "expected_outcome": call.get("expected_outcome") or "",
                    "scope": call.get("scope") or "",

                    # annex-style text blobs (optional)
                    "admissibility_conditions": call.get("admissibility_conditions") or "",
                    "eligibility_conditions": call.get("eligibility_conditions") or "",
                    "technology_readiness_level": call.get("technology_readiness_level") or "",
                    "procedure": call.get("procedure") or "",
                    "legal_and_financial_setup": call.get("legal_and_financial_setup") or "",
                    "exceptional_page_limits": call.get("exceptional_page_limits") or "",

                    # timing / lifecycle (optional)
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
                         c.indicative_budget=$indicative_budget, c.indicative_number_of_projects=$indicative_number_of_projects,
                         c.type_of_action=$type_of_action,
                         c.expected_outcome=$expected_outcome, c.scope=$scope,
                         c.admissibility_conditions=$admissibility_conditions,
                         c.eligibility_conditions=$eligibility_conditions,
                         c.technology_readiness_level=$technology_readiness_level,
                         c.procedure=$procedure,
                         c.legal_and_financial_setup=$legal_and_financial_setup,
                         c.exceptional_page_limits=$exceptional_page_limits,
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