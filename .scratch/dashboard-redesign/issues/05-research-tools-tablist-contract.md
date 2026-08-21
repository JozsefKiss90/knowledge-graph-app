# 05 — Research tools: full tablist contract and mechanism-free copy

Status: done (2026-08-21)

## Parent

`.scratch/product-vision/DASHBOARD_PLAYWRIGHT_REDESIGN.md` (the dashboard-redesign ticket).

## What to build

Complete the accessibility contract of the research-tools panel (fields / country activity / hop-on tabs) and remove mechanism language from its copy, without changing its external contract.

Preserve exactly: `dashboardPanel`, `setDashboardPanel`, `countryOverlayCode`, `setCountryOverlayCode`, and the field/country/hop-on sidebar navigation into the panel (sidebar buttons navigate to the dashboard and activate the correct tool — see the cordis-dashboard-tool-panel convention).

Complete the tab contract:

- `role="tablist"`, stable tab IDs, `aria-selected`, roving `tabIndex`
- Left/Right arrow navigation, Home/End navigation
- `aria-controls` pointing at a corresponding `role="tabpanel"`
- predictable focus when a tab is activated or the panel is closed

Copy: replace dashboard-owned mechanism language such as "across the graph" with user-centred language such as "across the funding landscape". Dashboard-owned content only — no repository-wide sweep.

## Acceptance criteria

- [x] Research-tool tabs support arrow/Home/End keyboard navigation with roving tabIndex and correct ARIA tablist/tab/tabpanel relationships, covered by a focused test (min-test 5)
- [x] Focus behaves predictably on tab activation and panel close
- [x] The external panel contract (`dashboardPanel`, `setDashboardPanel`, `countryOverlayCode`, `setCountryOverlayCode`, sidebar entry points) is unchanged, covered by the wiring test (min-test 9, this slice's share)
- [x] No "graph" mechanism language remains in panel-owned copy, covered by the banned-strings test for this surface (min-test 8, this slice's share)
- [x] Playwright CLI verifies tabs by mouse and keyboard, and that country/fields/hop-on sidebar entry points activate the correct tool
- [x] Frontend tests and production build pass (64 tests, 10 suites; build compiles with the pre-existing warnings only)

## Evidence

- `05-evidence-tablist-focus.png` — the panel at 1440×900 (dark, real data) with Fields active and
  the Country tab keyboard-focused, showing the 2px accent focus ring the roving strip needs.
- Live ARIA, running app: `tablist "Research tools"` with
  `tab "Research fields" [selected] tabindex=0 aria-controls=dash-tool-tabpanel-fields`,
  the other two `aria-selected=false tabindex=-1`, and
  `tabpanel#dash-tool-tabpanel-fields aria-labelledby=dash-tool-tab-fields`.
- Keyboard, running app: ArrowRight moves focus (`dash-tool-tab-hopOn`) while the selection stays
  on `dash-tool-tab-country`; Enter then activates it (`?panel=hopOn`, panel swaps, focus stays on
  the tab); Home → first tab, End → last tab, ArrowRight from the last wraps to the first.
- Mouse, running app: clicking `#dash-tool-tab-country` selects it, swaps the tabpanel and keeps
  focus on the tab. Closing the panel returns focus to the tab that was showing
  (`active: dash-tool-tab-hopOn`, no tabpanel, idle intro rendered).
- Entry points, running app: the rail's "Funded landscape" → `?panel=fields` with the Fields tab
  selected and holding the tab stop; the command palette's "Research fields (CORDIS)" / "Country
  activity overlay" / "Hop-on opportunities" → `?panel=fields` / `country` / `hopOn`, each
  selecting the matching tab. The rail carries **one** landscape shortcut by design (Q5.2 collapsed
  the three glyphs into one labelled shortcut), so country and hop-on are entered from the palette —
  the ticket's "country/fields/hop-on sidebar entry points" phrasing predates that collapse.
- Copy, running app: the idle intro reads "funded across the funding landscape"; the country tool
  reads "across the funding landscape" and "Highlights show in the funding map…". Scanning the
  panel's rendered text and its `aria-*`/`title` attributes for /graph/i returns nothing but real
  EuroSciVoc field names in live data ("cryptography", "demography", "geographic information
  systems") — data, not copy.
- 1024×768: no horizontal overflow from the panel; console shows 0 errors (2 pre-existing React
  Router future-flag warnings).

## Notes

- **Manual activation, not automatic.** Arrows move focus only; Enter/Space activates. Each tool
  fetches on mount, so arrowing across the strip must not fire three requests.
- Only the active tool's panel is rendered, so `aria-controls` is set on the selected tab alone —
  never pointing at an id that isn't in the document.
- The strip goes icon-only under 560px, which would leave the tabs unnamed, so each tab carries
  `aria-label` with its full tool name (which contains the visible short label).
- The tabs use `all: unset`, which dropped the UA focus ring; a `:focus-visible` ring on
  `--d2-accent` was added (same shape as slice 04's disclosure ring) because a roving tabIndex
  strip is unusable without one.
- **Opening the panel from outside does not move focus**, deliberately. The panel can't tell who
  opened it, and an opener that keeps its own focus must not have it yanked away; a first attempt
  inferred the opener from `document.activeElement` and both code reviews rejected the heuristic.
  Instead the tab stop follows the activated tool, so the next Tab lands on the right tab. The
  panel still scrolls itself into view, as before.
- The panel is closable, so its idle state honestly has **no** selected tab (all `aria-selected`
  false, no tabpanel) rather than a fake selection; the strip keeps one tab stop so the keyboard can
  still reach it. This is the state the baseline critique saw as "aria-selected currently all-false".
- Focus return on close is wired to the panel's **own** close button. Other close paths (a view
  switch, a URL change) tear down or navigate away from the surface, where returning focus into the
  strip would be wrong.
- **Follow-up defect found, not fixed here (out of the plan's scope boundary):** every right-rail
  button in `SidebarControls.jsx` is destroyed and recreated on click — `RailButton` and
  `SectionDivider` are defined inside the component body, so each render is a new component type
  and the whole rail remounts. Verified in the running app: after clicking a rail button the node
  is gone (`sameNode: false`, `stillInDoc: false`) and `document.activeElement` is `BODY`. Every
  rail interaction therefore loses keyboard focus (WCAG 2.4.3). Fix = hoist those two components to
  module scope and pass `expanded` as a prop; worth its own slice since it touches all eight rail
  buttons. Until then, a keyboard user entering from the rail resumes tabbing from the document, not
  from the panel — which is the precondition any "focus follows the opener" behaviour would need.
- Two small overlaps with later slices, taken here because this surface needed them: the tabs'
  `:focus-visible` ring (slice G's line item — a roving strip is unusable without it) and the close
  button's specific accessible name (slice F's line item).
- The banned-mechanism-string sweep is now one shared helper (`Dashboard/noMechanismCopy.js`) used
  by this slice and slice 03's calls-table test; slices 06–07 should reuse it. It scans **static**
  copy: live EuroSciVoc names legitimately contain "graph", so surfaces are rendered with stub data.

## Blocked by

- `01-baseline-critique-and-plan.md`
