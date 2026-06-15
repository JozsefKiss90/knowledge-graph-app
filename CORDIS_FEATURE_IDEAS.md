# CORDIS-Powered Features for EU Graphs — Ideas & Use Cases

> Audience: the owner of both the EU Graphs app and the CORDIS evidence pipeline.
> Every quantitative claim below is tiered **[OBSERVED]** (fact from `analysis_summary.json`), **[INFERENCE]** (a reasoned reading), or **[RECOMMENDATION]** (a proposal). The guardrails in §7 are non-negotiable and baked into each feature.

---

## 1. Executive thesis

The app today renders only the **funding supply side**: the nested Horizon Europe work programme `ROOT > Pillar > Programme > Destination > Call`, where each Call node carries budget, deadlines, and prose scope. CORDIS gives you the missing half — the **realized side**: who actually got funded on a theme, by which organisations, in which countries, with how much EU contribution, evolving FP7 → H2020 → Horizon Europe. The two halves share a natural join surface — CORDIS `project.topics / masterCall / subCall` ↔ the app's `Call.call_id` (the field really present on loaded data, e.g. `CEF-E-2026-CBRENEW-STUDIES`), with the **EuroSciVoc taxonomy path** as a second, semantic join across calls that share scientific categories. Attaching CORDIS evidence to Call nodes does two things at once: it **closes the UX-review §6 data gap** (real EuroSciVoc topic tags, real scored similarity edges, structured country/org/funding facets — exactly the data that ScoreFilter, compare-overlap, topic search and the chatbot-apply path are dead without) **and** it adds a dimension the app entirely lacks — the organisation/country collaboration graph, the FP-continuity time series, and the Q1/Q2/Q3 partnership-evidence layer that turns the app into a drafting tool for the actual consultation response.

**One temporal caveat governs everything below.** The app renders **open 2026–2027 calls**; CORDIS holds **already-funded FP7/H2020/HE projects**. A literal `call_id ↔ masterCall` string join returns ~zero rows for most displayed nodes (nothing has been awarded under a 2026 call yet). So the **primary** join for live nodes is the **EuroSciVoc-path / strategic-theme semantic mapping** to one of the 6 processed CORDIS topics; the exact-code join is high-confidence **corroboration**, not the backbone. Design every feature for this, and make "no CORDIS evidence" an explicit, intentional state — because, with only 6 thematic topics extracted (skewed to CL1/CL3/CL4 + cross-cutting AI/quantum), it is the **common** state across the drill-down, not the exception.

---

## 2. The data backbone (the one ETL that unlocks most ideas)

Most ideas below depend on a single enrichment step. Build it once, honestly:

1. **Produce the artifacts.** Run the frozen v1.0 pipeline (extract → parse → analyse) for the 6 topics. *Today the repo holds only the 4 methodology markdown files in `CORDIS/` — no `analysis_summary.json`, no CSVs. The pipeline is in `no_data` mode and every project-record field (`masterCall`, `subCall`, `topics`, `euroSciVoc.path`, `country`, `activityType`) is marked ASSUMED. So this is the real prerequisite, not a thin reload.*
2. **Attach to Call nodes.** A new `/enrich` endpoint (or an extension of `/populate`) joins each Call to CORDIS evidence via the **two-tier** join (semantic EuroSciVoc-path primary; exact `call_id`/`masterCall` corroboration), **de-duplicating `euroSciVoc` rows by `project_id` before any count** (mandatory — tag rows overstate distinct projects 1.3–2.5×; the tell is `clinical_medical_domain = 31,164` > the 22,531-project health portfolio). It writes `dominant_categories` (title + truncated path) into `Call.keywords / related_topics` — the fields `nodeExtractors.extractTags` and `useCompareData.collectFromElements` already read **unchanged**.
3. **Roll up the hierarchy.** Aggregate child-call evidence to Destination / Programme / Pillar, de-duping projects across overlapping child topics.
4. **Feed the scored-edge path — but correctly.** The backend's `/integrate` ingests scored similarity edges, but `integrate.py` only MERGEs `(:Document)-[:CROSS_TOPIC_SIMILARITY]->(:Document)` stamped `source='he_2025'` — it **cannot** attach to `:Call` nodes. The similarity-edge ideas need a small **new** route that MERGEs `(:Call{id})-[:CROSS_TOPIC_SIMILARITY{score}]->(:Call{id})` under a shared/neutral `source` so the existing `cluster_routes_factory` loader (which requires `a.source = b.source`) returns them. Within-programme edges work today; cross-programme needs either a shared source tag or a new cross-source relationships endpoint.

