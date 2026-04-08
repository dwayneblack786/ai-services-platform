# Voice Streaming Test Script
# Run this in PowerShell to verify voice streaming is working

Write-Host "`n================================" -ForegroundColor Cyan
Write-Host "Voice Streaming Test Checklist" -ForegroundColor Cyan
Write-Host "================================`n" -ForegroundColor Cyan

# Test 1: Check if backend is running
Write-Host "[1] Testing Backend Server..." -ForegroundColor Yellow
try {
    $backend = Invoke-WebRequest -Uri "http://localhost:5000/health" -Method GET -TimeoutSec 5 -ErrorAction Stop
    Write-Host "    ✅ Backend is running on port 5000" -ForegroundColor Green
} catch {
    Write-Host "    ❌ Backend is NOT running" -ForegroundColor Red
    Write-Host "    Run: cd backend-node && npm run dev" -ForegroundColor Yellow
}

# Test 2: Check if frontend is running
Write-Host "`n[2] Testing Frontend Server..." -ForegroundColor Yellow
try {
    $frontend = Invoke-WebRequest -Uri "http://localhost:5173" -Method GET -TimeoutSec 5 -ErrorAction Stop
    Write-Host "    ✅ Frontend is running on port 5173" -ForegroundColor Green
} catch {
    Write-Host "    ❌ Frontend is NOT running" -ForegroundColor Red
    Write-Host "    Run: cd frontend && npm run dev" -ForegroundColor Yellow
}

# Test 3: Check voice socket file
Write-Host "`n[3] Checking Voice Socket File..." -ForegroundColor Yellow
$voiceSocketPath = "backend-node\src\sockets\voice-socket.ts"
if (Test-Path $voiceSocketPath) {
    Write-Host "    ✅ voice-socket.ts exists" -ForegroundColor Green
    
    # Check if it has the required handlers
    $content = Get-Content $voiceSocketPath -Raw
    if ($content -match "voice:start" -and $content -match "voice:chunk" -and $content -match "voice:end") {
        Write-Host "    ✅ All voice event handlers found" -ForegroundColor Green
    } else {
        Write-Host "    ⚠️  Missing some voice event handlers" -ForegroundColor Yellow
    }
} else {
    Write-Host "    ❌ voice-socket.ts not found" -ForegroundColor Red
}

# Test 4: Check socket.ts integration
Write-Host "`n[4] Checking Socket.IO Integration..." -ForegroundColor Yellow
$socketConfigPath = "backend-node\src\config\socket.ts"
if (Test-Path $socketConfigPath) {
    $content = Get-Content $socketConfigPath -Raw
    if ($content -match "setupVoiceHandlers") {
        Write-Host "    ✅ Voice handlers integrated in socket.ts" -ForegroundColor Green
    } else {
        Write-Host "    ❌ Voice handlers NOT integrated" -ForegroundColor Red
        Write-Host "    Add: setupVoiceHandlers(socket);" -ForegroundColor Yellow
    }
} else {
    Write-Host "    ❌ socket.ts not found" -ForegroundColor Red
}

# Test 5: Check AssistantChat.tsx
Write-Host "`n[5] Checking AssistantChat Component..." -ForegroundColor Yellow
$chatComponentPath = "frontend\src\components\AssistantChat.tsx"
if (Test-Path $chatComponentPath) {
    $content = Get-Content $chatComponentPath -Raw
    
    $checks = @(
        @{Name="isRecording state"; Pattern="isRecording"},
        @{Name="startVoiceRecording function"; Pattern="startVoiceRecording"},
        @{Name="MediaRecorder usage"; Pattern="MediaRecorder"},
        @{Name="voice:start event"; Pattern="voice:start"},
        @{Name="voice:chunk event"; Pattern="voice:chunk"}
    )
    
    foreach ($check in $checks) {
        if ($content -match $check.Pattern) {
            Write-Host "    ✅ $($check.Name)" -ForegroundColor Green
        } else {
            Write-Host "    ❌ $($check.Name) not found" -ForegroundColor Red
        }
    }
} else {
    Write-Host "    ❌ AssistantChat.tsx not found" -ForegroundColor Red
}

# Manual Testing Instructions
Write-Host "`n================================" -ForegroundColor Cyan
Write-Host "Manual Testing Steps" -ForegroundColor Cyan
Write-Host "================================`n" -ForegroundColor Cyan

Write-Host "1. Ensure both servers are running:" -ForegroundColor White
Write-Host "   Terminal 1: cd backend-node && npm run dev" -ForegroundColor Gray
Write-Host "   Terminal 2: cd frontend && npm run dev" -ForegroundColor Gray

Write-Host "`n2. Open browser to: http://localhost:5173" -ForegroundColor White

Write-Host "`n3. Log in and navigate to Assistant Chat" -ForegroundColor White

