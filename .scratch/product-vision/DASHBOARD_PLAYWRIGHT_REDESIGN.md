# Ticket: Redesign the portfolio dashboard as a decision-focused monitoring surface

## Objective

Refine the existing portfolio dashboard using Impeccable and Playwright CLI so a research-office professional can quickly answer:

1. Which calls need attention now?
2. What indicative funding is currently on offer?
3. What related activity has previously been funded?
4. Where can I explore the evidence in more detail?

This is a refinement of the incumbent dashboard, not a replacement architecture or a speculative new product.

## User story

As a research-office professional monitoring EU funding opportunities, I want a calm, evidence-led dashboard that separates current opportunities from historical funded activity so I can decide where scarce proposal effort should go.

## Branch and prerequisite boundary

Work on `go_live`.

Before changing dashboard code:

1. Run `git status` and record the starting commit.
2. Confirm the previous node-detail ticket is either:

   * fully closed and committed separately, or
   * cleanly excluded from this ticket.
3. Do not mix unresolved node-detail fixes, design-context changes, or Playwright cleanup into the dashboard commit.
4. Run:

```text
/impeccable doctor
/impeccable hooks status
```

Both must be clean. If they are not clean because of unfinished work from the previous ticket, stop and report the blocker.

Do not run `/impeccable init` or `/impeccable document`; the durable product and design context already exists.

## Binding context and precedence

Read before implementation:

* `PRODUCT.md`
* `DESIGN.md`
* `.impeccable/design.json`
* `CONTEXT.md`
* `UX-DECISIONS.md`
* `AGENTS.md`
* `CLAUDE.md`
* ADRs `0001`, `0002`, and `0006`
* `.claude/skills/playwright-cli/SKILL.md`

Treat these as authoritative over:

* `DASHBOARD_PLAN.md`
* `DASHBOARD_REDESIGN_PROMPT.md`
* old screenshots or mockups
* unused legacy dashboard components

Those older artifacts may be used as historical references only. In particular, do not follow old instructions that extend the Vision-UI purple palette.

## Product and evidence constraints

Preserve the honesty contract:

* Advertised funding means indicative funding currently on offer.
* It must never be described as committed, allocated, spent, or awarded.
* Awarded funding means historical CORDIS project activity.
* Advertised and awarded values are separate evidence axes.
* Counts are not funding, and funding is not impact.
* Historical awards must never be presented as odds, predictions, recommendations, or evidence that a current call will succeed.
* Show provenance, freshness and EU-only scope wherever required by the existing product context.
* Loading, empty, unavailable and error states must be honest. Do not render misleading rows of zeroes.
* CORDIS is an evidence source inside one workflow, not a separate product mode.
* Do not display data that the application did not actually return.

Do not invent a product name. The global brand decision remains outside this ticket.

## Current dashboard surfaces

The implementation currently includes:

* `PortfolioDashboard.jsx`
* `OpenCallsTable.jsx`
* `DeadlineRunway.jsx`
* `CallsOverTime.jsx`
* `OfferFundedStrip.jsx`
* `DashboardToolPanel.jsx`
* `DashWindow.jsx`
* `FundingByProgramme.jsx`
* CORDIS portfolio, country, organisation, field and trend panels
* saved searches and saved views
* `useDashboardData.js`
* `useDraggableWindows.js`
* `_dashboard.scss`
* `_dashboard-redesign.scss`
* `_dashboard-cordis.scss`
* `_dashboard-tool-panel.scss`

The default dashboard must remain useful when every optional theme window is closed.

## Impeccable workflow

### 1. Baseline critique

Start the application using the repository’s documented commands. Do not guess commands when package scripts already define them.

Use Playwright CLI to capture the current dashboard with realistic returned data at:

* 1440 × 900, dark theme
* 1024 × 768, dark theme
* 1440 × 900, light theme
* one honest empty or unavailable CORDIS state

Store curated baseline evidence under:

```text
.scratch/dashboard-redesign/baseline/
```

Then run:

```text
/impeccable critique portfolio dashboard
```

Review at least:

* hierarchy and decision usefulness
* advertised-versus-awarded separation
* information density
* terminology
* responsive behaviour
* keyboard operation
* focus visibility
* chart accessibility
* empty/loading/error states
* visual consistency with `DESIGN.md`

Write the findings to:

```text
.scratch/dashboard-redesign/CRITIQUE.md
```

Separate ticket findings from pre-existing, out-of-scope repository debt.

### 2. Shape the intended experience

Run:

```text
/impeccable shape portfolio dashboard
```

Before coding, write a concise implementation plan to:

```text
.scratch/dashboard-redesign/PLAN.md
```

The proposed hierarchy should prioritise:

1. Calls and deadlines requiring attention
2. Indicative funding currently on offer
3. Historical funded evidence
4. Deeper thematic exploration
5. Saved views and secondary tools