**Dependency map.** The EuroSciVoc tag backbone (step 2) unblocks: real SearchBox vocabulary, `CompareTopicOverlap`, "calls like this", the contamination-aware topic distribution, and the ScoreFilter similarity edges. The `analysis_summary.json` scalars (no per-Call join needed) unblock: the 6-way theme compare, the Foresight Quadrant, the Hungarian Footprint drawer, the dashboard Evidence Brief, and the National One-Pager. The org-level CSVs (a heavier step) unblock: the Realized-Collaboration layer, the country graph, hub spotlight, and the consortium/partner-finder.

---

## 3. Part A — Enhance existing features

### A1. Real EuroSciVoc topic tags on Call nodes — *the keystone* (score 74)
- **Today:** `Call.tags`/`keywords` resolve **empty** on loaded data (verified: `CEF.grouped.json` calls have `"tags": []`). `extractTags` reads `related_topics || tags || themes`; `collectFromElements` scans `d.tags/d.keywords/related_topics`. All resolve to nothing, so TagChips, SearchBox vocabulary and compare-overlap are dead.
- **CORDIS adds:** de-duplicated dominant EuroSciVoc categories (title + path) written into `keywords/related_topics`, reviving search, hover TagChips and compare-overlap **with zero frontend rewiring**.
- **Data used:** `euroSciVoc.title/path/code`, `projects.topics/masterCall` (join), `project_id` (mandatory de-dup).
- **Integration point:** new `/enrich` step → `Call.keywords`. Consumed unchanged by `nodeExtractors.extractTags`, `callFields.js`, SearchBox, `useCompareData`.
- **v1 quick win:** enrich **only CL1-Health and CL3-Security** calls whose code/theme actually matches realised CORDIS projects (cleanest taxonomy). Top ~5 dominant categories, de-duped, into `Call.keywords`. This surfaces the make-or-break number: the real match-rate against open calls.
- **Honesty caveat:** chips are **[OBSERVED]** "scientific categories of *funded* projects on adjacent codes (CORDIS FP7–HE)", **not** the call's official scope. Sparse/taxonomy-blind themes (data-spaces ~9% flat) show a "taxonomy may lag this theme" note, never a misleading empty row.

### A2. Cross-topic 6-way theme comparison — generalise CompareDrawer 2→N (score 74)
- **Today:** `CompareDrawer` compares **2** programme nodes on budget / #calls / #destinations / topic-overlap, computed client-side.
- **CORDIS adds:** a "Compare themes" mode lining up all **6 CORDIS themes** N-up on pre-aggregated `analysis_summary.json` scalars — **no per-Call join key required**, only the 6 JSON files. Rows: merged portfolio size, FP-tail depth, `repeat_coordinator_count` (cyber 784, AI 1191, data-spaces 2356, quantum 550, health 1899, AI-for-science 2514), `largest_component_share`, `policy_alignment_rate`, HU participation/coordination, HU part:coord vs EU-wide.
- **Data used:** the six `analysis_summary.json` roll-ups (already de-duped).
- **Integration point:** `resolveCompareKeys` accepts CORDIS topic ids; generalise `CompareMetricRow` from `{valueA, valueB}` to `values[]`; data from a new `GET /foresight/topics`.
- **v1 quick win:** vendor the 6 JSON files as static assets, expose a trivial `/foresight/topics`, one-line generalise `CompareMetricRow`, drop a toggle into the existing portal. Skip `CompareTopicOverlap` (nothing real to intersect until A1 lands).
- **Honesty caveat:** render `largest_component_share` (0.96–0.98, near-identical across all 6) as a **binary "fragmentation: ruled out" badge, not a sortable number** — sorting by it invites a forbidden leadership ranking. Disable sort on inference-laden rows. Footer: cannot benchmark non-EU rivals; merged size is not a strength headline (q01 inflates ~3–4×).

