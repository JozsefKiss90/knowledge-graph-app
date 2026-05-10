# Portfolio Dashboard — Implementation Plan

> Design reference: `.claude/redesign/Portfolio dashboard _ live KPIs_ calls_ activity.png`

## 1. Overview

The dashboard is a **full-page view** that replaces the graph surface inside the existing `GraphPage` layout. It reuses the left sidebar (Filters & Controls), right sidebar (SidebarControls), and header (`GraphAppHeader`) — only the **center column** content changes. Navigation between graph and dashboard is done via:

- A **"Dashboard"** breadcrumb pill in `GraphTopBar` (next to "Funding programmes").
- A **"Back to graph"** button inside the dashboard header area.

The dashboard is **read-only** and **client-side first**: it computes KPIs from the already-preloaded data in `useGraphData`'s store, with a single new backend aggregate endpoint as a stretch goal.

---

## 2. Design Breakdown (from mockup)

The dashboard body scrolls vertically inside the center column and contains these sections:

### 2.1 Dashboard Header Bar
- Breadcrumb toggle: `Funding programmes > Dashboard · 2026 portfolio`
- Placed inside `GraphTopBar` as an additional mode indicator

### 2.2 Portfolio Overview Hero
- Headline stat: **"2,148 calls across 6 programmes, tracked in one graph."**
- Subtitle copy explaining the live view
- Four mini-stat chips: programmes count, open calls, saved topics, AI searches

### 2.3 KPI Cards Row (4 cards)
| Card | Value | Subtext |
|------|-------|---------|
| Total Committed | `167.4 €B` | `+4.2% vs last quarter` |
| Open Calls | `412` | `+38 vs last quarter` |
| Closing in 30d | `64` | count |
| Topics Tracked | `38` | `+5 vs last quarter` |

Each card: dark-background tile, large number, sparkline/trend indicator, delta badge.

### 2.4 Funding by Programme (horizontal bar chart)
- Tab row: **Committed · Spot · Forecast**
- Horizontal bars for each programme (Horizon Europe, Connecting Europe, Digital Europe, Erasmus+, Creative Europe, Euratom)
- Budget value labels (e.g. `€51.7B`)
- Bottom axis legend: `2048 · 5891` (nodes/edges)

### 2.5 Calls Over Time (area/line chart)
- Title: "Calls over time"
- Subtitle: "Monthly count · open vs closed · 2026"
- Toggle: **Open · Closed**
- Stacked area chart (months Jan–Dec on x-axis)
- Colour-coded areas per programme

### 2.6 Topic Distribution (horizontal bar list)
- Title: "Topic distribution — Across all open calls"
- Rows: Digital & AI (420), Health (360), Mobility (250), Society (280), Other (298)
- Total badge: 540

### 2.7 Open Calls Closing Soon (data table)
- Title: "Open calls closing soon — Sorted by deadline · in your saved view"
- Filter pill: "All programmes"
- "View on graph" link
- Columns: Call ID | Topic | Stage | Budget | Deadline
- Rows with programme colour indicator, e.g. `HORIZON-CL5-2026-D3-01 | Climate adaptation | Stage 1 | €42M | Sep 18, 2026`

### 2.8 Recent Activity Feed (right-side panel)
- Title: "Recent activity — What changed in your portfolio"
- Timeline of events (pinned view, CORDIS sync, shared compare, AI search results, closed calls)
- Each entry: avatar/icon, description, time ago

### 2.9 Saved Searches (right-side panel)
- Title: "Saved searches — Run on the live graph"
- "+ New" button
- List items with label + hit count badge

### 2.10 Status Bar
- `Nodes: 2148 · Edges: 5891 · Layout: Dashboard view · Live`

---

## 3. Architecture

### 3.1 Routing: View-mode, not a new route

The dashboard lives **inside** `GraphPage` as an alternative view mode, not a separate route. This avoids duplicating providers, sidebar state, and data preloading.

