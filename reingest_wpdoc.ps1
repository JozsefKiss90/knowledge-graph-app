# reingest_wpdoc.ps1 - re-ingest the CL3/CL4 work-programme doc-merge WITHOUT destroying the CORDIS layer.
#
# Why this exists: RUNBOOK step 5 / RESTOREPLAN Path C say `DELETE /clusterN/all` then populate.
# That DETACH DELETEs the Call nodes and takes ~145k HAS_FUNDED_PROJECT edges with them, forcing a
# quota-heavy CORDIS re-tag. `populate` on its own is pure MERGE + `SET c += $props` and never touches
# relationships. The only thing that breaks MERGE is a CHANGED call id - MERGE creates a new node at
# the new id and leaves the old one orphaned.
#
# CL4 has exactly that problem: the restored Jun-24 graph still uses the old `MATERIALS-PRODUCTION`
# spelling on 30 calls, while the committed grouped file uses the canonical `MAT-PROD`. Rather than
# delete, this script RENAMES those ids in place (SET c.id = replace(...)). Relationships attach to
# nodes, not to id values, so the CORDIS edges ride along untouched. That is the whole trick.
#
# Usage (from repo root C:\Code\knowledge-graph-app):
#   powershell -ExecutionPolicy Bypass -File .\reingest_wpdoc.ps1              # preflight only, no writes
#   powershell -ExecutionPolicy Bypass -File .\reingest_wpdoc.ps1 -Execute     # rename + ingest + repair
#   powershell -ExecutionPolicy Bypass -File .\reingest_wpdoc.ps1 -Clusters cluster3 -Execute

param(
  [string[]]$Clusters = @("cluster3","cluster4"),
  [switch]$Execute
)

$ErrorActionPreference = "Stop"
$NEO  = "knowledge-graph-app-dev-neo4j-1"
$BASE = "http://localhost:8000"
$OUT  = "backend\routes\new_pipeline\output_files"

# route prefix -> source tag, grouped file, expected NEW ids, and the vintage id alias (if any)
$MAP = @{
  "cluster3" = @{ source="cluster_3"; file="cluster_CL3.grouped.json"; expectNew=0
                  stale=$null; canon=$null }
  "cluster4" = @{ source="cluster_4"; file="cluster_CL4.grouped.json"; expectNew=16
                  stale="MATERIALS-PRODUCTION"; canon="MAT-PROD" }
}

function Section($t) { Write-Host "`n=== $t ===" -ForegroundColor Cyan }
function Warn($t)    { Write-Host $t -ForegroundColor Yellow }
function Bad($t)     { Write-Host $t -ForegroundColor Red }
function Good($t)    { Write-Host $t -ForegroundColor Green }

# cypher-shell writes 4 JVM "restricted method" WARNINGs to stderr AND a column header to stdout.
# Do NOT drop line 0 positionally (stderr/stdout interleaving is not deterministic) - filter by
# content instead. That was the bug that made "c.id" show up as a stale id and every count read 0.
function CyRaw([string]$q) {
  $prev = $ErrorActionPreference
  $ErrorActionPreference = 'Continue'
  $code = 0
  try {
    $raw = docker exec -i $NEO cypher-shell -u neo4j -p password --format plain $q 2>&1 | ForEach-Object { "$_" }
    $code = $LASTEXITCODE
  } finally { $ErrorActionPreference = $prev }
  # NEVER swallow a cypher error. A failed query used to fall through the numeric filter and return 0,
  # which read as "0 collisions, safe" and "renamed 0" instead of "your query was invalid".
  if ($code -ne 0) {
    Bad  "  cypher-shell FAILED (exit $code) on:"
    Write-Host "    $q" -ForegroundColor DarkGray
    @($raw) | Where-Object { $_ -notmatch 'WARNING|java\.|enable-native-access|Restricted methods' } |
      ForEach-Object { Bad "    $_" }
    throw "cypher-shell error"
  }
  return @($raw) | Where-Object {
    $_ -ne $null -and $_.Trim() -ne "" -and
    $_ -notmatch 'WARNING|java\.|enable-native-access|Restricted methods'
  } | ForEach-Object { $_.Trim().Trim('"') }
}
# ids: every real call id starts with HORIZON- ; the header ("c.id") never does.
function CyIds([string]$q)    { return @(CyRaw $q | Where-Object { $_ -match '^HORIZON-' }) }
# scalar: the first purely-numeric line; the header ("count(c)") is not numeric.
function CyScalar([string]$q) {
  $n = @(CyRaw $q | Where-Object { $_ -match '^-?\d+$' })
  if ($n.Count -ge 1) { return [int]$n[0] }
  return 0
}

