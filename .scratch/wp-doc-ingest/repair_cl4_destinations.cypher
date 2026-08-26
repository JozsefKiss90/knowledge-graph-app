// ============================================================================
// repair_cl4_destinations.cypher
// ----------------------------------------------------------------------------
// Brings the CL4 sub-graph in line with cluster_CL4.merged.v2.json (the
// 2026-07-28 work-programme edition, destination-correct).
//
// WHY THIS IS NEEDED
//   * The Jun-24 dump spells 30 topic ids MATERIALS-PRODUCTION; the current work
//     programme and the merged file spell them MAT-PROD. `populate` is
//     MERGE-only, so populating the canonical file created 30 EMPTY TWIN nodes
//     and left the 30 originals - which hold the CORDIS HAS_FUNDED_PROJECT
//     edges - orphaned under the old id.
//   * SPACE-03-83/84 were renamed SPACE-07-83/84 in this edition; a populate adds
//     the new pair instead of renaming, so both pairs exist.
//   * Two portal artefacts (HORIZON-CL4-2026-02-two-stage / -2027-02-two-stage)
//     duplicate real topics and should not be nodes at all.
//   * Destination membership comes from the bucket a call sat in, so 15 calls are
//     attached to the wrong Destination - and those HAS_CALL edges survive a
//     re-populate, because MERGE never removes an edge.
//
// PRINCIPLE: rename, never delete-and-recreate. Relationships attach to nodes,
// not to id values, so SET c.id = ... preserves every CORDIS edge. A
// DETACH DELETE of the tagged calls would drop ~121,398 HAS_FUNDED_PROJECT
// edges and force a quota-heavy re-tag.
//
// HOW TO RUN - one phase at a time, checking each guard. Do not pipe the whole
// file in: the ACT statements are gated on guards a human must read.
//   docker exec -i knowledge-graph-app-dev-neo4j-1 cypher-shell -u neo4j -p password
// cypher-shell prints four JVM "restricted method" WARNINGs on stderr: ignore.
//
// ORDER MATTERS. Every guard states what it must return.
// ============================================================================

