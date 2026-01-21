# Start Whisper Server
# Run this script to start the Whisper STT server on port 8000

Write-Host "Starting Whisper STT Server..." -ForegroundColor Cyan

$whisperPath = "C:\Users\Owner\Documents\ai-services-platform\services-python\whisper-server"

# Check if virtual environment exists
if (-not (Test-Path "$whisperPath\venv")) {
    Write-Host "Virtual environment not found. Creating..." -ForegroundColor Yellow
    Set-Location $whisperPath
    python -m venv venv
    Write-Host "Virtual environment created." -ForegroundColor Green
}

# Activate and start server
Set-Location $whisperPath
& "$whisperPath\venv\Scripts\Activate.ps1"

# Check if dependencies are installed
Write-Host "Checking dependencies..." -ForegroundColor Yellow
$pipList = pip list
if ($pipList -notmatch "openai-whisper") {
    Write-Host "Installing dependencies (this may take 10-15 minutes)..." -ForegroundColor Yellow
    pip install -r requirements.txt
    Write-Host "Dependencies installed." -ForegroundColor Green
}

Write-Host "`nStarting Whisper server on http://localhost:8000" -ForegroundColor Green
Write-Host "Press Ctrl+C to stop`n" -ForegroundColor Yellow

python server.py
