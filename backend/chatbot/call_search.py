"""
Three-layer retrieval over the Horizon Europe call index.
  1. Identifier exact match
  2. Structured filters (year, action type)
  3. Keyword relevance scoring
"""

import re
from typing import List
from chatbot.call_index import call_index

# ── Stopwords (small hardcoded set) ───────────────────────────

_STOPWORDS = frozenset(
    "a an the is are was were be been being have has had do does did "
    "will would shall should may might can could of in to for on with "
    "at by from as into about between through during and or but not "
    "this that these those it its what which who whom how when where "
    "why all any each some no nor so if then than too very also just "
    "more most much many such only other up out there here their my "
    "me i you your we they them he she his her our".split()
)

# ── Layer 1: Identifier match ─────────────────────────────────

# Full identifier, e.g. HORIZON-CL5-2026-01-D6-03, HORIZON-CL4-2027-04-DIGITAL-EMERGING-18
_IDENT_PATTERN = re.compile(
    r"HORIZON-[A-Z0-9]+-\d{4}-\d{2}(?:-[A-Z0-9]+){2,}",
    re.IGNORECASE,
)

# Partial (call-level), e.g. HORIZON-CL2-2026-01
_PARTIAL_IDENT_PATTERN = re.compile(
    r"HORIZON-[A-Z0-9]+-\d{4}-\d{2}",
    re.IGNORECASE,
)


def _match_identifiers(question: str) -> List[dict]:
    # Try full identifier first
    full_matches = _IDENT_PATTERN.findall(question)
    if full_matches:
        uppers = [m.upper() for m in full_matches]
        return [doc for doc in call_index if doc["identifier"].upper() in uppers]

    # Try partial identifier (call-level, e.g. HORIZON-CL2-2026-01)
    partial_matches = _PARTIAL_IDENT_PATTERN.findall(question)
    if partial_matches:
        uppers = [m.upper() for m in partial_matches]
        return [
            doc for doc in call_index
            if any(doc["identifier"].upper().startswith(p) for p in uppers)
        ]
    return []


# ── Layer 2: Structured filters ───────────────────────────────

_YEAR_PATTERN = re.compile(r"\b(202[67])\b")

_ACTION_ALIASES = {
    "ria": "RIA",
    "research and innovation": "RIA",
    "csa": "CSA",
    "coordination and support": "CSA",
    "ia": "IA",
    "innovation action": "IA",
    "innovation actions": "IA",
    "pcp": "PCP",
    "pre-commercial": "PCP",
    "cofund": "Cofund",
    "co-fund": "Cofund",
    "ppi": "PPI",
    "public procurement": "PPI",
}

_CLUSTER_PATTERN = re.compile(
    r"\bcluster\s*(\d)\b|\bcl(\d)\b",
    re.IGNORECASE,
)


def _detect_filters(question: str) -> dict:
    lower = question.lower()
    filters = {}

    # Year
    years = _YEAR_PATTERN.findall(question)
    if years:
        filters["years"] = set(years)

    # Action type
    for alias, short in _ACTION_ALIASES.items():
        if alias in lower:
            filters.setdefault("action_types", set()).add(short)

    # Cluster
    cluster_hits = _CLUSTER_PATTERN.findall(lower)
    if cluster_hits:
        clusters = set()
        for g1, g2 in cluster_hits:
            clusters.add(g1 or g2)
        filters["clusters"] = clusters

    return filters


def _apply_filters(docs: List[dict], filters: dict) -> List[dict]:
    result = docs

    if "years" in filters:
        result = [d for d in result if d["year"] in filters["years"]]

    if "action_types" in filters:
        result = [d for d in result if d["action_type"] in filters["action_types"]]

    if "clusters" in filters:
        cl_prefixes = {f"HORIZON-CL{c}" for c in filters["clusters"]}
        # Also handle HLTH as cluster 1
        if "1" in filters["clusters"]:
            cl_prefixes.add("HORIZON-HLTH")
        result = [
            d for d in result
            if any(d["identifier"].startswith(p) for p in cl_prefixes)
        ]

    return result


# ── Layer 3: Keyword relevance scoring ────────────────────────

def _tokenize(text: str) -> List[str]:
    tokens = re.findall(r"[a-z0-9]+(?:[-'][a-z0-9]+)*", text.lower())
    return [t for t in tokens if t not in _STOPWORDS and len(t) > 1]


def _score_document(doc: dict, query_tokens: List[str]) -> float:
    if not query_tokens:
        return 0.0

    search_text = doc["search_text"]
    tags_lower = " ".join(doc["tags"]).lower()
    keywords_lower = " ".join(doc["keywords"]).lower()
    title_lower = (doc["title"] or "").lower()

    score = 0.0
    for token in query_tokens:
        if token in search_text:
            score += 1.0
        # Bonus for matches in high-signal fields
        if token in tags_lower:
            score += 2.0
        if token in keywords_lower:
            score += 1.5
        if token in title_lower:
            score += 2.0

    # Normalize by number of query tokens so longer queries don't auto-inflate
    return score / len(query_tokens)


# ── Combined search ───────────────────────────────────────────

def search_metadata(question: str, max_results: int = 10) -> List[dict]:
    """
    Search the call metadata index for records matching the question.
    Returns up to max_results documents, best matches first.
    """
    # Layer 1: exact identifier match
    ident_matches = _match_identifiers(question)
    if ident_matches:
        return ident_matches[:max_results]

    # Layer 2: structured filters
    filters = _detect_filters(question)
    candidates = _apply_filters(call_index, filters) if filters else call_index

    # Layer 3: keyword scoring
    query_tokens = _tokenize(question)
    if query_tokens:
        scored = [(doc, _score_document(doc, query_tokens)) for doc in candidates]
        scored.sort(key=lambda x: x[1], reverse=True)
        # Only return docs with positive score
        results = [doc for doc, s in scored if s > 0]
    elif filters:
        # Filters applied but no keyword scoring (e.g. "all 2026 CSA calls")
        results = candidates
    else:
        results = []

    return results[:max_results]
