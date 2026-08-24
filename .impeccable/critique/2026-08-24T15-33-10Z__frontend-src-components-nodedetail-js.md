---
target: frontend/src/components/NodeDetail.js
total_score: 21
max_score: 40
na_heuristics: 
p0_count: 1
p1_count: 3
timestamp: 2026-08-24T15-33-10Z
slug: frontend-src-components-nodedetail-js
---
Method: dual-agent (A: design review, isolated · B: detector + deterministic evidence, isolated). Detector: 3 clean scans. Browser: skipped — CRA dev server not running (FastAPI backend up on :8000, nothing on :3000); user-supplied dark-mode screenshot substituted for the top ~940px.

## Design Health Score

| # | Heuristic | Score | Key Issue |
|---|-----------|-------|-----------|
| 1 | Visibility of System Status | 2 | Band summary resolves from "Checking the funded track record…" to "524 funded projects · €2.1B awarded" inside a plain div with no `aria-live`; whole-page load is a bare `CircularProgress` with no title or context (`NodeDetail.js:1176`). |
| 2 | Match System / Real World | 3 | Domain vocabulary is excellent ("Indicative budget on offer", en-GB day-month dates). Undercut by `Node ID:` (`:1232`), `"Untitled node"` (`:964`), and Title-Cased raw DB columns as section headings (`formatLabel`, `:344`). |
| 3 | User Control and Freedom | 2 | Bookmark cannot be undone here (a remove affordance exists elsewhere: `.bm-card__action-btn--remove`); no expand-all across 30 sections; `navigate("/", {replace:true})` (`:948`) erases the call from history so browser Back can't return to it. |
| 4 | Consistency and Standards | 2 | `€35.0M` (header) vs `35,000,000 €` (Key information) for the same figure; `—` and `"Not stated"` for the same condition in one grid; advertised and awarded euros share the identical `.nd-metric`. |
| 5 | Error Prevention | 3 | Genuinely strong: `computeIndicativeNumberOfProjects` refuses to extrapolate (`:374`); inert chips demote to `span` (`:1447`); `expandable = hasEvidence`. Loses a point — a closed call still leads with a live-looking primary CTA. |
| 6 | Recognition Rather Than Recall | 1 | ~30 collapsed sections with zero content preview, no index, no read-state. `{open && …}` (`:494`) unmounts collapsed bodies, so browser find-in-page returns nothing for "TRL", "consortium", "third country". |
| 7 | Flexibility and Efficiency | 1 | No expand-all, no jump nav, no copy button on the topic ID (the one string pasted into the portal), no print/export for the advice memo being written, Ctrl+F dead. |
| 8 | Aesthetic and Minimalist Design | 2 | The header is confident and minimal. Then every text field the record holds renders, the band restates its scope qualifier three times and its summary twice, and Key information duplicates header figures in a second format. |
| 9 | Error Recovery | 2 | The error string is well-worded and correctly distinguished from pre-ingest (`CordisBand.jsx:53`), but an errored band is non-expandable with no retry; only recovery is a full reload. |
| 10 | Help and Documentation | 3 | `MoneyBadge` tooltips and the caveat/provenance lines are real in-context help — but `title`-attribute only (no keyboard, no touch), and IA/RIA/CSA are never expanded. |
| **Total** | | **21/40** | **Acceptable — significant improvements needed** |

All ten heuristics apply (Operate surface); none scored n/a.

## Design Specificity Verdict

**Authored above the fold; interchangeable below it. The seam is visible at y≈640 in the screenshot.**

**LLM assessment.** `CallDecisionHeader` (`:730–899`) is not a generic hero — the On offer / Timeline split, blue-keyed against the green-keyed evidence band directly beneath, is the Two-Halves Rule rendered as layout. `describeCallTiming` (`:642`) turning a date into "Closes in 12 days · 15 Apr 2026" is the product's core job compiled into one function: not a date, a remaining budget of time. The mono topic ID is the Mono-Means-Data rule applied to the exact string the advisor pastes into the F&T portal. No template ships this.

