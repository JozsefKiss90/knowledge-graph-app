# The organizing model is Advertised (work programme) linked to Awarded (CORDIS evidence)

The app's spine is the join between two halves: **Advertised** — the Horizon Europe work-programme
hierarchy (Pillar → Programme → Destination → Call) — and **Awarded** — CORDIS-funded projects,
organisations, countries, and EuroSciVoc research fields. Every call and area view can flip between
"what's on offer" and "what has actually been funded." This is the organizing idea, not one feature
among many: it is the two stages of the single core job (triage what's fundable, then judge whether
to commit), and it is why there is no top-level "CORDIS" section in the IA — the funding landscape is
a reveal *on* calls/areas.

**The join is thematic, and must be.** The evidence surfaced against a call is linked by subject area
(the `HAS_FUNDED_PROJECT` edge, built from curated per-subject CORDIS queries), i.e. *the funded track
record in this call's subject area* — never "the projects this call funded." For an open call, exact
funding (`FUNDED_UNDER`, the exact call-code edge) is definitionally empty, because nothing has been
awarded under a call that is still open. The thematic bridge is therefore the only way to show a track
record behind an open call, and the UI language must say "in this area," not imply ownership. (Note:
the `HAS_FUNDED_PROJECT` edge name reads more precise than it is — a future reader should not "fix"
the panels to use `FUNDED_UNDER`, which would blank the evidence for every open call.)

Reversing this re-architects both the information architecture and the data model.