// Canonical topic set - the 79 topics the 2026-07-28 work programme defines.
// Generated from cluster_CL4.merged.v2.json; regenerate if the edition changes.
:param canonical => [
  'HORIZON-2027-EUSPA-SPACE-51',
  'HORIZON-CL4-2026-01-MAT-PROD-01',
  'HORIZON-CL4-2026-01-MAT-PROD-04',
  'HORIZON-CL4-2026-01-MAT-PROD-05',
  'HORIZON-CL4-2026-01-MAT-PROD-11',
  'HORIZON-CL4-2026-01-MAT-PROD-12',
  'HORIZON-CL4-2026-01-MAT-PROD-13',
  'HORIZON-CL4-2026-01-MAT-PROD-14',
  'HORIZON-CL4-2026-01-MAT-PROD-23',
  'HORIZON-CL4-2026-01-MAT-PROD-24',
  'HORIZON-CL4-2026-01-MAT-PROD-31',
  'HORIZON-CL4-2026-01-MAT-PROD-41',
  'HORIZON-CL4-2026-01-MAT-PROD-44',
  'HORIZON-CL4-2026-01-MAT-PROD-45',
  'HORIZON-CL4-2026-01-MAT-PROD-46',
  'HORIZON-CL4-2026-01-MAT-PROD-48',
  'HORIZON-CL4-2026-02-DIGITAL-EMERGING-51-two-stage',
  'HORIZON-CL4-2026-02-DIGITAL-EMERGING-53-two-stage',
  'HORIZON-CL4-2026-02-MAT-PROD-21-two-stage',
  'HORIZON-CL4-2026-04-DATA-02',
  'HORIZON-CL4-2026-04-DATA-03',
  'HORIZON-CL4-2026-04-DATA-06',
  'HORIZON-CL4-2026-04-DIGITAL-EMERGING-01',
  'HORIZON-CL4-2026-04-DIGITAL-EMERGING-08',
  'HORIZON-CL4-2026-04-DIGITAL-EMERGING-09',
  'HORIZON-CL4-2026-04-DIGITAL-EMERGING-11',
  'HORIZON-CL4-2026-04-DIGITAL-EMERGING-12',
  'HORIZON-CL4-2026-04-DIGITAL-EMERGING-14',
  'HORIZON-CL4-2026-04-DIGITAL-EMERGING-15',
  'HORIZON-CL4-2026-04-DIGITAL-EMERGING-17',
  'HORIZON-CL4-2026-04-DIGITAL-EMERGING-18',
  'HORIZON-CL4-2026-04-DIGITAL-EMERGING-19',
  'HORIZON-CL4-2026-04-HUMAN-01',
  'HORIZON-CL4-2026-04-HUMAN-02',
  'HORIZON-CL4-2026-05-DIGITAL-EMERGING-02',
  'HORIZON-CL4-2026-05-DIGITAL-EMERGING-03',
  'HORIZON-CL4-2026-05-MAT-PROD-25',
  'HORIZON-CL4-2026-SPACE-03-11',
  'HORIZON-CL4-2026-SPACE-03-31',
  'HORIZON-CL4-2026-SPACE-03-32',
  'HORIZON-CL4-2026-SPACE-03-61',
  'HORIZON-CL4-2026-SPACE-03-81',
  'HORIZON-CL4-2026-SPACE-03-82',
  'HORIZON-CL4-2026-SPACE-03-85',
  'HORIZON-CL4-2026-SPACE-03-86',
  'HORIZON-CL4-2027-01-MAT-PROD-02',
  'HORIZON-CL4-2027-01-MAT-PROD-03',
  'HORIZON-CL4-2027-01-MAT-PROD-06',
  'HORIZON-CL4-2027-01-MAT-PROD-08',
  'HORIZON-CL4-2027-01-MAT-PROD-16',
  'HORIZON-CL4-2027-01-MAT-PROD-17',
  'HORIZON-CL4-2027-01-MAT-PROD-22',
  'HORIZON-CL4-2027-01-MAT-PROD-42',
  'HORIZON-CL4-2027-01-MAT-PROD-47',
  'HORIZON-CL4-2027-01-MAT-PROD-49',
  'HORIZON-CL4-2027-01-MAT-PROD-50',
  'HORIZON-CL4-2027-01-MAT-PROD-61',
  'HORIZON-CL4-2027-01-MAT-PROD-62',
  'HORIZON-CL4-2027-02-DIGITAL-EMERGING-52-two-stage',
  'HORIZON-CL4-2027-02-MAT-PROD-32-two-stage',
  'HORIZON-CL4-2027-04-DATA-03',
  'HORIZON-CL4-2027-04-DATA-08',
  'HORIZON-CL4-2027-04-DATA-09',
  'HORIZON-CL4-2027-04-DIGITAL-EMERGING-04',
  'HORIZON-CL4-2027-04-DIGITAL-EMERGING-05',
  'HORIZON-CL4-2027-04-DIGITAL-EMERGING-06',
  'HORIZON-CL4-2027-04-DIGITAL-EMERGING-10',
  'HORIZON-CL4-2027-04-DIGITAL-EMERGING-11',
  'HORIZON-CL4-2027-04-HUMAN-01',
  'HORIZON-CL4-2027-04-HUMAN-02',
  'HORIZON-CL4-2027-04-HUMAN-07',
  'HORIZON-CL4-2027-05-DIGITAL-EMERGING-03',
  'HORIZON-CL4-2027-SPACE-03-12',
  'HORIZON-CL4-2027-SPACE-03-21',
  'HORIZON-CL4-2027-SPACE-03-33',
  'HORIZON-CL4-2027-SPACE-03-34',
  'HORIZON-CL4-2027-SPACE-03-71',
  'HORIZON-CL4-2027-SPACE-07-83',
  'HORIZON-CL4-2027-SPACE-07-84'
];


// ---------------------------------------------------------------------------
// PHASE 0 - MEASURE (read-only). Record these before changing anything.
// ---------------------------------------------------------------------------
MATCH (c:Call {source:'cluster_4'}) RETURN count(c) AS cl4_calls;

MATCH (c:Call {source:'cluster_4'}) WHERE c.id CONTAINS 'MATERIALS-PRODUCTION'
RETURN count(c) AS stale_ids;                    // expected 30

MATCH (c:Call {source:'cluster_4'})-[r:HAS_FUNDED_PROJECT]->()
RETURN count(DISTINCT c) AS calls_with_evidence, count(r) AS cordis_edges;
// ^ WRITE THESE DOWN. Phase 9 must reproduce cordis_edges exactly.

MATCH (d:Destination)-[:HAS_CALL]->(c:Call {source:'cluster_4'})
RETURN d.name AS destination, count(c) AS calls ORDER BY calls DESC;


// ---------------------------------------------------------------------------
// PHASE 1 - remove the EMPTY TWINS created by populating canonical ids.
// A twin is a MAT-PROD node whose MATERIALS-PRODUCTION original still exists.
// GUARD: must return 0. If >0, a twin picked up CORDIS evidence - STOP and merge
// by hand (apoc.refactor.mergeNodes) rather than deleting.
// ---------------------------------------------------------------------------
MATCH (new:Call {source:'cluster_4'}) WHERE new.id CONTAINS 'MAT-PROD'
MATCH (old:Call {source:'cluster_4'})
  WHERE old.id = replace(new.id, 'MAT-PROD', 'MATERIALS-PRODUCTION')
