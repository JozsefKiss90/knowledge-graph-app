# 01 — Baseline critique and implementation plan

Status: ready-for-agent

## Parent

`.scratch/product-vision/DASHBOARD_PLAYWRIGHT_REDESIGN.md` (the dashboard-redesign ticket).

## What to build

The setup/prefactor slice: establish a clean starting boundary, capture the current dashboard as curated evidence, and produce the critique and implementation plan that every later slice refines against. No dashboard code changes in this slice.

Concretely:

1. Work on `go_live`. Run `git status` and record the starting commit. Confirm the previous node-detail ticket is either fully closed and committed separately or cleanly excluded — do not let its leftovers mix into dashboard work.
2. Run `/impeccable doctor` and `/impeccable hooks status`. Both must be clean. Do **not** run `/impeccable init` or `/impeccable document` — durable product/design context already exists.
3. Read the binding context before anything else: `PRODUCT.md`, `DESIGN.md`, `.impeccable/design.json`, `CONTEXT.md`, `UX-DECISIONS.md`, `AGENTS.md`, `CLAUDE.md`, ADRs 0001/0002/0006, and the playwright-cli skill. These are authoritative over `DASHBOARD_PLAN.md`, `DASHBOARD_REDESIGN_PROMPT.md`, old screenshots, and unused legacy dashboard components (historical reference only; in particular ignore old instructions extending the Vision-UI purple palette).
4. Start the app with the repository's documented commands and use Playwright CLI (per the skill — don't invent syntax) to capture the current dashboard with realistic returned data at: 1440×900 dark, 1024×768 dark, 1440×900 light, and one honest empty/unavailable CORDIS state. Store curated captures under `.scratch/dashboard-redesign/baseline/`.
5. Run `/impeccable critique portfolio dashboard`, reviewing at minimum: hierarchy/decision usefulness, advertised-vs-awarded separation, information density, terminology, responsive behaviour, keyboard operation, focus visibility, chart accessibility, empty/loading/error states, and visual consistency with `DESIGN.md`. Write findings to `.scratch/dashboard-redesign/CRITIQUE.md`, separating ticket findings from pre-existing out-of-scope repository debt.
6. Run `/impeccable shape portfolio dashboard` and write a concise implementation plan to `.scratch/dashboard-redesign/PLAN.md`. The proposed hierarchy prioritises: (1) calls/deadlines requiring attention, (2) indicative funding on offer, (3) historical funded evidence, (4) deeper thematic exploration, (5) saved views and secondary tools. No mock activity feeds, fake deltas, forecasts, scores, recommendations, or inert controls.

**Stop and report instead of guessing** if: the node-detail closure is still mixed into the worktree; doctor or hook status is not clean; or the dashboard cannot be populated with representative returned data.

## Acceptance criteria

- [ ] Starting commit recorded and worktree boundary confirmed clean of node-detail leftovers
- [ ] `/impeccable doctor` and `/impeccable hooks status` both clean (or a blocker reported)
- [ ] Four curated baseline captures (dark 1440×900, dark 1024×768, light 1440×900, honest empty/unavailable CORDIS state) exist under `.scratch/dashboard-redesign/baseline/`, taken from the real running app
- [ ] `.scratch/dashboard-redesign/CRITIQUE.md` written, with ticket findings separated from pre-existing debt
- [ ] `.scratch/dashboard-redesign/PLAN.md` written with the five-level hierarchy above
- [ ] No dashboard source files changed; no transient Playwright state (`.playwright-cli/`, profiles, videos) left for commit

## Blocked by

None - can start immediately.
