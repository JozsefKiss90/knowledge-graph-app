---
target: icon sizes in the right sidebar and the navbar
total_score: 14
max_score: 28
na_heuristics: 3,9,10
p0_count: 0
p1_count: 3
timestamp: 2026-08-27T16-46-30Z
slug: frontend-src-components-graphpage-ui-railicons-jsx
---
Method: dual-agent (A: design review, source-only — Chrome extension not connected · B: detector + live Puppeteer/Chrome measurement at :3000)

Scope: icon sizing in the top command bar (`CommandBar.jsx`) and the docked right rail (`SidebarControls.jsx`), plus the shared icon layer they both consume (`railIcons.jsx`). `LeftRail.jsx` enters only as a consistency reference.

## Design Health Score

| # | Heuristic | Score | Key Issue |
|---|-----------|-------|-----------|
| 1 | Visibility of System Status | 2 | 16%-alpha active tint behind `blur(14px)` is a weak "you are here" for persistent modes; "active" means two things in one bar (Grid/Flow is a radio pair, always one lit, 2px from Undo/Fit where lit = panel open) |
| 2 | Match System / Real World | 2 | Grid = "force-directed" and Flow = "hierarchical" are not conventional mappings; Layers = "funded landscape" is arbitrary. Moon/Mail/Gear are conventional and fine |
| 3 | User Control and Freedom | n/a | Icon geometry does not own escape routes |
| 4 | Consistency and Standards | 1 | Same glyph at two sizes on screen simultaneously (Compare 17 left rail / 16 right rail); 12 `size` values for one "family"; 6 rendered stroke weights; `gap: 2px` is off the declared 4/8/12/16/24 scale |
| 5 | Error Prevention | 2 | 2px pitch between 28–32px targets puts Reset camera 2px from Fit to screen, and Theme (whole-app inversion) 2px from Contact |
| 6 | Recognition Rather Than Recall | 2 | Every rail control is icon-only + tooltip; section labels are `display:none` and collapsed is the first-run default. Tooltips carrying ⌘K earn the 2 |
| 7 | Flexibility and Efficiency | 3 | Expand/collapse rail with `localStorage` persistence, ⌘K palette, responsive folding — real. Docked because the persisted default is the less usable state |
| 8 | Aesthetic and Minimalist Design | 2 | The grammar is genuinely restrained; sub-pixel strokes + 1.8× ink raggedness make it read *faint*, not *precise* |
| 9 | Error Recovery | n/a | This layer surfaces no errors |
| 10 | Help and Documentation | n/a | An Info button exists, but judging the docs behind it isn't judging the icon layer |
| **Total** | | **14/28** | **Needs work — the container system is right, the mark system doesn't exist** |

## Design Specificity Verdict

**Specific in intent, generic in effect.**

