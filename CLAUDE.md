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

<!-- Filled progressively by the product-vision grilling session (.scratch/product-vision/). -->

## Agent skills

### Issue tracker

Issues and PRDs are tracked as local markdown files under `.scratch/<feature>/` (no external tracker; external PRs are not a triage surface). See `docs/agents/issue-tracker.md`.

### Triage labels

Uses the five canonical triage roles with default names (`needs-triage`, `needs-info`, `ready-for-agent`, `ready-for-human`, `wontfix`). See `docs/agents/triage-labels.md`.

### Domain docs

Single-context layout — one `CONTEXT.md` + `docs/adr/` at the repo root. See `docs/agents/domain.md`.
