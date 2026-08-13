# verify_restore.ps1 - CLI verification that the dev stack + restored graph are healthy.
# Usage (from repo root C:\Code\knowledge-graph-app):
#   powershell -ExecutionPolicy Bypass -File .\verify_restore.ps1

$ErrorActionPreference = "Continue"
$PROJECT = "knowledge-graph-app-dev"
$COMPOSE = "docker-compose.dev.yml"
$NEO     = "$PROJECT-neo4j-1"
$BASE    = "http://localhost:8000"

function Section($t) { Write-Host "`n=== $t ===" -ForegroundColor Cyan }
function Cy($q) { docker exec -i $NEO cypher-shell -u neo4j -p password --format plain $q }

Section "1. Containers + volume"
docker compose -p $PROJECT -f $COMPOSE ps
docker volume ls --filter "name=neo4j_data"
# expect: 3 containers Up, and volume knowledge-graph-app-dev_neo4j_data present

Section "2. Backend / DB health"
try { (Invoke-RestMethod "$BASE/")          | ConvertTo-Json -Compress } catch { Write-Host "FAIL /" -ForegroundColor Red }
try { (Invoke-RestMethod "$BASE/health/db") | ConvertTo-Json -Compress } catch { Write-Host "FAIL /health/db" -ForegroundColor Red }

Section "3. Graph size (raw Neo4j)"
Cy "MATCH (n) RETURN count(n) AS totalNodes;"
Cy "MATCH ()-[r]->() RETURN count(r) AS totalRels;"

Section "4. Nodes by label"
Cy "MATCH (n) UNWIND labels(n) AS l RETURN l AS label, count(*) AS n ORDER BY n DESC;"

Section "5. Relationships by type"
Cy "MATCH ()-[r]->() RETURN type(r) AS rel, count(*) AS n ORDER BY n DESC;"

Section "6. Per programme: calls, tagged calls, CORDIS project links"
Cy "MATCH (c:Call) WITH c, count { (c)-[:HAS_FUNDED_PROJECT]->() } AS ev RETURN c.source AS source, count(*) AS calls, sum(CASE WHEN ev > 0 THEN 1 ELSE 0 END) AS taggedCalls, sum(ev) AS projectLinks ORDER BY source;"

Section "7. Untagged calls per source (0 expected for tagged programmes)"
Cy "MATCH (c:Call) WHERE count { (c)-[:HAS_FUNDED_PROJECT]->() } = 0 RETURN c.source AS source, count(*) AS untagged ORDER BY untagged DESC;"

Section "7b. WHY each untagged call is untagged (attempted-but-empty vs never-attempted)"
# c.cordis_area_query is written whenever the tagger actually ran a CORDIS extraction for that call's
# subject - even when the extraction returned zero projects. So:
#   attemptedEmpty  = CORDIS was queried and honestly returned nothing (expected for DEP/CREA/CEF/EURATOM)
#   neverAttempted  = no curated query for that subject, or the source was never tagged (by design)
Cy "MATCH (c:Call) WHERE count { (c)-[:HAS_FUNDED_PROJECT]->() } = 0 RETURN c.source AS source, count(*) AS untagged, sum(CASE WHEN c.cordis_area_query IS NOT NULL THEN 1 ELSE 0 END) AS attemptedEmpty, sum(CASE WHEN c.cordis_area_query IS NULL THEN 1 ELSE 0 END) AS neverAttempted ORDER BY untagged DESC;"

Section "8. CORDIS layer via API"
try { (Invoke-RestMethod "$BASE/cordis/stats")             | ConvertTo-Json -Compress } catch { Write-Host "FAIL /cordis/stats" -ForegroundColor Red }
try { (Invoke-RestMethod "$BASE/cordis/portfolio-summary") | ConvertTo-Json -Compress } catch { Write-Host "FAIL /cordis/portfolio-summary" -ForegroundColor Red }
try { (Invoke-RestMethod "$BASE/cordis/tag-status")        | ConvertTo-Json -Compress -Depth 3 } catch { Write-Host "(no tag-status yet - normal after a dump restore)" }

Section "9. Per-programme node counts via API"
$progs = @("cluster1","cluster2","cluster3","cluster4","cluster5","cluster6",
           "dep","crea","widera","erasmus","cef","euratom",
           "eic","eie","erc","infra","msca","missions")
foreach ($p in $progs) {
  try {
    $r = Invoke-RestMethod "$BASE/$p/nodes"
    $color = if ($r.count -gt 0) { "Green" } else { "Red" }
    Write-Host ("{0,-10} nodes={1}" -f $p, $r.count) -ForegroundColor $color
  } catch { Write-Host ("{0,-10} ERROR" -f $p) -ForegroundColor Red }
}

Section "10. Spot-check one tagged call's evidence panel (A2)"
$callId = (Cy "MATCH (c:Call)-[:HAS_FUNDED_PROJECT]->() RETURN c.id AS id LIMIT 1;" | Select-Object -Skip 1 | Select-Object -First 1)
if ($callId) {
  $callId = $callId.Trim().Trim('"')
  Write-Host "sample call: $callId"
  try { (Invoke-RestMethod "$BASE/cordis/call-evidence?call_id=$callId") | ConvertTo-Json -Compress -Depth 3 } catch { Write-Host "FAIL call-evidence" -ForegroundColor Red }
}

Write-Host "`nDone. UI: http://localhost:3001   Neo4j browser: http://localhost:7474 (neo4j/password)" -ForegroundColor Cyan
