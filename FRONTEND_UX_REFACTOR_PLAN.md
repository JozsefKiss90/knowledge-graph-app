# Frontend UX Refactoring Plan

> **Scope:** Synthesise the app's scattered data, improve discoverability, facilitate interaction, and make the UI more intuitive.
> **Created:** 2026-06-26
> **Source:** Grounded multi-lens UX analysis of the live `frontend/src/components` tree (information-synthesis, discoverability, interaction, intuitiveness, trust/cleanup, and cross-feature-workflow lenses), deduped and prioritised.
> **Status:** Proposed — not yet started.

Each item is tagged with the goal(s) it serves:
`[SYN]` synthesis · `[DIS]` discoverability · `[INT]` interaction · `[ITV]` intuitiveness.
Effort: **S / M / L**. Impact: **1–5**.

---

## Diagnosis — three structural problems

The app is genuinely data-rich, but three structural issues hold it back. Most items below trace to one of these:

1. **No single source of truth for "what's filtering my graph."**
   `GraphMainColumn.jsx` paints five independent Cytoscape class layers (`timeline-hidden`, `assistant-dim`, country paint, `compare-selected`, `faded`) that the user can neither see nor individually undo. This is the root of the well-known **"Reset All Filters doesn't clear the timeline"** bug (`LegendToggle.js` `resetView` never clears `timelineSelection`/`countryOverlayCode`/score-fade).

2. **The central story is never told consistently.**
   Work-programme data = money **on offer** (planned); CORDIS data = money **actually funded** (awarded). That distinction is the app's headline insight, but it lives only in a `FundingByProgramme.jsx` footnote — and the `KpiCardsRow.jsx` "Total committed" label actively contradicts it.

3. **The app hides its own power.**
   The richest layer (CORDIS) renders **nothing** when data isn't ingested, the right rail is 9 unlabeled glyphs, the three CORDIS tools hide behind dashboard tabs, and the guided tour can only be re-triggered via a `?tour=1` URL.

Supporting themes: dead-end dashboard stats (only `/node/:id` is addressable); trust-eroding dead controls; and inconsistent vocabulary (identical chip lists carry five different names).

---

## Tier 1 — Quick wins (small effort, ship first)

Low-risk, no backend or new data required. Disproportionately raise trust and coherence.