function Snapshot([string]$src) {
  return [pscustomobject]@{
    calls    = CyScalar "MATCH (c:Call {source:'$src'}) RETURN count(c);"
    trl      = CyScalar "MATCH (c:Call {source:'$src'}) WHERE c.technology_readiness_level IS NOT NULL AND c.technology_readiness_level <> '' RETURN count(c);"
    cordis   = CyScalar "MATCH (:Call {source:'$src'})-[r:HAS_FUNDED_PROJECT]->() RETURN count(r);"
    tagged   = CyScalar "MATCH (c:Call {source:'$src'}) WHERE c.related_topics IS NOT NULL AND size(c.related_topics) > 0 RETURN count(c);"
    keywords = CyScalar "MATCH (c:Call {source:'$src'}) WHERE c.keywords IS NOT NULL AND size(c.keywords) > 0 RETURN count(c);"
    dupes    = CyScalar "MATCH (c:Call {source:'$src'}) WITH c.id AS id, count(*) AS n WHERE n > 1 RETURN count(id);"
  }
}

function Get-Plan([string]$prefix) {
  $cfg  = $MAP[$prefix]
  $path = Join-Path $OUT $cfg.file
  if (-not (Test-Path $path)) { Bad "  grouped file missing: $path"; exit 1 }

  $json    = Get-Content $path -Raw -Encoding UTF8 | ConvertFrom-Json
  $fileIds = @($json.destinations | ForEach-Object { $_.calls } | ForEach-Object { $_.call_id } | Where-Object { $_ })
  $graphIds= CyIds "MATCH (c:Call {source:'$($cfg.source)'}) RETURN c.id;"

  $diff      = Compare-Object -ReferenceObject $fileIds -DifferenceObject $graphIds
  $fileOnly  = @($diff | Where-Object { $_.SideIndicator -eq '<=' } | ForEach-Object { $_.InputObject })
  $graphOnly = @($diff | Where-Object { $_.SideIndicator -eq '=>' } | ForEach-Object { $_.InputObject })

  # split the stale set into "fixable by rename" vs "genuinely unknown"
  $renamable = @(); $unknown = @($graphOnly)
  if ($cfg.stale) {
    $renamable = @($graphOnly | Where-Object { $_ -like "*$($cfg.stale)*" })
    $unknown   = @($graphOnly | Where-Object { $_ -notlike "*$($cfg.stale)*" })
  }
  return [pscustomobject]@{
    prefix=$prefix; source=$cfg.source; cfg=$cfg
    fileIds=$fileIds; graphIds=$graphIds
    fileOnly=$fileOnly; graphOnly=$graphOnly; renamable=$renamable; unknown=$unknown
  }
}

# ---------------------------------------------------------------- 0. sanity
Section "0. Preconditions"
try { $h = Invoke-RestMethod "$BASE/health/db"; Good "  backend/db: $($h.status)" }
catch { Bad "  Backend not reachable at $BASE - is the dev stack up? (docker compose -f docker-compose.dev.yml up -d)"; exit 1 }

$plans = @()

