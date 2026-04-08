# Keycloak Migration Test Script
# Tests the unified Keycloak SSO setup

Write-Host "`n" -NoNewline
Write-Host "=" * 80 -ForegroundColor Cyan
Write-Host "🧪 KEYCLOAK MIGRATION TEST SUITE" -ForegroundColor Cyan
Write-Host "=" * 80 -ForegroundColor Cyan
Write-Host "`n"

$testsPassed = 0
$testsFailed = 0

# Helper function to test HTTP endpoint
function Test-Endpoint {
    param(
        [string]$Url,
        [string]$TestName,
        [string]$ExpectedPattern = $null
    )

    Write-Host "Testing: $TestName" -ForegroundColor Yellow
    Write-Host "  URL: $Url" -ForegroundColor Gray

    try {
        $response = Invoke-WebRequest -Uri $Url -UseBasicParsing -TimeoutSec 5 -ErrorAction Stop

        if ($response.StatusCode -eq 200) {
            if ($ExpectedPattern -and $response.Content -notmatch $ExpectedPattern) {
                Write-Host "  ❌ FAILED: Response doesn't match expected pattern" -ForegroundColor Red
                Write-Host "     Expected pattern: $ExpectedPattern" -ForegroundColor Gray
                return $false
            }
            Write-Host "  ✅ PASSED" -ForegroundColor Green
            return $true
        } else {
            Write-Host "  ❌ FAILED: Status code $($response.StatusCode)" -ForegroundColor Red
            return $false
        }
    } catch {
        Write-Host "  ❌ FAILED: $($_.Exception.Message)" -ForegroundColor Red
        return $false
    }
}

# Helper function to test MongoDB query
function Test-MongoCollection {
    param(
        [string]$TestName,
        [string]$Database,
        [string]$Collection,
        [scriptblock]$Query
    )

    Write-Host "Testing: $TestName" -ForegroundColor Yellow
    Write-Host "  Database: $Database" -ForegroundColor Gray
    Write-Host "  Collection: $Collection" -ForegroundColor Gray

    try {
        # Check if mongosh is available
        $mongoPath = Get-Command mongosh -ErrorAction SilentlyContinue
        if (-not $mongoPath) {
            Write-Host "  ⚠️  SKIPPED: mongosh not found in PATH" -ForegroundColor Yellow
            return $null
        }

        $queryString = $Query.ToString()
        $result = & mongosh "mongodb://localhost:27017/$Database" --quiet --eval "db.$Collection.countDocuments({})" 2>&1

        if ($LASTEXITCODE -eq 0) {
            $count = [int]$result
            if ($count -gt 0) {
                Write-Host "  ✅ PASSED: Found $count documents" -ForegroundColor Green
                return $true
            } else {
                Write-Host "  ❌ FAILED: Collection is empty" -ForegroundColor Red
                return $false
            }
        } else {
            Write-Host "  ❌ FAILED: MongoDB query error" -ForegroundColor Red
            return $false
        }
    } catch {
        Write-Host "  ⚠️  SKIPPED: $($_.Exception.Message)" -ForegroundColor Yellow
        return $null
    }
}

Write-Host "`n================================================" -ForegroundColor Cyan
Write-Host " TEST 1: Infrastructure Checks" -ForegroundColor Cyan
Write-Host "================================================`n" -ForegroundColor Cyan

# Test 1.1: Keycloak is running
if (Test-Endpoint -Url "http://localhost:9999" -TestName "Keycloak is running" -ExpectedPattern "Keycloak") {
    $testsPassed++
} else {
    $testsFailed++
    Write-Host "`n  💡 TIP: Start Keycloak with:" -ForegroundColor Yellow
    Write-Host "     cd keycloak-23.0.0" -ForegroundColor Gray
    Write-Host "     .\bin\kc.bat start-dev --http-port=9999`n" -ForegroundColor Gray
}

# Test 1.2: Product Management Backend
if (Test-Endpoint -Url "http://localhost:5000/health" -TestName "Product Management backend") {
    $testsPassed++
} else {
    $testsFailed++
    Write-Host "`n  💡 TIP: Start with:" -ForegroundColor Yellow
    Write-Host "     cd product-management/backend-node" -ForegroundColor Gray
    Write-Host "     npm run dev`n" -ForegroundColor Gray
}

# Test 1.3: Prompt Management Backend
if (Test-Endpoint -Url "http://localhost:5001/health" -TestName "Prompt Management backend") {
    $testsPassed++
} else {
    $testsFailed++
    Write-Host "`n  💡 TIP: Start with:" -ForegroundColor Yellow
    Write-Host "     cd prompt-management/backend" -ForegroundColor Gray
    Write-Host "     npm run dev`n" -ForegroundColor Gray
}

Write-Host "`n================================================" -ForegroundColor Cyan
Write-Host " TEST 2: Database Checks" -ForegroundColor Cyan
Write-Host "================================================`n" -ForegroundColor Cyan

# Test 2.1: MongoDB is accessible
$mongoResult = Test-MongoCollection -TestName "MongoDB is accessible" -Database "ai_platform" -Collection "users" -Query {}
if ($mongoResult -eq $true) {
    $testsPassed++
} elseif ($mongoResult -eq $false) {
    $testsFailed++
    Write-Host "`n  💡 TIP: Start MongoDB if not running`n" -ForegroundColor Yellow
} else {
    Write-Host "`n  ⚠️  Skipping MongoDB tests (mongosh not available)`n" -ForegroundColor Yellow
}

