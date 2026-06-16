# Execution Plan — **A3 (step 1): Make the assistant act on the graph**

> Feature A3, **step 1 only** ("wire the existing results to highlight and zoom the graph to the
> matches — no CORDIS data needed", `CORDIS_FEATURE_IDEAS.md:109-115`, and #1 in the suggested order
> `:198-201`). Step 2 (answering "who has been funded in X?" from stored CORDIS data) is **deferred** —
> it depends on a live CORDIS ingest that has not been run in this environment (A1/A2 are
> "verified offline, awaiting the live run", see `01-A1…md` / `02-A2…md` headers).
> Process: this plan is the review checkpoint required before coding (ideas doc §"mandatory process").
> Branch `cordis`.
>
> **Status: IMPLEMENTED & VERIFIED (offline) — awaiting the live manual run.**
> **Built:** `GraphPage/utils/buildCallLocator.js` (new locator); `GraphView/cy/palette.js`
> (`assistant-match`/`assistant-dim`/`assistant-focus` styles); `GraphPage.js` (match/focus state, the
> `ready`-gated locator memo, `handleAssistantResults`/`handleLocateCall`/`handleClearAssistant`);
> `GraphPage/ui/GraphMainColumn.jsx` (self-limiting highlight effect + seq-keyed focus/center effect);
> `ChatBot/ChatBot.js` + `_chatbot.scss` (results→highlight, card-click→navigate w/ detail fallback,
> Details button, Clear, per-card "Show in graph"/"not on graph"). **No backend change.**
> **Verified offline:** locator logic unit-checked against a fixture (multi-call dest → `{destinationId,
> promoted:false}`, single-call/promoted → `{destinationId:null, promoted:true}`, unknown id → `null`,
> size correct); frontend build passes with no new warnings from these files.
> **Adversarial review applied (multi-agent):** (1) focus made re-fireable via a monotonic `seq` token so
> re-clicking the same result re-centers; (2) the ring-removal timer is now captured and cleared on
> cleanup, and prior rings are cleared on refocus (no leak / no stale ring); (3) the highlight is
> **self-limiting** — a layer is only dimmed when it actually contains a match, so navigating to an
> unrelated layer after a search no longer greys everything out. (Two further review items were assessed
> as non-bugs: a call under two destinations resolves to either valid parent — the call renders in both
> DEST layers; and the `usePendingNav` stuck-state needs a non-existent `destinationId`, which the locator
> never yields since it uses the same deterministic collapse pipeline the overview renders.)
> **Remaining (user — needs the app running, incl. backend + `OPENROUTER_API_KEY` for the assistant):**
> the live manual checks in §9.
>
> **Follow-up (after live test — user feedback):** the "FILTER GRAPH TO" chips were inert (static spans).
> They are now **interactive faceted filters** that narrow the result cards **and** the graph highlight:
> clicking a chip toggles it (same-type chips OR together, different types AND); the count shows
> "N of M"; a new search/Clear resets them. Backend: `_call_card` (`chatbot_api.py`) now returns
> `call_title` so the **programme** chips can match cards (status/action chips already matched existing
> card fields). Frontend: `ChatBot.js` (`activeChips` state, `displayedCalls` memo, an effect that re-syncs
> the highlight via `onAssistantResults(displayedCalls)`, chips rendered as toggle buttons) +
> `_chatbot.scss` (active-chip violet styling). Label changed "FILTER GRAPH TO" → "FILTER RESULTS".
> **Needs the backend restarted** so cards carry the new `call_title` field (programme chips only).
>
> **Decision applied (confirmed with user):** *Navigate + highlight + zoom.* Clicking a result drills the
> nested graph to that call's cluster/destination (reusing the existing `pendingNav` navigation),
> centers + briefly rings it, and **all** matches stay highlighted (non-matches dimmed) across whatever
> layer you browse, until cleared. The conservative "highlight-only-what's-already-in-view" option was
> rejected because matched calls almost never live in the current view (ROOT / pillar / programme
> overview have no visible call nodes), so it would usually be a silent no-op — failing A3's stated goal
> of *zooming the graph to the matches*.

