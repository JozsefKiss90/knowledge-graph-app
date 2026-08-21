# 02 — On-offer vs funded honesty: the totalOnOffer rename and honest empty states

Status: ready-for-human

## Parent

`.scratch/product-vision/DASHBOARD_PLAYWRIGHT_REDESIGN.md` (the dashboard-redesign ticket).

## What to build

Make the dashboard's money language truthful end-to-end, per the honesty contract: advertised funding is **indicative funding currently on offer** — never committed, allocated, spent, or awarded. Awarded funding is historical CORDIS activity. The two are separate evidence axes; counts are not funding, funding is not impact.

The slice cuts through the dashboard data layer, the two-halves evidence strip, KPI consumers, visible labels, and tests:

- Rename the dashboard-owned internal value `totalCommitted` to an accurate name such as `totalOnOffer`. The rename must cover the producer (the dashboard data hook), every consumer (the on-offer/funded evidence strip, KPI rows, the dashboard shell), tests, and comments — the whole dashboard slice, and only the dashboard slice.
- Advertised budgets and totals must be visually and semantically identified as indicative/on offer in the rendered UI.
- Do not relabel historical CORDIS contribution as current opportunity funding; preserve the dashboard's explicit two-halves treatment and provenance/freshness/EU-only scope where the product context requires it.
- Honest unavailable states: when CORDIS data is unavailable, do not render funded zeroes or misleading rows of zeroes — show an honest unavailable/empty state. Do not display data the application did not return.

Out of scope: backend/API changes, repository-wide renames, visual/palette changes (slice 07).

## Acceptance criteria

- [x] No `totalCommitted` (or other committed/allocated/spent/awarded wording for advertised money) remains anywhere in dashboard-owned code, tests, or comments
- [x] The rendered dashboard labels advertised totals as indicative / on offer
- [x] Historical CORDIS values remain clearly historical, sourced, and separate from on-offer values
- [x] CORDIS unavailable/empty states render an honest message, never funded zeroes
- [x] Focused tests cover: indicative totals use on-offer terminology internally and visibly (min-test 3); CORDIS unavailable/empty states do not become funded zeroes (min-test 4)
- [x] Existing dashboard data wiring is preserved; frontend tests and production build pass

## Blocked by

- `01-baseline-critique-and-plan.md`

## Delivery note (2026-08-21)

- `totalCommitted` → `totalOnOffer` across producer (`useDashboardData`), live consumers
  (`OfferFundedStrip`, `PortfolioDashboard`) and the dead-but-owned `KpiCardsRow`/`KpiTileRow`
  (unmounted; slice G's candidate cleanup decides their deletion). The string survives only as
  negative assertions in the new tests.
- Strip: on-offer figure now labelled "INDICATIVE FUNDING"; funded half resolves one of four
  honest states (populated / checking / couldn't-be-loaded / appears-once-ingested) with matched
  tooltip — a fetch error never claims "not ingested", and no state renders funded zeroes.
- **As-of freshness (Slice D assumption): verified absent.** `/cordis/portfolio-summary` returns
  no ingest/as-of timestamp, so the strip stays source-only ("Source: EU CORDIS") per the plan's
  stop condition; timestamp recorded as an out-of-scope backend gap (see PLAN.md §9).
- Out-of-slice fixes needed to make "frontend tests pass" true: pinned the fake-timer date in
  `NodeDetail.callheader.test.jsx` via `jest.setSystemTime` (Jest 27 ignores the options object,
  so its day-count tests drifted daily), and deleted the stock CRA `App.test.js` boilerplate
  (asserted a "learn react" link that never existed in this app).
