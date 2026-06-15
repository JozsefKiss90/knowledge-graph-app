# Methodology

## Purpose and consultation context

This project supports Hungary's (NKFI Hivatal / NKFIH) coordinated national input to the
European Commission's thematic consultation on the **European Partnerships to be launched
in 2028-2034** under the next R&I Framework Programme. The original Hungarian background
brief is stored in this repository as `backround_info.txt` (the filename keeps the typo
of the source file). Key facts from that brief:

- Hungary currently co-funds **~EUR 10.625 million per year across 19 EU co-funded
  partnerships**, from innovative agricultural research to the latest medical developments.
- The consultation closes on **2026-06-12** (Friday, end of business day).
- Only **one response per member state** is submitted; NKFI Hivatal consolidates all input
  into a single national position.

The consultation asks three questions (translated):

- **Q1 - Global leadership.** Which thematic areas is Europe a *global leader* in R&I, where
  a European Partnership should be launched to maintain and strengthen that lead?
- **Q2 - Behind / fragmented.** Which thematic areas is Europe currently *behind or
  fragmented* in the global R&I environment, necessitating a European Partnership?
- **Q3 - Hungarian priority.** Which thematic areas, from the perspective of the
  member-state (Hungary) RDI/KFI priorities, need a European Partnership?

This methodology defines **how CORDIS project-portfolio data is used as an evidence layer**
to inform proposed thematic areas with reproducible, auditable indicators rather than
opinion alone.

The current **pilot topic** (the only one analysed for now) is:

> `cybersecurity_pqc_secure_software` -
> "Cybersecurity, secure software engineering and post-quantum resilience".

## Why CORDIS is a useful evidence layer

