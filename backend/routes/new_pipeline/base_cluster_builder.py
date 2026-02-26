from __future__ import annotations
from abc import ABC, abstractmethod
import json, os, re
from typing import Dict, Any, Optional, List

try:
    from database import db
except Exception:
    class _DummyDB:
        def query(self, q, p=None):  # pragma: no cover
            pass
    db = _DummyDB()


def _slugify(text: str) -> str:
    text = re.sub(r"\s+", " ", (text or "").strip())
    text = re.sub(r"[^a-zA-Z0-9\-._() ]+", "", text)
    return re.sub(r"[ ]+", "-", text).lower()


def _as_list_of_str(v: Any) -> List[str]:
    if isinstance(v, list):
        return [str(x) for x in v if x is not None and str(x).strip() != ""]
    if v is None:
        return []
    s = str(v).strip()
    return [s] if s else []


def _neo4j_value(v: Any) -> Any:
    """
    Neo4j properties must be primitive or arrays of primitives.
    - dict -> JSON string
    - list -> list of primitive-safe values (dict/list items -> JSON string)
    """
    if v is None:
        return None
    if isinstance(v, (str, int, float, bool)):
        return v
    if isinstance(v, dict):
        # store structured data as JSON string
        try:
            return json.dumps(v, ensure_ascii=False, sort_keys=True)
        except Exception:
            return str(v)
    if isinstance(v, list):
        out: List[Any] = []
        for item in v:
            if item is None:
                continue
            if isinstance(item, (str, int, float, bool)):
                out.append(item)
            elif isinstance(item, (dict, list)):
                try:
                    out.append(json.dumps(item, ensure_ascii=False, sort_keys=True))
                except Exception:
                    out.append(str(item))
            else:
                out.append(str(item))
        return out
    # fallback for any other object type
    return str(v)


def _sanitize_props(props: Dict[str, Any]) -> Dict[str, Any]:
    return {k: _neo4j_value(v) for k, v in props.items()}