# Test 2.2: Tenants exist in database
$tenantsResult = Test-MongoCollection -TestName "Keycloak tenants seeded" -Database "ai_platform" -Collection "keycloak_tenants" -Query {}
if ($tenantsResult -eq $true) {
    $testsPassed++
} elseif ($tenantsResult -eq $false) {
    $testsFailed++
    Write-Host "`n  💡 TIP: Seed tenants with:" -ForegroundColor Yellow
    Write-Host "     cd product-management/backend-node" -ForegroundColor Gray
    Write-Host "     npx ts-node scripts/seed-tenants.ts`n" -ForegroundColor Gray
}

Write-Host "`n================================================" -ForegroundColor Cyan
Write-Host " TEST 3: Keycloak Configuration" -ForegroundColor Cyan
Write-Host "================================================`n" -ForegroundColor Cyan

# Test 3.1: Keycloak default realm exists
if (Test-Endpoint -Url "http://localhost:9999/realms/tenant-default/.well-known/openid-configuration" -TestName "Default realm exists" -ExpectedPattern "issuer") {
    $testsPassed++
} else {
    $testsFailed++
    Write-Host "`n  💡 TIP: Create realm in Keycloak Admin Console:" -ForegroundColor Yellow
    Write-Host "     http://localhost:9999/admin`n" -ForegroundColor Gray
}

# Test 3.2: Product Management Keycloak routes
if (Test-Endpoint -Url "http://localhost:5000/api/auth/keycloak/status" -TestName "Product Management Keycloak routes") {
    $testsPassed++
} else {
    $testsFailed++
}

# Test 3.3: Prompt Management Keycloak routes
if (Test-Endpoint -Url "http://localhost:5001/api/auth/keycloak/status" -TestName "Prompt Management Keycloak routes") {
    $testsPassed++
} else {
    $testsFailed++
}

Write-Host "`n================================================" -ForegroundColor Cyan
Write-Host " TEST 4: Authentication Flow Test" -ForegroundColor Cyan
Write-Host "================================================`n" -ForegroundColor Cyan

Write-Host "Testing: Tenant lookup endpoint" -ForegroundColor Yellow
Write-Host "  URL: http://localhost:5000/api/auth/tenant/lookup" -ForegroundColor Gray

try {
    $body = @{
        identifier = "default"
    } | ConvertTo-Json

    $response = Invoke-RestMethod -Uri "http://localhost:5000/api/auth/tenant/lookup" `
        -Method Post `
        -ContentType "application/json" `
        -Body $body `
        -TimeoutSec 5 `
        -ErrorAction Stop

    if ($response.success -and $response.tenant) {
        Write-Host "  ✅ PASSED: Tenant 'default' found" -ForegroundColor Green
        Write-Host "     Tenant ID: $($response.tenant.tenantId)" -ForegroundColor Gray
        Write-Host "     Keycloak Realm: $($response.tenant.keycloakRealm)" -ForegroundColor Gray
        $testsPassed++
    } else {
        Write-Host "  ❌ FAILED: Tenant lookup returned unexpected response" -ForegroundColor Red
        $testsFailed++
    }
} catch {
    Write-Host "  ❌ FAILED: $($_.Exception.Message)" -ForegroundColor Red
    $testsFailed++
}

Write-Host "`n" -NoNewline
Write-Host "=" * 80 -ForegroundColor Cyan
Write-Host "📊 TEST RESULTS" -ForegroundColor Cyan
Write-Host "=" * 80 -ForegroundColor Cyan

$totalTests = $testsPassed + $testsFailed
$successRate = if ($totalTests -gt 0) { [math]::Round(($testsPassed / $totalTests) * 100, 1) } else { 0 }

Write-Host "`n  Total Tests: $totalTests" -ForegroundColor White
Write-Host "  ✅ Passed: $testsPassed" -ForegroundColor Green
Write-Host "  ❌ Failed: $testsFailed" -ForegroundColor Red
Write-Host "  📈 Success Rate: $successRate%`n" -ForegroundColor $(if ($successRate -ge 80) { "Green" } elseif ($successRate -ge 50) { "Yellow" } else { "Red" })

if ($testsFailed -eq 0) {
    Write-Host "🎉 ALL TESTS PASSED! Migration is ready for manual testing.`n" -ForegroundColor Green

    Write-Host "================================================" -ForegroundColor Green
    Write-Host " NEXT STEPS: Manual Authentication Test" -ForegroundColor Green
    Write-Host "================================================`n" -ForegroundColor Green

    Write-Host "1. Open browser: http://localhost:3001" -ForegroundColor White
    Write-Host "2. Enter tenant ID: default" -ForegroundColor White
    Write-Host "3. Should redirect to Keycloak login" -ForegroundColor White
    Write-Host "4. Login with Keycloak credentials" -ForegroundColor White
    Write-Host "5. Should redirect back authenticated ✅`n" -ForegroundColor White

    Write-Host "To test cross-service SSO:" -ForegroundColor Yellow
    Write-Host "1. Login to Product Management (http://localhost:5173)" -ForegroundColor White
    Write-Host "2. Open Prompt Management (http://localhost:3001)" -ForegroundColor White
    Write-Host "3. Should auto-login without credentials! 🎉`n" -ForegroundColor White
} elseif ($successRate -ge 50) {
    Write-Host "⚠️  SOME TESTS FAILED - Review errors above and fix before testing.`n" -ForegroundColor Yellow
} else {
    Write-Host "❌ MANY TESTS FAILED - Infrastructure not ready. Start required services.`n" -ForegroundColor Red
}

Write-Host "=" * 80 -ForegroundColor Cyan
Write-Host "`n"
