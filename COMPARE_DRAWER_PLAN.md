# Compare Drawer - Implementation Plan

## 1. Overview

The Compare Drawer is a floating panel that allows users to select two graph nodes (programmes, pillars, clusters, or destinations - **not** calls) and view a side-by-side comparison of their key metrics. It overlays the graph canvas similarly to the existing `HoveredNodeInfo` hover card.

**Reference design:** `.claude/redesign/Compare drawer _ two programmes side-by-side.png`

---

## 2. Design Breakdown (from image)

### 2.1 Panel Layout

- **Position:** Floating card overlaying the graph canvas, centered/right-of-center
- **Shape:** Rounded rectangle (`borderRadius: 16px`), matching `HoverCardShell` styling
- **Background:** `var(--card)` with border `var(--border)`, shadow + backdrop blur (same as hover card)
- **Width:** ~420px (wider than the 360px hover card to accommodate two columns)
- **Max height:** Scrollable if content overflows

### 2.2 UI Elements (top to bottom)

#### Header Row
- **Compare icon** (left) - MUI `CompareArrowsIcon` or similar
- **Title:** "Compare programmes" (Typography, bold)
- **Close button (X)** (top-right) - same pattern as `HoverCardShell`

#### Two-Column Programme Headers
- **Left column:** Node 1 name + colored dot + subtitle (e.g. "PROGRAMME . 2021-27")
- **Right column:** Node 2 name + colored dot + subtitle
- Each shows the node's visual color (from `nodeVisual`) and type label

#### Comparison Metric Rows
Each row has: label (left) | value A (center-left) | value B (center-right)

| Metric | Source |
|--------|--------|
| **TOTAL BUDGET** | Aggregated from `indicative_budget` of all descendant Call nodes |
| **PILLARS / STRANDS** | Count of immediate children at the pillar/strand level |
| **OPEN CALLS** | Count of descendant Call nodes |
| **AVG CALL SIZE** | Total budget / open calls |
| **TOPICS** | Count of unique tags/topics across descendant nodes |

#### Shared Topics Section
- **Label:** "SHARED TOPICS"
- **Link:** "All in common" (clickable, could show full list)
- Lists topic overlap between the two selected nodes

#### Topic Overlap - Top 5
- **Label:** "TOPIC OVERLAP - TOP 5"
- **Tag pills/chips:** Shows the top 5 shared topics as chip elements (same style as `TagChips` component)

### 2.3 Breadcrumb Integration
- In the `GraphTopBar`, a new breadcrumb tab appears: **"Compare: HE > Erasmus+"**
- Styled as a highlighted pill/chip with `var(--primary)` background
- Appears after the current breadcrumb level when compare mode is active

### 2.4 Sidebar Button
- A new **Compare icon button** in the `SidebarControls` right rail
- Uses `CompareArrowsIcon` from MUI
- Toggles compare mode on/off
- Shows active state (`sidebar-controls-button--active`) when compare mode is enabled
- Position: between the Timeline Scrubber button and the divider

---

## 3. Architecture & State Management

### 3.1 New State (in `GraphPage.js`)

```js
// Compare mode toggle
const [compareOpen, setCompareOpen] = useState(false);

// Selected nodes for comparison (max 2)
const [compareNodes, setCompareNodes] = useState([]);
// Shape: [{ id, label, type, source, nodeVisual, data }, ...]
```

### 3.2 State Flow

1. User clicks the **Compare button** in the sidebar → `compareOpen = true`
2. Graph enters **compare selection mode** - clicking a non-call node adds it to `compareNodes[]` (max 2)
3. When `compareNodes.length === 2`, the **CompareDrawer** panel renders with comparison data
4. User can clear a selection or close the drawer entirely
5. Closing the drawer resets `compareOpen = false` and `compareNodes = []`

### 3.3 Node Selection During Compare Mode

- When `compareOpen` is true, node tap/click behavior changes:
  - **Call nodes:** Ignored (compare is not for calls)
  - **Programme/Pillar/Cluster/Destination nodes:** Added to `compareNodes` (if < 2 selected), or replaces the second selection
  - Visual feedback: Selected nodes get a distinct ring/highlight in the graph (via Cytoscape class `compare-selected`)

