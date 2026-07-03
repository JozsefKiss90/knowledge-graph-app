# Grill-with-Docs Agenda — Product Vision & Positioning

**Purpose.** Drive a `/grill-with-docs` session that resolves *what this app is*, the problems it
solves, its competitive edge, and how to make its capabilities — especially the newer CORDIS
"funding landscape" layer — obvious to users. Answers get committed to governance: glossary terms to
`CONTEXT.md`, hard decisions to `docs/adr/`, and the product summary to `CLAUDE.md`.

**Status:** draft agenda, pre-session. Owner: József. Scope: *core-focused* (identity + the two core
features + UX direction; each secondary feature gets one bucket decision, not a deep sub-grill).
Brand wording is deferred to a later phase but its *constraints* are captured here.

---

## How to run this session

This agenda feeds three installed skills (`.claude/skills/`):

- **`/grilling`** — ask questions **one at a time**, wait for the answer before moving on, and give a
  **recommended answer** for each. Walk the tree top-down; resolve dependencies first. If a question
  can be answered by reading the code, read the code instead of asking.
- **`/domain-modeling`** — the moment a term is pinned down, write it to `CONTEXT.md` (glossary only,
  no implementation detail). Offer an ADR *only* when a decision is **hard to reverse + surprising
  without context + a real trade-off**.
- **`/grill-with-docs`** — the wrapper that runs the two together.

**Each question block below is pre-loaded with a recommendation** so the session is a reaction, not a
blank page. Reading key for the `→ Lands in` tag:

- `→ CONTEXT.md` — resolves a glossary term
- `→ ADR` — candidate decision record (see Appendix B)
- `→ CLAUDE.md §Product` — goes in the product summary (Appendix C)
- `→ UX decision` — feeds `FRONTEND_UX_REFACTOR_PLAN.md` / a PRD under `.scratch/`
- `→ Brand phase (deferred)` — record the constraint, defer the wording

**Dependency order** (full map in Appendix D): **Part 1 (Identity)** unblocks everything. Do it first
and do not skip ahead — most later disagreements are really unresolved identity questions.

---

## Part 0 — The one thing this session must produce

Before the detailed tree, force the summary statement. Everything else exists to make this defensible.

**Q0.1 — In one sentence a stranger understands, what is this app?**
- *Why it matters:* You said the product "evolved from several ideas." Until there is one sentence,
  every feature argument re-litigates the identity. This sentence is the tie-breaker for all of Part 4.
