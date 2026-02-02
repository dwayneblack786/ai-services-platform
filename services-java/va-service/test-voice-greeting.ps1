# Test Voice Session Greeting Endpoint
# Tests the new /voice/session endpoint with greeting generation

Write-Host "`n=== Testing Voice Session with Initial Greeting ===" -ForegroundColor Cyan
Write-Host "Endpoint: POST http://localhost:8136/voice/session`n" -ForegroundColor Gray

$body = @{
    callId = "test-greeting-$(Get-Date -Format 'yyyyMMdd-HHmmss')"
    customerId = "test-customer"
    tenantId = "test-tenant"
    productId = "va-service"
} | ConvertTo-Json

Write-Host "Request Body:" -ForegroundColor Yellow
Write-Host $body -ForegroundColor Gray
Write-Host ""

try {
    $response = Invoke-RestMethod -Uri "http://localhost:8136/voice/session" `
        -Method Post `
        -ContentType "application/json" `
        -Body $body `
        -TimeoutSec 30

    Write-Host "✅ SUCCESS!" -ForegroundColor Green
    Write-Host "`nResponse:" -ForegroundColor Yellow
    
    Write-Host "  Session ID: $($response.sessionId)" -ForegroundColor White
    Write-Host "  Status: $($response.status)" -ForegroundColor White
    Write-Host "  Message: $($response.message)" -ForegroundColor White
    
    if ($response.greetingText) {
        Write-Host "`n  Greeting Text:" -ForegroundColor Cyan
        Write-Host "    $($response.greetingText)" -ForegroundColor White
    } else {
        Write-Host "`n  ⚠️  No greeting text generated" -ForegroundColor Yellow
    }
    
    if ($response.greetingAudio) {
        $audioLength = $response.greetingAudio.Length
        Write-Host "`n  Greeting Audio:" -ForegroundColor Cyan
        Write-Host "    Base64 Length: $audioLength characters" -ForegroundColor White
        Write-Host "    Estimated Size: $([math]::Round($audioLength * 3 / 4 / 1024, 2)) KB" -ForegroundColor White
    } else {
        Write-Host "`n  ⚠️  No greeting audio generated" -ForegroundColor Yellow
    }
    
    Write-Host "`n✨ Voice session initialized with greeting successfully!" -ForegroundColor Green
    
} catch {
    Write-Host "❌ ERROR!" -ForegroundColor Red
    Write-Host "Status Code: $($_.Exception.Response.StatusCode.value__)" -ForegroundColor Red
    Write-Host "Error Message: $($_.Exception.Message)" -ForegroundColor Red
    
    if ($_.ErrorDetails.Message) {
        Write-Host "`nError Details:" -ForegroundColor Yellow
        Write-Host $_.ErrorDetails.Message -ForegroundColor Gray
    }
}

Write-Host "`n=== Test Complete ===" -ForegroundColor Cyan
