# 03 — Calls and deadlines: status truth, semantics, and funding-map terminology

Status: ready-for-human

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

- [x] Upcoming calls are never labelled Open (min-test 1)
- [x] Open and closing-soon filtering preserves the expected calls, and the filter controls expose programmatic selected state (min-test 2)
- [x] Calls render as a semantic table or structured list navigable by assistive technology
- [x] No important call action is hover-only
- [x] Dashboard-owned "graph" mechanism strings are replaced by funding-map terminology, covered by the banned-strings test for this surface (min-test 8, this slice's share)
- [x] Call-detail round-trip and locate-in-funding-map still work, covered by tests (min-test 9) and verified in the running app via Playwright CLI
- [x] Frontend tests and production build pass

## Blocked by

- `01-baseline-critique-and-plan.md`

## Delivery note (2026-08-21)

- **Wording decision (PLAN §9) locked: "Forthcoming"** — matching the vocabulary the timeline
  legend, NodeDetail and hover card already use. Applied to the pill (`is-forthcoming`, quiet
  slate, no glow), the counts, and the tests.
- Status truth: `useDashboardData` now returns `openCalls` (truly open only) + new
  `forthcomingCalls`; `openCallsList` stays the combined non-closed set behind the Saved quick
  filter, relabelled "All open & forthcoming calls". Subtitle reads
  "Next 8 of 344 by deadline · 131 open · 213 forthcoming"; the summary strip gained a
  FORTHCOMING stat so OPEN CALLS no longer counts unopened calls. Side-benefit:
  `LandingHome`'s "N open now" pulls the same value and is now truthful too (no code change).
- Semantics: the calls collection is an ARIA table (`role=table/rowgroup/row/columnheader/cell`
  on the existing grid divs) with an accessible name; the Budget header is announced
  "Budget — indicative, on offer"; chips carry `aria-pressed`; the default chip is renamed
  "All" → "Next 8" to resolve the two-different-"All"s ambiguity.
- Actions: "Show in funding map" is always visible (opacity-0-until-hover removed; status column
  92→112px), each with a per-call accessible name; "View on graph"/"Show in graph" →
  funding-map terminology. The shared CommandBar "Back to graph" was NOT touched (per ticket:
  only if touched); the global "EU Knowledge Graph" brand string remains a recorded governance
  finding (CRITIQUE.md), not fixed here.
- Verified live via Playwright CLI (dev server + local API): Forthcoming pill beside green Open
  pills, chip filtering (45 closing-30d rows), call-detail round trip, locate-in-funding-map
  (`03-evidence-forthcoming-pills.png`, `03-evidence-locate-in-map.png`); 0 console errors.
- Tests: `OpenCallsTable.test.jsx` (9 tests: min-tests 1, 2, 8-share, 9 + table semantics +
  budget badge + empty state) and extended `useDashboardData.test.js` (split counts, filter-list
  preservation). Full suite 36 tests green; production build passes.
- Two-axis code review (standards + spec sub-agents) applied: `openCallsList` renamed
  `monitoredCallsList` (the old name lied — it held open + forthcoming); the "Next 8" chip and
  the hook's slice share one `NEXT_DEADLINES_SLICE` constant; dead `closingCount` prop removed;
  internal `viewgraph` class renamed `viewmap`; min-test 9 now also asserts the return-leg
  `graphName` persistence, and min-test 8 scans aria-*/title attributes too. Left open by
  decision: the Closing pill's 10-day urgency threshold stays tighter than the 30-day chip
  (urgency signal ≠ filter window); `LandingHome`'s "N open now" now truthfully excludes
  forthcoming (hook ripple, no file change); pre-existing `_dashboard-redesign.scss`
  palette/type findings stay with slice 07.
