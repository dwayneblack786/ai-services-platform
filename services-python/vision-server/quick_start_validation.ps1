#!/usr/bin/env pwsh
# Quick Start: Label 100 images and review them

Write-Host "==================================================" -ForegroundColor Cyan
Write-Host "Vision Server - Label Validation Quick Start" -ForegroundColor Cyan
Write-Host "==================================================" -ForegroundColor Cyan
Write-Host ""

# Check if venv exists
if (-not (Test-Path "venv")) {
    Write-Host "✗ Virtual environment not found. Run setup first:" -ForegroundColor Red
    Write-Host "  python -m venv venv" -ForegroundColor Yellow
    Write-Host "  .\venv\Scripts\Activate.ps1" -ForegroundColor Yellow
    Write-Host "  pip install -r requirements.txt" -ForegroundColor Yellow
    exit 1
}

# Activate venv
Write-Host "Activating virtual environment..." -ForegroundColor Green
& ".\venv\Scripts\Activate.ps1"

Write-Host ""
Write-Host "Step 1: Label 100 images with LM Studio" -ForegroundColor Yellow
Write-Host "  Make sure LM Studio is running with a vision model loaded!" -ForegroundColor Cyan
Write-Host ""
Write-Host "Recommended models:" -ForegroundColor White
Write-Host "  • llava-v1.6-mistral-7b  (RECOMMENDED - Stable, fast, good quality)" -ForegroundColor Green
Write-Host "  • qwen/qwen3-vl-4b       (Very fast, excellent stability)" -ForegroundColor Green
Write-Host "  • llava-v1.6-34b         (Best quality but may crash)" -ForegroundColor Yellow
Write-Host ""
Write-Host "The model name should match what you see in LM Studio's model list." -ForegroundColor Cyan
Write-Host "Example: 'llava-v1.6-34b-Q4_K_M' or 'llama-3.2-vision-11b'" -ForegroundColor Cyan
Write-Host ""

# Prompt for model name
$modelName = Read-Host "Enter the model name from LM Studio (or press Enter for 'llava-v1.6-mistral-7b')"
if ([string]::IsNullOrWhiteSpace($modelName)) {
    $modelName = "llava-v1.6-mistral-7b"
}
Write-Host ""
Write-Host "Using model: $modelName" -ForegroundColor Green
Write-Host "LM Studio API: http://127.0.0.1:1234" -ForegroundColor Green
Write-Host ""
Read-Host "Press Enter when LM Studio is ready with this model loaded (or Ctrl+C to cancel)"

python training/label_with_lmstudio.py `
    --input data/raw `
    --output data/labeled `
    --max-images 100 `
    --model "$modelName" `
    --base-url "http://127.0.0.1:1234/v1"

if ($LASTEXITCODE -ne 0) {
    Write-Host "✗ Labeling failed. Check LM Studio connection." -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "Step 2: Validate label quality" -ForegroundColor Yellow
python training/validate_labels.py `
    --labels data/labeled/labels.jsonl `
    --output-dir validation `
    --plot `
    --suggest-review 20

Write-Host ""
Write-Host "Step 3: Open GUI review tool" -ForegroundColor Yellow
Write-Host "  Review suggested images and make corrections" -ForegroundColor Cyan
Write-Host ""
Write-Host "Starting GUI..." -ForegroundColor Green

python review_labels.py `
    --labels data/labeled/labels.jsonl `
    --input validation/review_list.txt

Write-Host ""
Write-Host "==================================================" -ForegroundColor Cyan
Write-Host "✓ Validation Complete!" -ForegroundColor Green
Write-Host "==================================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Yellow
Write-Host "  1. If quality looks good (>85% accuracy):" -ForegroundColor White
Write-Host "     python training/label_with_lmstudio.py --max-images 20000" -ForegroundColor Cyan
Write-Host ""
Write-Host "  2. If quality needs improvement:" -ForegroundColor White
Write-Host "     - Try a larger model (llava-v1.6-34b)" -ForegroundColor Cyan
Write-Host "     - Increase confidence threshold (--confidence 0.9)" -ForegroundColor Cyan
Write-Host "     - Review more samples and adjust" -ForegroundColor Cyan
Write-Host ""
Write-Host "  3. Use corrected labels for training:" -ForegroundColor White
Write-Host "     python training/dataset.py --labels data/labeled/labels_corrected.jsonl" -ForegroundColor Cyan
Write-Host ""
