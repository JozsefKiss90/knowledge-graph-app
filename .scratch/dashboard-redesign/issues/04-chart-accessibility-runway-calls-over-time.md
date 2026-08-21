# 04 — Chart accessibility: deadline runway and calls-over-time

Status: ready-for-human

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

- [x] The runway timeline has an accessible name and a textual equivalent exposing call names, deadline distances, and grouped counts
- [x] The runway's honest empty state is preserved
- [x] The calls-over-time chart has an accessible title/summary and its monthly values are exposed to assistive technology
- [x] Open/Closed mode controls expose their selected state and operate by keyboard, covered by a focused test (min-test 7)
- [x] Series are distinguishable without colour; the stated data period matches the data actually shown
- [x] Verified in the running app via Playwright CLI accessibility snapshots; frontend tests and production build pass

## Evidence

- `04-evidence-runway-text-equivalent.png` — the runway with its "All 8 deadlines in view"
  disclosure open (real data, dark, 1440×900).
- `04-evidence-calls-over-time.png` — the chart with the period chip, the series caption and the
  Monthly-values table open.
- Playwright accessibility snapshot: the track exposes
  `img "Deadline runway: 8 calls with deadlines, 8 calls plotted over the next 6 weeks. Next
  deadline: Centres of Vocational Excellence in 12 days."`, the chart exposes `img "Calls over
  time"` with the described series/period, `table "Calls over time — Open & forthcoming calls per
  month, Jan–Dec 2026"`, and `button "Open & forthcoming" [pressed]` / `button "Closed"`.
- Keyboard, in the running app: Tab reaches the mode buttons and Enter flips `aria-pressed`; the
  disclosures focus with a visible 2px accent ring and toggle on Enter.

## Notes

- The chart's "Open" series was already the sum of open **and** forthcoming counts, so the control
  is now labelled `Open & forthcoming` — the slice-03 status truth applied to the chart legend.
- The period chip is derived from the buckets it plots rather than from `new Date().getFullYear()`,
  so the chart can no longer state a period wider than its data. **It does not widen the window:**
  `bucketCallsByMonth` (`GraphPage/TimelineScrubber/utils.js:145`) still buckets the calendar year,
  so in the running app the chip reads `Jan–Dec <this year>` and next January's openings remain
  out of view. That is a data-layer change shared with the landing-page timeline — recorded here as
  follow-up, not done in this slice.
- An all-zero series now shows an honest empty state ("No closed calls in Jan–Dec 2026") instead of
  a flat line summarised as "highest 0 in Jan" (ADR-0006 §1/§2). This is why the chart's empty
  branch is reachable at all.
- Series colours moved onto `--d2-open` / `--d2-closed` (set via `style` so the `var()` resolves),
  which keeps the plot, the legend dot and light mode on one definition.
- Pre-existing debt left for later slices: the runway's hardcoded stat hexes (slice 07 / light-mode
  tokens) and the sub-11px functional labels flagged by the design hook across this stylesheet.

## Blocked by

- `01-baseline-critique-and-plan.md`
