# CORDIS-Powered Features for EU Graphs — Ideas & Use Cases

## What this document is

Ideas for new features in the EU Graphs app that use the **CORDIS API** — the EU's official
database of research projects funded under the Framework Programmes (FP7, Horizon 2020, Horizon
Europe).

> **Scope note.** The file `CORDIS/CORDIS_EVIDENCE_METHOD_v1.0.md` describes *one specific past use*
> of the CORDIS API (a national policy-consultation analysis). It is **not** a specification for this
> app, and its project-specific vocabulary (query "lenses", consultation questions, bespoke indicators)
> is **not** used here. The ideas below are written from scratch against what the CORDIS API itself
> provides, in plain terms, for *this* app's purpose: exploring Horizon Europe funding.

---

## How these features get built — **mandatory process (prerequisite for every feature)**

Every feature in this document, **including the data backbone**, must follow this process. Do not
start coding a feature without it.

1. **One feature at a time.** Implement a single idea per change; never batch features together.
2. **Plan before code.** Before implementing a feature, write a dedicated execution plan and save it as
   a local Markdown file under **`CORDIS_PLANS/`** (e.g. `CORDIS_PLANS/<NN>-<feature>.md`). Each plan
   states: goal & scope, exact files to add/change, the data it uses and **where it comes from**, a
   step-by-step task list, how it will be verified, and a rollback. The plan is the review checkpoint.
3. **Real data only.** Every figure a feature shows must come from the **CORDIS API via the backend**
   (see "The data backbone"). **No hardcoded, mocked, or fabricated values**, and no numbers carried
   over from the separate methodology project.
4. **Self-explanatory & jargon-free.** No artefact acronyms from the methodology reference; every label
   and tooltip must be understandable to a user who has never seen that project.
5. **Verify, then record.** Build/run to confirm it works, then update the plan file's status
   (e.g. *Implemented / Verified*) so the sequence stays auditable.

---

## The opportunity in one paragraph

The app today shows the **Horizon Europe work programme** — the calls and topics currently **open for
funding** (the money on offer, drilled down as Pillar → Programme → Destination → Call). The CORDIS
API shows the other half of the picture: the projects that have **actually been funded** in the EU,
past and present. Linking the two lets the app answer, for any call or research area on screen:
**who has been funded to work on this, in which countries, with how much money, in what collaborations,
and how has that changed over time.** Today the app can only show what is *advertised*; CORDIS lets it
show what has actually *happened*.

---

## What the CORDIS API gives us (plain glossary — no acronyms beyond official EU terms)

You send the CORDIS API a **search query** for a research area; it returns the matching **funded
projects**. For each project you get:

- **Project facts** — title, status, start/end dates, the **funding scheme**, and which **Framework
  Programme** it belongs to (FP7, Horizon 2020, or Horizon Europe — i.e. its era).
- **Funding** — the EU contribution and total cost (real awarded euros).
- **Participants** — every **organisation** on the project, with its **country**, **city**, **role**
  (coordinator vs. partner), **type** (company / university / research organisation), and its share of
  the funding.
- **Research fields** — the project's **EuroSciVoc** classifications. EuroSciVoc is the EU's standard
  hierarchical vocabulary of research fields (e.g. *natural sciences → computer and information
  sciences → artificial intelligence*). This is the structured "topic" tagging the app currently lacks.
- **Call / topic** — the call and topic code the project was funded under, which is the **link back to
  the app's own call nodes**.
- **Free text** — the project's objective and keywords.

**How the data is fetched (important).** The CORDIS API works asynchronously: you submit a query, it
prepares an extraction, and you download the result when ready. So features do **not** call CORDIS
live from the browser. Instead, the **backend runs CORDIS queries, stores the results in Neo4j**
(linked to the app's existing call/topic nodes), and the frontend reads from the backend. Data is
**refreshed by re-running the backend job**. Every figure in every feature below comes from real
CORDIS data fetched this way — **nothing is hardcoded or fabricated**.

---

## What CORDIS can and cannot tell you (read before building)

Keep features honest about the data:

- CORDIS covers **EU-funded projects only**. Nationally funded and privately funded research is not in
  it, so *not appearing in CORDIS does not mean no activity exists*.
- It shows **funding and participation, not scientific quality or impact** — there are no citations,
  patents, or outcomes. "Most funded" is not "best".
- **Project counts and euros are different measures** — show them separately, never conflate them.
- It is a record of **EU programmes**, so it cannot compare Europe with other regions.

Surface these as short, plain captions where the relevant numbers appear.

---

## Part A — Enhance existing features

### A1. Real topic tags on calls (the keystone)
- **Today:** call nodes have empty topic tags, so topic search, the hover tag chips, and topic overlap
  in Compare all come up empty.
- **With CORDIS:** tag each call with the **research fields (EuroSciVoc)** of the projects funded under
  its topic/area. Calls become searchable and groupable by real subject matter.
- **Unlocks:** working topic search, tag chips, "related calls", and topic-based filtering.
- **Data:** EuroSciVoc classifications of CORDIS projects, linked to calls by topic/call code.

### A2. "Funded projects" panel on a call or destination
- **Today:** a call shows only its advertised text and indicative budget.
- **With CORDIS:** add a panel showing the **real funded-project landscape** for that area — number of
  projects, total EU funding awarded, the most active organisations and countries, and the spread
  across Framework Programmes (how long the area has been funded).
- **Unlocks:** a researcher/officer can see, at a glance, the track record behind a call.
- **Data:** CORDIS projects matching the call's topic or research field.

### A3. Make the assistant act on the graph (and optionally answer from CORDIS)
- **Today:** the chat assistant returns matching calls as chips, but they don't move or highlight the
  graph.
- **With CORDIS:** (1) wire the existing results to **highlight and zoom the graph** to the matches
  (no CORDIS data needed — a quick win); (2) optionally let it answer "who has been funded in X?" /
  "which organisations work on Y?" from the stored CORDIS data.
- **Data:** none for step 1; CORDIS organisations/projects for step 2.

### A4. Funding view: planned vs. awarded
- **Today:** the dashboard's funding chart shows only the **indicative budget of open calls** (planned
  money), and its three tabs currently show identical bars.
