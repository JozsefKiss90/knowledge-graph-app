# Chatbot RAG Implementation Plan

## Goal

Replace the generic LLM chatbot with a **metadata-grounded RAG** system that answers questions exclusively from the local Horizon Europe call database (444 records, 2026-2027).

**Flow:** `user question -> search local metadata -> select relevant calls -> build compact context -> LLM answers only from context`

---

## Current State

- `backend/chatbot/chatbot_api.py` — sends raw question to OpenRouter LLM with a generic system prompt
- `backend/routes/new_pipeline/output_files/fetched_call_metadata_2026_2027.json` — 444 call records with rich structured metadata
- No search index, no context injection

---

## Data Shape (per record)

| Field | Source path | Use |
|---|---|---|
| `identifier` | `record.identifier` + `raw.metadata.identifier[0]` | Exact match lookup |
| `summary` | `record.summary` | Text search |
| `title` | `raw.metadata.title[0]` | Text search |
| `keywords` | `raw.metadata.keywords[]` | Keyword/theme match |
| `tags` | `raw.metadata.tags[]` | Keyword/theme match |
| `descriptionByte` | `raw.metadata.descriptionByte[0]` | Full-text search (HTML, needs stripping) |
| `deadlineDate` | `raw.metadata.deadlineDate[0]` | Filter (year, date) |
| `typesOfAction` | `raw.metadata.typesOfAction[0]` | Filter (RIA, CSA, IA, etc.) |
| `budgetOverview` | `raw.metadata.budgetOverview[0]` | Budget queries (JSON string) |
| `callIdentifier` | `raw.metadata.callIdentifier[0]` | Group-level lookup |
| `callTitle` | `raw.metadata.callTitle[0]` | Text search |
| `crossCuttingPriorities` | `raw.metadata.crossCuttingPriorities[]` | Theme filter |
| `url` | `record.url` | Include in answers for reference |

**Action type values:** RIA, CSA, IA, PCP, Cofund, PPI (6 types across 444 records)
**Deadline years:** 2026 (279 calls), 2027 (210 calls)
**Identifier prefixes:** HORIZON-CL2, CL3, CL4, CL5, CL6, HLTH

---

## Implementation Steps

### Step 1: Create metadata index module

**File:** `backend/chatbot/call_index.py`

- Load `fetched_call_metadata_2026_2027.json` once at import time
- For each record, extract and normalize a flat search document:
  ```python
  {
      "identifier": "HORIZON-CL2-2026-01-DEMOCRACY-01",
      "title": "Tackling gender-based violence...",
      "summary": "Tackling gender-based violence...",
      "keywords": ["Internet Science", "Political systems and institutions", ...],
      "tags": ["Gender-based violence", "LGBTIQ", "gender", ...],
      "description_text": "Expected Outcome: Projects should...",  # HTML-stripped
      "deadline": "2026-09-23",
      "year": "2026",
      "action_type": "RIA",                  # normalized short form
      "action_type_full": "HORIZON Research and Innovation Actions",
      "budget_info": { ... },                # parsed from budgetOverview JSON
      "call_identifier": "HORIZON-CL2-2026-01",
      "call_title": "Culture, Creativity and Inclusive Society 2026",
      "cross_cutting": ["AI", "DigitalAgenda", ...],
      "url": "https://ec.europa.eu/...",
      "search_text": "..."                   # concatenated lowercase text for full-text search
  }
  ```
- `search_text` = lowercased concatenation of: identifier, title, summary, keywords, tags, description_text, action_type, call_title, cross_cutting priorities
- Strip HTML from `descriptionByte` using a simple regex or `html.parser`
- Normalize action types to short forms: `RIA`, `CSA`, `IA`, `PCP`, `Cofund`, `PPI`
- Parse `budgetOverview` JSON string to extract per-topic budget numbers

**No new dependencies required** — uses only stdlib (`json`, `re`, `html`, `pathlib`).

---

### Step 2: Build search/retrieval functions

**File:** `backend/chatbot/call_search.py`

Three retrieval strategies, tried in order of priority:

#### 2a. Identifier match
- Regex scan question for patterns like `HORIZON-\w+-\d{4}-\d+-\w+-\d+` or partial identifiers
- Return exact matching record(s)

#### 2b. Structured filter detection
- Detect year mentions: regex for `202[67]`
- Detect action type mentions: scan for `RIA`, `CSA`, `IA`, `innovation action`, `coordination and support`, etc.
- Detect deadline-related queries: keywords like "deadline", "due", "submission date", "closing date"
- Detect budget-related queries: keywords like "budget", "funding", "EUR", "million"
- Apply matching filters to narrow the candidate set

