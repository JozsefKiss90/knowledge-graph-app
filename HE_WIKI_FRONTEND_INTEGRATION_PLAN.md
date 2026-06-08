# HE Wiki Graph — Frontend Integration Plan

## 0. Status / TL;DR

**The frontend integration is already substantially implemented** (commits `4ff574d`, `19adc7f` "integrated he_wiki into the frontend", `67b621c` "styling he_wiki graph"). The HE Wiki graph is a **first-class graph** named `HE_2025`: it is selectable, preloaded, navigable, rendered with a dedicated layout and palette, and has a rich detail panel that renders the markdown `body`.

This document is therefore a **completion & hardening plan**, not a greenfield build. It (1) records the verified current state, and (2) specifies the remaining work — prioritized — to make the wiki graph fully first-class and free of controls that are misleading for a flat knowledge graph.

All file:line anchors below were verified against the working tree on branch `claude_redesign`.

---

## 1. Current State (verified — already working)

| Concern | Status | Where |
|---|---|---|
| Endpoint wiring | ✅ `GRAPH_ENDPOINTS.HE_2025 → /hewiki/nodes, /hewiki/relationships` | `useGraphData.js:8` |
| Preloading | ✅ fetched on mount into `storeRef` alongside all graphs | `useGraphData.js:59-71` |
| Selection | ✅ first-class top-level item in the graph picker | `GraphSelector.js:479-488` |
| Navigation | ✅ `ROOT → HE_ROOT` (synthetic pillar overview) `→ HE_2025` (data graph) | `NestedGraphController.js:233-240, 422-426` |
| Element build | ✅ handles `{status,data:[…]}` + `{relationships:[…]}`; maps all wiki props | `buildElements.js:23-50` |
| Layout | ✅ dedicated `HE_2025_PRESET` (cose-bilkent, high repulsion/edge length); switcher intentionally hidden | `layoutConfig.js:22-38`, `GraphMainColumn.jsx:214,237` |
| Node styling | ✅ 7 category colors (incl. `synthesis`) dark+light; degree-proportional sizing 22–62px | `palette.js:11-40, 135-147` |
| Edge styling | ✅ `RELATES_TO` (green) / `WIKI_LINK` (blue) colors | `palette.js` edgeColorFor |
| Detail panel | ✅ rich `he_entity` view: custom markdown `body` renderer, summary, keyword chips, aliases, source_documents, status | `NodeDetail.js:24-116, 589-868` |
| Node deep-link | ✅ `/node/:id` resolves wiki nodes via `DEFAULT_CONFIG = HE_2025` | `useNodeDetail.js:6-12, 45-48` |
| Connections | ✅ lists both `RELATES_TO`/`WIKI_LINK` neighbors, navigable; source→HE_2025 mapping | `NodeConnections.js:44-46, 292-364` |
| Node-type toggles | ✅ work for HE_2025 (incl. `synthesis` after recent fix) | `LegendToggle.js`, `graphTypeConfig.js:12,52` |
| Edge-type toggles | ✅ shown only for HE_2025 | `LegendToggle.js:442` |

**Bottom line:** a user can already select the wiki graph, see all 54 nodes / 437 edges with category colors and degree-based sizing, hover/tap nodes, open a detailed markdown panel, and walk the connection graph. The remaining work is hardening and removing/repurposing controls that were built for the hierarchical cluster graphs and don't fit a flat wiki network.

---

## 2. Remaining Work (prioritized)

### Phase 1 — Remove misleading controls (false affordances)  ·  **P1**

These controls render for `HE_2025` but are non-functional or misleading because the wiki graph has no `Call`/`Destination` nodes, budgets, or programme keys.

**1.1 Gate the Compare drawer for `HE_2025`.**
`CompareDrawer` is always rendered (`GraphMainColumn.jsx:268`) and `resolveCompareKeys` has no case for wiki nodes: a wiki node has no `programmeKey`, no `PROG_`/`PILLAR_`/`CL\d` id, and `SOURCE_TO_KEY["he_wiki"]` is undefined, so it falls through to `{keys:[<node-id>]}` (`useCompareData.js:75-84`). `loadFromStore("horizon-europe")` is then `null`, and Compare's metrics (budget / #calls / #destinations / topic overlap) are meaningless for entities. → **Hide the Compare affordance when `graphName === "HE_2025"`** (gate the Compare toggle in `SidebarControls`/`GraphTopBar` and don't render `CompareDrawer`).
*Effort: S. Risk: low.*

**1.2 Gate the Timeline scrubber for `HE_2025`.**
`resolveDatasetKeys` maps `HE_2025 → ALL_HE_PROGRAMMES` (`useTimelineData.js:91`), so the scrubber buckets **cluster** call-dates while the wiki graph is on screen, yet the canvas filter finds zero `Call` nodes and no-ops (`GraphMainColumn.jsx:101-102`). The scrubber looks functional but shows unrelated data and changes nothing. → **Hide `TimelineScrubber` when `graphName === "HE_2025"`** (gate `isOpen` and the toggle).
*Effort: S. Risk: low.*

> **Decision point:** *hide* (recommended, simple) vs *repurpose* these for wiki semantics (see 5.3). Defaulting to hide.

### Phase 2 — Knowledge-base discoverability  ·  **P1**

**2.1 Extend search to wiki content.**
`SearchBox.handleSearch` matches only `id` and `label` (`SearchBox.js:15-18`; placeholder literally says "Call ID or label"). For a knowledge base, users expect to find nodes by content. → **Also match `body`, `keywords`, `aliases`, `summary`** for wiki nodes; update the placeholder when `HE_2025`. Consider ranking exact-name > keyword/alias > body substring.
*Effort: M. Risk: low.*