class BaseClusterBuilder(ABC):
    """Abstract builder for all Horizon clusters (CL1/2/3/4/5/6...)."""

    @property
    @abstractmethod
    def cluster_id(self) -> str: ...          # e.g. "CL2"
    @property
    @abstractmethod
    def cluster_name(self) -> str: ...        # UI label (must match summaries top-level key)
    @property
    @abstractmethod
    def source_tag(self) -> str: ...          # e.g. "cluster_2"

    def __init__(self, preview: bool = False):
        self.preview = preview

    # ---- infra ----
    def _run(self, query: str, params: Dict[str, Any] | None = None):
        if self.preview:
            return
        db.query(query, params or {})

    def _get_summary(self, summaries: Dict[str, Any], key: str) -> str:
        key = (key or "").strip()
        if not key:
            return ""

        # 1) direct match at top level
        if key in summaries and isinstance(summaries[key], dict):
            return summaries[key].get("summary", "") or ""

        # 2) pick cluster block
        cluster_block = summaries.get(self.cluster_name)

        if not isinstance(cluster_block, dict):
            # Heuristic: if summaries has exactly one top-level dict block, use it.
            dict_blocks = [v for v in summaries.values() if isinstance(v, dict)]
            if len(dict_blocks) == 1:
                cluster_block = dict_blocks[0]
            else:
                # Try to find a block whose key mentions the cluster id/name
                # e.g. "Civil Security for Society (Cluster 3)"
                needle = (self.cluster_id or "").lower()
                for k, v in summaries.items():
                    if isinstance(v, dict):
                        kk = str(k).lower()
                        if needle and (needle in kk or f"cluster {needle[-1:]}" in kk):
                            cluster_block = v
                            break

        # helper to query either top-level or cluster block
        def _lookup(k: str) -> str:
            if k in summaries and isinstance(summaries[k], dict):
                return summaries[k].get("summary", "") or ""
            if isinstance(cluster_block, dict) and k in cluster_block and isinstance(cluster_block[k], dict):
                return cluster_block[k].get("summary", "") or ""
            return ""

        # 3) direct in cluster block
        s = _lookup(key)
        if s:
            return s

        # 4) destination prefix variant (your CL3/CL4 summary files)
        s = _lookup(f"Destination - {key}")
        if s:
            return s

        # 5) strip trailing years / ranges: Foo (2026), Foo (2026-27), Foo (2026-2027)
        m = re.match(r"^(.*)\s+\((\d{4})(?:\s*[-–]\s*(\d{2}|\d{4}))\)$", key)
        if m:
            base = m.group(1).strip()
            return _lookup(base) or _lookup(f"Destination - {base}") or ""

        m = re.match(r"^(.*)\s+\(\d{4}\)$", key)
        if m:
            base = m.group(1).strip()
            return _lookup(base) or _lookup(f"Destination - {base}") or ""

        return ""
    def _resolve_call_id(self, call: Dict[str, Any]) -> Optional[str]:
        """
        New grouped JSONs no longer use `call_id`; they use `identifier` / `topic_id`.
        Keep backward compatibility by checking multiple keys.
        """
        for k in ("call_id", "identifier", "topic_id", "topic_id_from_budget", "unique_key"):
            v = call.get(k)
            if isinstance(v, str) and v.strip():
                return v.strip()
        return None

    # ---- main API ----
    def create_graph_from_files(self, grouped_calls_path: str, destination_summaries_path: str):
        if not os.path.exists(grouped_calls_path):
            raise FileNotFoundError(f"Grouped file not found: {grouped_calls_path}")
        if not os.path.exists(destination_summaries_path):
            raise FileNotFoundError(f"Summary file not found: {destination_summaries_path}")

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
            dest_name = ((dest.get("destination") or dest.get("destination_title") or "").strip() or "_unknown_destination")
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
                call_id = self._resolve_call_id(call)
                if not call_id:
                    continue

                # deadlines: [string] (new) + deadline: string (legacy/single)
                deadlines = _as_list_of_str(call.get("deadlines"))
                deadline_single = (call.get("deadline") or (deadlines[0] if deadlines else "") or "")
                if deadline_single and not deadlines:
                    deadlines = [str(deadline_single)]

                # IMPORTANT: Neo4j cannot store dict properties -> store as JSON string
                budget_year_map = call.get("budget_year_map")
                budget_year_map_json = ""
                if isinstance(budget_year_map, dict) and budget_year_map:
                    budget_year_map_json = json.dumps(budget_year_map, ensure_ascii=False, sort_keys=True)

                props: Dict[str, Any] = {
                    # core identity
                    "id": call_id,
                    "name": call.get("topic_title") or call.get("call_title") or "",
                    "source": self.source_tag,
                    "type": "Call",

                    # identity / navigation
                    "identifier": call.get("identifier") or "",
                    "topic_id": call.get("topic_id") or "",
                    "topic_title": call.get("topic_title") or "",
                    "call_title": call.get("call_title") or "",
                    "call_identifier": call.get("call_identifier") or "",
                    "url": call.get("url") or "",

                    # grouping / misc
                    "programme": call.get("programme") or "",
                    "group_value": call.get("group_value") or "",
                    "unique_key": call.get("unique_key") or "",

                    # funding & amounts
                    "min_contribution": call.get("min_contribution"),
                    "max_contribution": call.get("max_contribution"),
                    "indicative_budget": call.get("indicative_budget"),
                    "indicative_number_of_projects": call.get("indicative_number_of_projects"),

                    # action + narrative
                    "type_of_action": call.get("type_of_action") or "",
                    "expected_outcome": call.get("expected_outcome") or "",
                    "scope": call.get("scope") or "",

                    # conditions / process (new set)
                    "admissibility_conditions": call.get("admissibility_conditions") or "",
                    "eligible_countries": call.get("eligible_countries") or "",
                    "other_eligibility_conditions": call.get("other_eligibility_conditions") or "",
                    "financial_and_operational_capacity": call.get("financial_and_operational_capacity") or "",
                    "submission_and_evaluation_process": call.get("submission_and_evaluation_process") or "",

                    # award criteria (new)
                    "award_criteria_scoring_thresholds": call.get("award_criteria_scoring_thresholds") or "",

                    # timing / lifecycle
                    "indicative_timeline": call.get("indicative_timeline") or "",
                    "opening_date": call.get("opening_date") or "",
                    "deadline": deadline_single,
                    "deadlines": deadlines,
                    "deadline_model": call.get("deadline_model") or "",

                    # legal + page limits
                    "legal_and_financial_setup": call.get("legal_and_financial_setup") or "",
                    "proposal_page_limits_mentions": call.get("proposal_page_limits_mentions") or "",

                    # budget traceability (store JSON string, not dict)
                    "budget_year_map": budget_year_map_json,
                    "topic_id_from_budget": call.get("topic_id_from_budget") or "",
                }

                props = _sanitize_props(props)

                self._run(
                    """
                    MERGE (c:Call {id:$id})
                    SET  c.name=$name,
                         c.source=$source,
                         c.type=$type,

                         c.identifier=$identifier,
                         c.topic_id=$topic_id,
                         c.topic_title=$topic_title,
                         c.call_title=$call_title,
                         c.call_identifier=$call_identifier,
                         c.url=$url,

                         c.programme=$programme,
                         c.group_value=$group_value,
                         c.unique_key=$unique_key,

                         c.min_contribution=$min_contribution,
                         c.max_contribution=$max_contribution,
                         c.indicative_budget=$indicative_budget,
                         c.indicative_number_of_projects=$indicative_number_of_projects,

                         c.type_of_action=$type_of_action,
                         c.expected_outcome=$expected_outcome,
                         c.scope=$scope,

                         c.admissibility_conditions=$admissibility_conditions,
                         c.eligible_countries=$eligible_countries,
                         c.other_eligibility_conditions=$other_eligibility_conditions,
                         c.financial_and_operational_capacity=$financial_and_operational_capacity,
                         c.submission_and_evaluation_process=$submission_and_evaluation_process,

                         c.award_criteria_scoring_thresholds=$award_criteria_scoring_thresholds,

                         c.indicative_timeline=$indicative_timeline,
                         c.opening_date=$opening_date,
                         c.deadline=$deadline,
                         c.deadlines=$deadlines,
                         c.deadline_model=$deadline_model,

                         c.legal_and_financial_setup=$legal_and_financial_setup,
                         c.proposal_page_limits_mentions=$proposal_page_limits_mentions,

                         c.budget_year_map=$budget_year_map,
                         c.topic_id_from_budget=$topic_id_from_budget
                    """,
                    props,
                )

                self._run(
                    "MATCH (d:Destination {id:$did}),(c:Call {id:$cid}) MERGE (d)-[:HAS_CALL]->(c)",
                    {"did": dest_id, "cid": call_id},
                )