OPTIONAL MATCH (new)-[r:HAS_FUNDED_PROJECT]->()
RETURN count(r) AS twin_evidence_must_be_zero;
// (No rows means there are no twins - skip straight to phase 2.)

// ACT
MATCH (new:Call {source:'cluster_4'}) WHERE new.id CONTAINS 'MAT-PROD'
MATCH (old:Call {source:'cluster_4'})
  WHERE old.id = replace(new.id, 'MAT-PROD', 'MATERIALS-PRODUCTION')
DETACH DELETE new
RETURN count(*) AS twins_deleted;                // expected 30


// ---------------------------------------------------------------------------
// PHASE 2 - rename the originals in place. Keeps every CORDIS edge.
// GUARD: must return 0 (nothing already holds the target id).
// ---------------------------------------------------------------------------
MATCH (c:Call {source:'cluster_4'}) WHERE c.id CONTAINS 'MATERIALS-PRODUCTION'
WITH replace(c.id,'MATERIALS-PRODUCTION','MAT-PROD') AS newId
OPTIONAL MATCH (x:Call {id:newId})
RETURN count(x) AS collisions_must_be_zero;
// (No rows at all also means zero - it means phase 1 already cleared every twin.)

// ACT
MATCH (c:Call {source:'cluster_4'}) WHERE c.id CONTAINS 'MATERIALS-PRODUCTION'
SET c.id = replace(c.id,'MATERIALS-PRODUCTION','MAT-PROD')
RETURN count(c) AS renamed;                      // expected 30


// ---------------------------------------------------------------------------
// PHASE 3 - the SPACE-03 -> SPACE-07 rename (2026-07-28 edition).
// Document-sourced topics, so normally neither pair carries CORDIS evidence.
// GUARD first, then take exactly ONE of the two ACT branches.
// ---------------------------------------------------------------------------
UNWIND [['HORIZON-CL4-2027-SPACE-03-83','HORIZON-CL4-2027-SPACE-07-83'],
        ['HORIZON-CL4-2027-SPACE-03-84','HORIZON-CL4-2027-SPACE-07-84']] AS pair
OPTIONAL MATCH (o:Call {id:pair[0]})
OPTIONAL MATCH (n:Call {id:pair[1]})
OPTIONAL MATCH (o)-[ro:HAS_FUNDED_PROJECT]->()
OPTIONAL MATCH (n)-[rn:HAS_FUNDED_PROJECT]->()
RETURN pair[0] AS old_id, o IS NOT NULL AS old_exists, count(DISTINCT ro) AS old_evidence,
       pair[1] AS new_id, n IS NOT NULL AS new_exists, count(DISTINCT rn) AS new_evidence;

// ACT 3a - BOTH pairs exist (the state after populating the v1 merge): drop the
// old ones. Only safe while old_evidence = 0 above.
MATCH (o:Call {source:'cluster_4'})
  WHERE o.id IN ['HORIZON-CL4-2027-SPACE-03-83','HORIZON-CL4-2027-SPACE-03-84']
  AND EXISTS { MATCH (n:Call) WHERE n.id = replace(o.id,'SPACE-03','SPACE-07') }
DETACH DELETE o
RETURN count(*) AS old_space_pair_deleted;

// ACT 3b - ONLY the old pair exists: rename instead of deleting. (Skip if 3a ran.)
// MATCH (o:Call {source:'cluster_4'})
//   WHERE o.id IN ['HORIZON-CL4-2027-SPACE-03-83','HORIZON-CL4-2027-SPACE-03-84']
// SET o.id = replace(o.id,'SPACE-03','SPACE-07')
// RETURN count(o) AS old_space_pair_renamed;


// ---------------------------------------------------------------------------
// PHASE 4 - drop everything CL4 the current work programme does not define:
// the two truncated portal artefacts and any leftover from an earlier edition.
// GUARD: review the list. Anything with cordis_evidence > 0 is a judgement call.
// ---------------------------------------------------------------------------
MATCH (c:Call {source:'cluster_4'}) WHERE NOT c.id IN $canonical
OPTIONAL MATCH (c)-[r:HAS_FUNDED_PROJECT]->()
RETURN c.id AS doomed, c.name AS title, count(r) AS cordis_evidence
ORDER BY cordis_evidence DESC, doomed;

// ACT - remove only the ones with no CORDIS evidence
MATCH (c:Call {source:'cluster_4'}) WHERE NOT c.id IN $canonical
  AND NOT EXISTS { MATCH (c)-[:HAS_FUNDED_PROJECT]->() }
DETACH DELETE c
RETURN count(*) AS obsolete_calls_deleted;


