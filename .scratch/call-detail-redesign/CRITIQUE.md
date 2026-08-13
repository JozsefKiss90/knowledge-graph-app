# Call-detail decision surface — Impeccable critique + information hierarchy

Method: dual-agent (Assessment A = design review, Assessment B = detector + browser evidence), run
isolated and synthesised here. Representative record `HORIZON-CL2-2026-01-HERITAGE-02` (open, closes
2026-09-23, €5–6M per project / €12M indicative, 668 funded projects / €2.0B awarded in the area).
Honest-empty record `HORIZON-CL6-2026-04-GOVERNANCE-01`. Viewports 1440×900 and 1024×768. Date in
environment: 2026-08-13.

## Design health

| # | Heuristic | Score | Key issue |
|---|-----------|-------|-----------|
| 1 | Visibility of system status | 2 | Status chip present; **no time-to-deadline** — the one status that decides the job |
| 2 | Match system / real world | 2 | "Back to **Graph**" + tab title carry the banned mechanism word; "no CORDIS data **ingested**" leaks pipeline jargon; "Source: Cluster 2" collides with "Source: EU CORDIS" |
| 3 | User control and freedom | 3 | Native `alert()` on bookmark; no un-bookmark, no saved state on return |
| 4 | Consistency and standards | 1 | Purple CTA rule (`!important`) overrides an already-written blue rule; band's active tab computes `rgb(117,81,255)`; two different sentences for the same empty fact; hand-typed breakpoints |
| 5 | Error prevention | 2 | The unqualified "668 projects · €2.0B" ships above the fold; its "in this area" caveat ships collapsed 600px below. Duplicate deadline row renders the same date twice |
| 6 | Recognition rather than recall | 1 | **Programme/Destination context absent from the whole first screen**; destination appears once, truncated, in a sidebar card called "Connections" |
| 7 | Flexibility and efficiency | 1 | 11 identical "SHOW" toggles; at 1024×768 the primary CTA sits at y=2448 of 2984 (82% depth) |
| 8 | Aesthetic and minimalist | 1 | Status ×2, action-type ×3, deadline ×3, CORDIS summary ×2 within 500px; six inert purple pills own the top of the page |
| 9 | Error recovery | 3 | Fetch-failure copy correctly distinct from pre-ingest copy; expansion suppressed when nothing to expand |
| 10 | Help and documentation | 3 | Caveat + provenance are the best copy here; provenance carries no "as of" |
| **Total** | | **19/40** | **Poor** |

## Design-specificity verdict

Category-interchangeable admin furniture with one authored component bolted on. Cover the title and
the euro figures and the skeleton — back link, chip row, 2×2 KPI tiles, sidebar of stacked cards, then
eleven identical accordion strips — would serve a CRM record or a product SKU unchanged. The one thing
that could only exist in this product, the evidence band, starts at y=878 on a 900-tall viewport and is
styled *quieter* than "Expected Outcome". The loudest object above the fold is a row of six saturated
purple pills that do nothing on this route.

Deterministic scan: `detect.mjs` returned **0 findings** on `NodeDetail.js` and on `CordisEvidence/`
(detector validated against a synthetic control file, which correctly returned exit 2). The defects here
are compositional and semantic, not pattern-matchable.

## What was working (preserved, not discarded)

1. `CallBriefBand`'s two-row Planned/Funded framing separates the halves by **explicit text labels**, so
   the distinction survives colour-blindness. That redundant coding is carried forward into the new
   header and evidence adjacency — the labels stay, the duplication goes.
2. `CordisBand`'s honesty logic is disciplined and its reasoning is preserved in comments: expansion is
   offered only when there is evidence, the awarded badge is stamped only when a real euro exists, and a
   fetch error gets different copy from a pre-ingest empty. All three are kept intact.
3. `MoneyBadge` is the right primitive, used in the right place. It is kept and given more, not less, work.

## Confirmed defects fixed by this slice

