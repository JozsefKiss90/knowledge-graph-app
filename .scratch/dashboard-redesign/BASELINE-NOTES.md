# Slice 01 — Baseline boundary record

Recorded 2026-08-21 (issue `issues/01-baseline-critique-and-plan.md`, AC 1–2 evidence).

## Starting point

- **Branch:** `go_live_dashboard_redesign` (created off the ticket's `go_live` line for this
  redesign; the ticket text says "work on `go_live`" — the dedicated branch is the working copy of
  that instruction).
- **Starting commit:** `aa1ba9d` — "redesigned node detail". The previous node-detail ticket is
  fully closed and committed there; `git status` at slice start showed **no** frontend/backend
  source modifications — only unrelated skill-manager churn under `.agents/skills/`,
  `.claude/skills/`, `skills-lock.json` (pre-existing, excluded from this feature's commits) and
  the untracked `.scratch/dashboard-redesign/` ticket docs. Boundary confirmed clean of
  node-detail leftovers.
- **Discovered during cleanup:** commit `aa1ba9d` had accidentally committed 38 transient
  `.playwright-cli/` files. Removed in this slice (separate cleanup commit) and `.playwright-cli/`
  added to `.gitignore`, per the parent ticket's "do not commit `.playwright-cli`" rule.

## Impeccable gates (run at slice start, before any capture)

- `/impeccable doctor` (`doctor.mjs --json`): `findings: []` — **clean** (rule registry available,
  platform web, PRODUCT.md + DESIGN.md resolved).
- `/impeccable hooks status` (`hook-admin.mjs status`): **enabled**, no ignoreRules / ignoreFiles /
  ignoreValues, no env override, config at defaults — **clean**.

## Capture method

Dev stack: `docker compose -f docker-compose.dev.yml` (backend :8000, frontend :3001, Neo4j
2026.02.2 with the restored local graph — 101,479 CORDIS projects, 559 tagged calls). Captures via
`playwright-cli` per `.claude/skills/playwright-cli/SKILL.md` against
`http://localhost:3001/?view=dashboard`; dark is the app default, light via the right-rail theme
toggle; the "honest empty/unavailable" state captured by 503-blocking `**/cordis/**` routes and
reloading (real app failure path, not a mock). Transient `.playwright-cli/` state deleted after
capture.
