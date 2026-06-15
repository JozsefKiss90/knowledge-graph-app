# CORDIS Evidence Method — v1.0 (definitive specification)

**A reproducible method for turning the CORDIS project portfolio into consultation-grade evidence for
the European Partnerships 2028–2034 process (Hungarian / NKFIH input).**

**Status.** v1.0 — **frozen**. First validated end-to-end on the pilot topic
`cybersecurity_pqc_secure_software` (2026-06-10) and then re-applied **without modification** to five
further topics (2026-06-10/11). This is the definitive multi-topic edition: it documents the rules the
pipeline already implements and records the cross-topic evidence that the freeze held. The frozen
elements — the five-lens design, the core-relevance metric, the q01 contamination handling, the 0.70
largest-component-share network rule, the policy-vintage rule, the Q1–Q3 indicator system, the
canonical-vocabulary rule, the evidence hierarchy and the reproducibility rules — **may not change
within v1.0**; changing any of them requires a version bump and a changelog entry (§16).

**Scope.** Method only. It does not change the pipeline architecture; it documents
`extraction_workflow.py → parse_exports.py → analyse_topic.py → build_evidence_pack.py` so that results
are auditable and repeatable. Per-topic *vocabulary and labels* are swapped per topic (this is what the
method **requires** per topic and does **not** bump the version); no threshold, formula, contract or
interpretive rule is touched.

**The six topics processed under this frozen method.** (Merged portfolio size in parentheses.)

| # | Topic id | Short | Merged projects |
| --- | --- | --- | --- |
| 1 | `cybersecurity_pqc_secure_software` | cyber (v1.0 anchor) | 6 449 |
| 2 | `trustworthy_ai_sovereign_ai_agents` | trustworthy-AI | 11 466 |
| 3 | `data_spaces_digital_twins_interoperable_data_infrastructure` | data-spaces | 22 992 |
| 4 | `quantum_software_quantum_algorithms_quantum_ai_interfaces` | quantum | 5 787 |
| 5 | `ai_for_health_mental_health_personalised_care` | health-AI | 22 531 |
| 6 | `research_innovation_automation_ai_for_science_public_administration` | AI-for-science | 27 327 (largest; the only one hit by the 25 000 export cap) |

---

# 1. Introduction

## 1.1 Motivation

The European Commission has opened a thematic consultation on the **European Partnerships to be launched
in 2028–2034** under the next R&I Framework Programme. Hungary (NKFI Hivatal / NKFIH) submits **one
consolidated national response** (member-state deadline **2026-06-12**). Hungary currently co-funds
**~EUR 10.625 million per year across 19 EU co-funded partnerships**. The proposed themes must be of
**European scale**, not tied to a single region.

A national position on *which themes deserve a Partnership* needs a defensible, quantitative evidence
base rather than opinion. CORDIS — the EU's official public repository of Framework-Programme projects
(FP1–FP7, Horizon 2020, Horizon Europe) — is that base: it is the same source the Commission itself
publishes, and its **Data-Extraction (DET) API** returns structured project records (participation,
coordination, funding, EuroSciVoc topic tagging, policy-priority flags, framework-programme continuity)
that can be traced to a specific query and a downloaded export.

## 1.2 Research questions

The consultation asks three questions (translated from the NKFIH call):

- **Q1 — Global leadership.** In which thematic areas is Europe a *global R&I leader*, where a Partnership
  should be launched to maintain/strengthen that lead?
- **Q2 — Behind / fragmented.** In which areas is Europe *behind or fragmented*, necessitating a
  Partnership?
- **Q3 — Hungarian priority.** In which areas, from Hungary's RDI/KFI priorities, is a Partnership needed?

## 1.3 Evidence philosophy

Three principles govern every output:

1. **Portfolio data describes *funded activity*, not *scientific merit*.** CORDIS can indicate the
   volume, persistence, structure and Hungarian footprint of EU-funded activity; it **cannot** prove true
   scientific leadership, measure Europe against non-EU rivals, or measure outcomes/impact (citations,
   patents, talent and private/national R&D are outside CORDIS). Q1/Q2 "leadership" and "behind"
   conclusions are therefore always **inferences from internal structure**, never measurements against a
   global benchmark.
2. **No single query is both complete and clean.** Each topic is probed through **complementary lenses**
   (§3), read for their declared roles, because recall and precision cannot be maximised in one query.
3. **The evidence hierarchy is never blurred.** Every statement is tagged `[OBSERVED]` (a direct fact
   from the data), `[INFERENCE]` (a reasoned reading of indicators) or `[RECOMMENDATION]` (a proposal for
   NKFIH consideration). See §14.

---

# 2. Architecture

## 2.1 The CORDIS Data-Extraction (DET) API

Base URL `https://cordis.europa.eu/api/dataextractions`. Five endpoints (`getExtraction`,
`getExtractionStatus`, `listExtractions`, `cancelExtraction`, `deleteExtraction`); all GET except
`deleteExtraction` (DELETE). The top-level shape is always `{ "status": true, "payload": { … } }`. The
client is `src/cordis_client.py` (`CordisClient`). Two operational facts are handled explicitly:

- **`taskId` (request) vs `taskID` (response).** The request query parameter is spelled `taskId`
  (lowercase d); the response field is `taskID` (uppercase ID). `extract_task_id()` reads `taskID` first
  then `taskId`; the client always *sends* `taskId` and *reads* `taskID`.
- **The 25 000-result export cap.** `getExtraction` rejects any query matching more than 25 000 projects
  (`status:false`, "Your query produced more than 25000 results"). This bit only AI-for-science (§12).

`outputFormat` defaults to `json`, `archived=false`. All HTTP goes through `_request` with a timeout and
up to 3 retries/backoff on network errors / 5xx. The API key is read only from `ROOT/.env`
(`CORDIS_API_KEY`) via `utils.get_api_key()` and **never printed, logged or committed** — every log line
and every saved response passes `utils.redact_key`.

## 2.2 The five-lens architecture

CORDIS is queried through **five complementary lenses per topic**, declared in
`config/pilot_topics.yaml` (`seed_queries`) and executed from `config/cordis_queries.yaml` (the run
registry, kept in sync manually). Each lens carries a stable `query_id` (`<topic_id>_qNN`). The lens
roles are fixed (§3); only the query strings and vocabulary change per topic.

## 2.3 Merge strategy

`analyse_topic.py` concatenates the per-lens processed tables and **de-duplicates projects and
organisations by id**, producing one merged portfolio per topic. The merged total is **not** the sum of
the lenses: lenses overlap heavily and the overlap structure is itself a finding (§3.3). The broad q01
lens is read for context; the merged total is always reported with the q01-contamination caveat (§4).

## 2.4 The evidence pipeline (five stages, strictly separated)

```
1. EXTRACTION  src/extraction_workflow.py + cordis_client.py
   per lens: create → poll (interval 10s, timeout 1800s, until progress=="Finished" AND
   destinationFileUri present) → download ZIP → unzip → write metadata.json → record run-state
   into config/cordis_queries.yaml (task_id, date_executed, status, raw_zip_path).
        data/raw/<topic>/<query>/   →   data/extracted/<topic>/<query>/
2. PARSE       src/parse_exports.py  (topic-agnostic; never changed across topics)
   the real DET export nests project JSON inside a nested json.zip; each project's data lives under
   relations.associations (organisations, programmes, calls) and relations.categories (EuroSciVoc,
   funding scheme, policyPriorities). Writes five fixed-column CSVs per query, each ALWAYS with its
   contract header even when empty, plus parse_report.json (shape_counts, unknown_keys,
   policy_priority_columns).
        data/processed/<topic>/<query>/{projects,organizations,euroSciVoc,policy_priorities,topics}.csv
3. ANALYSE     src/analyse_topic.py
   _apply_topic_vocab(topic) rebinds CORE_RELEVANCE_KEYWORDS / ADJACENCY_KEYWORDS / label from the
   additive TOPIC_VOCAB registry (--topic; unknown topics keep frozen cyber defaults). Merges &
   de-dups, then computes portfolio, countries, organisations, euroscivoc (+ adjacency_flags), policy
   (+ alignment rate), network, fragmentation, and per-lens summaries (incl. core_relevance_rate).
        outputs/tables/<topic>/*.csv  +  analysis_summary.json   (the sole contract to the builder)
4. BUILD       src/build_evidence_pack.py
   renders the 14-section evidence pack from analysis_summary.json; per-topic labels/prose from the
   additive TOPIC_LENS_ROLES + TOPIC_NARRATIVE registries (_apply_topic_profile). Every statement
   tagged [OBSERVED]/[INFERENCE]/[RECOMMENDATION]; §4-gated network reading; Q1 rests on cores q02–q04.
        outputs/evidence_packs/<topic>_evidence_pack.md
5. CROSS-TOPIC REPORTING (per topic, no new code)
   QUERY_LENS_COMPARISON_REPORT_<topic>.md (q01–q05 compared + contamination + lens weighting) and
   FULL_MULTI_LENS_COMPLETION_NOTE_<topic>.md (method-fidelity proof + findings + quota note),
   topic-suffixed so prior deliverables are preserved byte-identically. Final integration:
   outputs/evidence_packs/EUROPEAN_PARTNERSHIP_SYNTHESIS_2028_2034.md.
```

## 2.5 The analysis pipeline (`analyse_topic.py`)

Computes, per merged topic: `_compute_portfolio` (by framework programme / year / status / funding
scheme); `_compute_countries` (top participating / coordinating); `_compute_organisations` (top
coordinators / participants / `repeated_organisations`); `_compute_euroscivoc` (`dominant_categories`
+ `adjacency_flags` from `ADJACENCY_KEYWORDS`); `_compute_policy` + `policy_alignment_rate`;
`_compute_network` (§7); `_compute_fragmentation` (gated on the 0.70 largest-component-share threshold;
`repeat_coordinator_count`, `hungarian_coordinator_count`, `participant_to_coordinator_ratio`); and
`_compute_all_lenses → _compute_lens_summary` (per-lens projects, FP mix, top-10 EuroSciVoc, top-10
coordinating countries/coordinators, Hungarian participation/coordination, policy coverage and
`core_relevance_rate`).

