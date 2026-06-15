# Frontend UX/UI Review — EU Knowledge Graph

_Multi-agent review of the React/Cytoscape frontend. Every finding was read from source
(`path:line`) and adversarially verified against the actual code; severities/efforts below
are the post-verification values. Scope: `frontend/src` only (backend out of scope)._

---

## Executive summary

The app has a **strong spine**: a clean nested drill-down model (ROOT › Pillar › Programme ›
Destination › Call), a genuinely cohesive dark theme, good breadcrumb/back affordances, and the
**best part of the product — the call detail page** (status chip, key-info grid, timeline,
official-portal deep link, collapsible sections).

Four things hold it back:

1. **Filters silently fight each other.** Search, type-toggles, the score slider, and the
   timeline write to four different Cytoscape visibility layers with no shared model — toggling
   "Call" back on floods in calls the timeline just hid, and "Reset All Filters" doesn't reset
   the timeline or slider. There's no "what is filtering my view" indicator anywhere.
2. **The interaction model is desktop/hover-only.** The rich hover card + neighborhood highlight
   are bound to `mouseover`, so on touch they're dead. Mobile fit is genuinely broken (inverted
   min/max zoom). The graph is invisible to screen readers and keyboard.
3. **Several controls are dead or mock**, which quietly erodes trust in a tool whose whole value
   is data credibility: the funding "Committed/Spot/Forecast" tabs do nothing, Recent Activity is
   hardcoded, Saved Searches don't run, "Bookmark this Destination" writes to a store nothing
   reads, the dashboard breadcrumb is inert, and the **Min Similarity slider filters edges that
   don't exist in the loaded data** (so it blanks the graph).
