# Remove the deferred HE-Wiki "Min Similarity" slider

**Labels:** ready-for-human · **Relates to:** CLAUDE.md §Product (HE-Wiki / `CROSS_TOPIC_SIMILARITY` deferred — "dependent dead controls (Min-Similarity slider) are removed, not advertised"), ADR-0006 #2, ADR-0007 · **Source:** ADR-conformance audit

## What to build

The "Min Similarity" score slider is a control for the **deferred HE-Wiki similarity feature**
(`CROSS_TOPIC_SIMILARITY` edges). CLAUDE.md §Product defers that feature ("that data isn't in the loaded
graph; B3's EuroSciVoc relatedness likely supersedes it") and states its dependent dead control — the
Min-Similarity slider — is **removed, not advertised**. Remove the slider.

**Accurate current behaviour (verified — read before trusting the old framing):** the slider is *not*
shown in the main work-programme graph. It is gated to the HE-Wiki graph only —
`LegendToggle.js`: `isHE2025 && layerEdgeTypesSet.has("CROSS_TOPIC_SIMILARITY")`, where
`isHE2025 = (graphName === "HE_2025")` — and `ScoreFilter.js` additionally bails when there are zero
similarity edges. So this is **not** a "blanks the main graph" bug; it is an advertised control for a
deferred feature. (Secondary reason: where similarity edges do load, applying it writes the `faded`
class directly, bypassing the ADR-0007 constraint store.)

**Scope (verify — paths may drift):** remove the `ScoreFilter` mount — the gated `title="Min Similarity"`
`LegendSection` block in `LegendToggle.js` (~L485–493) — and the `LegendParts/ScoreFilter.js` component
and its import.

**Out of scope (deliberately):** the other `CROSS_TOPIC_SIMILARITY` readers — `HoveredNodeInfo`
`nodeExtractors.js`, `EdgeTypeToggle` ("Toggle similar topics"), and the `graphStyles` edge selector —
are part of the same deferred HE-Wiki (`HE_2025`) view. CLAUDE.md names only the slider as "removed";
whether to strip the whole HE-Wiki similarity subsystem is a separate decision. Leave them intact unless
a broader HE-Wiki removal is agreed in its own issue.

## Acceptance criteria

- [x] The "Min Similarity" slider/section no longer renders in any graph, including `HE_2025`.
- [x] `ScoreFilter` is deleted (or its sole mount removed) with no dangling import or empty `LegendSection`.
- [x] The main work-programme graph is unchanged — no regression (the slider was already gated out of it).
- [x] No new direct `faded`/edge-visibility writes are introduced; if a similarity filter returns later
      (with real B3 EuroSciVoc relatedness), it writes through the ADR-0007 constraint store.
- [x] The wider HE-Wiki `CROSS_TOPIC_SIMILARITY` readers are left intact (unless a separate issue removes them).

## Blocked by

None — can start immediately.

## Comments

**2026-07-07 (agent):** Done. Removed the `Min Similarity` `LegendSection` mount and the
`ScoreFilter` import from `LegendToggle.js` (plus the now-unused `similarity` key in its
`sectionsOpen` state) and deleted `LegendParts/ScoreFilter.js`. Grep confirms zero remaining
`ScoreFilter` / "Min Similarity" references; the other `CROSS_TOPIC_SIMILARITY` readers
(`graphStyles.js`, `EdgeTypeToggle.js`, `palette.js`, `nodeExtractors.js`) are untouched.
Production build compiles (only pre-existing warnings).
