---
name: European Research-Funding Intelligence (knowledge-graph-app)
description: A calm navy glass console for finding open EU calls and reading the funded track record behind them.
colors:
  signal-blue: "#47a9ff"
  signal-blue-daylight: "#1f6feb"
  signal-blue-icon: "#6cb8ff"
  signal-blue-text: "#9ccafd"
  deep-field-navy: "#0b1437"
  bar-glass: "rgba(11, 20, 55, 0.82)"
  panel-glass: "rgba(15, 34, 65, 0.9)"
  card-glass: "rgba(16, 36, 70, 0.85)"
  hairline: "rgba(82, 111, 160, 0.22)"
  text-high: "#f5f9ff"
  text: "#d7e6f7"
  text-mid: "#a9bdd6"
  text-dim: "#7e93b3"
  text-faint: "#5a6e8c"
  awarded-green: "#35d07f"
  deadline-amber: "#f3b84b"
  closed-slate: "#4f7dc9"
  marker-magenta: "#ec6cff"
  daylight-shell: "#eef2f8"
typography:
  headline:
    fontFamily: "Inter, -apple-system, 'Segoe UI', sans-serif"
    fontSize: "1.5rem"
    fontWeight: 600
    lineHeight: 1.4
    letterSpacing: "-0.01em"
  title:
    fontFamily: "Inter, -apple-system, 'Segoe UI', sans-serif"
    fontSize: "1.125rem"
    fontWeight: 600
    lineHeight: 1.5
  body:
    fontFamily: "Inter, -apple-system, 'Segoe UI', sans-serif"
    fontSize: "1rem"
    fontWeight: 400
    lineHeight: 1.6
  label:
    fontFamily: "Inter, -apple-system, 'Segoe UI', sans-serif"
    fontSize: "0.875rem"
    fontWeight: 500
    lineHeight: 1.5
  data-mono:
    fontFamily: "'JetBrains Mono', ui-monospace, SFMono-Regular, Menlo, monospace"
    fontSize: "10px"
    fontWeight: 600
    lineHeight: 1.5
rounded:
  control: "8px"
  rail: "9px"
  cta: "10px"
  card: "12px"
  panel: "14px"
  pill: "999px"
spacing:
  xs: "4px"
  sm: "8px"
  md: "12px"
  lg: "16px"
  xl: "24px"
components:
  button-cta:
    backgroundColor: "{colors.signal-blue}"
    textColor: "#ffffff"
    rounded: "{rounded.cta}"
    padding: "9px 12px"
  button-icon:
    backgroundColor: "transparent"
    textColor: "{colors.text-mid}"
    rounded: "{rounded.control}"
    size: "28px"
  button-icon-hover:
    backgroundColor: "rgba(63, 147, 255, 0.16)"
    textColor: "{colors.signal-blue-icon}"
  button-rail:
    backgroundColor: "transparent"
    textColor: "{colors.text-mid}"
    rounded: "{rounded.rail}"
    size: "32px"
  icon-glyph:
    viewBox: "24"
    md: "16px"
    lg: "18px"
    xl: "20px"
    inline: "12px"
    stroke: "1.25px"
    strokeDaylight: "1.15px"
  tab-segment-active:
    backgroundColor: "{colors.signal-blue}"
    textColor: "#ffffff"
    rounded: "{rounded.control}"
    padding: "6px 12px"
  money-badge-advertised:
    backgroundColor: "rgba(63, 139, 255, 0.12)"
    textColor: "#7bb4ff"
    rounded: "{rounded.pill}"
    padding: "1px 8px"
  money-badge-awarded:
    backgroundColor: "rgba(34, 178, 94, 0.13)"
    textColor: "#57d98a"
    rounded: "{rounded.pill}"
    padding: "1px 8px"
---

# Design System: European Research-Funding Intelligence

## Overview

**Creative North Star: "The Funding Observatory"**

A calm instrument for watching a landscape. The interface is a set of glass panels floating over a
deep-navy field — the full-bleed graph canvas owns the screen, and the chrome (command bar, floating
rails, capsules, drawers) sits above it as translucent, blurred panes. The visitor is a professional
on a recurring monitoring visit: the design's job is to let real evidence be read at a distance,
quickly and without drama. Nothing shouts; the data is loud, the chrome is quiet.

