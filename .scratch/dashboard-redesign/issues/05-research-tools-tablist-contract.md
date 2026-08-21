# 05 — Research tools: full tablist contract and mechanism-free copy

Status: ready-for-agent

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

- [ ] Research-tool tabs support arrow/Home/End keyboard navigation with roving tabIndex and correct ARIA tablist/tab/tabpanel relationships, covered by a focused test (min-test 5)
- [ ] Focus behaves predictably on tab activation and panel close
- [ ] The external panel contract (`dashboardPanel`, `setDashboardPanel`, `countryOverlayCode`, `setCountryOverlayCode`, sidebar entry points) is unchanged, covered by the wiring test (min-test 9, this slice's share)
- [ ] No "graph" mechanism language remains in panel-owned copy, covered by the banned-strings test for this surface (min-test 8, this slice's share)
- [ ] Playwright CLI verifies tabs by mouse and keyboard, and that country/fields/hop-on sidebar entry points activate the correct tool
- [ ] Frontend tests and production build pass

## Blocked by

- `01-baseline-critique-and-plan.md`
