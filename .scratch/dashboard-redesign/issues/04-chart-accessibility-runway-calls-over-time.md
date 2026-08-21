# 04 — Chart accessibility: deadline runway and calls-over-time

Status: ready-for-agent

## Parent

`.scratch/product-vision/DASHBOARD_PLAYWRIGHT_REDESIGN.md` (the dashboard-redesign ticket).

## What to build

Make the two dashboard visualisations — the deadline runway and the calls-over-time chart — fully understandable without sight of the SVG, while preserving their visual overview and honest states.

Deadline runway:

- Preserve the visual overview and the honest empty state.
- Add an accessible name and a textual equivalent for the timeline.
- Call names, deadline distances, and grouped counts must be available without relying on SVG, colour, hover, or `title` attributes.

Calls-over-time chart:

- Add an accessible title and summary, or an equivalent data representation; expose monthly values to assistive technology.
- Give the Open/Closed mode controls correct selected-state and keyboard semantics.
- Do not rely on colour alone to distinguish series.
- Keep the year and the represented data period truthful.

Do not add a new chart, animation, or UI dependency; refine the existing components.

## Acceptance criteria

- [ ] The runway timeline has an accessible name and a textual equivalent exposing call names, deadline distances, and grouped counts
- [ ] The runway's honest empty state is preserved
- [ ] The calls-over-time chart has an accessible title/summary and its monthly values are exposed to assistive technology
- [ ] Open/Closed mode controls expose their selected state and operate by keyboard, covered by a focused test (min-test 7)
- [ ] Series are distinguishable without colour; the stated data period matches the data actually shown
- [ ] Verified in the running app via Playwright CLI accessibility snapshots; frontend tests and production build pass

## Blocked by

- `01-baseline-critique-and-plan.md`