| ID | Defect | Evidence |
|----|--------|----------|
| D1 | No programme/destination context anywhere on the first screen | measured: destination appears once, truncated, at sidebar depth |
| D2 | No time-to-deadline; deadline is a flat caption in the sidebar | `deadline-amber` exists and is spent on the *Forthcoming* chip instead |
| D3 | "668 funded projects · €2.0B" renders unqualified above the fold; the ADR-0001 caveat is collapsed 600px below | `NodeDetail.js:609-619` vs `CordisBand.jsx:102-103` |
| D4 | Six research-field chips painted as the page's loudest CTA are completely inert on `/node/:id` | `cursor:auto`, no role, absent from tab order (measured) |
| D5 | **Zero visible focus ring on all 14 buttons** — `outline-style:none`, `box-shadow:none` | `grep -c ":focus" nodedetails.scss` → 0 |
| D6 | The evidence band's framework-programme chart renders as empty rails | `CordisEvidencePanel.jsx:84` is the only `dash-funding__bar-fill` caller that omits `backgroundColor`, and the class has no background of its own |
| D7 | Legacy Vision-UI purple `#7551ff` owns the CTA, the title dot and the band's active tab | measured on 3 elements + 2 near-neighbours; tokens at `nodedetails.scss:13-17` |
| D8 | White-on-purple CTA and chips fail AA (3.69 and 3.41) | computed against composited background |
| D9 | At 1024×768 the primary CTA is at y=2448 of 2984 (82% depth, ~3.2 viewports) | sidebar reflows below a 1388px band + 10 accordions |
| D10 | The same deadline renders twice ("Sep 23, 2026 / Sep 23, 2026") | `normalizeDeadlines` dedupes raw strings, so `2026-09-23` and `2026-09-23T00:00:00+00:00` both survive |
| D11 | One `h1` and **zero** `h2/h3/h4` — no document outline; 11 consecutive tab stops all named "Show" | measured |
| D12 | "Back to Graph" and "Official Call Page" expose no accessible name in the a11y tree | reproduced across 3 snapshots; `grep "aria-"` on `NodeDetail.js` → 0 matches |
| D13 | Bookmark fires a native `alert()`, has no saved state, and is inflated by its own titled card | `NodeDetail.js:1122-1136` |
| D14 | The Q6.2 mandated KPI rename never landed: the label still reads "Total Budget" | `NodeDetail.js:1264` |
| D15 | `.nd-card-toggle` hit target is 41×21px — below the 24×24 minimum | measured |
| D16 | `.nd-card:hover` lifts (`translateY(-2px)` + shadow change), violating Tint-Not-Lift | `nodedetails.scss:651-654` |
| D17 | Band tabs declare `role="tablist"`/`tab` with no `aria-controls`, no `id`, no `tabpanel`, no roving tabindex | broken ARIA contract |

## Proposed information hierarchy

The surface answers one question — *is this call worth committing months of proposal effort to?* — so it
is composed as **one decision header, then the two halves adjacent, then reference material**, in that
order of rank.

```
1  DECISION HEADER  (new .nd-callhead, one glass band, above the grid)
   1.1  eyebrow      Cluster 2 › Destination › parent call identifier      ← structure, the moat (D1)
   1.2  h1           the call title                                         ← unchanged rank
   1.3  identity     topic identifier (mono = data) · type of action
   1.4  verdict row  status pill (dot + word) · "Closes in 41 days · 23 Sep 2026"   (D2)
   1.5  two halves, side by side, three redundant channels each — label, position, colour:
          ON OFFER  (blue rule, "Indicative · on offer" badge)
            indicative budget on offer · EU contribution per project · projects expected   (D14)
          TIMELINE  (neutral)
            opens · closes (all deadlines, de-duplicated)                     (D10)
   1.6  actions      [Official call page]  primary, filled Signal Blue        (D9)
                     [Save to shortlist]   secondary, outline, stateful       (D13)
   1.7  research fields — demoted below the money, rendered as metadata unless wired  (D4)

2  THE AWARDED HALF — <CordisBand> hoisted to the top of the main column, so the two halves are
   adjacent and both readable in the first viewport. Title unchanged: "Funded track record in this
   area". Its scope qualifier is promoted out of the collapsed body into the always-visible header (D3).

3  REFERENCE — Key information, TRL, then the long-form work-programme sections, unchanged in content.

4  SIDEBAR — Connections, Source. The Timeline and Actions cards are absorbed by (1) rather than
   duplicated.
```

**What is deleted, and why it is safe.** `CallBriefBand` goes. Every fact it carried has a better home:
status/type/deadline → the decision header (1.4); the funded facts → the evidence band summary, which
already says exactly the same sentence *with* its scope qualifier and its awarded badge. Deleting it
removes three of the four redundancies at once and removes the unqualified claim (D3) rather than
patching it.

**Two-halves without colour dependence.** Advertised = blue rule + "Indicative · on offer" badge +
the words "On offer". Awarded = green rule + "Awarded · CORDIS" badge + the words "Funded track record
in this area". Label, position and badge text each carry the distinction on their own; colour is the
fourth channel, never the only one.

## Explicitly out of this slice

- Document title "EU Knowledge Graphs" in `public/index.html` — product-wide chrome, not this surface.
- Provenance "as of <date>": **no ingest timestamp exists** in `/cordis/call-evidence` or `/cordis/stats`.
  Adding one requires a backend field, which the ticket forbids. Inventing a date would breach ADR-0006 #7
  in the act of appearing to satisfy it. Deferred, named.
- Organisation-name casing, the 81-option bare-ISO country filter, and the 14-row framework tail inside
  `CordisPartnersPanel`/`CordisEvidencePanel` — real, but beyond the vertical slice. Only D6 (the
  invisible chart) is fixed, because a broken mechanism on this surface is an honesty-contract defect.
