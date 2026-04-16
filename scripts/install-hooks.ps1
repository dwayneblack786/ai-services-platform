#!/usr/bin/env pwsh
# install-hooks.ps1
# Installs the pre-commit hook into all product repos in this workspace.
# Run from workspace root: .\scripts\install-hooks.ps1

$ErrorActionPreference = 'Stop'
$WorkspaceRoot = $PSScriptRoot | Split-Path -Parent
$HookSource = Join-Path $WorkspaceRoot ".claude\hooks\pre-commit"

$Repos = @(
  $WorkspaceRoot,                                      # workspace root
  (Join-Path $WorkspaceRoot "services-java"),
  (Join-Path $WorkspaceRoot "ai-product-management"),
  (Join-Path $WorkspaceRoot "ai-listing-agent"),
  (Join-Path $WorkspaceRoot "shared")
)

foreach ($repo in $Repos) {
  $gitDir = Join-Path $repo ".git"
  if (-not (Test-Path $gitDir)) {
    Write-Host "  SKIP  $repo (no .git directory)"
    continue
  }
  $hooksDir = Join-Path $gitDir "hooks"
  if (-not (Test-Path $hooksDir)) {
    New-Item -ItemType Directory -Path $hooksDir | Out-Null
  }
  $dest = Join-Path $hooksDir "pre-commit"
  Copy-Item -Path $HookSource -Destination $dest -Force
  Write-Host "  OK    $repo"
}

Write-Host ""
Write-Host "Pre-commit hook installed in all repos."
Write-Host "Note: On Linux/macOS run 'chmod +x .git/hooks/pre-commit' in each repo."