### A3. Lens-aware chatbot that flies the graph (score 72)
- **Today:** `ChatBot.js` shows `matched_calls`/`filters` as chips that are **never applied** to the canvas (§6 dead-end).
- **CORDIS adds:** **Slice 1 (the real quick win, no CORDIS data):** make the existing results drive the graph. **Slice 2 (gated on ETL):** inject per-topic evidence so "is Europe a leader in quantum software?" / "where can a HU org lead?" get tier-tagged answers from the core lenses (q02–q04 for Q1, q05 for Q3).
- **Data used (Slice 2):** `analysis_summary.json` per topic incl. HU block; per-lens `core_relevance_rate`.
- **Integration point:** thread `cyInstance` + a `setPendingNav` callback into `ChatBot.js` (both available one level up in `GraphMainColumn`/`GraphPage`); reuse `SearchBox`'s `cy.nodes().difference(matched).addClass('faded')` + `matched.addClass('highlighted')` idiom; `useGlowOverlay` glows the rest. Add a small multi-target highlight pass (`pendingNav` handles one target today).
- **v1 quick win:** ship Slice 1 only — a few-hours change against proven code paths that converts dead chips into a graph driver.
- **Honesty caveat:** Slice 2 needs a **separate** system prompt hard-coding the OBSERVED/INFERENCE/REC contract; inject **pre-tagged sentences** from evidence packs, never raw numbers the LLM can re-narrate; refuse global-leadership/merit and non-EU-benchmark claims; never feed q01 headline counts or tag-row counts. Label any realized figure as historical activity **for the theme**, not for the open 2026 call.

### A4. Funding-by-programme tabs: Supply vs Realized vs Hungarian (score 68)
- **Today:** `FundingByProgramme.jsx` has three tabs (`committed`/`spot`/`forecast`, verified) that render **identical bars** — a visible trust-killer.
- **CORDIS adds:** rebind to Supply (`indicative_budget`, unchanged) / Realized (summed `ecMaxContribution`, de-duped by `project_id`, rolled up via cluster/programme prefix or EuroSciVoc — **not** exact `call_id`) / Hungarian (HU share of realized spend).
- **Data used:** `ecMaxContribution`, `organizations.ecContribution/country/role`, `frameworkProgramme`, `project_id`.
- **Integration point:** add `realizedByProgramme` / `hungarianByProgramme` to `useDashboardData`; component renders the active tab's array.
- **v1 quick win (same-day, no data):** relabel the three tabs to honest distinct views the client already supports — **"Budget (announced)" / "# Calls" / "Avg per call"** from `callsByProgramme`. Kills the three-identical-bars trust-killer today; the Realized/Hungarian tabs follow once the ETL covers one cluster (start CL3).
- **Honesty caveat:** programmes without CORDIS coverage must render "no CORDIS evidence loaded", **never** €0 (reads as "no funding"). Supply vs Realized are **different vintages/call generations** — present as supply-vs-uptake context, never as 2026-call performance. EU contribution ≠ total cost ≠ impact.

### A5. Partnership Readiness block on hover card & NodeDetail (score 68)
- **Today:** static supply-side node info only.
- **CORDIS adds:** a "Realized funding (CORDIS)" block for the 6 covered themes: merged de-duped portfolio size (q01 excluded), `repeat_coordinator_count` **first**, fragmentation verdict, HU part:coord ratio vs EU-wide.
- **Data used:** `analysis_summary.json` portfolio total, `repeat_coordinator_count`, `largest_component_share`, HU block.
- **Integration point:** new metric block in `MetricCards.jsx`/`NodeDetail.js`; resolve node→theme via a **curated crosswalk** (theme ↔ call_id set / EuroSciVoc-path prefixes) served by `GET /cordis/topic/{theme}` — **not** a `topic_id` dictionary lookup (those fields are absent on real call data).
- **v1 quick win:** ship **one** theme on NodeDetail only (e.g. trustworthy-AI → a handful of CL4 call_ids), reusing the existing `MetricCards` `items[]` contract and NodeDetail fetch pattern. The "no CORDIS evidence" empty state is exercised on every other node for free.
- **Honesty caveat:** since `largest_component_share` is 0.96–0.98 for **all** six topics, **never colour "Consolidated core" as positive** — it disproves Q2 fragmentation only and is non-discriminating for leadership; pair it verbatim with "does NOT prove leadership". A mis-mapped crosswalk attaching real-looking [OBSERVED] numbers to the wrong node is worse than showing nothing — flag crosswalk confidence; treat EuroSciVoc-path matches as [INFERENCE].

### A6. Revive ScoreFilter with EuroSciVoc-overlap similarity edges (score 58)
- **Today:** `ScoreFilter.filterByScore()` correctly filters `cy.edges('[type = "CROSS_TOPIC_SIMILARITY"]')` by score and fades unconnected nodes (verified) — dead **only** because no such edges are in loaded data; `palette.edgeColorFor` already styles the type; `EdgeTypeToggle` already has the entry.
- **CORDIS adds:** real edges from Jaccard over de-duped `euroSciVoc.path` sets of the funded-project sets behind each Call, ingested onto `:Call` nodes.
- **Data used:** `euroSciVoc.path` (de-dup by `project_id`), shared funded-org overlap (optional weight).
- **Integration point:** **not** the existing `/integrate` (it hardwires `:Document` + `source='he_2025'`). Add a route that MERGEs `(:Call{id})-[:CROSS_TOPIC_SIMILARITY{score}]->(:Call{id})` under a matching `source`.
- **v1 quick win:** within **one** programme only (CL4 Digital or CL1 Health, 22k+ project topics). Same-source edges render through the existing `/relationships` loader with **no frontend change**. Relabel the slider **"Min scientific-category overlap"**.
- **Honesty caveat:** projecting historical Jaccard onto future calls means a 0 / missing edge = **[INFERENCE: no observed EU-funded taxonomic history]**, NOT "unrelated" — say this at the control. Cross-programme adjacency (the headline) needs the cross-source endpoint; defer to v2.

