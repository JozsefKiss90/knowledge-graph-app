# Dashboard redesign — delivery report (closing slice 07)

Written 2026-08-22, on `go_live_dashboard_redesign`. Covers the parent ticket
(`.scratch/product-vision/DASHBOARD_PLAYWRIGHT_REDESIGN.md`) delivery points 1–12, with slice 07
(`issues/07-visual-system-final-quality-pass.md`) as the closing work.

## 1. Starting and ending commit / status

- **Ticket start:** `aa1ba9d` ("redesigned node detail") — boundary recorded in `BASELINE-NOTES.md`;
  node-detail work closed there, no leakage into dashboard commits.
- **Slice 07 start:** `4d5ec4a` (slice 06), clean working tree.
- **Ending:** slice 07 committed on top of `4d5ec4a` (this report rides in the commit). Working tree
  otherwise clean; no `.playwright-cli/` or other transient state staged (it is gitignored and was
  deleted after capture).
- Slice history: 01 baseline/critique/plan → `7aa3a3a` (02/03 tickets) → `c99dc06` (04) → `c8d1f54`
  → `26c3101` (05) → `4d5ec4a` (06) → slice 07 (this commit).

## 2. Redesigned workflow (summary)

The dashboard is the monitoring home for the Tuesday pull. Arrival answers "what needs attention
now" without opening anything: the deadline-sorted **Open & forthcoming calls** table (truthful
Open / Closing / Forthcoming pills, indicative-on-offer budget badge), the **Deadline runway**
plotting those same calls, **Research tools** (fields / country / hop-on as an accessible tablist),
**Calls over time**, and the **ON OFFER / FUNDED strip** keeping the two money halves separate with
provenance. Optional depth lives in seven "Explore by theme" windows (accessible dialogs with a full
focus contract). Every call is one hop from its detail page and from its place in the funding map.

## 3. Files changed in slice 07 and why

Visual system (ticket scope):

- `PortfolioDashboard.jsx` — window/pill accents reduced to the two documented tokens per the
  Two-Halves rule: Signal Blue `#47a9ff` (Funding, Topics, Saved — planned/navigation), Awarded
  Green `#35d07f` (Funded activity, Geography, Organisations, Fields — CORDIS evidence);
  single-sourced via `THEME_BY_KEY` so pills and windows cannot drift; the last live `#7551FF`
  accent removed. Also the CordisGate honesty fix (see §6).
- `DashWindow.jsx` — `#7551FF` default accent and tint fallback → Signal Blue.
- `KpiTileRow.jsx` **deleted** — unused legacy component carrying the `#7551FF` tile tone; dead
  mechanisms are removed, not restyled (ADR-0006 §2).
- `KpiCard.jsx` — near-purple `#6366f1` fallback → Signal Blue (file kept: its formatters are used
  by `OfferFundedStrip`).
- `OpenCallsTable.jsx` — programme-dot glow fallback `rgba(117,81,255,…)` (decimal-RGB `#7551FF`)
  → Signal Blue tint.
- `CordisCountryLeaderboard.jsx` — two-series colors `#60A5FA`/`#34D399` → documented
  `#47a9ff`/`#35d07f`.
- `FundingByProgramme.jsx`, `useDashboardData.js` — unknown-programme color fallbacks `#60A5FA` →
  `#47a9ff`.
- `DeadlineRunway.jsx` — one-off stat hexes (`#9ccafd`, `#f6c35e`, `#3ee08a`) → `--d2-accent-text`,
  `--d2-amber`, `--d2-open` (also makes them adapt in light mode).
- `_dashboard-redesign.scss` — FUNDED strip badge recolored from purple `--d2-purple` to Awarded
  Green (`--d2-awarded-*` tokens, dark + daylight values); `--d2-purple` token deleted from both
  theme blocks; per-row status-pill outer glows removed (Tint-Not-Lift; the CTA owns the one
  sanctioned glow); `--d2-faint` raised to AA (dark `#697f9f`→`#7e93b3` ≈5.0:1; light
  `#8b9ab3`→`#62748f`, was ~2.9:1 on white); `prefers-reduced-motion` guard added for the
  window-open animation.
- `_dashboard.scss`, `_dashboard-cordis.scss`, `_dashboard-tool-panel.scss` — near-duplicate blue
  fallbacks (`#3d8fff`, `#2563eb`) → documented `#47a9ff`/`#1a5fd0`.

Tests:

- `NoMechanismCopy.test.jsx` (new) — the consolidated banned-strings sweep (min-test 8).
- `noMechanismCopy.js` — shared ban extended from graph/subgraph to also whole-word node(s)/edge(s).

Outside the primary scope (each per the parent's conditional allowances):

- `CommandBar.jsx` — "Back to graph" → "Back to funding map" (explicitly allowed: dashboard-aware
  navigation copy).
- `CommandPalette/buildCommands.js` — the same dashboard-aware command's label, same rename (the
  parent maps this string when touched; two-word copy change, no behavior change).
