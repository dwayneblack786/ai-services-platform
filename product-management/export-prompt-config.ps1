# Export Prompt Configuration for LM Studio Comparison
# This script calls the debug endpoint and saves the prompt configuration

$vaServiceUrl = "http://localhost:8136"
$outputFile = "prompt-configuration.json"

Write-Host "Exporting prompt configuration from VA-Service..." -ForegroundColor Cyan

# Test message to generate prompt
$body = @{
    sessionId = "debug-export"
    message = "1. Hello, how are you?`n2. What can you help me with?`n3. Tell me about your services`n4. Can you explain agentic workflows?"
    context = @{}
} | ConvertTo-Json

try {
    # Call debug endpoint
    $response = Invoke-RestMethod -Uri "$vaServiceUrl/agent/debug/prompt" -Method POST -Body $body -ContentType "application/json"
    
    # Save to file
    $response | ConvertTo-Json -Depth 10 | Out-File $outputFile -Encoding UTF8
    
    Write-Host "`n✓ Configuration exported to: $outputFile" -ForegroundColor Green
    Write-Host "`nPrompt Configuration Summary:" -ForegroundColor Yellow
    Write-Host "==============================`n"
    Write-Host "Session ID: $($response.sessionId)"
    Write-Host "Model: $($response.model)"
    Write-Host "Temperature: $($response.temperature)"
    Write-Host "Max Tokens: $($response.maxTokens)"
    Write-Host "History Size: $($response.historySize)"
    Write-Host "LM Studio Endpoint: $($response.lmStudioEndpoint)"
    Write-Host "`nSystem Prompt (first 200 chars):"
    Write-Host ($response.systemPrompt.Substring(0, [Math]::Min(200, $response.systemPrompt.Length)))
    Write-Host "...`n"
    Write-Host "Full configuration saved to $outputFile" -ForegroundColor Cyan
    
} catch {
    Write-Host "`n✗ Error: $_" -ForegroundColor Red
    Write-Host "`nMake sure VA-Service is running on $vaServiceUrl" -ForegroundColor Yellow
}
