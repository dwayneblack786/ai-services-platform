# =========================================================================
# KEYCLOAK MULTI-TENANT SSO STARTUP SCRIPT
# =========================================================================
# This script starts all services with Keycloak authentication
# =========================================================================

Write-Host "`n" -NoNewline
Write-Host "================================================================================================" -ForegroundColor Cyan
Write-Host "   🔐 KEYCLOAK MULTI-TENANT SSO - STARTUP SCRIPT" -ForegroundColor Cyan
Write-Host "================================================================================================" -ForegroundColor Cyan
Write-Host ""

# Stop all existing Node.js processes
Write-Host "🛑 Stopping all existing Node.js processes..." -ForegroundColor Yellow
Get-Process -Name node -ErrorAction SilentlyContinue | Stop-Process -Force
Start-Sleep -Seconds 2
Write-Host "✅ All Node.js processes stopped`n" -ForegroundColor Green

# Check Keycloak
Write-Host "================================================================================================" -ForegroundColor Cyan
Write-Host "   🔍 CHECKING KEYCLOAK (Identity Provider)" -ForegroundColor Cyan
Write-Host "================================================================================================" -ForegroundColor Cyan
try {
    $keycloakTest = Invoke-WebRequest -Uri "http://localhost:9999" -Method GET -TimeoutSec 3 -ErrorAction Stop
    Write-Host "✅ Keycloak is running at http://localhost:9999" -ForegroundColor Green
    Write-Host "   📋 Admin Console: http://localhost:9999/admin (admin/admin)" -ForegroundColor White
} catch {
    Write-Host "❌ Keycloak is not running!" -ForegroundColor Red
    Write-Host "   Please start Keycloak before running this script." -ForegroundColor Yellow
    Write-Host "   URL: http://localhost:9999" -ForegroundColor White
    exit 1
}
Write-Host ""
Start-Sleep -Seconds 2

# Start Product Management Backend on Port 5000
Write-Host "================================================================================================" -ForegroundColor Cyan
Write-Host "   1️⃣  STARTING PRODUCT MANAGEMENT BACKEND (Port 5000)" -ForegroundColor Cyan
Write-Host "================================================================================================" -ForegroundColor Cyan
Push-Location $PSScriptRoot\product-management\backend-node
Start-Process pwsh -ArgumentList "-NoExit", "-Command", "npm run dev; Read-Host 'Press Enter to close'" -WindowStyle Minimized
Pop-Location
Write-Host "✅ Product Management Backend started on http://localhost:5000" -ForegroundColor Green
Write-Host "   📋 Tenant Login: http://localhost:5000/api/auth/tenant/login" -ForegroundColor White
Write-Host "   📋 User Profile: http://localhost:5000/api/users/me" -ForegroundColor White
Write-Host ""
Start-Sleep -Seconds 3

# Start Prompt Management Backend on Port 5001
Write-Host "================================================================================================" -ForegroundColor Cyan
Write-Host "   2️⃣  STARTING PROMPT MANAGEMENT BACKEND (Port 5001)" -ForegroundColor Cyan
Write-Host "================================================================================================" -ForegroundColor Cyan
Push-Location $PSScriptRoot\prompt-management\backend
Start-Process pwsh -ArgumentList "-NoExit", "-Command", "npm run dev; Read-Host 'Press Enter to close'" -WindowStyle Minimized
Pop-Location
Write-Host "✅ Prompt Management Backend started on http://localhost:5001" -ForegroundColor Green
Write-Host "   📋 Tenant Login: http://localhost:5001/api/auth/tenant/login" -ForegroundColor White
Write-Host ""
Start-Sleep -Seconds 3

# Start Product Management Frontend on Port 5173
Write-Host "================================================================================================" -ForegroundColor Cyan
Write-Host "   3️⃣  STARTING PRODUCT MANAGEMENT FRONTEND (Port 5173)" -ForegroundColor Cyan
Write-Host "================================================================================================" -ForegroundColor Cyan
Push-Location $PSScriptRoot\product-management\frontend
Start-Process pwsh -ArgumentList "-NoExit", "-Command", "npm run dev; Read-Host 'Press Enter to close'" -WindowStyle Minimized
Pop-Location
Write-Host "✅ Product Management Frontend started on http://localhost:5173" -ForegroundColor Green
Write-Host ""
Start-Sleep -Seconds 3

# Start Prompt Management Frontend on Port 3001
Write-Host "================================================================================================" -ForegroundColor Cyan
Write-Host "   4️⃣  STARTING PROMPT MANAGEMENT FRONTEND (Port 3001)" -ForegroundColor Cyan
Write-Host "================================================================================================" -ForegroundColor Cyan
Push-Location $PSScriptRoot\prompt-management\frontend
Start-Process pwsh -ArgumentList "-NoExit", "-Command", "npm run dev; Read-Host 'Press Enter to close'" -WindowStyle Minimized
Pop-Location
Write-Host "✅ Prompt Management Frontend started on http://localhost:3001" -ForegroundColor Green
Write-Host ""

Write-Host "`n"
Write-Host "================================================================================================" -ForegroundColor Green
Write-Host "   ✅ ALL SERVICES STARTED SUCCESSFULLY!" -ForegroundColor Green
Write-Host "================================================================================================" -ForegroundColor Green
Write-Host ""
Write-Host "📱 Application URLs:" -ForegroundColor Cyan
Write-Host "   • Keycloak (IdP):               http://localhost:9999" -ForegroundColor White
Write-Host "   • Keycloak Admin:               http://localhost:9999/admin (admin/admin)" -ForegroundColor White
Write-Host "   • Product Management:           http://localhost:5173" -ForegroundColor White
Write-Host "   • Prompt Management:            http://localhost:3001" -ForegroundColor White
Write-Host ""
Write-Host "🔐 Tenant-First SSO Flow:" -ForegroundColor Cyan
Write-Host "   1. Visit Product Management or Prompt Management" -ForegroundColor White
Write-Host "   2. Enter tenant identifier (e.g., 'acme-corp')" -ForegroundColor White
Write-Host "   3. Redirects to Keycloak realm: tenant-acme-corp" -ForegroundColor White
Write-Host "   4. Authenticate with username/password, Google, or Microsoft" -ForegroundColor White
Write-Host "   5. Redirects back to app - logged in!" -ForegroundColor White
Write-Host "   6. Visit the OTHER app - auto-login via Keycloak SSO!" -ForegroundColor White
Write-Host ""
Write-Host "🧪 Testing Instructions:" -ForegroundColor Cyan
Write-Host "   1. Seed tenants: npx ts-node scripts/keycloak/seed-tenants.ts" -ForegroundColor Yellow
Write-Host "   2. Visit Product Management: http://localhost:5173" -ForegroundColor Yellow
Write-Host "   3. Enter tenant: 'acme-corp'" -ForegroundColor Yellow
Write-Host "   4. Login at Keycloak: testuser@example.com / Test123!" -ForegroundColor Yellow
Write-Host "   5. Visit Prompt Management: http://localhost:3001" -ForegroundColor Yellow
Write-Host "   6. Should auto-login without re-entering tenant or credentials!" -ForegroundColor Yellow
Write-Host ""
Write-Host "================================================================================================" -ForegroundColor Green
Write-Host ""

Read-Host "Press Enter to stop all services"

Write-Host "`n🛑 Stopping all services..." -ForegroundColor Yellow
Get-Process -Name node -ErrorAction SilentlyContinue | Stop-Process -Force
Write-Host "✅ All services stopped" -ForegroundColor Green
