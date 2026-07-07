# European Research-Funding Intelligence

A map of European research funding that shows, side by side, the money currently **on offer**
(Horizon Europe calls) and the money **already awarded** (real CORDIS-funded projects) — so you can
find the right open call and instantly see who has actually been funded to do this work.

## Language

**Advertised**:
Funding that is currently on offer — the work-programme calls and their indicative budgets. What is
*planned*, not yet awarded. One of the two halves; the triage stage of the core job.
_Avoid_: committed, allocated, spent

**Awarded**:
Funding that has actually been granted to real projects, sourced from CORDIS (real euros). The other
half; the deliberation stage of the core job.
_Avoid_: committed (for advertised money), disbursed

**Funding Landscape**:
The Awarded half — the CORDIS evidence (funded projects, organisations, countries, research fields)
navigable per call or research area. Shown against a call as *the funded track record in that
subject area*, never as "the projects this call funded": for an open call, exact funding is
definitionally empty, so the evidence is thematic (subject-area) adjacency by design. This is the
user-facing label ("Funding landscape"); the per-call band is titled "Funded track record in this
area"; "CORDIS" appears user-facing only as source attribution.
_Avoid_: CORDIS view, evidence graph, "behind this call" (ownership wording)

**Research-office professional**:
The primary user — a grant advisor / research manager at a university or research organisation who
steers scarce proposal effort across a portfolio of researchers. Thinks in fields and portfolios, not
a single topic; monitors as a job function (the retention driver). "Research manager" is the same
cluster zoomed out (institutional strategy); both are this persona.
_Avoid_: admin, bureaucrat, back-office

**PI**:
Principal Investigator — the researcher (often a faculty member) who would lead a proposal and whose
effort is the scarce resource. A served, secondary user whose single-topic view is a filtered case of
the research-office professional's portfolio view.
_Avoid_: applicant, grantee, researcher (unqualified)

**Evidence**:
The funded-project data shown against a Call or research area to answer "who has actually been funded
here, and how much." Two surfaces: funded projects + awarded euros, and the organisations behind them.
Always *in this subject area* (ADR-0001) and always awards-only — CORDIS has no application counts, so
Evidence never implies a funded-rate or odds (ADR-0002 #4).
_Avoid_: proof, stats, odds

**Organisation**:
A participant on a Funded Project, with a country, a type (company / university / research org), and a
role — **coordinator** or **partner**. The same organisation list is read two ways: diagnostically
("who wins this kind of work") and as a directory ("who could I team up with").
_Avoid_: partner (except as the specific non-coordinator role), institution

**Research Field**:
An EuroSciVoc classification — the EU's standard hierarchical vocabulary of research fields — used to
link Funded Projects and Calls by subject. The lens the research-office professional monitors in, and
the subject-first way into the app (complementing the programme-first drill-down).
_Avoid_: topic, tag, keyword, cluster (reserve "Cluster" for the Horizon Europe programme sense)

<!-- More terms added as they are resolved during the product-vision grilling session. -->