Four glyphs are real domain authorship: `FindCallsIcon` (list rules + magnifier = "search *within* a list of calls"), `TimelineIcon` (three nodes on a rule, middle one filled = scrubber position), `ColumnsIcon` (solid panel + `strokeDasharray="2 2"` candidate panel = "A against a proposed B"), `CompassIcon` (commented at `railIcons.jsx:50` as deliberately distinct from the navbar's house). Design reasoning sits next to the geometry in the file — most codebases don't do that. Everything else — Gear, Moon, Mail, Search, Command, Grid, Share, Fit, Info — is Feather-identical. The honest description is "Feather plus four custom marks."

Then the sizing layer erases even the four. `FindCallsIcon`'s three list rules sit 4u apart → **2.83px apart at `size={17}`, drawn with 1.13px strokes**: three antialiased lines with 1.7px of navy between them, on a `blur(14px)` glass bar. `TimelineIcon`'s filled "current node" is r2 → a **2.83px dot**. The authorship ships below its own resolution.

The header comment at `railIcons.jsx:3–6` — "so they read as one family regardless of which surface they sit on" — is false as shipped.

**Deterministic scan**: `detect.mjs --json` ran clean on all three files (exit 0, `[]`, zero rule hits). No false positives to adjudicate. Worth stating plainly: **the detector cannot see any of this.** Optical size, stroke-scaling, and glyph-to-box ratio are exactly the class of defect no linter catches, which is why it survived.

**Visual overlays**: none. The Chrome extension is not connected (`list_connected_browsers` → `[]`), so no script was injected into a page in your browser and **no user-visible overlay exists**. Substituted evidence: a real headful Chrome driven by Puppeteer against `http://localhost:3000`, measuring `getComputedStyle`/`getBoundingClientRect` live at 1424px and 1024px, plus screenshots. Every number below is measured, not estimated.

## Overall Impression

The part of the design system that was written down is honored **without a single deviation** — 28px/8px-radius command-bar buttons, 32px/9px rail buttons, 48px rail, 22px separators, tint-not-lift interaction. The part that was never written down — the mark itself — was then hand-tuned 12 times by eye and drifted everywhere.

The single biggest opportunity: **DESIGN.md specifies the container and says nothing about the glyph.** No icon-size token exists anywhere in `styles/` (`grep` for `--icon`, `icon-size`, `icon-sm|md` returns nothing). Add three tokens and one stroke rule and roughly 80% of what follows disappears at once.

Measured spread, live:

| Surface | Button | Glyph `size` | Glyph/box | Rendered stroke |
|---|---|---|---|---|
| Command bar cluster | 28×28 | 15 | 0.54 | 1.00px |
| Command bar search | 40–360×32 | 14 | — | 0.93px |
| Command bar dashboard | 41–144×32 | 13 | — | 0.87px |
| Breadcrumb separator | inline | 12 | — | 0.80px |
| Right rail | 32×32 | 16 **and** 17 | 0.50 / 0.53 | 1.07 / 1.13px |
| Left rail (reference) | 40×40 | 17 | 0.43 | 1.13px |

Five glyph sizes, six stroke weights, three glyph/box ratios — on one screen at one time.

## What's Working

1. **Box geometry matches DESIGN.md exactly, with zero drift.** `.kg-commandbar__icon` = `button-icon` (28px/8px). `.sidebar-controls-button` = `button-rail` (32px/9px). Rail width 48px, separators 22px. Where the spec exists, it is obeyed — which is the strongest argument for extending the spec to the mark.
2. **The rail's chunking is genuinely well designed.** Eleven tools in five groups of 1/2/4/1/3 — every group inside 4±1, utilities pushed to the foot by a flex spacer, landscape tools collapsed to one labelled shortcut. The information design is correct; it just doesn't render (see P2).
3. **The interaction grammar holds across all three surfaces.** Tint + `inset 0 0 0 1px` ring, no elevation change on hover, disabled at 0.35–0.40. Caveat: two active states break the no-glow rule — `.kg-leftrail__btn.is-active` (`0 0 18px`) and `.kg-commandbar__dash.is-active` (`0 0 14px`), where DESIGN.md sanctions a glow only on the primary CTA.

## Priority Issues

### [P1] Optical size is unmanaged — `size` was used as a proxy for it and can't reach

**What.** In the navbar cluster every call site is `size={15}` in an identical 28px box, yet rendered ink runs **7.50px (BookmarkPlus) → 11.25px (Grid)** — a 50% spread. In the right rail it runs **7.50px (Chevrons) → 13.46px (Timeline)** — 80% — in one 32px-wide column at 2px pitch. Nobody normalized glyph bounding boxes inside the 24u viewBox: Bookmark occupies 12 of 24 units wide, Info 18, Timeline 19. The 16-vs-17 hand-tuning in `SidebarControls.jsx` is a **6% correction applied to an 80% problem** — invisible, and it created the cross-surface mismatch in the next issue for nothing.

**Why it matters.** The advisor on the recurring Tuesday visit is doing peripheral target acquisition — hitting a remembered position in a column, not reading glyphs. A ragged column has no stable edge to anchor on, so every acquisition falls back to foveating and re-parsing. That's the difference between a tool you reach for and one you look at.

**Fix.** Stop patching `size`. Redraw glyph geometry to a common **18×18u optical box** inside the 24u viewBox (3u padding), correcting for density — dense glyphs (FindCalls, Gear) at 17u, sparse ones (Bookmark, Chevrons, Timeline) filling 18u. E.g. `BookmarkIcon` `d="M6 4h12v17l-6-4-6 4z"` → `d="M5 3.5h14v18l-7-4.5-7 4.5z"`. Fold in the optical-centre offsets while you're in there (`LayersIcon` sits 1.0px above its button's centre — the most visible offset in a stacked rail).