Do not introduce mock activity feeds, fake deltas, forecasts, scores, recommendations or inert controls.

### 3. Implement

Refine the existing components and data contracts rather than creating a parallel dashboard.

Required implementation outcomes follow.

#### Calls and deadlines

* Preserve opening a call-detail page and returning to the dashboard.
* Preserve locating a call in the funding-map view.
* Correctly distinguish `upcoming` from `open`.
* An upcoming call must not be labelled “Open”.
* Keep urgent or closing-soon treatment textual as well as visual.
* Make the calls collection semantically navigable as a table or equivalent structured list.
* Give the “All” and “Closing 30d” controls programmatic selected-state semantics.
* Do not make important actions available only on hover.
* Keep advertised budgets visually and semantically identified as indicative/on offer.

#### Deadline runway

* Preserve the visual overview.
* Add an accessible name and textual equivalent for the timeline.
* Make call names, deadline distances and grouped counts available without relying on SVG, colour, hover or `title` attributes.
* Preserve an honest empty state.

#### Calls-over-time chart

* Add an accessible title and summary or equivalent data representation.
* Expose monthly values to assistive technology.
* Give Open/Closed mode controls correct selected-state and keyboard semantics.
* Do not rely on colour alone to distinguish series.
* Keep the year and represented data period truthful.

#### On-offer versus funded evidence

* Preserve the dashboard’s explicit two-halves treatment.
* Rename dashboard-owned internal values such as `totalCommitted` to an accurate name such as `totalOnOffer`.
* The rename must include producers, consumers, tests and comments in the dashboard slice.
* Do not relabel historical CORDIS contribution as current opportunity funding.
* Preserve provenance and honest unavailable states.
* Do not render zeroes when CORDIS data is unavailable.

#### Research tools

Preserve the existing external contract:

* `dashboardPanel`
* `setDashboardPanel`
* `countryOverlayCode`
* `setCountryOverlayCode`
* field, country and hop-on sidebar navigation

Complete the tab accessibility contract:

* `role="tablist"`
* stable tab IDs
* `aria-selected`
* roving `tabIndex`
* Left/Right arrow navigation
* Home/End navigation
* `aria-controls`
* corresponding `role="tabpanel"`
* predictable focus when activated or closed

Replace dashboard-owned mechanism language such as “across the graph” with user-centred language such as “across the funding landscape”.

#### Theme windows

Preserve the existing fields, geography, organisations, topics, funded activity and saved-view tools.

For each window:

* Opening it must expose its title and purpose to assistive technology.
* Focus must move predictably into the opened window.
* Escape must close the active window.
* Closing must return focus to the launcher.
* Close controls must have specific accessible names.
* Window content must remain fully usable by keyboard.
* Desktop dragging may remain pointer-based, provided it is not required to reach or operate any content.
* At smaller breakpoints, windows must stack without clipping, overlap or horizontal scrolling.

Do not implement a full window-management framework.

#### Terminology

Within dashboard-owned content, replace user-facing mechanism terms where a clearer product term exists:

* “View on graph” → “View in funding map”
* “Show in graph” → “Show in funding map”
* “Back to graph” → “Back to funding map”, if this dashboard-aware shared command is touched

Do not perform a repository-wide rename and do not invent a replacement brand for “EU Knowledge Graph”. Record that global brand string as a separate governance finding if it remains visible.

#### Visual system

* Dark mode remains the reference design.
* Light mode must be a deliberate daylight adaptation.
* Use Signal Blue for primary actions and navigation.
* Use Awarded Green only for historical funded evidence and appropriate success/status communication.
* Remove dashboard-owned uses and fallback values of legacy `#7551FF`.
* Follow the Blue-Glass-Wins, Two-Halves, Mono-Means-Data and Tint-Not-Lift rules.
* Use documented tokens rather than adding near-duplicate colours.
* Preserve visible focus.
* Respect reduced-motion preferences.
* Use existing breakpoint conventions; do not add arbitrary one-off viewport thresholds.
* Avoid unnecessary shadows, glow, oversized headings and excessive nested cards.
* Do not add a new chart, animation or UI dependency.

## Allowed implementation scope

Primary scope:

```text
frontend/src/components/GraphPage/Dashboard/**
frontend/src/styles/components/_dashboard.scss
frontend/src/styles/components/_dashboard-redesign.scss
frontend/src/styles/components/_dashboard-cordis.scss
frontend/src/styles/components/_dashboard-tool-panel.scss
```

Conditionally allowed:

* dashboard-focused test files
* `CommandBar.jsx`, only for dashboard-aware navigation copy or accessibility
* `GraphMainColumn.jsx`, only if required to preserve dashboard coordination
* existing shared money/evidence components, only if a dashboard defect cannot be fixed locally
* `.scratch/dashboard-redesign/**` for curated evidence

Any modification outside these areas must be explained in the delivery report.

## Explicitly out of scope

Do not:

* change backend or API contracts
* redesign the node-detail page
* redesign the graph/funding-map canvas
* redesign compare, chatbot or global navigation
* invent a product name
* create a new top-level CORDIS mode
* add forecasting, ranking, recommendations or success scoring
* add mock activity history
* replace working data hooks with fixtures
* revive unused legacy KPI or hero components without a demonstrated need
* perform a broad design-system cleanup
* rewrite unrelated tests
* commit Playwright session state, browser profiles, videos or `.playwright-cli/`

## Automated tests

Add focused tests using the repository’s existing test framework.

At minimum, cover:

1. Upcoming calls are not labelled Open.
2. Open and closing-soon filtering preserves the expected calls.
3. Indicative totals use on-offer terminology internally and visibly.
4. CORDIS unavailable/empty states do not become funded zeroes.
5. Research-tool tabs support keyboard navigation and correct ARIA relationships.
6. Theme-window Escape handling and focus return.
7. Calls-over-time mode controls expose their selected state.
8. Dashboard-specific banned mechanism strings are absent from dashboard-owned content.
9. Existing call navigation, locate-call and sidebar-to-dashboard wiring still work.

Do not assert only CSS class names when accessible names, roles, state or visible outcomes can be asserted instead.

## Playwright CLI verification

Follow `.claude/skills/playwright-cli/SKILL.md`. Do not invent CLI syntax.

Exercise the real application rather than an isolated static mock.

Verify:

* enter dashboard from the main application
* return to the funding-map view
* All and Closing 30d filters
* open a call-detail page and return
* locate a call in the funding map
* open and close each theme window
* close the active window with Escape
* focus returns to its launcher
* Research tools tabs work with mouse and keyboard
* country, fields and hop-on sidebar entry points activate the correct tool
* Planned/Awarded/Both controls preserve evidence separation
* disabled or unavailable awarded states are understandable
* saved searches and views remain operable
* dark and light themes
* 1440 × 900 and 1024 × 768 layouts
* empty, loading and failed evidence states
* no unexpected horizontal overflow
* no uncaught browser errors
* no new console errors attributable to this ticket

Capture final evidence under:

```text
.scratch/dashboard-redesign/final/
```

Include:

* default dashboard, dark
* default dashboard, light
* one research tool open
* one theme window open
* one honest empty/unavailable evidence state
* relevant accessibility snapshots

Keep only curated evidence. Remove transient Playwright state before committing.

## Final quality pass

After implementation and browser verification, run:

```text
/impeccable polish portfolio dashboard
/impeccable audit
/impeccable doctor
/impeccable hooks status
```

Do not add broad ignore rules to make the audit pass. Fix ticket-owned findings. Clearly distinguish unrelated pre-existing findings in the delivery report.

Run the repository’s complete applicable verification:

* dashboard-focused tests
* full frontend test suite
* lint
* production build

All must pass, or the remaining failure must be shown to be pre-existing and unrelated.

## Acceptance criteria

The ticket is complete when:

* The default dashboard supports a clear monitoring and prioritisation workflow.
* Calls, deadlines, on-offer funding and historical funded evidence have an intentional hierarchy.
* Upcoming calls are never mislabelled Open.
* Advertised funding is never described internally or visibly as committed or awarded.
* CORDIS evidence remains clearly historical, sourced and separate.
* Empty/loading/error states remain honest.
* Dashboard-owned legacy purple is removed.
* Dashboard-specific mechanism copy uses user-centred terminology.
* The calls list, charts, tabs and windows are keyboard and screen-reader understandable.
* Theme-window Escape and focus-return behaviour works.
* Existing dashboard navigation and data wiring are preserved.
* Dark, light and responsive layouts pass Playwright verification.
* Focused tests, the full suite, lint and production build pass.
* Impeccable audit and doctor are clean for ticket-owned work.
* No application data, mock content or unsupported claims were introduced.
* `.playwright-cli/` and other transient browser artifacts are not committed.

## Stop conditions

Stop and report rather than guessing if:

* the previous node-detail closure is still mixed into the worktree
* Impeccable doctor or hook status is not clean before dashboard work
* the dashboard cannot be populated with representative returned data
* a required API or backend change appears necessary
* the product name or global brand must be decided to continue
* advertised and awarded data cannot be distinguished from the available response
* tests reveal an unrelated repository-wide failure that prevents trustworthy verification

## Delivery report

Return:

1. Starting and ending commit/status.
2. Concise summary of the redesigned workflow.
3. Files changed and why.
4. Data and navigation contracts preserved.
5. Accessibility improvements.
6. Terminology and evidence-honesty corrections.
7. Impeccable critique, polish, audit, doctor and hook results.
8. Playwright scenarios and viewport/theme matrix.
9. Test, lint and build commands with results.
10. Links or paths to curated before/after evidence.
11. Remaining risks and explicitly deferred findings.
12. Confirmation that transient Playwright artifacts were removed and no unrelated application code was changed.
