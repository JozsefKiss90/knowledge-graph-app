# The assistant is a grounded interface to the two halves — never a third core

The in-app assistant answers from the ingested graph (work-programme calls + CORDIS evidence) and
**acts on** the graph: it cites what it retrieves, highlights and zooms the matching nodes (on a
source-tracked channel, so its highlights stay distinguishable from find/filter), and may recommend
calls with citations. Its boundaries: it does not answer from the open web or general knowledge
(grounded-only); it does not rule (no eligibility verdicts, no winnability scores, no single "pick
this one" — ADR-0002 #4); and it is an *interface* to the two halves, not a content surface of its
own — there is no assistant-first mode of the product.

Why record it: an "AI assistant" is under constant pressure to grow — every demo tempts open-ended
chat, and chat drifts toward oracle positioning. The trade-off is deliberate: less wow than a general
research copilot, in exchange for answers the product can stand behind (every claim traceable to a
node the user can see) and an identity that stays two-halves-plus-join rather than three cores.
Multi-turn conversation over the graph (shipped 2026-06-30) is inside the boundary; generality is
not. This closes the "grounded-assistant scope decision" pointer left in ADR-0002.