### A7. FP-Continuity sparkline (FP7→H2020→HE) on theme nodes (score 58)
- **Today:** no realized time dimension; the supply timeline is current-year only.
- **CORDIS adds:** a 3-bar distinct-project-count glyph per framework programme on **theme anchor nodes** (HE_2025 wiki `research_theme`/`cluster` entities), expanding to a year trend on NodeDetail.
- **Data used:** `portfolio.by_framework` (already de-duped by `project_id`), `ecMaxContribution`, `startDate`.
- **Integration point:** new `extractFpContinuity()` in `nodeExtractors.js`; reuse `CallsOverTime.jsx`'s hand-rolled SVG.
- **v1 quick win:** static theme-level glyph on the 6 anchor nodes via a 6-row `theme→node-id` crosswalk; no per-call join, no roll-up, no arrow.
- **Honesty caveat:** **granularity trap** — `portfolio.by_framework` is per **merged topic**, not per call, and a 2026 call matches ~0 funded projects, so bind to the 6 themes, never to Call nodes via `topic_id`. Replace any rising/declining **arrow** with a neutral count; the early-FP tail is a tagging **lower bound**, not real decline. Counts from `portfolio.by_framework`, never EuroSciVoc tag-rows. Show `ecMaxContribution` side-by-side so counts ≠ funding.

### A8. Contamination-aware EuroSciVoc topic distribution — kill the regex (score 42)
- **Today:** `useDashboardData` derives `topicDistribution` by **regex over call IDs** (CL4→Digital, HLTH→Health) — the app's most obviously heuristic chart.
- **CORDIS adds:** a **separate** panel of real EuroSciVoc dominant categories across the 6 CORDIS portfolios, each chip flagged core-lens vs q01-contaminant.
- **Data used:** `dominant_categories`/`path`, per-lens top-10 lists (for the contaminant flag), `project_id`.
- **Integration point:** new panel fed by the `analysis_summary` lookup; **keep** the existing regex chart for the supply-side call view.
- **v1 quick win:** ship as a clearly-titled new panel ("EuroSciVoc categories — 6 CORDIS strategic portfolios"), not a drop-in replacement.
- **Honesty caveat:** **denominator trap** — the dashboard counts open calls across 18 programmes; `dominant_categories` aggregates 6 portfolios. Do not swap one for the other silently. Distinct-project de-dup is a v2.0 method item (forbidden inside the v1.0 freeze) — until a re-baseline, label values "EuroSciVoc field occurrences (cross-lens), not distinct projects".

---

## 4. Part B — New features / layers

### B1. Evidence-tier provenance chips — `<EvidenceTierChip/>` (score 74)
- **What it is:** one reusable badge stamping every CORDIS figure **[OBS]/[INF]/[REC]** with a citation popover (source lens + weight, extraction date / `task_id` / `query_id` from `cordis_queries.yaml`, and the metric-keyed caveat).
- **Data used:** evidence-tier metadata per statement; `cordis_queries.yaml` run-state; per-lens weight/role.
- **Integration point:** presentational component + caveat registry keyed by **metric type**; wraps figures in `MetricCards`, `KpiCard.jsx`, `CompareMetricRow.jsx`, `NodeDetail`. All four targets are simple prop-driven components — adding an optional tier+citation prop is trivial and back-compatible.
- **v1 quick win:** build the chip (3 colour-coded MUI Popover variants) + a hard-coded registry, then wire it to **exactly one** real figure — HU `coordinator_count` per topic (e.g. quantum = 31) — popover citing lens q05, the extraction date, and "counts ≠ funding ≠ impact". This forces the tier+lens+date+caveatKey metadata contract to exist end-to-end before generalising.
- **Honesty caveat:** **the chip must not become theatre.** The tier+caveat must travel with the field from the data contract, **never** be re-keyed in JSX (a hand-labelled INFERENCE-as-OBSERVED would launder the error with false authority). Registry keyed by metric-type so every figure of a type is forced to the same caveat. Hybrid readiness: the component is client-side-now but **inert** until a CORDIS feature emits a tier-tag.

