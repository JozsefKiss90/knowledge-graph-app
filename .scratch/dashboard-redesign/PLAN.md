# Portfolio Dashboard Redesign — Implementation Plan

Produced by `/impeccable shape portfolio dashboard`, 2026-08-21.

> **Interview substitution (stated per shape's no-human fallback):** the discovery interview was
> answered from the binding sources instead of a live user round — the parent ticket
> (`.scratch/product-vision/DASHBOARD_PLAYWRIGHT_REDESIGN.md`), PRODUCT.md, DESIGN.md, CONTEXT.md,
> UX-DECISIONS.md (Q4.3/Q6.3/Q6.5), ADRs 0001/0002/0006, and `CRITIQUE.md` (this slice's baseline).
> Every hierarchy and scope decision below is traceable to one of those; assumptions beyond them are
> flagged inline as **[assumption]**.

## 1. Job and audience

The research-office professional on the Tuesday pull: *"something changed in my field — what's
fundable now?"* Desk context, often answering a PI. Mode: **Operate**. Success = in under a minute,
know which calls need attention, how much is on offer, and be one hop from the funded track record —
with every figure defensible enough to forward.

## 2. Outcome and proof

A calm evidence-led monitoring hub whose default (all optional windows closed) supports triage:
attention → offer → evidence → exploration → tools. Proof: real returned data only; every money
figure wears its half; unavailable ≠ not-ingested ≠ empty; nothing rendered the API didn't return.

## 3. Direction

**Refinement of the incumbent blue-glass dashboard — not a replacement architecture.** The
"Funding Observatory" world (DESIGN.md) stays; layout topology (theme bar → calls+runway |
tools+chart → summary strip; draggable windows on desktop) stays; the work is truthfulness,
accessibility, hierarchy discipline, and visual-system conformance. The old look is not an
anti-reference here; the purple accents and mechanism copy are.

## 4. Hierarchy (binding, from the ticket)

1. **Calls and deadlines requiring attention** — `OpenCallsTable` + `DeadlineRunway`. First in
   reading order and visual weight. Truthful statuses (open / forthcoming / closing), textual
   urgency, structured-list semantics.
2. **Indicative funding on offer** — the ON OFFER half of `OfferFundedStrip` + budget column,
   always badged "Indicative · on offer", never "committed".
3. **Historical funded evidence** — the FUNDED half (CORDIS strip figures, funded-activity
   windows), always sourced ("Source: EU CORDIS · as of …"), clearly historical, separate axis.
4. **Deeper thematic exploration** — `DashboardToolPanel` (Fields / Country / Hop-on) and theme
   windows, opened on demand.
5. **Saved views and secondary tools** — Saved pill, `SavedSearches`/`SavedViews`, chart mode
   toggles.

The five levels are already roughly the DOM order; the redesign enforces them by weight and
interaction cost, not by rearchitecting the grid. **[assumption]** No layout reshuffle is needed to
satisfy the hierarchy; if implementation proves otherwise, reorder within the existing grid rather
than adding containers.

## 5. Work slices (sequenced)

Each slice maps to critique findings (CRITIQUE.md) and the parent ticket's required outcomes.

### Slice A — P0: unblock sub-lg viewports
Portal/scrim of `.dash-windows-layer--stacked` only when ≥1 window is open
(`PortfolioDashboard.jsx`, `_dashboard-redesign.scss:890-901`). Windows stack without clipping or
horizontal scroll below lg. Acceptance: at 1024×768 the dashboard is fully legible and clickable on
arrival.

### Slice B — Calls & deadlines truthfulness + semantics
- Third status ("Forthcoming", closed-slate, textual) from the existing `status: "upcoming"`;
  never label an upcoming call "Open" (`OpenCallsTable.jsx:177`).
- Split or relabel aggregates ("N open · M forthcoming") in subtitle and strip.
- Structured-list semantics for the calls collection (table or ARIA-equivalent list, per ticket).
- `All` / `Closing 30d`: programmatic selected state (`aria-pressed` or tab semantics); resolve the
  two-different-"All"s ambiguity (default slice vs all-open) with honest labels.
- Row actions ("Show in …") not hover-only (visible or focus-revealed).
- Budget column keeps the advertised badge visually and semantically.
- Runway: accessible name + textual equivalent (call names, distances, grouped counts) without
  SVG/colour/hover/`title`; keep the honest empty state.

### Slice C — Calls-over-time chart honesty + accessibility
Accessible title and summary or data-table equivalent; monthly values exposed to AT; Open/Closed
controls with selected-state + keyboard semantics; series distinguished by more than colour; year
and period labels truthful.

### Slice D — Two-halves integrity + error/freshness honesty
- Rename `totalCommitted` → `totalOnOffer` across producers/consumers/tests in the dashboard slice
  (`useDashboardData.js`, `OfferFundedStrip.jsx`, `PortfolioDashboard.jsx`, dead consumers noted).
- Distinct CORDIS *fetch-failed* state at the strip level (never the "appears once ingested" line on
  error; never zero rows) — branch on the hook's error.
- Provenance freshness: "Source: EU CORDIS · as of …" where the data's ingest date is available from
  existing responses. **[assumption]** An ingest/as-of timestamp is derivable from current API
  responses without backend changes; if not, surface source-only and record the gap — backend
  changes are out of scope (stop condition).

### Slice E — Research tools + terminology
- Complete the tab contract: `role=tablist`, stable IDs, `aria-selected` (currently all-false),
  `aria-controls` + `tabpanel`, roving tabIndex, Left/Right/Home/End, predictable focus.
- Dashboard-owned copy: "View on graph" → "View in funding map", "Show in graph" → "Show in funding
  map", "funded across the graph" → "across the funding landscape". No repo-wide rename; the
  "EU Knowledge Graph" brand string is recorded as governance debt (CRITIQUE.md), not fixed here.
- Preserve the external contract: `dashboardPanel`, `setDashboardPanel`, `countryOverlayCode`,
  `setCountryOverlayCode`, field/country/hop-on sidebar navigation.

### Slice F — Theme windows accessibility
Per window: exposed title/purpose on open, focus moves in, Escape closes, focus returns to
launcher, specific accessible close names, full keyboard usability; dragging stays pointer-only but
never required. No window-management framework.

### Slice G — Visual-system conformance
- Purge dashboard-owned `#7551FF` (live: `PortfolioDashboard.jsx:281`, `DashWindow.jsx:10,41`,
  `OpenCallsTable.jsx:46` fallback; dead: `KpiTileRow.jsx:82`) → Signal Blue.
- Window accents collapse to Signal Blue tints (icon + title differentiate); Awarded green reverts
  to semantic-only use; drop the per-chip green glow (Tint-Not-Lift).
- Contrast: lift the muted row token pair (#697f9f on #0f2244, 3.9:1) to AA.
- Lift functional text below 11px (column headers, programme names, row actions) while keeping
  DESIGN.md's data-mono grammar for true data readouts.
- Light-mode: replace `DeadlineRunway` hardcoded dark-tuned hexes with theme tokens (both modes
  defined — a token in one mode is a bug).
- `prefers-reduced-motion` guards for `dashWinIn` and smooth scrolling; use `_breakpoints.scss`
  tokens only.
- Visible `:focus-visible` on all three tab styles and interactive marks.

### Slice H — Tests + Playwright verification (parent ticket's matrix)
Focused tests: upcoming≠Open; filter preservation; on-offer naming internal+visible; no funded
zeroes on unavailable; tab keyboard/ARIA; window Escape/focus-return; chart mode selected state;
banned mechanism strings absent from dashboard-owned content; navigation/locate/sidebar wiring
intact. Playwright: the parent ticket's full scenario list at 1440×900 + 1024×768, dark + light,
empty/loading/failed states, no horizontal overflow, no new console errors → curated evidence to
`.scratch/dashboard-redesign/final/`. Then `/impeccable polish`, `audit`, `doctor`, `hooks status`;
dashboard tests, full suite, lint, production build.

**Candidate cleanup (decide during implementation, not required):** deleting the unmounted
`DashboardHero` / `KpiCardsRow` / `KpiTileRow` / `CordisKpiRow` / `FundingFrameLegend` /
`useInView` dead code. In-scope files, honest direction (ADR-0006 §2 removes dead mechanisms), but
not a ticket requirement — do it only if it stays a small, separate commit; never revive them.

## 6. States and ranges

- Calls: 344 open+forthcoming today; default slice 8 rows; list must stay honest about the slice
  ("Sorted by deadline · showing next 8 of N").
- CORDIS: populated (101k projects) / not-ingested / fetch-failed / ingested-but-empty — four
  distinct rendered states (CordisGate already models this; the strip must match).
- Loading: existing skeletons; never a zero masquerading as data.
- Theme windows: 0–7 open; desktop floating, sub-lg stacked.

## 7. Anti-goals (binding)

No mock activity feeds, fake deltas, forecasts, scores, recommendations, or inert controls. No
"what's new since last visit" mechanism this phase (home v2, explicitly deferred — do not fake it).
No new chart/animation/UI dependency. No backend/API changes. No parallel dashboard. No product
name. No top-level CORDIS mode. No broad design-system cleanup outside the dashboard slice.

## 8. Scope boundary

Primary: `frontend/src/components/GraphPage/Dashboard/**`, `_dashboard.scss`,
`_dashboard-redesign.scss`, `_dashboard-cordis.scss`, `_dashboard-tool-panel.scss`.
Conditional: dashboard-focused tests; `CommandBar.jsx` (nav copy/a11y only); `GraphMainColumn.jsx`
(coordination only); shared money/evidence components only if a dashboard defect can't be fixed
locally. Anything else must be justified in the delivery report.

## 9. Open decisions a builder must not invent

- Exact "Forthcoming" label wording (vs "Opens <date>") — pick once, apply to pill + counts + tests.
- ~~Whether the as-of date exists in current responses (Slice D assumption)~~ — **verified during
  slice 02 (2026-08-21): no.** `/cordis/portfolio-summary` (`_shape_portfolio_summary`,
  `cordis_routes.py`) returns counts/euros + a static provenance string, no ingest/as-of timestamp.
  Per the stop condition the strip stays source-only ("Source: EU CORDIS"); the timestamp is
  recorded as a backend gap, out of scope this ticket.
- Whether dead-code deletion ships this ticket (candidate cleanup above).
- "Back to graph" (shared command) rename — only if that file is touched anyway.
