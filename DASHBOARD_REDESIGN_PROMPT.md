# Prompt for Claude Code — Portfolio Dashboard UI/UX redesign

> Paste everything below the line into Claude Code. It is written to be self-contained:
> it tells the agent what to build, what to reuse, what to construct anew, and what it
> must not break.

---

## Task

Redesign the Portfolio Dashboard so it matches the new mockup in
`C:\Users\jozse\Downloads\Portfolio Dashboard2.html` (identical design source, fully
annotated, lives in the handoff bundle at
`Dashboard UI and UX upgrade-handoff.zip → dashboard-ui-and-ux-upgrade/project/Portfolio Dashboard.dc.html`).
**Read the `.dc.html` source top-to-bottom before writing any code** — its `<script type="text/x-dc">`
block contains the exact palette, layout grid, KPI/theme/window definitions, and the drag/focus
window-manager logic you will port.

This is a **visual redesign, not a rewrite**. The current dashboard already implements all the
data logic, CORDIS integrity rules, and component structure we want to keep. Your job is to
re-skin and re-arrange it into the mockup's layout while **preserving every existing piece of
functionality and every honesty guardrail**, and transferring the real logic into the new shells.

The current dashboard lives in `frontend/src/components/GraphPage/Dashboard/` and is orchestrated by
`PortfolioDashboard.jsx`. Styles are in `frontend/src/styles/components/_dashboard*.scss`
(+ shared `_cordis-trend.scss`, `_cordis-partners.scss`), registered in `frontend/src/styles/main/main.scss`.

## Hard constraints (do not violate)

1. **Keep the data hooks and component logic.** Reuse `useDashboardData`, `useCordisPortfolio`,
   `useFundingByProgramme` (+ `mapAwardedToProgrammeKeys`), `useCordisPortfolioTrend`,
   `useCordisFieldTree`, `useCountryActivity`, `useTopOrganisations`, `useInView`. Do **not**
   re-derive numbers in JSX or invent data — every figure must keep coming from these hooks.
2. **Preserve the `PortfolioDashboard` props contract** (`loadFromStore`, `graphStats`, `setViewMode`,
   `dashboardPanel`, `setDashboardPanel`, `countryOverlayCode`, `setCountryOverlayCode`, `onLocateCall`,
   `locateCall`, `savedViews`, `onApplySavedView`, `onDeleteSavedView`) so `GraphMainColumn.jsx` needs no
   changes. If you must change props, update the single call site in
   `frontend/src/components/GraphPage/ui/GraphMainColumn.jsx` and nothing else.
3. **Keep the sidebar → dashboard wiring intact.** Sidebar research-tool buttons set
   `dashboardPanel` to `"fields" | "country" | "hopOn"` and expect the Research-tools panel to react.
   The country-leaderboard row still lifts its selection through `setCountryOverlayCode` +
   `setDashboardPanel("country")` (`handleSelectCountry`). Don't break either path.
4. **Keep every CORDIS honesty guardrail.** Specifically:
   - Hide-when-empty: anything CORDIS-derived stays hidden (or shows the existing `CordisEmptyState`)
     when `cordis.data.projectCount === 0`. Never render a row of zeros.
   - Counts and euros are **separate measures**, never blended into one score.
   - Planned (work-programme budget on offer) and Awarded (CORDIS EU contribution) are **different
     measures across different eras** — shown side by side, never subtracted.
   - "Most funded / most active / most present" is **not** "best." Keep the existing explanatory
     `note`/`prov`/`summary` copy on the migrated cards — do not drop it during restyling.
5. **This is the only deliverable scope: the dashboard.** Don't touch the graph view, chatbot, or
   unrelated components beyond the one `GraphMainColumn` call site if needed.
6. **Theming:** the app supports light/dark via CSS custom properties (`var(--card)`,
   `var(--background)`, `var(--border)`, `var(--primary)`, …) and a DarkMode context. The mockup is a
   fixed deep-navy "Vision UI" palette. **Do not hardcode the navy hexes throughout the JSX.** Introduce
   the new palette as SCSS variables / CSS custom properties scoped to the dashboard (e.g. a
   `.dash-shell` token block), so the design reads as intended in dark mode and still degrades sanely
   in light mode. Centralize the accent (`#7551FF → #4318FF` gradient) as one token.
7. **Icons & fonts:** prefer the existing `@mui/icons-material` set over loading Google "Material
   Symbols Rounded" — map each mockup glyph to its MUI equivalent (`hub`→`HubIcon`,
   `bar_chart`→`BarChartIcon`, `event`→`EventIcon`, `public`→`PublicIcon`, `groups`→`GroupsIcon`,
   `account_tree`→`AccountTreeIcon`, `stacked_bar_chart`→`StackedBarChartIcon`, `bookmark`→
   `BookmarkIcon`, `group_add`→`GroupAddIcon`, `construction`→`ConstructionIcon`, etc.). DM Sans may be
   added if desired, but don't make the layout depend on a webfont that may not load.

