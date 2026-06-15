# Execution Plan — **A1: Real topic tags on calls (from CORDIS)**

> First feature that *consumes* the data backbone (`CORDIS_PLANS/00-data-backbone.md`).
> Process: this plan is the review checkpoint required before coding (ideas doc §"mandatory process").
> Status: **BUILT & VERIFIED (curated queries) — ready for the live tag run.** Branch `cordis`.
>
> **Resolution (curated queries chosen):** a reviewed CORDIS query per CL3 call subject lives in
> `backend/routes/new_pipeline/cordis/curated_queries/cluster_3.json` (44 queries). All 44 were
> **validated live** (every one bounded & non-empty, 10–8 054 projects, none over the 25 000 cap), and
> field quality was spot-checked end-to-end — e.g. *Missing persons* now → `forensic sciences, DNA, law,
> facial recognition` (the earlier oncology/nutrition mis-tag is gone), *Secure PQC* → `cryptography,
> quantum computers, IoT`. The tagger consumes the curated map (`load_curated_queries` →
> `tag_calls(query_map=...)`), tagging only subjects with a curated query (uncurated are skipped — no
> unreliable auto-query). `SearchBox` got the 1-line `related_topics` addition; frontend build passes.
>
> **Remaining (user runs — needs Neo4j up + the backend):** `POST /cordis/tag-calls {"source":"cluster_3"}`
> runs all 44 curated extractions (slow — minutes each) and writes `related_topics`/`keywords` onto the
> CL3 Call nodes. Then in the app: hover chips, topic search, and Compare overlap light up for CL3.
> `DELETE /cordis/tags?source=cluster_3` reverts. To extend to other clusters, add a `curated_queries/<source>.json`.

---

## ⚠️ Implementation finding (2026-06-15) — read first

The backbone + tagger were implemented and **verified against real data**: the live CORDIS client
authenticates and runs the full create→poll→download→delete flow; the parser + `aggregate_fields` +
`tag_calls` orchestration all work (offline exact-match + live). Added: server-side delete-after-download
(cap-respecting), and per-subject **resilience** (one failing subject no longer aborts the batch).

**But the crux — turning a 2026 call's title into a CORDIS query that returns the *right* projects — is
not reliably automatable**, verified empirically against live CORDIS:

| Call subject | Auto query | Result | Tags produced |
|---|---|---|---|
| *Improving … law enforcement … climate* | `… AND "enforcement" AND "climate-related"` | 17 | climatic changes, pollution, plant protection — **off** |
| *Missing persons: prevention…* | `… AND "missing persons"` | 151 | **oncology, nutrition, proteins, stroke — WRONG** |
| *Open topic on … misuse of emerging tech* | `… AND "open" AND "topic"…` | 109 | mortality, public health — **noise** |
| *(clean phrase)* `"law enforcement"` | phrase | 367 | **law enforcement, law, terrorism, governance, criminology — correct** |
| *(broad phrase)* `"emerging technologies"` | phrase | 8 279 | sensors, software, internet — **too broad** |

Phrase-quoting fixes the clean cases but **still mis-tags ambiguous subjects** (medical noise) and can't
tell good from bad automatically. Auto-tagging would therefore stamp **wrong** research fields on some
calls — worse than empty, and against the honesty rule. **This is exactly why the reference methodology
hand-crafted its queries.**

**Decision needed (see below).** Recommended: **curated, reviewed queries** per topic area (the infra is
ready to consume them). The auto path is shelved.

---

## 0. TL;DR

The app's Call nodes carry an **empty** `tags` array, so the hover **tag chips**, **topic search**, and
**Compare topic-overlap** all come up empty. A1 fills them with **real research-field tags** derived
from CORDIS: for a call's subject, take the dominant **EuroSciVoc research fields** of the EU-funded
projects on that subject and write them onto the Call node. The frontend then lights up with **little
or no change** (it already reads these fields). Tags are clearly labelled as *research fields of funded
projects*, **not** the call's official scope. No hardcoded data — everything comes from the CORDIS API
via the backbone.

---

## 1. Goal & exactly what lights up (verified against current code)