---

## 4. Data Sources & Computation

### 4.1 Available Data from Backend

Each programme/cluster has nodes and relationships served via the existing API endpoints defined in `useGraphData.js > GRAPH_ENDPOINTS`:

| Programme | Nodes Endpoint | Relationships Endpoint |
|-----------|---------------|----------------------|
| Cluster 1-6 | `/cluster{N}/nodes` | `/cluster{N}/relationships` |
| ERC, MSCA, INFRA | `/{name}/nodes` | `/{name}/relationships` |
| EIC, EIE | `/{name}/nodes` | `/{name}/relationships` |
| MISS | `/missions/nodes` | `/missions/relationships` |
| WIDERA | `/widera/nodes` | `/widera/relationships` |
| DEP | `/dep/nodes` | `/dep/relationships` |
| ERASMUS | `/erasmus/nodes` | `/erasmus/relationships` |
| CEF | `/cef/nodes` | `/cef/relationships` |
| CREA | `/crea/nodes` | `/crea/relationships` |
| EURATOM | `/euratom/nodes` | `/euratom/relationships` |

All data is already preloaded by `useGraphData` into `storeRef` (a `Map`), accessible via `loadFromStore(key)`.

### 4.2 Node Data Fields (from `base_cluster_builder.py`)

Each **Call** node has:
- `id`, `name`, `type: "Call"`, `source`
- `indicative_budget`, `min_contribution`, `max_contribution`
- `opening_date`, `deadline`, `deadlines`
- `tags`, `keywords`
- `type_of_action`, `status`

Each **Destination** node has:
- `id`, `name`, `type: "Destination"`, `source`, `summary`

Each **Cluster** node has:
- `id`, `name`, `type: "Cluster"`, `source`, `summary`

### 4.3 Comparison Metrics Computation

All metrics will be computed **client-side** from the already-preloaded data in `storeRef` (no new backend endpoints needed).

```
function computeCompareMetrics(programmeKey, loadFromStore) {
  const raw = loadFromStore(programmeKey);
  if (!raw) return null;

  const { nodeElements } = buildElements(raw);

  // Count by type
  const calls = nodeElements.filter(n => n.data.type === "Call");
  const destinations = nodeElements.filter(n => n.data.type === "Destination");

  // Total budget: sum of indicative_budget across all calls
  const totalBudget = calls.reduce((sum, c) => {
    const b = parseFloat(c.data.indicative_budget);
    return sum + (isFinite(b) ? b : 0);
  }, 0);

  // Open calls count
  const openCalls = calls.length;

  // Avg call size
  const avgCallSize = openCalls > 0 ? totalBudget / openCalls : 0;

  // Topics: unique tags across all nodes
  const topicSet = new Set();
  nodeElements.forEach(n => {
    const tags = n.data.tags || n.data.keywords || [];
    (Array.isArray(tags) ? tags : []).forEach(t => topicSet.add(t));
  });

  // Pillars/strands: count of Destination nodes (immediate children)
  const pillarsOrStrands = destinations.length;

  return {
    totalBudget,
    pillarsOrStrands,
    openCalls,
    avgCallSize,
    topics: topicSet.size,
    topicList: [...topicSet],
  };
}
```

### 4.4 Shared Topics Computation

```
function computeSharedTopics(topicsA, topicsB) {
  const setB = new Set(topicsB.map(t => t.toLowerCase()));
  return topicsA.filter(t => setB.has(t.toLowerCase()));
}
```

### 4.5 Programme Metadata

Programme display names, summaries, and period labels come from:
- `frontend/src/components/utils/nodeSummaries.json` - titles and summaries for all programmes
- `frontend/src/components/utils/heClusterSummaries.json` - cluster-specific summaries
- Period (e.g. "2021-27") can be hardcoded as all current EU programmes share this framework period

---

## 5. Component Structure

### 5.1 New Files to Create

```
frontend/src/components/GraphPage/CompareDrawer/
  CompareDrawer.jsx          # Main drawer component
  useCompareData.js          # Hook: computes comparison metrics from store
  CompareMetricRow.jsx       # Single metric comparison row
  CompareNodeHeader.jsx      # Programme header with dot + name + subtitle
  CompareTopicOverlap.jsx    # Shared topics + top-5 overlap section
```