From `Key information` down, it is a database dump in a design system's clothing. The 2×2 icon-label-value grid is a CRM record card. The ~30-section collapsible stack is the most generic possible rendering of "we have N text fields" — nothing in it knows that "Award Criteria / Thresholds" is what the advisor came for and "Proposal Page Limits" is not. The `Connections` card computes the semantic kind of each link (`NodeConnections.js:341`) and the `bare` branch — the only branch this page uses — discards it; six of its class names have no CSS anywhere in `frontend/src/styles`. The `he_entity` and `destination` variants are that generic template with the product actively removed.

**Deterministic scan.** `detect.mjs` returned exit 0 with zero findings on all three targets (`NodeDetail.js`, `CordisEvidence/`, `NodeDetalParts/`). That is meaningful, not empty: pattern-level design-system compliance is genuinely clean here. Every problem below is compositional or architectural — the kind no detector catches. Deterministic sweep facts: `nodedetails.scss` is 1413 lines with 84 live hard-coded hex values and 156 `!important` declarations; `NodeDetail.js` is 1682 lines. Breakpoint compliance is **full** — every viewport query goes through the `respond-below` mixins, zero raw px. `--nd-text-faint` (`:1111`) is never defined in either mode and works only via its inline fallback. `--primary-rgb` resolves to the retired Vision-UI purple `117, 81, 255` in dark mode; I verified both call sites are hover states on controls this page does not use (`.MuiButton-outlined:hover`, `.bm-card__action-btn:hover`), so no purple renders here today — but the banned accent is live in the stylesheet that owns this surface, alongside `--nd-chip-blue-1/-2` (`#8b6cff`/`#6a3df0`) whose light-mode counterparts are blue, so the two modes disagree about what those tokens mean.

**Visual overlays.** None. No reliable user-visible overlay is available — the CRA dev server was not running and I did not start the app stack. Fallback signal is the CLI scan plus the supplied screenshot.

## Overall Impression

The first 640px is a purpose-built instrument that answers "is this worth committing to" before any scrolling, and the honesty contract is mechanized in code rather than merely intended — a genuinely high bar. Then the page spends 4000px undoing that impression with an undifferentiated stack of collapsed text that the browser's own find-in-page cannot search. The single biggest opportunity is already half-built: `baseTextFieldConfig` is authored in four semantic groups (narrative / eligibility / process / rules, separated by blank lines at `:241, :252, :261, :268`) and the render at `:1637` flattens all four into one run. The advisor's mental model exists in your data and is erased by your view.

## What's Working

**1. The decision header is ranked, not merely populated.** Five distinct typographic levels, one primary action, urgency carried by both the sentence and the amber so color is never load-bearing. The code proves it was earned: comments record that the primary action previously landed at 82% page depth at 1024px, and the halves deliberately stay side-by-side down to `$bp-md` rather than stacking at `$bp-lg` because stacking pushed the CTA ~140px further down. That is a designer measuring a real failure and fixing the cause.

**2. The honesty contract is enforced, not aspirational.** Four independent mechanisms, each with reasoning committed: `MONEY_BADGE` as a single exported constant so wording can't be hand-typed; `computeIndicativeNumberOfProjects` (`:374`) deleting a formerly-extrapolated figure with the ADR cited; `fieldsAreNavigable` (`:1447`) demoting research-field chips to plain spans when nothing is wired, so the most CTA-shaped object on the page stops lying; `expandable = hasEvidence` refusing to offer a toggle over nothing. These work because they make the dishonest state unreachable rather than discouraged.

**3. `normalizeDeadlines` (`:441`) — invisible correctness on the highest-stakes field.** Two encodings of the same day rendered twice, which on a two-stage call is a false signal about the submission model, not a cosmetic repeat. Keyed on the calendar day. This is the discipline the whole "defensible evidence" positioning rests on, applied where nobody would have noticed it missing.

## Priority Issues

### [P0] Advertised and Awarded euros render in the identical `.nd-metric` component
**What.** Verified: `Key information` renders "Indicative budget on offer = 35,000,000 €" in a `.nd-metric` tile (`NodeDetail.js:1561`). The evidence band renders "Total EU contribution = €2.1B" in a `.nd-metric` tile inside a `.nd-metrics-grid` (`CordisEvidencePanel.jsx:64–72`) with **no MoneyBadge on the tile at all**. Same class, same 20px/700 value, same radius. The green `AWARDED · CORDIS` pill lives in the band header, ~160px and four text blocks away. The only remaining differentiator is a green border on the outer card, plus scroll position.

