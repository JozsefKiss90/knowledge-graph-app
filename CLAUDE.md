# CLAUDE.md

## Product

**What it is.** A map of European research funding that shows, side by side, the money currently
**on offer** (Horizon Europe calls) and the money **already awarded** (real CORDIS-funded projects) —
so you can find the right open call and instantly see who has actually been funded to do this work.

**Category.** European research-funding intelligence. Here "intelligence" means *evidence that makes
you smarter about EU funding* — structure, real track record, decision support — **not** an
adjudicator: it surfaces, ranks by grounded relevance, and cites the evidence, but never issues a
verdict (no eligibility ruling, no winnability score, no single "pick this one"). Ranking ≠ verdict;
the grounded assistant may recommend and cite, it just doesn't rule. Lead with the outcome (funding
intelligence), not the mechanism (a knowledge graph — that stays the internal codename). The user-facing "intelligence" claim is **gated on ingest**: don't wear the word in the UI
until the CORDIS evidence half is actually populated.

**Core job.** Decide where to spend scarce proposal effort — with evidence. A Horizon proposal is
months of work, so the progress the user wants isn't "find a call," it's "commit my effort to the
right one and not burn a season on a doomed bid." The evidence half equips that decision; it does not
make it (per the gloss above). **Trigger ≠ job:** the recurring Tuesday pull is *"something changed in
my field — what's fundable now?"* (monitoring); the rare payoff is *"is this one worth committing
to?"* (deliberation). Same job, two stages. Monitoring is the retention engine that earns the return
between rare decisions — so the home optimises for the trigger (what's new/closing in your fields +
your shortlist) while keeping the evidence one hop from every item. See Q6.3 (home/onboarding).

**Who it's for.** Primary: the **research-office professional** (grant advisor / research manager) at
a university or research organisation, plus the ambitious **PI** they support. Planned to also serve
research managers and faculty. All sit on the research-performing-organisation side and differ only by
portfolio breadth (manager = widest, advisor = portfolio-of-PIs, faculty/PI = single topic), so
optimising the home for the advisor's "what's new/closing in my fields" lens serves the others as a
zoom-out or a filter. Trigger: a new work programme dropped / a deadline's coming / a PI asked what's
fundable in X. See CONTEXT.md and ADR-0001.

**What it is NOT.** (1) Not a proposal-writing/submission tool (points to the official portal, never
impersonates it). (2) Not a publications/citation graph (funding, not scholarship — the #1 creep-guard
given the "knowledge graph" codename). (3) Not a grants-alert CRM (shortlist/watch + "what changed"
yes; pipeline/status/reminders no). (4) Not an adjudicator (surface/rank/cite yes; eligibility or
winnability verdicts, or a single "pick this one", no). See ADR-0002.

**Problem — pain 1 (relevance).** *"I can't tell which of hundreds of calls matter for my field, and
I don't have time to read them all."* The wedge is **relevance-within-structure**: the official portal
has search, but it's flat, so a hit is just a hit; here a hit sits on the work-programme structure
("here are your 5, and they cluster in this Destination") — relevance *plus the shape of the
opportunity*. Structure (the shipped drill-down) is the moat **under** relevance, not the headline.