### 5.2 Files to Modify

| File | Change |
|------|--------|
| `GraphPage/GraphPage.js` | Add `compareOpen`, `compareNodes` state; pass to children |
| `GraphPage/ui/RightControlsColumn.jsx` | Pass `compareOpen`, `setCompareOpen` props |
| `GraphPage/ui/SidebarControls.jsx` | Add Compare icon button |
| `GraphPage/ui/GraphMainColumn.jsx` | Render `<CompareDrawer>` overlay |
| `GraphPage/ui/GraphTopBar.jsx` | Show "Compare: A > B" breadcrumb pill when active |
| `styles/components/_sidebar-controls.scss` | No changes needed (existing styles cover new button) |

### 5.3 New SCSS File

```
frontend/src/styles/components/_compare-drawer.scss
```

Must be imported in `main.scss`.

---

## 6. Detailed Component Specifications

### 6.1 `CompareDrawer.jsx`

**Props:**
```js
{
  open: boolean,              // Whether the drawer is visible
  nodes: Array,               // Array of 0-2 selected node objects
  loadFromStore: Function,    // From useGraphData
  cyInstance: Object,          // Cytoscape instance (for node visuals)
  onClose: Function,          // Close the drawer
  onClearNode: Function,      // Clear one node (index)
}
```

**Behavior:**
- If `nodes.length < 2`: Show placeholder prompting user to select nodes ("Select two programmes to compare")
- If `nodes.length === 2`: Show full comparison panel
- Rendered as a `position: fixed` or portal overlay (like `HoveredNodeInfo`)
- Uses `createPortal(card, document.body)` for z-index safety

**Visual structure:**
```
┌────────────────────────────────────────────┐
│ [icon] Compare programmes              [X] │
├──────────────────┬─────────────────────────┤
│  ● Horizon Europe│  ● Erasmus+             │
│  PROGRAMME·21-27 │  PROGRAMME·21-27        │
├──────────────────┴─────────────────────────┤
│  TOTAL BUDGET     €95.5 B      €26.5 B     │
│  PILLARS/STRANDS  4            3           │
│  OPEN CALLS       128          14          │
│  AVG CALL SIZE    €18.4 M      €2.1 M     │
│  TOPICS           1,247        312         │
├────────────────────────────────────────────┤
│  SHARED TOPICS                  All in cmn │
├────────────────────────────────────────────┤
│  TOPIC OVERLAP - TOP 5                     │
│  [health] [youth] [skills] [participation] │
│  [ethics] [innovation] [science]           │
└────────────────────────────────────────────┘
```

### 6.2 `useCompareData.js`

**Input:** `(nodeA, nodeB, loadFromStore)`

**Output:**
```js
{
  metricsA: { totalBudget, pillarsOrStrands, openCalls, avgCallSize, topics, topicList },
  metricsB: { totalBudget, pillarsOrStrands, openCalls, avgCallSize, topics, topicList },
  sharedTopics: string[],
  topOverlap: string[],      // top 5 shared topics
}
```

**Logic:**
1. Determine the `programmeKey` for each node from its `id`, `programmeKey`, or `data.programmeKey`
2. Call `loadFromStore(programmeKey)` to get raw data
3. Use `buildElements(raw)` to get typed node elements
4. Compute metrics as described in section 4.3
5. Compute shared topics as described in section 4.4
6. Memoize with `useMemo` keyed on node IDs

### 6.3 `CompareMetricRow.jsx`

**Props:** `{ label, valueA, valueB }`

Renders a single row:
```
LABEL              valueA          valueB
```

Uses small caps label style (`fontSize: 11, fontWeight: 700, color: var(--foreground-muted)`) matching existing `MetricCards` labels.

### 6.4 `CompareNodeHeader.jsx`

**Props:** `{ node, nodeVisual, onClear }`

Renders the programme header with:
- Colored dot (32x32, from `nodeVisual`)
- Programme name (bold, 14px)
- Type + period subtitle (muted, 11px) e.g. "PROGRAMME . 2021-27"

### 6.5 `CompareTopicOverlap.jsx`

**Props:** `{ sharedTopics, topOverlap }`

