param(
    [string]$RootPath = (Resolve-Path (Join-Path $PSScriptRoot "../..")).Path,
    [string[]]$IncludeRepos = @(
        "ai-listing-agent",
        "ai-product-starter-template",
        "ai-product-management",
        "shared",
        "services-java",
        "services-python"
    ),
    [string]$OutputDir = "",
    [int]$MaxEdges = 600
)

$ErrorActionPreference = "Stop"

if (-not $OutputDir) {
    $OutputDir = Join-Path $RootPath "out-prompt-context/knowledge-graph"
}

$codeExtensions = @(".ts", ".tsx", ".js", ".jsx", ".mjs", ".cjs", ".py", ".java")
$skipPathPattern = [regex]"(\\|/)(node_modules|dist|build|target|\.git|\.venv|venv|coverage|out)(\\|/)"

function Get-ModuleKey {
    param(
        [string]$Repo,
        [string]$RepoRelativeFile
    )

    $normalized = $RepoRelativeFile.Replace("\\", "/")
    $parts = $normalized.Split("/")
    $segment = if ($parts.Length -gt 1) { $parts[0] } else { "(root)" }
    return "$Repo/$segment"
}

function Add-Edge {
    param(
        [hashtable]$EdgeCounts,
        [string]$From,
        [string]$To
    )

    if (-not $From -or -not $To -or $From -eq $To) {
        return
    }

    $key = "$From`t$To"
    if ($EdgeCounts.ContainsKey($key)) {
        $EdgeCounts[$key] += 1
    } else {
        $EdgeCounts[$key] = 1
    }
}

function Resolve-RelativeImport {
    param(
        [string]$SourceFile,
        [string]$ImportPath
    )

    $sourceDir = Split-Path -Parent $SourceFile
    $base = Join-Path $sourceDir $ImportPath
    $candidates = @(
        $base,
        "$base.ts",
        "$base.tsx",
        "$base.js",
        "$base.jsx",
        "$base.mjs",
        "$base.cjs",
        "$base.py",
        "$base.java",
        (Join-Path $base "index.ts"),
        (Join-Path $base "index.tsx"),
        (Join-Path $base "index.js"),
        (Join-Path $base "index.py"),
        (Join-Path $base "index.java")
    )

    foreach ($candidate in $candidates) {
        if (Test-Path -LiteralPath $candidate -PathType Leaf) {
            return (Resolve-Path $candidate).Path
        }
    }

    return $null
}

$repoRoots = @()
foreach ($repo in $IncludeRepos) {
    $path = Join-Path $RootPath $repo
    if (Test-Path -LiteralPath $path -PathType Container) {
        $repoRoots += [pscustomobject]@{
            Name = $repo
            Path = (Resolve-Path $path).Path
        }
    }
}

if (-not $repoRoots) {
    throw "No repository roots found under $RootPath"
}

$edgeCounts = @{}
$modules = New-Object System.Collections.Generic.HashSet[string]

foreach ($repo in $repoRoots) {
    Write-Host "[scan] $($repo.Name)"

    $files = Get-ChildItem -Path $repo.Path -Recurse -File | Where-Object {
        $extMatch = $codeExtensions -contains $_.Extension.ToLowerInvariant()
        $skip = $skipPathPattern.IsMatch($_.FullName)
        $extMatch -and -not $skip
    }

    foreach ($file in $files) {
        $repoRelative = ($file.FullName.Substring($repo.Path.Length) -replace '^[\\/]+', '')
        $fromModule = Get-ModuleKey -Repo $repo.Name -RepoRelativeFile $repoRelative
        $null = $modules.Add($fromModule)

        $content = Get-Content -LiteralPath $file.FullName -Raw
        $imports = @()

        if ($file.Extension -in @('.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs')) {
            $imports += [regex]::Matches($content, 'import\s+[^\n]*?from\s+["'']([^"'']+)["'']') | ForEach-Object { $_.Groups[1].Value }
            $imports += [regex]::Matches($content, 'require\(\s*["'']([^"'']+)["'']\s*\)') | ForEach-Object { $_.Groups[1].Value }
            $imports += [regex]::Matches($content, 'import\(\s*["'']([^"'']+)["'']\s*\)') | ForEach-Object { $_.Groups[1].Value }
        } elseif ($file.Extension -eq '.py') {
            $imports += [regex]::Matches($content, "(?m)^\s*from\s+([a-zA-Z0-9_\.]+)\s+import\s+") | ForEach-Object { $_.Groups[1].Value }
            $imports += [regex]::Matches($content, "(?m)^\s*import\s+([a-zA-Z0-9_\.]+)") | ForEach-Object { $_.Groups[1].Value }
        } elseif ($file.Extension -eq '.java') {
            $imports += [regex]::Matches($content, "(?m)^\s*import\s+([a-zA-Z0-9_\.]+)\s*;") | ForEach-Object { $_.Groups[1].Value }
        }

        foreach ($importPath in $imports | Select-Object -Unique) {
            if (-not $importPath) {
                continue
            }

            if ($importPath.StartsWith('.')) {
                $resolved = Resolve-RelativeImport -SourceFile $file.FullName -ImportPath $importPath
                if ($resolved -and $resolved.StartsWith($repo.Path, [System.StringComparison]::OrdinalIgnoreCase)) {
                    $targetRel = ($resolved.Substring($repo.Path.Length) -replace '^[\\/]+', '')
                    $toModule = Get-ModuleKey -Repo $repo.Name -RepoRelativeFile $targetRel
                    $null = $modules.Add($toModule)
                    Add-Edge -EdgeCounts $edgeCounts -From $fromModule -To $toModule
                } else {
                    $toModule = "external/unresolved-relative"
                    $null = $modules.Add($toModule)
                    Add-Edge -EdgeCounts $edgeCounts -From $fromModule -To $toModule
                }
            } else {
                $package = $importPath.Split('/')[0]
                if ($package -like "@*" -and $importPath.Split('/').Length -ge 2) {
                    $package = "$($importPath.Split('/')[0])/$($importPath.Split('/')[1])"
                }
                $toModule = "external/$package"
                $null = $modules.Add($toModule)
                Add-Edge -EdgeCounts $edgeCounts -From $fromModule -To $toModule
            }
        }
    }
}

