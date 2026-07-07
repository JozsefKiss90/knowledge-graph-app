# Reword "total committed" tour copy

**Labels:** ready-for-agent · **Relates to:** ADR-0006 #5 (Advertised never wears an Awarded label), CONTEXT.md (_Avoid_: "committed") · **Source:** ADR-conformance audit

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

- [ ] No user-facing string labels advertised / on-offer / work-programme budget as "committed"
      (or "awarded" / "spent").
- [ ] The About/tour KPI description matches the shipped KPI label family ("Planned (on offer)").
- [ ] A grep for "committed" in user-facing strings returns only internal identifiers, not display copy.

## Blocked by

None — can start immediately.
