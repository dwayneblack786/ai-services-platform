<#
.SYNOPSIS
    Canonical Keycloak setup script.

.DESCRIPTION
    Runs the tenant seed script from the consolidated scripts location.
#>

$ErrorActionPreference = "Stop"

$seedScript = Join-Path $PSScriptRoot "seed-tenants.ts"

if (-not (Test-Path $seedScript)) {
    Write-Error "Seed script not found: $seedScript"
    exit 1
}

Write-Host "Running Keycloak tenant seed from consolidated scripts path..." -ForegroundColor Cyan
npx ts-node $seedScript @args
