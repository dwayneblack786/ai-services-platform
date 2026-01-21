# TTS gRPC Testing with grpcurl (PowerShell)
# Usage: .\test-synthesize.ps1 "Text to synthesize"

param(
    [string]$Text = "Hello, this is a test of text-to-speech",
    [string]$ServerHost = "localhost:50051"
)

Write-Host "=== TTS Synthesis Test with grpcurl ===" -ForegroundColor Cyan
Write-Host "Text: $Text"
Write-Host "Host: $ServerHost"
Write-Host ""

# Test 1: Synthesize (single request)
Write-Host "Test 1: Single synthesis request" -ForegroundColor Yellow

$sessionId = "test-$(Get-Date -UFormat %s)"
$request = @{
    session_id = $sessionId
    text = $Text
    language = "en-US"
    voice_name = "en-US-JennyNeural"
    format = "mp3"
    customer_id = "test-customer"
} | ConvertTo-Json -Compress

$response = grpcurl -plaintext -d $request $ServerHost com.ai.va.grpc.VoiceService/Synthesize | ConvertFrom-Json

if ($response) {
    Write-Host "✅ Synthesis successful:" -ForegroundColor Green
    Write-Host "   Session ID: $($response.session_id)"
    Write-Host "   Format: $($response.format)"
    Write-Host "   Audio size: $($response.audio_data.Length) bytes (base64)"
    Write-Host "   Voice: $($response.metadata.voice_name)"
    Write-Host "   Duration: $($response.metadata.duration_ms)ms"
    Write-Host "   Provider: $($response.metadata.provider)"
    Write-Host "   Success: $($response.metadata.success)"
} else {
    Write-Host "❌ Synthesis failed" -ForegroundColor Red
}

Write-Host ""
Write-Host "Note: Audio data is base64 encoded in the response."
Write-Host "To save audio, use a proper gRPC client (Node.js, Python, or Java)." -ForegroundColor Gray