**Suggested command**: `/impeccable polish`

### [P1] Stroke weight is a function of `size`, so "one family" ships as six weights, none of them a whole pixel

**What.** `strokeWidth: 1.6` in a 24 viewBox rendered at 12–17px produces **0.80 / 0.87 / 0.93 / 1.00 / 1.07 / 1.13 CSS px** across two adjacent surfaces (measured live). Nor is the geometry grid-aligned: at `size={15}` the scale is 0.625, so `HomeIcon`'s `x=3` lands at 1.875px and a 1.00px stroke centred there spans 1.375–2.375 — smeared across two pixel rows as two ~50% greys. **Nothing in this set is crisp at any shipped size.**

Light mode is unhandled: `grep stroke-width` across `frontend/src/styles/` hits only `_timeline-scrubber.scss`; there is no theme override anywhere. Light-on-dark sub-pixel strokes bloom and lose apparent weight, dark-on-light gain it — so the same set has two different visual weights in the two themes, contradicting DESIGN.md's position that light mode is "a daylight adaptation of the same architecture, not a separate identity."

`LogoMark` is the acute case: five connector lines at `strokeWidth="0.9"` in a 32 viewBox at `size={22}` → **0.62px at 50% alpha**, over a ring filled `rgba(59,130,246,0.08)`. On the light bar both effectively vanish, leaving six disconnected dots in a thin ring — **the brand mark disintegrates in light mode.** It also carries three off-token colours: `#22C55E` (awarded-green is `#35d07f`), `#3B82F6` / `#7CB6FF` (signal-blue is `#47a9ff` / `#6cb8ff`).

**Why it matters.** Faint chrome is the one failure mode this product can't afford — the north star is "let real evidence be read at a distance," and the chrome carrying the user to that evidence renders at placeholder weight. The disabled state compounds it: `opacity: 0.35` on `#a9bdd6` over navy ≈ **1.8:1**, and on the `HE_2025` dataset **four rail tools disable at once** — half the rail becomes sub-pixel ghosts.

**Fix.** Make stroke resolution-independent instead of size-dependent. In `railIcons.jsx:10–17` drop `strokeWidth: 1.6`, add `className: "kg-icon"`, and govern the family in one rule:

```scss
.kg-icon { stroke-width: var(--kg-icon-stroke); }
.kg-icon * { vector-effect: non-scaling-stroke; }   /* stroke lands in device px, not user units */
.graph-shell                  { --kg-icon-stroke: 1.25; }
body.light-theme .graph-shell { --kg-icon-stroke: 1.15; }  /* dark-on-light blooms; compensate */
```

That single change makes the header comment true for the first time. For `LogoMark`: drop the connectors and ring fill below 24px, move to on-token colours, add a light variant.

**Suggested command**: `/impeccable polish`

### [P1] No icon-size token exists, so the same tool renders at two sizes on screen at once

**What.** DESIGN.md §Components specifies `button-icon: 28px` and `button-rail: 32px` — the container. It says nothing about glyph dimension, stroke weight, or glyph/box ratio. Consequently 12 `size` values are scattered across 5 files with no rule, and **`ColumnsIcon` (Compare) renders at 17px in the left rail and 16px in the right rail, simultaneously** — both rails mount in `.graph-shell` (`GraphPage.js:747` + `RightControlsColumn`), and Compare and Find calls are deliberately duplicated in both. `CompassIcon` is 17 in the rail and 15 on the home panel; `FindCallsIcon` 17/17/16.

Worse, the glyph/box ratio *inverts against importance*: the 40px left-rail tiles hold 17px glyphs (0.43), the 32px rail holds 16px (0.50), the 28px command bar holds 15px (0.54). The biggest button contains the proportionally smallest mark.

**Why it matters.** The user sees the same tool twice and the two copies don't match. That reads as a rendering bug — and a bug in the frame undermines the honesty contract the product sells on. If the chrome looks unmaintained, the numbers inside it inherit the doubt.

**Fix.** Add the tokens, then delete every `size={…}` prop in `CommandBar.jsx`, `SidebarControls.jsx`, `LeftRail.jsx`, `LandingHome.jsx`, `GraphStatusBar.jsx` — the call site should not be choosing this:

```scss
--kg-icon-md: 16px;      /* 28px command-bar buttons  → 0.571 */
--kg-icon-lg: 18px;      /* 32px right-rail buttons   → 0.563 */
--kg-icon-xl: 20px;      /* 40px left-rail tiles      → 0.500 */
--kg-icon-inline: 12px;  /* breadcrumb separators */
```

One size per box class, ratio held at ~0.56 for both toolbars. Then codify it: add a `components.icon-glyph` block to DESIGN.md (`{ md, lg, xl, inline, stroke: 1.25px, opticalBox: 18/24 }`) so the next surface inherits it instead of re-guessing.

**Suggested command**: `/impeccable extract`

### [P2] The tablet collapse inverts the hierarchy — the two most important controls carry the two smallest glyphs

**What.** Search ships a **14px** glyph and Open dashboard a **13px** glyph, while Share and Save-view — the two most disposable controls in the bar — ship **15px**. At rest this is masked by text labels. At 1024px it isn't: measured live, `.kg-commandbar__search` collapses 360→**40px** and `.kg-commandbar__dash` 144→**41px**, both label-less. The bar becomes eight icon-only buttons in **three glyph sizes (13/14/15) and two box sizes (32/28)** with no labels and no dividers, and the smallest marks in the row are the primary action and the search entry point.

**Why it matters.** PRODUCT.md commits to tablet-up. On a 1024px tablet the advisor meets a row where visual weight is inversely correlated with importance, and the ⌘K affordance that justified the icon-only search is gone with the keyboard.

**Fix.** Bring both to `--kg-icon-md` (16px), and when they collapse to icon-only give them the 28px box the rest of the cluster uses so the row has one geometry — or keep 32px and promote the whole cluster to 32px at that breakpoint. Consider keeping the dashboard label to `$bp-md` and dropping a secondary pair (Share, Save view) instead.

**Suggested command**: `/impeccable adapt`

### [P2] Chunking that was designed correctly never reaches the eye, and the count badge sits on top of its own glyph

**What.** `gap: 2px` in both `.sidebar-controls` and `.kg-commandbar__cluster` — not on the 4/8/12/16/24 scale DESIGN.md declares. Group dividers are 22×1px at `rgba(82,111,160,0.22)` over blurred glass: measured, they yield 13px between groups against 2px within, but at 22% alpha they're barely a mark. Section labels are `display:none` when collapsed — and collapsed is the **first-run default**, so every new user meets 11 undifferentiated glyphs. The navbar cluster has **no divider at all**, despite the component already owning `.kg-commandbar__divider` and using it three times in the same bar.

The badge: `.bookmark-badge` is 13×13 at `top:1px; right:1px` inside a 32px button, occupying x 18–31/y 1–14; `BookmarkIcon` at 16px has 8.0×11.33px of ink at x 12–20/y 10.67–22 — **a ~2×3.3px overlap of magenta on the glyph's ink, with no knockout ring. The badge is 1.6× wider than the glyph it annotates.** Meanwhile `.kg-leftrail__badge` places correctly (outside the box, with a ring) but is 15px and **blue**, where DESIGN.md reserves magenta for counters and specifies 13px. Two contradictory treatments; each off-spec in a different way. Both are fixed-width circles with no padding — three digits overflow, and an advisor with 100+ shortlisted calls is the target user.

**Fix.**

```scss
.sidebar-controls, .kg-commandbar__cluster { gap: 4px; }
.sidebar-controls-divider { width: 24px; margin: 8px 0; background-color: var(--lc-panel-border); }

.graph-shell .sidebar-controls .bookmark-badge,
.graph-shell .kg-leftrail__badge {
  top: -3px; right: -3px;
  min-width: 14px; height: 14px; padding: 0 3.5px;
  border-radius: 999px;                  /* pill, not circle — survives 2–3 digits */
  border: 1.5px solid var(--lc-bar-bg);  /* knockout ring */
  background: var(--lc-pink);
  font: 600 9px var(--lc-mono);
}
```

In `CommandBar.jsx`, drop the existing `<span className="kg-commandbar__divider" />` between the layout pair, the camera pair and the share pair — zero new CSS. Render Grid/Flow as a segmented pair using DESIGN.md's `tab-segment-active`: it's a radio, and two independent toggles with one always lit is the wrong signifier. Cap the badge at `99+`.

