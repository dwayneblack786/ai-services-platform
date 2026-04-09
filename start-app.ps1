# Application Startup Script
# Starts all services: Keycloak, VA-Service, and application frontends/backends

Write-Host "`n🚀 Starting Application Services..." -ForegroundColor Cyan
Write-Host "================================`n" -ForegroundColor Cyan

# Check if Keycloak is running
Write-Host "🔐 Checking Keycloak..." -ForegroundColor Yellow
try {
    Invoke-WebRequest -Uri "http://localhost:9999" -Method GET -TimeoutSec 3 -ErrorAction Stop | Out-Null
    Write-Host "✅ Keycloak is running" -ForegroundColor Green
}
catch {
    Write-Host "⚠️  Keycloak is not running. Please start Keycloak:" -ForegroundColor Red
    Write-Host "   http://localhost:9999 (admin/admin)`n" -ForegroundColor Yellow
    $response = Read-Host "Do you want to continue anyway? (y/n)"
    if ($response -ne 'y') {
        exit 1
    }
}

# Check if Redis is running
Write-Host "🔐 Checking Redis..." -ForegroundColor Yellow
[string]$HostName = "127.0.0.1"
[int]$Port = 6379
   

try {
    $tcpClient = New-Object System.Net.Sockets.TcpClient($HostName, $Port)
    $stream = $tcpClient.GetStream()
    $writer = New-Object System.IO.StreamWriter($stream)
    $reader = New-Object System.IO.StreamReader($stream)

    # Send the Redis PING command followed by a carriage return and newline
    $writer.WriteLine("PING`r`n")
    $writer.Flush()

    # Read the response from the server
    $response = $reader.ReadLine()

    if ($response -eq "+PONG") {
        Write-Host "✅Connection successful. Redis server responded with '$response'." -ForegroundColor Green
    }
    else {
        Write-Host "⚠️Connection established, but received unexpected response: '$response'" -ForegroundColor Yellow
    }
}
catch {
    Write-Host "⚠️Connection failed: $_. Check that your Podman container is running and port forwarding is correct." -ForegroundColor Red
    Write-Host "⚠️  Redis is not running. Please start Redis:" -ForegroundColor Red
    Write-Host "   redis://default@127.0.0.1:6379`n" -ForegroundColor Yellow
    $response = Read-Host "Do you want to continue anyway? (y/n)"
    if ($response -ne 'y') {
        exit 1
    }
}
finally {
    # Clean up resources
    if ($reader) { $reader.Dispose() }
    if ($writer) { $writer.Dispose() }
    if ($stream) { $stream.Dispose() }
    if ($tcpClient) { $tcpClient.Dispose() }
}

# Check if MongoDB is running
Write-Host "📊 Checking MongoDB..." -ForegroundColor Yellow
try {
    $mongoTest = Get-Process mongod -ErrorAction SilentlyContinue
    if ($mongoTest) {
        Write-Host "✅ MongoDB is running (PID: $($mongoTest.Id))" -ForegroundColor Green
    }
    else {
        Write-Host "⚠️  MongoDB is not running. Please start MongoDB:" -ForegroundColor Red
        Write-Host "   mongod --dbpath C:\data\db`n" -ForegroundColor Yellow
        $response = Read-Host "Do you want to continue anyway? (y/n)"
        if ($response -ne 'y') {
            exit 1
        }
    }
}
catch {
    Write-Host "⚠️  Could not check MongoDB status" -ForegroundColor Yellow
}

Write-Host ""