**2.2 Make `[[wikilinks]]` in the detail body clickable.**
`inlineMarkdown` renders body wikilinks as plain `<em>` text with an explicit "no navigation target" comment (`NodeDetail.js:104-106`). Since the parser already resolves link targets to node ids, the panel can resolve display→id. → **Render body `[[Target]]` (and `[[Target|Display]]`) as links to `/node/{resolved-id}`** (or an in-panel navigate). Requires a title/alias→id map available to the panel (reuse the same slug logic, or pass the preloaded node list).
*Effort: M. Risk: medium (need robust display→id resolution; fall back to plain text when unresolved).*

### Phase 3 — Robustness  ·  **P2**

**3.1 Availability gating in the graph picker.**
`loadFromStore("__keys__")` deliberately filters out `HE_2025` (`useGraphData.js:96`), so `GraphSelector` renders the wiki item **unconditionally** — even if its fetch failed — unlike every other graph which is gated by `availableKeys.has(key)`. → **Expose HE_2025 availability** (either stop filtering it from `__keys__`, or add a dedicated `hasHEWiki` flag) and gate the picker item on it.
*Effort: S. Risk: low (verify nothing else relies on `__keys__` excluding HE_2025 — the timeline's `ROOT` branch uses `__keys__`, so prefer a dedicated flag over un-filtering).*

**3.2 Empty/error state when wiki data is missing.**
`openHE()` calls `buildElements(raw)` even when `raw` is `null`, pushing a level with empty elements → a silent blank canvas with no feedback (`NestedGraphController.js:233-240`). → **Detect `raw == null` and surface an empty/error state** (toast or in-canvas message) instead of an empty graph.
*Effort: M. Risk: low.*

### Phase 4 — Visual clarity  ·  **P2**

**4.1 Distinguish `RELATES_TO` vs `WIKI_LINK` by line style, not color alone.**
Other edge types already use dashed/dotted styles (`SHARED_TOPIC`, `CROSS_TOPIC_SIMILARITY`) but the two primary wiki edge types differ only by color, which is hard to read in the dense (437-edge) network. → **Add `edge[type="RELATES_TO"]` (solid) / `edge[type="WIKI_LINK"]` (dashed)** selectors in `graphStyles.js`.
*Effort: S. Risk: low.*

**4.2 Explain (or reconsider) the `RELATES_TO` default-hidden behavior.**
On first load, `RELATES_TO` edges are hidden for `HE_2025` (`LegendToggle.js:237-243`). These are the **curated frontmatter** relationships — arguably the higher-quality edge set — so hiding ~49% of edges by default with no explanation is confusing. → **Either** add a small legend note/tooltip explaining the default, **or** flip the default to show curated `RELATES_TO` and hide the contextual `WIKI_LINK`. Needs a product call.
*Effort: S. Risk: low.*

### Phase 5 — Wiki-specific enhancements  ·  **P3 (optional, net-new value)**

**5.1 Category filter UI** — dedicated toggles for the 7 wiki categories (strategy/cluster/institution/policy/research_theme/topic/synthesis), shown only for `HE_2025`, distinct from generic node-type toggles. *Effort: M.*

**5.2 Relationship-origin filter** — toggle by edge `origin` (`frontmatter` vs `body`), which is already stored on every edge, letting users isolate curated vs contextual links. *Effort: M.*

**5.3 (Alternative to 1.1/1.2) Repurpose Compare/Timeline for wiki semantics** — Compare two entities by degree / shared neighbors / category overlap; or drop Timeline entirely. Higher value, higher effort than hiding. *Effort: L.*

**5.4 Layout & legibility polish** — evaluate `fcose` for the degree-79 `horizon-europe` hub; declutter labels at low zoom; emphasize hubs/synthesis nodes. *Effort: M–L.*

---

## 3. Out of Scope (app-wide, not HE_2025-specific)

These surfaced during the audit but affect **all** graphs equally, so they belong in a separate cross-cutting task, not this plan:

- **Layer/graph-state deep-linking** (node-level `/node/:id` already works; graph + breadcrumb state is not in the URL).
- **Data freshness / refetch** (everything is preloaded once on mount; no invalidation after `POST /hewiki/populate`).
- **Accessibility** (Cytoscape canvas has no keyboard/ARIA affordances).
- **Mobile** (`RequireLandscape` overlay app-wide; dense graph is hard on small screens).

---

## 4. Suggested Sequencing

1. **Phase 1** (gate Compare + Timeline) — highest ratio of UX correctness to effort; removes the two clearly-broken affordances.
2. **Phase 2** (search + clickable body links) — turns it into a usable knowledge base.
3. **Phase 3** (availability + empty state) — robustness.
4. **Phase 4** (edge legibility) — polish.
5. **Phase 5** — optional, product-driven.

Phases 1–4 are small, low-risk, and self-contained; each can ship independently.

---

## 5. Design Decisions / Open Questions

| Decision | Options | Recommendation |
|---|---|---|
| Compare & Timeline for the wiki graph | hide (1.1/1.2) vs repurpose (5.3) | **Hide** — they encode cluster/Call semantics that don't map to a flat entity network |
| HE_2025 availability flag | un-filter from `__keys__` vs dedicated flag | **Dedicated flag** — `__keys__` feeds the timeline's ROOT scan; un-filtering would pull the wiki set into unrelated logic |
| `RELATES_TO` default visibility | keep hidden + explain vs show curated by default | Product call (4.2) |
| Ambition | Phases 1–4 (harden) vs +Phase 5 (build out) | Start with 1–4; treat 5 as a follow-up |
