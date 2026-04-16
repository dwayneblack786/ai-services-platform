#!/usr/bin/env pwsh
<#
.SYNOPSIS
  Validate parity between .ai (canonical) and .claude (runtime adapter).

.DESCRIPTION
  Compares SHA256 hashes for matching files in shared governance directories
  and reports drift.

  Validated by default:
    agents, commands, hooks, rules, skills, wiki

  Optional:
    .obsidian (disabled by default)

.EXAMPLE
  .\scripts\validate-ai-governance-sync.ps1

.EXAMPLE
  .\scripts\validate-ai-governance-sync.ps1 -IncludeObsidian
#>

param(
  [switch]$IncludeObsidian
)

$ErrorActionPreference = 'Stop'

$WorkspaceRoot = Resolve-Path (Join-Path $PSScriptRoot "..")
$AiRoot = Join-Path $WorkspaceRoot ".ai"
$ClaudeRoot = Join-Path $WorkspaceRoot ".claude"

if (-not (Test-Path $AiRoot)) {
  throw "Missing source folder: $AiRoot"
}

if (-not (Test-Path $ClaudeRoot)) {
  throw "Missing target folder: $ClaudeRoot"
}

$dirs = @("agents", "commands", "hooks", "rules", "skills", "wiki")
if ($IncludeObsidian) {
  $dirs += ".obsidian"
}

$missingInClaude = New-Object System.Collections.Generic.List[string]
$missingInAi = New-Object System.Collections.Generic.List[string]
$hashMismatches = New-Object System.Collections.Generic.List[string]

function Get-RelativePath([string]$basePath, [string]$fullPath) {
  $base = [System.IO.Path]::GetFullPath($basePath)
  $full = [System.IO.Path]::GetFullPath($fullPath)
  if ($full.StartsWith($base, [System.StringComparison]::OrdinalIgnoreCase)) {
    return $full.Substring($base.Length).TrimStart([char]92, [char]47)
  }
  return $full
}

foreach ($dir in $dirs) {
  $aiDir = Join-Path $AiRoot $dir
  $clDir = Join-Path $ClaudeRoot $dir

  if (-not (Test-Path $aiDir)) {
    Write-Host "SKIP $aiDir (not found)" -ForegroundColor Yellow
    continue
  }

  if (-not (Test-Path $clDir)) {
    $missingInClaude.Add($dir)
    continue
  }

  $aiFiles = Get-ChildItem -Path $aiDir -Recurse -File
  foreach ($f in $aiFiles) {
    $rel = Get-RelativePath $aiDir $f.FullName
    $peer = Join-Path $clDir $rel
    if (-not (Test-Path $peer)) {
      $missingInClaude.Add((Join-Path $dir $rel))
      continue
    }

    $h1 = (Get-FileHash -Path $f.FullName -Algorithm SHA256).Hash
    $h2 = (Get-FileHash -Path $peer -Algorithm SHA256).Hash
    if ($h1 -ne $h2) {
      $hashMismatches.Add((Join-Path $dir $rel))
    }
  }

  $clFiles = Get-ChildItem -Path $clDir -Recurse -File
  foreach ($f in $clFiles) {
    $rel = Get-RelativePath $clDir $f.FullName
    $peer = Join-Path $aiDir $rel
    if (-not (Test-Path $peer)) {
      $missingInAi.Add((Join-Path $dir $rel))
    }
  }
}

Write-Host ""
Write-Host "Validation summary:" -ForegroundColor Cyan
Write-Host "  Missing in .claude: $($missingInClaude.Count)"
Write-Host "  Missing in .ai:     $($missingInAi.Count)"
Write-Host "  Hash mismatches:    $($hashMismatches.Count)"

if ($missingInClaude.Count -gt 0) {
  Write-Host ""
  Write-Host "Missing in .claude:" -ForegroundColor Yellow
  $missingInClaude | Sort-Object | ForEach-Object { Write-Host "  $_" }
}

if ($missingInAi.Count -gt 0) {
  Write-Host ""
  Write-Host "Missing in .ai:" -ForegroundColor Yellow
  $missingInAi | Sort-Object | ForEach-Object { Write-Host "  $_" }
}

if ($hashMismatches.Count -gt 0) {
  Write-Host ""
  Write-Host "Hash mismatches:" -ForegroundColor Yellow
  $hashMismatches | Sort-Object | ForEach-Object { Write-Host "  $_" }
}

if ($missingInClaude.Count -gt 0 -or $missingInAi.Count -gt 0 -or $hashMismatches.Count -gt 0) {
  Write-Host ""
  Write-Host "DRIFT DETECTED" -ForegroundColor Red
  exit 1
}

Write-Host ""
Write-Host "OK: .ai and .claude are in sync for selected directories." -ForegroundColor Green
exit 0
