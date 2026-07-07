# Product-vision session — UX decisions (running log)

Feeds the phase PRD at Q6.5. Governance lives in `CONTEXT.md` / `docs/adr/` / `CLAUDE.md §Product`;
this file holds the `→ UX decision` outputs of the grilling session so they don't evaporate between
session and PRD.

## Q2.3 — Launch surface (curation, not construction)

- Evidence headline = **A2** (funded-projects panel) + **B2** (organisations/partner view). **A6**
  trend = supporting, not headline.
- **B5** (EuroSciVoc research-field explorer) ships at launch, billed as the **field-first way in**
  (the monitoring lens of pain 1) — never as a third evidence surface.
- Second wave (built + offline-verified, deliberately staged): A6 trend, B3 related calls, B4 country
  overlay, B6 hop-on.

## Q2.4 — The 30-second demo (= the onboarding walk)

**Pure flip demo**, four beats, zero dead-control dependencies:

1. **Half 1:** open a Cluster → drill to a Call — deadline + official portal link.
2. **The flip:** one tap — "**funded track record in this area**" (ADR-0001 wording: thematic
   adjacency, never "the projects this call funded").
3. **A2:** N projects · €X awarded — real money, at scale.
4. **B2:** the organisations — who wins this, who you could team with.

Rejected (for now):
- **"Watch this field" activation close** — the bookmark/watch control is currently dead; scripting
  the demo through it violates the honesty contract unless it's wired this phase. Revisit at Q6.5.
- **Field-first via B5 as THE demo** — demands a field choice before any wow.

Constraint on Q6.3: the home must walk a first-timer into this script.

## Q4.2 — Phase headline

**Light up CORDIS** is THE phase headline: ingest locally → dump → seed the Railway Neo4j
(`CORDIS_PLANS/13`) → surface A2/B2/B5. UX work this phase is subordinated to what the demo script
needs — with **one** deliberate exception (Q4.3, compare).

## Q4.3 — Secondary-feature buckets

- **Dashboard → the monitoring home/hub** (Q6.3 designs it): what's new/closing in your fields +
  shortlist; hosts the B5 field-first entry. Kill the inert Committed/Spot/Forecast tabs now — A4
  (planned vs awarded) revives that surface honestly post-ingest.
- **Assistant → grounded interface** (ADR-0005): grounded in the ingested graph, cites, highlights +
  zooms on the source-tracked channel; no open-web chat, no verdicts, never a third core.
- **Compare → EXTEND TO CALL-LEVEL THIS PHASE** (user call, overriding the keep-as-is rec): the
  deliberation compare — shortlisted calls side by side with deadline/budget + their A2 evidence.
  Sequenced **after ingest** (it consumes evidence); this is the phase's one UX scope add beyond the
  demo script. Implementation pointers: the compare-mode intercept currently excludes calls
  (`setupEvents.js`, `t !== "call"`), and `useCompareData` computes structure metrics — call rows
  need their own metric set. Structure-level compare stays as-is.
