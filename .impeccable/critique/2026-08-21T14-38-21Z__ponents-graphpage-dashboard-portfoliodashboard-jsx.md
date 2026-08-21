---
target: portfolio dashboard
total_score: 28
max_score: 40
na_heuristics: 
p0_count: 1
p1_count: 2
timestamp: 2026-08-21T14-38-21Z
slug: ponents-graphpage-dashboard-portfoliodashboard-jsx
---
# Portfolio Dashboard — Baseline Critique

Method: dual-agent (A: design-review sub-agent · B: detector/browser-evidence sub-agent), synthesized 2026-08-21.
Target: `frontend/src/components/GraphPage/Dashboard/PortfolioDashboard.jsx` (the `?view=dashboard` surface).
Mode: **Operate** (monitoring hub for the research-office professional's Tuesday pull).

Baseline evidence (real running app, local CORDIS graph with 101,479 projects / €187.7B):

| Capture | File |
|---|---|
| Dark 1440×900 | `baseline/dashboard-dark-1440x900.png` |
| Dark 1024×768 | `baseline/dashboard-dark-1024x768.png` (shows the P0 scrim defect) |
| Light 1440×900 | `baseline/dashboard-light-1440x900.png` |
| Honest CORDIS-unavailable state | `baseline/dashboard-dark-cordis-unavailable.png` (CORDIS endpoints blocked with 503) |
| Accessibility tree, dark 1440×900 | `baseline/dashboard-dark-1440x900-a11y-snapshot.yml` |

## Design Health Score

| # | Heuristic | Score | Key Issue |
|---|-----------|-------|-----------|
| 1 | Visibility of System Status | 3 | Loading and fetch-error both render the "appears once ingested" line — status can lie |
| 2 | Match System / Real World | 3 | "in 12 days", programme names ✓; "View on graph" / "across the graph" = banned mechanism language |
| 3 | User Control and Freedom | 3 | Below 1100px the stacked window scrim traps the user with no escape (P0) |
| 4 | Consistency and Standards | 2 | Two chrome grammars: quiet blue-glass shell vs seven rainbow-accented windows; three different tab styles |
| 5 | Error Prevention | 3 | Honest disabled Awarded tabs ✓; the empty stacked scrim is itself an unprevented error state |
| 6 | Recognition Rather Than Recall | 3 | Runway cluster contents are hover-`title`-only (invisible to touch/keyboard) |
| 7 | Flexibility and Efficiency | 3 | ⌘K, saved views, deep links ✓; no sort/filter/search on the 344-call list beyond one coarse chip |
| 8 | Aesthetic and Minimalist Design | 3 | Calm main grid; theme-window layer reintroduces decorative accents + a regex-guessed "Topics" chart |
| 9 | Error Recovery | 2 | Top-level CORDIS fetch failure is conflated with "not ingested" — mis-diagnosis by design |
| 10 | Help and Documentation | 3 | Idle tool-panel teaching intro ✓; provenance tooltip hover-only, no "as of" date |
| **Total** | | **28/40** | **Good (lower edge) — solid foundation, address weak areas** |

## Design Specificity Verdict

**Authored for this product, not category-interchangeable.** The honesty contract is executed in code: `CordisGate` distinguishes not-ingested / fetch-failed / loading / ingested-but-empty; `FundingByProgramme` refuses zero-length awarded bars and states measures are "shown side by side, not subtracted"; the Budget column wears an aria-labelled "Indicative · on offer" badge; the strip splits ON OFFER / FUNDED with "Source: EU CORDIS". The Deadline Runway is a persona-specific instrument, not a stock widget. The surface reverts to generic dashboard genes exactly where it breaks: draggable rainbow-accented floating windows, a regex-guessed Topics chart, and mechanism words leaking into copy.

**Deterministic scan (Assessment B):** JSX scan of the whole Dashboard folder: **clean (0 findings)**. CSS scan: 4 findings (2× `transition: width` on chart bar fills — benign one-shot reveals but real layout animation; 2× `overused-font` Inter declarations). Live-DOM pass on the running page: **123 findings** — 70× undersized UI text (8–10.5px functional labels), 16× low-contrast (all one root cause: `#697f9f` on `#0f2244`, 3.9:1 vs 4.5:1 needed, per calls-table row), 18× dark-glow (mostly the green "Open"-chip glow repeated per row), 11× tiny body text, 4× thin-border-wide-shadow, 1× radial spotlight, 1× repeating stripes. Note the tension: DESIGN.md itself sanctions 8.5–10px data-mono, so some undersized-text hits are system-intended; the 3.9:1 muted-text contrast and per-row green glows are not.

## Overall Impression

The dashboard already answers the Tuesday question ("what needs attention now?") in ~5 seconds — deadline-sorted calls, relative deadlines, a six-week runway. The two-halves discipline is genuinely encoded. But it collapses at tablet widths (P0), tells one material untruth (upcoming calls badged "Open"), still wears the banned purple on its most prominent window, and its signature instruments (runway, area chart) are invisible to keyboard and screen-reader users. Biggest single opportunity: make the default view truthful and reachable everywhere before adding anything.

## What's Working

1. **Honesty contract in code, not just copy** — four-state `CordisGate`, no zero-length awarded bars, italic pre-ingest line in the strip (verified live with CORDIS blocked: no zero rows rendered).
2. **Deadline Runway as a real instrument** — lock-step with visible rows, clustered dots with count badges, "+N beyond" overflow, three summary tiles.
3. **Dual-measure literacy** — Planned/Awarded bars pair color with hatching + text tags and per-measure scaling, with an explicit "never subtracted" note.

---

## Ticket Findings (in scope for the redesign)

### [P0] Stacked window layer blocks the entire dashboard below 1100px
- **What:** `.dash-windows-layer--stacked` (`_dashboard-redesign.scss:890-901`) is always mounted via portal with `pointer-events: auto`, `z-index: 1000`, and a `rgba(3,8,28,.55)` scrim below the lg breakpoint — even with zero windows open. Verified live at 1024×768: `document.elementFromPoint(500,400)` returns the layer; the page is dimmed and click-dead on arrival (see `baseline/dashboard-dark-1024x768.png`).
- **Why:** PRODUCT.md claims tablet-up support; on any tablet the monitoring home is unusable at the front door.
- **Fix:** only portal the layer (or only apply scrim + interactivity) when at least one window is open (`WIN_KEYS.some(k => open[k])` in `PortfolioDashboard.jsx`).

### [P1] Upcoming calls wear a green "Open" pill
- **What:** `useDashboardData.js` computes `status: "upcoming"`, but `OpenCallsTable.jsx:177` renders only `closing ? "Closing" : "Open"`; the strip's "OPEN CALLS 344" and subtitle "344 open" count `open + upcoming` together.
- **Why:** truthful-label class of honesty-contract violation (ADR-0006); an advisor forwarding "this is open" for a call opening next month is wrong in a way that costs trust.
- **Fix:** third pill state ("Forthcoming" / "Opens <date>", slate not green) keyed off `c.status`; split or relabel the counts ("290 open · 54 forthcoming").

### [P1] Legacy purple live on the Funding window; semantic colors spent as decoration
- **What:** `PortfolioDashboard.jsx:281` passes `accent="#7551FF"` to the live Funding `DashWindow`; `DashWindow.jsx:10,41` defaults to `#7551FF`; `OpenCallsTable.jsx:46` glow fallback is `rgba(117,81,255,…)`; dead `KpiTileRow.jsx:82` also carries it. Other windows spend Awarded-green, magenta and amber on window chrome.
- **Why:** direct Blue-Glass-Wins and Quiet-Chrome violations; a green window header dilutes the Awarded money-badge vocabulary.
- **Fix:** Signal Blue accents everywhere in dashboard chrome (differentiate windows by icon + title); change the `DashWindow`/`tint()` fallbacks; purge `#7551FF` from the dashboard slice.

### [P2] Keyboard/AT holes across the signature instruments
- **What (verified live):**
  - Research-tools tabs: `role=tab` but **all** `aria-selected="false"`, no `aria-controls`, all `tabIndex=0` (no roving focus, no arrow keys).
  - `dash-calls__seg` (All / Closing 30d) and `dash-card__tab` (Open/Closed, Planned/Awarded/Both) expose active state by CSS class only — no `aria-pressed`/`aria-selected`; both strips computed `outline: none` on focus.
  - `CallsOverTime` SVG: no `role`, no `<title>`, no `aria-label`, no per-month values for AT (only month labels in the tree).
  - Deadline Runway: zero focus stops; cluster contents `title`-attribute-only.
  - Per-row "Show in graph" action is `opacity: 0` until hover — invisible to keyboard and touch.
  - `DashWindow` is `role="dialog"` with no focus move on open, no focus return, pointer-only drag.
- **Why:** PRODUCT.md's baseline promises full keyboard operation and visible focus; the monitoring persona's core artifacts are silent to AT.
- **Fix:** complete the tab contract (aria-selected, aria-controls, roving tabIndex, arrow/Home/End); `:focus-visible` rings on all three tab styles; focusable runway dots with accessible names; `role="img"` + generated summary for the chart plus a text/table equivalent; always-visible (or focus-revealed) row actions; dialog focus management.

### [P2] Error / freshness honesty gaps at the top level
- **What:** `useCordisPortfolio` failure yields `cordisActive === false`, so a backend outage renders "Funded track record (CORDIS) appears here once ingested" — an untruth (it is ingested; the fetch failed). The strip has no "as of" ingest date (DESIGN.md pattern: "Source: EU CORDIS · as of …"). Internally the advertised total is named `totalCommitted` (`useDashboardData.js:60,163,228`, props through `OfferFundedStrip.jsx:26,33`, `PortfolioDashboard.jsx:261`) — banned framing one refactor from leaking user-facing.
- **Fix:** distinct error branch ("Couldn't load the funded track record — retry"), surface the ingest date, rename `totalCommitted` → `totalOnOffer` through producers/consumers/tests.

### [P2] Mechanism terminology in dashboard-owned copy
- **What (live):** `OpenCallsTable.jsx:120` "View on graph", `:190` "Show in graph", `DashboardToolPanel.jsx:19` "…funded across the graph." (Dead `DashboardHero.jsx:21,25` also says "tracked in one graph" — must not be revived as-is.)
- **Fix:** "View in funding map" / "Show in funding map" / "across the funding landscape" per the ticket's terminology table.

### [P2–P3] Density, contrast and light-mode details
- Muted row text `#697f9f` on `#0f2244` = 3.9:1 (needs 4.5:1) — one token fix clears 16 detector hits.
- 70 undersized-text hits: keep DESIGN.md's data-mono grammar but lift truly functional text (table column headers 9.5px, programme names 10px, "Show in graph" 10px) to ≥11px; decorative caps labels may stay mono-small.
- Green glow on every "Open" chip (18 dark-glow hits) vs Tint-Not-Lift (only the CTA glow is sanctioned).
- Light mode: `DeadlineRunway.jsx` hardcodes dark-tuned hexes (`#f6c35e`, `#3ee08a`, `#9ccafd`) for stat values — low contrast on light tiles.
- `dashWinIn` animation and `scrollIntoView({behavior:"smooth"})` (`DashboardToolPanel.jsx:40`) lack `prefers-reduced-motion` guards (`_dashboard-redesign.scss` has none).
- Bottom summary strip is clipped at first paint at 1440×900 (labels half-cut).
- Two different "All"s: the default 8-row slice and the "All" chip state are both labelled "All".
- Dead code riding in the bundle: `DashboardHero.jsx`, `KpiCardsRow.jsx`, `CordisKpiRow.jsx`, `KpiTileRow.jsx`, `FundingFrameLegend.jsx`, `useInView.js` have no importers; `KpiCard.jsx` survives only for `formatValue/formatUnit`.
- "Topics" window is a regex guess over call IDs (`useDashboardData.js:186-198`) shipping beside real EuroSciVoc evidence — the guessed chart dilutes the real one's credibility.

## Persona Red Flags

**Alex (power user):** no sort/filter/search on the 344-call list beyond one coarse chip; window arrangement and open-set not persisted; will catch a mis-regexed "Topics" categorisation in minutes.

**Sam (screen reader / keyboard):** cannot perceive the Deadline Runway at all; cannot see focus on any of the three tab strips; the area chart is an anonymous SVG; dialogs don't take focus; row actions are hover-only.

**Research-office professional (Tuesday pull):** no "what changed since last visit" anywhere — the core monitoring trigger is unserved; the untruthful "Open" pill is advice-corrupting when forwarded to a PI; "Calls over time" locked to the calendar year hides next January's openings; on the office iPad the page is dimmed and dead (P0).

## Questions to Consider

1. The retention engine is "what's new/closing in your fields" — the dashboard has no concept of *your fields* and no memory of the last visit. Is this a monitoring home or a well-sorted snapshot? (Home v2 is explicitly deferred — but the framing should not pretend otherwise.)
2. Do seven overlapping draggable windows serve the Tuesday visit, or would evidence read better as the same "reveal on" pattern the call pages use (ADR-0001: one workflow)?
3. If "Topics" is a regex guess and "Fields & topics" is real EuroSciVoc, why do both ship in the same bar?

---

## Pre-existing Repository Debt (out of dashboard scope — record, don't fix here)

- **Brand string:** page `<title>` "EU Knowledge Graphs"; command bar "EU Knowledge Graph" — mechanism word as user-facing name (governance finding per ticket; do not invent a replacement).
- **Chrome copy:** "Back to graph" button, breadcrumb "LEVEL 1" pill, right-rail tooltip "Find calls — switch to the graph first" (a disabled-but-advertised control on the dashboard — brushes ADR-0006 §2). "Back to graph" is conditionally in scope only if that shared command is touched.
- **MUI right-rail focus:** `Mui-focusVisible` computes `outline: none` — global rail focus visibility relies on background ripple only.
- **Legacy `theme.css` purple** (`--primary: #7551ff`) underlies older surfaces app-wide; dashboard tokens override it correctly — only the JSX literals above are dashboard-owned.
- **`localStorage.graphName` navigation coupling** (`OpenCallsTable` → node detail) is app-wide plumbing.

## Detector ↔ Review Agreement

- Agree: purple literals (B: exact lines; A: verified live render), mechanism copy (both), tiny/low-contrast text (B counts; A's density read), glow usage (both), dead code (B proved no importers; A flagged bundle riding).
- Detector caught what review missed: the exact 3.9:1 contrast ratio and its single root-cause token pair; the `transition: width` layout animations on bar fills.
- Review caught what the detector can't: the P0 scrim (behavioural), the upcoming/Open untruth (data semantics), error-state conflation, missing tab ARIA, runway hover-only contents, light-mode hardcoded hexes.
- False positives (proved): `DashboardHero`/`KpiCardsRow`/`KpiTileRow` findings never render (dead code); some undersized-text hits are DESIGN.md-sanctioned data-mono; the two CSS `transition: width` hits are one-shot load reveals (downgrade, not dismiss).