CORDIS (the EU's Community Research and Development Information Service) is the official,
public repository of projects funded under the EU Framework Programmes (FP7, Horizon 2020,
Horizon Europe). Its Data Extraction (DET) API lets us pull structured project records
matching a query. For a consultation that has to justify *which themes* deserve a
partnership, CORDIS offers a defensible, quantitative base because it captures, per project:

- **Participation** - which organisations and countries take part, and in what role.
- **Coordination** - which organisations lead consortia (a proxy for strategic capacity).
- **Funding** - EC contribution and total cost (a proxy for sustained EU investment).
- **Topic tagging** - EuroSciVoc scientific-vocabulary classifications, call/topic codes,
  and (where present) policy-priority flags.
- **Continuity** - the same query can be read across Framework Programmes to see whether
  activity is sustained or one-off.

Because it is the same source the Commission itself publishes, conclusions drawn from it are
transparent and reproducible: every figure in the evidence pack can be traced back to a
specific extraction query and a downloaded export.

## What this data CAN and CANNOT prove

Being explicit about the limits is part of the method. Portfolio data describes *funded
activity*, not *scientific merit*.

**CORDIS evidence CAN indicate:**

- The **volume and persistence** of EU-funded activity in a theme (project counts, funding,
  activity across multiple Framework Programmes).
- The **structure** of the European community working on it (who coordinates, who repeats,
  how countries and industry participate, how connected the consortia are).
- **Hungary's footprint** - whether Hungarian organisations already participate or
  coordinate, and where they are absent.
- **Topic alignment** - how strongly projects are tagged to relevant scientific categories
  and policy priorities.

**CORDIS evidence CANNOT prove:**

- **True scientific leadership or research quality.** Funding and participation are inputs
  and structure, not measured excellence. Citations, breakthroughs, patents, standards
  influence and talent are *outside* CORDIS.
- **Global competitive position.** CORDIS covers EU-funded projects only; it says nothing
  directly about the US, China or private R&D, so "Europe is behind" can only be *inferred*
  from internal weakness signals (few/fragmented projects), never measured against rivals.
- **Outcomes or impact.** The dataset records what was funded, not what was achieved.
- **Completeness of capability.** An organisation can be world-class yet under-represented in
  EU-funded consortia for reasons unrelated to ability (e.g. national funding, timing).

These limits are why the output is framed as *consultation input* with indicators, not as a
verdict.

## Mapping the data to the three consultation questions

The same portfolio is read through different analytical lenses for each question. Full
indicator definitions live in `consultation_mapping.md`; the summary mapping is:

- **Q1 (global leadership)** is supported where CORDIS shows a *large, persistent, well-led
  and well-connected* portfolio: many projects, stable activity across Framework
  Programmes, repeated coordinators, cross-country networks, strong industry participation,
  and high policy-priority alignment.
- **Q2 (behind / fragmented)** is supported where CORDIS shows *thin or fragmented* activity:
  few projects, scattered one-off consortia, weak coordinator continuity, low industrial
  participation, weak strategic policy tagging, and low presence in emerging subtopics.
- **Q3 (Hungarian interest)** is supported where CORDIS shows *Hungarian relevance*:
  Hungarian participants already present, Hungarian (or potential) coordinators, adjacent
  national capabilities (e.g. ELTE and other Hungarian institutions), and gaps where
  targeted national positioning could add value.

The same indicators can point at more than one question (e.g. a fragmentation signal feeds
Q2, while a Hungarian-presence signal feeds Q3); the analysis computes them once and the
evidence pack interprets them per question.

## Why multiple complementary query lenses are needed

A single query cannot answer all three questions without bias, so each pilot topic is probed
with several **complementary lenses** (configured in `config/cordis_queries.yaml`):

- **Broad lens** - a wide thematic query to size the overall European portfolio and judge
  volume/persistence (mainly Q1/Q2).
- **Programme-scoped lens** - the same theme restricted to a Framework Programme (e.g.
  Horizon Europe) to read continuity and recent momentum across FPs.
- **Sub-topic lens** - narrow queries for emerging or strategic sub-areas (e.g.
  post-quantum cryptography, secure software engineering) to detect presence or absence in
  the frontier where leadership/fragmentation is decided.
- **Hungary-scoped lens** - the theme filtered to Hungarian participation/coordination, to
  quantify the national footprint for Q3.

Reading the topic through all lenses guards against a misleading conclusion from any one
query (a broad query may look healthy while the sub-topic frontier is empty, or vice versa).

## Observed - inference - recommendation discipline

To keep the consultation input honest and auditable, every statement in the analysis and the
evidence pack is classified into one of three tiers, and the tiers are never blurred:

1. **Observed** - a direct fact from the extracted data
   (e.g. "47 projects matched; 3 had Hungarian coordinators; 12 organisations coordinated
   more than once"). These come straight from the normalised tables and
   `analysis_summary.json`.
2. **Inference** - a reasoned reading of the observed indicators
   (e.g. "the high repeat-coordinator count and cross-FP continuity suggest a mature,
   consolidated community"). Inferences are labelled as such and tied to the specific
   signals that justify them.
3. **Recommendation** - the policy suggestion for the consultation
   (e.g. "this theme is a candidate for a Q1 leadership partnership"). Recommendations are
   always presented as *proposals for NKFIH consideration*, explicitly resting on the
   inferences above, and acknowledging the CANNOT-prove limits.

This discipline ensures that the reproducible, quantitative parts (Observed) are separated
from judgement (Inference) and from policy advocacy (Recommendation), so reviewers can
challenge any layer independently.

## Reproducibility and the no-data fallback

The whole pipeline is **config-driven and reproducible**: queries live in YAML, raw /
extracted / processed data are kept strictly separate, run logs are written for every step,
and raw API responses are saved with the API key redacted.

Critically, at build time there is **no `.env` and no API key**, so no live extraction has
yet been run. The pipeline is therefore designed to run **end-to-end in a `no_data` mode**:
when inputs are absent, `parse_exports.py`, `analyse_topic.py` and `build_evidence_pack.py`
produce valid empty/placeholder outputs annotated "pending live extraction" instead of
crashing. Once a key is supplied and the first real extraction is downloaded, the same code
produces the populated evidence pack with no changes, and the assumed project-record fields
(see `data_dictionary_notes.md`) are reconciled against the real data.
