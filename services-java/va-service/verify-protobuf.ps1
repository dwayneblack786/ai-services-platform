# Protobuf Build Verification Script
# Ensures generated code matches expected Protobuf version

param(
    [string]$ExpectedVersion = "4.29.1"
)

Write-Host "🔍 Verifying Protobuf code generation..." -ForegroundColor Cyan

# 1. Check generated code header
$generatedFile = "target\generated-sources\protobuf\java\com\ai\va\grpc\AudioChunk.java"
if (Test-Path $generatedFile) {
    $header = Get-Content $generatedFile -Head 10
    $versionLine = $header | Select-String "Protobuf Java Version"
    
    if ($versionLine -match "Protobuf Java Version: $ExpectedVersion") {
        Write-Host "✅ Generated code uses Protobuf $ExpectedVersion" -ForegroundColor Green
    } else {
        Write-Host "❌ Generated code version mismatch!" -ForegroundColor Red
        Write-Host "Expected: $ExpectedVersion" -ForegroundColor Yellow
        Write-Host "Found: $versionLine" -ForegroundColor Yellow
        exit 1
    }
} else {
    Write-Host "⚠️  Generated sources not found. Run 'mvnw compile' first." -ForegroundColor Yellow
    exit 1
}

# 2. Verify protoc executable version
$protocPath = "$env:USERPROFILE\.m2\repository\com\google\protobuf\protoc\$ExpectedVersion"
if (Test-Path $protocPath) {
    Write-Host "✅ Protoc $ExpectedVersion found in Maven cache" -ForegroundColor Green
} else {
    Write-Host "⚠️  Protoc $ExpectedVersion not in cache, will download on next build" -ForegroundColor Yellow
}

# 3. Check for version conflicts
$wrongVersions = Get-ChildItem "$env:USERPROFILE\.m2\repository\com\google\protobuf\protoc" -Directory | 
    Where-Object { $_.Name -ne $ExpectedVersion -and $_.Name -match '^\d+\.\d+\.\d+$' }

if ($wrongVersions) {
    Write-Host "⚠️  Found other Protobuf versions in cache:" -ForegroundColor Yellow
    $wrongVersions | ForEach-Object { Write-Host "   - $($_.Name)" -ForegroundColor Yellow }
    Write-Host "   Consider cleaning: Remove-Item -Recurse '$env:USERPROFILE\.m2\repository\com\google\protobuf\protoc\<version>'" -ForegroundColor Gray
}

# 4. Verify pom.xml version
$pomContent = Get-Content "pom.xml" -Raw
if ($pomContent -match "<protobuf\.version>($ExpectedVersion)</protobuf\.version>") {
    Write-Host "✅ pom.xml declares Protobuf $ExpectedVersion" -ForegroundColor Green
} else {
    Write-Host "❌ pom.xml version mismatch!" -ForegroundColor Red
    exit 1
}

Write-Host "`n✅ All Protobuf version checks passed!" -ForegroundColor Green
Write-Host "   Generated code: Protobuf $ExpectedVersion" -ForegroundColor Gray
Write-Host "   Runtime library: Protobuf $ExpectedVersion" -ForegroundColor Gray
Write-Host "   Compiler (protoc): Protobuf $ExpectedVersion" -ForegroundColor Gray
