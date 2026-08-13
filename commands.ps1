# Run a Python script with specific parameters
param (
    [string]$Input = "./pdfs/HORIZON-CL4-2026-2027_07_14_2025.pdf",
    [string]$Output = "cl4_full_destinations_allfields.json",
    [switch]$Pretty
)

$cmd = "python he_wp_parser_merged.py --input `"$Input`" --out `"$Output`""

if ($Pretty) {
    $cmd += " --pretty"
}
# --- Dev-stack cheatsheet (strings only - these are notes, not executed) ---
# The compose project name is pinned in docker-compose.dev.yml (name: knowledge-graph-app-dev).
# NEVER pass `-p kg-dev` - it creates a second, EMPTY stack + volume and steals the ports.
"docker compose -f docker-compose.dev.yml up -d --build"       # start dev stack
"docker compose -f docker-compose.dev.yml ps"                  # status
"docker compose -f docker-compose.dev.yml down --remove-orphans"  # stop (NO -v: -v DESTROYS the graph)
"docker exec -it knowledge-graph-app-dev-backend-1 /bin/bash"  # shell into backend
"docker exec -it knowledge-graph-app-dev-neo4j-1 cypher-shell -u neo4j -p password"
".\verify_restore.ps1"                                         # verify the graph is intact
Write-Host "Running command: $cmd"
Invoke-Expression $cmd
