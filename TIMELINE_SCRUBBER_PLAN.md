# Timeline Scrubber Implementation Plan

## 1. Overview

Integrate a "Calls over time" timeline scrubber into the bottom of the graph canvas area. The scrubber displays a bar chart of open calls aggregated by month across all datasets visible in the current graph layer. Users can drag a range selection to filter the graph to only show calls open within that date window.

### Design Reference (from image)

The scrubber occupies a horizontal strip at the bottom of the graph canvas (above the status bar). It contains:

- **Left label area**: "Calls over time" title + a call count badge (e.g. "61 CALLS")
- **Bar chart area**: Monthly bars showing the number of open calls per month, spanning the full time range of the data (approx. 2024-2027). Bars are semi-transparent blue, rendered on a dark background consistent with the graph surface.
- **Selection range overlay**: A draggable highlighted window over the bars indicating the currently filtered date range.
- **Right date label**: Shows the selected range as "Sept 2026 > Dec 2026".
- **Collapse/expand affordance**: A small toggle on the scrubber panel or accessible via the right sidebar icon rail.

---

## 2. Graph Layer Hierarchy and Scoping

The layer hierarchy is:

```
ROOT (All EU funding programmes)
  > Specific funding programmes (Horizon Europe, Digital Europe, Erasmus+, CEF, CREA, EURATOM)
    > Pillars (P1, P2, P3, WIDERA) [Horizon Europe only]
      > Clusters / Programmes (Cluster_1..6, ERC, MSCA, etc.)
        > Destinations
          > Calls
```

The scrubber must show **all calls reachable under the current layer**:

| Current Layer | Calls shown |
|---|---|
| ROOT | All calls across all programmes |
| Programme (e.g. DEP) | All calls in that programme's dataset |
| Pillar (e.g. PILLAR_P2) | All calls in all programmes under that pillar |
| Cluster/Programme (e.g. Cluster_1) | All calls in that specific dataset |
| Destination (e.g. DEST_xxx) | Only calls linked to that destination |
| Call (single call selected) | Just that one call's date range |

---

## 3. Call Data Model

Calls have two key date fields (confirmed from backend data):

```json
{
  "opening_date": "2025-05-16",
  "deadline": "2025-09-16"
}
```

Some calls may also have a `deadlines` array with multiple deadline strings. A call is considered "open" for any month between its `opening_date` and its latest `deadline`.

**Fallback handling**: If a call is missing `opening_date` or `deadline`, it should be excluded from the scrubber histogram but still counted in the total.

---

## 4. Architecture

### 4.1 New Files

| File | Purpose |
|---|---|
| `frontend/src/components/GraphPage/TimelineScrubber/TimelineScrubber.jsx` | Main component |
| `frontend/src/components/GraphPage/TimelineScrubber/TimelineBarChart.jsx` | SVG bar chart with draggable range |
| `frontend/src/components/GraphPage/TimelineScrubber/useTimelineData.js` | Hook: collects all calls from the store, buckets into months |
| `frontend/src/components/GraphPage/TimelineScrubber/useTimelineSelection.js` | Hook: manages selection range state, drag interaction |
| `frontend/src/components/GraphPage/TimelineScrubber/utils.js` | Date parsing/bucketing helpers |
| `frontend/src/styles/components/_timeline-scrubber.scss` | All styling |

### 4.2 Modified Files

| File | Change |
|---|---|
| `frontend/src/components/GraphPage/ui/GraphMainColumn.jsx` | Add `<TimelineScrubber />` between graph canvas and `<GraphStatusBar />` |
| `frontend/src/components/GraphPage/GraphPage.js` | Add timeline state (selection range), pass to GraphMainColumn + NestedGraphController |
| `frontend/src/components/GraphPage/ui/SidebarControls.jsx` | Add a new sidebar button to toggle scrubber visibility |
| `frontend/src/components/NestedGraphController.js` | Apply call date filtering via Cytoscape class toggling when selection range changes |
| `frontend/src/styles/main/main.scss` | Import `_timeline-scrubber.scss` |

