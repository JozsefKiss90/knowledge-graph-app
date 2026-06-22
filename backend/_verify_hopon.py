"""Verification for B6 hop-on host finder: pure-helper unit assertions (offline, deterministic) +
a live smoke test against the running dev Neo4j. Run: NEO4J_URI=bolt://localhost:7687 python _verify_hopon.py
"""
from routes.new_pipeline.cordis.cordis_routes import (
    _is_collaborative_scheme, _programme_of, _months_between, _shape_hop_on_host,
    _rank_hop_on_hosts, _hop_on_facets, hop_on_hosts, WIDENING_COUNTRIES,
)

ok = 0
def check(name, cond):
    global ok
    assert cond, f"FAIL: {name}"
    ok += 1
    print(f"  ok: {name}")

print("=== _is_collaborative_scheme ===")
check("double-spaced RIA", _is_collaborative_scheme("HORIZON  Research and Innovation Actions"))
check("lower RIA", _is_collaborative_scheme("Research and Innovation action"))
check("HORIZON IA", _is_collaborative_scheme("HORIZON Innovation Actions"))
check("plain IA", _is_collaborative_scheme("Innovation action"))
check("bare ria", _is_collaborative_scheme("RIA"))
check("bare ia", _is_collaborative_scheme("IA"))
check("CSA rejected", not _is_collaborative_scheme("HORIZON Coordination and Support Actions"))
check("csa2 rejected", not _is_collaborative_scheme("Coordination and support action"))
check("COFUND rejected", not _is_collaborative_scheme("Co-funding of regional, national and international programmes (COFUND)"))
check("ERC rejected", not _is_collaborative_scheme("HORIZON ERC Grants"))
check("empty rejected", not _is_collaborative_scheme(""))
check("none rejected", not _is_collaborative_scheme(None))

print("=== _programme_of ===")
check("CL3", _programme_of("HORIZON-CL3-2024-FCT-01") == "HORIZON-CL3")
check("HLTH=cluster1", _programme_of("HORIZON-HLTH-2023-CARE-01") == "HORIZON-HLTH")
check("CL1 not matched (Health is HLTH)", _programme_of("HORIZON-CL1-2023-XYZ") is None)
check("Pathfinder open", _programme_of("HORIZON-EIC-2023-PATHFINDEROPEN-01") == "EIC-PATHFINDER")
check("Missions excluded", _programme_of("HORIZON-MISS-2023-CANCER-01") is None)
check("Hop-on call itself excluded", _programme_of("HORIZON-WIDERA-2023-ACCESS-06-01") is None)
check("ERC excluded", _programme_of("ERC-2024-STG") is None)
check("EIC Accelerator excluded", _programme_of("HORIZON-EIC-2023-ACCELERATOROPEN-01") is None)
check("none", _programme_of(None) is None)

print("=== _months_between ===")
check("15 months", _months_between("2026-06-18", "2027-09-30") == 15)
check("day-adjust down", _months_between("2026-06-18", "2026-06-17") == -1)
check("exact 12", _months_between("2026-06-18", "2027-06-18") == 12)
check("unparseable", _months_between("2026-06-18", "not-a-date") is None)

print("=== _shape_hop_on_host ===")
base = {"id": "1", "acronym": "ALPHA", "title": "Alpha", "masterCall": "HORIZON-CL3-2024-FCT-01",
        "fundingScheme": "HORIZON  Research and Innovation Actions",
        "startDate": "2026-02-18", "endDate": "2028-09-30",
        "coordinatorCountry": "DE", "orgCount": 5, "countries": ["DE", "ES", "FR", "PT"],
        "fields": [{"code": "/25/1", "title": "AI"}]}
h = _shape_hop_on_host(base, "2026-06-18")
check("shaped not none", h is not None)
check("programme label", h["programmeLabel"].startswith("Cluster 3"))
check("PT present -> not in gap", "PT" not in h["wideningGap"])
check("HU absent -> in gap", "HU" in h["wideningGap"])
check("non-widening DE never in gap", "DE" not in h["wideningGap"])
check("gap subset-of widening", set(h["wideningGap"]) <= WIDENING_COUNTRIES)
check("monthsSinceStart computed (4mo)", h["monthsSinceStart"] == 4)
check("monthsRemaining computed", h["monthsRemaining"] == _months_between("2026-06-18", "2028-09-30"))
check("url built", h["url"].endswith("/project/id/1"))
csa = dict(base, fundingScheme="HORIZON Coordination and Support Actions")
check("CSA row dropped", _shape_hop_on_host(csa, "2026-06-18") is None)
miss = dict(base, masterCall="HORIZON-MISS-2024-01")
check("ineligible programme dropped", _shape_hop_on_host(miss, "2026-06-18") is None)
# EIC Pathfinder: collaborative by nature, CORDIS scheme is 'HORIZON EIC Grants' (not RIA/IA) -> still kept.
pf = dict(base, masterCall="HORIZON-EIC-2023-PATHFINDEROPEN-01", fundingScheme="HORIZON EIC Grants")
pfh = _shape_hop_on_host(pf, "2026-06-18")
check("Pathfinder kept despite non-RIA/IA scheme", pfh is not None and pfh["programme"] == "EIC-PATHFINDER")
# A Pillar-II cluster with EIC-Grants scheme would NOT exist, but a cluster with CSA scheme stays excluded:
check("cluster still needs RIA/IA", _shape_hop_on_host(dict(base, fundingScheme="HORIZON EIC Grants"), "2026-06-18") is None)