- **Timeline → keep-support** as a Core-1 filter. Constraint: it must write into the Q6.1 unified
  filter model (today it is an independent Cytoscape layer that "Reset All Filters" doesn't reset).
- **HE-Wiki / CROSS_TOPIC_SIMILARITY → defer + stop advertising.** The data isn't in what the
  frontend loads; the dead Min-Similarity slider goes on the Q6.4 kill list; B3's EuroSciVoc-overlap
  relatedness likely supersedes the idea — revive only if something misses it.

(Q4.1 and Q4.4 auto-resolved from committed doctrine: Core 1 = entry, Core 2 = differentiator; one
progressive workflow per ADR-0001.)

## Q5.1 + Q6.4 — Honesty contract (→ ADR-0006)

The dividing line: **missing data → labelled affordance + honest empty state** (evidence band stays
visible pre-ingest, saying so); **dead mechanism → remove until real**. Tier-1 kill-list audit
against the current UI (post landing-chrome redesign, some may already be fixed): Min-Similarity
slider, Committed/Spot/Forecast tabs, no-op Bookmark, anything else `FRONTEND_UX_REVIEW.md` flagged
as inert. Full contract (7 clauses incl. counts ≠ funding ≠ impact, awards ≠ odds, provenance):
ADR-0006. Clause 5 already mandates Q6.2's KPI rename.

## Q5.2 — Entry points: two canonical, rail collapses to one

1. **Evidence band on call/area detail** (the reveal, ADR-0001).
2. **The home/hub hosts the landscape entries** — B5 "explore by research field" at launch; wave-2
   tools (B4 country, B6 hop-on) appear there when staged.

The right rail's 3 CORDIS glyphs collapse into **one labelled "Funded landscape" shortcut** to the
home's landscape section. Rationale: the rail currently advertises second-wave tools (B4/B6) at equal
rank with launch-surface B5 — it un-stages Q2.3. Rail rule: **labelled shortcuts to canonical places,
never a third entry pattern.**

## Q5.3 — Naming (auto-resolved from glossary + ADR-0001)

- Capability label: **"Funding landscape"** (the CONTEXT.md term).
- Per-call band title: **"Funded track record in this area"** — the agenda's "Funded projects behind
  this call" is REJECTED (ownership wording violates ADR-0001's thematic-join rule).
- "CORDIS" user-facing only as attribution: "Source: EU CORDIS".

## Q5.4 — Disclosure (auto-resolved from demo + ADR-0006)

Progressive but signposted: the band is **always present + labelled** on a call, collapsed to a
one-line summary ("12 funded projects · €48M · top country DE"), expanding on demand. Pre-ingest it
shows the honest empty line — never blank. (Summary-data loading strategy is a PRD concern.)

## Q6.1 — Unified filter/constraint model (→ ADR-0007)

Adopted + minted. One constraint store, visible removable chips, one visibility computation, Reset
provably resets. **Binding on new work immediately** (call-level compare must not add a sixth
layer); retrofit of the existing ~5 layers sequenced at Q6.5.

## Q6.2 — Advertised/Awarded in the UI (auto-resolved from ADR-0001 + ADR-0006 §5 + Q4.4)

- **No global Advertised/Awarded mode toggle** — that would be a two-mode IA; Q4.4 committed one
  workflow with the evidence as a per-view reveal (the flip).
- **Every money figure carries its half as a badge**: "Indicative · on offer" vs "Awarded · CORDIS".
- **KPI rename mandated by ADR-0006 §5**: "Total committed" → "Indicative budget on offer"; a
  separate "Awarded to date (CORDIS)" appears only post-ingest, clearly sourced.

## Q6.3 — Home/hub in two honest versions

- **v1 (this phase): orientation + monitoring-lite.** One-liner stated; **"Find open calls"** as the
  primary path; the **"Funding landscape"** entry (Q5.2) teased with one LIVE example straight from
  the demo script; a global **"Closing soon"** list computed from loaded call deadlines — real
  monitoring value, zero user state. First run walks the four-beat demo.
- **v2 (next phase, explicitly deferred): the personalised feed** — your-fields watchlist +
  shortlist + "what changed", built on a real watch mechanism (ADR-0002 allows shortlist/watch),
  not the dead bookmark.
- Doctrine intact: "home optimises for the trigger" is the destination; v1 activates, v2 retains.

## Q6.5 — THE PHASE CONTRACT (confirmed 2026-07-06)

**IN:**
1. **CORDIS go-live** (headline): per-source ingest with curated queries → dump → seed Railway Neo4j
   → invalidate caches; surface A2 + B2 + B5.
2. **Evidence band** on call/area detail — always present, "Funded track record in this area,"
   collapsed one-line summary, honest empty pre-ingest.
3. **Home v1** — one-liner, "Find open calls" primary, Funding-landscape entry + live example,
   global "Closing soon"; rail 3→1 labelled "Funded landscape" shortcut.
4. **Honesty pass** — remove still-inert controls (audit vs post-redesign UI); KPI rename;
   Advertised/Awarded badges on money figures.
5. **Call-level compare** (the one scope add) — after ingest, on the constraint store (ADR-0007), no
   sixth layer.

**OUT (later):** unified-filter retrofit of the existing layers; home v2 (fields feed + shortlist +
watch mechanism); second-wave surfacing (A6/B3/B4/B6) + A4 revival; deep links / command palette;
brand wording.

Next artifact: the phase PRD under `.scratch/product-vision/`, expanding this contract into issues.