---

## 5. Detailed Component Design

### 5.1 `useTimelineData(loadFromStore, currentLevels, currentKey)`

**Purpose**: Extracts all call nodes reachable under the current layer, parses their dates, and returns monthly histogram data.

**Logic**:

1. **Determine which datasets to scan** based on `currentKey`:
   - `ROOT`: scan ALL dataset keys from `loadFromStore("__keys__")`
   - `HE_ROOT`: scan all HE programme keys (Cluster_1..6, ERC, MSCA, INFRA, MISS, EIC, EIE, WIDERA)
   - `PILLAR_*`: scan the programme keys defined in `PROGRAMMES_BY_PILLAR[pillarId]`
   - Specific programme (e.g. `Cluster_1`, `DEP`): scan only that one dataset
   - `DEST_*`: scan the parent dataset, filter to calls linked to that destination
   - Already at call layer: just the current elements

2. **For each dataset**, call `loadFromStore(key)`, then `buildElements(raw)` to get `nodeElements` and `edgeElements`.

3. **Extract call nodes**: filter nodes where `type === "Call"` or `category === "Call"`.

4. **For destination layers** (`DEST_*`): further filter calls by checking `HAS_CALL` edges from the destination ID.

5. **Parse dates**: For each call, extract `opening_date` and `deadline` (or latest entry in `deadlines[]`). Parse as `Date` objects.

6. **Compute global time range**: min `opening_date` to max `deadline` across all calls.

7. **Bucket into months**: For each month in the range, count how many calls are "open" (their `[opening_date, deadline]` interval overlaps that month).

8. **Return**:
   ```js
   {
     buckets: [{ month: "2024-01", label: "Jan 2024", count: 5 }, ...],
     totalCalls: 61,
     timeRange: { min: Date, max: Date },
     callsWithDates: [...], // for filtering
   }
   ```

9. **Memoization**: Use `useMemo` keyed on `currentKey` and the store reference. The store is preloaded once at startup (see `useGraphData.js`), so this is cheap.

### 5.2 `useTimelineSelection(buckets)`

**Purpose**: Manages the selected date range and the drag interaction.

**State**:
- `selectionRange: { startIdx: number, endIdx: number }` - indices into the `buckets` array
- `isDragging: boolean`
- `dragEdge: 'left' | 'right' | 'body' | null`

**Behavior**:
- Default selection: the full range (all months selected)
- User can drag the left edge, right edge, or the body of the selection
- Clicking outside the selection creates a new selection from that point
- Exposes `selectedRange: { start: Date, end: Date }` computed from the selected bucket indices
- Exposes `selectedCallCount: number` (calls open within selected range)

### 5.3 `TimelineBarChart.jsx`

**Purpose**: Pure SVG rendering of the bar chart + selection overlay.

**Props**:
- `buckets`: array of `{ month, label, count }`
- `selectionRange`: `{ startIdx, endIdx }`
- `onSelectionChange(startIdx, endIdx)`
- `maxCount`: max bar height reference
- `width`, `height`: container dimensions

**Rendering**:
- Use a responsive container (ResizeObserver or ref-based) to measure available width
- Each bar: `x = i * barWidth`, `height = (count / maxCount) * chartHeight`
- Bar color: `var(--chart-1)` (maps to `#47a9ff` in dark mode) at ~60% opacity for unselected, ~90% for selected
- Selection overlay: a semi-transparent rectangle behind the selected bars with a subtle border
- X-axis: month labels at regular intervals (every 3 or 6 months), showing abbreviated month + year
- Drag handles: invisible wider hit areas on left/right edges of the selection

**Interactions** (pointer events):
- `onPointerDown` on left/right edge -> start edge drag
- `onPointerDown` on selection body -> start body drag
- `onPointerMove` (on document) -> update during drag
- `onPointerUp` (on document) -> end drag
- `onClick` on bar outside selection -> jump selection to that point

### 5.4 `TimelineScrubber.jsx`

