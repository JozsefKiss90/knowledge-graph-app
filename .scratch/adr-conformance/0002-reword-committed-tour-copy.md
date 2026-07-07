# Reword "total committed" tour copy

**Labels:** ready-for-human · **Relates to:** ADR-0006 #5 (Advertised never wears an Awarded label), CONTEXT.md (_Avoid_: "committed") · **Source:** ADR-conformance audit

## What to build

The About / guided-tour copy describes the dashboard KPIs as "total **committed** budget on offer."
Advertised (work-programme) money is indicative and not committed; ADR-0006 #5 and CONTEXT.md's `_Avoid_`
list forbid labelling advertised money "committed," "awarded," or "spent." The KPI card itself was
already corrected to "Planned (on offer)" — this stray tour string reintroduces exactly the conflation
the KPI rename removed. Bring the copy in line (e.g. "planned budget on offer" / "indicative budget on
offer").

**Where (current — verify, may drift):** `About.js` (the KPI description line, ~L333). Sanity-check
`GuidedTour.jsx` for the same phrasing while you're there. Internal variable names like `totalCommitted`
may remain — this is about *user-facing copy only*.

## Acceptance criteria

- [x] No user-facing string labels advertised / on-offer / work-programme budget as "committed"
      (or "awarded" / "spent").
- [x] The About/tour KPI description matches the shipped KPI label family ("Planned (on offer)").
- [x] A grep for "committed" in user-facing strings returns only internal identifiers, not display copy.

## Blocked by

None — can start immediately.

## Comments

**2026-07-07 (agent):** Done. `About.js` dashboard section now reads "total planned budget on
offer" (was "total committed …"); the sentence's existing clarifier ("These are **planned**
figures (money on offer), not money awarded") stands. `GuidedTour.jsx` checked — no "committed"
phrasing there. Grep for "committed" across `frontend/src` now matches only the internal
`totalCommitted` identifiers, no display copy.