## 2.6 Evidence-pack generation (`build_evidence_pack.py`)

Renders 14 sections from `analysis_summary.json` read defensively (`.get` with defaults; valid
placeholder output marked "pending live extraction" when `data_status=="no_data"`). The §4-gated network
helper `_network_reading(n_components, largest_share)` reuses the `share≥0.70` consolidated-core branch
unchanged. Section 5 distinguishes the five sub-portfolios; the executive summary flags q01
contamination; the Q1 paragraph rests on cores q02–q04, not q01.

---

# 3. Query-lens philosophy

## 3.1 The five lens roles

| Lens | Role | Design intent | Recall / precision | Weight |
| --- | --- | --- | --- | --- |
| **q01 — broad** | Contextual | maximal recall; the whole strategic universe of the topic | high recall, **low precision** | **soft / down-weighted** |
| **q02 — current-programme core** | Core evidence | the theme scoped to the current programme / core sense | low recall, **high precision**, policy-aligned | **core** |
| **q03 — frontier sub-topic** | Core evidence | the emerging/strategic sub-area (e.g. PQC, sovereign AI, digital twins, quantum-AI, digital mental health) | narrow, **thematically distinct** | **core (the frontier)** |
| **q04 — adjacent core / ecosystem** | Core evidence | the adjacent core or ecosystem (e.g. secure software, AI agents, interoperable infrastructure) | medium / medium | **core (caveated)** |
| **q05 — member-state lens** | Hungarian positioning | topic projects with `relatedRegion/region/euCode=HU` | national footprint | **Hungarian positioning** |

## 3.2 Why multiple complementary lenses outperform a single query

1. **Recall and precision are split across lenses on purpose.** The broad lens guarantees nothing is
   missed; the narrow lenses guarantee the core is identifiable. Neither alone is sufficient — a broad
   query can look healthy while the frontier is empty, or vice versa.
2. **A lens is never silently dropped.** Even a contaminated lens (q01) is retained as *context* and as
   the superset from which cores are filtered; it is **down-weighted, not excluded**.
3. **Strength is located, not just counted.** The same topic shows different leaders per lens — e.g.
   cyber: PQC frontier = FR/UK/DE + Israel + photonics, current-cyber = Greece/Spain, secure-software =
   German industry. Q1 answers must name *where* in the topic Europe leads.

## 3.3 Lens-overlap structure is itself a primary finding

The relationship between q01 and the narrow lenses varies dramatically and is reported, never assumed:

| Topic | q01 vs narrow lenses | Net-new from narrow lenses | Interpretation |
| --- | --- | --- | --- |
| quantum | **total superset** (q02–q05 add 0 net-new); q01 53% unique-only (pure physics) | 0 | narrow lenses are pure re-weighting filters |
| cyber | near-superset (q01 ≈ 96% of merged) | 249 | filters, not new-project finders |
| trustworthy-AI | near-superset (q01 ≈ 94%) | 653 | filters |
| health-AI | moderate filter (q01 = 79.9% of merged) | 4 534 | q03 mental-health only 48% inside q01 — most distinct lens |
| data-spaces | **partly separate ecosystems**; q04 48% unique-only | 8 294 (36% of merged) | lenses are distinct ecosystems, not one field five ways |
| AI-for-science | **cap-trimmed near-subset**; q01 0% unique-only | 3 140 | the 25 000 cap forced q01 below the narrow-lens union (§12) |

The method reads q01 for its broad/contextual role **regardless** of whether it is a strict superset.

---

# 4. Contamination analysis

## 4.1 Definition

The broad lens trades precision for recall, so its generic terms import **tangential domains**. This is
detected, quantified and contained — never ignored.

## 4.2 Detection

Two independent signals:

1. **Core-relevance gap.** q01's `core_relevance_rate` is markedly below the core lenses *where the
   taxonomy can discriminate* (cyber: 31.5% vs 54–65%; quantum: 19.4% vs 32–38%; AI: 23.9% vs 18–32%;
   health: 46.8% vs 58.8–61.3%).
2. **Composition.** q01's top EuroSciVoc categories include off-topic domains absent from the cores
   (cyber: `climatic changes`, `governance`, `ecosystems`, `business models`, `agriculture` — pulled by
   `resilience`; data-spaces: `satellite technology`, `ecosystems`, `climatic changes` — from
   Copernicus / Destination-Earth-adjacent EO).

**Critical caveat:** on taxonomy-blind topics the core-relevance gap **vanishes** and only composition
works. Data-spaces q01 (8.96%) is *barely below* q02 (9.47%) because EuroSciVoc is blind to the defining
terms (§5, and `KNOWN_TAXONOMY_LIMITATIONS.md`). There, contamination is read from **composition and
lens-overlap structure only**.

## 4.3 Interpretation & down-weighting (containment rules)

1. **Never** use broad-lens headline counts as evidence of topic strength. The q01 headline overstates
   the genuine core by roughly **3–4×** (cyber ~3×; AI 3–4×; health 3–4×; quantum ~3.1×). The Q1
   leadership claim rests on the **core lenses q02–q04**; the Q3 claim on q05.
