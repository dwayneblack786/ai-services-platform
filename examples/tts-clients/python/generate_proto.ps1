# Generate Python gRPC code from proto file (PowerShell)

$PROTO_DIR = "..\..\..\services-java\va-service\src\main\proto"
$PROTO_FILE = "voice_service.proto"
$OUTPUT_DIR = "generated"

Write-Host "=== Generating Python gRPC Code ===" -ForegroundColor Cyan
Write-Host "Proto file: $PROTO_DIR\$PROTO_FILE"
Write-Host "Output dir: $OUTPUT_DIR"
Write-Host ""

# Create output directory
New-Item -ItemType Directory -Force -Path $OUTPUT_DIR | Out-Null

# Generate Python code
python -m grpc_tools.protoc `
  -I $PROTO_DIR `
  --python_out=$OUTPUT_DIR `
  --grpc_python_out=$OUTPUT_DIR `
  "$PROTO_DIR\$PROTO_FILE"

if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ Code generation successful!" -ForegroundColor Green
    Write-Host "Generated files:"
    Get-ChildItem $OUTPUT_DIR\*.py
} else {
    Write-Host "❌ Code generation failed" -ForegroundColor Red
    exit 1
}
