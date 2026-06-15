# Execution Plan — Idea #1 / **A2: Cross-Topic 6-Way Theme Comparison**

> Roadmap rank: **#1** (score 74). Category: *enhance-existing* (generalise `CompareDrawer` 2→N).
> Source: `CORDIS_FEATURE_IDEAS.md` §3 A2. Honesty rules: `CORDIS_FEATURE_IDEAS.md` §7.
> Status: **PLAN — not yet implemented.** One idea at a time; this file is the gate before code.

---

## 0. TL;DR

Add a **"Themes" mode** to the existing Compare drawer that lines up all **6 CORDIS strategic
topics** (cyber, trustworthy-AI, data-spaces, quantum, health-AI, AI-for-science) side-by-side on
the indicators the frozen v1.0 method already computed. **v1 is 100 % client-side from a static
data module** — every figure is transcribed verbatim from `CORDIS/CORDIS_EVIDENCE_METHOD_v1.0.md`
(all `[OBSERVED]`), so there is **no ETL, no backend endpoint, no join key, and no dependency on
the unrun pipeline.** The existing 2-programme compare path is left untouched.

This is the single screen where all six themes' realized-portfolio + Hungarian metrics sit together —
the core artifact for prioritising which themes deserve a European Partnership (consultation Q1/Q2/Q3).

---

## 1. Goal & scope