2. The evidence pack must (a) flag the contamination in the executive summary, (b) carry the per-lens
   breakdown (Section 5), and (c) anchor the Q1 paragraph on the cores.
3. The broad lens is **demoted to contextual / soft-weight**, supplying breadth and historical backdrop
   only.

## 4.4 Role in evidence synthesis

Contamination handling is *why* the merged total is never the headline strength figure. The synthesis
quotes the merged total only as portfolio scale and immediately localises strength to the core lenses.

---

# 5. The canonical vocabulary rule

## 5.1 Motivation

`core_relevance_rate` is computed by **case-insensitive substring** match of core vocabulary against
EuroSciVoc `title + " " + path`. A bare substring against a controlled vocabulary produces systematic
false positives, so the vocabulary must use only **high-specificity canonical terms**.

## 5.2 Collision analysis — two exclusion reasons, kept distinct

- **(a) OBSERVED COLLISION** — the token matches out-of-scope fields that *exist* in the taxonomy
  (bare `quantum` → physics; `automation` → engineering; `governance` → sociology/crisis-management;
  `graph` → geography/graphene). Excluded/replaced.
- **(b) NO NODE (0 rows)** — the token matches *nothing* in the current vintage. Excluded from the proxy
  but **retained as a taxonomy-ahead canonical term**, captured only by the query lenses.

## 5.3 Safe replacements (worked)

`graph` → `knowledge graph` / `graph theor`; `edge` → `edge comput`; `FAIR` → `fair data`; `sharing` →
`data sharing`; `governance` → `data governance` (data-spaces) or `political science` + `public
administration` (AI-for-science); bare `ai` → `artificial intelligence` (+ ML/DL/neural/NL/CV); bare
`quantum` → `quantum comput` / `quantum information` / `quantum algorithm` / `quantum software`; bare
`science` / `research` / `policy` → excluded (universal or near-empty). Full table and row-count
evidence: `KNOWN_TAXONOMY_LIMITATIONS.md` §4.

## 5.4 Domain-specific adaptation — the include/exclude decision inverts by topic

The defining per-topic decision is **which dominant contaminant axis to discriminate**:

| Topic | Decision | Rationale |
| --- | --- | --- |
| cyber | keep generic `software` but **flag** it | secure-software core is a subset of the `software` tag |
| trustworthy-AI | **exclude** bare `ai` | collides with chain/domain/training |
| data-spaces | exclude `graph`/`edge`/`fair`/`sharing`/`governance` | all collision-prone; defining terms 0-row |
| quantum | exclude bare `quantum` (in-scope software vs out-of-scope physics) | 2 252/3 621 bare-`quantum` rows are physics |
| health-AI | **exclude** AI method terms (`artificial intelligence`/`machine learning`/`deep learning`) | axis = health domain vs generic NON-health AI |
| AI-for-science | **inversely RETAIN** the AI method layer | the science half has no taggable application node (`science` universal at 116 473 rows) |

**The same token can be core in one topic and contaminant in another.** Every adaptation is documented in
`docs/parser_extensions_<topic>.md` with verified row counts. Canonical terms matching 0 rows are kept
whole as taxonomy-ahead markers; the proxy is always read alongside the per-lens top-10 EuroSciVoc list.

---

# 6. Core-relevance proxy

## 6.1 Definition

