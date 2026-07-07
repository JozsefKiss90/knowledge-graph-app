# Phase implementation plan — "Light up CORDIS"

Expands the **Q6.5 phase contract** (`UX-DECISIONS.md`) into an ordered, dependency-aware build plan.
Every step cites the spec it comes from. Nothing here is new scope — it is the 5 IN items sequenced,
with the conformance issues folded in. Next artifact after this: per-step issues (feed each step to
`/to-issues`).

**Sources:** `CLAUDE.md §Product`, `docs/adr/0001–0007`, `.scratch/product-vision/UX-DECISIONS.md`,
`.scratch/adr-conformance/*`, `.scratch/cordis-ingest/*`, `CORDIS_PLANS/13`.

---

## The spine (read first)

The gap between the governed vision and the running app is one thing: **the Awarded half is dark.**
Everything below is either (a) lighting it up or (b) surfacing it honestly. The critical path is
**Step 2 (ingest)** — until it runs, the "intelligence" positioning stays gated (CLAUDE.md §Category)
and Steps 3–6 have nothing real to render.

```
Step 1  Honesty quick-wins ───────────────┐ (independent, do first / parallel)
Step 2  CORDIS go-live (INGEST) ★critical ─┼─► un-gates everything
Step 3  Evidence band  ────────────────────┤ (build in parallel, verify post-ingest)
Step 4  Money badges + KPI ────────────────┤ (Advertised now · Awarded post-ingest)
Step 5  Home v1 ───────────────────────────┤ (shell parallel · live example post-ingest)
Step 6  Call-level compare ────────────────┘ (needs ingest + evidence band + constraint store)
```

---

## Cross-cutting constraints (bind every step)

- **Honesty contract (ADR-0006).** Missing data → labelled affordance + honest empty state; dead
  mechanism → remove until real; counts ≠ funding ≠ impact; awards ≠ odds; Advertised money never wears
  an Awarded label; every CORDIS figure carries source + "as of".
- **Thematic join wording (ADR-0001).** The per-call evidence is *"Funded track record in this area"* —
  never "behind this call" / "the projects this call funded". Do **not** switch panels to `FUNDED_UNDER`
  (blanks every open call); the subject-area `HAS_FUNDED_PROJECT` edge is correct by design.
- **Unified filter (ADR-0007).** Any new visibility/filter writer goes through the constraint store —
  no sixth Cytoscape layer. Binding on new work now; retrofit of old layers is OUT this phase.
- **"Intelligence" is gated on ingest (CLAUDE.md §Category).** The word does not appear in user-facing
  copy until Step 2 has populated the Awarded half.

---

## Step 1 — Honesty quick-wins  *(independent · do first)*

**Goal:** clear the small honesty debts that don't depend on data, so the demo surface is trustworthy.
**Governs:** ADR-0006 #2/#5, UX-DECISIONS Q5.1/Q6.4.
**Build:**
- Remove the deferred HE-Wiki "Min Similarity" slider — `.scratch/adr-conformance/0001`.
- Reword the "total committed … on offer" tour copy — `.scratch/adr-conformance/0002`.
- Audit the current (post-redesign) UI for any still-inert control flagged in `FRONTEND_UX_REVIEW.md`
  (Committed/Spot/Forecast tabs, no-op Bookmark). Remove until real. (Some may already be fixed — the
  KPI card already reads "Planned (on offer)"; confirm the rest.)

**Acceptance:** no user action blanks the graph or triggers a no-op; grep shows no `odds`/`success rate`
strings and no advertised-money-labelled-"committed" display copy.
**Depends on:** nothing. **Parallel:** yes.

---

## Step 2 — CORDIS go-live (the ingest)  ★ critical path

**Goal:** populate the Awarded half so A2/B2/B5 render real evidence; un-gate "intelligence".
**Governs:** CLAUDE.md §Current phase, ADR-0003 (server-side ingest, single graph), ADR-0004 (curated
queries only), `CORDIS_PLANS/13` (Railway seed), UX-DECISIONS Q4.2/Q6.5 #1.
**Build:**
1. **Pre-flight:** confirm a curated `curated_queries/<source>.json` exists for every source to be
   tagged. The tagger now refuses raw-subject fallback (ADR-0004, fixed this session); add its guard
   test — `.scratch/cordis-ingest/0002`.
2. **Ingest per source:** run the backend job — create extraction → poll → download → parse → MERGE into
   Neo4j; `tag_calls` writes the subject-area `HAS_FUNDED_PROJECT` links (A1 tags + A2 evidence in one
   fetch).
3. **Dump** the populated graph; **seed the Railway Neo4j** (`CORDIS_PLANS/13`), env-var cutover.
4. **Invalidate** `cordis_cache` after the write (the route already does this in `finally`).
5. **Verify** A2 (`/call-evidence`), B2 (`/area-organisations`), B5 (`/field-tree`,`/field-calls`)
   return real data in the running app.

**Acceptance:** on a real call, the evidence endpoints return non-empty results; B5 field explorer lists
projects + calls; no source was tagged by raw subject (guard held).
**Depends on:** curated query files + Step 1's guard test (recommended). **Parallel:** start immediately;
it's mostly backend/ops and gates the rest.

