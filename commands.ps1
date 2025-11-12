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

Write-Host "Running command: $cmd"
Invoke-Expression $cmd