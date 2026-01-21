# Test LLM Configuration Script
# Tests both LM Studio (dev) and Azure OpenAI (prod) configurations

Write-Host "==================================================" -ForegroundColor Cyan
Write-Host "  LLM Configuration Test Suite" -ForegroundColor Cyan
Write-Host "==================================================" -ForegroundColor Cyan
Write-Host ""

$vaServicePath = "c:\Users\Owner\Documents\ai-services-platform\services-java\va-service"
$testMessage = "1. Hello, how are you?`n2. What can you help me with?`n3. Tell me about your services"

# Test 1: LM Studio (Dev Profile)
Write-Host "Test 1: LM Studio Configuration (Dev Profile)" -ForegroundColor Yellow
Write-Host "----------------------------------------------" -ForegroundColor Yellow
Write-Host "Prerequisites:" -ForegroundColor White
Write-Host "  - LM Studio running on localhost:1234" -ForegroundColor Gray
Write-Host "  - google/gemma-2-9b model loaded" -ForegroundColor Gray
Write-Host ""

$runDev = Read-Host "Run LM Studio test? (y/n)"
if ($runDev -eq 'y') {
    Write-Host "`nStarting va-service with dev profile..." -ForegroundColor Green
    Write-Host "Press Ctrl+C to stop the service when ready to test`n" -ForegroundColor Gray
    
    Set-Location $vaServicePath
    & .\mvnw.cmd spring-boot:run -Dspring.profiles.active=dev
}

Write-Host "`n"

# Test 2: Azure OpenAI (Prod Profile - Local Test)
Write-Host "Test 2: Azure OpenAI Configuration (Prod Profile - Local)" -ForegroundColor Yellow
Write-Host "-----------------------------------------------------------" -ForegroundColor Yellow
Write-Host "Prerequisites:" -ForegroundColor White
Write-Host "  - Azure OpenAI resource created" -ForegroundColor Gray
Write-Host "  - GPT-4 or GPT-3.5-turbo deployed" -ForegroundColor Gray
Write-Host "  - Environment variables set" -ForegroundColor Gray
Write-Host ""

$runProd = Read-Host "Run Azure OpenAI test? (y/n)"
if ($runProd -eq 'y') {
    # Check for Azure credentials
    if (-not $env:AZURE_OPENAI_ENDPOINT) {
        Write-Host "`nSetting up Azure OpenAI credentials..." -ForegroundColor Cyan
        Write-Host "Enter your Azure OpenAI details:`n" -ForegroundColor White
        
        $endpoint = Read-Host "Azure OpenAI Endpoint (e.g., https://your-resource.openai.azure.com)"
        $key = Read-Host "Azure OpenAI API Key" -AsSecureString
        $keyPlain = [Runtime.InteropServices.Marshal]::PtrToStringAuto([Runtime.InteropServices.Marshal]::SecureStringToBSTR($key))
        $deployment = Read-Host "Azure Deployment Name (e.g., gpt-4)"
        
        $env:AZURE_OPENAI_ENDPOINT = $endpoint
        $env:AZURE_OPENAI_KEY = $keyPlain
        $env:AZURE_OPENAI_DEPLOYMENT = $deployment
        
        Write-Host "`nEnvironment variables set!" -ForegroundColor Green
    } else {
        Write-Host "`nUsing existing Azure OpenAI credentials:" -ForegroundColor Green
        Write-Host "  Endpoint: $env:AZURE_OPENAI_ENDPOINT" -ForegroundColor Gray
        Write-Host "  Deployment: $env:AZURE_OPENAI_DEPLOYMENT" -ForegroundColor Gray
    }
    
    Write-Host "`nStarting va-service with prod profile..." -ForegroundColor Green
    Write-Host "Press Ctrl+C to stop the service when ready to test`n" -ForegroundColor Gray
    
    Set-Location $vaServicePath
    & .\mvnw.cmd spring-boot:run -Dspring.profiles.active=prod
}

Write-Host "`n"
Write-Host "==================================================" -ForegroundColor Cyan
Write-Host "  Testing Agent Endpoints" -ForegroundColor Cyan
Write-Host "==================================================" -ForegroundColor Cyan
Write-Host ""

$testEndpoint = Read-Host "Test agent endpoint now? (y/n)"
if ($testEndpoint -eq 'y') {
    Write-Host "`nTesting multi-question handling..." -ForegroundColor Cyan
    
    $body = @{
        sessionId = "config-test-$(Get-Date -Format 'HHmmss')"
        message = $testMessage
        context = @{}
    } | ConvertTo-Json

    try {
        Write-Host "`nSending request to http://localhost:8136/agent/execute" -ForegroundColor Gray
        $response = Invoke-RestMethod -Uri "http://localhost:8136/agent/execute" -Method POST -Body $body -ContentType "application/json"
        
        Write-Host "`n✓ Success!" -ForegroundColor Green
        Write-Host "Response:" -ForegroundColor White
        Write-Host $response.message -ForegroundColor Gray
        Write-Host "`nExecution time: $($response.executionTimeMs)ms" -ForegroundColor Cyan
        
    } catch {
        Write-Host "`n✗ Error: $_" -ForegroundColor Red
        Write-Host "`nMake sure va-service is running on port 8136" -ForegroundColor Yellow
    }
}

Write-Host "`n"
Write-Host "==================================================" -ForegroundColor Cyan
Write-Host "  Test Complete" -ForegroundColor Cyan
Write-Host "==================================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Yellow
Write-Host "1. Compare response quality between LM Studio and Azure" -ForegroundColor White
Write-Host "2. Check multi-question handling (should answer all 3 questions)" -ForegroundColor White
Write-Host "3. Review logs for provider detection and URL building" -ForegroundColor White
Write-Host "4. Verify costs in Azure Portal if using Azure OpenAI" -ForegroundColor White
Write-Host ""
Write-Host "For more info, see: LLM-CONFIGURATION.md" -ForegroundColor Cyan