### B2. Portfolio-of-Themes Foresight Quadrant (maturity × momentum) (score 71)
- **What it is:** a new "Foresight" tab in `PortfolioDashboard.jsx` plotting the 6 topics. X = maturity (share predating HE), Y = momentum (HE vs H2020 growth), bubble size = merged **core** portfolio scale, colour = `repeat_coordinator_count`.
- **Data used:** `portfolio.by_framework/year`, merged size, `repeat_coordinator_count`.
- **Integration point:** new `/foresight/topics`; hand-rolled SVG reusing the `FundingByProgramme.jsx` CSS/SVG pattern.
- **v1 quick win:** static-data v1 — transcribe the ~5 numbers per topic already printed in the method's own tables into a committed `foresight_topics.json`, serve trivially, render the scatter. No live pipeline, no join key.
- **Honesty caveat:** **both axes are vintage-confounded** (EuroSciVoc/policy tagging tracks vintage; AI-for-science's q01 was structurally trimmed by the 25k cap). With n=6, do **not** draw hard quadrant dividers implying thresholds; label axes "internal-portfolio structure, not a global ranking"; size by **core** lenses (q02–q04), never q01; colour by `repeat_coordinator_count`, never `largest_component_share`. Defer the graph deep-link (no EuroSciVoc→call_id crosswalk yet).

### B3. Realized-Collaboration layer: drill a Call into its CORDIS org network (score 68)
- **What it is:** one new bottom drill level `CALL > REALIZED` — tap "Expand realized network" to render the organisation/country collaboration graph of the call's **theme**.
- **Data used:** `organizations.*`, `_compute_network` edges (coordinator→participant, co-participation), degree centrality, `n_components`/`largest_component_share`, `repeated_organisations`.
- **Integration point:** `buildElements` is generically typed and ingests arbitrary `{nodes, rels}` with custom types — org/country nodes + `CO_PARTICIPATION`/`COORDINATES` edges flow through with only new palette CSS classes. A genuinely new endpoint/loader is required (`/integrate` ingests Document/Topic, not Org/Country).
- **v1 quick win:** ship a **non-graph** "Realized footprint" panel on NodeDetail/HoveredNodeInfo first — top coordinating countries, `repeat_coordinator_count`, component reading, HU ratio — from `analysis_summary.json` mapped to the call's theme. Proves the theme-join and honesty framing at S/M effort before the XL canvas layer.
- **Honesty caveat:** join on EuroSciVoc-path / prior-edition analogue / strategic-topic portfolio — the literal 2026 `call_id` join is **empty**. A 96–98% giant component rules **out** fragmentation but does not prove leadership (read it from `repeat_coordinator_count`). Size by degree, **never** funding. Mandatory empty-state and a "realized in past editions, not the open 2026 call" provenance line.

### B4. Country co-funding graph with centrality ranking (score 62)
- **What it is:** a standalone "Country network" view per topic — country super-nodes sized by `participation_count`, edges = shared projects, degree/betweenness badges flagging bridge countries; answers "is Hungary a hub or a leaf?".
- **Data used:** `organizations.country/role/project_id`, top countries, degree centrality.
- **Integration point:** aggregate org edges by country pairs co-occurring on a `project_id`; serve as a country-node graph through `buildElements`; centrality via networkx backend-side.
- **v1 quick win:** one static country graph for the **cyber** anchor topic; degree only (defer betweenness), thresholded to ~30–40 readable nodes, Hungary highlighted.
- **Honesty caveat:** nodes are "countries in EU-funded consortia, incl. associated/third countries" (UK is health-AI's #1 coordinator — not "EU member states"). **Correction:** betweenness is **net-new** compute (`_compute_network` does degree only). Encoding fights the caveat — sizing by participation makes the eye read "big = leader"; enforce a persistent "[OBSERVED] participation structure — not leadership/funding/impact" banner and overlay coordinator-concentration so degree ≠ leadership.

---

## 5. Part C — The partnership-evidence & Hungarian-positioning layer (the crown jewel)

This is where the dataset's strategic value is highest: mapping the consultation's three questions — **Q1 global leadership, Q2 behind/fragmented, Q3 Hungarian priority** — into living, citable in-app surfaces.

### C1. Hungarian Footprint Drawer (Q3 latent-leadership) (score 72)
- **What it is:** a portal-rendered drawer mirroring `CompareDrawer`, surfacing for a selected **theme** Hungary's `participation_count`, `coordinator_count`, the part:coord ratio vs EU-wide (the latent-leadership signature — cyber **19.8:1 vs 9.9:1**; quantum **4.3:1 balanced**), and named HU actors (SZTAKI, BME, ELTE, Wigner, Rényi, Semmelweis…) with roles.
- **Data used:** `countries.hungary.{participation_count, coordinator_count, organisations}`, `participant_to_coordinator_ratio` + EU-wide, `repeat_coordinator_count`.
- **Integration point:** reuse the `onCompareSelect` ref-callback wiring (`GraphMainColumn → NestedGraphController → GraphView → setupEvents`) + `createPortal`; data via a **hand-authored theme↔app-node mapping** (the app has no theme nodes; the HU block is per-theme).
- **v1 quick win:** a **static, read-only** panel listing all six themes side-by-side — hand-transcribe the §9 table (the numbers are already in `CORDIS_EVIDENCE_METHOD_v1.0.md`), with tier badges, the quantum counter-pattern called out, and the caveat footer. An NKFIH analyst can draft from it on day one; defer theme↔node mapping and selection wiring to v2.
- **Honesty caveat:** **granularity trap** — figures are per-6-theme aggregate; never let a theme-level [OBSERVED] count masquerade as call-specific. Cite the dedicated count fields, **not** the top-50 display caps (`organisations[]`). Counts = participation frequency, not funding/merit; national-only/private HU R&I is invisible (absence ≠ absence). Quantum must read as balanced, not deficit.

### C2. National Partnership One-Pager Export (score 72)
- **What it is:** a "Generate HU position note" action compiling **one user-selected** topic's CORDIS Hungarian evidence into a tiered Q1/Q2/Q3 brief NKFIH staff paste into the consultation response.
- **Data used:** full HU block, `participant_to_coordinator_ratio`, `repeat_coordinator_count` + named orgs, `portfolio.by_framework`, network reading, `policy_alignment_rate`.
- **Integration point:** export button in `GraphTopBar.jsx`; reads the per-topic `analysis_summary.json`; renders a printable HTML brief (print-to-PDF).
- **v1 quick win:** after the ETL produces **one** topic's JSON (start cybersecurity, 6,449 projects), render a single printable page — header (scale + FP split), Q3 block (HU counts, ratio vs EU-wide, named orgs, all [OBSERVED]), one [INFERENCE] latent-leadership sentence, fixed caveat footer.
- **Honesty caveat:** **topic selection must be an explicit user choice**, never auto-inferred from the graph layer (the 6 topics are query portfolios with no deterministic call-code crosswalk; a mis-bound number reaching the official response is real reputational risk). Prominent **DRAFT / not-for-direct-submission** banner; stamp each figure with its tier and source field; hard-exclude q01 from strength lines; `policy_alignment_rate` = vintage lower bound.

### C3. Replace mock Dashboard cards with a CORDIS Evidence Brief (score 71)
- **What it is:** swap the trust-eroding `RecentActivity.jsx` (`MOCK_ACTIVITY`) and `SavedSearches.jsx` (`MOCK_SEARCHES`) cards (both verified) for a real per-topic Q1/Q2/Q3 brief; **demote** the Frontier/acceleration digest to a guarded second pass.
- **Data used:** `analysis_summary.json` (portfolio, network, hungary, policy), `repeat_coordinator_count`, `largest_component_share`.
- **Integration point:** new cards in `PortfolioDashboard.jsx`; each row deep-links via `setPendingNav` to the matching `clusterKey` (cyber→CL3, AI/data-spaces/quantum→CL4, AI-health→CL1) — `usePendingNav` handles cluster-grain links, so the weak join is **not fatal here**.
- **v1 quick win:** ship **only** the Evidence Brief, **only** Q2 + Q3 lines (both pure [OBSERVED], zero inference risk), for the cluster-mappable topics, fed by a static JSON. Deletes two mock cards and proves the contract on the safest claims.
- **Honesty caveat:** **the Frontier/acceleration digest is the liability** — "HE-era vs H2020 growth" is vintage-confounded (HE projects mid-flight; tagging tracks vintage) and a "frontier is moving here" headline invites a forbidden "Europe out-pacing rivals" read. Demote to [INFERENCE], pair counts with `ecContribution`, or cut for v1. Q2 = fragmentation gated on the 0.70 share rule (>0.96 = "not fragmented", never "leads").

### C4. Hungarian Latent-Leadership overlay — Q3 graph toggle (score 58)
- **What it is:** a "HU Lens" sidebar toggle recolouring Programme/Destination nodes by the HU part:coord ratio vs EU-wide; red = deficit/opportunity (AI-for-science 16.1:1 vs 7.9:1), green = balanced (quantum 4.3:1 vs 2.6:1).
- **Data used:** HU counts, `participant_to_coordinator_ratio` (EU-wide), `repeat_coordinator_count`, named orgs.
- **Integration point:** a `SidebarControls.jsx` toggle (timeline/compare active-class pattern); diverging `hu-deficit-{level}` classes in `palette.js`; a static 6-row crosswalk to cluster keys.
- **v1 quick win:** **fully client-side**, zero backend — a 6-entry static JSON literal transcribed from §9.2/§7.4/§9.3, one toggle, ~4 diverging classes applied to the mapped cluster nodes only, plus a click panel echoing the two [OBSERVED] ratios + actors + tier badges.
- **Honesty caveat:** **do not roll up** the ratio over the hierarchy — with a lossy many-to-many crosswalk, any aggregated ratio is a fabricated [OBSERVED] number. Colour only directly-mapped nodes; everything else is explicit neutral "no CORDIS evidence", never green-by-default. Ratio = [OBSERVED]; "coordination deficit" = [INFERENCE]; "opportunity to lead" = [RECOMMENDATION]. Ratio shows thin funded coordination, **not** that HU lacks capacity.

### C5–C7. Folded national/grant-writer features (build on C1/B3)
- **Consortium-fit & HU partner-finder (score 66):** a "Build a consortium" drawer resolving a call→theme, proposing partners grouped by role/country/activityType with a "HU coordinator" pin. **v1:** read-only "Hungarian partners active on this theme" panel for the 3–4 best-covered themes from a static JSON. [RECOMMENDATION]-tier; co-participation ≠ capacity/quality/availability.
- **Incumbent Network panel (score 52)** and **Whitespace-vs-Incumbent badge (score 52):** theme-level coordinator-concentration readouts answering "who wins here / can I win here". **v1 for both:** a single honest hover-card line for the handful of calls that map, no canvas styling yet. Concentration = [INFERENCE], reads concentration not openness; show nothing (not "open field") where no evidence.
- **Q1/Q2/Q3 node-colouring overlay (score 61):** a segmented control recolouring nodes by an inferred Q1 composite / Q2 fragmentation / Q3 ratio. **v1:** Q3 only (most defensible — a within-CORDIS comparison needing no leadership inference). Discrete buckets, never a gradient; "no CORDIS evidence" is a distinct legend state.

---

## 6. Prioritized roadmap

Sorted by leverage. **Score** = adversarial verdict score (higher = better). Effort and readiness are the **corrected** values.

### Ship now / after one small ETL (client-side or static-JSON)

| # | Idea | Impact | Effort | Data readiness | Score | Quick-win first slice |
|---|------|--------|--------|----------------|-------|------------------------|
| 1 | **A2 6-way theme compare** | high | M | needs-new-backend* | 74 | Vendor 6 JSONs as static assets, trivial `/foresight/topics`, generalise `CompareMetricRow` to `values[]` |
| 2 | **B1 Evidence-tier chips** | medium | S | hybrid | 74 | Build chip + registry, wire to ONE figure (HU quantum coord_count=31) |
| 3 | **A3 Chatbot flies the graph (Slice 1)** | high | M→S | client-side-now* | 72 | Thread `cyInstance`+`setPendingNav` into `ChatBot.js`, reuse `SearchBox` fade/highlight — no CORDIS data |
| 4 | **B2 Foresight Quadrant** | high | M | needs-new-backend* | 71 | Static `foresight_topics.json` (numbers already in method tables) + SVG scatter |
| 5 | **C3 Dashboard Evidence Brief** | high | M | needs-cordis-etl | 71 | Static JSON, Q2+Q3 lines only, deep-link via `setPendingNav` |
| 6 | **C1 HU Footprint Drawer** | high | L | needs-cordis-etl | 72 | Static 6-theme panel from §9 table |
| 7 | **C4 HU Latent-Leadership overlay** | medium | M | hybrid | 58 | 6-entry static JSON + 1 toggle + diverging classes, no roll-up |
| 8 | **A4 Funding tabs (honesty fix)** | high | S→L | client-side-now* | 68 | Relabel tabs "Budget / # Calls / Avg per call" — kills 3-identical-bars today |

\* The *first slice* is client-side / static-data; the full feature needs the backend/ETL.

### Needs the CORDIS ETL + backend work

| # | Idea | Impact | Effort | Data readiness | Score | Quick-win first slice |
|---|------|--------|--------|----------------|-------|------------------------|
| 9 | **A1 EuroSciVoc tag backbone (keystone)** | high | L | needs-new-backend | 74 | Enrich CL1-Health + CL3-Security only; measure real match-rate |
| 10 | **C2 National One-Pager Export** | high | L | needs-cordis-etl | 72 | One topic (cyber), user-selected, printable HTML |
| 11 | **A5 Partnership Readiness block** | high | L | hybrid | 68 | One theme on NodeDetail via curated crosswalk |
| 12 | **A4 Realized/Hungarian funding tabs** | high | L | needs-cordis-etl | 68 | One cluster (CL3), de-dup by `project_id` |
| 13 | **B3 Realized-Collaboration layer** | high | XL | needs-new-backend | 68 | Non-graph "Realized footprint" panel first |
| 14 | **C5 Consortium / HU partner-finder** | high | XL | needs-cordis-etl | 66 | Read-only HU-partners panel, 3–4 themes |
| 15 | **B4 Country co-funding graph** | medium | L | needs-new-backend | 62 | Static cyber country graph, degree only |
| 16 | **C6 Q1/Q2/Q3 overlay** | medium | L | needs-cordis-etl | 61 | Q3-only, Programme nodes, static crosswalk |
| 17 | **A6 Revive ScoreFilter (similarity edges)** | medium | L | needs-cordis-etl | 58 | Within-programme only (CL4 or CL1), new `:Call` MERGE route |
| 18 | **A7 FP-Continuity sparkline** | medium | M | needs-cordis-etl | 58 | Static glyph on 6 theme anchor nodes |
| 19 | **B3-derived Hub-centrality spotlight** | medium | M | needs-new-backend | 58 | One topic (quantum), reuse `palette.js` isHEWiki degree-sizing |
| 20 | **A8 Contamination-aware topic distribution** | low | M | needs-cordis-etl | 42 | New panel, "field occurrences" label (avoids freeze violation) |

**Recommended sequence:** (1) Ship the three no-data honesty wins first — A3 Slice 1, A4 relabel, B1 chip plumbing — they convert dead UI into working features in hours/days and de-risk the interaction patterns. (2) Run the ETL for **2–3 best-covered topics** (cyber, health-AI, trustworthy-AI). (3) Land **A1 the keystone** (unblocks the whole discovery cluster) in parallel with the static-JSON crown-jewel surfaces (C1, C2, C3) that need only `analysis_summary.json`. (4) Then the org-CSV-heavy layers (B3, B4, C5).

---

## 7. Honesty & limits box (non-negotiable — every feature must honor these)

> **CORDIS measures FUNDED ACTIVITY, not scientific merit.** It cannot prove leadership/quality, cannot benchmark non-EU rivals (US/China/private R&D are absent), cannot measure outcomes/impact.

- **Tier every number:** **[OBSERVED]** fact / **[INFERENCE]** reasoned reading / **[RECOMMENDATION]** proposal. The tier must travel with the field from the data contract, never be re-keyed in JSX (B1 enforces this).
- **Counts ≠ funding ≠ impact.** Use `ecContribution` for money claims; participation/coordination frequency is neither funding nor merit.
- **De-dup by `project_id` before any count.** Tag-row EuroSciVoc counts overstate distinct projects 1.3–2.5× (the tell: `clinical_medical_domain = 31,164` > the 22,531-project health portfolio).
- **q01 is contaminated (~3–4× overstatement) and down-weighted** — never a headline strength figure; never feed it into similarity, org graphs, or scale numbers.
- **A 96–98% giant component rules OUT fragmentation but does NOT prove leadership.** Read leadership from `repeat_coordinator_count` + core-lens scale + coordinator concentration. Never sort/colour `largest_component_share` as a strength signal.
- **Vintage bias is real.** `policy_alignment_rate` and EuroSciVoc tagging track project vintage (HE/H2020 era), not strategic relevance — show as a lower bound; FP-tail/momentum comparisons are vintage-confounded.
- **Absence of evidence is not evidence of absence.** "No CORDIS evidence" (most nodes, given only 6 themes; CORDIS omits national-only/private R&I) must render as an intentional state, never as "weak", €0, or "open field".
- **Temporal mismatch:** the app's 2026–27 open calls vs CORDIS's past-funded projects means the literal `call_id ↔ masterCall` join is empty for live nodes — join semantically (EuroSciVoc-path / theme) and label realized evidence as historical, for the **theme**, not the open call.
- **The Hungarian crown jewels are quantum-aware:** the part:coord ratio proves a coordination deficit, not weak capability, and quantum (4.3:1, balanced) is the explicit counter-pattern that must never be flattened into one "latent leadership" story.