| Feature | Reads (verified) | Revived by writing… |
|---|---|---|
| Hover **tag chips** | `extractTags` → `related_topics \|\| tags \|\| themes` (`nodeExtractors.js:245`) | `Call.related_topics` |
| **Topic search** | `SearchBox` haystack = `id,label,name,keywords,aliases,summary,body` (`SearchBox.js:25-33`) — **not** related_topics/tags | `Call.keywords` **or** a 1-line SearchBox addition |
| **Compare** topic-overlap | `useCompareData.collectFromElements` → `tags, keywords, related_topics` | any of the above |

Serving needs **no backend route change**: `GET /{prefix}/nodes` already returns the whole node
(`cluster_routes_factory.py:28-37` → `RETURN n`), and `buildElements` passes all fields through. So A1
is fundamentally a **backend tagging job** that `SET`s properties on existing `:Call` nodes
(`MERGE (c:Call {id})`, props incl. `topic_title`, empty `tags` — `base_cluster_builder.py:219-240,328`).

## 2. The core question — which research fields tag a given call?

A call is about a **subject** (its `topic_title`, e.g. *"Fighting crime and terrorism"*). CORDIS projects
on that subject carry standardised **EuroSciVoc** research-field classifications. So a call's tags = the
**most frequent EuroSciVoc field titles among the funded projects on that subject**. The subject query
*is* the relevance filter — no fuzzy graph join needed. Three ways to get "the projects on that subject":

- **Option A — exact funded-under link** (`(call)<-[:FUNDED_UNDER]-(:CordisProject)`): graph-native and
  precise, but the verified constraint is that the literal call-code join is **~empty for the app's 2026
  calls** (nothing has been awarded under them yet). Good as a *complement*, not a primary source.