$null = New-Item -ItemType Directory -Path $OutputDir -Force

$edgeObjects = $edgeCounts.GetEnumerator() | ForEach-Object {
    $parts = $_.Key.Split("`t")
    [pscustomobject]@{
        from = $parts[0]
        to = $parts[1]
        count = [int]$_.Value
    }
} | Sort-Object count -Descending

$topEdges = $edgeObjects | Select-Object -First $MaxEdges

$edgesJsonPath = Join-Path $OutputDir "edges.json"
$topEdges | ConvertTo-Json -Depth 5 | Set-Content -LiteralPath $edgesJsonPath -Encoding UTF8

$nodes = ($topEdges.from + $topEdges.to | Sort-Object -Unique)
$idMap = @{}
$idx = 1
foreach ($n in $nodes) {
    $idMap[$n] = "N$idx"
    $idx += 1
}

$mermaidLines = @()
$mermaidLines += "flowchart LR"
foreach ($n in $nodes) {
    $id = $idMap[$n]
    $safeLabel = $n.Replace('"', "'")
    $mermaidLines += "    $id[`"$safeLabel`"]"
}
foreach ($e in $topEdges) {
    $fromId = $idMap[$e.from]
    $toId = $idMap[$e.to]
    $mermaidLines += "    $fromId -->|$($e.count)| $toId"
}

$internalIds = @()
$externalIds = @()
foreach ($n in $nodes) {
    if ($n.StartsWith("external/")) {
        $externalIds += $idMap[$n]
    } else {
        $internalIds += $idMap[$n]
    }
}

$mermaidLines += ""
$mermaidLines += "    classDef internal fill:#1d1f24,stroke:#8b9098,color:#ffffff,stroke-width:1px;"
$mermaidLines += "    classDef external fill:#122032,stroke:#38bdf8,color:#ffffff,stroke-width:1px;"
if ($internalIds) {
    $mermaidLines += "    class $($internalIds -join ',') internal;"
}
if ($externalIds) {
    $mermaidLines += "    class $($externalIds -join ',') external;"
}

$graphPath = Join-Path $OutputDir "knowledge-graph.mmd"
$mermaidLines -join [Environment]::NewLine | Set-Content -LiteralPath $graphPath -Encoding UTF8

$summary = @()
$summary += "# Code Knowledge Graph Summary"
$summary += ""
$summary += "- Root: $RootPath"
$summary += "- Repositories scanned: $($repoRoots.Name -join ', ')"
$summary += "- Modules in graph: $($nodes.Count)"
$summary += "- Edge count (top set): $($topEdges.Count)"
$summary += "- Output graph: $graphPath"
$summary += "- Output edges: $edgesJsonPath"
$summary += ""
$summary += "## Top Dependencies"
foreach ($e in ($topEdges | Select-Object -First 30)) {
    $summary += "- $($e.from) -> $($e.to) ($($e.count))"
}

$summaryPath = Join-Path $OutputDir "summary.md"
$summary -join [Environment]::NewLine | Set-Content -LiteralPath $summaryPath -Encoding UTF8

Write-Host "[done] Knowledge graph generated"
Write-Host "       $graphPath"
Write-Host "       $edgesJsonPath"
Write-Host "       $summaryPath"
