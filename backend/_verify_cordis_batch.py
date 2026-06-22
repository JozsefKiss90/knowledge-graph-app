"""Offline correctness check for the batched CordisGraphBuilder.ingest (UNWIND rewrite).

Mocks the DB with a recorder, runs synthetic projects across a chunk boundary, and asserts the batched
builder upserts exactly the right nodes/relationships and reports the same stats the row-at-a-time version
would have. No live Neo4j needed. Run:  python _verify_cordis_batch.py
"""
import routes.new_pipeline.cordis.cordis_builder as B

ok = 0
def check(name, cond):
    global ok
    assert cond, f"FAIL: {name}"
    ok += 1
    print(f"  ok: {name}")


class RecorderDB:
    """Captures queries. For the FUNDED_UNDER query it returns a count of rows whose code matches a known
    set of app Call codes, so calls_linked can be exercised."""
    def __init__(self, call_codes):
        self.call_codes = set(call_codes)
        self.projects, self.fields, self.orgs, self.countries = {}, {}, {}, set()
        self.classified, self.registered, self.participations, self.funded = set(), set(), {}, []
        self.queries = []

    def query(self, q, p=None):
        p = p or {}
        self.queries.append(q)
        if q.startswith("CREATE INDEX"):
            return []
        rows = p.get("rows")
        if "MERGE (pr:CordisProject {id:row.id})" in q:
            for r in rows:
                self.projects[r["id"]] = r["props"]
        elif "MERGE (rf:ResearchField {code:row.code})" in q:
            for r in rows:
                self.fields[r["code"]] = r["title"]
        elif "MERGE (pr)-[:CLASSIFIED_AS]->(rf)" in q:
            for r in rows:
                self.classified.add((r["pid"], r["code"]))
        elif "MERGE (c:Country {code:code})" in q:
            self.countries.update(p["codes"])
        elif "MERGE (og:CordisOrganisation {id:row.id})" in q:
            for r in rows:
                self.orgs[r["id"]] = r["props"]
        elif "MERGE (og)-[:REGISTERED_IN]->(c)" in q:
            for r in rows:
                self.registered.add((r["oid"], r["code"]))
        elif "MERGE (og)-[r:PARTICIPATED_IN]->(pr)" in q:
            for r in rows:
                self.participations[(r["oid"], r["pid"])] = r
        elif "MERGE (pr)-[:FUNDED_UNDER]->(call)" in q:
            n = sum(1 for r in rows if r["code"] in self.call_codes)
            for r in rows:
                self.funded.append((r["pid"], r["code"]))
            return [{"n": n}]
        return []


def make_projects():
    # P1 and P3 share org O1 (dedup across chunk boundary) and field /25/1.
    return [
        {"id": "P1", "title": "Alpha", "masterCall": "CALL-A", "topicCode": "T-A",
         "fields": [{"code": "/25/1", "title": "AI"}, {"code": "/10", "title": "Bio"}],
         "organisations": [{"id": "O1", "name": "Org One", "country": "DE", "role": "coordinator", "order": 1},
                           {"id": "O2", "name": "Org Two", "country": "ES", "role": "participant", "order": 2}]},
        {"id": "P2", "title": "Beta", "masterCall": "NOPE",
         "fields": [{"code": "/10", "title": "Bio"}],
         "organisations": [{"id": "O3", "name": "Org Three", "country": "DE", "role": "participant"}]},
        {"id": "", "title": "skipped — no id"},
        {"id": "P3", "title": "Gamma", "topicCode": "CALL-A",
         "fields": [{"code": "/25/1", "title": "AI"}],
         "organisations": [{"id": "O1", "name": "Org One", "country": "DE", "role": "participant", "order": 5}]},
    ]


print("=== batched ingest, CHUNK=2 (forces a chunk boundary between P2 and P3) ===")
rec = RecorderDB(call_codes={"CALL-A"})
B.db = rec                 # builder reads module-level db
B._indexes_ensured = False  # let ensure_indexes fire once (recorded, harmless)
builder = B.CordisGraphBuilder(preview=False)
builder.CHUNK = 2
stats = builder.ingest(make_projects())

check("projects upserted = P1,P2,P3", set(rec.projects) == {"P1", "P2", "P3"})
check("orgs deduped across chunks = O1,O2,O3", set(rec.orgs) == {"O1", "O2", "O3"})
check("fields deduped = /25/1,/10", set(rec.fields) == {"/25/1", "/10"})
check("countries = DE,ES", rec.countries == {"DE", "ES"})
check("classified edges", rec.classified == {("P1", "/25/1"), ("P1", "/10"), ("P2", "/10"), ("P3", "/25/1")})
check("registered only on first sight of each org", rec.registered == {("O1", "DE"), ("O2", "ES"), ("O3", "DE")})
check("participations incl. O1 on both P1 and P3",
      set(rec.participations) == {("O1", "P1"), ("O2", "P1"), ("O3", "P2"), ("O1", "P3")})
check("participation prop carried (O1->P3 order=5)", rec.participations[("O1", "P3")]["order"] == 5)
check("funded rows linked via CALL-A only (P1 master, P3 topic)",
      sorted(rec.funded) == [("P1", "CALL-A"), ("P1", "T-A"), ("P2", "NOPE"), ("P3", "CALL-A")])

print("=== stats parity with the row-at-a-time semantics ===")
check("projects stat = 3", stats["projects"] == 3)
check("organisations stat = 3 distinct", stats["organisations"] == 3)
check("fields stat = 2 distinct", stats["fields"] == 2)
check("participations stat = 4 rows", stats["participations"] == 4)
check("calls_linked = 2 matches (P1 CALL-A, P3 CALL-A)", stats["calls_linked"] == 2)

print("=== query-count win: a handful of UNWINDs, not O(rows) ===")
non_index = [q for q in rec.queries if not q.startswith("CREATE INDEX")]
check(f"<=16 write queries for 3 projects (got {len(non_index)})", len(non_index) <= 16)

print("=== preview writes nothing but still counts ===")
rec2 = RecorderDB(call_codes={"CALL-A"})
B.db = rec2
pv = B.CordisGraphBuilder(preview=True)
pv.CHUNK = 2
pstats = pv.ingest(make_projects())
check("preview issued zero queries", len(rec2.queries) == 0)
check("preview stats still computed", pstats["projects"] == 3 and pstats["organisations"] == 3
      and pstats["fields"] == 2 and pstats["participations"] == 4)
check("preview calls_linked is 0 (no DB to return counts)", pstats["calls_linked"] == 0)

print(f"\nALL {ok} CHECKS PASSED")
