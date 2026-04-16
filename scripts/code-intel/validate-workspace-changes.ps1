param(
    [string]$RootPath = (Resolve-Path (Join-Path $PSScriptRoot "../..")).Path,
    [switch]$ChangedOnly,
    [switch]$SkipTests,
    [switch]$FailFast
)

$ErrorActionPreference = "Stop"

function Get-PackageScripts {
    param([string]$PackageJsonPath)

    if (-not (Test-Path $PackageJsonPath -PathType Leaf)) {
        return @{}
    }

    $json = Get-Content -LiteralPath $PackageJsonPath -Raw | ConvertFrom-Json
    $scripts = @{}
    if ($json.scripts) {
        $json.scripts.PSObject.Properties | ForEach-Object {
            $scripts[$_.Name] = [string]$_.Value
        }
    }
    return $scripts
}

function Invoke-Step {
    param(
        [string]$Label,
        [string]$Command,
        [string]$WorkingDirectory
    )

    Write-Host "[run] $Label"
    Push-Location $WorkingDirectory
    try {
        & cmd /c $Command
        $exitCode = $LASTEXITCODE
    } finally {
        Pop-Location
    }

    if ($exitCode -ne 0) {
        throw "$Label failed with exit code $exitCode"
    }
}

function Has-RepoChanges {
    param([string]$RepoPath)

    if (-not (Test-Path (Join-Path $RepoPath ".git"))) {
        return $false
    }

    $output = & git -C $RepoPath status --porcelain
    return -not [string]::IsNullOrWhiteSpace(($output -join "`n"))
}

$results = New-Object System.Collections.Generic.List[object]

$npmTargets = @(
    @{ Label = "product-management backend"; Path = "product-management/backend-node" },
    @{ Label = "product-management frontend"; Path = "product-management/frontend" },
    @{ Label = "ai-listing-agent backend"; Path = "ai-listing-agent/backend-node" },
    @{ Label = "ai-listing-agent frontend"; Path = "ai-listing-agent/frontend" },
    @{ Label = "ai-product-starter-template shared"; Path = "ai-product-starter-template/shared" },
    @{ Label = "ai-product-starter-template backend"; Path = "ai-product-starter-template/backend-node" },
    @{ Label = "ai-product-starter-template frontend"; Path = "ai-product-starter-template/frontend" }
)

foreach ($target in $npmTargets) {
    $fullPath = Join-Path $RootPath $target.Path
    if (-not (Test-Path $fullPath -PathType Container)) {
        continue
    }

    $repoRoot = Split-Path $fullPath -Parent
    if ($target.Path -like "*shared") {
        $repoRoot = $fullPath
    }

    if ($ChangedOnly -and -not (Has-RepoChanges -RepoPath $repoRoot)) {
        Write-Host "[skip] $($target.Label) (no repo changes)"
        continue
    }

    $pkgPath = Join-Path $fullPath "package.json"
    $scripts = Get-PackageScripts -PackageJsonPath $pkgPath
    if ($scripts.Count -eq 0) {
        Write-Host "[skip] $($target.Label) (no package scripts)"
        continue
    }

    $record = [ordered]@{
        target = $target.Label
        syntax = "skipped"
        tests = "skipped"
    }

    try {
        if ($scripts.ContainsKey("build")) {
            Invoke-Step -Label "$($target.Label): build" -Command "npm run build" -WorkingDirectory $fullPath
            $record.syntax = "passed"
        } elseif ($scripts.ContainsKey("lint")) {
            Invoke-Step -Label "$($target.Label): lint" -Command "npm run lint" -WorkingDirectory $fullPath
            $record.syntax = "passed"
        } else {
            Write-Host "[skip] $($target.Label) syntax (no build/lint script)"
        }

        if (-not $SkipTests) {
            if ($scripts.ContainsKey("test")) {
                Invoke-Step -Label "$($target.Label): test" -Command "npm run test" -WorkingDirectory $fullPath
                $record.tests = "passed"
            } else {
                Write-Host "[skip] $($target.Label) tests (no test script)"
            }
        }

        $results.Add([pscustomobject]$record)
    } catch {
        $record.syntax = if ($record.syntax -eq "passed") { "passed" } else { "failed" }
        if (-not $SkipTests -and $record.tests -eq "skipped") {
            $record.tests = "failed"
        }
        $results.Add([pscustomobject]$record)
        Write-Host "[fail] $($_.Exception.Message)"
        if ($FailFast) {
            throw
        }
    }
}

