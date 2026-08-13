# Product

<!-- impeccable:product-schema 1 -->

> Impeccable-facing distillation of the governance sources — do not edit those from here.
> Authority order on conflict: `docs/adr/0001,0002,0006` → `CONTEXT.md` → `CLAUDE.md §Product` / `AGENTS.md §Product` → `.scratch/product-vision/UX-DECISIONS.md` (phase contract).

## Platform

web

Responsive web application, desktop-first. Tablet-up is supported; phone gets a soft portrait nudge, not a parallel mobile design.

## Users

- **Primary: the research-office professional** — a grant advisor / research manager at a university or research organisation, assessing European funding opportunities across a portfolio of researchers. Thinks in fields and portfolios; monitoring is a job function (the recurring "Tuesday pull": *something changed in my field — what's fundable now?*). Triggers: a new work programme dropped, a deadline approaches, a PI asked what's fundable in X.
- **Secondary: the principal investigator (PI)** they support — the researcher whose months of proposal effort are the scarce resource. The PI's single-topic view is a filtered case of the advisor's portfolio view; the product optimises for the advisor's lens and lets the PI zoom in (ADR-0002).

## Product Purpose

Help the user **decide where to spend scarce proposal effort, quickly and with defensible evidence**. A Horizon proposal is months of work; success is committing to the right call and not burning a season on a doomed bid. One job in two stages: **monitoring** (triage what's fundable now in my fields — the frequent trigger and retention engine) and **deliberation** (is this one worth committing to — the rare, high-stakes payoff). The evidence equips that decision; the product never makes it.

## Positioning

European research-funding intelligence: the app makes the **join** the official sources keep apart — **Advertised** funding currently on offer (Horizon Europe work-programme calls) connected to **Awarded** activity (real CORDIS-funded projects) **in the same subject area**, in one place. Linked by curated subject-area tagging, governed by an honesty contract. The moat is the join, the accumulated curation, and the trust discipline — not data exclusivity (both sources are public).

*"For research-office professionals and the PIs they support, who must decide where to spend scarce proposal effort, [App] shows open calls and the real funded track record behind them in one place — unlike the official sources, which keep those two halves apart."*

Incumbents to beat: the official EU Funding & Tenders portal (authoritative but flat), raw CORDIS dashboards (evidence disconnected from open calls), the advisor's homegrown Excel-watchlist-plus-newsletter apparatus, and generic grant-alert databases.

## Operating Context

- Used at a desk, in a work context, often to answer a PI's question or prepare advice — scanability and defensibility of what's on screen matter more than spectacle.
- Every application ultimately happens on the official EU Funding & Tenders portal; the app **links out and never impersonates it**.
- Entry is one workflow, two lenses: programme-first drill-down (Pillar → Programme → Destination → Call) and field-first via the EuroSciVoc research-field explorer. Evidence is a **reveal on** calls/areas — there is no separate "CORDIS section" or global Advertised/Awarded mode toggle.

## Capabilities and Constraints

- **Core 1 (entry): find open calls fast** — hierarchy drill-down, search, call detail with deadline and official portal link.
- **Core 2 (differentiator): the funding landscape** — per call/area, the funded track record in that subject area: funded projects + awarded euros (A2), the organisations behind them read as both diagnostic and partner directory (B2), with the research-field explorer (B5) as the field-first way in. Second-wave surfaces (trend, related calls, country overlay, hop-on) exist but are deliberately staged.
- **Supporting:** monitoring home/hub (what's new/closing + landscape entry), grounded assistant (cites and acts on the data, recommends but never rules), compare (structure-level, plus call-level compare this phase), timeline filter.
- **The join is thematic by design (ADR-0001).** CORDIS evidence against a call means *the funded track record in this subject area* — never "the projects this call funded." For an open call, exact-award data is definitionally empty; thematic adjacency is the only honest bridge, and UI language must say "in this area," never imply ownership.
- **Terminology is binding (CONTEXT.md).** Advertised money is *indicative / on offer* — never "committed," "allocated," "awarded," or "spent." Awarded means real CORDIS euros. Capability label: "Funding landscape"; per-call band: "Funded track record in this area"; "CORDIS" appears user-facing only as source attribution.
- **"Knowledge graph" is implementation language.** Mechanism words (graph, nodes, edges) are banned user-facing; say "in one place," never "in one graph."
- **What it is NOT (ADR-0002):** not proposal-writing or submission software; not a publications/citation graph; not a full grants CRM (shortlist/watch yes, pipeline/status/reminders no); not an adjudicator or prediction system (no eligibility rulings, winnability scores, or a single "pick this one" — ranking ≠ verdict).
- **Undecided:** the user-facing product name and tagline (brand phase). It must carry the domain (European research funding) and the join promise; do not invent a name meanwhile.

## Brand Commitments

- The product will be renamed for users; "knowledge-graph-app" is the internal codename only. Until the brand phase, surfaces stay name-neutral.
- Tone: trustworthy, official-adjacent, **never impersonating the EU** (no EU emblem misuse, no portal look-alike).
- "Map / navigate" is permitted imagery; mechanism words are not.
- The user-facing "intelligence" claim is gated on the CORDIS evidence half actually being populated.

## Evidence on Hand

- Real Horizon Europe work-programme data (hierarchy, calls, budgets) loaded; work-programme PDF content merged with the F&T API per topic.
- Real CORDIS award data (projects, euros, organisations, countries, EuroSciVoc fields) ingested locally; production (Railway) seed is a pending ops step — until then, evidence surfaces show honest empty states.
- **Absences that must never be papered over:** CORDIS has awards, not applications — no application counts, funded rates, or odds exist anywhere in the data. No testimonials, case studies, or customer logos exist; do not fabricate any.

## Product Principles

1. **Evidence equips the decision; it never makes it.** Surface, rank by grounded relevance, cite — no verdicts, no scores, no "pick this one."
2. **The honesty contract binds every surface (ADR-0006).** Real returned data only; missing data gets a labelled affordance with an honest empty state; a dead mechanism is removed, not advertised; provenance ("says who, as of when") and freshness are always answerable; EU-funded-only scope is disclosed wherever "no evidence" could be misread as "no activity."
3. **Counts, funding, and impact are different measures** — separately labelled, never proxying for one another; awards are never presented as success odds.
4. **Every money figure wears its half.** "Indicative · on offer" vs "Awarded · CORDIS" — Advertised never wears an Awarded label.
5. **One workflow, not two modes.** Evidence is a reveal on calls and areas; optimise for the advisor's fields/portfolio lens and let the PI filter down.

## Accessibility & Inclusion

Baseline for all surfaces: full keyboard operation, visible focus states, WCAG AA contrast, `prefers-reduced-motion` support, and no color-only meaning (the graph visualisation must pair color with another channel — shape, label, or position).