# Kill any existing node processes on our ports
Write-Host "🧹 Cleaning up existing processes..." -ForegroundColor Yellow
$ports = @(5000, 3002, 5173, 5174, 8000, 8136, 8137, 50051)
foreach ($port in $ports) {
    $connections = Get-NetTCPConnection -LocalPort $port -ErrorAction SilentlyContinue
    if ($connections) {
        foreach ($conn in $connections) {
            try {
                Stop-Process -Id $conn.OwningProcess -Force -ErrorAction SilentlyContinue
                Write-Host "  Killed process on port $port (PID: $($conn.OwningProcess))" -ForegroundColor Gray
            }
            catch {
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

# Start Listing Service (Java Spring Boot) - Port 8137
Write-Host "3️⃣  Starting Listing Service (Port 8137)..." -ForegroundColor Cyan
Push-Location services-java\listing-service
Start-Process pwsh -ArgumentList "-NoExit", "-Command", ".\start-server.ps1" -WindowStyle Normal
Pop-Location
Write-Host "   ✓ Listing Service started" -ForegroundColor Green
Write-Host "   📡 HTTP: http://localhost:8137`n" -ForegroundColor Gray

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

# Start AI Listing Agent Backend (Port 3002)
Write-Host "4️⃣  Starting AI Listing Agent Backend (Port 3002)..." -ForegroundColor Cyan
Push-Location ai-listing-agent\backend-node
Start-Process pwsh -ArgumentList "-NoExit", "-Command", "npm run dev" -WindowStyle Normal
Pop-Location
Write-Host "   ✓ AI Listing Agent Backend started" -ForegroundColor Green
Write-Host "   📡 API: http://localhost:3002/api`n" -ForegroundColor Gray

Start-Sleep -Seconds 3

# Start AI Listing Agent Frontend (Port 5174)
Write-Host "5️⃣  Starting AI Listing Agent Frontend (Port 5174)..." -ForegroundColor Cyan
Push-Location ai-listing-agent\frontend
Start-Process pwsh -ArgumentList "-NoExit", "-Command", "npm run dev" -WindowStyle Normal
Pop-Location
Write-Host "   ✓ AI Listing Agent Frontend started" -ForegroundColor Green
Write-Host "   🌐 URL: http://localhost:5174`n" -ForegroundColor Gray

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
Write-Host "  Whisper Server:       http://localhost:8000" -ForegroundColor White
Write-Host "  VA-Service HTTP:      http://localhost:8136" -ForegroundColor White
Write-Host "  VA-Service gRPC:      localhost:50051" -ForegroundColor White
Write-Host "  Listing Service:      http://localhost:8137" -ForegroundColor White
Write-Host "  Product Management:   http://localhost:5173" -ForegroundColor White
Write-Host "  Listing Agent:        http://localhost:5174" -ForegroundColor White
Write-Host "  Listing Agent API:    http://localhost:3002/api" -ForegroundColor White

Write-Host "`n🧪 Test Tenant-First SSO:" -ForegroundColor Yellow
Write-Host "  1. Open incognito window → http://localhost:5173/login" -ForegroundColor White
Write-Host "  2. Enter tenant identifier (e.g., 'acme-corp')" -ForegroundColor White
Write-Host "  3. Redirects to Keycloak realm for authentication" -ForegroundColor White
Write-Host "  4. Login with testuser@example.com / Test123!" -ForegroundColor White
Write-Host "  5. Redirected back to Product Management - logged in!" -ForegroundColor White
Write-Host "  6. Open new tab → http://localhost:5174/login" -ForegroundColor White
Write-Host "  7. Use the same tenant identifier and confirm shared Keycloak SSO works there too`n" -ForegroundColor White

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
$healthChecks =
@(
    @{ Name = "VA-Service"; URL = "http://localhost:8136/health" },
    @{ Name = "Listing Service"; URL = "http://localhost:8137/actuator/health" },
    @{ Name = "Keycloak"; URL = "http://localhost:9999" },
    @{ Name = "Product Mgmt"; URL = "http://localhost:5000/health" },
    @{ Name = "Listing Agent"; URL = "http://localhost:3002/health" },
    @{ Name = "Whisper Server"; URL = "http://localhost:8000/health" }
)

foreach ($check in $healthChecks) {
    try {
        $response = Invoke-WebRequest -Uri $check.URL -Method GET -TimeoutSec 5 -ErrorAction Stop
        if ($response.StatusCode -eq 200) {
            Write-Host "  ✅ $($check.Name) - Healthy" -ForegroundColor Green
        }
        else {
            Write-Host "  ⚠️  $($check.Name) - Status: $($response.StatusCode)" -ForegroundColor Yellow
        }
    }
    catch {
        Write-Host "  ❌ $($check.Name) - Not responding yet (may still be starting)" -ForegroundColor Red
    }
}

Write-Host "`n✨ Ready to test SSO! Open your browser and start testing.`n" -ForegroundColor Cyan