Renders:
- "SHARED TOPICS" label with "All in common" link
- "TOPIC OVERLAP - TOP 5" label
- Tag chips using same `TagChips` component or equivalent styling

---

## 7. Node Selection Mechanism

### 7.1 How Nodes Get Selected

When `compareOpen === true`:

1. **In `GraphView` / `setupEvents`:** The existing node tap handler checks if compare mode is active
2. If the tapped node is a Call → ignore (no comparison for calls)
3. If `compareNodes.length < 2` → add node to `compareNodes`
4. If `compareNodes.length === 2` → replace second node
5. Selected nodes get a Cytoscape class `.compare-selected` for visual highlighting

### 7.2 Determining the Programme Key for a Node

A mapping function resolves any node to its parent programme key:

```js
function resolveCompareKey(nodeData) {
  const id = nodeData.id || "";
  const type = (nodeData.type || "").toLowerCase();

  // Programme nodes on ROOT/Pillar layers have programmeKey
  if (nodeData.programmeKey) return nodeData.programmeKey;

  // Strip "PROG_" prefix from synthetic navigation nodes
  if (id.startsWith("PROG_")) return id.replace("PROG_", "");

  // Cluster/Destination/Call nodes have a `source` field
  const sourceMap = {
    cluster_1: "Cluster_1", cluster_2: "Cluster_2",
    cluster_3: "Cluster_3", cluster_4: "Cluster_4",
    cluster_5: "Cluster_5", cluster_6: "Cluster_6",
    dep: "DEP", erasmus: "ERASMUS",
    cef: "CEF", crea: "CREA", euratom: "EURATOM",
    eic: "EIC", eie: "EIE", erc: "ERC",
    msca: "MSCA", infra: "INFRA",
    missions: "MISS", widera: "WIDERA",
  };
  const src = (nodeData.source || "").toLowerCase();
  if (sourceMap[src]) return sourceMap[src];

  // Pillar nodes
  if (/^PILLAR_/.test(id)) return id;

  return id;
}
```

---

## 8. Sidebar Button Integration

### 8.1 Location in `SidebarControls.jsx`

Add the Compare button **after the Timeline Scrubber button** and **before the divider**:

```jsx
<Tooltip {...tooltipProps} title="Compare programmes">
  <IconButton
    className={`sidebar-controls-button${compareOpen ? " sidebar-controls-button--active" : ""}`}
    onClick={() => setCompareOpen((prev) => !prev)}
  >
    <CompareArrowsIcon fontSize="small" />
  </IconButton>
</Tooltip>
```

### 8.2 New Props for SidebarControls

```js
compareOpen: boolean
setCompareOpen: (fn) => void
```

These flow from `GraphPage` → `RightControlsColumn` → `SidebarControls`.

---

## 9. Breadcrumb Integration

### 9.1 In `GraphTopBar.jsx`

When `compareOpen && compareNodes.length === 2`, render an additional breadcrumb pill after the current breadcrumbs:

```jsx
{compareActive && (
  <Box className="graph-topbar-compare-pill">
    <Typography variant="caption">
      Compare: {nodeA.label} &gt; {nodeB.label}
    </Typography>
  </Box>
)}
```

### 9.2 Styling

```scss
.graph-topbar-compare-pill {
  display: inline-flex;
  align-items: center;
  padding: 2px 12px;
  border-radius: 12px;
  background: var(--primary);
  color: var(--primary-foreground);
  font-size: 12px;
  font-weight: 600;
  margin-left: 8px;
}
```

---

## 10. Styling (`_compare-drawer.scss`)

```scss
.compare-drawer {
  position: fixed;
  z-index: 1200;
  top: 50%;
  right: 80px; /* offset from sidebar */
  transform: translateY(-50%);
  width: 420px;
  max-width: calc(100vw - 100px);
  max-height: calc(100vh - 48px);
  overflow-y: auto;
  border-radius: 16px;
  padding: 20px;
  background-color: var(--card);
  color: var(--card-foreground);
  border: 1px solid var(--border);
  box-shadow: 0 18px 44px rgba(2, 6, 23, 0.18),
              0 6px 16px rgba(2, 6, 23, 0.12);
  backdrop-filter: blur(10px);
}

.compare-drawer__header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 16px;
}

.compare-drawer__columns {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
  margin-bottom: 16px;
}

.compare-drawer__metric-row {
  display: grid;
  grid-template-columns: 1fr 1fr 1fr;
  gap: 4px;
  padding: 6px 0;
  border-bottom: 1px solid var(--border);
  align-items: center;
}

.compare-drawer__metric-label {
  font-size: 11px;
  font-weight: 700;
  color: var(--foreground-muted);
  text-transform: uppercase;
  letter-spacing: 0.03em;
}

.compare-drawer__metric-value {
  font-size: 14px;
  font-weight: 700;
  text-align: right;
}
```