**Why it matters.** This is the one rule the product's credibility rests on (Principle 4, the Two-Halves Rule, ADR-0006 §5). The advisor is building an advice memo. If she screenshots or copies the €2.1B tile, the badge is not in the crop, and an awarded figure walks into a PI briefing wearing no half at all. Two euro figures that mean opposite things must never be able to share a component.

**Fix.** Badge the *figure*, not the group, wherever the figure can be extracted from its group: `MoneyBadge kind="awarded" size="sm"` onto the `.nd-metric-label` in `CordisEvidencePanel.jsx:70`, `kind="advertised"` onto the three euro tiles at `:1546/:1554/:1564`. Fork the component into `.nd-metric--awarded` / `.nd-metric--advertised` with tint and left hairline keyed to the half. Unify the formatter — keep `formatBudget`'s leading-symbol form, delete the trailing-€ branch in `formatValue` (`:351–356`).

**Suggested command:** `/impeccable harden`

### [P1] The mobile `defaultOpen` logic is inverted
**What.** Verified at `:1643–1647`. Desktop opens the 3 most important sections. Mobile (`< $bp-md` = 900px, i.e. tablet portrait and every phone) opens **everything except** those, plus excludes `scope`. The stray `"scope"` present in the mobile list but absent from the desktop list is the fingerprint of a copy-paste negation.

**Why it matters.** On the narrowest, most scroll-expensive viewport, the advisor gets Description, Objective, Expected Outcome and Scope collapsed while Legal and Financial Setup, Proposal Page Limits and ~23 others are expanded. It mints the worst-case page: 27 expanded prose sections in one column.

**Fix.** One shared open-set constant used at both breakpoints. If a narrower mobile default is wanted, drop a section from the set — don't negate it.

**Suggested command:** `/impeccable adapt`

### [P1] Thirty flat sections: no grouping, no index, no preview, not searchable
**What.** `:1637` flattens the four authored groups into one run. No section index, no expand-all, no preview. `{open && …}` (`:494`) unmounts 27 of 30 bodies, so Ctrl+F finds nothing. Meanwhile `.nd-grid` (`minmax(0,1.65fr) minmax(300px,0.72fr)`, `align-items: start`) leaves the right ~380px column empty for the page's entire height beside that stack — visible in the screenshot, where Connections ends around y=800 and the column is dead from there down.

**Why it matters.** Her real task is "find the four paragraphs that decide whether we can apply." Six sections decide that — Admissibility, Eligibility Conditions, Eligible Countries, Other Eligibility, Conditions for Participation, Financial & Operational Capacity — and they sit collapsed, unmarked and unfindable among 30 identical shells. The official portal at least lets you Ctrl+F. This is what turns a differentiated product into a worse-than-PDF experience.

**Fix.** Tag and render the four source groups with a heading each. Put a sticky section index in the empty sidebar column, with a "not stated" state so hidden is distinguishable from missing. Add Expand all / Collapse all. Keep collapsed bodies mounted with `hidden` instead of unmounting so find-in-page works. Note the section count is unbounded, not 30 — `getDynamicDescriptionSectionConfig` (`:297`) appends any advertised key and Title-Cases the raw DB column as its heading.

**Suggested command:** `/impeccable layout`

### [P1] Closed and forthcoming calls get the open-call layout unchanged
**What.** The screenshot is a closed call. It still leads with the full blue `Official call page` primary CTA carrying the surface's one sanctioned accent shadow, a prominent `On offer · €35.0M` panel with an `INDICATIVE · ON OFFER` badge, and "EU contribution per project: Up to €5.0M". Nothing in `CallDecisionHeader` reads `statusKey` except `StatusPill`.

**Why it matters.** For a closed call the advertised half is history and the CTA leads somewhere she cannot act — the top third of the page is optimised for a decision no longer available. What she needs is the other half: who won this, is there a successor topic. Because CORDIS evidence is thematic (ADR-0001), it is equally valid whether the call is open or closed — so the closed call is exactly where the band is most valuable, and it is ranked below the header and left collapsed.