## Target layout (from the mockup)

Single, mostly non-scrolling screen on a deep-navy background with a radial purple glow, rounded-20px
cards (`#111c44` on `#0b1437`), purple accent. Top→bottom:

1. **Title block / top bar.** Logo tile + "EU KNOWLEDGE GRAPH / DASHBOARD" eyebrow + "Portfolio
   Dashboard" title. The mockup's search field, notification icons and "AU" avatar are **demonstrative
   chrome** — the app already has its own `GraphTopBar` (view toggle, Save view, Copy link) mounted
   directly above the dashboard. Do **not** build a duplicate/fake search or auth avatar. Keep the
   title/eyebrow block; drop or render-as-static the rest, and do not wire fake controls.
2. **KPI tile row (6 across).** Icon tile + label + big value + sub-label. See KPI mapping below.
3. **"Explore by theme" toggle bar.** A label ("Explore by theme") + a row of pill toggles. Each pill
   opens/closes a **floating, draggable window**. Active pill = filled accent gradient + `check_circle`;
   inactive = outline + `add`. See theme-button mapping below.
4. **Main area** (2-col grid, ~1.62fr / 1fr):
   - **Left — "Open & upcoming calls"** list: header with count + `All` / `Closing 30d` filter chips;
     column headers (Call / Budget / Deadline / Status); rows with status dot, title + id, budget,
     deadline + programme, status pill.
   - **Right column** — stacked: **Research tools** panel (tabbed) on top, **Calls over time** area
     chart (always visible, Open/Closed tabs) below.
5. **Floating window layer.** Optional dim backdrop; one draggable window per theme button, each with a
   grab header (icon, title, subtitle, drag handle, close button), focus-to-front (z-index), and a body.

### Window-manager mechanics to port

Translate the mockup's `Component` class into idiomatic React (hooks + `createPortal(window, document.body)`,
matching this repo's existing floating-panel pattern):
- State: `open` (per-key bool), `pos` (per-key `{x,y}`), `top` (focused key for z-index).
- A global `mousemove`/`mouseup` listener (in a `useEffect`) drives dragging from the header; clamp to
  viewport (`Math.max(8, …)`). `startDrag` records the cursor offset and focuses the window.
- `toggle(key)` flips open + focuses; `close(key)`; `focus(key)` raises z-index (focused = 90, else 60).
- Consider extracting a small `useDraggableWindows(keys)` hook so the mechanics live in one place.
- Persisting open windows / positions across view switches is optional; if cheap, keep them in component
  state so toggling the view doesn't lose them.

## Mapping: mockup region → existing component / hook (REUSE, don't reinvent)

| Mockup region | Reuse this | Notes |
|---|---|---|
| KPI tiles | `KpiCardsRow` + `CordisKpiRow` data | Build a new 6-tile presentational row; see KPI rule below |
| Open & upcoming calls list | `OpenCallsTable` + `callFilter` state + `tableRows` memo | Restyle into the mockup's list rows; keep node-detail `Link`, "show in graph" (`onLocateCall`/`locateCall`), and the `All` / `Closing 30d` filter (maps to `callFilter` `null`→upcoming, `"open"`, `"closing30"`) |
| Research tools panel | **`DashboardToolPanel`** (the real one) | The mockup's "Research tools" with static bars is **demonstrative only**. Use the real panel — `CordisFieldExplorer`, `CountryActivityView`, `HopOnHosts` — driven by `dashboardPanel`/`setDashboardPanel` + `countryOverlayCode`. Restyle its tab bar to match; keep its full functionality. |
| Calls over time | `CallsOverTime` (`monthlyBuckets`, open/closed) | Already an SVG area chart with Open/Closed tabs — restyle only |
| **Funding** window | `FundingByProgramme` (`callsByProgramme`, `plannedByProgrammeKey`, `awardedByProgrammeKey`) | Planned/Awarded/Both tabs already implemented; keep the disabled-when-no-CORDIS behavior |
| **Funded activity** window | `CordisActivityTrend` (`useCordisPortfolioTrend`) | Keep the `.cordis-trend` wrapper so `_cordis-trend.scss` still applies |
| **Geography** window | `CordisCountryLeaderboard` (`useCountryActivity("")`) | Keep `onSelectCountry → handleSelectCountry` |
| **Organisations** window | `CordisTopOrgs` (`useTopOrganisations`) | Keep the `.cordis-partners` wrapper so `_cordis-partners.scss` still applies; keep `OrgLink` and the cap note |
| **Fields & topics** window | `CordisFieldMix` (`useCordisFieldTree`) | Closest match to the mockup's donut. Keep its overlap-disclaimer note; donut styling optional — the existing ranked bars are richer, so prefer them per the "use the more detailed existing structure" guidance |
| **Saved** window | `SavedSearches` (Quick filters) + `SavedViews` | Fold both into one window; keep `callFilter` wiring and `onApplySavedView`/`onDeleteSavedView` |
| Funding-frame legend | `FundingFrameLegend` | Place inside the Funding window (or under the KPI row) to keep the planned-vs-funded framing visible |