```
GraphPage.js
├── state: viewMode = "graph" | "dashboard"
├── GraphAppHeader
├── LeftLegendColumn  (unchanged)
├── GraphMainColumn
│   ├── GraphTopBar   (adds Dashboard pill + toggle)
│   ├── if viewMode === "graph"  → NestedGraphController (existing)
│   └── if viewMode === "dashboard" → <PortfolioDashboard />
└── RightControlsColumn (unchanged)
```

### 3.2 New State in GraphPage.js

```js
const [viewMode, setViewMode] = useState("graph"); // "graph" | "dashboard"
```

Passed down to `GraphMainColumn` and `GraphTopBar`.

### 3.3 File Structure

```
frontend/src/components/GraphPage/
└── Dashboard/
    ├── PortfolioDashboard.jsx         # Main dashboard shell (scrollable grid)
    ├── useDashboardData.js            # Hook: computes all KPIs from preloaded store
    ├── DashboardHero.jsx              # Section 2.2 — headline + mini chips
    ├── KpiCard.jsx                    # Reusable KPI tile (section 2.3)
    ├── KpiCardsRow.jsx                # 4-card grid wrapper
    ├── FundingByProgramme.jsx         # Section 2.4 — horizontal bar chart
    ├── CallsOverTime.jsx              # Section 2.5 — area chart
    ├── TopicDistribution.jsx          # Section 2.6 — horizontal bars
    ├── OpenCallsTable.jsx             # Section 2.7 — sortable table
    ├── RecentActivity.jsx             # Section 2.8 — activity feed
    └── SavedSearches.jsx              # Section 2.9 — saved search list
```

```
frontend/src/styles/components/
└── _dashboard.scss                    # All dashboard styles
```

---

## 4. Implementation Tasks

### Phase 1: Scaffolding & Navigation

#### Task 1.1 — Add `viewMode` state to GraphPage.js
- Add `const [viewMode, setViewMode] = useState("graph")` to GraphPage.
- Pass `viewMode` and `setViewMode` down to `GraphMainColumn`.
- Pass `viewMode` and `setViewMode` down to `GraphTopBar`.