---

## 0. TL;DR

Today the chat assistant (`ChatBot.js`) returns matching Horizon Europe calls as cards, but clicking a
card only opens the `NodeDetail` overlay (`GraphPage.handleOpenDetail`) — **it never moves, highlights,
or zooms the graph** (confirmed by the deliberate comment at `GraphPage.js:74-82`). A3 step 1 closes that
gap with **no new data and no backend change**:

1. **Highlight (persistent, every layer).** When a search returns, the matched calls' `identifier`s are
   held in `GraphPage` state. A `GraphMainColumn` effect (a sibling of the existing timeline/compare
   class-sync effects) tags matched call nodes — and the **destinations that contain them** — with a new
   `assistant-match` class, and dims everything else with `assistant-dim`, **re-applied on every layer**
   (each layer is a fresh Cytoscape instance). So matches glow wherever they appear as you navigate.
2. **Navigate + zoom (per result).** Clicking a result resolves the call → its graph location via a new
   **data-driven locator** and drives the existing `usePendingNav` machinery to drill the nested graph to
   the call's **destination layer** (where the call node is actually rendered), then **centers + rings**
   the matched node. The modal closes so the user sees it.

The keystone is that **a Call node's Cytoscape `id` is exactly its `identifier`** (backend
`base_cluster_builder.py:171,218` resolves the node id from `identifier`; chatbot returns the same
`identifier`, `chatbot_api.py:14-26`). The only genuinely new piece is the **locator**: a call
`identifier` → `{ clusterKey, destinationId, promoted }` index, built once by scanning the already-loaded
graph store (`loadFromStore`) with the **same `buildElements` + `collapseSingleCallDestinations` pipeline
the legend tree already uses** (`GraphSelector.ensureProgrammeChildren`, `:147-195`). No hardcoded
prefix maps; works for every programme that is loaded, not just `CLn` clusters.

---

## 1. Goal & exactly what happens (verified anchors)

For a search in the assistant panel:

| Action | Result | Anchor it reuses |
|---|---|---|
| Search returns N matches | every match's call node (and its parent destination) gets `assistant-match`; all other calls/destinations get `assistant-dim`, on **every** layer the user visits | timeline/compare class-sync effects `GraphMainColumn.jsx:84-148` |
| Click a result card | graph drills to that call's cluster → destination layer, modal closes, node centered + ringed | `usePendingNav.js` (cluster→dest descent), `viewControls.js:18-30` (animate/fit) |
| Click the **Details** icon on a card | opens the `NodeDetail` overlay (today's behaviour, preserved) | `GraphPage.handleOpenDetail` `:67-72` |
| Click **Clear** in the results header | removes all highlight/dim, clears focus | `viewControls.js:7-10` reset idiom |
| A match not present in the loaded graph | card shows a muted "not on graph" note; click falls back to opening Details (never a dead click) | locator returns `null` |

**Why navigation is required (the core constraint, verified):** Call nodes exist in Cytoscape **only**
inside their **destination layer** (`openDestinationLayer`, `NestedGraphController.js:292-352`) — at a
programme overview every non-promoted Call is hidden with `call-hidden` (`:464`), and ROOT/pillar layers
have no call nodes at all. **Tapping a Call opens the detail overlay** (`setupEvents.js:106-129` →
`openNodeDetail`), so A3 must navigate to the *layer where the call is visible* and highlight it there —
**not** tap the call. `usePendingNav` already performs the cluster→destination descent for the legend
tree and the bookmarks deep-link; A3 feeds it the same `{ clusterKey, destinationId }` shape
(`usePendingNav.js:15-52`, producers at `GraphSelector.js:389,432,446`).

---

## 2. The locator — call `identifier` → graph location (the only new data structure)

`frontend/src/components/GraphPage/utils/buildCallLocator.js` (new). Pure function
`buildCallLocator(loadFromStore)` returns `{ locate(identifier), size }`.

- Iterate every programme store key (`loadFromStore("__keys__")`, which already excludes `HE_2025`,
  `useGraphData.js:95-96`). For each: `raw = loadFromStore(key)`; skip if null; `built =
  buildElements(raw)`; `collapsed = collapseSingleCallDestinations(built)` — **the exact pipeline
  `openProgramme` renders** (`NestedGraphController.js:263-265`) and the legend tree indexes
  (`GraphSelector.js:157-159`), so the locator's idea of "where a call lives" matches what the user sees.
- Build a `HAS_CALL` map (`target` callId → `source` destinationId) from `collapsed.edgeElements`
  (`d.type === "HAS_CALL"`), the inverse of the forward scan already in
  `useTimelineData.js`/`buildElements.js:77-84`.
- For each `Call` node in `collapsed.nodeElements`:
  - `promoted === true` (single-call destination collapsed up to the programme overview, where it is
    **not** `call-hidden`) → `{ clusterKey: key, destinationId: null, promoted: true, callId: id }`.
  - otherwise → `{ clusterKey: key, destinationId: <HAS_CALL source>, promoted: false, callId: id }`.
- First write wins (ids are unique per programme). Memoised by the caller; built lazily on first locate.

**No hardcoded `CLn`→`Cluster_n` parsing** (the brittle path the synthesis flagged): the cluster key is
the real store key the call was found under, so ERC / MSCA / INFRA / EIC / EIE / MISS / WIDERA / DEP /
ERASMUS / CEF / CREA / EURATOM all resolve identically — and a call whose dataset failed to load simply
returns `null` (honest "not on graph").

---

## 3. State & wiring (`GraphPage.js` — the hub)

Add:

- `assistantMatchIds: Set<string>` and `assistantMatchDestIds: Set<string>` — the highlight set + parent
  destinations, set together when results arrive.
- `assistantFocusId: string | null` — the single call to center/ring after navigation.
- `callLocator` — `useMemo(() => buildCallLocator(loadFromStore), [loadFromStore])` (loadFromStore is a
  stable `useCallback`, `useGraphData.js:94`).
- `handleAssistantResults(matchedCalls)` — fill `assistantMatchIds` from `c.identifier`; fill
  `assistantMatchDestIds` from `callLocator.locate(id)?.destinationId`.
- `handleLocateCall(identifier)` — `loc = callLocator.locate(identifier)`; if null return false;
  `setAssistantFocusId(identifier)`; then **reuse the exact legend-nav call**:
  `setPendingNav(loc.destinationId ? { clusterKey: loc.clusterKey, destinationId: loc.destinationId }
  : { clusterKey: loc.clusterKey })` (omit `callId` so the call is **not** tapped open). Returns true.
- `handleClearAssistant()` — empty both sets + `setAssistantFocusId(null)`.

Pass to `GraphMainColumn`: `assistantMatchIds`, `assistantMatchDestIds`, `assistantFocusId`,
`setAssistantFocusId`, `onAssistantResults`, `onLocateCall`, `onClearAssistant`, and `callLocator`
(for per-card annotation). Note: the highlight is **deliberately not reset** in the
`useEffect([graphName])` cleanup at `GraphPage.js:86-94` — persisting across layers is the point.

---

## 4. Effects (`GraphMainColumn.jsx` — beside the timeline/compare effects)

`GraphMainColumn` already owns the precedent: `cyInstance` prop, the compare class-sync effect
(`:84-98`) and the timeline class effect (`:100-148`). Add two more in the same idiom:

**4a. Highlight sync** — deps `[cyInstance, graphName, assistantMatchIds, assistantMatchDestIds]`:
```
cy.batch(() => {
  cy.nodes().removeClass("assistant-match assistant-dim");
  if (!assistantMatchIds.size) return;
  cy.nodes("[type='Call'],[category='Call']").forEach((n) =>
    n.addClass(assistantMatchIds.has(n.id()) ? "assistant-match" : "assistant-dim"));
  cy.nodes("[type='Destination'],[category='Destination']").forEach((n) =>
    n.addClass(assistantMatchDestIds.has(n.id()) ? "assistant-match" : "assistant-dim"));
});
```
Re-runs on every layer because `cyInstance` is a fresh instance per layer (`GraphView key={current.key}`,
`NestedGraphController.js:453` → `onCyReady` → `setCyInstance`). Matched calls hidden by `call-hidden` at
a programme overview stay hidden (harmless); their **parent destination** glows, guiding the drill-down.

**4b. Focus / center** — deps `[cyInstance, graphName, assistantFocusId]`, guarded by a
`focusHandledRef` so it fires once per `(focusId, layer)`:
```
const node = cy.$id(String(assistantFocusId));
if (!node || node.empty() || !node.visible()) return; // not on this layer yet (or call-hidden)
// after layout/auto-fit settle (GraphView post-mount fits at 150/500ms, :186-193):
const t = setTimeout(() => {
  cy.animate({ center: { eles: node }, duration: 400 });   // pan, don't fight auto-fit zoom
  node.addClass("assistant-focus");
  setTimeout(() => node.removeClass("assistant-focus"), 2400);
}, 700);
return () => clearTimeout(t);
```
`node.visible()` prevents centering a `call-hidden` node at a programme overview (a non-promoted match is
only focused once we've descended into its destination layer; a promoted match is visible at the overview
so it focuses there). Centering (not fitting) avoids fighting `applyResponsiveViewport`
(`GraphView.jsx:44-100,186-193`), which fits-to-all on mount — the destination layer is already framed on
that call's neighbourhood, so a pan + ring is the right, non-jarring cue.

---

## 5. Cytoscape styles (`GraphView/cy/palette.js`)

Append to the existing `extraStyles` array (`:170-185`, beside `.faded` / `.compare-selected`) — these are
**dedicated** classes, **not** the hover-managed `highlighted`/`faded` (which `setupEvents.applyHover`
wipes on every mouseover, `:13`), so the highlight persists:
```
{ selector: "node.assistant-match", style: {
    "border-width": 4, "border-color": "#8b5cf6", "border-opacity": 1,
    "overlay-color": "#8b5cf6", "overlay-opacity": 0.12, "z-index": 9999, "text-opacity": 1 } },
{ selector: "node.assistant-dim", style: { opacity: 0.22 } },
{ selector: "node.assistant-focus", style: {
    "border-width": 6, "border-color": "#a78bfa", "border-opacity": 1,
    "overlay-color": "#8b5cf6", "overlay-opacity": 0.22, "z-index": 10000 } },
```
Violet `#8b5cf6` deliberately differs from compare's blue `#3d8fff` and the amber Call fill — it reads as
the "assistant" accent (the panel's sparkle/AI affordance). No change to `graphStyles.js` base sheet.

---

## 6. ChatBot panel (`ChatBot.js` + `_chatbot.scss`)

New props: `onAssistantResults`, `onLocateCall`, `onClearAssistant`, `locateCall`.

- **On search success** (`handleSearch`, after `setMatchedCalls`, `:195`): call
  `onAssistantResults(data?.matched_calls ?? [])`. (Errors / empty → `onAssistantResults([])`.)
- **Card primary click** → `const loc = locateCall(call.identifier); if (loc) { onLocateCall(call.identifier); setOpen(false); } else { handleCardClick(call); }` — locatable cards drive the graph;
  unlocatable ones fall back to today's open-detail so the click is never dead.
- **Card header** gains a small **Details** `IconButton` (e.g. `ArticleOutlinedIcon`) → `handleCardClick(call)` (preserves direct access to `NodeDetail`), beside the existing bookmark button (`:378-392`).
- **Per-card location note**: if `locateCall(call.identifier)` resolves, show a muted "▸ Show in graph"
  affordance; else a muted "not on graph". Honest, no fabricated location.
- **Results header**: a "Clear highlight" text button → `onClearAssistant()`, shown when matches exist.
- `handleReset` (`:255-262`) also calls `onClearAssistant()`.
- `_chatbot.scss`: minor styles for `.chatbot-call-card__locate` hint, `.chatbot-call-card__details`
  button, and a `.chatbot-panel__clear` link — reusing existing card/`chatbot--dark|light` token patterns.

No `useCy()` in ChatBot: all graph mutation flows through `GraphPage` state + the `GraphMainColumn`
effects (single source of truth, mirrors how compare/timeline already work).

---

## 7. Honesty & scope (per ideas doc §"What CORDIS can and cannot tell you")

- **No data claims at all.** Step 1 adds **zero** new figures — it only navigates/highlights existing
  call nodes. The "real data only / nothing hardcoded" rule is satisfied trivially. The locator reads
  only the already-loaded graph store.
- **No silent no-op.** A match that isn't in the loaded graph is shown as "not on graph", never
  pretended to be located. The highlight count reflects only real matched call ids.
- **Step 2 deferred & labelled.** CORDIS-backed answers ("who has been funded in X?") need the live
  ingest (A1/A2 awaiting it) and a new `/chatbot` path over `CordisProject`/`CordisOrganisation`; that is
  a separate plan once data exists. This plan does not touch the backend.

---

## 8. Step-by-step

1. `buildCallLocator.js` (§2) — pure, unit-checkable.
2. `palette.js` (§5) — three style rules.
3. `GraphPage.js` (§3) — state, locator memo, three handlers, prop pass-through.
4. `GraphMainColumn.jsx` (§4) — accept props; two effects; pass props to `ChatBot`.
5. `ChatBot.js` + `_chatbot.scss` (§6) — results callback, locate-on-click, Details button, clear,
   per-card note.
6. Build the frontend (§9); update this file's Status.

---

## 9. Verification

- **Locator unit logic (offline, no DB/app):** a tiny Node script that feeds `buildCallLocator` a stubbed
  `loadFromStore` returning a known cluster's `{nodes, rels}` (or a hand-built fixture with one multi-call
  destination + one single-call/promoted destination) and asserts: a multi-call call resolves to
  `{clusterKey, destinationId, promoted:false}` with the right `destinationId`; a promoted call resolves
  to `{destinationId:null, promoted:true}`; an unknown id → `null`. Pure functions, deterministic.
- **Frontend build:** `node node_modules/react-scripts/bin/react-scripts.js build` (npx is broken on this
  Windows setup, per project memory). Pre-existing warnings expected; A3 must add **no new** ones.
- **Live manual (user, app running):**
  1. Open the assistant, search e.g. "cybersecurity" → results highlight; non-matches dim across the
     graph; cluster/destination nodes containing matches glow at the overview.
  2. Click a result → graph drills to its cluster → destination layer, modal closes, the call node is
     centered and briefly ringed.
  3. Click **Details** → `NodeDetail` opens as before.
  4. **Clear** → highlight/dim removed.
  5. Search a term whose top hit is in a non-cluster programme (e.g. ERC/MSCA) → navigation still works
     (locator is data-driven). A made-up/absent call → "not on graph", click opens Details.

---

## 10. Rollback

Pure frontend, no schema/data. To revert: delete `buildCallLocator.js`; remove the three `palette.js`
style rules; remove the `GraphPage` state/handlers + the `GraphMainColumn` props/effects; revert
`ChatBot.js`/`_chatbot.scss` to restore card-click→detail. No backend, no migration.

---

## 11. Deferred (step 2, separate plan once CORDIS data is live)

Let the assistant answer "who has been funded in X?" / "which organisations work on Y?" from the ingested
`CordisProject`/`CordisOrganisation` graph (a new branch in `chatbot_api.py` or a dedicated route), and
optionally highlight the relevant call/area nodes the same way step 1 does. Blocked on the live
`POST /cordis/tag-calls` ingest (see `00-data-backbone.md` / `02-A2…md`).