**KPI rule:** the mockup's 6 tiles mix planned and CORDIS measures (planned-on-offer, open calls,
funded projects, EU € awarded, organisations, countries). Honor hide-when-empty: when CORDIS is
inactive (`projectCount === 0`), do **not** show 4 CORDIS zeros — fall back to the planned-only KPI set
(`Planned on offer`, `Open calls`, `Closing in 30d`, `Topics tracked`). When CORDIS is active, show the
full mixed 6-tile set. Drive every value from `useDashboardData` (planned) and `useCordisPortfolio`
(CORDIS), formatted with the existing `KpiCard` currency/count formatters.

## Construct anew (mockup theme buttons don't cover all current elements)

The mockup's theme buttons omit several elements that exist today. **Every current dashboard element
must keep a home** — add theme buttons / windows (or panel slots) for the ones the mockup leaves out:

- **Topic distribution** (`TopicDistribution`, "estimated from call IDs") — give it its own theme
  button/window (e.g. "Topics"), distinct from the CORDIS "Fields & topics" window. Keep its
  "estimated, not curated" subtitle.
- **Recent activity** (`RecentActivity`) — fold into the Saved window or give it a small slot; keep it.
- **Quick filters** (`SavedSearches`) — the real filter mechanism behind the calls list; keep it wired
  to `callFilter` (the mockup's "Saved" is just bookmarks).
- **CORDIS section framing** — the existing "What's actually been funded (CORDIS)" header/caption/note
  and the `CordisEmptyState` teaser must survive: surface the provenance/caption inside the relevant
  CORDIS windows, and show the empty-state when CORDIS is absent rather than empty windows.

When you add a new theme button, build it to the same spec as the mockup's (toggle pill → draggable
window) so it's visually consistent. Prefer migrating the existing, richer component over the mockup's
simplified stand-in wherever they differ (the mockup's static bars are placeholders).

## Lazy loading

Today the below-the-fold CORDIS cards lazy-load via `useInView` sentinels + `DashCardSkeleton`. In the
windowed layout, switch to **open-gated fetching**: gate each CORDIS hook on `cordisActive && open[key]`
so a window's data loads when it's first opened, showing `DashCardSkeleton` while `loading`. Keep the
`FundingByProgramme` awarded fetch eager (gated only on `cordisActive`) — its tabs derive their state
from whether awarded data exists, so deferring it would mislead.

## Files

- **New/rewritten:** `PortfolioDashboard.jsx` (orchestrator + window manager), a presentational
  `KpiTileRow` (6-tile), the floating-window shell(s), and per-theme window wrappers around the reused
  components. Optionally `useDraggableWindows.js`.
- **Restyle, keep logic:** `OpenCallsTable`, `CallsOverTime`, `DashboardToolPanel`, `FundingByProgramme`,
  `CordisActivityTrend`, `CordisFieldMix`, `CordisCountryLeaderboard`, `CordisTopOrgs`,
  `TopicDistribution`, `SavedSearches`, `SavedViews`, `RecentActivity`, `KpiCard`.
- **SCSS:** add a `_dashboard-redesign.scss` (or extend `_dashboard.scss`) with the new tokens, KPI
  tiles, theme bar, and window-shell styles; register it in `frontend/src/styles/main/main.scss`. Keep
  `_cordis-trend.scss` / `_cordis-partners.scss` imports — the migrated components still rely on their
  `.cordis-trend` / `.cordis-partners` wrappers.
- **DELETE nothing** that still holds logic without first re-homing that logic.

## Verify

- Build with `node node_modules/react-scripts/bin/react-scripts.js build` from `frontend/` (npx is
  broken on this machine). Pre-existing warnings (unused vars, etc.) are expected — don't chase them.
- Manually confirm: KPI tiles populate; each theme pill opens a draggable, focusable, closable window;
  the calls list filters via `All` / `Closing 30d`; node-detail links and "show in graph" still work;
  the Research-tools panel still responds to sidebar buttons and the country overlay; CORDIS windows
  show real data when ingested and the honest empty-state when not.

## Suggested order

1. Read `Portfolio Dashboard.dc.html` in full; sketch the token block + layout grid.
2. Build the static shell: tokens, top title block, KPI tile row, theme bar, main grid (calls list +
   research panel + calls-over-time), all wired to the real hooks.
3. Add the window manager (`useDraggableWindows`) + the floating-window shell; wire each theme pill.
4. Migrate each reused component into its window/slot, restyling to the new tokens while preserving
   logic, copy, and guardrails.
5. Add the "construct anew" windows (Topics, Recent activity, Quick filters/Saved) so nothing is lost.
6. Build, fix real errors, manually verify the checklist above.

**Before deleting or replacing any current behavior, confirm its logic has a home in the new layout.**
When something in the mockup conflicts with richer existing functionality, keep the existing
functionality and adapt its styling — the mockup is the visual target, not a feature spec.