Write-Host "`n4. Click 'New Chat' to start a session" -ForegroundColor White

Write-Host "`n5. Look for microphone icon (🎤) next to textarea" -ForegroundColor White
Write-Host "   - Should be GREEN when idle" -ForegroundColor Gray
Write-Host "   - Should turn RED when recording" -ForegroundColor Gray

Write-Host "`n6. Click microphone and allow browser permission" -ForegroundColor White

Write-Host "`n7. Speak into microphone and check console logs:" -ForegroundColor White
Write-Host "   Frontend (F12): [Voice] Sent audio chunk: XXX bytes" -ForegroundColor Gray
Write-Host "   Backend (Terminal 1): [Voice] 📦 Chunk received..." -ForegroundColor Gray

Write-Host "`n8. Click stop button to end recording" -ForegroundColor White

Write-Host "`n================================" -ForegroundColor Cyan
Write-Host "Expected Console Output" -ForegroundColor Cyan
Write-Host "================================`n" -ForegroundColor Cyan

Write-Host "FRONTEND (Browser Console):" -ForegroundColor Yellow
Write-Host @"
[Voice] Started streaming for session: abc123...
[Voice] Sent audio chunk: 1024 bytes
[Voice] Sent audio chunk: 2048 bytes
[Voice] Recording stopped and cleaned up
"@ -ForegroundColor Gray

Write-Host "`nBACKEND (Terminal):" -ForegroundColor Yellow
Write-Host @"
[Voice] 🎤 Recording started for session: abc123...
[Voice] User: user@example.com
[Voice] ✅ Joined voice room: voice:abc123...
[Voice] 📦 Chunk received: { sessionId: 'abc123...', size: '1024 bytes', ... }
[Voice] 📦 Chunk received: { sessionId: 'abc123...', size: '2048 bytes', ... }
[Voice] 🛑 Recording stopped for session: abc123...
"@ -ForegroundColor Gray

Write-Host "`n================================" -ForegroundColor Cyan
Write-Host "Troubleshooting" -ForegroundColor Cyan
Write-Host "================================`n" -ForegroundColor Cyan

Write-Host "🔧 Microphone icon not visible?" -ForegroundColor Yellow
Write-Host "   - Check WebSocket connection status (should be 🟢)" -ForegroundColor Gray
Write-Host "   - Ensure session is initialized" -ForegroundColor Gray
Write-Host "   - Verify useWebSocket mode is enabled" -ForegroundColor Gray

Write-Host "`n🔧 Permission denied?" -ForegroundColor Yellow
Write-Host "   - Check browser microphone settings (🔒 icon in address bar)" -ForegroundColor Gray
Write-Host "   - Try using HTTPS" -ForegroundColor Gray
Write-Host "   - Check system microphone permissions" -ForegroundColor Gray

Write-Host "`n🔧 No chunks received?" -ForegroundColor Yellow
Write-Host "   - Verify WebSocket is connected" -ForegroundColor Gray
Write-Host "   - Check browser console for errors" -ForegroundColor Gray
Write-Host "   - Ensure setupVoiceHandlers is called" -ForegroundColor Gray
Write-Host "   - Restart both servers" -ForegroundColor Gray

Write-Host "`n================================" -ForegroundColor Cyan
Write-Host "For detailed documentation, see:" -ForegroundColor Cyan
Write-Host "docs/VOICE-STREAMING.md" -ForegroundColor Green
Write-Host "================================`n" -ForegroundColor Cyan

# Check if both servers need to be started
$backendRunning = $false
$frontendRunning = $false

try {
    Invoke-WebRequest -Uri "http://localhost:5000/health" -Method GET -TimeoutSec 2 -ErrorAction Stop | Out-Null
    $backendRunning = $true
} catch {}

try {
    Invoke-WebRequest -Uri "http://localhost:5173" -Method GET -TimeoutSec 2 -ErrorAction Stop | Out-Null
    $frontendRunning = $true
} catch {}

if (-not $backendRunning -or -not $frontendRunning) {
    Write-Host "`n🚀 Quick Start Commands:" -ForegroundColor Cyan
    Write-Host "================================`n" -ForegroundColor Cyan
    
    if (-not $backendRunning) {
        Write-Host "# Start Backend:" -ForegroundColor Yellow
        Write-Host "cd backend-node" -ForegroundColor White
        Write-Host "npm run dev`n" -ForegroundColor White
    }
    
    if (-not $frontendRunning) {
        Write-Host "# Start Frontend (in new terminal):" -ForegroundColor Yellow
        Write-Host "cd frontend" -ForegroundColor White
        Write-Host "npm run dev`n" -ForegroundColor White
    }
}

Write-Host "✅ Test script complete!" -ForegroundColor Green
Write-Host "Ready to test voice streaming!`n" -ForegroundColor Green