**In scope (v1):**
- A mode switch inside the Compare drawer: **`Programmes`** (today's behaviour) ↔ **`Themes`** (new).
- In Themes mode: a 6-column comparison table of the 6 CORDIS topics, rendered from a vendored
  static module, with per-row evidence-tier badges and the §7 honesty guardrails baked in.
- No node selection required in Themes mode (it is portfolio-level, not graph-node-level).

**Explicitly out of scope (deferred to v2 / other ideas):**
- `CompareTopicOverlap` for themes (needs real EuroSciVoc tags → depends on **A1**, idea #9). Skipped.
- Live `GET /foresight/topics` reading real `analysis_summary.json` (needs the ETL → v2).
- FP-mix / FP-tail-depth row (exact per-FP counts are **not** in the frozen doc → shown as
  "pending extraction", not fabricated).
- Any sorting / ranking control (deliberately omitted — see §3 honesty rule H4).

**Non-goals:** do not alter the programme-compare metrics, the selection wiring
(`onCompareSelect`), or the drawer's open/close ownership in `GraphPage.js`.

---

## 2. Why this is safe & cheap to ship first

| Property | Detail |
|---|---|
| Data readiness | **client-side-now** — all numbers already exist in the frozen method doc (§1, §7.3–7.4, §8.3, §9.2). |
| Backend changes | **none** in v1. |
| Join key needed | **none** — themes are pre-aggregated portfolios, not calls. Avoids the empty `call_id↔masterCall` trap entirely. |
| Blast radius | Additive: 1 new data file, 1 new component, 1 backward-compatible prop on `CompareMetricRow`, 1 `mode` state + toggle in `CompareDrawer`, CSS additions. Programme path unchanged when `mode==='programmes'`. |
| Reversibility | Delete the new files + the toggle block; revert is mechanical. |

---

## 3. Honesty & limits compliance (§7) — **mandatory, mapped to concrete UI**

Every guardrail in `CORDIS_FEATURE_IDEAS.md` §7 is satisfied by an explicit UI decision below.
**Implementation must not ship without all of these.**

- **H1 — Tier every number.** Each row carries an `[OBS]` / `[INF]` badge sourced from the data
  module's `tier` field (the tier travels *with the field*, never hand-typed in JSX). Merged size,
  repeat-coordinators, policy-alignment, core-relevance, HU counts = `[OBSERVED]`; fragmentation
  verdict & "coordination deficit" reading = `[INFERENCE]`.
- **H2 — Counts ≠ funding ≠ impact.** The "Repeat coordinators" and HU-count rows are labelled
  "participation/coordination frequency — not funding or merit". A persistent footer repeats it.
  No € figure is shown in v1 (we deliberately omit funding because exact `ecMaxContribution`
  aggregates are not in the frozen doc — showing counts only, honestly labelled).
- **H3 — q01 contamination.** The "Merged portfolio size" row gets a footnote: *"includes the broad
  q01 lens, which overstates the genuine core ~3–4×; not a strength headline."* The **"Core-relevance
  (q01 vs core lenses)"** row is shown directly beneath it so the contamination is visible, never
  hidden. Merged size is never styled as a "winner".
- **H4 — Giant component ≠ leadership; never sortable.** `largest_component_share` (0.96–0.98 for
  **all six**) is rendered as a **binary badge "Fragmentation: ruled out"**, *not* a number and
  *not* a sortable column, with the verbatim caption *"disproves fragmentation (Q2); does NOT prove
  leadership."* **v1 has no sorting at all**, which structurally satisfies "disable sort on
  inference-laden rows."
- **H5 — Leadership proxy is repeat-coordinators.** "Repeat coordinators" row is explicitly captioned
  as the leadership-continuity proxy (per §7.4), positioned as the closest-to-leadership signal —
  while still `[INFERENCE]` for any leadership claim.
- **H6 — Vintage bias.** "Policy alignment" row labelled *"lower bound — tracks project vintage
  (HE/H2020 era), not strategic relevance."*
- **H7 — Absence ≠ absence.** Footer: *"CORDIS covers EU-funded projects only; national-only and
  private R&I are invisible. Absence of evidence is not evidence of absence."*
- **H8 — No non-EU benchmark.** Footer: *"CORDIS cannot benchmark Europe against US/China/private
  R&D. 'Leadership/behind' are internal-structure inferences, never measurements."*
- **H9 — Hungarian quantum counter-pattern.** The "HU participation : coordination (vs EU-wide)" row
  flags **quantum as *balanced*** (4.3:1 vs 2.6:1 — neutral/positive styling) against the other five
  themes' *latent-leadership deficit* (amber). The single "latent leadership" story must **not** be
  flattened across all six; quantum is the explicit exception, with a tooltip.
- **H10 — Provenance.** Footer line: *"Source: CORDIS Evidence Method v1.0 (frozen 2026-06-11), 6
  topics. Realized FP7–H2020–Horizon-Europe activity — not the open 2026 calls."* Pre-aggregated
  roll-ups are already project-de-duped (method §2.3), so the §7 "de-dup by project_id" rule is
  satisfied upstream; a code comment records this.

---

## 4. The static dataset (v1) — exact values, all `[OBSERVED]` from the frozen doc

New file: **`frontend/src/data/cordisThemeEvidence.js`** (no network). Values transcribed from
`CORDIS/CORDIS_EVIDENCE_METHOD_v1.0.md` with section anchors; **reviewer must verify each against the
doc before merge.**

| Theme (id) | Short | Merged projects (§1) | Repeat coord. (§7.4) | n_comp (§7.3) | Largest share (§7.3) | Policy align. (§8.3) | q01 core-rel (§6.4) | Core-lens range (§6.4) | HU part. (§9.2) | HU coord. (§9.2) | HU ratio (§9.2) | EU-wide ratio (§9.2) |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| `cyber` | Cyber/PQC | 6,449 | 784 | 124 | 0.9725 | 0.38 | 31.5 % | 54–65 % | 632 | 32 | 19.8:1 | 9.9:1 |
| `trustworthy_ai` | Trust-AI | 11,466 | 1,191 | 142 | 0.9804 | 0.35 | 23.9 % | 18.1–31.7 % | 790 | 52 | 15.2:1 | 8.1:1 |
| `data_spaces` | Data-spaces | 22,992 | 2,356 | 301 | 0.9783 | 0.22 | 8.96 % | 8.4–10.8 % | 2,005 | 108 | 18.6:1 | 8.7:1 |
| `quantum` | Quantum | 5,787 | 550 | 33 | 0.9769 | 0.25 | 19.4 % | 32.4–37.6 % | 132 | 31 | **4.3:1** | 2.6:1 |
| `health_ai` | Health-AI | 22,531 | 1,899 | 306 | 0.9676 | 0.28 | 46.8 % | 58.8–61.3 % | 1,332 | 100 | 13.3:1 | 6.3:1 |
| `ai_for_science` | AI-for-sci | 27,327 | 2,514 | 514 | 0.9612 | 0.22 | 32.5 % | 33.4–40.2 % | 3,278 | 203 | 16.1:1 | 7.9:1 |

Per-theme `huReading` strings (verbatim sense from §9.2, used in the HU-ratio cell tooltip):
- cyber — "broad participation, firm/SME-led coordination"
- trustworthy_ai — "latent leadership; academic + industry + SME base"
- data_spaces — "broad multi-actor base (SZTAKI leads q05)"
- quantum — "**balanced** — smallest base but #1 coordinator of its own projects; theory/algorithm-led (BME, ELTE, Rényi, Wigner)"
- health_ai — "2nd-largest base; #5 coordinator of its own projects"
- ai_for_science — "largest base, thinnest coordination (#7 coordinator of its own projects)"

Each metric definition object also carries: `tier` (`OBSERVED`/`INFERENCE`), `caption` (the honesty
caption), and `render` hint (`number` | `percent` | `ratio` | `fragBadge` | `range`). A top-level
`CORDIS_EVIDENCE_META = { methodVersion:'v1.0', frozenDate:'2026-06-11', sourceDoc, topicsCount:6 }`.

> Fragmentation verdict for all 6 = "Ruled out" (share ≥ 0.70, method §7.2). Rendered as a badge,
> never the raw 0.96–0.98 number in a sortable position (H4).

---

## 5. Files to change (verified against current tree)

| # | File | Change | Risk |
|---|---|---|---|
| 1 | `frontend/src/data/cordisThemeEvidence.js` **(new)** | Static dataset + metric definitions + meta (from §4). | none |
| 2 | `frontend/src/components/GraphPage/CompareDrawer/ThemeCompareTable.jsx` **(new)** | Renders the 6-theme table, tier badges, frag badge, footnotes, footer. | low |
| 3 | `frontend/src/components/GraphPage/CompareDrawer/CompareMetricRow.jsx` | Add **optional** `values` array + optional `tier`/`info` props; if `values` present render N cells, else fall back to `valueA/valueB`. **Backward compatible.** | low |
| 4 | `frontend/src/components/GraphPage/CompareDrawer/CompareDrawer.jsx` | Add `mode` state (`'programmes'`\|`'themes'`, default `'programmes'`); segmented toggle in header; when `themes`, render `<ThemeCompareTable/>` and skip the node-selection/placeholder block; title reflects mode. | medium |
| 5 | `frontend/src/styles/components/_compare-drawer.scss` | Add `.compare-drawer--themes` (wider card + horizontal scroll), `.compare-drawer__mode-toggle`, `.theme-compare-table` (sticky first column, badges, frag badge, footnote/footer). | low |

**No changes** to `GraphPage.js`, `GraphMainColumn.jsx`, `SidebarControls.jsx`, `useCompareData.js`,
`CompareNodeHeader.jsx`, `CompareTopicOverlap.jsx`, or any backend file.

Anchors confirmed: drawer rendered `GraphMainColumn.jsx:306-316` (`open={compareOpen && !isHEWiki}`);
state `GraphPage.js:44-45`; toggle `SidebarControls.jsx:104-105`; row component `CompareMetricRow.jsx:4`.

---

## 6. Component design

### 6.1 `CompareMetricRow` (generalised, backward compatible)
```
props: { label, valueA, valueB, values, tier, info }
- if Array.isArray(values): render label cell + N value cells (+ optional tier badge + info popover)
- else: render label/valueA/valueB exactly as today  ← existing programme path unchanged
```
Grid columns become dynamic via an inline `gridTemplateColumns` when `values` is used; the existing
CSS `.compare-drawer__metric-row` 3-col rule still governs the legacy path.

### 6.2 `ThemeCompareTable`
- Header row: 6 short theme labels (full name + `huReading` in a MUI `Tooltip`), a tier-legend chip.
- Body: one `CompareMetricRow` per metric, `values=[…6]`, fed from `cordisThemeEvidence`:
  1. **Merged portfolio size** `[OBS]` + footnote H3.
  2. **Core-relevance (q01 → core lenses)** `[OBS]` (e.g. "31.5 % → 54–65 %") — directly under #1 (H3).
  3. **Repeat coordinators** `[OBS]` value / `[INF]` for leadership reading; caption H5/H2.
  4. **Fragmentation** → `<FragBadge/>` "Ruled out" `[INF]`, caption H4 (no number, no sort).
  5. **Policy alignment** `[OBS]` lower-bound, caption H6.
  6. **HU participations** `[OBS]` (H2).
  7. **HU coordinations** `[OBS]` (H2).
  8. **HU part : coord vs EU-wide** `[OBS]` ratio + `[INF]` "coordination deficit"; quantum styled
     *balanced* (H9), others amber; tooltip = `huReading`.
  9. **FP mix** → "pending extraction" placeholder (honest, not fabricated).
- Footer: H2 + H7 + H8 + H10 caption block.
- Layout: sticky first (label) column; horizontal scroll inside the widened card so labels stay put.

### 6.3 `CompareDrawer` mode toggle
- `const [mode, setMode] = useState('programmes')`.
- Header: small segmented control `[ Programmes | Themes ]`; in `themes` the close/title stay,
  `hasBothNodes`/placeholder logic is bypassed.
- Card className gets `compare-drawer--themes` when `mode==='themes'` (widens it).
- Default stays `programmes` so existing behaviour/PRs are unaffected on open.

---

## 7. Step-by-step task list

1. **Create `cordisThemeEvidence.js`** with the §4 values + metric definitions + meta. Add a header
   comment citing the exact doc sections; mark every value `[OBSERVED]`.
2. **Generalise `CompareMetricRow`** to accept `values`/`tier`/`info` (keep `valueA/valueB`
   fallback). Manually confirm the programme drawer still renders identically.
3. **Build `ThemeCompareTable.jsx`** per §6.2, including `FragBadge`, tier badges, footnotes, footer.
4. **Add the mode toggle** to `CompareDrawer.jsx`; render `ThemeCompareTable` in themes mode.
5. **Style** in `_compare-drawer.scss` (widened `--themes` card, mode toggle, table, sticky column,
   badges, footnote/footer). Verify dark **and** light theme via CSS vars only.
6. **Self-review against §3 H1–H10** — each guardrail visibly present. Remove any debug logs.
7. **Build**: `node node_modules/react-scripts/bin/react-scripts.js build` (npx is broken on this
   setup, per project notes). Expect only the pre-existing warnings; no new errors.
8. **Manual verification** (§8).

---

## 8. Verification checklist

- [ ] Open Compare (right sidebar) → toggle **Themes** → all 6 columns render with §4 numbers.
- [ ] Every row shows a tier badge; fragmentation is a **badge**, not a number; **no sort control** exists.
- [ ] Merged-size footnote (q01) + core-relevance row both visible; policy-alignment "lower bound" label present.
- [ ] HU ratio row: quantum styled *balanced*, other five amber; tooltips show `huReading`.
- [ ] Footer carries H2/H7/H8/H10 lines; provenance "v1.0 frozen 2026-06-11 … not the open 2026 calls".
- [ ] Switch back to **Programmes** → identical to current behaviour (2-node compare, topic overlap).
- [ ] Numbers spot-checked against `CORDIS_EVIDENCE_METHOD_v1.0.md` §1/§7.3-7.4/§8.3/§9.2.
- [ ] Dark + light theme both legible; drawer scrolls; no console errors; production build succeeds.

---

## 9. Rollback

Delete `cordisThemeEvidence.js` + `ThemeCompareTable.jsx`; revert the optional props on
`CompareMetricRow`, the `mode` block in `CompareDrawer`, and the `_compare-drawer.scss` additions.
No state, backend, or data-pipeline coupling to unwind.

---

## 10. v2 / follow-ups (not now)

- Replace the static module with `GET /foresight/topics` reading real `analysis_summary.json` once
  the CORDIS ETL has run (shared with **B2 Foresight Quadrant**, idea #4).
- Add the FP-mix row + a funding (`ecMaxContribution`) row once exact per-FP/per-€ figures exist.
- Wire `CompareTopicOverlap` for themes once **A1** (idea #9) puts real EuroSciVoc tags on the data.
- Optional deep-link: clicking a theme column drills the graph to its mapped cluster (needs the
  theme↔cluster crosswalk shared with C3/C4).

---

## 11. Estimate

~Half a day. New code is mostly presentational + a vetted constants file; the only edit to existing
working code is one backward-compatible prop on a 12-line component plus a `mode` switch.
