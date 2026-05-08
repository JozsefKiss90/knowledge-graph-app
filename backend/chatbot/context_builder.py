"""
Build compact LLM context from matched call documents.
"""

import re
from typing import List, Optional

# ── Section-aware query detection ─────────────────────────────

_SECTION_HINTS = {
    "outcome": "Expected Outcome:",
    "expected outcome": "Expected Outcome:",
    "scope": "Scope:",
    "budget": None,  # handled separately via budget field
    "funding": None,
    "deadline": None,
    "conditions": "General conditions",
}


def _detect_focus(question: str) -> Optional[str]:
    lower = question.lower()
    for hint_key, section_label in _SECTION_HINTS.items():
        if hint_key in lower:
            return hint_key
    return None


# ── Description truncation ────────────────────────────────────

def _extract_section(description: str, section_marker: str, max_chars: int = 1200) -> str:
    """Extract a specific section from the description text."""
    idx = description.find(section_marker)
    if idx == -1:
        return description[:max_chars]
    section = description[idx:]
    # Try to find the next section boundary
    next_section = re.search(r"(?:Expected Outcome:|Scope:|General conditions)", section[len(section_marker):])
    if next_section:
        section = section[:len(section_marker) + next_section.start()]
    return section[:max_chars]


def _truncate_description(description: str, focus: Optional[str], max_chars: int = 600) -> str:
    if not description:
        return ""

    if focus and focus in ("outcome", "expected outcome"):
        return _extract_section(description, "Expected Outcome:", 1200)
    if focus == "scope":
        return _extract_section(description, "Scope:", 1200)
    if focus == "conditions":
        return _extract_section(description, "General conditions", 1200)

    # Default: first N chars
    if len(description) <= max_chars:
        return description
    return description[:max_chars].rsplit(" ", 1)[0] + "..."


# ── Budget formatter ──────────────────────────────────────────

def _format_budget(budget: Optional[dict]) -> str:
    if not budget:
        return "Not available"
    total = budget.get("total_eur", 0)
    grants = budget.get("expected_grants")
    min_g = budget.get("min_per_grant")
    max_g = budget.get("max_per_grant")

    parts = [f"EUR {total:,.0f}"]
    if grants:
        parts.append(f"{grants} expected grant(s)")
    if min_g and max_g:
        if min_g == max_g:
            parts.append(f"EUR {min_g:,.0f} per grant")
        else:
            parts.append(f"EUR {min_g:,.0f}-{max_g:,.0f} per grant")
    return ", ".join(parts)


# ── Main context builder ─────────────────────────────────────

def build_context(matches: List[dict], question: str) -> str:
    """
    Format matched call records into a compact context string for the LLM.
    """
    if not matches:
        return (
            "No matching calls were found in the metadata for this query. "
            "The database contains Horizon Europe calls for 2026-2027 across "
            "clusters CL1-CL6 and Health."
        )

    focus = _detect_focus(question)
    total_in_db = len(matches)

    parts = []
    # Cap description length based on number of matches to stay within token budget
    if len(matches) <= 3:
        desc_limit = 1000
    elif len(matches) <= 6:
        desc_limit = 500
    else:
        desc_limit = 300

    for doc in matches:
        block_lines = [
            f"--- Call: {doc['identifier']} ---",
            f"Title: {doc['title']}",
            f"Action type: {doc['action_type']} ({doc['action_type_full']})",
            f"Deadline: {doc['deadline']}",
            f"Budget: {_format_budget(doc['budget'])}",
        ]

        if doc["keywords"]:
            block_lines.append(f"Keywords: {', '.join(doc['keywords'][:10])}")
        if doc["tags"]:
            block_lines.append(f"Tags: {', '.join(doc['tags'][:10])}")
        if doc["cross_cutting"]:
            block_lines.append(f"Cross-cutting priorities: {', '.join(doc['cross_cutting'])}")
        if doc["url"]:
            block_lines.append(f"URL: {doc['url']}")

        # Description — adjusted length based on focus and match count
        desc = _truncate_description(doc["description_text"], focus, desc_limit)
        if desc:
            block_lines.append(f"Description: {desc}")

        parts.append("\n".join(block_lines))

    header = f"Found {total_in_db} matching call(s).\n"
    return header + "\n\n".join(parts)