- **Option B — per-subject CORDIS query** *(recommended for v1)*: for each distinct `topic_title` in
  scope, run a CORDIS extraction (the backbone's `fetch`), aggregate the top-N EuroSciVoc field titles,
  and tag the call(s) with that subject. **Subject-accurate and works for 2026 calls.** Cost: one
  (slow, async) extraction per distinct subject — so v1 is **scoped to one cluster** (§3).
- **Option C — few broad fetches + text-match field vocabulary**: cheap (a handful of fetches) but tags
  by substring-matching the call text against field names — **noisy**. Rejected for v1 (honesty).

**Recommended v1:** Option B scoped to one subject-rich cluster, with Option A folded in where exact
links exist. Honest empty state where CORDIS has no data for a subject — never fabricated tags.

> Why a *cluster* and not ERC/MSCA/EIC: cluster calls have a real subject in `topic_title`; ERC/MSCA are
> bottom-up and field-agnostic, so their EuroSciVoc spread would be meaningless. Recommend **CL3 (Civil
> Security)** or **CL4 (Digital & Industry)** for v1.

## 3. Operational reality (must be respected)

- Each CORDIS extraction is **asynchronous and slow** (create → poll minutes → download). v1 over one
  cluster = the number of **distinct `topic_title`s** in that cluster (dedupe calls sharing a subject),
  typically ~15–40 extractions — run as a one-off job, not interactively.
- CORDIS **caps stored server-side extractions**. The backbone client must therefore **delete each
  extraction server-side after download** (`DELETE /deleteExtraction`). → **Backbone addition** in this
  plan (add `delete_extraction()` to `cordis_client.py` and call it in `run_extraction`'s `finally`).
- Needs `CORDIS_API_KEY` set and Neo4j running (neither is available in the dev sandbox) — so live
  tagging is run by the user; the **aggregation logic is verified offline** against a real extraction (§8).

## 4. Files

| File | Change |
|---|---|
| `backend/routes/new_pipeline/cordis/cordis_tagger.py` **(new)** | `aggregate_fields(projects, top_n)` (pure, testable) + `tag_calls(scope, granularity, top_n, mode)` orchestration: gather distinct subjects → get projects (live fetch per subject, or local extraction in dev) → top-N EuroSciVoc field titles → `SET` on matching `:Call` nodes. |
| `backend/routes/new_pipeline/cordis/cordis_routes.py` | add `POST /cordis/tag-calls` (+ `DELETE /cordis/tags` to clear). |
| `backend/routes/new_pipeline/cordis/cordis_client.py` | add `delete_extraction(task_id)`; call it after download (respect the cap). |
| `frontend/.../LegendParts/SearchBox.js` | **(decision §10)** either nothing (if we also write `keywords`) **or** one line: add `n.data('related_topics')` to the haystack so research-field search works with clean data. |

No new node types (reuses the backbone + existing `:Call`). No other frontend change.

## 5. Tagging logic (per distinct subject)

```
subjects = distinct topic_title for calls in scope (skip blank)
for each subject:
    projects = fetch_and_parse(subject)        # live: client.run_extraction(subject) -> parse_extraction
                                                # (dev/offline: parse a provided real extraction)
    fields   = top_n EuroSciVoc field titles by frequency across projects   # aggregate_fields()
    for each call with this topic_title:
        SET c.related_topics = fields           # chips + compare overlap
        SET c.keywords       = fields           # search  (or rely on the SearchBox 1-liner instead)
        SET c.cordis_tag_source = "CORDIS funded-project research fields (EuroSciVoc)"
        SET c.cordis_tag_query  = subject
        SET c.cordis_tag_project_count = <#projects>
```
`aggregate_fields` de-dups EuroSciVoc by field title, counts distinct projects per field, returns the
top-N titles. (Counting distinct projects, not field-rows, avoids over-counting.)

## 6. Honesty & provenance

- Tags are **[research fields of EU-funded projects on this subject — CORDIS, FP7–Horizon Europe]**, not
  the call's official scope. Store `cordis_tag_source` / `cordis_tag_query` / `cordis_tag_project_count`
  on the node; a small "Research fields (CORDIS)" caption над the chips is a **stretch** (deferred to a
  tiny TagChips tweak) — for v1 the provenance lives on the node and in the plan.
- **Empty where CORDIS has no projects for a subject** — the call simply stays untagged (no chips), never
  a fabricated or placeholder tag.
- No counts/funding shown here — A1 is tags only; counts are A2's job.

## 7. Step-by-step

1. Backbone: add `delete_extraction()` + call after download.
2. `cordis_tagger.py`: `aggregate_fields()` (pure) then `tag_calls()`.
3. `POST /cordis/tag-calls` + `DELETE /cordis/tags` in routes.
4. SearchBox decision (§10) — apply chosen approach.
5. Verify (§8); update this file's status.

## 8. Verification

- **Aggregation logic (offline, real data):** unit-test `aggregate_fields()` against a real extraction
  already on disk (e.g. a CL3-relevant `json.zip`) and confirm it returns sensible, on-topic EuroSciVoc
  field titles ranked by project frequency. (Proves correctness **without** writing that separate
  project's data into the app DB.)
- **SET shape:** run `tag_calls(preview=True)` to confirm the Cypher/props are well-formed.
- **Live end-to-end (user):** set `CORDIS_API_KEY`, start Neo4j, populate CL3 calls, `POST /cordis/tag-calls`
  for CL3 → `GET /cluster3/nodes` shows calls with `related_topics`/`keywords` → in the app: hover chips
  appear, topic search finds calls by field, Compare shows topic overlap. Build the frontend if the
  SearchBox 1-liner is used.

## 9. Rollback

`DELETE /cordis/tags` clears `related_topics`/`keywords`/`cordis_tag_*` from `:Call` nodes (scope-limited);
revert the optional SearchBox line; delete `cordis_tagger.py` + the two route handlers. No schema change.

## 10. Open decisions (confirm before I implement)

1. **Search approach:** (a) write fields into `Call.keywords` too (zero frontend change) **or**
   (b) `related_topics` only + a 1-line `SearchBox` addition (cleaner data). *Recommend (b).*
2. **Granularity:** per-distinct-`topic_title` (precise; recommended) vs per-destination (cheaper, calls
   in a destination share tags).
3. **v1 cluster:** CL3 (Civil Security) or CL4 (Digital & Industry)? *Recommend CL3 (clean subjects).*
4. **top-N** fields per call (default **6**, matching `extractTags`' slice).