---

## 11. Cytoscape Visual Feedback

When a node is selected for comparison, add a CSS class to highlight it:

```js
// In graph stylesheet (cyStylesheet.js or equivalent)
{
  selector: ".compare-selected",
  style: {
    "border-width": 4,
    "border-color": "#3d8fff",
    "border-opacity": 1,
    "overlay-opacity": 0.1,
    "overlay-color": "#3d8fff",
  }
}
```

---

## 12. Implementation Order

### Phase 1: Core State & Sidebar Button
1. Add `compareOpen` and `compareNodes` state to `GraphPage.js`
2. Wire props through `RightControlsColumn` → `SidebarControls`
3. Add the Compare icon button to `SidebarControls.jsx`

### Phase 2: Node Selection Mechanism
4. Modify node tap handler to support compare selection mode
5. Add `compare-selected` Cytoscape class styling
6. Implement `resolveCompareKey()` utility

### Phase 3: Compare Data Hook
7. Create `useCompareData.js` hook
8. Implement metric computation from preloaded store data
9. Implement shared topics computation

### Phase 4: Compare Drawer UI
10. Create `CompareDrawer.jsx` main component
11. Create `CompareNodeHeader.jsx` sub-component
12. Create `CompareMetricRow.jsx` sub-component
13. Create `CompareTopicOverlap.jsx` sub-component
14. Create `_compare-drawer.scss` styles
15. Render `CompareDrawer` in `GraphMainColumn.jsx`

### Phase 5: Breadcrumb Integration
16. Add compare pill to `GraphTopBar.jsx`
17. Pass compare state to GraphTopBar

### Phase 6: Polish & Edge Cases
18. Handle node deselection (click selected node again to deselect)
19. Handle graph layer changes while compare is open (reset selection)
20. Handle comparing nodes from different layers/programmes
21. Format budget values (€95.5 B, €18.4 M etc.)
22. Responsive behavior for smaller screens
23. Draggable drawer (reuse `useHoverCardDrag` pattern)

---

## 13. Budget Formatting Utility

```js
function formatBudget(value) {
  if (!value || !isFinite(value)) return "N/A";
  if (value >= 1e9) return `€${(value / 1e9).toFixed(1)} B`;
  if (value >= 1e6) return `€${(value / 1e6).toFixed(1)} M`;
  if (value >= 1e3) return `€${(value / 1e3).toFixed(1)} K`;
  return `€${value.toLocaleString()}`;
}
```

---

## 14. Key Dependencies

- **No new npm packages** required
- Uses existing: MUI (`@mui/material`, `@mui/icons-material`), React Bootstrap (`Col`), React Router
- MUI Icons needed: `CompareArrowsIcon`, `CloseIcon` (already imported elsewhere)
- Reuses: `TagChips`, `buildElements`, `loadFromStore`, `createPortal`

---

## 15. Edge Cases & Considerations

| Scenario | Handling |
|----------|----------|
| User selects same node twice | Prevent duplicate; show warning or ignore second click |
| Node has no budget data | Show "N/A" instead of €0 |
| Node has no tags/topics | Show "No topics available" in overlap section |
| User navigates to a different layer while compare is open | Reset compare state (`compareNodes = []`) |
| User compares Pillar vs Programme | Both should work - metrics are computed from their descendant data |
| Call nodes in compare mode | Ignored; only non-call nodes above call layer are selectable |
| Mobile / narrow viewport | Drawer takes full width with reduced padding; stack columns vertically below 480px |
| Compare mode + hover card | Both can coexist; hover card appears on top of compare drawer |
