# 07 — Visual system sweep and final quality pass

Status: done (2026-08-22 — see ../DELIVERY-REPORT.md)

## Parent

`.scratch/product-vision/DASHBOARD_PLAYWRIGHT_REDESIGN.md` (the dashboard-redesign ticket).

## What to build

The closing slice: bring the whole dashboard onto the documented visual system, then run the full verification gates and produce the delivery report.

Visual system (dashboard-owned surfaces only):

- Remove every dashboard-owned use and fallback value of legacy `#7551FF` (window accents, KPI tile tones, shell accent props).
- Use Signal Blue for primary actions and navigation; Awarded Green only for historical funded evidence and appropriate success/status communication.
- Follow the Blue-Glass-Wins, Two-Halves, Mono-Means-Data, and Tint-Not-Lift rules; use documented tokens rather than near-duplicate colours.
- Dark mode remains the reference design; light mode is a deliberate daylight adaptation.
- Preserve visible focus; respect reduced-motion preferences; existing breakpoint conventions only.
- Avoid unnecessary shadows, glow, oversized headings, and nested-card excess. No new chart/animation/UI dependency.

Final quality pass (after the visual work):

- `/impeccable polish portfolio dashboard`, `/impeccable audit`, `/impeccable doctor`, `/impeccable hooks status`. No broad ignore rules to make the audit pass; fix ticket-owned findings and clearly separate pre-existing ones.
- A banned-strings test asserting dashboard-specific mechanism strings are absent from dashboard-owned content (min-test 8, consolidated).
- Full Playwright CLI matrix on the real app: dashboard entry/exit, filters, call-detail round-trip, locate-in-map, every theme window + Escape + focus return, research-tool tabs by mouse and keyboard, sidebar entry points, Planned/Awarded/Both evidence separation, unavailable-awarded states, saved searches/views, dark + light themes, 1440×900 and 1024×768, empty/loading/failed evidence states, no horizontal overflow, no uncaught or new console errors.
- Curated final evidence under `.scratch/dashboard-redesign/final/`: default dashboard dark + light, one research tool open, one theme window open, one honest empty/unavailable evidence state, relevant accessibility snapshots. Remove transient Playwright state before committing.
- Full frontend test suite, lint, and production build — all pass, or remaining failures shown pre-existing and unrelated.
- Write the delivery report per the parent ticket (commits, workflow summary, files changed, contracts preserved, accessibility and terminology corrections, impeccable + Playwright + test/lint/build results, evidence paths, deferred findings, confirmation that transient artifacts were removed).

## Acceptance criteria

- [x] No dashboard-owned `#7551FF` (or near-duplicate substitutes) remains; Signal Blue / Awarded Green used per the documented rules (shared era/programme data palettes deferred with rationale — report §11)
- [x] Light mode is a deliberate adaptation and both themes pass Playwright verification at both viewports
- [x] Visible focus and reduced-motion preferences respected across the dashboard
- [x] Impeccable polish, audit, doctor, and hooks status clean for ticket-owned work, without new broad ignore rules
- [x] Consolidated banned-mechanism-strings test passes (min-test 8) — and caught a live "call nodes" leak
- [x] Full Playwright matrix passes with curated evidence in `.scratch/dashboard-redesign/final/`; no transient Playwright state staged
- [x] Dashboard-focused tests, full frontend suite (76/76), lint, and production build pass (pre-existing warnings only)
- [x] Delivery report written covering all twelve points in the parent ticket (`../DELIVERY-REPORT.md`)

## Blocked by

- `02-on-offer-rename-honest-totals.md`
- `03-calls-deadlines-status-semantics.md`
- `04-chart-accessibility-runway-calls-over-time.md`
- `05-research-tools-tablist-contract.md`
- `06-theme-windows-focus-contract.md`
