# Start Vision Server
# Run this script to set up and manage the Vision training/inference environment
param(
    [switch]$Train,
    [switch]$Server,
    [switch]$Help
)

function Show-Help {
    Write-Host "`nVision Server Manager" -ForegroundColor Cyan
    Write-Host "=====================`n" -ForegroundColor Cyan
    Write-Host "Usage:" -ForegroundColor Yellow
    Write-Host "  .\start-vision.ps1 -Train    # Start training pipeline"
    Write-Host "  .\start-vision.ps1 -Server   # Start Flask inference server (Phase 2)"
    Write-Host "  .\start-vision.ps1 -Help     # Show this help`n"
    exit
}

if ($Help) {
    Show-Help
}

python -V
Write-Host "Vision Server Environment Setup" -ForegroundColor Cyan

$visionPath = "C:\Users\Owner\Documents\ai-services-platform\services-python\vision-server"

# Check if virtual environment exists
if (-not (Test-Path "$visionPath\venv")) {
    Write-Host "Virtual environment not found. Creating..." -ForegroundColor Yellow
    Set-Location $visionPath
    python -m venv venv
    Write-Host "Virtual environment created." -ForegroundColor Green
}

# Activate virtual environment
Set-Location $visionPath
& "$visionPath\venv\Scripts\Activate.ps1"

# Check if dependencies are installed
Write-Host "Checking dependencies..." -ForegroundColor Yellow
$pipList = python -m pip list
if ($pipList -notmatch "torch") {
    Write-Host "Installing dependencies (this may take 15-20 minutes for PyTorch + CUDA)..." -ForegroundColor Yellow
    python -m pip install --upgrade pip
    python -m pip install -r requirements.txt
    Write-Host "Dependencies installed." -ForegroundColor Green
} else {
    Write-Host "Dependencies already installed." -ForegroundColor Green
}

# Check CUDA availability
Write-Host "`nChecking CUDA availability..." -ForegroundColor Yellow
python -c "import torch; print(f'CUDA Available: {torch.cuda.is_available()}'); print(f'CUDA Device: {torch.cuda.get_device_name(0) if torch.cuda.is_available() else \"None\"}')"

if ($Train) {
    Write-Host "`nStarting training pipeline..." -ForegroundColor Green
    Write-Host "Press Ctrl+C to stop`n" -ForegroundColor Yellow
    python training/train.py
} elseif ($Server) {
    Write-Host "`nStarting Vision inference server on http://localhost:8001" -ForegroundColor Green
    Write-Host "Press Ctrl+C to stop`n" -ForegroundColor Yellow
    python server.py
} else {
    Write-Host "`nEnvironment ready. Use -Train or -Server flag to start." -ForegroundColor Yellow
    Show-Help
}
