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

foreach ($dir in $dirs) {
  $src = Join-Path $AiRoot $dir
  $dst = Join-Path $ClaudeRoot $dir

  if (-not (Test-Path $src)) {
    Write-Host "SKIP $src (not found)" -ForegroundColor Yellow
    continue
  }

  if (Test-Path $dst) {
    Remove-Item -Path $dst -Recurse -Force
  }

  Copy-Item -Path $src -Destination $dst -Recurse -Force
  Write-Host "SYNC $src -> $dst" -ForegroundColor Green
}

Write-Host ""
Write-Host "Sync complete." -ForegroundColor Cyan
Write-Host "Run .\scripts\validate-ai-governance-sync.ps1 to verify parity." -ForegroundColor Cyan
