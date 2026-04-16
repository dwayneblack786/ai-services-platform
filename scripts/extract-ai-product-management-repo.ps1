param(
    [string]$OutputPath = "../ai-product-management-standalone",
    [string]$SplitBranch = "split/ai-product-management"
)

$ErrorActionPreference = "Stop"

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$productManagementDir = Resolve-Path (Join-Path $scriptDir "..")
$repoRoot = Resolve-Path (Join-Path $scriptDir "../..")
$outputAbsolute = Resolve-Path (Join-Path $scriptDir $OutputPath) -ErrorAction SilentlyContinue

if (-not $outputAbsolute) {
    $outputAbsolute = Join-Path $scriptDir $OutputPath
} else {
    $outputAbsolute = $outputAbsolute.Path
}

Write-Host "[extract] Repo root: $repoRoot"
Write-Host "[extract] ai-product-management folder: $productManagementDir"
Write-Host "[extract] Output path: $outputAbsolute"
Write-Host "[extract] Split branch: $SplitBranch"

Push-Location $repoRoot
try {
    git rev-parse --is-inside-work-tree | Out-Null

    # Refresh split branch from current history.
    if ((git branch --list $SplitBranch).Trim()) {
        git branch -D $SplitBranch | Out-Null
    }

    git subtree split --prefix=ai-product-management -b $SplitBranch | Out-Null

    if (Test-Path $outputAbsolute) {
        throw "Output path already exists: $outputAbsolute"
    }

    git clone . "$outputAbsolute" --branch $SplitBranch --single-branch | Out-Null

    Push-Location $outputAbsolute
    try {
        Write-Host "[extract] Standalone repo created at: $outputAbsolute"
        Write-Host "[extract] Next steps:"
        Write-Host "  1. Set your new remote: git remote set-url origin <new-repo-url>"
        Write-Host "  2. Push: git push -u origin $SplitBranch:main"
        Write-Host "  3. Move workflows from ai-product-management/.github/workflows to .github/workflows in the standalone repo"
    }
    finally {
        Pop-Location
    }
}
finally {
    Pop-Location
}

