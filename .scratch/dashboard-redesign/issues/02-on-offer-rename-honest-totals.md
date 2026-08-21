# 02 — On-offer vs funded honesty: the totalOnOffer rename and honest empty states

Status: ready-for-agent

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

- [ ] No `totalCommitted` (or other committed/allocated/spent/awarded wording for advertised money) remains anywhere in dashboard-owned code, tests, or comments
- [ ] The rendered dashboard labels advertised totals as indicative / on offer
- [ ] Historical CORDIS values remain clearly historical, sourced, and separate from on-offer values
- [ ] CORDIS unavailable/empty states render an honest message, never funded zeroes
- [ ] Focused tests cover: indicative totals use on-offer terminology internally and visibly (min-test 3); CORDIS unavailable/empty states do not become funded zeroes (min-test 4)
- [ ] Existing dashboard data wiring is preserved; frontend tests and production build pass

## Blocked by

- `01-baseline-critique-and-plan.md`
