# 06 — Theme windows: keyboard/focus contract and responsive stacking

Status: done (2026-08-21, slice 06 commit on `go_live_dashboard_redesign`)

## Parent

`.scratch/product-vision/DASHBOARD_PLAYWRIGHT_REDESIGN.md` (the dashboard-redesign ticket).

## What to build

Give the draggable theme windows (fields, geography, organisations, topics, funded activity, saved-view tools) a complete keyboard and focus contract, and make them stack honestly at smaller breakpoints. Preserve all existing window tools; do **not** build a window-management framework.

For each window:

- Opening it exposes its title and purpose to assistive technology.
- Focus moves predictably into the opened window.
- Escape closes the active window.
- Closing returns focus to the launcher that opened it.
- Close controls have specific accessible names (not a bare "×").
- Window content is fully usable by keyboard.
- Desktop dragging may stay pointer-based, provided dragging is never required to reach or operate any content.
- At smaller breakpoints, windows stack without clipping, overlap, or horizontal scrolling — using the existing shared breakpoint conventions, not new one-off thresholds.

The default dashboard must remain useful when every optional theme window is closed.

Leave the windows' legacy purple accent values alone in this slice — the palette sweep is slice 07.

## Acceptance criteria

- [x] Each theme window announces its title/purpose on open and receives focus predictably
      (dialog `aria-labelledby` title + `aria-describedby` purpose subtitle; container takes focus on open)
- [x] Escape closes the active window and focus returns to its launcher, covered by a focused test (min-test 6)
      (`ThemeWindows.test.jsx`)
- [x] Close controls have specific accessible names ("Close <title>"); window body is a labelled
      focusable region so overflow content scrolls by keyboard
- [x] Below the large breakpoint, windows stack with no clipping, overlap, or horizontal scrolling
      (existing `--stacked` column, shared `lg` breakpoint; live-verified at 1024×768)
- [x] Saved searches and saved views remain operable (unit + live)
- [x] Playwright CLI verified open/close of all 7 windows, Escape handling, focus return, and the
      1024×768 stacked layout in the running app (evidence: `06-evidence-stacked-1024.png`,
      `06-evidence-clean-arrival-1024.png`)
- [x] Frontend tests (70/70) and production build pass

## Delivery notes

- Also closes the CRITIQUE.md **[P0]** finding assigned here by PLAN.md Slice A: the portaled
  `.dash-windows-layer` now mounts only while ≥1 window is open, so sub-lg viewports arrive
  undimmed and clickable (live-verified: `elementFromPoint` hits the calls table).
- `noMechanismCopy.js` ban tightened to whole-word `/\bgraphs?\b/i` — the Geography window title
  was a substring false positive of the kind the helper's doc already anticipated ("demography").
- Escape closes the *focused* window only (contract: "the active window"); a stacked window that
  doesn't own focus is closed via its named close control.
- Known stacked-mode behaviour (pre-existing, unchanged): while a window is open below lg, the
  scrim intercepts pointer clicks on the theme bar, so a second window opens via keyboard or by
  closing the first. Candidate for slice 07 polish if desired (e.g. backdrop click closes).
- Environment finding, out of scope (backend): `/cordis/top-organisations?top_n=15` returns 500 in
  the dev stack; the Organisations window correctly shows the honest "couldn't load" state.

## Blocked by

- `01-baseline-critique-and-plan.md`