Per lens, `core_relevance_rate` = the share of the lens's projects carrying **at least one EuroSciVoc
field** matching the topic's `CORE_RELEVANCE_KEYWORDS` (case-insensitive substring vs `title + " " +
path`, evaluated once per project), computed in `_compute_lens_summary`.

## 6.2 Interpretation

- A **relative precision proxy across lenses**, not an absolute. Comparative use is the valid use
  (cyber q01 31.5% vs q02–q04 54–65% is *the signal*).
- A markedly low broad-lens value flags contamination (§4).

## 6.3 Limitations (carry them every time the metric is quoted)

- **Lower bound.** A genuinely on-topic but untagged project counts as *not* core-relevant, so true
  precision ≥ the metric. On taxonomy-blind topics it is a **strict** lower bound and may not discriminate
  at all (data-spaces 8–11% flat).
- **Generic-term inflation.** Broad keywords inflate the score (cyber q04's 65% is driven by the generic
  `software` tag, not by *secure* software). Inspect the top-10 EuroSciVoc list alongside the number.
- **EuroSciVoc coverage varies by vintage** (§8), so the metric is most comparable across lenses of
  similar age.

## 6.4 Topic-specific behaviour (observed)

| Topic | q01 core-rel | core lenses | Discriminating? | Taxonomy maturity |
| --- | --- | --- | --- | --- |
| health-AI | 46.8% | 58.8–61.3% | **yes (best-behaved)** | mature |
| cyber | 31.5% | 54–65% | yes | emerging |
| AI-for-science | 32.5% | 33.4–40.2% | weak | policy-driven |
| trustworthy-AI | 23.9% | 18.1–31.7% | weak (lower bound) | taxonomy-blind |
| quantum | 19.4% | 32.4–37.6% | yes (computing-vs-physics) | emerging |
| data-spaces | 8.96% | 8.4–10.8% | **no (flat / non-discriminating)** | policy-driven |

Where the proxy does not discriminate, interpretation shifts to composition, lens-overlap, FP-vintage and
repeat coordinators (§13, and `KNOWN_TAXONOMY_LIMITATIONS.md`).

---

# 7. Network analysis

## 7.1 Construction

`_compute_network` builds an organisation collaboration graph (nodes = organisations; edges =
coordinator→participant and co-participation within each project) and computes `n_components`,
`largest_component_size`, degree `centrality` (networkx; a union-find fallback supplies component sizes
when networkx is absent), and **`largest_component_share` = largest_component_size / n_nodes**.

## 7.2 The cardinal rule: component COUNT alone is not fragmentation

A high number of components is meaningless if one giant component holds almost everything. Interpretation
is gated on `largest_component_share` (`_network_reading`, the §4 0.70 threshold):

| Condition | Interpretation | Consultation reading |
| --- | --- | --- |
| `n_components ≤ 1` | single connected network | consolidated (Q1) |
| `largest_component_share ≥ 0.70` | "highly connected core with peripheral disconnected components" | consolidated core (Q1); **NOT** fragmented |
| many components **and** `share < 0.70` | genuinely fragmented | fragmentation (Q2) |

## 7.3 `largest_component_share` across the six topics

| Topic | n_components | largest_component_share |
| --- | --- | --- |
| cyber | 124 | 0.9725 |
| trustworthy-AI | 142 | 0.9804 |
| data-spaces | 301 | 0.9783 |
| quantum | 33 | 0.9769 |
| health-AI | 306 | 0.9676 |
| AI-for-science | 514 | 0.9612 |

## 7.4 Why giant components disprove fragmentation but do not prove leadership

A ~96–98% giant component is **expected of any CORDIS co-participation graph** — every topic shows one.
The share therefore **rules OUT fragmentation** (it disproves the Q2 "scattered one-off consortia"
reading) but is **non-discriminating** for leadership: it cannot distinguish a strong field from a weak
one. **Leadership must instead be read from `repeat_coordinator_count`** (cyber 784, AI 1 191,
data-spaces 2 356, quantum 550, health 1 899, AI-for-science 2 514), the scale and policy-alignment of
the core lenses, and EU-member coordinator concentration. `repeat_coordinator_count` is the true count;
`repeated_organisations` displays only the top 50, so claims must cite the count, not the display cap.
Centrality identifies the hub organisations that anchor the core.

---

# 8. Policy-priority analysis

## 8.1 Coverage

`policyPriorities` is a `relations.categories` classification (`attributes.classification ==
"policyPriorities"`), captured by `parse_exports.py`. `analyse_topic.py` reports `policy_coverage_rate`
(per lens) and `policy_alignment_rate` (merged) = the share of projects with ≥1 non-empty policy value.

## 8.2 The cardinal rule: policy coverage tracks project VINTAGE, not strategic relevance

The tag exists only on Horizon Europe / H2020-era projects; older framework-programme projects predate it.
A current-programme lens scores high (cyber q02 = 95.7%); an FP-heavy lens scores low (cyber q03 = 27.8%,
q04 = 15.9%) **as an age artifact, not weak alignment**.

## 8.3 Framework dependence & interpretation rules

1. Compare policy coverage **only within comparable vintages** (e.g. a Horizon-only slice).
2. **Low coverage in an FP-heavy lens is never evidence of weak policy alignment.** Say so explicitly.
3. Treat presence as a binary signal in v1.0.
4. The **merged** `policy_alignment_rate` is therefore a vintage-driven **lower bound**
   (cyber 0.38, AI 0.35, data-spaces 0.22, quantum 0.25, health 0.28, AI-for-science 0.22) and must be
   labelled as such — the low AI-for-science 21.6% (5 893 distinct projects) reflects its deep FP-tail,
   not weak alignment. Detection hints in `parse_exports.py` (`policypriorit, policy, flagship,
   destination`) generalise; no per-topic change needed.

---

# 9. Hungarian positioning analysis

## 9.1 Participation & coordination

Hungarian participation is detected via `country ∈ {HU, Hungary, Magyarország}` (case-insensitive); a
Hungarian coordinator is `role == "coordinator"` (or any role starting `coord`).
`countries.hungary.{participation_count, coordinator_count, organisations}` and the q05 lens carry the
national footprint.

## 9.2 The Hungarian footprint across the six topics (merged)

| Topic | HU participations | HU coordinations | HU part:coord ratio | EU-wide ratio | Reading |
| --- | --- | --- | --- | --- | --- |
| AI-for-science | **3 278** (largest) | 203 | 16.1:1 | 7.9:1 | largest base, thinnest coordination (#7 coordinator of its own q05 projects) |
| data-spaces | 2 005 | 108 | 18.6:1 | 8.7:1 | broad multi-actor base (SZTAKI leads q05 with 15) |
| health-AI | 1 332 | 100 | 13.3:1 | 6.3:1 | 2nd-largest base; #5 coordinator of own projects |
| trustworthy-AI | 790 | 52 | 15.2:1 | 8.1:1 | latent leadership; academic+industry+SME base |
| cyber | 632 | 32 | 19.8:1 | 9.9:1 | broad participation, firm/SME-led coordination |
| quantum | 132 (smallest) | 31 | **4.3:1 (most balanced)** | 2.6:1 | smallest base but #1 coordinator of own q05 projects; theory/algorithm-led (BME, ELTE, Rényi, Wigner) |

## 9.3 Leadership capacity, latent leadership & national strategic positioning

- **Existing presence** (participation) shows the theme is already nationally relevant (Q3).
- **Latent leadership** is the signature pattern: Hungary participates broadly but coordinates rarely
  (HU part:coord ratio well above the EU-wide ratio in five of six topics). Quantum is the exception —
  the most *coordination-balanced* topic, where Hungarian strength is theory/algorithm-led.
- **Coordination deficit → instrument design.** Where participation is strong but coordination thin, the
  recommendation is a Partnership instrument that **lowers the barrier to Hungarian-led consortia**,
  converting participation into coordination. Recurring Hungarian actors across topics: HUN-REN SZTAKI,
  BME, ELTE, the HUN-REN institutes (Wigner, Rényi, Institute of Experimental Medicine), Semmelweis,
  Szeged, Debrecen, Óbuda, Pázmány, Corvinus, CEU, Bay Zoltán, plus industry (Ericsson Magyarország,
  Atos Magyarország) and the NKFIH agency itself.

---

# 10. Adversarial review protocol

## 10.1 The multi-agent review process

An adversarial multi-lens / multi-agent QC review is run over each topic's finished deliverables
(evidence pack + comparison report + completion note + parser-extension doc + source). Each reviewer
"lens" targets one error category and emits structured findings to `outputs/logs/<topic>_review_findings.txt`.
Categories include `q01_contamination`, `canonical_vocabulary`, `unsupported_claims`,
`executive_assessment`, `euroscivoc_limitations`, `policy_priority`, `hungarian_positioning`,
`network_interpretation` and `reproducibility`.

## 10.2 Finding format & PASS / PARTIAL / FAIL handling

Each finding has the header `=== [N] <category> / <id> / <verdict> ===` followed by three labelled
fields: **ISSUE** (the defect), **LOC** (exact file + section/line — the verifiable evidence) and **FIX**
(the precise correction). The three-tier verdict:

- **PASS** — claim verified, no change needed.
- **PARTIAL** — essentially right but imprecise / internally inconsistent / selectively evidenced; must
  be reworded or qualified (the bulk of findings).
- **FAIL** — a materially wrong `[OBSERVED]` number requiring recompute or explicit relabel.

In the health-AI review of 15 findings, exactly **one** was FAIL (`uc-1`) and the rest PARTIAL.

## 10.3 Evidence verification & correction workflow

Verification is **evidence-based**: each finding cites the conflicting numbers/lines in *two* artifacts
(e.g. evidence-pack figure vs `analysis_summary.json` field vs source line) so the claim can be checked
independently. The correction workflow then either **relabels** (lowest-risk, preserves byte-identical
reproduction of frozen topics) or **recomputes**, editing the named file/line. The canonical FAIL,
`uc-1`: EuroSciVoc "dominant category" counts in Section 9 are tag-**rows** summed across the five
overlapping lenses yet were tagged `[OBSERVED]` under a column headed "Projects" — overstating distinct
projects 1.3–2.5×; the FIX is to de-duplicate by `(project_id, title)` and count distinct `project_id`,
**or** relabel the column "EuroSciVoc field occurrences (cross-lens)". The tell-tale that proves the
flags are row counts: `clinical_medical_domain` = 31 164 > the 22 531-project health portfolio. This
quirk is **disclosed wherever cited** rather than silently changed, to preserve the freeze (§13).

---

# 11. Reproducibility

1. **Byte-identical regeneration.** Re-running `analyse_topic.py` + `build_evidence_pack.py` for every
   prior topic after a new topic's additive changes yields **0 non-timestamp diff lines** across all
   prior evidence packs and `analysis_summary.json` files (only `generated_at` / `Generated:` differ);
   outputs are then restored via `git checkout`. Same config + same local data ⇒ same outputs.
2. **Topic isolation.** Each topic is fully namespaced by `<topic_id>` under `data/raw`, `data/extracted`,
   `data/processed`, `outputs/tables`, and topic-suffixed pack/report files, so adding a topic cannot
   perturb a frozen one. Per-topic vocabulary and labels live in **additive registries** (`TOPIC_VOCAB`,
   `TOPIC_LENS_ROLES`, `TOPIC_NARRATIVE`); unknown topics keep frozen cyber defaults.
3. **Config-driven, no hard-coding.** All lenses live in `config/pilot_topics.yaml` (seed) and
   `config/cordis_queries.yaml` (executable registry); every lens carries a stable `query_id`; nothing is
   hard-coded in source.
4. **Auditable run state.** After each query the registry records `task_id`, `date_executed`, `status`,
   `raw_zip_path` (so `cordis_queries.yaml` doubles as a run log); each run writes a timestamped
   `outputs/logs/<name>_<timestamp>.log`; quota events go to `<topic>_quota_management.log`; review
   verdicts go to `<topic>_review_findings.txt`.
5. **Strict stage separation + deterministic contracts.** `raw → extracted → processed → tables →
   evidence_packs` are never mixed; each stage is independently rerunnable; every CSV is written with its
   contract header even when empty; `analysis_summary.json` (incl. `lenses[]`) is the **sole contract**
   between analyse and build; column sets are fixed.
6. **Secret hygiene.** API key read only from `.env`, never printed/logged/committed; all logging and
   saved responses pass `utils.redact_key`; `.env` git-ignored (`.env.example` template); saved responses
   dumped to `outputs/logs/api_responses/<endpoint>_<timestamp>.json` after redaction.
7. **No invented fields.** Tolerant candidate-key lookups reconciled against the real export plus
   `DET_fields_description` / Swagger; unmapped top-level keys recorded in `parse_report.json::unknown_keys`;
   the assumed pre-data field names were corrected **once** against the first live export
   (`LIVE_Q01_VALIDATION_REPORT.md`, `parse_exports.py` only). Across all six topics the export was
   structurally identical (same five `unknown_keys`, same single `policyPriorities` column), so **no
   parser extension was ever required**.
8. **Backward compatibility.** Per-topic changes are additive vocabulary/label swaps only; the proof of
   cross-topic comparability is the byte-identical reproduction in (1).
9. **Re-run sequence (any topic).**
   ```
   python src/extraction_workflow.py --query q01   # …repeat per lens
   python src/parse_exports.py
   python src/analyse_topic.py --topic <topic_id>
   python src/build_evidence_pack.py --topic <topic_id>
   ```

---

# 12. Quota management

## 12.1 CORDIS extraction limits

The CORDIS profile caps the **number of stored server-side extractions** (the cyber pilot hit the cap at
5). Independently, `getExtraction` rejects any single query matching **more than 25 000 results**.

## 12.2 Deletion strategy

Each topic driver runs its lenses sequentially and, immediately after a lens's result ZIP is verified
present on local disk, **deletes that lens's extraction server-side** (`DELETE /deleteExtraction`) to
free quota before the next lens runs. Pre-existing extractions are captured as **protected** at driver
start and never touched, so the server-side count never exceeds 2 and returns to 1 after each lens.
Untouched extractions also auto-expire (~24 h). **Server-side deletion is a user-authorised action**,
logged like any API call.

## 12.3 Local preservation

**All local raw ZIPs are retained** under `data/raw/<topic>/<query>/` (e.g. health-AI q01 142 MB …
q05 13 MB; AI-for-science q01 178 MB … q05 25 MB). Server-side deletion frees quota **without losing
data**, because parse/analyse run off the retained local ZIPs — every prior topic reproduces
byte-identically from local data.

## 12.4 The 25 000-result cap (AI-for-science)

The first AI-for-science q01 design — the full four-family union (AI-for-science ∪ research-automation ∪
GovTech ∪ research-management) — was rejected at create-time for exceeding the cap. q01 was re-scoped,
sized empirically with count-probes (each created, read, then immediately deleted), to the **broadest
union that lands under the cap**: AI-for-science ∪ research-automation = 18 530 (under) → + GovTech-core
= 24 187 (adopted) → + GovTech-tail = >25 000 (rejected). This is explicitly a **data-extraction
constraint, not a methodology change** (`docs/parser_extensions_ai_for_science.md` §2a); its one
structural consequence (q01 becomes a 0%-unique near-subset of the narrow lenses) the method absorbs
unchanged.

## 12.5 Audit trail & reproducibility guarantees

Every protect/run/success/delete event is written to `outputs/logs/<topic>_quota_management.log` with the
protected set at start, the server-side count after each delete, and the local-ZIP-retained note;
`config/cordis_queries.yaml` additionally records per-lens `task_id`/`date_executed`/`status`/`raw_zip_path`.
Because all local ZIPs are retained, deletion never affects regeneration.

---

# 13. Evidence hierarchy

Every statement in every output is tagged with exactly one tier, and the tiers are **never blurred**:

1. **`[OBSERVED]`** — a direct fact from the extracted data ("the merged portfolio is 6 449 projects";
   "Hungarian coordinator count = 32"). Straight from the normalised tables and `analysis_summary.json`.
2. **`[INFERENCE]`** — a reasoned reading of observed indicators, tied to the specific signals that
   justify it ("the high repeat-coordinator count and cross-FP continuity suggest a mature, consolidated
   community"). All Q1/Q2 leadership/behind conclusions are inferences (CORDIS cannot benchmark non-EU
   rivals).
3. **`[RECOMMENDATION]`** — a policy suggestion presented as a *proposal for NKFIH consideration*,
   explicitly resting on the inferences and acknowledging the CANNOT-prove limits.

**Proper use of each class.** `[OBSERVED]` numbers that rest on a taxonomy proxy carry the lower-bound
caveat (§6, `KNOWN_TAXONOMY_LIMITATIONS.md`). A frontier-thinness reading that cannot be separated from
taxonomy blindness is reported as a `[SUSPECTED]`/`[INFERENCE]` hypothesis pending a text-match proxy,
never as an `[OBSERVED]` gap. Accepted known quirks (the tag-rows-vs-projects Section-9 count) are
disclosed at the point of citation rather than silently edited, because the freeze prioritises
byte-identical cross-topic reproduction; correctness is delivered through the §7-gated authoritative
reading and explicit disclosure.

---

# 14. Limitations

1. **CORDIS coverage.** Only EU-funded projects (FP1–FP7, H2020, Horizon Europe); national-only and
   privately funded R&I are absent. **Absence of evidence is not evidence of absence.**
2. **Taxonomy limitations.** EuroSciVoc systematically lags policy terminology; the core-relevance proxy
   is a lower bound and on the blindest topics does not discriminate. Full register:
   `KNOWN_TAXONOMY_LIMITATIONS.md`.
3. **Policy lag / vintage.** Policy-priority coverage tracks project age, not strategic relevance (§8);
   EuroSciVoc tagging is uneven across vintages, biasing time comparisons.
4. **Non-EU benchmarking is impossible.** CORDIS says nothing directly about the US, China or private R&D,
   so "Europe leads" / "Europe is behind" can only be **inferred** from internal structure, never measured
   against rivals. Any global-leadership statement is external policy context the evidence flags but
   cannot establish; a **membership caveat** applies where top coordinators are associated/third countries
   (UK, Switzerland), e.g. health-AI's #1 coordinating country is the UK.
5. **Counts ≠ funding ≠ impact.** Country/organisation counts reflect participation frequency, not funding
   volume or scientific impact; tag-row counts overstate distinct projects (§10.3).

---

# 15. Recommended future evolution (potential Method v2.0, without modifying v1.0)

These are candidate extensions for a **future version**; none may be applied within v1.0.

1. **EuroSciVoc-independent text-match proxy.** A keyword/objective text-match over project `objective`
   would let frontier-thinness be *confirmed* rather than *suspected* on taxonomy-blind topics — the
   single highest-value addition.
2. **Distinct-project EuroSciVoc counts.** De-duplicate the Section-9 tag-row counts to distinct
   `project_id` (resolving the `uc-1` FAIL) once the freeze can be re-baselined.
3. **Funding-weighted indicators.** Add `ecMaxContribution` / `totalCost` aggregates so "scale" reflects
   investment, not just project count.
4. **Per-priority policy columns.** Split the single `policyPriorities` presence column into one column
   per distinct priority for a finer Q1 read.
5. **Activity-type / industry-share indicators.** Surface `activityType` private-for-profit share as a
   first-class Q1/Q2 signal.
6. **Recency-weighted core.** A HORIZON>H2020 recency flag per lens (already observed informally for
   quantum q03, data-spaces q03) to weight the *current* frontier.
7. **Automated adversarial review in-pipeline.** Promote the `<topic>_review_findings.txt` protocol (§10)
   to a pipeline stage with machine-checkable PASS/PARTIAL/FAIL gates.

---

# Appendix A — applying the method to a new topic

1. Add the topic and its 5 lenses to `config/pilot_topics.yaml`; mirror them into
   `config/cordis_queries.yaml` with fresh `query_id`s.
2. Add the topic's `CORE_RELEVANCE_KEYWORDS` / `ADJACENCY_KEYWORDS` to `TOPIC_VOCAB` (analyse) and its
   labels/prose to `TOPIC_LENS_ROLES` / `TOPIC_NARRATIVE` (build) — **additive only**, applying the
   canonical-vocabulary rule (§5) and documenting every excluded/replaced token with verified row counts
   in `docs/parser_extensions_<topic>.md`.
3. Run the re-run sequence (§11.9) per lens, then parse → analyse → build.
4. Apply §4 (contamination), §7 (network), §8 (policy/vintage), §9 (Hungarian) to interpret; record the
   per-lens weighting in the comparison report; run the §10 adversarial review.
5. **Prove backward compatibility:** re-run analyse+build for all prior topics and confirm 0 non-timestamp
   diffs, then `git checkout` to restore.

# Appendix B — changelog

- **v1.0 (2026-06-10):** Initial method, validated end-to-end on `cybersecurity_pqc_secure_software`.
  Establishes the five-lens philosophy, the core-relevance metric, q01 contamination handling, the
  largest-component-share (0.70) network rule, the policy-vintage rule, the Q1–Q3 indicator system and
  the reproducibility rules.
- **v1.0 (2026-06-11) — definitive multi-topic edition (this document).** No rule changed. Records the
  re-application of the **frozen** method to five further topics (trustworthy-AI, data-spaces, quantum,
  health-AI, AI-for-science) with byte-identical reproduction of all prior topics; adds the explicit
  Architecture (§2), Canonical-vocabulary rule (§5), Adversarial-review protocol (§10), Quota-management
  (§12) and Hungarian-positioning (§9) sections; generalises the contamination, core-relevance, network
  and policy rules with the observed cross-topic figures; and cross-references
  `KNOWN_TAXONOMY_LIMITATIONS.md`. The per-topic vocabulary/label swaps are explicitly permitted and do
  **not** bump the version.