- `CountryActivity/CountryActivityView.jsx` — "Green call **nodes** …" / "wherever call **nodes**
  are visible" → "Green calls…" / "wherever calls are visible". The copy renders inside the
  dashboard's research-tools panel; the strengthened banned-strings test caught it and it cannot be
  fixed from `Dashboard/**`.

## 4. Data and navigation contracts preserved

Verified live (Playwright, real app, restored local graph — 101k CORDIS projects):

- `dashboardPanel` / `setDashboardPanel` / `countryOverlayCode` / `setCountryOverlayCode` untouched;
  saved-view state round-trips through the URL (`?view=dashboard&panel=country&country=DE`).
- Call-detail round trip (`/node/<id>` and back), locate-in-map (`Show … in funding map` →
  `?g=ERASMUS` with canvas), rail funded-landscape shortcut → fields tool, command-palette
  `tool-country`/`tool-hopon` → their tabs (also locked by `dashboardToolEntryPoints.test.jsx`).
- No backend/API change anywhere in the ticket.

## 5. Accessibility improvements (slice 07 increment)

- `--d2-faint` text now ≥4.5:1 in both themes (was 3.9:1 dark / ~2.9:1 light) — one token fixes all
  14 usages.
- `prefers-reduced-motion` now suppresses the theme-window open animation (the one dashboard-owned
  animation without a guard; skeleton shimmer already had one).
- Focus visibility unchanged and re-verified live (window `:focus-visible` ring, tablist roving
  tabIndex, Escape/focus-return on all seven windows).
- Earlier slices delivered the structural work: ARIA table, runway/chart textual equivalents,
  tablist contract, dialog naming (see slices 03–06 commits).

## 6. Terminology and evidence-honesty corrections (slice 07 increment)

- "Back to graph" → "Back to funding map" (CommandBar + palette); "call nodes" → "calls" in the
  country tool. The consolidated test now enforces graph/node/edge absence across the whole
  dashboard surface, windows, and tools.
- **CordisGate honesty fix:** with the CORDIS portfolio check itself failed, theme windows
  previously showed the "appears here once ingested" teaser — a false not-ingested claim during an
  outage. The gate now mirrors the strip's precedence: source-check loading → skeleton;
  source-check failed → "We couldn't check the funded track record (CORDIS) right now"; only a true
  not-ingested state gets the teaser. Verified live with `**/cordis/**` 503-blocked.
- FUNDED strip badge no longer wears purple: awarded evidence wears Awarded Green in both themes,
  per the Two-Halves rule.
- Governance finding (unchanged, out of scope): the global brand string "EU Knowledge Graph(s)"
  remains in the CommandBar brand slot and `<title>` — the brand phase owns it (parent ticket
  records it; do not invent a name).

## 7. Impeccable results

- **critique** (slice 01, stored snapshot `2026-08-21T14-38-21Z…`): 28/40; its P0 (stacked scrim)
  and P1s (Open mislabeling, legacy purple) fixed in slices 06 / 03 / 07 respectively.
- **polish** (this slice): applied on the rendered app — removed the last purples (incl. the
  decimal-RGB fallback the hex grep missed), per-row pill glows, and the AA contrast fix; batch
  round re-verified in the browser.
- **audit** (detector over dashboard-owned files): 4 findings, all classified — 2× `transition:
  width` on chart bar fills (pre-existing one-shot reveals, unchanged; deferred) and 2× `overused-font
  Inter` (false positive: Inter is the documented system face).
- **doctor:** `findings: []` — clean. **hooks status:** enabled, defaults, **zero**
  ignoreRules/ignoreFiles/ignoreValues — no ignore rules were added at any point.
- Hook noise during edits: the design hook re-reports the file-wide pre-existing mockup type ramp
  (8–15px steps) and shell gradient in `_dashboard-redesign.scss`, `KpiCard.jsx`, and the shared
  era ramp in `CordisActivityTrend.jsx` whenever those files are touched. All are pre-existing
  values this slice did not change (DESIGN.md itself sanctions 8.5–10px data-mono); none were
  suppressed.

## 8. Playwright scenarios and matrix

All against the real app (`docker-compose.dev.yml`, frontend :3001, restored Neo4j graph):

