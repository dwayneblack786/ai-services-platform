#!/usr/bin/env pwsh
# ============================================================================
# Quick Start Script for VA-Service
# ============================================================================
# This script provides a simple way to start the VA-Service server
# without needing to remember Maven commands or navigate directories.
#
# Usage: .\start-server.ps1 [options]
#
# Options:
#   -Debug     Start with remote debugging enabled on port 5005
#   -Clean     Clean build before starting
#   -Fast      Skip tests during build
# ============================================================================

param(
    [switch]$Debug,
    [switch]$Clean,
    [switch]$Fast,
    [switch]$Help
)

$VaServicePath = $PSScriptRoot

# Show help
if ($Help) {
    Write-Host "`n╔══════════════════════════════════════════════════════════════╗" -ForegroundColor Cyan
    Write-Host "║              VA-Service Quick Start Script                  ║" -ForegroundColor Cyan
    Write-Host "╚══════════════════════════════════════════════════════════════╝`n" -ForegroundColor Cyan
    
    Write-Host "Usage:" -ForegroundColor Yellow
    Write-Host "  .\start-server.ps1                 - Start server normally"
    Write-Host "  .\start-server.ps1 -Debug          - Start with debugging"
    Write-Host "  .\start-server.ps1 -Clean          - Clean build first"
    Write-Host "  .\start-server.ps1 -Fast           - Skip tests"
    Write-Host "  .\start-server.ps1 -Clean -Fast    - Clean and fast build"
    Write-Host ""
    Write-Host "Server URLs:" -ForegroundColor Yellow
    Write-Host "  HTTP API: http://localhost:8136"
    Write-Host "  gRPC:     localhost:50051"
    Write-Host "  Debug:    localhost:5005 (when -Debug is used)"
    Write-Host ""
    Write-Host "Common Endpoints:" -ForegroundColor Yellow
    Write-Host "  GET  /health          - Health check"
    Write-Host "  POST /chat/session    - Start chat session"
    Write-Host "  POST /voice/session   - Start voice session"
    Write-Host ""
    exit 0
}

# Change to va-service directory
Set-Location $VaServicePath

Write-Host "`n╔══════════════════════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║                  Starting VA-Service                        ║" -ForegroundColor Cyan
Write-Host "╚══════════════════════════════════════════════════════════════╝`n" -ForegroundColor Cyan

# Check if mvnw exists
if (-not (Test-Path ".\mvnw")) {
    Write-Host "❌ Error: Maven wrapper (mvnw) not found!" -ForegroundColor Red
    Write-Host "   Current directory: $PWD" -ForegroundColor Yellow
    Write-Host "   Expected: $VaServicePath" -ForegroundColor Yellow
    exit 1
}

# Build if Clean flag is set
if ($Clean) {
    Write-Host "🧹 Cleaning previous build..." -ForegroundColor Yellow
    .\mvnw clean
    
    if ($LASTEXITCODE -ne 0) {
        Write-Host "❌ Clean failed!" -ForegroundColor Red
        exit 1
    }
    
    Write-Host "🔨 Building project..." -ForegroundColor Yellow
    if ($Fast) {
        .\mvnw compile -DskipTests
    } else {
        .\mvnw compile
    }
    
    if ($LASTEXITCODE -ne 0) {
        Write-Host "❌ Build failed!" -ForegroundColor Red
        exit 1
    }
    
    Write-Host "✅ Build successful`n" -ForegroundColor Green
}

# Configure debug mode
if ($Debug) {
    Write-Host "🐛 Starting in DEBUG mode..." -ForegroundColor Yellow
    Write-Host "   Remote debug port: 5005" -ForegroundColor Cyan
    Write-Host "   Connect your IDE debugger to: localhost:5005`n" -ForegroundColor Cyan
    $env:MAVEN_OPTS = "-agentlib:jdwp=transport=dt_socket,server=y,suspend=n,address=*:5005"
} else {
    Write-Host "🚀 Starting VA-Service..." -ForegroundColor Green
}

# Display server information
Write-Host "📍 Server will be available at:" -ForegroundColor Cyan
Write-Host "   HTTP API: http://localhost:8136" -ForegroundColor White
Write-Host "   gRPC:     localhost:50051" -ForegroundColor White
Write-Host ""
Write-Host "💡 Press Ctrl+C to stop the server`n" -ForegroundColor Yellow
Write-Host "─────────────────────────────────────────────────────────────`n" -ForegroundColor DarkGray

# Start the server
.\mvnw spring-boot:run

# Check if server exited with error
if ($LASTEXITCODE -ne 0) {
    Write-Host "`n❌ Server exited with error code: $LASTEXITCODE" -ForegroundColor Red
    Write-Host "   Check the logs above for details" -ForegroundColor Yellow
    exit $LASTEXITCODE
}

Write-Host "`n✅ Server stopped gracefully" -ForegroundColor Green