# Optional Python syntax check
$pythonRoot = Join-Path $RootPath "services-python"
if (Test-Path $pythonRoot -PathType Container) {
    if (-not $ChangedOnly -or (Has-RepoChanges -RepoPath $pythonRoot)) {
        try {
            Write-Host "[run] services-python: syntax"
            $pyFiles = Get-ChildItem -Path $pythonRoot -Recurse -File -Filter *.py | Where-Object {
                $_.FullName -notmatch "(\\|/)(venv|\.venv|__pycache__|build|dist)(\\|/)"
            }
            foreach ($pyFile in $pyFiles) {
                & python -m py_compile $pyFile.FullName
                if ($LASTEXITCODE -ne 0) {
                    throw "Python syntax check failed: $($pyFile.FullName)"
                }
            }
            $results.Add([pscustomobject]@{ target = "services-python"; syntax = "passed"; tests = "skipped" })
        } catch {
            $results.Add([pscustomobject]@{ target = "services-python"; syntax = "failed"; tests = "skipped" })
            Write-Host "[fail] $($_.Exception.Message)"
            if ($FailFast) { throw }
        }
    }
}

# Optional Java compile/test check
$javaRoot = Join-Path $RootPath "services-java"
if (Test-Path $javaRoot -PathType Container) {
    if (-not $ChangedOnly -or (Has-RepoChanges -RepoPath $javaRoot)) {
        $mavenRoots = Get-ChildItem -Path $javaRoot -Recurse -File -Filter pom.xml | ForEach-Object { Split-Path -Parent $_.FullName }
        foreach ($mavenPath in ($mavenRoots | Select-Object -Unique)) {
            $mvnwCmd = Join-Path $mavenPath "mvnw.cmd"
            $mvnw = Join-Path $mavenPath "mvnw"
            if (-not (Test-Path $mvnwCmd) -and -not (Test-Path $mvnw)) {
                continue
            }

            $label = "services-java: $([IO.Path]::GetFileName($mavenPath))"
            try {
                if (Test-Path $mvnwCmd) {
                    Invoke-Step -Label "$label compile" -Command "mvnw.cmd -q -DskipTests compile" -WorkingDirectory $mavenPath
                    if (-not $SkipTests) {
                        Invoke-Step -Label "$label test" -Command "mvnw.cmd -q test" -WorkingDirectory $mavenPath
                        $results.Add([pscustomobject]@{ target = $label; syntax = "passed"; tests = "passed" })
                    } else {
                        $results.Add([pscustomobject]@{ target = $label; syntax = "passed"; tests = "skipped" })
                    }
                } else {
                    Invoke-Step -Label "$label compile" -Command "./mvnw -q -DskipTests compile" -WorkingDirectory $mavenPath
                    if (-not $SkipTests) {
                        Invoke-Step -Label "$label test" -Command "./mvnw -q test" -WorkingDirectory $mavenPath
                        $results.Add([pscustomobject]@{ target = $label; syntax = "passed"; tests = "passed" })
                    } else {
                        $results.Add([pscustomobject]@{ target = $label; syntax = "passed"; tests = "skipped" })
                    }
                }
            } catch {
                $results.Add([pscustomobject]@{ target = $label; syntax = "failed"; tests = "failed" })
                Write-Host "[fail] $($_.Exception.Message)"
                if ($FailFast) { throw }
            }
        }
    }
}

Write-Host ""
Write-Host "Validation summary"
Write-Host "------------------"
$results | Format-Table -AutoSize

$failed = $results | Where-Object { $_.syntax -eq "failed" -or $_.tests -eq "failed" }
if ($failed.Count -gt 0) {
    throw "One or more validation checks failed."
}

Write-Host "[done] Validation checks completed successfully."