### 1.1 Trust-cleanup sweep — remove or fix the four dead controls `[ITV][INT]` · S · impact 4
- **Problem:** Four controls can only mislead. "Min Similarity" hides all edges then re-shows `CROSS_TOPIC_SIMILARITY` edges that aren't in the loaded data → reliably greys the **entire graph**. The Node-Repulsion / Edge-Length / Elasticity sliders feed `effectiveLayout` but the apply step never runs the layout, so they're dead. The legend "Layout Mode" radio only toggles a `graphName` suffix never read for layout (and collides with the real top-bar Tree/Force toggle). "Bookmark this Destination" writes `bookmarkedDestinations` that no reader exists for, yet alerts success.
- **Change / Where:**
  - `LegendToggle.js` / `LegendParts/ScoreFilter.js`: guard the Min-Similarity section behind `cy.edges('[type="CROSS_TOPIC_SIMILARITY"]').length > 0`; **delete** the Layout-Mode section.
  - `GraphPage/utils/viewControls.js` `handleApplyLayout`: actually run the layout —
    `const l = cyInstance.layout(effectiveLayout); l.one('layoutstop', () => cyInstance.fit({ padding: 60 })); l.run();`
    (`effectiveLayout` already carries the slider values via `computeEffectiveLayout`; **don't** also keep the old animate-fit, to avoid double-animating.)
  - `LegendParts/LayoutSwitcher.js`: remove the no-op radio.
  - `NodeDetail.js`: delete the "Bookmark this Destination" button (~line 1046) and `handleBookmarkDestination` (~939–952); keep the working `bookmarkedCalls` path.
- **Depends on:** none.

### 1.2 Honest "Clear all" + rename "Reset view" → "Reset camera" `[INT][ITV]` · S · impact 4
- **Problem:** Two confusable "Reset" verbs, and "Reset All Filters" silently leaves the timeline window (and country paint) applied.
- **Change / Where:** Thread `timelineSelection` / `countryOverlayCode` from `GraphPage.js` into the `LegendToggle` reset so the footer button clears them too (the state already lives in `GraphPage.js`). Rename `GraphTopBar.jsx` "Reset view" → "Reset camera". *(Superseded by the full constraints bar in Tier 2.1 — this is the cheap interim fix.)*
- **Depends on:** none (wiring existing state).

### 1.3 Make "Search & Highlight" fly to results `[INT]` · S · impact 4
- **Problem:** The left search box only highlights matches and fades the rest — it doesn't pan/zoom or count.
- **Change / Where:** `LegendParts/SearchBox.js`: after `matched.addClass('highlighted')`, call `cy.animate({ fit: { eles: matched, padding: 80 } })`; show an "n of m ‹ › ✕" counter with a real empty state. The fly-to capability already exists in the ChatBot's locate pipeline.
- **Depends on:** none.

### 1.4 Rename "Total committed" KPI → "Planned (on offer)" + frame legend `[ITV]` · S · impact 4–5
- **Problem:** "Total committed" implies money already allocated, directly colliding with the planned-vs-funded frame.
- **Change / Where:** `Dashboard/KpiCardsRow.jsx`: rename to **"Planned (on offer)"** with an outline "offer" tag (the CORDIS KPI keeps a filled "funded" tag). Add a small `<FundingFrameLegend/>` chip pair under `DashboardHero` and atop the call-detail CORDIS section. *(Copy/rename ships now; the live funded half needs CORDIS — see 2.2.)*
- **Depends on:** none (frame copy); live funded numbers need CORDIS.

### 1.5 Provenance-labelled, deduped chips `[ITV][DIS]` · S–M · impact 4
- **Problem:** Identical chip lists carry five names. `HoveredNodeInfo.jsx` hardcodes "Related Topics" though `extractTags` usually yields work-programme keywords (`tags_from_description`); `NodeDetail.js` shows the **same** data twice (an unlabelled top row ~line 1159 **and** a "Tags From Description" section ~1293–1300).
- **Change / Where:** Standardise on two provenance-baked families — **"Keywords (work programme)"** vs **"Research fields (CORDIS · EuroSciVoc)"**.
  - `HoveredNodeInfo.jsx` (~line 435): dynamic title `tagsSource === 'cordis' ? 'Research fields (CORDIS)' : 'Keywords (work programme)'` instead of static "Related Topics".
  - `NodeDetail.js`: label the top chip row and delete the redundant `tags_from_description` section (or vice-versa); stop merging sources in `extractTags`; wrap research-field chips in `onClick → setDashboardPanel('fields')`.
- **Depends on:** relabel/dedupe ship now; research-field chips populate only where CORDIS field data exists.

### 1.6 Honest CORDIS / topic empty states `[DIS]` · S · impact 4
- **Problem:** CORDIS surfaces `return null` when empty and Compare shows "No shared topics" — so a **data gap** reads as a real zero, and dev jargon ("Run `/cordis/tag-calls`") leaks to users.
- **Change / Where:** New `CordisEvidence/CordisEmptyState.jsx`; change `CordisEvidencePanel.jsx`'s null branch (lines 38–40) to a muted teaser. In `CompareTopicOverlap`, distinguish **"Topic data not loaded yet"** vs **"No topics in common."**
- **Depends on:** none (copy/component); shared with Tier 2.4.

---

## Tier 2 — High-impact

Stronger ROI; mostly M effort. The core of the redesign.

### 2.1 Unified active-constraints bar above the graph + honest "Clear all" `[INT][SYN][ITV]` · M · impact 5 — **top recommendation**
- **Problem:** The five invisible Cytoscape filter layers can't be seen or individually undone; this is the root of the Reset/Timeline conflict.
- **Change / Where:** New `<GraphConstraintBar/>` in `GraphMainColumn.jsx` between `GraphTopBar` and the graph view. Render a chip per active layer — e.g. `Timeline: Jun–Sep 2026 ✕`, `Country: ES ✕`, `AI: "climate" ✕`, `Compare: 2 ✕` — where each ✕ calls the existing setter (`setTimelineSelection(null)`, `setCountryOverlayCode('')`, `handleClearAssistant`, `setCompareNodes([])`). Compose a single `onResetFilters` in `GraphPage.js` that clears **every** layer + strips leftover `.faded`, and wire `LegendToggle`'s footer button to it. One source of truth for filter state; fixes the trust bug and makes the stack legible.
- **Depends on:** none — the state already lives in `GraphPage.js`. Supersedes Tier 1.2.

### 2.2 Fused "Call brief" + consolidated "Funded reality" band on the call detail page `[SYN][ITV]` · M · impact 5
- **Problem:** `NodeDetail.js` scatters the call's story: official facts in "Key Information" while `CordisEvidencePanel` / `CordisTrendPanel` / `CordisRelatedPanel` / `CordisPartnersPanel` render as four sibling cards (~lines 1270–1277), each repeating its own "research area, not this call" hint and provenance footer. The reader scrolls 6+ cards to answer "what is this, and is the area well-funded?"
- **Change / Where:**
  - **Brief band:** a 2-row card between `nd-title-block` and `nd-grid`. Row 1 reuses status/type/deadlines already in `viewModel`; Row 2 reads `projectCount` / `totalEcContribution` / `topOrganisations` from `useCordisEvidence` (already fetched for the panel below — no extra call). Degrades to planned-only when no CORDIS.
  - **Consolidated band:** a new `<section className="nd-cordis-band">` ("What's already been funded in this area (CORDIS)") hosting the four existing panel bodies — stripped of their duplicate Card/hint/provenance — as sub-tabs: **Projects · Funding history · Related calls · Organisations**, with one shared caveat + provenance footer.
- **Depends on:** planned brief + panel consolidation ship now; the CORDIS headline half renders only with data (graceful degrade).

### 2.3 Make the Portfolio Dashboard a navigation hub `[INT][DIS][SYN]` · M · impact 5
- **Problem:** The dashboard is a wall of dead-end stats. `OpenCallsTable.jsx` Call IDs are plain text; `SavedSearches.jsx` is inert `MOCK_SEARCHES` under a false "Run on the live graph" subtitle; `CordisCountryLeaderboard` / `CordisFieldMix` / `CordisTopOrgs` rows are inert. The handlers already exist (`useDashboardData` `allCalls`, `callLocator.locate`, `setCountryOverlayCode`, `setDashboardPanel`); `CordisRelatedPanel` already proves the working link pattern.
- **Change / Where:**
  - `OpenCallsTable.jsx`: wrap call id in a `Link` to `/node/:id` + a per-row "Show in graph" calling the existing `onLocateCall` pipeline.
  - `SavedSearches.jsx`: make "All open calls" / "Calls closing in 30 days" actually filter the table from `data.openCalls` / `closingIn30d`; drop the unbacked "High-budget programmes"; rename the card to **"Quick filters."**
  - Country row → `setCountryOverlayCode(code)`; field segment → `setDashboardPanel('fields')`.
- **Depends on:** country/field/call links work today. **Org pivot deferred** — needs the org-dossier endpoint (Tier 3.4).

### 2.4 Replace silent CORDIS vanish with teaching placeholders + advertise the 3 tools `[DIS][ITV]` · M · impact 5
- **Problem:** Every CORDIS surface hides itself when empty — `CordisEvidencePanel.jsx` returns `null` at zero count; `PortfolioDashboard.jsx` omits the whole "What's actually been funded" section behind `cordisActive` (line 115) and only mounts the tool panel when `dashboardPanel` is truthy (line 82). A user with no CORDIS data never learns the layer or the three tools exist.
- **Change / Where:** Reuse `CordisEvidence/CordisEmptyState.jsx` (from 1.6). In `PortfolioDashboard.jsx`, render a dashed teaser card when `!cordisActive` ("Funded reality (CORDIS): real awarded projects/orgs/countries appear here once project data is ingested", with a Help link). **Always** render `DashboardToolPanel`'s labelled tab strip (Research fields / Country activity / Hop-on) with one-line descriptions, even when `dashboardPanel` is null.
- **Depends on:** copy/teasers ship now; live previews need data.

### 2.5 Label & group the right rail + persistent "Restart tour" / Help menu `[DIS][ITV]` · M · impact 4
- **Problem:** `SidebarControls.jsx` is 9 icon-only buttons whose meaning hides in hover tooltips, and it silently removes the entire Timeline/Compare/CORDIS-tools cluster when `graphName === 'HE_2025'` (line 101) with no explanation. `GuidedTour` only re-triggers via `?tour=1` from `/about`.
- **Change / Where:** `SidebarControls.jsx`: make the rail expandable (`isExpanded`, persisted) with a sibling `<span className="sidebar-controls-button__label">` per button and section headers (Explore / CORDIS tools / Settings, reusing `.sidebar-controls-divider`). Render dataset-hidden tools **disabled-with-reason** ("not available for this dataset") instead of vanishing. Wrap the Help `IconButton` in an MUI `Menu`: **"Restart guided tour"** (`navigate('/?tour=1')`) + "Help & docs".
- **Depends on:** none.

---

## Tier 3 — Foundational bets (larger, enabling)

Bigger investments; some need backend work. Sequencing matters (see Dependencies).

### 3.1 Shareable deep-link URLs that restore the full graph view + named Saved Views `[SYN][INT][DIS]` · M · impact 5
- **Problem:** Every view-defining piece of state (`graphName`, `pendingNav`, `timelineSelection`, `countryOverlayCode`, `dashboardPanel`, `viewMode`) lives only in React state — only `/node/:id` is addressable. A user can't bookmark, reopen, or share an exact exploration.
- **Change / Where:** `useSearchParams` in `GraphPage.js`: seed state from params on mount, write (debounced) on change, ISO-serialise timeline dates. A "Copy link" button in `GraphTopBar` yields e.g. `/?prog=Cluster_5&dest=…&from=2026-09&to=2027-12&country=DE&view=graph`. Then "Save current view" stores `{name, url}` in a localStorage `savedViews` list, rendered as clickable rows in the rebuilt `SavedSearches` card.
- **Depends on:** fully client-side. **Named Saved Views must land *after* the serializer.**

### 3.2 Command palette (Ctrl-K) + global keyboard shortcuts `[DIS][INT]` · L · impact 4
- **Problem:** Capabilities are scattered across the icon rail, dashboard tabs, the layout drawer, the breadcrumb bar, and a floating AI FAB; there are **no** keyboard shortcuts anywhere (only ChatBot has Enter/Escape).
- **Change / Where:** New `CommandPalette.jsx` in `GraphPage.js` listing every action (Open Dashboard, Compare, Timeline, Research fields, Country activity, Hop-on, Bookmarks, Toggle theme, Restart tour) + every programme/node, each mapped to the callbacks already threaded to `RightControlsColumn` (`setCompareOpen`, `onSelectDashboardPanel`, `setViewMode`). Plus a window `keydown` in `GraphPage`: `/` or Ctrl/Cmd+K opens it; Esc clears assistant + closes drawers; Backspace/Left drills out a layer; D/C/T toggle dashboard/compare/timeline (all guarded against input focus).
- **Depends on:** none.

### 3.3 Unified "Find calls" workspace `[SYN][DIS][INT]` · L · impact 5
- **Problem:** Finding calls is split across four separate tools (AI search, left filters, timeline, field explorer).
- **Change / Where:** Merge them into one ranked result set that drives the existing graph-highlight (`assistantMatchIds`) and timeline pipelines, backed by the already-preloaded client `allCalls` store.
- **Depends on:** structured facets (year, action type, cluster, status) work now; **field/topic facets blocked until topic data is loaded**.

### 3.4 Cross-surface organisation dossier + partner-shortlist builder `[SYN][INT]` · L · impact 4–5
- **Problem:** Org names in `CordisPartnersPanel`, `CordisTopOrgs`, and `CordisEvidencePanel` are inert.
- **Change / Where:** Make every org name a pivot into one org view (funded €, fields, tracked calls), with a localStorage shortlist + CSV export. Unblocks the deferred org pivot in 2.3.
- **Depends on:** a **new per-org aggregate endpoint** (CORDIS-gated; must call `invalidate()` on every mutation per the cache-invalidation rule).

### 3.5 Multi-turn, CORDIS-aware assistant `[SYN][INT]` · L · impact 4
- **Problem:** The ChatBot is single-turn (resets each query), covers only the one Horizon Europe 2026–2027 JSON, and ignores CORDIS.
- **Change / Where:** Convert it into a conversation that refines prior results and answers "who's been funded for X" from CORDIS, citing locatable call ids.
- **Depends on:** backend conversation/state + broadened retrieval beyond the single HE 2026–27 local JSON.

---

## Data dependencies & sequencing (read before scheduling)

- **CORDIS-gated halves render nothing without ingest.** The call-brief funded headline, the dashboard "funded reality" live numbers, Compare's awarded rows, any hover/node CORDIS depth hint, the org dossier, and the partner shortlist all need ingested data. **Ship frame copy / empty-state teasers now; gate only the live numbers — never fabricate figures.**
- **Topic / keyword / field data is largely absent** from the loaded graph data. **Blocked until it lands:** clickable research-field chips, Compare topic overlap, the dashboard "Topic distribution" (currently regex-on-call-IDs — **relabel as an estimate**), and the field/topic facet of the unified Find-calls workspace. Do the honest relabels now; don't promise overlap.
- **On-graph / hover-card CORDIS badges need a lightweight batch per-node count endpoint** — per-call evidence is too heavy to fire on every hover. Don't ship the badge until that aggregate (or a precomputed node flag) exists.
- **Any new CORDIS aggregate endpoint** (org dossier, per-node counts, per-programme awarded summary) **must call `invalidate()` on every mutation**, or the dashboard/panels serve stale numbers.
- **Sequencing:** named Saved Views (3.1) depend on the deep-link serializer landing first; the org pivot in 2.3 depends on the org-dossier endpoint (3.4); the unified Find-calls workspace (3.3) and multi-turn assistant (3.5) depend on broadening retrieval beyond the single local JSON.
- **`handleApplyLayout` fix (1.1):** `effectiveLayout` already carries the slider values via `computeEffectiveLayout` — run the layout, then fit once on `layoutstop`; avoid double-animating (don't also keep the old animate-fit).

---

## Effort / impact summary

| # | Item | Goals | Effort | Impact | Tier |
|---|------|-------|:------:|:------:|------|
| 1.1 | Trust-cleanup sweep (4 dead controls) | ITV, INT | S | 4 | Quick win |
| 1.2 | Honest "Clear all" + "Reset camera" rename | INT, ITV | S | 4 | Quick win |
| 1.3 | Search flies to results | INT | S | 4 | Quick win |
| 1.4 | Rename "Total committed" → "Planned (on offer)" + frame legend | ITV | S | 4–5 | Quick win |
| 1.5 | Provenance-labelled, deduped chips | ITV, DIS | S–M | 4 | Quick win |
| 1.6 | Honest CORDIS / topic empty states | DIS | S | 4 | Quick win |
| 2.1 | Unified active-constraints bar + honest Clear all | INT, SYN, ITV | M | 5 | High-impact |
| 2.2 | Fused "Call brief" + consolidated CORDIS band | SYN, ITV | M | 5 | High-impact |
| 2.3 | Dashboard as navigation hub | INT, DIS, SYN | M | 5 | High-impact |
| 2.4 | Teaching placeholders + advertise 3 tools | DIS, ITV | M | 5 | High-impact |
| 2.5 | Label/group right rail + Restart-tour menu | DIS, ITV | M | 4 | High-impact |
| 3.1 | Deep-link URLs + named Saved Views | SYN, INT, DIS | M | 5 | Foundational |
| 3.2 | Command palette (Ctrl-K) + shortcuts | DIS, INT | L | 4 | Foundational |
| 3.3 | Unified "Find calls" workspace | SYN, DIS, INT | L | 5 | Foundational |
| 3.4 | Org dossier + partner-shortlist builder | SYN, INT | L | 4–5 | Foundational |
| 3.5 | Multi-turn, CORDIS-aware assistant | SYN, INT | L | 4 | Foundational |

## How this maps to the four goals

- **Synthesis** → call brief + consolidated CORDIS band (2.2), dashboard pivots (2.3), deep links/Saved Views (3.1), Find-calls workspace (3.3), org dossier (3.4).
- **Discoverability** → teaching placeholders + tool strip (2.4), labelled right rail + Restart-tour menu (2.5), command palette (3.2), honest empty states (1.6).
- **Interaction** → unified constraints bar (2.1), clickable dashboard (2.3), search-fly-to (1.3), keyboard shortcuts (3.2), honest Clear all (1.2).
- **Intuitiveness** → trust-cleanup sweep (1.1), "on offer vs funded" vocabulary (1.4 / 2.2), provenance chips (1.5), honest empty states (1.6), reset-verb disambiguation (1.2).

## Suggested execution order

1. **PR 1 — Tier 1 quick-wins bundle** (1.1–1.6): no backend, no new data, immediate trust + coherence gains.
2. **PR 2 — Constraints bar (2.1)** + **call brief / CORDIS band (2.2)**: the highest-impact interaction + synthesis changes.
3. **PR 3 — Dashboard nav hub (2.3)** + **teaching placeholders (2.4)** + **right-rail labels (2.5)**.
4. **PR 4 — Deep-link serializer (3.1)** → then Saved Views, then command palette (3.2).
5. **Backend-dependent** (3.3 / 3.4 / 3.5): schedule once retrieval/topic/org-aggregate data exists.