The voice is **calm, precise, evidential** — the product's honesty contract expressed as an
aesthetic. Money figures always carry their provenance badge, empty states are styled deliberately
rather than hidden, and small monospace readouts mark the places where the interface is reporting
fact rather than decoration. Dark mode **is** the reference design ("the dark values ARE the
reference design" — `_landing-chrome.scss`); light mode is a translucent-white daylight adaptation
of the same architecture, not a separate identity.

**Key Characteristics:**
- Full-bleed canvas; all chrome floats as blurred glass panels above it
- Deep navy field, one restrained blue accent, semantic green/amber/magenta signals
- Inter for prose and controls; JetBrains Mono strictly for data readouts
- Tint-based interaction (no lift, no glow on hover); hairline borders everywhere
- Dual token vocabularies: `--lc-*` (landing chrome) and `--d2-*` (dashboard), both dark-first with a light adaptation

## Colors

A single blue voice over a deep navy field, with a small set of semantic signals reserved for data states.

### Primary
- **Signal Blue** (#47a9ff): the one accent. Active states, the primary CTA, selected tabs, links, focus tints. In light mode it deepens to **Signal Blue Daylight** (#1f6feb) for contrast on white glass. Icon and text tints (#6cb8ff, #9ccafd) brighten it for small marks on navy.

### Secondary
- **Awarded Green** (#35d07f): "open" status and awarded/realized funding (the Awarded half of the money-badge vocabulary; badge text #57d98a on dark, #1a8a52 on light).
- **Deadline Amber** (#f3b84b): closing-soon urgency and time pressure.
- **Closed Slate** (#4f7dc9): closed/past states — cooler and quieter than open green.
- **Marker Magenta** (#ec6cff): counter badges and highlight markers only.

### Neutral
- **Deep Field Navy** (#0b1437): the shell background; the graph canvas sits at #0a1336.
- **Glass surfaces**: bar rgba(11,20,55,.82) → panel rgba(15,34,65,.9) → card rgba(16,36,70,.85), always with `backdrop-filter: blur(14px)`.
- **Hairline** (rgba(82,111,160,.22)): the universal border/divider on navy; light mode uses rgba(26,35,50,.10–.14).
- **Text ramp** (dark): high #f5f9ff → base #d7e6f7 → mid #a9bdd6 → dim #7e93b3 → faint #5a6e8c. Light: #101b2e → #1a2740 → #3a4d6e → #62748f → #8b9ab3.
- **Daylight Shell** (#eef2f8): the light-mode field.

### Named Rules
**The Quiet Chrome Rule.** Chrome speaks only in tints of Signal Blue (10–22% alpha) and hairlines. Green, amber, slate, and magenta are semantic — they mark data states (open, closing, closed, counts), never decoration.

**The Two-Halves Rule.** Every euro figure wears its half: Advertised money is badged blue ("Indicative · on offer"), Awarded money is badged green ("Awarded · CORDIS"). The colors never swap and never appear unbadged on a money figure. (ADR-0006 §5 made visual.)

**The Blue-Glass-Wins Rule.** The global dark theme still carries a legacy Vision-UI purple (`--primary: #7551ff` in `theme.css`) on older surfaces. New work never extends the purple: landing chrome (`--lc-*`) and dashboard (`--d2-*`) both override to Signal Blue, and that is the direction of travel.

## Typography

**Display Font:** Inter (with -apple-system, Segoe UI fallbacks)
**Body Font:** Inter
**Label/Mono Font:** JetBrains Mono (ui-monospace fallbacks)

**Character:** One workhorse humanist sans set small and medium-weight — professional, legible, unshowy — punctuated by tiny semibold monospace readouts that mark hard data (counts, shortcuts, timestamps).

### Hierarchy
- **Headline** (600, 1.5rem/24px, 1.4, −0.01em): page and panel titles (h1).
- **Title** (600, 1.125rem/18px, 1.5): section headings (h3); h2 sits at 1.25rem.
- **Body** (400, 1rem/16px, 1.6): prose and detail text. Root font-size is 16px.
- **Label** (500, 0.875rem/14px, 1.5): form labels, buttons, inputs.
- **Chrome micro-type** (600–650, 12–13.5px): the console runs smaller than the base scale — command-bar title 12.5px/600, CTA 13px/650, band summary 13.5px/600, captions and provenance at 10.5–12px.
- **Data-mono** (600, 8.5–10px, JetBrains Mono): count pills, kbd hints, badges.

### Named Rules
**The Mono-Means-Data Rule.** JetBrains Mono appears only where the UI reports data — counters, keyboard hints, timestamps, provenance. Never in prose, labels, or headings.

## Layout

The canvas owns the screen. The landing shell is a 52px full-width command bar, a floating left
rail, a 48px docked right toolbar, and floating capsules — all positioned over the full-bleed
Cytoscape canvas, which never scrolls; panels scroll internally. The dashboard is a themed shell
(explore-by-theme bar → two-column main grid → summary strip) with draggable floating windows
portaled to their own layer.

Spacing rhythm is a 4px-based scale observed as 4 / 8 / 12 / 16 / 24: dense gaps of 8–12px inside
panels, 16px panel padding (legend baseline: 16px pad / 12px gap — do not shrink below), 22–24px
padding on detail-page bands.

Breakpoints are the five tokens in `_breakpoints.scss`, mirrored into the MUI theme — always use
them, never hand-typed values: xs 480px, sm 600px, md 900px (tablet portrait / graph `isMobile`
cutoff), lg 1100px (chrome collapse), xl 1280px. Desktop-first: below lg the chrome collapses and
dashboard windows stack; below md is tablet territory with a soft portrait nudge. `fitToViewport`
is the single graph-fit authority on resize/rotation.

## Elevation & Depth

Depth is **structural glass layers**: the console is built of translucent panes stacked over the
canvas, separated by backdrop-blur (14px), hairline borders, and large soft navy shadows. Shadows
mark which layer a surface lives on — they are architecture, not decoration. Interaction never
lifts: hover and active states answer with an accent tint and an inset hairline ring, not elevation
change. The one sanctioned glow is the primary CTA's accent shadow (`0 6px 16px` Signal Blue at 22%).

### Shadow Vocabulary
- **App scale** (`--shadow-sm` … `--shadow-xl`): 0 1px 2px rgba(0,0,0,.05) up to 0 20px 25px −5px rgba(0,0,0,.1); dark mode swaps to deep-navy casts (rgba(3,8,28,.3–.42)).
- **Chrome pop** (`--lc-shadow-pop`: 0 24px 56px rgba(2,6,23,.6)): popovers and floating panels over the canvas.
- **Chrome card** (`--lc-shadow-card`: 0 16px 40px rgba(2,6,23,.55)): floating capsules and cards.
- **Dashboard card** (`--d2-card-shadow`): 0 18px 44px rgba(2,6,23,.5) plus a faint 26px blue ambience.

### Named Rules
**The Tint-Not-Lift Rule.** State changes are acknowledged with a background tint and an inset ring; shadows never change on hover.

## Shapes

Compact rounded rectangles, tightening with size: 7–8px on small controls and tabs, 9px on rail
buttons, 10px on CTAs and tab strips, 12–14px on cards and panels, and full pills (999px) for
badges, chips, and count markers. Borders are 1px hairlines throughout; active states use
`inset 0 0 0 1px` rings rather than thicker borders. Dots and status markers are true circles
(5–13px). No sharp corners, no oversized radii, no skeuomorphic shapes.

## Components

Component philosophy: **precise and quiet** — small, exact controls; interaction acknowledged with a tint and a hairline ring, never a jump or glow.

### Buttons
- **Primary CTA** (`.kg-home__cta`): Signal Blue fill, white text, 13px/650, 10px radius, 9px 12px padding, accent-glow shadow; hover brightens 6%, active nudges down 1px. Reserved for the surface's one primary action ("Find open calls").
- **Icon button** (command bar, 28px, 8px radius): transparent at rest in text-mid; hover = accent tint + accent-icon color; active adds `inset 0 0 0 1px` accent border; disabled at 40% opacity.
- **Rail button** (docked toolbar, 32px, 9px radius): same tint/ring grammar; magenta count badge (13px circle, mono 8.5px) may sit on its corner.
- **Node-type buttons**: legacy semantic vocabulary in `_variables.scss` (`--btn-<type>-*`), one flat color per graph node/edge type.

### Icons
One family (`railIcons.jsx`): 24u viewBox, `currentColor`, round caps and joins. **Size and stroke
weight are tokens, never call-site props** — the surface sets `--kg-icon-size` (`md` 16px on the
28px command-bar buttons, `lg` 18px on the 32px rail buttons, `xl` 20px on the 40px left-rail tiles,
`inline` 12px for separators set in text), holding the glyph/box ratio at ~0.56 across both
toolbars. `--kg-icon-stroke` owns the weight — 1.25px dark, 1.15px daylight — and
`vector-effect: non-scaling-stroke` pins it to device pixels so one weight survives every size.

**The Size-Is-A-Token Rule.** A hand-tuned `size` prop is a bug: stroke scales with size, so tuning
one icon by eye re-weights it against the rest of the family.

### Chips
- **Money badge** (`.money-badge`): the signature pill — uppercase 10px/700, 1px 8px padding, full pill. Two variants only: **advertised** (blue tint bg, blue text) and **awarded** (green tint bg, green text); text brightens on dark surfaces (#7bb4ff / #57d98a). `--sm` variant at 9px for tight rows. Cursor is `help` — it explains, it doesn't act.
- **Count pill**: mono 10px on a soft tint, full pill (e.g. CTA count at white 18% alpha).

### Cards / Containers
- **Glass panel** (chrome): `--lc-panel-bg` at 90% alpha, 1px `--lc-panel-border`, blur(14px), chrome-card shadow, 12–14px radius.
- **Dashboard card**: `--d2-card-bg` glass, `--d2-card-border`, 14px radius outer / 12px inner surfaces, `--d2-card-shadow`; inside a floating window the card chrome collapses so it reads as one pane.
- Internal padding 16px (dense) to 22–24px (detail bands).

### Inputs / Fields
- Quiet fields on `--input-background` (#F8F9FB light / #0c1740 dark), transparent border, 0.875rem/400 text; focus answers with the ring color (#0051A5 light / #8b6cff dark on legacy surfaces, accent-border on chrome). Keep focus visible — a ring, never nothing.

### Navigation
- **Command bar**: 52px glass bar, brand + 12.5px/600 title, icon buttons, hairline 1×18px dividers, breadcrumbs as text-mid pills; z-index 50.
- **Docked right rail**: 48px full-height glass, 32px buttons with 22px hairline separators between groups; scrolls internally on short screens so the page never scrolls.
- **Segmented tabs** (`.nd-cordis-band__tabs`): 10px-radius strip on a soft dark inset, 8px-radius segments, active = Signal Blue fill + white text.

### The Evidence Band (signature component)
`.nd-cordis-band` — "Funded track record in this area" on the call page. Always present: header with
a one-line bold summary (13.5px/600, ellipsized) that expands on click; pre-ingest it shows an
*italic muted* honest-empty line — styled on purpose, never blank, never removed. Expanded body
carries the thematic-adjacency caveat (12px muted), the segmented sub-tab strip, and a provenance
footer (10.5px muted, hairline top border: "Source: EU CORDIS · as of …"). This component is the
honesty contract rendered.

## Do's and Don'ts

### Do:
- **Do** define both theme sets for any new chrome: the dark `--lc-*`/`--d2-*` values are the reference; light mode is the daylight adaptation. A token defined in only one mode is a bug.
- **Do** use the `_breakpoints.scss` tokens/mixins (480/600/900/1100/1280) for every media query; they are mirrored into the MUI theme.
- **Do** badge every money figure with its half (advertised blue / awarded green) and keep provenance lines ("Source: EU CORDIS · as of …") on every evidence surface.
- **Do** style empty states deliberately — italic, muted, in place — when data is missing but the mechanism works ("no CORDIS data ingested for this area yet").
- **Do** keep interaction quiet: accent tint + `inset 0 0 0 1px` ring for hover/active; 150ms `cubic-bezier(0.4, 0, 0.2, 1)` transitions.
- **Do** pair color with a second channel (label, shape, position) — node-type and status colors never carry meaning alone; keep WCAG AA contrast, visible focus, keyboard paths, and reduced-motion support.

### Don't:
- **Don't** extend the legacy Vision-UI purple (#7551ff) to any new surface; Signal Blue glass is the direction of travel.
- **Don't** use JetBrains Mono for prose or spend green/amber/magenta on decoration — mono means data, semantic colors mean state.
- **Don't** ship an inert control. A mechanism that doesn't work is removed, not styled (ADR-0006 §2); a dead button lies.
- **Don't** dress numbers up: no odds, no funded-rates, counts ≠ euros ≠ impact, and Advertised money never wears an Awarded label or color.
- **Don't** let user-facing copy say "graph", "nodes", or "edges" — mechanism words are banned; say "in one place".
- **Don't** add elevation on hover, gradient text, or glow effects beyond the CTA's sanctioned accent shadow.
