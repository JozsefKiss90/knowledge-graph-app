"""
Load and index Horizon Europe call metadata for RAG search.
Builds flat, searchable documents from the raw JSON at startup.
"""

import json
import re
from html.parser import HTMLParser
from pathlib import Path
from typing import List, Optional

# ── HTML stripper ──────────────────────────────────────────────

class _HTMLStripper(HTMLParser):
    def __init__(self):
        super().__init__()
        self._parts = []

    def handle_data(self, data):
        self._parts.append(data)

    def get_text(self):
        return " ".join(self._parts)


def strip_html(html: str) -> str:
    if not html:
        return ""
    s = _HTMLStripper()
    s.feed(html)
    text = s.get_text()
    # collapse whitespace
    return re.sub(r"\s+", " ", text).strip()


# ── Action-type normaliser ─────────────────────────────────────

_ACTION_SHORT = {
    "research and innovation": "RIA",
    "coordination and support": "CSA",
    "innovation actions": "IA",
    "pre-commercial procurement": "PCP",
    "cofund": "Cofund",
    "public procurement of innovative": "PPI",
}


def _normalise_action(raw: str) -> str:
    lower = raw.lower()
    for fragment, short in _ACTION_SHORT.items():
        if fragment in lower:
            return short
    return raw.strip()


# ── Budget parser ──────────────────────────────────────────────

def _parse_budget(budget_json_str: str, identifier: str) -> Optional[dict]:
    """Extract budget info relevant to this specific call identifier."""
    if not budget_json_str:
        return None
    try:
        data = json.loads(budget_json_str)
    except (json.JSONDecodeError, TypeError):
        return None

    topic_map = data.get("budgetTopicActionMap", {})
    for _group_id, actions in topic_map.items():
        for action in actions:
            action_label = action.get("action", "")
            if identifier in action_label:
                budget_years = action.get("budgetYearMap", {})
                total = sum(int(v) for v in budget_years.values())
                return {
                    "total_eur": total,
                    "expected_grants": action.get("expectedGrants"),
                    "min_per_grant": action.get("minContribution"),
                    "max_per_grant": action.get("maxContribution"),
                    "years": budget_years,
                }
    return None


# ── Build index ────────────────────────────────────────────────

_METADATA_PATH = (
    Path(__file__).resolve().parent.parent
    / "routes" / "new_pipeline" / "output_files"
    / "fetched_call_metadata_2026_2027.json"
)


def _first(lst, default=""):
    """Return first element of a list or default."""
    if isinstance(lst, list) and lst:
        return lst[0]
    return default


def _build_document(record: dict) -> dict:
    identifier = record.get("identifier", "")
    md = record.get("raw", {}).get("metadata", {})

    title = _first(md.get("title")) or record.get("summary", "")
    summary = record.get("summary", "")
    keywords = md.get("keywords", [])
    tags = md.get("tags", [])
    description_html = _first(md.get("descriptionByte"))
    description_text = strip_html(description_html)
    deadline_raw = _first(md.get("deadlineDate"))
    deadline = deadline_raw[:10] if deadline_raw else ""
    year = deadline[:4] if deadline else ""
    action_full = _first(md.get("typesOfAction"))
    action_type = _normalise_action(action_full) if action_full else ""
    budget = _parse_budget(_first(md.get("budgetOverview")), identifier)
    call_identifier = _first(md.get("callIdentifier"))
    call_title = _first(md.get("callTitle"))
    cross_cutting = md.get("crossCuttingPriorities", [])
    url = record.get("url", "")

    # Build concatenated search text (lowercased)
    search_parts = [
        identifier, title, summary,
        " ".join(keywords), " ".join(tags),
        description_text,
        action_type, action_full or "",
        call_title or "",
        " ".join(cross_cutting),
    ]
    search_text = " ".join(search_parts).lower()

    return {
        "identifier": identifier,
        "title": title,
        "summary": summary,
        "keywords": keywords,
        "tags": tags,
        "description_text": description_text,
        "description_html": description_html,
        "deadline": deadline,
        "year": year,
        "action_type": action_type,
        "action_type_full": action_full or "",
        "budget": budget,
        "call_identifier": call_identifier,
        "call_title": call_title or "",
        "cross_cutting": cross_cutting,
        "url": url,
        "search_text": search_text,
    }


def load_index() -> List[dict]:
    """Load the metadata JSON and return a list of search documents."""
    with open(_METADATA_PATH, "r", encoding="utf-8") as f:
        raw_records = json.load(f)
    return [_build_document(r) for r in raw_records]


# Module-level index — loaded once on first import
call_index: List[dict] = load_index()