- **With CORDIS:** repurpose the tabs to compare **planned budget** (from the work programme) with
  **funding actually awarded** in that area historically (from CORDIS). Show areas with no CORDIS match
  as "no data", never as zero.
- **Data:** CORDIS EU-contribution totals by programme/area.

### A5. Revive the relatedness filter with real connections
- **Today:** the similarity slider is dead because no relatedness data exists in the loaded graph.
- **With CORDIS:** create real **"related calls"** links from **shared research fields** — calls whose
  funded projects sit in the same EuroSciVoc areas are connected, weighted by overlap. The slider then
  filters by how related calls are.
- **Data:** EuroSciVoc field overlap between calls' funded-project sets.

### A6. Funding-history trend for a research area
- **Today:** the timeline only covers the current year's open calls.
- **With CORDIS:** show how an area's **funding and project count have evolved** across FP7 → Horizon
  2020 → Horizon Europe — is it growing, steady, or winding down?
- **Data:** CORDIS projects grouped by Framework Programme / start year for the area.

---

## Part B — New features

### B1. Collaboration network for a research area
- **What:** for a selected call or research field, open a network view of the **organisations that have
  been funded together** — who collaborates with whom, who participates most, and a roll-up to a
  **country-level** view.
- **Why:** turns "this area is funded" into "this is the community that works on it."
- **Data:** CORDIS organisations and their co-participation on shared projects.

### B2. "Who works in this area" / partner finder
- **What:** a ranked list of the organisations most active in a research area (and how often they
  **coordinate** vs. **partner**), filterable by **country** and **organisation type** (company /
  university / research org).
- **Why:** helps a user find potential collaborators or understand who the established players are.
- **Note:** the country filter works for **any** country the user chooses — it is not tied to one country.
- **Data:** CORDIS organisations with role, type, and country.

### B3. Related-calls explorer
- **What:** from a call, jump to other calls in the **same research fields** (via shared EuroSciVoc
  classifications of their funded projects) — a "more calls like this" path.
- **Data:** EuroSciVoc overlap between calls.

### B4. Country activity overlay
- **What:** an optional overlay that highlights, for a chosen **country**, how active its organisations
  have been across the graph (participation and coordination in each area). The country is **user-
  selectable** — any member or associated country.
- **Why:** lets a national or regional user see where their organisations are strong or absent.
- **Data:** CORDIS organisations filtered by country.

### B5. Research-field explorer
- **What:** browse the **EuroSciVoc** field hierarchy and see which Horizon Europe calls (and how many
  funded projects) fall under each field — a subject-first way into the graph, complementing the
  programme-first drill-down.
- **Data:** EuroSciVoc classifications across calls and projects.

---

## The data backbone (build this once; most ideas depend on it)

A backend job that, for the app's call topics / research areas:

1. **Queries the CORDIS API** for the matching funded projects (asynchronous extraction → download).
2. **Stores the results in Neo4j** — projects, organisations, countries, research fields (EuroSciVoc),
   and funding — as new node/relationship types, **linked to the app's existing call/topic nodes** by
   topic/call code (and by shared research field where codes differ).
3. **Exposes them via the existing backend API**, so the frontend reads CORDIS-derived data the same
   way it reads the rest of the graph.
4. **Refreshes on demand** by re-running the job.

This keeps all CORDIS data **real and current from the API**, with **no hardcoded or fabricated values**.

**What it unlocks:** A1 (topic tags) → revives search, tag chips, topic overlap, and the relatedness
filter (A5, B3). The project/organisation store → the funded-projects panel (A2), planned-vs-awarded
funding (A4), funding-history trend (A6), the collaboration network (B1), the partner finder (B2), the
country overlay (B4), and the field explorer (B5).

---

## Suggested order of work

1. **Assistant drives the graph (A3, step 1)** — no CORDIS data; immediate, visible win.
2. **Build the data backbone** — the CORDIS-API-to-Neo4j job above. Start with one cluster's calls to
   prove the link, then expand.
3. **Topic tags on calls (A1)** — the keystone; revives the most existing dead/empty UI (search, tags,
   overlap, relatedness filter).
4. **Funded-projects panel (A2)** and **collaboration network (B1)** — the highest-value new views.
5. **Funding history/planned-vs-awarded (A4, A6)**, **partner finder (B2)**, **related-calls and field
   explorer (B3, B5)**, **country overlay (B4)** — in any order once the backbone is in place.

---

## Note on the earlier "6-theme comparison" prototype

An earlier prototype ("compare 6 themes") was built directly on the separate national-consultation
project's six chosen topics and its bespoke indicators. Because those are artefacts of that project
rather than features of this app, that prototype is **superseded by the ideas above** and should be
reverted or reframed (see the conversation). The reusable, app-relevant version of "compare areas" is
A2 (funded-projects panel) applied to whatever calls/areas the user is actually exploring.
