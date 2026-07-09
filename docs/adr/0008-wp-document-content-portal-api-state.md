# Work-programme documents are the authoritative content source for calls; the portal API is the live-state source — merged per-field on the topic ID

A call carries two kinds of fact: durable **content** (scope, expected outcome, expected impact, TRL,
EU contribution per project, procedure, eligibility, page limits) and live **state** (opening/deadline
dates, status, confirmed budget, submission link, portal IDs). The official **work-programme document**
— the signed PDF, e.g. `pdf_files/HORIZON_2026/` — is the authority for content; the **Funding & Tenders
portal API** (SEDIA) is the authority for state. Neither is the source of truth for the whole record.
Each `:Call` node is a **merge of both, keyed on the portal topic code** (e.g.
`HORIZON-HLTH-2026-01-CARE-01`), which appears verbatim in both the PDF text layer ("Proposals are
invited against the following topic(s):") and the API `identifier`. Per-field precedence is fixed
(content → document, state → API), recorded once as provenance, and the merge is strictly **additive**.

**Why the document, not the API alone.** The API is *not* generally thin on Horizon narrative — its
`descriptionByte` often carries the same Expected Outcome + Scope prose as the PDF, so a large part of
the perceived gap is really our own extractor blanking fields it does receive (`status`, top-level
`title`, `expected_eu_contribution`) — those get fixed in the extractor, not by a new pipeline. But
three things the API genuinely cannot give: (a) the per-topic **Specific conditions** table (TRL,
EU-contribution-per-project, procedure, page limits), which SEDIA exposes only as Annex-pointer
boilerplate; (b) the **complete two-year programme** — 2027 and later-call topics the portal has not
yet indexed; and (c) **permanence** — extraction requests only `forthcoming`+`open`, so a topic
*vanishes* from the API the moment it closes, while the document keeps it forever and is the citeable
legal source. The document also lands months before calls open, which is exactly the monitoring window
the product optimises for (CLAUDE.md §Core job).

**Why a per-field merge, not a per-programme either/or.** Sourcing is not "documents for Horizon, API
for the rest." It is one union-merge governed by precedence. A topic present in both gets document
content + API state. A topic present only in the API — a later addition, or a programme whose work
programme carries no topic-ID'd calls (Digital Europe, Creative Europe) — is kept **API-only**,
unchanged from today. A topic present only in the document (not yet portal-loaded) is kept as an
**indicative, forthcoming** record. The merge never drops a call it cannot match, and never regresses a
programme that has calls today. Programmes with no usable document stay 100% API.

**Honesty (binds to ADR-0006).** Admitting the document as a source also admits **indicative** dates and
budgets. These are never labelled confirmed: a document-only or document-sourced date renders as
"indicative (work programme)", never as a portal deadline (ADR-0006 #5, #7). Every merged field carries
provenance — which source, and for document data which work-programme edition — so every surface still
answers "says who, as of when." Closed topics retained from the document are shown closed, never open.
Indicative work-programme money never wears an "awarded"/"committed" label.

**The seam, and for future readers.** The merge happens **upstream of the graph**: it emits the same
grouped-JSON contract the ingest already consumes (`{"destinations":[{destination_title, calls:[…]}]}`),
so `BaseClusterBuilder` and the Neo4j populate path are unchanged — the same seam discipline as ADR-0003.
A future reader seeing a call with rich, early content but "indicative" dates should reach for the
WP-document merge stage; one seeing a call that exists in the portal but in no document should expect an
API-only record carrying no document provenance. Prior art for the parse-and-merge lives in git history
under `backend/routes/new_pipeline/parsers/` (the `he_wp_parser_*` → `patch_call_dates.py` chain) —
resurrect it rather than rewrite; its one weakness was a hand-maintained date file, now replaced by the
API state pull on the same topic key.

Accepted trade-off: two sources means a standing **reconciliation burden** (title drift, unmatched
topics, PDF layout drift year-to-year and cluster-to-cluster) and a parser to maintain. Chosen
deliberately: the document is the only way to show the full, authoritative, permanent programme during
the pre-open monitoring window where the API is silent — and that window is the product's retention
engine.
