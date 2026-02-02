# Application Startup Script
# Starts all services: Keycloak, VA-Service, and application frontends/backends

Write-Host "`n🚀 Starting Application Services..." -ForegroundColor Cyan
Write-Host "================================`n" -ForegroundColor Cyan

# Check if Keycloak is running
Write-Host "🔐 Checking Keycloak..." -ForegroundColor Yellow
try {
    $keycloakTest = Invoke-WebRequest -Uri "http://localhost:9999" -Method GET -TimeoutSec 3 -ErrorAction Stop
    Write-Host "✅ Keycloak is running" -ForegroundColor Green
} catch {
    Write-Host "⚠️  Keycloak is not running. Please start Keycloak:" -ForegroundColor Red
    Write-Host "   http://localhost:9999 (admin/admin)`n" -ForegroundColor Yellow
    $response = Read-Host "Do you want to continue anyway? (y/n)"
    if ($response -ne 'y') {
        exit 1
    }
}

# Check if MongoDB is running
Write-Host "📊 Checking MongoDB..." -ForegroundColor Yellow
try {
    $mongoTest = Get-Process mongod -ErrorAction SilentlyContinue
    if ($mongoTest) {
        Write-Host "✅ MongoDB is running (PID: $($mongoTest.Id))" -ForegroundColor Green
    } else {
        Write-Host "⚠️  MongoDB is not running. Please start MongoDB:" -ForegroundColor Red
        Write-Host "   mongod --dbpath C:\data\db`n" -ForegroundColor Yellow
        $response = Read-Host "Do you want to continue anyway? (y/n)"
        if ($response -ne 'y') {
            exit 1
        }
    }
} catch {
    Write-Host "⚠️  Could not check MongoDB status" -ForegroundColor Yellow
}

Write-Host ""



# Kill any existing node processes on our ports
Write-Host "🧹 Cleaning up existing processes..." -ForegroundColor Yellow
$ports = @(5000, 5173,  8000)
foreach ($port in $ports) {
    $connections = Get-NetTCPConnection -LocalPort $port -ErrorAction SilentlyContinue
    if ($connections) {
        foreach ($conn in $connections) {
            try {
                Stop-Process -Id $conn.OwningProcess -Force -ErrorAction SilentlyContinue
                Write-Host "  Killed process on port $port (PID: $($conn.OwningProcess))" -ForegroundColor Gray
            } catch {
                # Ignore errors
            }
        }
    }
}

Start-Sleep -Seconds 2
Write-Host "✅ Cleanup complete`n" -ForegroundColor Green

# Start VA-Service (Java Spring Boot) - Port 8136 & gRPC 50051
Write-Host "2️⃣  Starting VA-Service (Port 8136 & gRPC 50051)..." -ForegroundColor Cyan
Push-Location services-java\va-service
Start-Process pwsh -ArgumentList "-NoExit", "-Command", ".\start-server.ps1" -WindowStyle Normal
Pop-Location
Write-Host "   ✓ VA-Service started" -ForegroundColor Green
Write-Host "   📡 HTTP: http://localhost:8136" -ForegroundColor Gray
Write-Host "   📡 gRPC: localhost:50051`n" -ForegroundColor Gray

Start-Sleep -Seconds 10

# Start Whisper  Server (Port 8000) 
Write-Host "1️⃣  Starting Whisper Server (Port 8000)..." -ForegroundColor Cyan
Push-Location services-python\whisper-server
Start-Process pwsh -ArgumentList "-NoExit", "-Command", ".\start-whisper.ps1" -WindowStyle Normal
Pop-Location
Write-Host "   ✓ Whisper Server started" -ForegroundColor Green
Write-Host "   📡 API: http://localhost:8000`n" -ForegroundColor Gray

Start-Sleep -Seconds 3

# Start Prod3ct Management Backend (Port 5000) - Tenant Service
Write-Host "1️⃣  Starting Product Management Backend (Port 5000)..." -ForegroundColor Cyan
Push-Location product-management\backend-node
Start-Process pwsh -ArgumentList "-NoExit", "-Command", "npm run dev" -WindowStyle Normal
Pop-Location
Write-Host "   ✓ Product Management Backend started" -ForegroundColor Green
Write-Host "   📡 API: http://localhost:5000/api`n" -ForegroundColor Gray

Start-Sleep -Seconds 3


# Start Prom4t Management Backend (Port 5001)
# Write-Host "2️⃣  Starting Prompt Management Backend (Port 5001)..." -ForegroundColor Cyan
# Push-Location prompt-management\backend
# Start-Process pwsh -ArgumentList "-NoExit", "-Command", "npm run dev" -WindowStyle Normal
# Pop-Location
# Write-Host "   ✓ Prompt Management Backend started" -ForegroundColor Green
# Write-Host "   📡 API: http://localhost:5001/api`n" -ForegroundColor Gray