**Suggested command**: `/impeccable layout`

## Persona Red Flags

**Alex (power user)** — ⌘K is in the bar and the rail persists its expanded state, so the fast paths exist. But the six-icon cluster is the *only* way to reach Fit-to-screen and Reset-camera, and it's six ~10px glyphs at 2px pitch with no dividers and no keyboard equivalents; Alex mis-clicks Reset (losing the viewport just framed) reaching for Fit 30px away. And the tool he uses most, Compare, appears twice on one screen at two different sizes — he'll assume one of them is a different feature.

**Sam (accessibility-dependent)** — the hard one. **Zero `:focus` / `:focus-visible` rules exist in either stylesheet**; native `<button>`s in the command bar get the UA outline while MUI `IconButton`s in the rail get MUI's ripple — two different focus treatments in one chrome, neither matching the `inset 0 0 0 1px` ring grammar, against DESIGN.md's own "keep focus visible — a ring, never nothing." At 200% zoom the 0.87–1.13px strokes are still sub-pixel per CSS px and stay soft. Contrast measured: icons pass AA comfortably (9.35:1 bar, 5.74:1 rail) — but the search placeholder is **3.10:1 (fails 4.5:1)** and the breadcrumb separator **3.46:1**, and both are best-case numbers because the surfaces are 82% opaque over a graph canvas that is *not* their DOM ancestor, so bright nodes passing underneath push the real ratio lower. Target sizes pass WCAG 2.5.8 (24px floor; smallest is 28px) and fail 2.5.5 (44px) — the AA line holds, but nothing is spare.

**Marta (the research-office advisor — project persona)** — Tuesday morning, 1024px laptop, wants "what's new in my fields." She meets a bar where the search box has collapsed to a 40px button with the smallest glyph in the row, and a right rail of 11 unlabelled marks whose five-group structure is invisible because the labels are hidden by default. She learns the rail by tooltip-hunting once, then navigates by remembered position — which is exactly the mode the ragged 7.5–13.5px ink column punishes most.

## Minor Observations

- **Dead exports.** `PathIcon`, `GlobeIcon`, `ResetIcon` are referenced nowhere outside `railIcons.jsx` — orphaned when Q5.2 collapsed the three CORDIS rail tools into one Landscape button. Verified by grep across `src/`. DESIGN.md's own rule: a mechanism that doesn't work is removed, not styled.
- **`.kg-commandbar__action--secondary` names a tier it doesn't render.** It sits on Grid, Flow, Share, BookmarkPlus, but its only rule is `display:none` below `$bp-sm`. A declared secondary tier that looks identical to primary is a lie in the markup — give it `color: var(--lc-text-dim)` at rest, which also fixes the P2 hierarchy inversion for free.
- **The breadcrumb separator renders 3.00px of ink** at `size={12}` / 0.80px stroke / `--lc-text-faint`. It's the connective tissue of the whole drill-down — Pillar › Programme › Destination › Call — drawn at the weight of a speck.
- **Rail ink occupies ~25% of the rail's width.** A 48px rail holding a 32px button holding ~12px of ink: a lot of glass for very little mark. The 18px token would take it to ~37%.
- **`devicePixelRatio` was 1 in the measuring browser** — Puppeteer's Chrome didn't inherit the Windows display scale. On a 1.25×/1.5× display the sub-pixel strokes land differently (some better, some worse); the *variance* between them is scale-independent, the blur is not.

## Questions to Consider

1. **DESIGN.md specifies 28px, 32px, 8px radius, 9px radius, hairline alpha, shadow spread — and not one glyph dimension or stroke weight.** Is a system that codifies the container but never the mark a design system, or a CSS changelog with frontmatter? The 12 hand-tuned `size` values are the direct, predictable cost of that omission.
2. **Compare and Find calls exist in both rails at once, at different sizes, and nobody noticed.** If the duplication is deliberate discoverability, which rail is canonical — and if the answer is "we never decided," what else is the chrome deciding by accident?
3. **The rail's collapsed default hides the section labels that are the only thing making 11 glyphs legible.** If the labelled state is the one that works, why is it opt-in — and who was the collapsed default optimising for, given the target user is at a desk on a wide monitor?
