param(
    [string]$GitHubOwner = "dwayneblack786"
)

$ErrorActionPreference = "Stop"

$RootDir = Resolve-Path (Join-Path $PSScriptRoot "..")

$Repos = @(
    @{ Local = "ai-listing-agent"; Remote = "ai-listing-agent" },
    @{ Local = "ai-product-starter-template"; Remote = "ai-product-starter-template" },
    @{ Local = "services-java"; Remote = "services-java" },
    @{ Local = "services-python"; Remote = "services-python" },
    @{ Local = "ai-product-management"; Remote = "product-management" },
    @{ Local = "shared"; Remote = "shared" }
)

$EnvTargets = @(
    @{ Target = "ai-product-management/backend-node/.env"; Example = "ai-product-management/backend-node/.env.example" },
    @{ Target = "ai-product-management/frontend/.env"; Example = "ai-product-management/frontend/.env.example" },
    @{ Target = "ai-listing-agent/backend-node/.env"; Example = "ai-listing-agent/backend-node/.env.example" },
    @{ Target = "ai-listing-agent/frontend/.env"; Example = "ai-listing-agent/frontend/.env.example" },
    @{ Target = "ai-product-starter-template/backend-node/.env"; Example = "ai-product-starter-template/backend-node/.env.example" },
    @{ Target = "ai-product-starter-template/frontend/.env"; Example = "ai-product-starter-template/frontend/.env.example" },
    @{ Target = "services-java/va-service/.env"; Example = "services-java/va-service/.env.example" },
    @{ Target = "shared/.env"; Example = "shared/.env.example" }
)

function Confirm-YesNo {
    param([string]$Message)

    $answer = Read-Host "$Message [y/N]"
    return $answer -eq "y" -or $answer -eq "Y"
}

function Clone-MissingRepos {
    Write-Host "`n== Clone missing repositories =="
    foreach ($repo in $Repos) {
        $localDir = $repo.Local
        $remoteRepo = $repo.Remote
        $repoPath = Join-Path $RootDir $localDir
        if (Test-Path (Join-Path $repoPath ".git")) {
            Write-Host "[skip] $localDir already present"
            continue
        }

        $repoUrl = "https://github.com/$GitHubOwner/$remoteRepo.git"
        Write-Host "[clone] $repoUrl"
        git -C $RootDir clone $repoUrl $localDir
    }
}

function Ensure-EnvFiles {
    Write-Host "`n== Ensure env files =="

    foreach ($map in $EnvTargets) {
        $target = Join-Path $RootDir $map.Target
        $example = Join-Path $RootDir $map.Example

        if (Test-Path $target) {
            Write-Host "[ok] $($map.Target) already exists"
            continue
        }

        if (-not (Test-Path $example)) {
            Write-Host "[warn] Missing example file: $($map.Example)"
            continue
        }

        Write-Host "[prompt] Missing $($map.Target)"
        if (Confirm-YesNo "Create it from $($map.Example) with dummy values") {
            Copy-Item $example $target
            Write-Host "[created] $($map.Target)"
            Write-Host "         Update dummy values before production use."
        }
        else {
            Write-Host "[skip] $($map.Target)"
        }
    }
}

function Install-NpmDeps {
    param(
        [string]$RelativeDir,
        [string]$Label
    )

    $fullDir = Join-Path $RootDir $RelativeDir
    if (-not (Test-Path (Join-Path $fullDir "package.json"))) {
        Write-Host "[skip] $Label (no package.json)"
        return
    }

    Write-Host "[npm] $Label"
    Push-Location $fullDir
    try {
        if (Test-Path (Join-Path $fullDir "package-lock.json")) {
            npm ci
        }
        else {
            npm install
        }
    }
    finally {
        Pop-Location
    }
}

function Install-MavenDeps {
    param(
        [string]$RelativeDir,
        [string]$Label
    )

    $fullDir = Join-Path $RootDir $RelativeDir
    $mvnw = Join-Path $fullDir "mvnw"
    $mvnwCmd = Join-Path $fullDir "mvnw.cmd"

    if (-not (Test-Path $mvnw) -and -not (Test-Path $mvnwCmd)) {
        Write-Host "[skip] $Label (no Maven wrapper)"
        return
    }

    Write-Host "[maven] $Label"
    Push-Location $fullDir
    try {
        if (Test-Path $mvnwCmd) {
            & $mvnwCmd "-DskipTests" "dependency:go-offline"
        }
        else {
            & $mvnw "-DskipTests" "dependency:go-offline"
        }
    }
    finally {
        Pop-Location
    }
}

function Install-Dependencies {
    Write-Host "`n== Install package dependencies =="

    Install-MavenDeps -RelativeDir "services-java/va-service" -Label "services-java/va-service"
    Install-MavenDeps -RelativeDir "services-java/common-libs" -Label "services-java/common-libs"

    Install-NpmDeps -RelativeDir "ai-product-management/backend-node" -Label "ai-product-management backend"
    Install-NpmDeps -RelativeDir "ai-product-management/frontend" -Label "ai-product-management frontend"

    Install-NpmDeps -RelativeDir "shared" -Label "shared"

    Install-NpmDeps -RelativeDir "ai-listing-agent/backend-node" -Label "ai-listing-agent backend"
    Install-NpmDeps -RelativeDir "ai-listing-agent/frontend" -Label "ai-listing-agent frontend"

    Install-NpmDeps -RelativeDir "ai-product-starter-template/shared" -Label "ai-product-starter-template shared"
    Install-NpmDeps -RelativeDir "ai-product-starter-template/backend-node" -Label "ai-product-starter-template backend"
    Install-NpmDeps -RelativeDir "ai-product-starter-template/frontend" -Label "ai-product-starter-template frontend"
}

function Show-ComposeInstructions {
    Write-Host "`n== Infrastructure compose files =="
    Write-Host "Docker compose:  $(Join-Path $RootDir "infra/docker-compose.dev.yml")"
    Write-Host "Podman compose:  $(Join-Path $RootDir "infra/podman-compose.dev.yml")"

    Write-Host "`nTo start infra with Docker:"
    Write-Host "  docker compose -f infra/docker-compose.dev.yml up -d"

    Write-Host "`nTo start infra with Podman:"
    Write-Host "  podman-compose -f infra/podman-compose.dev.yml up -d"
}

Write-Host "Workspace installer root: $RootDir"
Write-Host "GitHub owner: $GitHubOwner"

Clone-MissingRepos
Ensure-EnvFiles
Install-Dependencies
Show-ComposeInstructions

Write-Host "`nDone."

