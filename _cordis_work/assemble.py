"""Assemble curated_queries/cluster_N.json from the workflow's idx->query output.

Reads _cordis_work/workflow_result.json (the workflow's return value: {byIdx:{source:{idx:query}}, coverage})
and joins idx -> authoritative subject string from _cordis_work/cluster_N_subjects.json, so the curated
file keys are byte-exact with the subjects the tagger looks up (no trust in agent-echoed strings)."""
import json, os, sys

WORK = r"C:\Code\knowledge-graph-app\_cordis_work"
CURATED = r"C:\Code\knowledge-graph-app\backend\routes\new_pipeline\cordis\curated_queries"

ABOUT = ("Curated CORDIS DET queries for {name} call subjects, keyed by the subject the tagger looks up "
         "(call topic_title where present, else the call title/name). Each query is contenttype=project "
         "with phrase-quoted, OR-grouped domain terms grounded in the cluster theme, drafted + adversarially "
         "verified to be bounded and on-topic (mirrors cluster_3.json). The tagger fetches each query, "
         "aggregates the funded projects' EuroSciVoc research fields, writes them onto the matching Call "
         "nodes, and links the calls to the projects (HAS_FUNDED_PROJECT). Edit freely; re-run "
         "POST /cordis/tag-calls {{\"source\":\"<source>\"}} to apply.")

NAMES = {
    "cluster_1": "Cluster 1 (Health)",
    "cluster_2": "Cluster 2 (Culture, Creativity and Inclusive Society)",
    "cluster_4": "Cluster 4 (Digital, Industry and Space)",
    "cluster_5": "Cluster 5 (Climate, Energy and Mobility)",
    "cluster_6": "Cluster 6 (Food, Bioeconomy, Natural Resources, Agriculture and Environment)",
}

result = json.load(open(os.path.join(WORK, "workflow_result.json"), encoding="utf-8"))
by_idx = result["byIdx"]

n_map = {"cluster_1": 1, "cluster_2": 2, "cluster_4": 4, "cluster_5": 5, "cluster_6": 6}

# Select which cluster(s) to write. With no args -> all. Accept "cluster_1", "1", or "cl1".
def normalise(a):
    a = a.strip().lower()
    if a.startswith("cluster_"): return a
    if a.startswith("cl"): a = a[2:]
    return f"cluster_{a}" if a.isdigit() else a

if len(sys.argv) > 1:
    requested = [normalise(a) for a in sys.argv[1:]]
    bad = [a for a in requested if a not in n_map]
    if bad:
        print(f"Unknown cluster(s): {bad}. Valid: {list(n_map)} (or 1/2/4/5/6).")
        sys.exit(1)
    targets = {s: n_map[s] for s in requested}
else:
    targets = n_map
    print(f"No cluster given -> writing ALL: {list(n_map)}")
    print("  (to write just one, e.g.: python assemble.py cluster_1)")

grand_total = grand_have = 0
for source, n in targets.items():
    subjects = json.load(open(os.path.join(WORK, f"cluster_{n}_subjects.json"), encoding="utf-8"))
    idx_q = by_idx.get(source, {})
    queries = {}
    missing = []
    for i, row in enumerate(subjects):
        q = idx_q.get(str(i)) or idx_q.get(i)
        if q and q.strip():
            queries[row["subject"]] = q.strip()
        else:
            missing.append(row["subject"])
    doc = {"_about": ABOUT.format(name=NAMES[source]).replace("<source>", source), "queries": queries}
    path = os.path.join(CURATED, f"{source}.json")
    json.dump(doc, open(path, "w", encoding="utf-8"), indent=2, ensure_ascii=False)
    grand_total += len(subjects); grand_have += len(queries)
    print(f"{source}: {len(queries)}/{len(subjects)} queries -> {path}")
    for m in missing:
        print(f"    MISSING: {m[:90]}")
print(f"\nTOTAL: {grand_have}/{grand_total} subjects have a curated query.")