**Purpose**: Composite component assembling the label area, bar chart, and date display.

**Props**:
- `loadFromStore`
- `currentKey` (current layer key, e.g. "ROOT", "Cluster_1", "DEST_xxx")
- `levels` (the breadcrumb level stack from NestedGraphController)
- `onSelectionChange(range)` - callback when user changes date range
- `isOpen` / `onToggle` - collapse/expand state

**Layout**:
```
+-------------------------------------------------------------------+
| [collapse] Calls over time  ·  61 CALLS  |  [===BAR CHART===]  |  Sept 2026 > Dec 2026  |
+-------------------------------------------------------------------+
```

- Left section (fixed width ~200px): title + call count pill
- Center section (flex: 1): `<TimelineBarChart />`
- Right section (fixed width ~160px): selected date range label
- Entire panel: ~80px height when expanded, ~0px when collapsed (animated)

**Collapsed state**: Panel shrinks to 0 height with CSS transition. A sidebar button or small tab remains visible.

### 5.5 Sidebar Toggle Button

Add a new `IconButton` in `SidebarControls.jsx` (between the bookmark and email buttons, or after the divider). Use `TimelineIcon` or `BarChartIcon` from MUI icons. Tooltip: "Timeline scrubber".

### 5.6 Graph Filtering via Cytoscape

When the selection range changes, `NestedGraphController` (or `GraphPage`) applies filtering:

1. Get the selected `{ start: Date, end: Date }` from the scrubber.
2. For each call node in the current Cytoscape instance:
   - Parse its `opening_date` and `deadline`
   - If the call's open period **does not overlap** the selected range, add class `"timeline-hidden"`
   - If it does overlap, remove class `"timeline-hidden"`
3. Add a stylesheet rule for `.timeline-hidden` that sets `display: none` or `opacity: 0` + `events: no`.

This approach is consistent with the existing pattern of class-based toggling (see `call-hidden` class used in `NestedGraphController.js:462`).

---

## 6. Styling Specification

### 6.1 Panel Container (`_timeline-scrubber.scss`)

```scss
.timeline-scrubber {
  flex-shrink: 0;
  height: 80px;
  display: flex;
  align-items: center;
  padding: 0 16px;
  background: var(--sidebar);           // #0b1628 in dark mode
  border-top: 1px solid var(--border);  // matches statusbar border
  transition: height 0.3s ease, opacity 0.3s ease;
  overflow: hidden;
  gap: 16px;
}

.timeline-scrubber.is-collapsed {
  height: 0;
  padding: 0;
  border-top: none;
  opacity: 0;
  pointer-events: none;
}
```

### 6.2 Left Label Section

```scss
.timeline-scrubber__label {
  flex: 0 0 auto;
  display: flex;
  align-items: center;
  gap: 10px;
  min-width: 180px;
}

.timeline-scrubber__title {
  font-size: var(--text-xs);      // 12px
  font-weight: 500;
  color: var(--muted-foreground);
  white-space: nowrap;
}

.timeline-scrubber__count {
  font-size: 11px;
  font-weight: 600;
  color: var(--foreground);
  padding: 2px 8px;
  border-radius: 999px;
  background: rgba(63, 147, 255, 0.15);
  border: 1px solid rgba(63, 147, 255, 0.25);
  white-space: nowrap;
}
```

### 6.3 Bar Chart Area

```scss
.timeline-scrubber__chart {
  flex: 1 1 auto;
  height: 100%;
  min-width: 0;
  position: relative;
  padding: 8px 0;
}
```

Bars:
- Default fill: `rgba(61, 143, 255, 0.35)` (dark mode), `rgba(0, 81, 165, 0.25)` (light mode)
- Selected fill: `rgba(61, 143, 255, 0.7)` (dark mode), `rgba(0, 81, 165, 0.55)` (light mode)
- Bar border-radius: 2px top corners
- Bar gap: 1px between bars