#### Task 1.2 — Add Dashboard toggle to GraphTopBar.jsx
- Add a "Dashboard" breadcrumb pill next to the existing breadcrumbs (left side of top bar).
- When `viewMode === "dashboard"`, the pill gets an `--active` class.
- Clicking the pill toggles `setViewMode("dashboard")`.
- When on dashboard, show a "Back to graph" button (matches the design's green pill in the top-right of the header).
- Style: reuse `.graph-topbar-breadcrumb` class family + new modifier.

#### Task 1.3 — Conditionally render dashboard in GraphMainColumn
- In `GraphMainColumn`, below `GraphTopBar`:
  - If `viewMode === "graph"` → render `NestedGraphController` + `TimelineScrubber` + `CompareDrawer` (existing).
  - If `viewMode === "dashboard"` → render `<PortfolioDashboard />`.
- The dashboard receives `loadFromStore` and `storeRef` so it can compute data.

#### Task 1.4 — Create PortfolioDashboard.jsx shell
- Scrollable container (`overflow-y: auto`) filling the center column.
- CSS grid layout matching the design: 2-column grid for the main body, with a narrower right column for activity/saved searches.
- Import sub-components (initially stubs).

#### Task 1.5 — Create `_dashboard.scss` and import in `main.scss`
- Define CSS variables for dashboard-specific colours (card backgrounds, sparkline colours).
- Use existing theme variables (`--card`, `--foreground`, `--border`, etc.) for consistency.
- Responsive: stack to single column below 1200px.

---

### Phase 2: Data Layer

#### Task 2.1 — Create `useDashboardData.js` hook
This hook iterates over all preloaded programme stores and computes aggregate KPIs client-side.

**Inputs:** `loadFromStore` function from `useGraphData`.

**Computed values:**

| KPI | Derivation |
|-----|-----------|
| `totalCalls` | Count all nodes where `type === "Call"` across all stores |
| `programmeCount` | Count of programme keys with data |
| `openCalls` | Calls where `status === "open"` or deadline > now |
| `closingIn30d` | Open calls with deadline within 30 days |
| `totalCommitted` | Sum of `totalCost` or `ecMaxContribution` across calls |
| `topicsTracked` | Count distinct topic nodes across stores |
| `callsByProgramme` | `{ [programmeKey]: { count, budget } }` |
| `callsByMonth` | `{ [monthKey]: { open, closed } }` for Calls Over Time chart |
| `topicDistribution` | `{ [topicName]: count }` sorted descending |
| `upcomingCalls` | Open calls sorted by deadline, first 10 |

The hook uses `useMemo` to avoid recomputation on every render.

#### Task 2.2 — Wire up data to PortfolioDashboard
- Call `useDashboardData(loadFromStore)` in `PortfolioDashboard`.
- Pass computed values to child components.

---

### Phase 3: KPI Cards & Hero

#### Task 3.1 — Implement DashboardHero.jsx
- Large teal headline number (total calls).
- Subtitle text.
- Row of 4 mini-chip stats (programmes, open calls, topics, searches).
- All values from `useDashboardData`.

#### Task 3.2 — Implement KpiCard.jsx
- Props: `title`, `value`, `unit`, `delta`, `deltaLabel`, `sparkData` (optional).
- Dark card with rounded corners, large value, small delta badge (green/red based on sign).
- Sparkline: simple SVG polyline (no charting library needed).

#### Task 3.3 — Implement KpiCardsRow.jsx
- CSS grid: 4 equal columns (2×2 on narrow screens).
- Renders 4 `KpiCard` instances: Total Committed, Open Calls, Closing in 30d, Topics Tracked.

---

### Phase 4: Charts

#### Task 4.1 — Implement FundingByProgramme.jsx
- Tab bar: Committed / Spot / Forecast (only "Committed" active initially).
- Horizontal bar per programme, coloured by programme palette (reuse Cytoscape palette colours from `palette.js`).
- Budget label at end of bar.
- Pure CSS bars (width % of max) — no charting library required.

#### Task 4.2 — Implement CallsOverTime.jsx
- Toggle: Open / Closed.
- SVG area chart showing monthly call counts.
- X-axis: month labels (Jan–Dec).
- Coloured areas stacked by programme.
- Lightweight custom SVG — or optionally use `recharts` if already a dependency (check `package.json`).

#### Task 4.3 — Implement TopicDistribution.jsx
- Horizontal bar list with topic name, count badge, and CSS bar.
- "Total" header badge.
- Sorted by count descending, top 5–8 topics.

---

### Phase 5: Table & Panels

#### Task 5.1 — Implement OpenCallsTable.jsx
- Styled HTML `<table>` (or MUI `<Table>`).
- Columns: Call ID, Topic, Stage, Budget, Deadline.
- Each row has a coloured dot indicating the programme.
- Sorted by deadline ascending (soonest first).
- "View on graph" link: sets `viewMode("graph")` and triggers `setPendingNav` to navigate to that call.
- Programme filter dropdown (optional v2).

#### Task 5.2 — Implement RecentActivity.jsx
- Static/mock activity feed initially.
- Timeline layout: icon, description, relative timestamp.
- Future: connect to a real activity log backend.

#### Task 5.3 — Implement SavedSearches.jsx
- Static/mock list initially.
- Each item: label + count badge.
- "+ New" button (no-op placeholder initially).
- Future: connect to saved-search persistence.

---

### Phase 6: Styling & Polish

#### Task 6.1 — Dashboard grid layout
- 12-column CSS grid inside `.dashboard-shell`.
- Hero: full width (12 cols).
- KPI cards: full width (12 cols), internal 4-col grid.
- Funding by Programme: 7 cols. Calls Over Time: 5 cols.
- Topic Distribution: 7 cols. Open Calls Table: 7 cols.
- Recent Activity + Saved Searches: 5 cols (stacked).
- Dark-themed cards matching the mockup's navy palette (works in both light/dark via CSS vars).

#### Task 6.2 — Responsive behaviour
- Below 1200px: charts and panels stack to full-width single-column.
- Below 768px: KPI cards become 2×2 grid.
- Scrollable within the center column (left/right sidebars stay fixed).

#### Task 6.3 — Status bar update
- When `viewMode === "dashboard"`, the `GraphStatusBar` shows `Layout: Dashboard view · Live` instead of the layout engine name.

---

## 5. Dependency Analysis

| Dependency | Status | Notes |
|-----------|--------|-------|
| React, MUI | Already installed | Used for table, tooltips, icons |
| Recharts or chart lib | **Not installed** | Options: (a) pure SVG/CSS charts, (b) add `recharts` (~45KB gzip). Recommend pure SVG for bars, consider recharts only for the area chart. |
| `palette.js` colours | Available | Reuse programme colours for chart bars |
| `useGraphData` store | Available | All programme data already preloaded |
| New backend endpoints | **Not needed** for v1 | All KPIs derivable client-side from preloaded node/relationship data |

---

## 6. Data Flow

```
useGraphData (existing)
  └─ storeRef: Map<programmeKey, { nodes, rels }>
       └─ useDashboardData(loadFromStore)
            ├─ iterates all programme keys
            ├─ counts/aggregates Call nodes
            ├─ sums budgets from node properties
            ├─ groups by month, topic, programme
            └─ returns memoized KPI object
                 └─ passed as props to dashboard sub-components
```

No new API calls. No new backend routes for v1.

---

## 7. Files Modified (existing)

| File | Change |
|------|--------|
| `GraphPage.js` | Add `viewMode` / `setViewMode` state, pass to children |
| `GraphMainColumn.jsx` | Conditional render: graph vs dashboard |
| `GraphTopBar.jsx` | Add Dashboard pill button, "Back to graph" button |
| `GraphStatusBar.jsx` | Show "Dashboard view" when `viewMode === "dashboard"` |
| `main.scss` | Add `@import "../components/dashboard"` |

## 8. Files Created (new)

| File | Purpose |
|------|---------|
| `Dashboard/PortfolioDashboard.jsx` | Dashboard shell with CSS grid layout |
| `Dashboard/useDashboardData.js` | Client-side KPI aggregation hook |
| `Dashboard/DashboardHero.jsx` | Hero headline section |
| `Dashboard/KpiCard.jsx` | Reusable KPI tile |
| `Dashboard/KpiCardsRow.jsx` | 4-card grid |
| `Dashboard/FundingByProgramme.jsx` | Horizontal bar chart |
| `Dashboard/CallsOverTime.jsx` | Area/line chart |
| `Dashboard/TopicDistribution.jsx` | Topic bar list |
| `Dashboard/OpenCallsTable.jsx` | Upcoming calls data table |
| `Dashboard/RecentActivity.jsx` | Activity feed |
| `Dashboard/SavedSearches.jsx` | Saved search list |
| `styles/components/_dashboard.scss` | All dashboard styles |

---

## 9. Out of Scope (v1)

- **"Live · CORDIS sync" button** — excluded per requirements.
- **Real-time polling / WebSocket** updates — dashboard refreshes when preloaded data refreshes.
- **Saved searches persistence** — mocked UI only.
- **Activity feed backend** — mocked UI only.
- **Forecast / Spot tabs** — only "Committed" tab is functional.
- **New backend aggregate endpoint** — all data derived client-side.

---

## 10. Implementation Order

```
Phase 1 (Scaffolding)  →  1.1, 1.2, 1.3, 1.4, 1.5
Phase 2 (Data)         →  2.1, 2.2
Phase 3 (KPIs)         →  3.1, 3.2, 3.3
Phase 4 (Charts)       →  4.1, 4.2, 4.3
Phase 5 (Table/Panels) →  5.1, 5.2, 5.3
Phase 6 (Polish)       →  6.1, 6.2, 6.3
```

Phases 3–5 can be parallelized once Phase 2 is complete. Each task is independently testable.
