# 03 — Calls and deadlines: status truth, semantics, and funding-map terminology

Status: ready-for-agent

## Parent

`.scratch/product-vision/DASHBOARD_PLAYWRIGHT_REDESIGN.md` (the dashboard-redesign ticket).

## What to build

Make the open-calls surface truthful, semantically navigable, and mechanism-free — it is the top of the monitoring hierarchy (calls and deadlines requiring attention).

- Correctly distinguish `upcoming` from `open`: an upcoming call must never be labelled "Open".
- Keep urgent/closing-soon treatment textual as well as visual (not colour-only).
- Make the calls collection semantically navigable as a table or equivalent structured list.
- Give the "All" and "Closing 30d" filter controls programmatic selected-state semantics.
- Do not make important actions (call detail, locate-in-map) available only on hover.
- Keep advertised budgets visually and semantically identified as indicative/on offer (consistent with slice 02's terminology).
- Terminology within dashboard-owned content: "View on graph" → "View in funding map", "Show in graph" → "Show in funding map". If the dashboard-aware shared "Back to graph" command is touched, it becomes "Back to funding map". Do **not** perform a repository-wide rename and do not invent a brand; if the global "EU Knowledge Graph" string remains visible, record it as a separate governance finding rather than fixing it here.
- Preserve the existing behaviour: opening a call-detail page and returning to the dashboard, and locating a call in the funding-map view.

## Acceptance criteria

- [ ] Upcoming calls are never labelled Open (min-test 1)
- [ ] Open and closing-soon filtering preserves the expected calls, and the filter controls expose programmatic selected state (min-test 2)
- [ ] Calls render as a semantic table or structured list navigable by assistive technology
- [ ] No important call action is hover-only
- [ ] Dashboard-owned "graph" mechanism strings are replaced by funding-map terminology, covered by the banned-strings test for this surface (min-test 8, this slice's share)
- [ ] Call-detail round-trip and locate-in-funding-map still work, covered by tests (min-test 9) and verified in the running app via Playwright CLI
- [ ] Frontend tests and production build pass

## Blocked by

- `01-baseline-critique-and-plan.md`
