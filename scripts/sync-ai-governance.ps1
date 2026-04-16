#!/usr/bin/env pwsh
<#
.SYNOPSIS
  Sync model-agnostic governance content from .ai to .claude.

.DESCRIPTION
  Copies shared governance directories from .ai into .claude so Claude runtime
  can consume current content while .ai remains canonical.

  Synced by default:
    agents, commands, hooks, rules, skills, wiki

  Optional:
    .obsidian (disabled by default because it can contain local editor state)

.EXAMPLE
  .\scripts\sync-ai-governance.ps1

.EXAMPLE
  .\scripts\sync-ai-governance.ps1 -IncludeObsidian

.EXAMPLE
  .\scripts\sync-ai-governance.ps1 -SyncSkillsToAllTargets
#>

param(
  [switch]$IncludeObsidian,
  [switch]$SyncSkillsToAllTargets
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

function Sync-Directory {
  param(
    [Parameter(Mandatory = $true)][string]$Source,
    [Parameter(Mandatory = $true)][string]$Destination
  )

  if (-not (Test-Path $Source)) {
    Write-Host "SKIP $Source (not found)" -ForegroundColor Yellow
    return $false
  }

  if (Test-Path $Destination) {
    Remove-Item -Path $Destination -Recurse -Force
  }

  Copy-Item -Path $Source -Destination $Destination -Recurse -Force
  Write-Host "SYNC $Source -> $Destination" -ForegroundColor Green
  return $true
}

$dirs = @("agents", "commands", "hooks", "rules", "skills", "wiki")
if ($IncludeObsidian) {
  $dirs += ".obsidian"
}

foreach ($dir in $dirs) {
  $src = Join-Path $AiRoot $dir
  $dst = Join-Path $ClaudeRoot $dir

  Sync-Directory -Source $src -Destination $dst | Out-Null
}

if ($SyncSkillsToAllTargets) {
  $skillsSource = Join-Path $AiRoot "skills"
  $extraSkillTargets = @(".agent", ".github")

  foreach ($target in $extraSkillTargets) {
    $targetRoot = Join-Path $WorkspaceRoot $target
    if (-not (Test-Path $targetRoot)) {
      Write-Host "SKIP $targetRoot (not found)" -ForegroundColor Yellow
      continue
    }

    $targetSkills = Join-Path $targetRoot "skills"
    Sync-Directory -Source $skillsSource -Destination $targetSkills | Out-Null
  }
}

Write-Host ""
Write-Host "Sync complete." -ForegroundColor Cyan
Write-Host "Run .\scripts\validate-ai-governance-sync.ps1 to verify parity." -ForegroundColor Cyan