---

## Step 3 — Evidence band on call / area detail

**Goal:** the flip made real — the signature interaction (Q2.3/Q2.4) on every call.
**Governs:** ADR-0001, UX-DECISIONS Q5.2 #1 / Q5.3 / Q5.4 / Q6.5 #2.
**Build:** complete the existing `CordisBand` to spec — **always present** on a call/area, titled
**"Funded track record in this area,"** collapsed to a **one-line summary** ("12 funded projects · €48M ·
top country DE"), expanding on demand; **honest empty state pre-ingest** ("no CORDIS data ingested for
this area yet"), never blank. "CORDIS" appears only as **"Source: EU CORDIS"**. Panels shown: A2
(funded projects + euros) and B2 (organisations).
**Acceptance:** the band renders on every call in both states (empty pre-ingest, populated post-ingest);
wording matches ADR-0001 ("in this area"); one tap from the call reveals it (the four-beat demo, beat 2).
**Depends on:** Step 2 for the *populated* state (buildable in parallel using the empty state). **Parallel:** yes.

---

## Step 4 — Advertised/Awarded money badges + KPI

**Goal:** make the two-halves idea readable at a glance; finish the honesty labelling.
**Governs:** ADR-0006 #5, UX-DECISIONS Q6.2, CLAUDE.md §Product (two halves).
**Build:**
- **No global mode toggle** (that's a two-mode IA — rejected). Instead, **every money figure carries a
  badge**: **"Indicative · on offer"** (Advertised) vs **"Awarded · CORDIS"** (Awarded).
- KPI: keep/align the Advertised card to the sanctioned wording ("Planned / Indicative — on offer",
  never "committed"); add a separate **"Awarded to date (CORDIS)"** KPI that appears **only post-ingest**,
  clearly sourced.
**Acceptance:** no money figure is ambiguous about which half it belongs to; the Awarded KPI is absent
pre-ingest and present + sourced post-ingest.
**Depends on:** Advertised badges — none (parallel); Awarded badge/KPI — Step 2. **Parallel:** yes.

---

## Step 5 — Home v1 (orientation + monitoring-lite)

**Goal:** turn the landing from a raw graph into the product's thesis; walk a first-timer into the demo.
**Governs:** UX-DECISIONS Q6.3 (v1) / Q5.2 #2 / Q6.5 #3, CLAUDE.md §Core job (monitoring trigger).
**Build:** on the existing landing surface (graph route already hosts the dashboard panel — no new route):
- the **one-liner** stated; **"Find open calls"** as the primary path;
- a **"Funding landscape"** entry (Q5.2) teased with **one live example** straight from the demo script;
- a global **"Closing soon"** list computed from loaded call deadlines — real monitoring value, **zero
  user state**;
- the right rail's **3 CORDIS glyphs collapse to one labelled "Funded landscape" shortcut** to the
  home's landscape section.
**Acceptance:** first run presents the one-liner + the four-beat path; "Closing soon" is populated from
real deadlines; rail shows one labelled shortcut, not three glyphs. (v2 personalised feed/watch is OUT.)
**Depends on:** the live example needs Step 2; the shell + "Closing soon" + rail are parallel. **Parallel:** partly.

---

## Step 6 — Call-level compare (the one scope add)

**Goal:** the deliberation payoff — shortlisted calls side by side with their evidence.
**Governs:** CLAUDE.md §Core features, UX-DECISIONS Q4.3 / Q6.5 #5, ADR-0007.
**Build:** extend compare to call-level: shortlisted calls with deadline/budget **+ their A2 evidence**.
Implementation pointers (from UX-DECISIONS): the compare-mode intercept currently excludes calls
(`setupEvents.js`, `t !== "call"`); `useCompareData` computes *structure* metrics, so call rows need
their **own metric set**. Structure-level compare stays as-is. Must write to the **ADR-0007 constraint
store — no sixth layer**.
**Acceptance:** two+ shortlisted calls compare side by side with deadline/budget + funded-track-record
evidence; adds no new Cytoscape visibility layer; structure compare unchanged.
**Depends on:** Step 2 (consumes evidence) + Step 3 (evidence surface) + the constraint store. **Parallel:** last.

---

## Phase Definition of Done

1. **The four-beat demo runs end-to-end on real data** (Q2.4): Cluster → Call (deadline + portal link)
   → flip → "Funded track record in this area" (N projects · €X) → B2 organisations.
2. **Honesty invariants hold:** money badges everywhere, honest empty states, no inert controls,
   ADR-0001 "in this area" wording, source attribution on CORDIS figures.
3. **Home v1** walks a first-timer into that demo.
4. **"Intelligence" is un-gated** — the Awarded half is populated, so the positioning may now appear in
   user-facing copy (CLAUDE.md §Category).

---

## Out of scope (Q6.5 OUT — do NOT pull in)

Unified-filter retrofit of the existing ~5 layers · home v2 (fields feed + shortlist + real watch
mechanism) · second-wave CORDIS surfacing (A6 trend, B3 related, B4 country, B6 hop-on) + A4 revival ·
deep links / command palette · brand wording (the rename). Each is a later phase.
