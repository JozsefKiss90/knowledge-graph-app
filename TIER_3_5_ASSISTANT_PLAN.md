# Tier 3.5 — Multi-turn, CORDIS-aware assistant (design & plan)

> **Status:** Deferred (2026-06-29). Tiers 3.1, 3.2, 3.3, 3.4 shipped; 3.5 held pending a faster chatbot model.
> **Decision locked:** conversation state is **client-held** (frontend sends the transcript each turn; backend stays stateless).
> **Why deferred:** `/chatbot/query` timed out at 60 s against the configured OpenRouter model while `/chatbot/models` responded fine — the LLM is wired up but the completion is too slow for a pleasant multi-turn loop. Revisit once the model is faster (or add streaming). The implementation below is independent of model speed and can be built/verified in parts without a fast LLM.

This item from `FRONTEND_UX_REFACTOR_PLAN.md` (3.5) converts the single-turn ChatBot into a conversation that (a) refines prior results and (b) answers "who's been funded for X" from CORDIS, citing locatable call ids.

---

## 1. Current state (verified)

- **Frontend `frontend/src/components/ChatBot/ChatBot.js`** — single-turn. `handleSearch` wipes ALL state on every query (`setAnswer('')`, `setMatchedCalls([])`, `setFilters([])`, `setActiveChips(new Set())`, `setTotalMatches(0)`) before fetching. No message history kept or sent. `POST ${REACT_APP_API_URL}/chatbot/query` body `{question}` → `{answer (markdown), sources, matched_calls, filters, total_matches}`. Result chips do **client-side** narrowing of the returned `matched_calls` (`chipMatchesCall`); they re-fire `onAssistantResults(displayedCalls, lastQuery)`.
- **Backend `backend/chatbot/chatbot_api.py`** — `POST /chatbot/query`, stateless. `ChatRequest = {question}`. `call_llm()` builds `messages=[system, user]` (no history) via OpenRouter (`OPENROUTER_API_KEY`). `GET /chatbot/models` works (key valid).
- **`backend/chatbot/call_search.py`** — 3-layer retrieval (identifier / structured filters / keyword) over the in-memory `call_index`. `_detect_filters` understands year, action_type, cluster (HORIZON-CLx / HORIZON-HLTH prefixes only).
- **`backend/chatbot/call_index.py`** — built once at import from a single JSON `output_files/fetched_call_metadata_2026_2027.json` = **444 Pillar II cluster calls** (CL2/CL3/CL4/CL5/CL6/HLTH). No Pillar I/III, no standalone programmes, **no CORDIS**.
- **Already shipped and reusable (Tiers 3.1–3.4):**
  - **Source-tracked highlight channel** (3.3): `handleAssistantResults(matchedCalls, query, source = "ai")` in `GraphPage.js` + `handleClearAssistant(source)` gated on `highlightSourceRef`; the constraint pill labels `AI:` vs `Find:`. The assistant already passes the default `"ai"` source — multi-turn just keeps writing it.
  - `callLocator` (`buildCallLocator`) maps a call identifier → graph location; `onLocateCall` drills+centers. Citations in answers stay locatable for free.
  - **CORDIS read endpoints** (`backend/routes/new_pipeline/cordis/cordis_routes.py`): `/call-evidence`, `/area-organisations`, `/organisation` (new in 3.4), `/related-calls`, `/field-calls` — all server-cached, all keyed on a call id or org id. These are the CORDIS retrieval surface for the assistant.

---

## 2. Target behaviour

1. **Multi-turn:** the user can refine ("only the open ones", "which of those are coordinated by Spanish orgs", "show me the funded partners for the first one") and the assistant uses prior turns as context. Each answer's `matched_calls` replaces the graph highlight (source `"ai"`).
2. **CORDIS-aware:** "who's been funded for climate adaptation?" / "which orgs lead projects in this area?" are answered from CORDIS evidence (org names, project counts, awarded €) with **locatable call ids** the user can click to jump on the graph or open the org dossier (`/org/:id`, built in 3.4).
3. **Honest framing:** planned (work-programme) vs funded (CORDIS) stay distinct in the answer, matching the app-wide vocabulary.

---

## 3. Architecture (decided)