| Scenario | Result |
|---|---|
| Enter dashboard / return to funding map (CommandBar both directions) | ✅ |
| Next 8 / Closing 30d filters — `aria-pressed`, row set changes (46 rows ≤30d) | ✅ |
| Call-detail round trip (`/node/ERASMUS-EDU-2026-PEX-COVE` and back) | ✅ |
| Locate call in funding map (`?g=ERASMUS`, canvas visible) | ✅ |
| All 7 theme windows: named dialog + purpose, focus in, Escape closes, focus returns, named close controls | ✅ (scripted pass, per window) |
| Research tools: mouse activation; ArrowRight moves focus without activating; Enter activates; tablist/tabpanel wiring | ✅ |
| Sidebar / palette entry points (funded-landscape rail button; palette country + hop-on) | ✅ |
| Planned / Awarded / Both — all enabled with real data, each activates, "side by side, not subtracted" note present | ✅ |
| Country tool with real data (DE — 559 areas); saved search toggle; save/apply saved view | ✅ |
| Dark + light themes (light funded badge = daylight Awarded Green `#178a4c`) | ✅ |
| 1440×900 and 1024×768 — no horizontal overflow, no arrival scrim at 1024, stacked window + Escape | ✅ |
| Evidence states: CORDIS 503 → strip says "couldn't be loaded" (never zeros, never false "not ingested"), window says "couldn't check" (after fix) | ✅ |
| Computed-style scan for `rgb(117, 81, 255)` across `.dash-shell` and window layer | ✅ NO_PURPLE |
| Console: 0 errors (2 pre-existing React Router future-flag warnings, not ticket-attributable) | ✅ |

## 9. Test / lint / build commands and results

- `react-scripts test --watchAll=false` (full frontend suite): **12 suites, 76 tests, all pass**
  (includes the new consolidated `NoMechanismCopy.test.jsx`).
- `eslint` over all changed files: **0 errors**; 3 pre-existing `no-unused-vars` warnings in
  `useDashboardData.js` (present before the ticket; per repo guidance, pre-existing warnings are
  left).
- `react-scripts build`: **succeeds** (main bundle +110 B gzip; only pre-existing warnings).

## 10. Curated evidence

`.scratch/dashboard-redesign/final/`:

- `dashboard-dark-1440x900.png`, `dashboard-light-1440x900.png` — default dashboard, both themes
- `dashboard-dark-1024x768.png` — small-viewport layout
- `dashboard-dark-research-tool-hopon.png` — research tool open
- `dashboard-dark-theme-window-funding-both.png` — Funding window on the Both view (two-halves)
- `dashboard-dark-cordis-unavailable.png`, `dashboard-dark-window-cordis-unavailable.png` — honest
  failure states (strip + window)
- `dashboard-dark-1440x900-a11y-snapshot.yml` — accessibility tree, default surface
- `dashboard-dark-window-open-a11y-snapshot.yml` — accessibility tree with a theme-window dialog open
- Baselines from slice 01 remain under `baseline/` for before/after comparison.

Post-review cleanups (same slice, follow-up commit after the two-axis code review):
`CordisCountryLeaderboard` series colors → `var(--d2-accent)`/`var(--d2-open)` (daylight-adaptive);
the CordisGate source-state props computed once; hyphen lookbehind in the mechanism-word ban so
"cutting-edge" prose can't false-positive; stale `KpiTileRow` comment reference removed.

## 11. Remaining risks and deferred findings

- **Shared FP era ramp** (`CordisActivityTrend.jsx` = `CordisEvidence/CordisTrendPanel.jsx`,
  verbatim): contains Tailwind purples (`#a78bfa` etc.) as a chronological categorical data ramp.
  Deliberately NOT changed: the ramp is shared with the out-of-scope evidence band, and recoloring
  one copy would render the same era in two colors across surfaces. Deferred: recolor both together
  from documented tonal ramps in an evidence-band pass.
- **Shared programme-identity palette** (`useDashboardData.TOP_LEVEL_COLORS` mirrors
  `PROGRAMME_DISPLAY` in `TimelineScrubber/utils.js`, also `FindCalls/useAllCalls.js`): categorical
  identity hues kept in sync with the funding map; changing only the dashboard would desynchronize
  dots from the map. Deferred as a design-system decision. Same reasoning for the
  `CordisFieldMix`/`TopicDistribution` donut palettes.
- 2× `transition: width` bar reveals (pre-existing; benign one-shot, no reduced-motion guard).
- Legacy dead components `DashboardHero`/`KpiCardsRow`/`CordisKpiRow`/`FundingFrameLegend` (and
  `KpiCard`'s unused render path) remain uncommitted-to-either-direction; deleting them is a
  cleanup PR, not this ticket.
- Global brand string "EU Knowledge Graph" (CommandBar brand + page title) — brand-phase
  governance item, recorded, untouched.
- The dashboard's calendar-year window in `bucketCallsByMonth` is a known follow-up from slice 04.

## 12. Transient artifacts and scope confirmation

`.playwright-cli/` was deleted after capture and is gitignored; `git status` shows no transient
browser state. The QA-created saved view was removed from localStorage before closing the browser.
No backend, API, node-detail, graph-canvas, compare, or chatbot code was touched. The three files
changed outside `Dashboard/**` + dashboard SCSS are enumerated in §3 with their justifications.
