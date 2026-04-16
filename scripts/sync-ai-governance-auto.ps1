#!/usr/bin/env pwsh
<#
.SYNOPSIS
  Auto-select governance sync strategy based on changed .ai files.

.DESCRIPTION
  Detects .ai changes from either staged files or working tree and runs:
  - sync-ai-governance.ps1 -SyncSkillsToAllTargets (when .ai/skills changed)
  - sync-ai-governance.ps1 (for other .ai governance changes)

  Optional flags let callers validate parity and auto-stage sync outputs.

.EXAMPLE
  .\scripts\sync-ai-governance-auto.ps1

.EXAMPLE
  .\scripts\sync-ai-governance-auto.ps1 -StagedOnly -AutoStage
#>

param(
  [switch]$StagedOnly,
  [switch]$AutoStage,
  [switch]$Validate
)

$ErrorActionPreference = 'Stop'

$WorkspaceRoot = Resolve-Path (Join-Path $PSScriptRoot "..")
Set-Location $WorkspaceRoot

function Normalize-Path([string]$PathValue) {
  return $PathValue.Replace('\\', '/').Trim()
}

function Get-ChangedFiles {
  param([switch]$OnlyStaged)

  if ($OnlyStaged) {
    return @(git diff --cached --name-only | Where-Object { $_ -and $_.Trim().Length -gt 0 })
  }

  $statusLines = @(git status --porcelain)
  $paths = New-Object System.Collections.Generic.List[string]
  foreach ($line in $statusLines) {
    if (-not $line -or $line.Length -lt 4) {
      continue
    }
    $pathPart = $line.Substring(3)
    if ($pathPart -like "* -> *") {
      $pathPart = $pathPart.Split(" -> ")[-1]
    }
    if ($pathPart -and $pathPart.Trim().Length -gt 0) {
      $paths.Add($pathPart.Trim())
    }
  }
  return @($paths)
}

$changedFiles = @(Get-ChangedFiles -OnlyStaged:$StagedOnly)
if ($changedFiles.Count -eq 0) {
  Write-Host "No changes detected. Nothing to sync." -ForegroundColor Yellow
  exit 0
}

$normalized = @($changedFiles | ForEach-Object { Normalize-Path $_ })
$aiChanged = @($normalized | Where-Object { $_ -like ".ai/*" })
if ($aiChanged.Count -eq 0) {
  Write-Host "No .ai changes detected. Skipping governance sync." -ForegroundColor Yellow
  exit 0
}

$skillsChanged = @($aiChanged | Where-Object { $_ -like ".ai/skills/*" })

if ($skillsChanged.Count -gt 0) {
  Write-Host "Detected .ai/skills changes. Running full Claude sync + skills sync to .agent/.github..." -ForegroundColor Cyan
  & pwsh -NoProfile -File (Join-Path $WorkspaceRoot "scripts/sync-ai-governance.ps1") -SyncSkillsToAllTargets

  if ($AutoStage) {
    git add .claude .agent/skills .github/skills
    Write-Host "Auto-staged: .claude, .agent/skills, .github/skills" -ForegroundColor Green
  }
} else {
  Write-Host "Detected non-skills .ai changes. Running .ai -> .claude sync..." -ForegroundColor Cyan
  & pwsh -NoProfile -File (Join-Path $WorkspaceRoot "scripts/sync-ai-governance.ps1")

  if ($AutoStage) {
    git add .claude
    Write-Host "Auto-staged: .claude" -ForegroundColor Green
  }
}

if ($Validate) {
  Write-Host "Running sync validation..." -ForegroundColor Cyan
  & pwsh -NoProfile -File (Join-Path $WorkspaceRoot "scripts/validate-ai-governance-sync.ps1")
}

Write-Host "Auto governance sync complete." -ForegroundColor Green