**Fix.** Branch the header on `statusKey`. Closed: demote the CTA to secondary and relabel ("View the archived topic page"), render the On offer half past-tense and de-emphasised ("Was on offer"), auto-expand the evidence band since it is now the page's primary content. Forthcoming: keep the CTA primary, relabel to "Preview on the official portal" — there is nothing to submit yet.

**Suggested command:** `/impeccable shape`

### [P2] The `he_entity` and `destination` variants are orphaned, not degraded
**What.** Confirmed independently by both assessments. The `he_entity` branch's first heading is an `h4` (`:1219`) with no h1/h2/h3 above it, then `CollapsibleSection` emits an `h2` beneath it — the outline runs h4 → h2. The `destination` branch emits one h1 and then no headings at all. The identical label "Connections" is a real `h2` in the call branch (`:1663`) but a plain `p` in both others (`:1270`, `:1393`) — same classes, different semantics. `:1209` hardcodes `nd-chip--status-open` (green) for any `he_entity` status, so a closed entity renders green, while `.nd-chip--status-closed` and `--forthcoming` exist in the stylesheet and are never used by any code path. `Node ID:` (`:1232`) is the file's one user-visible mechanism-word violation — detector-confirmed as the only JSX text hit for graph/node/edge in the entire file. A destination with no summary renders a title and a single em-dash.

**Why it matters.** A destination is a first-class target in the Pillar → Programme → Destination → Call drill-down; landing on one and getting an em-dash is a dead end in the product's own core workflow. And the accessibility work invested in the call variant doesn't transfer, so a screen-reader user's experience is a function of which node kind they happened to open.

**Fix.** Extract a `DetailCard({ title, children })` that always emits `component="h2"` and use it in all three variants — that closes the outline problem at the source. h1 for the top title everywhere. Map `statusKey` to the correct status class or delete the two dead ones and the chip. Delete the `Node ID` line and "Untitled node". Give `destination` its calls list and the evidence band — it has a subject area, which is the whole premise — or stop routing to it.

**Suggested command:** `/impeccable harden`

## Persona Red Flags

**Alex (impatient power user).** Ctrl+F is broken — 27 of 30 section bodies aren't in the DOM. No expand-all; reading the whole call is 27 individual clicks. The topic ID is styled as a mono readout precisely because it's the string he pastes into the portal, and it's a bare span with no copy affordance. `onClick={toggle}` sits on the whole band header (`CordisBand.jsx:88`), so double-clicking to select €2.1B for a paste collapses the panel under him. `navigate("/", {replace:true})` erases the call from history, so browser Back can't return to it. Two formats of the same number (`€35.0M` / `35,000,000 €`) make him stop and check whether they're actually the same figure.

**Sam (keyboard + screen reader).** Heading outline is h4 → h2 on `he_entity` with no h1; `destination` has an h1 and then nothing. The band's key figure updates asynchronously with no `aria-live` — the one decision-critical value on the page changes silently. `aria-pressed` (`:887`) announces a toggle that cannot be un-pressed: a false affordance exposed only to AT users. The band header is a div with `onClick`, no `role`, no `tabIndex` (verified — the Hide button is a correct keyboard fallback, but the pointer cursor lies); note the detector's clean "no unkeyboarded click targets" result covers `NodeDetail.js` only, not `CordisBand`. ~30 identical tab stops between the CTA and Connections with no skip mechanism, and `<aside className="nd-sidebar">` is a `complementary` landmark with no accessible name. One color-only meaning: hardcoded green status on `he_entity` — by contrast the call-path StatusPill is exemplary (word + dot shape + color). Help is `title`-attribute only, unreachable by keyboard and touch.

**The research-office grant advisor (project persona).** A closed call presents her with a live blue CTA and a €35.0M "on offer" panel while she's triaging for a successor topic. The evidence tile she'll paste into a PI briefing carries no half-badge. Her most quotable line — "524 funded projects · €2.1B awarded · top country DE" — is `nowrap` + ellipsis (`_cordis-band.scss:23–25`), so at tablet width she loses "top country DE" and at narrower widths the € figure itself. Eligibility is buried across six unmarked sections. `Connections` shows an unqualified blue link on a page whose entire structural claim over the flat portal is "here is where this sits." And there is no output: no print stylesheet, no export, no add-to-comparison, and a write-only bookmark — while a remove affordance for bookmarks already exists elsewhere in the codebase.