// ---------------------------------------------------------------------------
// PHASE 5 - clear stale Destination membership.
// MERGE never removes an edge, so a call that changes Destination keeps its old
// HAS_CALL too. Drop all CL4 destination membership; phase 6 rebuilds it from
// the corrected file. Call nodes and CORDIS edges are untouched.
// ---------------------------------------------------------------------------
MATCH (d:Destination)-[r:HAS_CALL]->(c:Call {source:'cluster_4'})
DELETE r RETURN count(r) AS destination_edges_cleared;

// Cluster-level (Cluster)-[:HAS_CALL]->(Call) edges are 1:1 and correct - leave them.


// ---------------------------------------------------------------------------
// PHASE 6 - RE-POPULATE (outside cypher-shell)
//
//   python .scratch/wp-doc-ingest/cl4_merge_v2.py --promote
//   curl -X POST http://localhost:8000/cluster4/populate
//
// populate is `MERGE (c:Call {id:$id}) SET c += $props` plus MERGEs for the
// Cluster/Destination edges. It never touches HAS_FUNDED_PROJECT, so the CORDIS
// layer survives and no API quota is spent.
// ---------------------------------------------------------------------------


// ---------------------------------------------------------------------------
// PHASE 7 - repair Call.keywords (free, no API calls).
// The grouped files carry no `keywords` key and _sanitize_props preserves empty
// lists, so `SET c += $props` overwrites CORDIS-written keywords with []. The
// tagger writes related_topics and keywords from the same value, so copy back.
// Root fix: make _build_call_props skip an EMPTY keywords list - conditionally,
// because CEF/CREA/DEP/ERASMUS/EURATOM grouped files DO carry real keywords.
// ---------------------------------------------------------------------------
MATCH (c:Call)
WHERE size(c.related_topics) > 0 AND (c.keywords IS NULL OR size(c.keywords) = 0)
SET c.keywords = c.related_topics
RETURN count(c) AS keywords_restored;


// ---------------------------------------------------------------------------
// PHASE 8 - drop Destination nodes left with no calls: retired buckets such as
// the portal-only "Achieving technological leadership ... raw materials" label
// and the pilot's "Space (work programme)".
// ---------------------------------------------------------------------------
MATCH (d:Destination {source:'cluster_4'})
WHERE NOT EXISTS { MATCH (d)-[:HAS_CALL]->(:Call) }
DETACH DELETE d RETURN count(*) AS empty_destinations_deleted;


// ---------------------------------------------------------------------------
// PHASE 9 - VERIFY against the phase 0 numbers.
// ---------------------------------------------------------------------------
MATCH (c:Call {source:'cluster_4'}) RETURN count(c) AS cl4_calls;   // expect 79

MATCH (c:Call {source:'cluster_4'}) WHERE c.id CONTAINS 'MATERIALS-PRODUCTION'
RETURN count(c) AS stale_ids_must_be_zero;

MATCH (c:Call {source:'cluster_4'}) WHERE NOT c.id IN $canonical
RETURN collect(c.id) AS unexpected_must_be_empty;

MATCH (d:Destination)-[:HAS_CALL]->(c:Call {source:'cluster_4'})
RETURN d.name AS destination, count(c) AS calls ORDER BY calls DESC;
// expect exactly:
//   30  Leadership in materials and production for Europe
//   21  Achieving open strategic autonomy in digital and emerging enabling technologies
//   16  Open Strategic Autonomy in Developing, Deploying and Using Global Space-Based Infrastructure, Services, Applications and Data
//    6  Digital and industrial technologies driving human-centric innovation
//    6  Developing an agile and secure single market and infrastructure for data-services and trustworthy artificial intelligence services

MATCH (c:Call {source:'cluster_4'})
RETURN sum(CASE WHEN c.technology_readiness_level IS NOT NULL
                 AND c.technology_readiness_level <> '' THEN 1 ELSE 0 END) AS trl;  // expect 54

MATCH (c:Call {source:'cluster_4'}) WHERE c.status = 'Cancelled'
RETURN collect(c.id) AS cancelled;
// expect HORIZON-CL4-2026-04-DIGITAL-EMERGING-11 / -12 / -18

MATCH (c:Call {source:'cluster_4'})-[r:HAS_FUNDED_PROJECT]->()
RETURN count(r) AS cordis_edges;     // MUST equal the phase 0 figure - nothing lost

// Every call sits under exactly one Destination
MATCH (c:Call {source:'cluster_4'})
OPTIONAL MATCH (d:Destination)-[:HAS_CALL]->(c)
WITH c, count(d) AS parents
RETURN parents, count(c) AS calls ORDER BY parents;   // expect a single row: 1 | 79