- *Recommendation:* *"A map of European research funding that shows, side by side, the money currently
  **on offer** (Horizon Europe calls) and the money **already awarded** (real CORDIS-funded projects) —
  so you can find the right open call and instantly see who has actually been funded to do this work."*
  This is directly supported by your own framing in `CORDIS_FEATURE_IDEAS.md` ("Today the app can only
  show what is *advertised*; CORDIS lets it show what has actually *happened*").
- *→ CLAUDE.md §Product, → CONTEXT.md (defines "Advertised" vs "Awarded")*

---

## Part 1 — Identity: what the app IS (resolve first)

**Q1.1 — What category is it? What shelf does it sit on?**
- *Why it matters:* Category sets user expectations before any feature does. "Funding search engine,"
  "research-funding intelligence tool," and "graph explorer" imply very different UIs and buyers.
- *Recommendation:* **"European research-funding intelligence."** Lead with the outcome (intelligence
  about funding), not the mechanism (a knowledge graph). The graph is *how*, not *what* — most users
  do not shop for a graph. Keep "knowledge-graph" as the internal codename only.
- *→ CONTEXT.md, → CLAUDE.md §Product, → ADR (positioning is a boundary decision)*

**Q1.2 — What is the core job-to-be-done — the reason someone opens it on a Tuesday?**
- *Why it matters:* A product with two "core features" still needs one primary job, or the home screen
  can't be designed.
- *Recommendation:* **"Decide whether and where to apply for EU research funding, fast and with
  evidence."** The open-calls finder answers *where can I apply*; the CORDIS landscape answers *is it
  worth it / who wins here / who could I partner with*. One job, two questions.
- *→ CLAUDE.md §Product*

**Q1.3 — Is the "two halves" model (Advertised ↔ Awarded) THE organizing idea, or just one feature?**
- *Why it matters:* This is the single most leverageable idea in your existing docs and it is currently
  buried in a footnote. If it is the spine, the whole IA should express it.
- *Recommendation:* **Make it the spine.** Advertised = the work-programme hierarchy (Pillar →
  Programme → Destination → Call); Awarded = CORDIS evidence (funded projects, organisations, countries,
  EuroSciVoc fields) linked to those calls. Every call view should be able to flip between "what's on
  offer" and "what actually happened." This reframes the CORDIS work from "a features backlog" into
  "the second half of the core promise."
- *→ CONTEXT.md ("Advertised", "Awarded", "Funding Landscape"), → ADR-candidate (organizing model)*

**Q1.4 — Who is the ONE primary user, and what triggers their visit?**
- *Why it matters:* You cannot make features "apparent" without knowing whose mental model to match.
  Grant-seeking researchers, research-office/grant advisors, and consultancies want different first
  screens.
- *Recommendation:* **Primary: the research grant advisor / research-office professional** (and the
  ambitious PI they support) at a university or research organisation, triggered by "a new work
  programme dropped / a deadline is coming / my PI asked what's fundable in X." They value both halves
  and will actually use partner-finding and track records. Treat solo PIs and consultancies as
  secondary for now.
- *→ CONTEXT.md ("User" / persona), → CLAUDE.md §Product, → ADR (scope: who we optimise for)*

**Q1.5 — What is the app explicitly NOT? Name three things it will be mistaken for.**
- *Why it matters:* Scope boundaries are as valuable as scope. "The explicit no-s" are exactly what the
  ADR format says to record. It also stops feature creep back into "several ideas."
- *Recommendation:* It is **not** (a) a proposal-writing / application-submission tool — it points to
  the official portal, it does not replace it; (b) a general research-paper/citation graph — it is about
  *funding*, not publications; (c) a live grants-alert CRM. Say these out loud and write them down.
- *→ ADR (scope boundary — what it is NOT), → CLAUDE.md §Product*

---

## Part 2 — Problem & value: the possibilities it offers

**Q2.1 — State the primary problem in the user's words. What's painful about finding open calls today?**
- *Why it matters:* The calls-finder is your shipped strength; naming the pain sharpens the pitch and
  the empty-state copy.
- *Recommendation:* *"The official portal is a flat, bureaucratic list; it's hard to see structure,
  hard to compare, and impossible to tell which calls actually matter for my field."* Your drill-down
  hierarchy + call detail page already answer this — that is the wedge on half one.
- *→ CLAUDE.md §Product*

**Q2.2 — State the second problem the CORDIS landscape solves. Why isn't "a list of open calls" enough?**
- *Why it matters:* This justifies the whole CORDIS investment and the effort to surface it.
- *Recommendation:* *"A call tells me money exists; it doesn't tell me whether I stand a chance, who
  usually wins it, how much they get, or who I should team up with. I have to guess."* CORDIS turns
  guesses into evidence: real funded projects, EU contribution in awarded euros, coordinator-vs-partner
  organisations, countries, and research fields — per your data backbone.
- *→ CLAUDE.md §Product, → CONTEXT.md ("Evidence")*

**Q2.3 — Of the CORDIS possibilities, which 2–3 are the headline "wow" that sell the second half?**
- *Why it matters:* You have ~9 CORDIS sub-features at varying maturity. Leading with all of them = the
  current problem (power hidden behind tabs). Pick the demo that lands.
- *Recommendation:* **Every** CORDIS sub-feature (A1, A2, A6, B2, B3, B4, B5, B6) is built and
  offline-verified (see Q4.2), so this is a *curation* choice, not a backlog. Lead the demo with three:
  **(1) the funded-projects panel on a call** (A2 — "who's actually been funded behind this call: N
  projects, €X, top organisations and countries"), **(2) the partner finder** (B2 — "the organisations
  active in this area, coordinators vs partners, filterable by country/type"), and **(3) the
  research-field explorer** (B5 — browse the EuroSciVoc landscape and see projects + calls per field).
  Stage A6 trend, B3 related-calls, B4 country overlay, B6 hop-on as a labelled second wave — not because
  they're unbuilt, but to avoid overwhelming first-run.
- *→ CLAUDE.md §Product, → UX decision (what to surface first)*

**Q2.4 — What is the 30-second demo that makes someone "get it"?**
- *Why it matters:* If you can't script the demo, the IA can't lead the user to it. The demo *is* the
  onboarding.
- *Recommendation:* *"Open a Cluster → drill to a Call → the call shows its deadline and official link
  (half one), then one tap reveals the funded landscape behind it: who won, how much, which countries,
  who to partner with (half two)."* Design the home screen to walk a first-time user straight into this.
- *→ UX decision*

---

## Part 3 — Positioning & competitive edge

**Q3.1 — What are people using instead today? List the real alternatives.**
- *Why it matters:* Edge is defined against alternatives, not in a vacuum.
- *Recommendation:* The **official EU Funding & Tenders portal** (authoritative but flat and hard to
  reason over), **the raw CORDIS website/dashboards** (rich but disconnected from open calls),
  **spreadsheets + consultants**, and **generic grant-alert services** (breadth, no depth). Your edge
  is the *join* none of them make.
- *→ CLAUDE.md §Product*

**Q3.2 — What is the unfair advantage — the thing that is hard to copy?**
- *Why it matters:* This is the sentence investors, partners, and your own roadmap should defer to.
- *Recommendation:* **"We link the two halves the official sources keep apart — the calls open now and
  the projects already funded — in one graph, with an honesty contract: real awarded euros only, honest
  empty states, and counts never dressed up as impact."** The graph model (Call →[HAS_FUNDED_PROJECT]→
  CordisProject via subject-area link) is the moat; the honesty guarantees are the trust layer.
- *→ CLAUDE.md §Product, → ADR (honesty contract, see Q6.4 / Appendix B)*

**Q3.3 — Commit to one positioning statement (fill the blanks).**
- *Why it matters:* Forces Q1–Q3 into a single reusable line.
- *Recommendation:* *"For **research grant advisors and PIs** who need to decide **where to apply for EU
  funding**, **[App]** is a **research-funding intelligence tool** that **shows open calls and the real
  funded track record behind them in one place** — unlike **the official portal or raw CORDIS**, which
  make you piece it together yourself."*
- *→ CLAUDE.md §Product*

**Q3.4 — What claim must the eventual name/tagline carry (wording deferred)?**
- *Why it matters:* Keeps the deferred brand work anchored to a decided promise, so it doesn't reopen
  identity later.
- *Recommendation:* The name/tagline must convey **funding + clarity/navigation + evidence** (some pair
  of "European research funding," "map/navigate," "who's really funded"). Lock the *claim* now; defer
  the *words*.
- *→ Brand phase (deferred), → CLAUDE.md §Product (record the constraint)*

---

## Part 4 — The two cores & consolidating the "several ideas"

**Q4.1 — Confirm the two core features and their rank.**
- *Why it matters:* Everything secondary is judged by whether it serves these two.
- *Recommendation:* **Core 1 (primary, shipped): Find open calls fast** — the Pillar→Programme→
  Destination→Call drill-down, search, and the call detail page. **Core 2 (co-primary, emerging): Navigate
  the funding landscape** — the CORDIS evidence layer. Both are "core"; Core 1 is the entry point, Core 2
  is the differentiator.
- *→ CLAUDE.md §Product*

**Q4.2 — The go-live decision: is *lighting up CORDIS* (ingest + surface) the headline of this phase?**
- *Why it matters:* The CORDIS features are **built and offline-verified but not populated** — they
  render nothing because no data is ingested. This is the highest-leverage, lowest-net-new-code move you
  have. It is an operational decision, not a build.
- *Recommendation:* **Yes — make it the phase headline.** One ingest run (set the CORDIS key + Neo4j,
  run tag-calls / evidence population) lights up *all ~8 already-built CORDIS features at once* — the
  highest-leverage move available. It converts "packed with features that render nothing" into "the
  second half of the promise is live." Surface A2/B2/B5 first (Q2.3); stage the rest as a second wave.
- *→ ADR-candidate (phase objective), → CLAUDE.md §Product, → PRD under `.scratch/`*

**Q4.3 — Bucket each secondary feature: keep-core / keep-support / defer / cut / merge. (One call each.)**
- *Why it matters:* This is the actual "what is the app" cut. Being decisive here is the point of the
  session. Recommendations below — grill each in turn:
  - **Portfolio Dashboard** → **keep-support, but re-cast as the navigation hub / home** (not a
    standalone analytics page). Kill its dead tabs. *(Currently has inert Committed/Spot/Forecast tabs.)*
  - **AI Assistant / RAG chatbot** → **keep-support, scope to "acts on the graph"** (A3: answer +
    highlight/zoom to matching calls). Defer open-ended chat. Don't let it become a third core.
  - **Compare drawer** → **keep-support**, but confirm it compares the things users actually compare
    (calls, not only programmes) — otherwise defer.
  - **Timeline scrubber** → **keep-support** as a filter on Core 1; make sure it participates in the
    unified filter model (Q6.1), not its own hidden layer.
  - **Partner finder (B2), Research-field explorer (B5), Funded-projects panel (A2)** → **these are
    Core 2, not secondary** — reclassify them as the CORDIS core surface, launch-first.
  - **Funding-history trend (A6), Related-calls (B3), Country overlay (B4), Hop-on host (B6)** →
    **second-wave surface** (all built & offline-verified — defer *surfacing*, not building; light them
    up after the launch three land).
  - **HE-Wiki entity graph / CROSS_TOPIC_SIMILARITY edges** → **decision needed**: they power several
    "graph-native" ideas but *are not in the data the frontend loads* (your "single most important
    strategic finding"). Recommend **defer and stop advertising features that depend on them** until the
    data pipeline actually ships them (kills the dead "Min Similarity" slider).
- *→ CLAUDE.md §Product (core vs support vs deferred list), → UX decision, → ADR (data-layer boundary)*

**Q4.4 — In the IA, are the two cores one workflow or two modes?**
- *Why it matters:* Determines navigation shape.
- *Recommendation:* **One workflow, progressive.** Calls-finding is the spine; the landscape is a
  reveal *on* a call/area, not a separate destination the user has to discover. This directly fixes
  "the app hides its own power."
- *→ UX decision, → ADR-candidate (IA: evidence is a reveal on calls, not a separate section)*

---

## Part 5 — Surfacing the CORDIS landscape (make possibilities apparent)

**Q5.1 — What is the principle for making a capability visible even before its data is loaded?**
- *Why it matters:* Today CORDIS "renders nothing when empty," so the feature is invisible exactly when
  a new user looks. Invisibility reads as "missing," not "coming."
- *Recommendation:* **Advertise the capability, be honest about the state.** Replace blank with a labelled
  affordance + honest empty state ("Funded-project evidence — no CORDIS data ingested yet for this area"
  or "N projects found"). Never fabricate; never hide. Consistent with your honesty guarantees.
- *→ UX decision, → ADR (honest-empty-state rule, part of honesty contract)*

**Q5.2 — Where are the entry points to the landscape? Name every surface.**
- *Why it matters:* Scattered entry points (a band on call detail + three separate dashboard tabs + a
  9-glyph unlabeled rail) are why it feels hidden.
- *Recommendation:* **Consolidate to two:** (1) an **"Evidence / Funded landscape" band on the call &
  area detail** (A2 + partners), and (2) a **single "Explore the funding landscape" entry** (B5 field
  explorer) reachable from the home/hub. Label the right-rail glyphs or remove them. Retire the "hidden
  behind dashboard tabs" pattern.
- *→ UX decision*

**Q5.3 — What do we call this capability so a first-timer gets it? (naming = comprehension)**
- *Why it matters:* "CORDIS" means nothing to most users; "Evidence" is jargon-y alone.
- *Recommendation:* User-facing: **"Funded landscape"** / **"Who's been funded"**; the per-call panel:
  **"Funded projects behind this call."** Keep "CORDIS" only as the cited *source* ("Source: EU CORDIS").
  Matches your own rule: self-explanatory, jargon-free, no artefact acronyms.
- *→ CONTEXT.md ("Funding Landscape", "Evidence"), → UX decision*

**Q5.4 — Always-on or progressive disclosure for the evidence?**
- *Why it matters:* Balancing "apparent" against "cluttered."
- *Recommendation:* **Progressive but signposted** — the evidence band is always *present and labelled*
  on a call (so users learn it exists), collapsed to a one-line summary ("12 funded projects · €48M ·
  top country DE"), expanding on demand. Apparent ≠ overwhelming.
- *→ UX decision*

---

## Part 6 — UX / IA direction (updating the UX)

**Q6.1 — Commit to a single source of truth for "what is filtering my graph"?**
- *Why it matters:* Search, type-toggles, score slider, timeline, country paint, compare, and
  assistant-dim currently write to ~5 independent Cytoscape visibility layers users can't see or undo.
  This is the root UX defect.
- *Recommendation:* **Yes — one unified filter/constraint model** that every control writes to and that
  renders as a visible, individually-removable constraint bar. "Reset" actually resets. This is a
  hard-to-reverse architectural choice → ADR.
- *→ ADR (unified filter model), → UX decision*

**Q6.2 — How does the UI tell the central story (Advertised vs Awarded), and do we fix the contradicting KPI?**
- *Why it matters:* The distinction lives "only in a footnote," and the "Total committed" KPI label
  actively contradicts it (work-programme money is *on offer*, not *committed*).
- *Recommendation:* Make the Advertised/Awarded distinction a **first-class, repeated UI element** (a
  toggle/label on every relevant view), and **rename the KPI** to something truthful ("Indicative budget
  on offer" vs a separate, clearly-CORDIS "Awarded to date"). Never let a planned figure wear an
  "awarded" label.
- *→ UX decision, → CONTEXT.md ("Advertised", "Awarded")*

**Q6.3 — What does the app show a brand-new user with no context? (home / onboarding)**
- *Why it matters:* First run must teach the two halves in one screen, per the Q2.4 demo.
- *Recommendation:* A **hub/home** (re-cast dashboard) that (a) states the one-liner, (b) offers "Find
  open calls" as the primary path, and (c) teases "the funded landscape" with a live example. Introduce
  the app; don't drop users into a raw graph.
- *→ UX decision*

**Q6.4 — Dead/mock controls: remove or wire? (trust)**
- *Why it matters:* Inert controls (Min-Similarity slider that blanks the graph, Committed/Spot/Forecast
  tabs, "Bookmark" that writes to nothing, inert breadcrumb) erode trust in the *real* data — fatal for a
  product whose edge is honesty.
- *Recommendation:* **Remove now, restore when real** (Tier-1 quick wins). A missing feature is neutral;
  a broken one is a credibility hit. Codify this as the honesty contract.
- *→ ADR (honesty contract), → UX decision*

**Q6.5 — What is in-scope for *this* phase vs later? (sequence the refactor)**
- *Why it matters:* Prevents "update the UX" from meaning "everything."
- *Recommendation:* **This phase = Tier 1 (fix dead controls, rename KPI, honest empty states, search
  flies to matches) + the two spine decisions (Q6.1 unified filter, Q4.4/Q5.2 evidence-as-reveal) +
  CORDIS go-live (Q4.2).** Push deep-link URLs, command palette, org dossier, multi-turn assistant to a
  later phase.
- *→ UX decision, → PRD under `.scratch/`*

---

## Part 7 — Brand (constraints now, wording later)

**Q7.1 — Keep "knowledge-graph-app" as codename; commit to renaming for users?**
- *Why it matters:* The current name describes the mechanism, not the value, and undersells both cores.
- *Recommendation:* **Decide "yes, rename for users" now; defer the actual name.** Record that the
  product name must carry the Q3.4 claim. Keep "knowledge-graph-app" as repo/codename.
- *→ Brand phase (deferred), → ADR (record the decision to rename, not the name)*

**Q7.2 — What must the brand convey once revisited?**
- *Why it matters:* Anchors the deferred work so it doesn't reopen identity.
- *Recommendation:* Funding + navigation/clarity + real evidence; trustworthy and official-adjacent
  without impersonating the EU. Capture; defer execution.
- *→ Brand phase (deferred)*

---

## Part 8 — Governance: what gets committed where

**Q8.1 — Confirm the governance homes.**
- *Recommendation:* **`CONTEXT.md`** (new, at repo root) = the glossary only (Appendix A). **`docs/adr/`**
  = the hard decisions (Appendix B). **`CLAUDE.md` §Product** = the short product summary (Appendix C).
  Detailed phase plan → a PRD under `.scratch/product-vision/`. This matches `docs/agents/domain.md`
  (single-context: one `CONTEXT.md` + `docs/adr/`).
- *→ governance*

**Q8.2 — Which of this session's decisions clear the ADR bar (hard-to-reverse + surprising + trade-off)?**
- *Recommendation:* See Appendix B. Strongest candidates: the Advertised↔Awarded organizing model, the
  server-side CORDIS-into-Neo4j ingest pattern, curated-query topic tagging (not auto-query), the
  honesty contract, Neo4j as the single graph store, and the unified filter model. Positioning/scope
  ("what it is NOT") also qualifies as a boundary decision.
- *→ docs/adr/*

**Q8.3 — What is explicitly NOT governance (stays in plans/PRDs)?**
- *Recommendation:* Tier-by-tier UX task lists, per-feature specs, and roadmap sequencing stay in
  `.scratch/` / the existing `*_PLAN.md` files. `CONTEXT.md` stays "devoid of implementation details."
- *→ governance*

---

## Appendix A — Starter `CONTEXT.md` glossary (candidate terms)

Draft in the required format (name + tight definition + `_Avoid_`). Confirm/counter each during the
session; write the survivors to a new root `CONTEXT.md`.

```md
# European Research-Funding Intelligence

An app that links the EU research funding **on offer** (Horizon Europe work programme) with the funding
**already awarded** (CORDIS-funded projects), so users can find open calls and see the real track record
behind them.

## Language

**Advertised**:
Funding that is currently on offer — the work-programme calls and their indicative budgets. What is
*planned*, not yet awarded.
_Avoid_: committed, allocated, spent

**Awarded**:
Funding that has actually been granted to real projects, sourced from CORDIS (real euros).
_Avoid_: committed (for advertised money), disbursed

**Funding Landscape**:
The Awarded half of the app — the CORDIS evidence (funded projects, organisations, countries, research
fields) navigable per call or research area.
_Avoid_: CORDIS view, evidence graph

**Call**:
A specific Horizon Europe funding opportunity users can apply to; the leaf of the work-programme
hierarchy and the anchor both halves attach to.
_Avoid_: grant, tender, opportunity

**Destination / Programme / Pillar**:
The nested levels of the work-programme hierarchy above a Call (ROOT › Pillar › Programme › Destination ›
Call). The Advertised structure.

**Work Programme**:
The published set of Horizon Europe calls for a period; the source of the Advertised half.
_Avoid_: WP

**Funded Project**:
A real EU-funded research project from CORDIS, with awarded EU contribution, participants, and research
fields; linked to a Call by subject area.
_Avoid_: grant, award (as a noun for the project)

**Evidence**:
The funded-project data shown against a Call or area to answer "who has actually been funded here."
_Avoid_: proof, stats

**Organisation**:
A participant on a Funded Project, with a country, type (company / university / research org), and role
(coordinator vs partner).
_Avoid_: partner (except as the specific non-coordinator role), institution

**Research Field**:
An EuroSciVoc classification — the EU's standard hierarchical vocabulary of research fields — used to
link projects and calls by subject.
_Avoid_: topic, tag, keyword, cluster (reserve "Cluster" for the Horizon Europe programme sense)

**Framework Programme**:
The funding era a project belongs to (FP7, Horizon 2020, Horizon Europe); used for trends over time.
_Avoid_: FP (unqualified), era

**Assistant**:
The in-app helper that answers questions and acts on the graph (highlighting/zooming to matching calls).
_Avoid_: chatbot, bot, AI
```

---

## Appendix B — Candidate ADRs (apply the 3-part test in the session)

Each must be **hard to reverse + surprising without context + a real trade-off**. Offer only survivors;
one paragraph each, numbered `docs/adr/0001-…` upward.

1. **Organizing model: Advertised (work programme) linked to Awarded (CORDIS evidence).** The whole IA
   and data model hinge on joining calls to funded projects; reversing it re-architects the app. *(Shape
   + boundary.)*
2. **CORDIS is ingested server-side into Neo4j and read from the backend — never called live from the
   browser.** A future dev would otherwise "fix" it by calling CORDIS from the frontend; the async
   extraction API forbids it. *(Integration pattern, hard to reverse.)*
3. **Topic tagging uses curated per-subject queries, not automatic querying.** Surprising (looks like it
   could auto-tag); chosen because auto-queries produced noisy/wrong tags. *(Deliberate deviation.)*
4. **Honesty data contract:** real data only; honest empty states (never fabricate); counts ≠ funding ≠
   impact (separate labels); EU-funded-only with "absence ≠ no activity" disclosed; provenance stored on
   nodes. *(A constraint not visible in code — and the product's trust moat.)*
5. **Neo4j is the single graph store for both halves.** Technology lock-in worth recording. *(Tech
   choice.)*
6. **IA: the funding landscape is a reveal *on* calls/areas, not a separate section.** Explains why
   there's no top-level "CORDIS" nav. *(Boundary/shape.)*
7. **Unified filter/constraint model is the single source of truth for graph visibility.** Replaces the
   ~5 independent Cytoscape layers; expensive to retrofit later. *(Frontend shape.)*
8. **Scope: what the app is NOT** (not a proposal-writing/submission tool, not a publications graph, not
   a grants CRM). *(Boundary; the explicit no-s.)*
9. *(Maybe)* **Deployment target: Railway**, migrating from self-hosted Docker Compose. Include only if
   decided this phase. *(Tech lock-in.)*

---

## Appendix C — Draft `CLAUDE.md` §Product outline

Add a short **`## Product`** section to `CLAUDE.md` (governance, not a spec). Populate from answers:

```md
## Product

**What it is.** {Q0.1 one-liner.}

**Who it's for.** {Q1.4 primary persona + trigger.}

**The core model — two halves.** Advertised (Horizon Europe work programme: Pillar → Programme →
Destination → Call) linked to Awarded (CORDIS funded projects, organisations, countries, research
fields). See CONTEXT.md and ADR-0001.

**Core features.** (1) Find open calls fast. (2) Navigate the funding landscape (CORDIS evidence).
Supporting: {dashboard-as-hub, assistant-acts-on-graph, compare, timeline}. Second-wave surface (built &
offline-verified): {A6, B3, B4, B6}. Blocked on data pipeline: {HE-Wiki CROSS_TOPIC_SIMILARITY}.

**What it is NOT.** {Q1.5 boundaries — see ADR-0008.}

**Edge.** {Q3.2 unfair advantage + honesty contract — see ADR-0004.}

**Governance.** Glossary → CONTEXT.md. Decisions → docs/adr/. Phase plan → .scratch/product-vision/.
```

---

## Appendix D — Question dependency map (walk order)

```
Q0.1 (one-liner)
  └─ Part 1 Identity  ─────────────── unblocks everything
       Q1.1 category → Q1.2 job → Q1.3 two-halves-as-spine → Q1.4 persona → Q1.5 what-it's-NOT
         └─ Part 2 Problem/Value (needs identity)
              Q2.1 → Q2.2 → Q2.3 headline CORDIS → Q2.4 demo
                └─ Part 3 Positioning (needs 1+2)
                     Q3.1 → Q3.2 edge → Q3.3 statement → Q3.4 brand-claim
                └─ Part 4 Consolidation (needs identity)
                     Q4.1 cores → Q4.2 CORDIS go-live → Q4.3 bucket-each → Q4.4 one-workflow
                       └─ Part 5 Surfacing (needs 4.2 + 4.4 + 1.3)
                            Q5.1 → Q5.2 entry points → Q5.3 naming → Q5.4 disclosure
                              └─ Part 6 UX (needs 4 + 5)
                                   Q6.1 filter-SoT → Q6.2 story+KPI → Q6.3 home → Q6.4 dead-controls → Q6.5 phase-scope
  Part 7 Brand (needs Q3; deferred wording)
  Part 8 Governance (cross-cutting; resolve as terms/decisions crystallise)
```

**Rule of thumb for the session:** if an argument in Parts 4–6 won't resolve, the blocker is almost
always an unanswered Part 1 question. Go back up the tree.