## Minor Observations

- **Measure is unguarded where it matters.** `.nd-callhead__title` got `max-width: 45ch` with a comment; `.nd-paragraph` got nothing — ~118 characters per line at 1360px across thirty sections of body copy. `white-space: pre-wrap` on PDF-derived text also reproduces the source PDF's hard wraps inside that over-wide column.
- **Expanding the band restates its own summary as its first content** — "FUNDED PROJECTS 524 / TOTAL EU CONTRIBUTION €2.1B" is what the collapsed line already said. The first 150px of the reward for clicking pays nothing.
- **Three disclaimers in one card.** The scope qualifier appears at `:114`, again at `:140`, and again in the provenance footer. By the third restatement she stops reading disclaimers — which is the opposite of the intent, and that provenance line is exactly what makes the number defensible when a PI pushes back.
- **`Key information` sits below the evidence band**, so the money-on-offer facts are separated from their own header by the entire competing half.
- **All four metric tiles render unconditionally** (`:1545–1578`) — a call with no budget data shows a 2×2 grid of em-dashes directly beneath a header that already said so, and mixes `—` with `"Not stated"` for the same condition in the same card.
- **~150 lines of dead CSS**: `.nd-primary-button--official` declared twice with conflicting gradients (the second uses `transition: all` plus a hover box-shadow change, violating Tint-Not-Lift), `.nd-secondary-button--bookmark`, the whole `.nd-timeline-*` family, `.nd-chip--status-closed/-forthcoming`, `.nd-actions`, `.nd-card-action`. The stylesheet wasn't swept after the header refactor its own comment documents. Six `.nd-connection-*` classes have no CSS at all — `<span className="nd-connection-dot" />` renders as nothing.
- **Off-system values**: card radius 18px against DESIGN.md's 12/14px; spacing at 18/22/26/30/34px against the documented 4/8/12/16/24 rhythm; type sizes 11.5px and 12.5px invented alongside the sanctioned 13.5/10.5.
- **Latent focus bug**: `nodedetails.scss:747–751` sets `border-radius` on the focused element inside the `:focus-visible` rule, currently masked because every control declares its radius with `!important`.
- `bookmarkNote` is never cleared — "Bookmarked." persists for the rest of the session; `.nd-callhead__announce` reserves layout space permanently via `min-height: 1em`.
- **Three stacked location indicators** in one viewport: the CommandBar breadcrumb (two levels truncated), the Back bar, and the header trail — and the breadcrumb and trail disagree about depth. The CommandBar also reads "EU Knowledge Graph" and "LEVEL 5", both mechanism words, both user-facing. Outside this file, but same screen; worth routing to whoever owns `CommandBar`.
- The `Funded projects` tab already contains "Top organisations" and "Top countries", which is most of what the `Organisations` tab promises — the two-tab split isn't a clean cut. The band's internal `.cordis-ev__section-label`s are divs, not headings, inside a component whose outer shell is carefully `component="section" aria-labelledby`.

## Questions to Consider

1. **The header answers "is this worth it" in 640px. What are the other 4000px for?** If the decision is made above the fold, everything below is reference material for a task this page doesn't otherwise support — writing the proposal. Should the section stack become `/call/:id/full-text`, leaving this as a pure decision surface with one link to the text?
2. **Why is there a bookmark and no verdict-free "I've decided"?** ADR-0002 #3 forbids the CRM form of pipeline/status. Does it forbid letting the advisor record her own judgement with a note — or only the system recording one for her? A write-only bookmark is the weakest possible expression of the page's reason to exist.
3. **Three disclaimers is not three times the honesty.** Would one qualifier at 13px beat three at 12/12/10.5px, and at what point does restating scope start training her to skip provenance?
4. **What is the band's expansion actually for**, if the collapsed line already carries count · euros · top country? Should the first thing revealed be the framework-programme trend or the org list — the parts that are genuinely new?
5. **Is a `.nd-metric` that can carry either money half a design-system asset or a liability**, given that the product's credibility depends on those two never being confusable? Should the token system make an unbadged euro figure literally unrenderable?
6. **`Connections` computes the semantic kind of every link and discards it.** Is that card a leftover from the graph-explorer era that the programme trail already replaced — same fact, better framed, already in the header?
