#!/usr/bin/env pwsh
<#
.SYNOPSIS
    Kills all processes using development ports for AI Services Platform

.DESCRIPTION
    This script frees up all ports used by the development environment:
    - 5000: Node.js Backend API
    - 5173: Vite Frontend Dev Server
    - 8136: Java VA Service
    - 50051: gRPC VA Service
    - 50052: gRPC CV Service
    - 50053: gRPC IDP Service
    - 27017: MongoDB (optional)
    - 6379: Redis (optional)

.PARAMETER IncludeDatabase
    Also kill MongoDB and Redis processes

.EXAMPLE
    .\kill-dev-ports.ps1
    Kills all application ports

.EXAMPLE
    .\kill-dev-ports.ps1 -IncludeDatabase
    Kills all ports including MongoDB and Redis
#>

param(
    [switch]$IncludeDatabase = $false
)

# Development ports
$appPorts = @(
    @{ Port = 5000;  Name = "Node.js Backend" },
    @{ Port = 5173;  Name = "Vite Frontend" },
    @{ Port = 8136;  Name = "Java VA Service" },
    @{ Port = 50051; Name = "gRPC VA Service" },
    @{ Port = 50052; Name = "gRPC CV Service" },
    @{ Port = 50053; Name = "gRPC IDP Service" }
)

# Database ports (optional)
$dbPorts = @(
    @{ Port = 27017; Name = "MongoDB" },
    @{ Port = 6379;  Name = "Redis" }
)

# Combine ports based on parameter
$portsToKill = $appPorts
if ($IncludeDatabase) {
    $portsToKill += $dbPorts
}

Write-Host "`n🔍 Checking for processes on development ports...`n" -ForegroundColor Cyan

$killedCount = 0
$notFoundCount = 0

foreach ($portInfo in $portsToKill) {
    $port = $portInfo.Port
    $name = $portInfo.Name
    
    try {
        # Check if port is in use
        $connection = Get-NetTCPConnection -LocalPort $port -ErrorAction SilentlyContinue
        
        if ($connection) {
            $processId = $connection.OwningProcess | Select-Object -First 1
            $process = Get-Process -Id $processId -ErrorAction SilentlyContinue
            
            if ($process) {
                Write-Host "  🔴 Port $port ($name) - PID $processId ($($process.ProcessName))" -ForegroundColor Yellow
                
                try {
                    Stop-Process -Id $processId -Force -ErrorAction Stop
                    Write-Host "     ✅ Killed successfully" -ForegroundColor Green
                    $killedCount++
                    
                    # Wait a moment for port to be released
                    Start-Sleep -Milliseconds 500
                } catch {
                    Write-Host "     ❌ Failed to kill: $_" -ForegroundColor Red
                }
            } else {
                Write-Host "  ⚠️  Port $port ($name) - Process not accessible" -ForegroundColor Yellow
            }
        } else {
            Write-Host "  ✓ Port $port ($name) - Free" -ForegroundColor DarkGray
            $notFoundCount++
        }
    } catch {
        Write-Host "  ⚠️  Port $port ($name) - Error checking: $_" -ForegroundColor Yellow
    }
}

# Summary
Write-Host "`n" -NoNewline
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor DarkGray
Write-Host "`n📊 Summary:" -ForegroundColor Cyan
Write-Host "   Processes killed: $killedCount" -ForegroundColor $(if ($killedCount -gt 0) { "Green" } else { "DarkGray" })
Write-Host "   Ports already free: $notFoundCount" -ForegroundColor DarkGray
Write-Host "   Total ports checked: $($portsToKill.Count)" -ForegroundColor White

# Verify critical ports are now free
Write-Host "`n🔍 Verifying critical ports...`n" -ForegroundColor Cyan

$criticalPorts = @(5000, 5173, 8136)
$allFree = $true

foreach ($port in $criticalPorts) {
    $connection = Get-NetTCPConnection -LocalPort $port -ErrorAction SilentlyContinue
    if ($connection) {
        Write-Host "  ⚠️  Port $port still in use!" -ForegroundColor Red
        $allFree = $false
    } else {
        Write-Host "  ✓ Port $port is free" -ForegroundColor Green
    }
}

Write-Host ""
if ($allFree) {
    Write-Host "✅ All critical ports are free! Ready to start development servers." -ForegroundColor Green
} else {
    Write-Host "⚠️  Some ports are still in use. You may need to manually kill processes or wait a moment." -ForegroundColor Yellow
    Write-Host "   Run this script again in a few seconds if needed." -ForegroundColor Gray
}

Write-Host ""