#### 2c. Keyword/theme text search
- Tokenize question into keywords (strip stopwords with a small hardcoded list)
- Score each call document by counting keyword hits in `search_text`
- Bonus weight for hits in `tags` and `keywords` fields (more specific)
- Return top-N results (default N=10, cap context size)

#### Combined retrieval function
```python
def search_metadata(question: str, max_results: int = 10) -> list[dict]:
    # 1. Try identifier match — if found, return those
    # 2. Apply structured filters (year, action type)
    # 3. Score remaining by keyword relevance
    # 4. Return top max_results
```

**No new dependencies** — pure Python text matching. With only 444 records, brute-force scoring is instant (<10ms).

---

### Step 3: Build context formatter

**File:** `backend/chatbot/context_builder.py`

```python
def build_context(matches: list[dict], question: str) -> str:
```

- For each matched call, render a compact text block:
  ```
  --- Call: HORIZON-CL2-2026-01-DEMOCRACY-01 ---
  Title: Tackling gender-based violence...
  Action type: RIA
  Deadline: 2026-09-23
  Budget: EUR 12,000,000 (3 grants, EUR 3.5-4M each)
  Keywords: Internet Science, Political systems...
  Tags: Gender-based violence, LGBTIQ, gender...
  URL: https://ec.europa.eu/...
  Description: Expected Outcome: Projects should contribute to...
  ```
- Truncate description to ~500 chars per call to stay within token limits
- If question is specifically about "expected outcomes", "scope", "budget", or "conditions" — include more of the relevant section from `descriptionByte`
- Total context target: ~3000-4000 tokens (fits comfortably in any model's window alongside system prompt + question)

---

### Step 4: Rewrite chatbot endpoint

**File:** `backend/chatbot/chatbot_api.py` (modify existing)

```python
from chatbot.call_index import call_index
from chatbot.call_search import search_metadata
from chatbot.context_builder import build_context

@router.post("/chatbot/query")
async def chatbot_query(request: ChatRequest):
    question = request.question
    matches = search_metadata(question)
    context = build_context(matches, question)
    answer = call_llm(question, context)
    return {
        "answer": answer,
        "sources": [m["identifier"] for m in matches]  # optional: show which calls were used
    }
```

Update `call_llm` signature and system prompt:

```python
def call_llm(question: str, context: str) -> str:
    system_prompt = """You are a Horizon Europe call assistant. Answer the user's question using ONLY the call metadata provided below.
If the answer is not contained in the metadata, say so clearly.
When referencing calls, always include the identifier.
Be concise and factual.

=== CALL METADATA ===
{context}
=== END METADATA ==="""
```

---

### Step 5: Handle edge cases

In `call_search.py`, add handling for:

- **No matches found** — return empty list; `build_context` produces a "No matching calls found" message; LLM told to say metadata doesn't contain it
- **Too many matches** (e.g. broad query "show all 2026 calls") — return top 10 with a note that X more exist; suggest the user narrow their query
- **General Horizon Europe questions** (not call-specific) — if no call matches but the question seems to be about Horizon Europe in general, include a brief note that this assistant is specialized for call-level queries

---

## File Summary

| File | Action | Description |
|---|---|---|
| `backend/chatbot/call_index.py` | **NEW** | Load JSON, build flat search documents |
| `backend/chatbot/call_search.py` | **NEW** | Identifier match, filter detection, keyword scoring |
| `backend/chatbot/context_builder.py` | **NEW** | Format matched calls into compact LLM context |
| `backend/chatbot/chatbot_api.py` | **MODIFY** | Wire up search → context → LLM pipeline |

## No new dependencies

The entire implementation uses Python stdlib only (`json`, `re`, `html.parser`, `pathlib`, `datetime`). With 444 records, in-memory brute-force search is fast enough — no need for vector DBs, embeddings, or external search libraries.

## Example Queries the System Will Handle

| Question | Strategy | Expected behavior |
|---|---|---|
| "What is HORIZON-CL2-2026-01-DEMOCRACY-01 about?" | Identifier match | Returns that specific call's details |
| "Which 2026 calls are about democracy and AI?" | Year filter + keyword search | Filters to 2026, scores by "democracy" + "AI" hits |
| "What is the deadline for this topic?" | (needs context) | If previous call mentioned, use that; otherwise ask to specify |
| "Is HORIZON-CL4-2027-03-01 RIA or CSA?" | Identifier match | Returns action type from matched record |
| "What are the expected outcomes?" | Keyword search on "expected outcome" in description | Returns matching description sections |
| "Which calls mention FAIR data or EOSC?" | Keyword search | Searches description text for "FAIR" and "EOSC" |
| "Show me all CSA calls in 2027" | Action type filter + year filter | Filters by both, returns up to 10 |
| "What is the budget for cluster 5 calls?" | Identifier prefix filter + budget focus | Filters CL5, formats budget info |