# ---------------------------------------------------------------- 1. preflight
foreach ($c in $Clusters) {
  if (-not $MAP.ContainsKey($c)) { Bad "Unknown cluster '$c' (expected cluster3 / cluster4)"; exit 1 }
  Section "1. Preflight - $c"
  $p = Get-Plan $c
  $p | Add-Member before (Snapshot $p.source)

  Write-Host ("  file ids {0} | graph ids {1}" -f $p.fileIds.Count, $p.graphIds.Count)
  Write-Host ("  before -> calls {0} | TRL {1} | CORDIS links {2} | tagged {3} | keywords {4} | dup ids {5}" -f `
              $p.before.calls, $p.before.trl, $p.before.cordis, $p.before.tagged, $p.before.keywords, $p.before.dupes)

  if ($p.renamable.Count -gt 0) {
    Warn ("  stale ids fixable by in-place rename: {0}  ({1} -> {2})" -f $p.renamable.Count, $p.cfg.stale, $p.cfg.canon)
    Write-Host ("      e.g. {0}" -f $p.renamable[0])
    # a rename must not land on an id that already exists, or we'd create a duplicate.
    # NOTE: built by interpolation, NOT by ("..." + "..." -f ...). In PowerShell -f binds TIGHTER
    # than +, so that form formats only the LAST fragment and leaves {0}/{1} literal in the first -
    # producing an invalid query that silently returned 0. Do not reintroduce it.
    $qCollide = "MATCH (c:Call {source:'$($p.source)'}) WHERE c.id CONTAINS '$($p.cfg.stale)' WITH replace(c.id,'$($p.cfg.stale)','$($p.cfg.canon)') AS newId MATCH (x:Call {id:newId}) RETURN count(x);"
    $collide = CyScalar $qCollide
    if ($collide -gt 0) { Bad "      ABORT: $collide rename targets already exist - would duplicate"; exit 2 }
    Good "      collision check: 0 - rename is safe"
  }

  $newAfterRename = @($p.fileOnly | Where-Object { -not ($p.cfg.canon -and $_ -like "*$($p.cfg.canon)*" -and $p.renamable.Count -gt 0) })
  Write-Host ("  new ids to create after rename: {0} (expected {1})" -f $newAfterRename.Count, $p.cfg.expectNew)

  if ($p.unknown.Count -eq 0) { Good "  unexplained stale ids: 0 -> MERGE-only is SAFE, no DELETE needed" }
  else {
    Bad ("  unexplained stale ids: {0} - these are NOT covered by the rename:" -f $p.unknown.Count)
    $p.unknown | Select-Object -First 20 | ForEach-Object { Write-Host "      ! $_" }
  }
  $plans += $p
}

$blocked = @($plans | Where-Object { $_.unknown.Count -gt 0 })
if ($blocked.Count -gt 0) {
  Section "STOP"
  Bad "Unexplained stale ids in: $(($blocked | ForEach-Object { $_.prefix }) -join ', '). Nothing written."
  exit 2
}
if (-not $Execute) { Section "Preflight only"; Warn "No changes made. Re-run with -Execute."; exit 0 }

# ---------------------------------------------------------------- 2. canonicalise ids IN PLACE
foreach ($p in $plans) {
  if ($p.renamable.Count -eq 0) { continue }
  Section "2. Canonicalise ids in place - $($p.prefix)  (relationships ride along)"
  $qRename = "MATCH (c:Call {source:'$($p.source)'}) WHERE c.id CONTAINS '$($p.cfg.stale)' SET c.id = replace(c.id,'$($p.cfg.stale)','$($p.cfg.canon)') RETURN count(c);"
  Write-Host "  $qRename" -ForegroundColor DarkGray
  $n = CyScalar $qRename
  if ($n -eq 0) { Bad "  ABORT: rename matched 0 nodes but $($p.renamable.Count) were expected"; exit 3 }
  Good "  renamed $n ids ($($p.cfg.stale) -> $($p.cfg.canon))"
  $still = CyIds "MATCH (c:Call {source:'$($p.source)'}) WHERE c.id CONTAINS '$($p.cfg.stale)' RETURN c.id;"
  if ($still.Count -gt 0) { Bad "  ABORT: $($still.Count) stale ids remain"; exit 3 }
  Good "  0 stale ids remain"
}

# ---------------------------------------------------------------- 3. ingest (populate only, no delete)
foreach ($p in $plans) {
  Section "3. Ingest - $($p.prefix)  (populate only - NO delete, CORDIS edges preserved)"
  Invoke-RestMethod -Method Post -Uri "$BASE/$($p.prefix)/populate" -ContentType "application/json" -Body '{"preview": true}'  | ConvertTo-Json -Compress
  Invoke-RestMethod -Method Post -Uri "$BASE/$($p.prefix)/populate" -ContentType "application/json" -Body '{"preview": false}' | ConvertTo-Json -Compress
  Good "  populated"
}

# ---------------------------------------------------------------- 4. repair keywords
# `_build_call_props` emits "keywords": [] for cluster files (they carry no keywords key) and
# _sanitize_props preserves empty lists, so `SET c += $props` just blanked the CORDIS keywords.
# The tagger writes related_topics and keywords from the SAME value -> restore with 0 API calls.
Section "4. Repair Call.keywords from related_topics (0 CORDIS calls)"
$srcList = "['" + (($plans | ForEach-Object { $_.source }) -join "','") + "']"
$fixed = CyScalar ("MATCH (c:Call) WHERE c.source IN $srcList AND c.related_topics IS NOT NULL " +
                   "AND size(c.related_topics) > 0 AND (c.keywords IS NULL OR size(c.keywords) = 0) " +
                   "SET c.keywords = c.related_topics RETURN count(c);")
Good "  keywords restored on $fixed calls"

# ---------------------------------------------------------------- 5. verify
Section "5. Verify"
$ok = $true
foreach ($p in $plans) {
  $a = Snapshot $p.source; $b = $p.before
  Write-Host "`n  --- $($p.prefix) ($($p.source))"
  Write-Host ("      calls          {0,6} -> {1,-6}" -f $b.calls,    $a.calls)
  Write-Host ("      TRL            {0,6} -> {1,-6}" -f $b.trl,      $a.trl)
  Write-Host ("      CORDIS links   {0,6} -> {1,-6}" -f $b.cordis,   $a.cordis)
  Write-Host ("      tagged calls   {0,6} -> {1,-6}" -f $b.tagged,   $a.tagged)
  Write-Host ("      keywords       {0,6} -> {1,-6}" -f $b.keywords, $a.keywords)
  Write-Host ("      duplicate ids  {0,6} -> {1,-6}" -f $b.dupes,    $a.dupes)

  if ($a.cordis -lt $b.cordis) { Bad "      FAIL: CORDIS links dropped"; $ok=$false } else { Good "      OK: CORDIS links preserved" }
  if ($a.trl -le $b.trl)       { Bad "      FAIL: TRL did not increase"; $ok=$false }   else { Good "      OK: TRL now on $($a.trl) calls (was $($b.trl))" }
  if ($a.dupes -gt 0)          { Bad "      FAIL: $($a.dupes) duplicate ids"; $ok=$false }
  $leftover = CyIds "MATCH (c:Call {source:'$($p.source)'}) WHERE c.id CONTAINS 'MATERIALS-PRODUCTION' RETURN c.id;"
  if ($leftover.Count -gt 0)   { Bad "      FAIL: $($leftover.Count) stale ids"; $ok=$false }
}

Section "Result"
if ($ok) {
  Good "All checks passed. CORDIS layer intact, no re-tag needed."
  Write-Host "Next: http://localhost:3001 -> a CL4 SPACE-03 topic should render with a TECHNOLOGY READINESS LEVEL section."
} else { Bad "Checks FAILED - read the output above before doing anything else."; exit 4 }