# Start-Sleep -Seconds 3

# Start Product Management Frontend (Port 5173)
Write-Host "3️⃣  Starting Product Management Frontend (Port 5173)..." -ForegroundColor Cyan
Push-Location product-management\frontend
Start-Process pwsh -ArgumentList "-NoExit", "-Command", "npm run dev" -WindowStyle Normal
Pop-Location
Write-Host "   ✓ Product Management Frontend started" -ForegroundColor Green
Write-Host "   🌐 URL: http://localhost:5173`n" -ForegroundColor Gray

Start-Sleep -Seconds 3

# Start Prompt Management Frontend (Port 3001)
# Write-Host "5️⃣  Starting Prompt Management Frontend (Port 3001)..." -ForegroundColor Cyan
# Push-Location prompt-management\frontend
# Start-Process pwsh -ArgumentList "-NoExit", "-Command", "npm run dev" -WindowStyle Normal
# Pop-Location
# Write-Host "   ✓ Prompt Management Frontend started" -ForegroundColor Green
# Write-Host "   🌐 URL: http://localhost:3001`n" -ForegroundColor Gray

Start-Sleep -Seconds 5

Write-Host "`n================================" -ForegroundColor Cyan
Write-Host "✅ All services started!" -ForegroundColor Green
Write-Host "================================`n" -ForegroundColor Cyan

Write-Host "📋 Service URLs:" -ForegroundColor Yellow
Write-Host "  Keycloak (IdP):       http://localhost:9999 (admin/admin)" -ForegroundColor White
Write-Host "  VA-Service HTTP:      http://localhost:8136" -ForegroundColor White
Write-Host "  VA-Service gRPC:      localhost:50051" -ForegroundColor White
Write-Host "  Product Management:   http://localhost:5173" -ForegroundColor White
Write-Host "  Prompt Management:    http://localhost:3001" -ForegroundColor White

Write-Host "`n🧪 Test Tenant-First SSO:" -ForegroundColor Yellow
Write-Host "  1. Open incognito window → http://localhost:5173/login" -ForegroundColor White
Write-Host "  2. Enter tenant identifier (e.g., 'acme-corp')" -ForegroundColor White
Write-Host "  3. Redirects to Keycloak realm for authentication" -ForegroundColor White
Write-Host "  4. Login with testuser@example.com / Test123!" -ForegroundColor White
Write-Host "  5. Redirected back to app - logged in!" -ForegroundColor White
Write-Host "  6. Open new tab → http://localhost:3001" -ForegroundColor White
Write-Host "  7. Should auto-login via Keycloak SSO! ✨`n" -ForegroundColor White

Write-Host "🔍 Verify session:" -ForegroundColor Yellow
Write-Host "  DevTools → Application → Cookies → localhost" -ForegroundColor White
Write-Host "  Look for: connect.sid (session cookie)`n" -ForegroundColor White

Write-Host "📚 Documentation:" -ForegroundColor Yellow
Write-Host "  KEYCLOAK_INTEGRATION_COMPLETE.md - Complete setup guide" -ForegroundColor White
Write-Host "  TENANT_FIRST_LOGIN_FLOW.md - Tenant-first login details`n" -ForegroundColor White

Write-Host "⚠️  Note: Allow 10-15 seconds for all services to fully initialize" -ForegroundColor Yellow
Write-Host "    Check each terminal window for 'Server running' messages`n" -ForegroundColor Yellow

# Wait a bit then check if services are responding
Write-Host "Waiting for services to initialize..." -ForegroundColor Gray
Start-Sleep -Seconds 10

Write-Host "`n🏥 Health Checks:" -ForegroundColor Yellow
$healthChecks =VA-Service"; URL = "http://localhost:8136/health" },
    @{ Name = " @(
    @{ Name = "Keycloak"; URL = "http://localhost:9999" },
    @{ Name = "Product Mgmt"; URL = "http://localhost:5000/health" },
    @{ Name = "Prompt Mgmt"; URL = "http://localhost:5001/health" }
)

foreach ($check in $healthChecks) {
    try {
        $response = Invoke-WebRequest -Uri $check.URL -Method GET -TimeoutSec 5 -ErrorAction Stop
        if ($response.StatusCode -eq 200) {
            Write-Host "  ✅ $($check.Name) - Healthy" -ForegroundColor Green
        } else {
            Write-Host "  ⚠️  $($check.Name) - Status: $($response.StatusCode)" -ForegroundColor Yellow
        }
    } catch {
        Write-Host "  ❌ $($check.Name) - Not responding yet (may still be starting)" -ForegroundColor Red
    }
}

Write-Host "`n✨ Ready to test SSO! Open your browser and start testing.`n" -ForegroundColor Cyan
