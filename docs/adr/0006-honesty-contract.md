# The honesty contract: real data, honest empty states, no dressed-up numbers

Trust is part of the product's declared edge, so these constraints bind every surface — and they are
recorded here because code cannot show them: a future contributor cannot infer "never show odds" from
the absence of an odds feature.

1. **Real data only.** Nothing is fabricated, extrapolated, or padded — no placeholder numbers, no
   demo data on production surfaces.
2. **Missing data ≠ dead mechanism.** A surface whose mechanism works but whose data is not ingested
   stays visible as a labelled affordance with an honest empty state ("Funded track record — no
   CORDIS data ingested for this area yet"): capability advertised, state disclosed. A control whose
   mechanism does not work (a slider filtering data that never loads, a bookmark that writes to
   nothing, tabs drawing identical charts) is **removed until real** — an inert control lies about
   what interacting will do. A missing feature is neutral; a broken one is a credibility hit.
3. **Counts ≠ funding ≠ impact.** Project counts, awarded euros, and any notion of importance carry
   separate labels and never proxy for one another.
4. **Awards, never odds.** CORDIS records awards, not applications — so no funded-rate, success
   probability, or winnability is shown or implied (companion to ADR-0002 #4: ranking ≠ verdict).
5. **Advertised never wears an Awarded label.** Indicative work-programme money is never labelled
   "committed," "awarded," or "spent" (CONTEXT.md's _Avoid_ lists are binding on UI copy); awarded
   CORDIS euros are labelled as awarded.
6. **Scope disclosed: EU-funded only.** Absence of evidence is not evidence of no activity — a field
   or organisation may thrive on other funders — and the UI says so wherever that inference is
   tempting.
7. **Provenance.** CORDIS-derived nodes and figures carry source and ingest time; every surface can
   answer "says who, as of when," and never implies live coverage (ADR-0003's freshness trade-off).

The accepted trade-off: the product looks less impressive when sparse — honest empties instead of
padded demos, removed controls instead of teasing chrome, longer labels instead of punchy
conflations. Chosen deliberately: one dressed-up number would cost the credibility the entire
evidence half exists to earn.
