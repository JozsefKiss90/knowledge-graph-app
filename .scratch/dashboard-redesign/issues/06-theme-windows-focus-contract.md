# 06 — Theme windows: keyboard/focus contract and responsive stacking

Status: ready-for-agent

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

- [ ] Each theme window announces its title/purpose on open and receives focus predictably
- [ ] Escape closes the active window and focus returns to its launcher, covered by a focused test (min-test 6)
- [ ] Close controls have specific accessible names; all window content operates by keyboard
- [ ] Below the large breakpoint, windows stack with no clipping, overlap, or horizontal scrolling
- [ ] Saved searches and saved views remain operable
- [ ] Playwright CLI verifies open/close of each theme window, Escape handling, and focus return in the running app
- [ ] Frontend tests and production build pass

## Blocked by

- `01-baseline-critique-and-plan.md`
