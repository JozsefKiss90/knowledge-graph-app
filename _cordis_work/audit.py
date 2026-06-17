"""Read-only progress/audit for a CORDIS cluster population run.

Usage:  python audit.py cluster_1     (or: 1 / cl1 ; default: cluster_1)

Shows global ingest stats (the live pulse) and, per cluster, how many calls are tagged
(related_topics) / area-linked (cordis_area_query), how many distinct subjects are done out
of the total, and lists the still-untagged subjects (the ones whose query may need refining).
Does only GETs against the running backend — never writes."""
import json, os, sys, urllib.request

BASE = "http://localhost:8000"
WORK = r"C:\Code\knowledge-graph-app\_cordis_work"

def get(p):
    with urllib.request.urlopen(BASE + p, timeout=120) as r:
        return json.load(r)

def normalise(a):
    a = a.strip().lower()
    if a.startswith("cluster_"): return a
    if a.startswith("cl"): a = a[2:]
    return f"cluster_{a}" if a.isdigit() else a

source = normalise(sys.argv[1]) if len(sys.argv) > 1 else "cluster_1"
n = source.split("_")[-1]

st = get("/cordis/stats")
print(f"GLOBAL /cordis/stats: projects={st.get('projects')} orgs={st.get('organisations')} "
      f"countries={st.get('countries')} fields={st.get('fields')}")

# Expected distinct-subject total from the staged subject list (if present).
expected = None
subj_file = os.path.join(WORK, f"{source}_subjects.json")
if os.path.isfile(subj_file):
    expected = len(json.load(open(subj_file, encoding="utf-8")))

data = get(f"/cluster{n}/nodes")["data"]
calls = [x["n"] for x in data if isinstance(x.get("n"), dict) and x["n"].get("type") == "Call"]
def subj(c): return (c.get("topic_title") or c.get("name") or "").strip()
tagged = [c for c in calls if c.get("related_topics")]
linked = [c for c in calls if c.get("cordis_area_query")]
done_subjects = {subj(c) for c in tagged}
all_subjects = {subj(c) for c in calls if subj(c)}
untagged = sorted(all_subjects - done_subjects)

print(f"\n{source}: calls={len(calls)}  tagged={len(tagged)}  area-linked={len(linked)}")
print(f"  distinct subjects done: {len(done_subjects)} / {expected if expected is not None else len(all_subjects)}")
if untagged:
    print(f"  still untagged ({len(untagged)}):")
    for s in untagged:
        print("    -", s[:95])
else:
    print("  ALL subjects tagged ✓")