print("=== _rank_hop_on_hosts (freshest start asc, gap desc, acronym) ===")
def mk(ac, since, gap_n):
    return {"acronym": ac, "monthsSinceStart": since, "wideningGap": ["X"] * gap_n}
ranked = _rank_hop_on_hosts([mk("B", 10, 5), mk("A", 2, 1), mk("C", 2, 3)], top_n=10)
check("freshest first", ranked[0]["acronym"] == "C")  # 2mo old, gap3 beats 2mo gap1
check("tie broken by gap then name", [r["acronym"] for r in ranked] == ["C", "A", "B"])
check("None start sorts last", _rank_hop_on_hosts([mk(None_ac, None, 9) for None_ac in ["Z"]] + [mk("A", 5, 0)], top_n=10)[0]["acronym"] == "A")
check("cap honoured", len(_rank_hop_on_hosts([mk(str(i), 5, 1) for i in range(10)], top_n=3)) == 3)

print("=== _hop_on_facets ===")
f = _hop_on_facets([h, dict(h, programme="HORIZON-HLTH", countries=["EL", "DE"],
                            fields=[{"code": "/25/1", "title": "AI"}])])
check("programmes facet", {p["code"] for p in f["programmes"]} == {"HORIZON-CL3", "HORIZON-HLTH"})
check("field facet counts", any(x["code"] == "/25/1" and x["hosts"] == 2 for x in f["fields"]))
check("wideningPresent has PT and EL", {x["code"] for x in f["wideningPresent"]} >= {"PT", "EL"})

print(f"\nALL {ok} PURE CHECKS PASSED")

print("\n=== LIVE smoke test (dev Neo4j) ===")
try:
    res = hop_on_hosts(max_age_months=12, top_n=5)
    print(f"  maxAgeMonths={res['maxAgeMonths']} eligibleCount={res['eligibleCount']} hostCount={res['hostCount']} returned={res['returnedCount']} capped={res['capped']}")
    print(f"  programmes facet: {[(p['code'], p['hosts']) for p in res['facets']['programmes']]}")
    print(f"  wideningPresent (top5): {[(p['code'], p['hosts']) for p in res['facets']['wideningPresent'][:5]]}")
    for hh in res["hosts"][:5]:
        print(f"   - {hh['acronym']:<14} {hh['programme']:<13} started {hh['startDate']} (~{hh['monthsSinceStart']}mo ago) "
              f"ends {hh['endDate']} orgs={hh['orgCount']}")
        print(f"       gap({len(hh['wideningGap'])}): {hh['wideningGap']}")
    # cross-checks on live data
    assert all(_is_collaborative_scheme(h["fundingScheme"]) or h["programme"] == "EIC-PATHFINDER"
               for h in res["hosts"]), "non-collab leaked"
    assert all(h["orgCount"] > 1 for h in res["hosts"]), "single-org leaked"
    assert all(h["programme"] for h in res["hosts"]), "ineligible programme leaked"
    assert all(h["monthsSinceStart"] is not None and h["monthsSinceStart"] <= 12 for h in res["hosts"]), "stale (>12mo) host leaked"
    print("  live cross-checks passed (all hosts collaborative, multi-org, eligible programme, started <=12mo ago)")
    # filter smoke: missing_country
    pt = hop_on_hosts(missing_country="PT", top_n=5)
    assert all("PT" in h["wideningGap"] for h in pt["hosts"]), "missing_country filter broken"
    print(f"  missing_country=PT -> {pt['hostCount']} hosts, all lacking PT  OK")
    # negative top_n must not return the inverted slice (clamp guard)
    neg = hop_on_hosts(top_n=-5)
    assert neg["returnedCount"] == 0, "negative top_n not clamped"
    print(f"  top_n=-5 clamped -> returnedCount={neg['returnedCount']}  OK")
except Exception as e:
    import traceback
    print("  LIVE TEST SKIPPED/FAILED:", e)
    traceback.print_exc()