4. **A data-layer mismatch blocks the "graph-native" promise.** The scored
   `CROSS_TOPIC_SIMILARITY` edges and per-call `keywords/tags/related_topics` that several
   compelling features would need **are not in the data the frontend loads** (they live only in
   the HE-Wiki entity graph or in unused export files). This is the single most important
   strategic finding — see [§6](#6-the-data-layer-blocker-read-this-before-building-graph-features).

The good news: most of the highest-impact fixes are small, and there's a deep bench of feasible,
domain-specific features that need **no** backend work.

---

## 1. Quick wins (high impact, ~hours each)

| Fix | Why it matters | Where |
|---|---|---|
| **Fix mobile zoom bug** — `minZoom 0.8 / maxZoom 0.7` are inverted, pinning the graph at a fixed zoom on every mobile fit | On the *supported* landscape-mobile path, dense layers never fit | `GraphView.jsx:64-92` |
| **Add `aria-label` to every icon-only button** (sidebar, topbar, compare, chatbot) | MUI `Tooltip` does **not** set an accessible name → screen readers hear a column of bare "button" | `SidebarControls.jsx:50-123`, `GraphTopBar.jsx:268-300` |
| **Give the AI-search FAB a tooltip + label** | NL search is the most direct path to the core job, hidden behind an unlabeled sparkle | `ChatBot.js:267-278` |
| **Search should pan/zoom to matches + show a count + a "no results" line** | Today it only fades non-matches; a match off-screen reads as "search is broken" | `SearchBox.js:19-47` |
| **Show the deadline on the hover card** | Deadline is the #1 triage field; today it needs a full page nav. `getCallDateRange` already computes it | `useHoveredNodeModel.js:277-282` |
| **Remove or guard the Min Similarity slider** — it targets `CROSS_TOPIC_SIMILARITY` edges absent from HE-Wiki, so "Apply" blanks the canvas | A destructive no-op on the one quantitative facet | `ScoreFilter.js:16-35` |
| **Wire or remove the funding "Committed/Spot/Forecast" tabs** (repurpose to € / # of calls — `callCount` already exists) | Clicking a tab and seeing identical bars makes users distrust every number | `FundingByProgramme.jsx:12-47` |
| **Replace bookmark `alert()`s with a snackbar + a stateful toggle**; dispatch the existing `bookmarksChanged` event (NodeDetail currently doesn't, so the header count won't update) | Blocking alerts feel unfinished; ChatBot already has the better pattern | `NodeDetail.js:1084-1097` |
| **Add a `prefers-reduced-motion` media query** | One CSS block; WCAG win; currently zero support | `theme.css` |
| **Fix light-theme contrast**: `--primary #bed5ff` + white text ≈ 1.5:1 on "View Details" CTAs & buttons | Pale-blue-on-white is unreadable; darken `--primary` (don't touch `--primary-foreground`, it's reused as a surface) | `theme.css:24-25`, `ViewDetailsButton.jsx:21-22` |
| **`aria-label` the SearchBox input & similarity slider** (slider says `"pretto slider"`) | Unlabeled inputs are unusable by SR; one attribute each | `SearchBox.js:60`, `ScoreFilter.js:87` |
| **Add a "All dates" clear button + in-range count to the timeline** | A drag with no count and no easy reset feels like a trap | `TimelineScrubber.jsx` |
| **Add a `path="*"` route + a "call not found" state** | Stale/old links render a blank page; bad call ids spin forever | `App.js:82-87`, `NodeDetail.js:776` |
| **Make the app logo/title link home** (reset to ROOT) | Universal expectation; today it's dead text | `GraphAppHeader.jsx:3-15` |
| **Fix the dashboard hero copy** ("the funding landscape you saved" — it's portfolio-wide, not saved) | Actively misleading | `DashboardHero.jsx:24` |
| **Remove debug `console.log`s** shipping to prod (render marker, viewport object, per-metric-card log) | Console clutter; leaks internal markers | `GraphView.jsx:43`, `HoveredNodeInfo.jsx:334` |
| **Fix light-mode breadcrumb colors** (inactive crumbs hardcoded pale-blue ≈ 1.3:1 on white) | Clickable ancestor crumbs vanish in light mode | `_topbar.scss:46-77` |

---

## 2. Bigger UX/UI fixes worth planning

### Filtering & discovery (the weakest subsystem)
- **Unify filter state into one visibility model** (high / M). Four filters use conflicting
  imperative `hide()/show()` + class layers and "whoever ran last wins." Compute final
  visibility from one predicate (search ∧ type ∧ score ∧ timeline) applied in a single pass; stop
  using `cy.show()/hide()` for type toggles (it clobbers the timeline's `display:none`).
  `LegendToggle.js`, `GraphMainColumn.jsx:108-148`, `ScoreFilter.js`, `SearchBox.js`.
- **Add a persistent "filter status" bar** with per-facet chips (high / M): _"Showing 12 of 84 ·
  date Apr–Jun · type: Call ✕"_ and make "Reset All Filters" honestly clear **everything**
  (today it leaves the timeline + slider active — the label lies).
- **Search across the whole hierarchy, not just the rendered layer** (med / M). At ROOT/pillar
  layers the calls aren't in the graph, so a top-level search for a call silently finds nothing,
  even though the data is preloaded. The timeline already scans `loadFromStore` — reuse that.

### Navigation & shareability
- **Put graph location in the URL** (high / L). The dataset + drill layer live only in React
  state + localStorage, so nothing is deep-linkable or shareable and refresh/Back don't restore
  position. `usePendingNav` already resolves cluster→dest→call from a payload — reuse it for URL
  hydration. Unlocks "send a colleague this view," browser Back/Forward, and saved views.
- **Unify the two node-detail paths** (high / M). In-graph clicks open an *inline overlay* (full
  shell, returns to exact layer); bookmarks/wiki-links hit the *`/node/:id` route* (bare page,
  back-button only restores `Cluster_/DEST_` layers — every other programme dumps you at ROOT).
  Same call, two experiences, two "back" destinations.
- **Give standalone routes a shared layout** (med / M). `/node/:id`, `/bookmarks`, `/about` drop
  the entire app chrome; the only affordance is one back arrow. A react-router layout route with a
  persistent header + slim nav rail keeps users oriented.

### Interaction & touch
- **Add a tap-to-preview path on touch** (high / L). First tap selects + shows the hover card with
  its action button; the button (or a second tap) drills. The `isHoverFrozen`/"Pinned"
  scaffolding already exists but is never wired up.
- **Distinguish drillable vs leaf nodes visually** (med / M). Tapping a Destination drills;
  tapping a Call opens detail — but nothing visual signals which is which. Add a ring/`+`/chevron
  class to expandable nodes.
- **Add Esc / background double-tap to go up a level** (med / S) and **on-canvas zoom +/- + a zoom
  readout** (low / S; also explain HE-Wiki's semantic-zoom label hide/reveal so it doesn't read as
  a glitch).

### Visual system
- **Build a real MUI theme driven by `darkMode`** (med / M). `theme.js` only sets a font; the
  ThemeProvider never reacts to dark mode, so icon/tooltip/divider defaults are wrong and the
  codebase patches it with `!important` everywhere. A proper `palette.mode` theme removes most of
  that patch layer.
- **Consolidate the color tokens** (med / L). The same semantic colors are defined in 4+ places
  (`graphStyles.js`, `palette.js`, `_variables.scss`, `theme.css`) — "open-call green" alone
  appears as 4+ different greens. One source of truth → import everywhere.
- _Lower priority:_ scope the global `* { transition }` rule; consume the `--text-*` scale instead
  of 100+ raw font literals; delete dead code (`GraphHeader.js`, stale `index.scss`, undefined
  `--primary-background`, duplicate legend-toggle SCSS block).

### Accessibility (beyond the quick wins)
- **The Cytoscape graph is AT-invisible** (med / M). It's a bare `<canvas>` with no role/label/keyboard.
  Mitigation: the left `GraphSelector` tree **is** an accessible keyboard path for the hierarchy —
  but the flat HE-Wiki graph has no tree fallback and the canvas has no `aria-live` for layer
  changes. Label the canvas, add live-region announcements, add a list view for HE-Wiki.
- **Portal panels need dialog semantics** (med / M): ChatBot is a true modal (add `role=dialog` +
  focus trap + restore); CompareDrawer needs a **keyboard close** (it can only be closed by mouse
  today); the hover card just needs Esc + a label (it's a popover, *not* a dialog — don't trap focus).
- **Main route has no landmarks / `h1` / skip link** (med / M) — subpages already do; replicate.

### Performance (perceived)
- **Don't gate the whole app behind 38 sequential fetches** (high / M). The first screen (ROOT) is
  synthetic and needs zero network, yet `if (!ready)` blocks everything until all datasets load
  one-at-a-time. Render ROOT immediately; parallelize preloads with bounded concurrency; flip
  `ready` once the key list is available. **Highest-leverage perceived-speed win.**
- **Stop destroying/recreating Cytoscape on every drill** (high / L). `<GraphView key={current.key}>`
  full-remounts on every layer change → blank canvas → layout compute → 150ms fade, every hop.
  Persist one instance and diff elements with `cy.json()`/`add`/`remove`.
- _Lower:_ cache hover-hydration counts (re-runs `buildElements` on up to 7 datasets per pillar
  hover); smooth the chunky/freeze-prone loading %; reduce glow stacked drop-shadows.

---

## 3. Dead / mock controls to fix or remove (trust)

These share a theme — they look functional but aren't, which is corrosive for a funding tool:

- Funding **Committed/Spot/Forecast** tabs — no-op (`FundingByProgramme.jsx:12`)
- **Recent Activity** — hardcoded `MOCK_ACTIVITY` (`RecentActivity.jsx:3`)
- **Saved Searches** — real counts but clicking does nothing despite "Run on the live graph" (`SavedSearches.jsx`)
- **"Bookmark this Destination"** — writes `bookmarkedDestinations`, which **nothing reads** (`NodeDetail.js:935-948`)
- **Min Similarity slider** — filters edges absent from the loaded graph → blanks the canvas (`ScoreFilter.js`)
- **Dashboard breadcrumb/layout bar** — renders the stale graph path with `onLevelClick={()=>{}}` (`GraphMainColumn.jsx:167-181`)
- Dashboard **open-calls table** — can't sort/filter/export, capped at 8 (data for all calls already exists)

---

## 4. New features — feasible now (no backend)

Ranked by impact. All vetted against the code/data and confirmed buildable client-side.

| Feature | Persona | Impact / Effort | Notes |
|---|---|---|---|
| **Deadline radar** — countdown badges on open calls + a "Closing soon (30/60/90d)" lens | Grant writer | high / M | `inferCallStatus` + `getCallDateRange` exist; reuse `.faded`. Status is *inferred*, not stored, so badge coverage is partial |
| **Watchlist + deadline calendar** — upgrade bookmarks into a portfolio (enrich saved record from `useDashboardData.allCalls`; columns for status/budget/deadline/days-left; calendar grid; pipeline stage) | Research office | high / M | Biggest single upgrade to the save flow; everything's client-side |
| **Call-vs-call compare** — let calls into compare; show per-call rows (deadline/budget/TRL/type-of-action) instead of programme aggregates | Researcher | high / L | Remove the `type!=='call'` guard in `setupEvents.js:80`; generalize `CompareMetricRow` 2→N |
| **Make the ChatBot fly the graph** — the backend already returns `filters` + `matched_calls`; today the filter chips are pure decoration. Apply them: drill to the layer, highlight matches, fit | All | high / M | Just thread `cyInstance` + nav callbacks into ChatBot (already gets `onOpenDetail`) |
| **Saved Views / shareable links** — serialize {graphName, timeline, search, score, toggles} to a named entry + URL; replace the mock Saved Searches | Consultant | high / M | Needs lifting `SearchBox`/`ScoreFilter` local state up; pairs with URL-routing fix |
| **Funding-fit scorecard** on the detail page — user enters budget + TRL; traffic-light rows vs the call's bands; plain-language RIA/IA/CSA gloss | Researcher/SME | medium / M | Budget/action-type solid; TRL is best-effort (prose field) |
| **Multi-year funding-trend analytics** — stacked budget-over-time, "deadline-cliff" by month, programme momentum | Strategy lead | medium / M | `bucketCallsByMonth` is hard-coded to the current year + counts only; extend to multi-year + budget. (No chart lib — it's hand-rolled SVG) |
| **"Explain this connection"** — structural BFS shortest path between two selected nodes, shown as a labeled breadcrumb chain | New staff | medium / L (v1) | v1 deterministic, no AI; v2 grounded LLM summary is a backend follow-on |
| **Graph analytics panel** — Top Hubs (degree) + structural Bridges | Strategy | medium / M | Hubs/bridges feasible; "whitespace"/betweenness need the missing similarity data |

> **Note:** "Pan-and-pulse search results" and "shortlist comparison table" appear in both the
> quick-wins/fixes and the feature lists — they're the same underlying work.

---

## 5. New features — attractive but **blocked** by the data model

These came up repeatedly across personas and are worth building — **after** the data gap in §6 is
closed. Building them on today's data would silently produce empty/garbage results:

- **Eligibility & fit pre-screen** (filter by country / org-type / TRL) — `eligible_countries` and
  `trl` are free-text prose, not machine-readable. Only an "inconclusive" badge is honest today.
- **Cross-programme topic explorer / "theme galaxy" / "calls like this" via tags** — call nodes
  **have no `keywords`/`tags`/`related_topics`** (those exist only on HE-Wiki entities). No tag
  vocabulary to index or cluster.
- **Cross-programme similarity overlay / "find similar calls" via `CROSS_TOPIC_SIMILARITY`** — those
  scored edges aren't in any graph the frontend loads (see §6).

---

## 6. The data-layer blocker (read this before building graph features)

The verification surfaced a consistent, important mismatch between what the UI *assumes* and what
the loaded data *contains*:

1. **`CROSS_TOPIC_SIMILARITY` edges with scores are not in the loaded graphs.** The live HE-Wiki
   graph (`/hewiki/relationships`) ships only `RELATES_TO` + `WIKI_LINK` (no `score`). Programme/
   cluster graphs ship only `HAS_DESTINATION` + `HAS_CALL`. The scored similarity edges exist only
   in unused export files (`canonical_topic_relationships.json` / `cross_topic_similarity.csv`)
   over a separate set of ~11 canonical topic nodes. **Consequence:** the `ScoreFilter` slider is
   effectively dead, and any "similar calls / similarity overlay" feature has nothing to stand on.
2. **Call nodes carry no topic tags.** `keywords` / `tags_from_description` / `related_topics`
   resolve empty on real call data; they only populate on HE-Wiki entities. Topic-based discovery
   features can't be built client-side.
3. **Key screening fields are prose, not structured.** `eligible_countries`, `technology_readiness_level`
   are sentences, so reliable faceting/verdicts need backend extraction.

**Recommended sequencing:** (a) ship the §1 quick wins and the §4 feasible features that rely only
on dates/budget/structure; (b) in parallel, do the backend work to emit call-level topic
tags + call-to-call similarity edges + structured eligibility/TRL; (c) then unlock the §5 features
and a real funding-domain facet set (open/closed status, budget, type-of-action, TRL, topic).

---

## 7. Cross-cutting themes

1. **No single source of truth** — for filter state, for color tokens, for the MUI theme, for
   node-detail routing. Most "small bugs" trace back to parallel, drifting systems.
2. **Desktop-and-mouse assumptions** ripple into mobile (broken fit, hover-only) and accessibility
   (canvas, focus, labels) — the app is explicitly landscape-mobile-friendly but not actually usable there.
3. **The data is richer than the UI exposes** — deadlines, budget bands, status, eligibility are
   computed or present but used only decoratively (timeline bar colors, flat metric tiles) instead
   of driving filters, badges, and decisions.
4. **Polish vs. trust** — the dark theme and detail page are polished, but dead/mock controls and a
   lying "Reset" undercut credibility precisely where a funding tool needs it most.

---

### Verification honesty note
The review rejected 2 plausible-but-wrong findings (the hover card *is* effectively persistent; compare
mode *does* show "pick 2 nodes" guidance) and downgraded several others (e.g. the legend swatches are
actually legible — the white-on-pale rules are dead code; node-detail "spins forever" terminates but
shows a spinner for a null result). Where a finding's severity here differs from its first phrasing,
it reflects that correction.

- Call nodes have no keywords/tags/related_topics (those only exist on HE-Wiki entities).
- Eligibility/TRL are free-text prose, not structured.