- **Conversation state = client-held.** `ChatBot` owns a `messages[]` transcript and sends it each turn. The backend stays **stateless** — no session store, no Redis, no new infra. This matches the existing stateless endpoint and is the cheapest correct path. (Server-side sessions were considered and rejected: no store exists and cross-device continuity isn't needed.)
- **One LLM call per turn.** CORDIS retrieval is **fast Neo4j (cached) injected into context**, NOT a second LLM round-trip — so CORDIS-awareness adds **no** LLM latency (important given the slow model).
- **Retrieval = work-programme search ∪ CORDIS evidence for the matched calls.** Keep the existing `call_search` over the 444-call JSON for "which calls", then for the top matched calls fetch a compact CORDIS evidence summary (top orgs / project counts / awarded €) via the existing per-call Cypher and fold it into the LLM context. The model answers from both, labelled.

---

## 4. Backend work

**`backend/chatbot/chatbot_api.py`**
- Extend `ChatRequest` to `{question: str, history: list[{role, content}] = []}` (cap history length, e.g. last 8 turns, to bound tokens).
- `call_llm()`: build `messages = [system_prompt, *history, {role:'user', content: question}]` instead of `[system, user]`. (The function already structures a messages list — this is the cheap change.)
- Broaden the **system prompt**: today it says "Answer ONLY from the supplied metadata" over HE calls. New prompt must (a) allow using the CORDIS evidence block, (b) keep planned-vs-funded distinct and labelled, (c) instruct the model to cite call identifiers verbatim (so the frontend can locate them), (d) refuse to invent figures (honest-framing guardrail consistent with the rest of the app).
- **CORDIS retrieval path:** after `search_metadata` returns matched calls, for the top N (e.g. 5) call ids, call a new helper that runs the existing `call-evidence`-style Cypher (or imports the route's `_compute`) to get `{projectCount, totalEcContribution, topOrganisations[], subject}` per call, plus optionally a portfolio-level `area-organisations` roll-up for the dominant subject. Format a compact "FUNDED EVIDENCE (CORDIS)" section in `context_builder.build_context()`. Reuse `db.query`; everything is already source-cached.
- Return shape stays `{answer, sources, matched_calls, filters, total_matches}` — add an optional `cordis` block (the evidence used) if the UI wants to render it. No breaking change.

**`backend/chatbot/context_builder.py`**
- Add a CORDIS-evidence section to the formatted context (budgeted/truncated like the call section). Keep counts and euros as separate measures; never blend.

**Optional (separate, larger): broaden the work-programme corpus.** `call_index.py` loads one JSON. Full coverage (ERC/MSCA/INFRA/EIC/EIE/standalone) needs those programmes' call metadata ingested into the index — a **separate data task**, not required for 3.5's CORDIS-awareness. Flag, don't bundle.

---

## 5. Frontend work

**`frontend/src/components/ChatBot/ChatBot.js`**
- Replace single `answer`/`matchedCalls` with a **`messages[]` transcript** (`[{role:'user'|'assistant', content, matchedCalls?, cordis?}]`). Render as a scrollable conversation, not a single answer.
- `handleSearch`: stop wiping prior state; append the user turn, POST `{question, history}` (history = prior turns mapped to `{role, content}`), append the assistant turn on response.
- **Refine-vs-replace highlight:** each assistant turn's `matched_calls` replaces the graph highlight via `onAssistantResults(matched, query, "ai")` (the source-tracked channel already exists). A "Clear conversation" resets the transcript and calls `onClearAssistant()`.
- Keep the per-result "Show in graph" (`onLocateCall`) and the on-graph badge (`locateCall`) — they already work; citations stay locatable.
- For CORDIS answers, render org names as `OrgLink` (built in 3.4) → `/org/:id`, and call ids as locate/`/node/:id` links.

---

## 6. Scope boundaries & honest gaps (do not over-promise)

- Work-programme corpus stays the **444-call HE 2026–27 JSON** until a separate ingest broadens it. The assistant can only surface those for the "planned" side; CORDIS covers the funded side broadly (101k projects / 238k orgs across the tagged programmes).
- CORDIS evidence is **subject-area** evidence (HAS_FUNDED_PROJECT), not exact-call funding — same caveat the A2/B2 panels already disclose. Carry that wording into answers.
- No tool/function-calling in v1 (the configured model's reliability for tool use is unverified and adds complexity). Deterministic retrieval + context injection is the v1.

---

## 7. Risks

- **LLM latency (the blocker):** the configured model timed out at 60 s. Multi-turn amplifies this (more turns). Mitigations before/with shipping: pick a faster model id (the OpenRouter account exposes fast models — see `/chatbot/models`), and/or add **streaming** responses + a clear typing indicator. Verify a turn returns in a few seconds before exposing multi-turn.
- **History token growth / prompt injection:** cap history turns; never trust history content as instructions (system prompt stays authoritative).
- **Retrieval quality:** keyword search over 444 calls is shallow; CORDIS evidence is area-level. Set expectations in the UI copy.

---

## 8. Suggested order + verification

1. Backend: add `history` to `ChatRequest` + forward in `call_llm`; verify with a 2-turn `curl` (no CORDIS yet) that the model uses context. **Pick/confirm a fast model first.**
2. Backend: CORDIS evidence injection (reuse `call-evidence` Cypher) + prompt broadening; verify "who's funded for X" returns org names + call ids in the `cordis` block (testable without judging the prose).
3. Frontend: transcript UI + `{question, history}` POST + refine-vs-replace highlight (reuse the 3.3 `"ai"` source channel); verify highlight updates per turn and citations locate.
4. Adversarial review (same harness as 3.1–3.4): history/token bounds, highlight ownership across turns, CORDIS-evidence honesty, injection, error/timeout UX.

---

## 9. Pointers

- Assistant pipeline + highlight reuse: `GraphPage.js` (`handleAssistantResults(…, source)`, `handleClearAssistant(source)`, `highlightSourceRef`), `GraphMainColumn.jsx` (assistant paint effect), `buildCallLocator.js`.
- CORDIS retrieval to reuse: `cordis_routes.py` `call_evidence` (~line 335), `area_organisations` (~929), `organisation` (3.4, ~1127); `database.py` `db.query`; `cordis_cache.py` (already covers any new read key via `invalidate()`).
- Org pivot for citations: `OrgLink.jsx` + `/org/:orgId` route (3.4).