**Problem — pain 2 (worth-it).** *"Even once I've found a fitting call, I can't tell if it's worth
committing to."* The Awarded half converts a leap of faith into a **calibrated bet**. "Worth it"
decomposes into four unknowns collapsed onto **two evidence surfaces**: **funded projects + awarded
euros** (A2) answers *is there real money here* (existence) and *how much / how many win* (scale) —
two reads of the same euros; **organisations** (B2) answers *who wins this* (diagnostic) and *who could
I partner with* (directory) — the same org list seen two ways. **Momentum** (A6 trend FP7→H2020→HE) is
a real "worth it" read but rides as *supporting*, not headline. Honesty: CORDIS has awards, not
applications — so the app shows who won and how much, never a funded-rate or odds (consequence of
ADR-0002 #4).

**Launch surface (evidence half).** Every CORDIS sub-feature is built and offline-verified, so launch
is **curation, not construction**. The evidence half headlines with its two surfaces — the
funded-projects panel (A2) and the organisations/partner view (B2) — and **B5**, the EuroSciVoc
research-field explorer, ships at launch billed as the **field-first way in** (the monitoring lens of
pain 1), never as a third evidence surface. Second wave — built, deliberately staged to keep first-run
uncluttered: A6 funding trend, B3 related calls, B4 country overlay, B6 hop-on.

**Alternatives (the competitive frame).** What the primary user uses today: (1) the **official EU
Funding & Tenders portal** — authoritative on offers, flat; where every application ends up anyway (we
link out, never impersonate — ADR-0002 #1); (2) **raw CORDIS** dashboards — the awards evidence,
disconnected from open calls; (3) the advisor's **homegrown apparatus** — Excel watchlist +
NCP/newsletter digests + forwarded emails — the actual Tuesday incumbent our monitoring home must
beat; (4) **generic grant-alert databases** — breadth across many funders, no Horizon structure, no
track record. External consultancies are a PI/SME-side pressure, not a frame-definer (the advisor
partly IS the in-house consultant).

**Edge (unfair advantage).** We make the **join** the official sources keep apart — the calls open
now and the funded track record behind them — in one place, linked by **curated subject-area tagging**
and governed by an **honesty contract** (real awarded euros only, honest empty states, counts never
dressed as impact, no verdicts — ADR-0006, ADR-0002 #4). The sources are
public, so the moat is **not data exclusivity**: it is the join, the accumulated curation that makes
it trustworthy, and the trust discipline on top. User-facing wording stays mechanism-free ("in one
place," never "in one graph").

**Positioning statement.** *"For research-office professionals and the PIs they support, who must
decide where to spend scarce proposal effort, [App] is European research-funding intelligence that
shows open calls and the real funded track record behind them in one place — unlike the official
sources, which keep those two halves apart."* ("[App]" = user-facing name, deferred to the brand
phase; see brand constraints below.)

**Brand constraints (wording deferred).** Decided: the product **will be renamed** for users;
"knowledge-graph-app" stays the repo/internal codename. The eventual name/tagline must carry (a) the
**domain** — European research funding — and (b) the **join promise** — what's on offer ↔ who's
really funded. Tone: trustworthy, official-adjacent, **never impersonating the EU**. "Map/navigate"
is optional imagery (the one-liner's metaphor); mechanism words ("graph") are banned user-facing.
Only the wording itself remains for the brand phase.

**Current phase (as of 2026-07).** **Light up CORDIS** is the phase headline: run the ingest locally →
dump → seed the Railway Neo4j (`CORDIS_PLANS/13`) → surface A2/B2/B5. UX work this phase is
subordinated to what the 30-second demo needs (evidence band, honest empty states, truthful KPI
labels); the deeper UX spine (unified filter model) is scoped separately. Rationale: every CORDIS
feature is built and offline-verified but renders nothing — one ingest lights up all of them and
un-gates the "intelligence" claim. A phase with two headlines has none.

**Core features & buckets.** **Core 1 (entry): find open calls fast** — the Pillar → Programme →
Destination → Call drill-down, search, call detail. **Core 2 (differentiator): the funding
landscape** — the evidence surfaces (A2, B2) with B5 as the field-first way in. **One workflow, not
two modes**: evidence is a reveal *on* calls/areas (ADR-0001); there is no top-level "CORDIS"
section. Supporting: the **dashboard re-cast as the monitoring home/hub** (what's new/closing in your
fields + shortlist; hosts B5; its inert tabs die until A4 revives them honestly), the **assistant as
grounded interface** (cites + acts on the graph; never a third core — ADR-0005), **compare**
(structure-level today; **call-level compare is this phase's one UX scope add** — shortlisted calls
side by side with their evidence, sequenced after ingest), and the **timeline** (a Core-1 filter;
must join the unified filter model). Deferred: HE-Wiki / CROSS_TOPIC_SIMILARITY features — that data
isn't in the loaded graph, B3's real EuroSciVoc relatedness likely supersedes it, and dependent dead
controls (Min-Similarity slider) are removed, not advertised.

<!-- Filled progressively by the product-vision grilling session (.scratch/product-vision/). -->

## Agent skills

### Issue tracker

Issues and PRDs are tracked as local markdown files under `.scratch/<feature>/` (no external tracker; external PRs are not a triage surface). See `docs/agents/issue-tracker.md`.

### Triage labels

Uses the five canonical triage roles with default names (`needs-triage`, `needs-info`, `ready-for-agent`, `ready-for-human`, `wontfix`). See `docs/agents/triage-labels.md`.

### Domain docs

Single-context layout — one `CONTEXT.md` + `docs/adr/` at the repo root. See `docs/agents/domain.md`.