Selection overlay:
- Background: `rgba(61, 143, 255, 0.08)`
- Border: `1px solid rgba(61, 143, 255, 0.4)`
- Border-radius: 4px

### 6.4 Right Date Range Label

```scss
.timeline-scrubber__range {
  flex: 0 0 auto;
  min-width: 140px;
  text-align: right;
  font-size: var(--text-xs);
  font-weight: 500;
  color: var(--muted-foreground);
  white-space: nowrap;
}
```

### 6.5 X-axis Labels

```scss
.timeline-scrubber__axis-label {
  font-size: 10px;
  fill: var(--muted-foreground);
  text-anchor: middle;
  user-select: none;
}
```

### 6.6 Light Theme Overrides

```scss
.light-theme .timeline-scrubber {
  background: var(--sidebar);     // white in light mode
  border-top-color: var(--border);
}
```

### 6.7 Responsive

```scss
@media (max-width: 900px) {
  .timeline-scrubber {
    height: 60px;
    padding: 0 10px;
    gap: 10px;
  }
  .timeline-scrubber__label {
    min-width: 120px;
  }
  .timeline-scrubber__range {
    min-width: 100px;
    font-size: 10px;
  }
}

@media (max-width: 740px) {
  .timeline-scrubber__label {
    min-width: auto;
  }
  .timeline-scrubber__title {
    display: none;          // hide title, keep count badge
  }
}
```

---

## 7. Data Flow Diagram

```
                  GraphPage.js
                      |
          +-----------+-----------+
          |                       |
   [timelineOpen]         [timelineSelection]
   [setTimelineOpen]      [setTimelineSelection]
          |                       |
          v                       v
   SidebarControls        GraphMainColumn
   (toggle button)              |
                    +-----------+-----------+
                    |                       |
            TimelineScrubber     NestedGraphController
            (uses loadFromStore     (applies cy filtering
             + currentKey)           when selection changes)
                    |
         +----------+----------+
         |                     |
   useTimelineData    useTimelineSelection
   (builds buckets)   (manages drag/range)
         |
   TimelineBarChart
   (SVG rendering)
```

---

## 8. State Management

Add to `GraphPage.js`:

```js
const [timelineOpen, setTimelineOpen] = useState(true);
const [timelineSelection, setTimelineSelection] = useState(null);
// timelineSelection: { start: Date, end: Date } | null (null = show all)
```

Pass `timelineOpen` / `setTimelineOpen` to `SidebarControls` and `GraphMainColumn`.
Pass `timelineSelection` to `NestedGraphController` for filtering.
Pass `setTimelineSelection` to `TimelineScrubber` as `onSelectionChange`.

---

## 9. Implementation Steps (Ordered)

### Phase 1: Data Layer
1. Create `frontend/src/components/GraphPage/TimelineScrubber/utils.js`
   - `parseCallDate(value)` - robust date parser for various formats
   - `getCallDateRange(callNode)` - returns `{ openDate, closeDate }` or null
   - `bucketCallsByMonth(calls, minDate, maxDate)` - returns monthly counts
   - `formatMonthLabel(date)` - "Jan 2024" style formatting
   - `monthRangeLabel(start, end)` - "Sept 2026 > Dec 2026" style formatting

2. Create `frontend/src/components/GraphPage/TimelineScrubber/useTimelineData.js`
   - Collects calls from the correct datasets based on current layer
   - Uses `buildElements` to parse each dataset's node elements
   - Applies layer-specific filtering (destination/call level)
   - Returns bucketed histogram + metadata

### Phase 2: UI Components
3. Create `frontend/src/components/GraphPage/TimelineScrubber/useTimelineSelection.js`
   - Range selection state management
   - Pointer event handlers for drag interaction
   - Clamping/validation logic

4. Create `frontend/src/components/GraphPage/TimelineScrubber/TimelineBarChart.jsx`
   - SVG bar chart with responsive sizing
   - Selection overlay rendering
   - Drag interaction wiring
   - X-axis month labels

