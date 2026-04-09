<#
.SYNOPSIS
    Compatibility wrapper for Keycloak setup.

.DESCRIPTION
    Delegates to product-management local script:
    product-management/scripts/keycloak/setup-keycloak.ps1
#>

$ErrorActionPreference = "Stop"

$target = Join-Path $PSScriptRoot "..\..\product-management\scripts\keycloak\setup-keycloak.ps1"
$target = [System.IO.Path]::GetFullPath($target)

if (-not (Test-Path $target)) {
    Write-Error "Target script not found: $target"
    exit 1
}

Write-Host "[migration] scripts/keycloak/setup-keycloak.ps1 is deprecated." -ForegroundColor Yellow
Write-Host "[migration] Delegating to $target" -ForegroundColor Yellow

& $target @args