5. Create `frontend/src/components/GraphPage/TimelineScrubber/TimelineScrubber.jsx`
   - Assembles label, chart, and date range display
   - Handles collapsed/expanded state
   - Calls useTimelineData and useTimelineSelection

### Phase 3: Integration
6. Create `frontend/src/styles/components/_timeline-scrubber.scss`
   - All styles per section 6

7. Update `frontend/src/styles/main/main.scss`
   - Add `@import "../components/timeline-scrubber";`

8. Update `frontend/src/components/GraphPage/GraphPage.js`
   - Add `timelineOpen` and `timelineSelection` state
   - Pass them to `GraphMainColumn` and `RightControlsColumn`

9. Update `frontend/src/components/GraphPage/ui/GraphMainColumn.jsx`
   - Insert `<TimelineScrubber />` between the graph canvas area and `<GraphStatusBar />`
   - Only render in graph mode (not detail mode)

10. Update `frontend/src/components/GraphPage/ui/SidebarControls.jsx`
    - Add a `BarChartOutlined` or `TimelineOutlined` icon button
    - Wire to `timelineOpen` toggle
    - Show active state when scrubber is open

### Phase 4: Graph Filtering
11. Update `frontend/src/components/NestedGraphController.js` (or add an effect in `GraphPage.js`)
    - When `timelineSelection` changes, iterate call nodes on the Cytoscape instance
    - Toggle `timeline-hidden` class based on whether each call's date range overlaps the selection
    - When selection is null (cleared), remove `timeline-hidden` from all nodes

12. Add `timeline-hidden` style to `frontend/src/styles/graphStyles.js`
    - Nodes with `.timeline-hidden` class: `display: none` or `visibility: hidden, events: no`
    - Edges connected to hidden nodes should also be hidden

### Phase 5: Polish
13. Add animations
    - Smooth collapse/expand of the scrubber panel
    - Transition bar opacity when selection changes
    - Subtle fade for filtered-out calls

14. Edge cases
    - Calls with missing dates: exclude from histogram, still count in "X CALLS" badge with a note
    - Layers with zero calls: show empty state "No calls in this layer"
    - Very large date ranges: auto-aggregate into quarters instead of months if > 48 months

15. Sync scrubber state with layer changes
    - Reset selection when the user navigates to a different layer
    - Recompute histogram data when layer changes

---

## 10. Key Architectural Decisions

1. **No new dependencies**: The bar chart is rendered as inline SVG (no chart library needed). The interaction uses native pointer events.

2. **Client-side data**: All call data is already preloaded in `storeRef` via `useGraphData`. The scrubber simply reads from `loadFromStore` -- no new API calls needed.

3. **Class-based filtering**: Consistent with existing `call-hidden` pattern in `NestedGraphController.js:462`. Avoids modifying the element set which would break Cytoscape layout.

4. **Layer-aware scoping**: The `useTimelineData` hook takes `currentKey` and `levels` to determine which datasets to aggregate. This mirrors the scoping logic already in `NestedGraphController` and `GraphSelector`.

5. **Decoupled state**: The scrubber's selection state lives in `GraphPage` and is consumed by both the scrubber UI and the filtering logic. This avoids tight coupling between the scrubber and Cytoscape.

---

## 11. Testing Checklist

- [ ] Scrubber shows correct call count for ROOT layer (all programmes)
- [ ] Scrubber shows correct call count for a specific programme (e.g. Cluster_1)
- [ ] Scrubber shows correct calls for a pillar (e.g. PILLAR_P2 aggregates all P2 programmes)
- [ ] Scrubber shows correct calls for a destination layer (DEST_xxx)
- [ ] Dragging selection range filters graph nodes correctly
- [ ] Resetting selection shows all calls again
- [ ] Sidebar button toggles scrubber visibility
- [ ] Scrubber resets when navigating between layers
- [ ] Light theme and dark theme rendering are correct
- [ ] Responsive behavior at various widths
- [ ] Calls with missing dates are handled gracefully
- [ ] Performance: scrubber renders quickly even with 500+ calls
