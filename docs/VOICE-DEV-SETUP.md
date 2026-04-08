# Voice Development Setup Guide

Step-by-step guide to set up the voice AI development environment with Whisper STT for local development.

**Related Documentation**:
- [Voice Configuration Guide](./VOICE-CONFIGURATION.md) - Configuration reference
- [Phase 1 Summary](./archive/PHASE-1-SUMMARY.md) - Quick overview
- [STT/TTS Implementation Plan](./STT-TTS-IMPLEMENTATION-PLAN.md) - Full roadmap

## Table of Contents
- [Prerequisites](#prerequisites)
- [Python Whisper Server Setup](#python-whisper-server-setup)
- [Java Service Configuration](#java-service-configuration)
- [Node.js Backend Setup](#nodejs-backend-setup)
- [React Frontend Setup](#react-frontend-setup)
- [Running the Stack](#running-the-stack)
- [Testing Voice Flow](#testing-voice-flow)
- [Troubleshooting](#troubleshooting)

---

## Prerequisites

### Required Software

| Software | Version | Purpose |
|----------|---------|---------|
| Python | 3.9+ | Whisper STT server |
| Node.js | 18+ | Backend and frontend |
| Java | 17+ | Voice assistant service |
| Maven | 3.8+ | Java build tool |
| MongoDB | 6.0+ | Database |

### Optional Tools
- **LM Studio**: Local LLM for development (recommended)
- **Postman**: API testing
- **grpcurl**: gRPC testing

---

## Python Whisper Server Setup

### Step 1: Create Project Structure

```bash
cd ai-services-platform
mkdir -p services-python/whisper-server
cd services-python/whisper-server
```

### Step 2: Create Virtual Environment

```bash
# Windows
python -m venv venv
venv\Scripts\activate

# macOS/Linux
python3 -m venv venv
source venv/bin/activate
```

### Step 3: Install Dependencies

Create `requirements.txt`:
```txt
flask==3.0.0
flask-cors==4.0.0
openai-whisper==20231117
torch==2.1.0
torchaudio==2.1.0
numpy==1.24.0
```

Install:
```bash
pip install -r requirements.txt
```

**Note**: First install may take 10-15 minutes (downloading models).

### Step 4: Create Server File

Create `server.py`:
```python
from flask import Flask, request, jsonify
from flask_cors import CORS
import whisper
import base64
import io
import numpy as np
import tempfile
import os
import logging

app = Flask(__name__)
CORS(app)

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Load Whisper model (base recommended for dev)
MODEL_NAME = os.getenv('WHISPER_MODEL', 'base')
logger.info(f"Loading Whisper model: {MODEL_NAME}")
model = whisper.load_model(MODEL_NAME)
logger.info("Whisper model loaded successfully")

@app.route('/health', methods=['GET'])
def health():
    """Health check endpoint"""
    return jsonify({
        'status': 'healthy',
        'model': MODEL_NAME,
        'version': whisper.__version__
    }), 200

@app.route('/transcribe', methods=['POST'])
def transcribe():
    """
    Transcribe audio to text.
    
    Request JSON:
    {
        "audio_data": "<base64-encoded-audio>",
        "encoding": "WEBM_OPUS",
        "sample_rate": 16000,
        "language": "en",
        "model": "base"
    }
    
    Response JSON:
    {
        "text": "transcribed text",
        "confidence": 0.95,
        "duration_ms": 2500,
        "language": "en"
    }
    """
    try:
        data = request.get_json()
        
        if not data or 'audio_data' not in data:
            return jsonify({'error': 'Missing audio_data'}), 400
        
        # Decode base64 audio
        audio_base64 = data['audio_data']
        audio_bytes = base64.b64decode(audio_base64)
        
        # Save to temporary file (Whisper needs file input)
        with tempfile.NamedTemporaryFile(suffix='.webm', delete=False) as temp_audio:
            temp_audio.write(audio_bytes)
            temp_path = temp_audio.name
        
        try:
            # Transcribe
            language = data.get('language', 'en')
            
            logger.info(f"Transcribing audio: {len(audio_bytes)} bytes, language: {language}")
            
            result = model.transcribe(
                temp_path,
                language=language,
                fp16=False  # CPU compatibility
            )
            
            text = result['text'].strip()
            
            # Calculate confidence (average of segment probabilities)
            segments = result.get('segments', [])
            if segments:
                avg_confidence = sum(seg.get('no_speech_prob', 0) for seg in segments) / len(segments)
                confidence = 1.0 - avg_confidence
            else:
                confidence = 0.95  # Default
            
            logger.info(f"Transcription successful: '{text[:50]}...'")
            
            return jsonify({
                'text': text,
                'confidence': round(confidence, 2),
                'duration_ms': int(result.get('duration', 0) * 1000),
                'language': result.get('language', language)
            }), 200
            
        finally:
            # Clean up temp file
            if os.path.exists(temp_path):
                os.unlink(temp_path)
    
    except Exception as e:
        logger.error(f"Transcription error: {str(e)}", exc_info=True)
        return jsonify({'error': str(e)}), 500

if __name__ == '__main__':
    port = int(os.getenv('PORT', 8000))
    app.run(host='0.0.0.0', port=port, debug=True)
```

### Step 5: Create Dockerfile (Optional)

Create `Dockerfile`:
```dockerfile
FROM python:3.9-slim

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y \
    ffmpeg \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements and install
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy server code
COPY server.py .

# Expose port
EXPOSE 8000

# Run server
CMD ["python", "server.py"]
```

### Step 6: Start Whisper Server

**Option 1 - Batch File (Easiest - Recommended)**:
```cmd
cd services-python\whisper-server
start-server.bat
```

**Option 2 - PowerShell Script**:
```powershell
cd services-python/whisper-server
.\start-whisper.ps1
```

**Option 3 - Manual**:
```bash
cd services-python/whisper-server
.\venv\Scripts\python.exe server.py
```

A new window will open showing the server loading the model (~15 seconds).

### Step 7: Test Whisper Server

Test health endpoint:
```bash
curl http://localhost:8000/health
```

Expected response:
```json
{
  "status": "healthy",
  "model": "base",
  "version": "20250625"
}
```

---

## Java Service Configuration

### Step 1: Add Maven Dependencies

Edit `services-java/va-service/pom.xml`, add Azure Speech SDK:

```xml
<!-- Azure Cognitive Services Speech SDK -->
<dependency>
    <groupId>com.microsoft.cognitiveservices.speech</groupId>
    <artifactId>client-sdk</artifactId>
    <version>1.34.0</version>
</dependency>

<!-- Jackson for JSON processing -->
<dependency>
    <groupId>com.fasterxml.jackson.core</groupId>
    <artifactId>jackson-databind</artifactId>
</dependency>
```

### Step 2: Configure Development Profile

File already configured in Phase 1. Verify `application-dev.properties`:

```properties
stt.provider=whisper
stt.whisper.url=http://localhost:8000
stt.whisper.model=base
```

### Step 3: Build Java Service

```bash
cd services-java/va-service
./mvnw clean install
```

Expected output: `BUILD SUCCESS`

### Step 4: Run Java Service

```bash
./mvnw spring-boot:run -Dspring-boot.run.profiles=dev
```

Verify startup:
- Port 8136 (HTTP)
- Port 50051 (gRPC)
- Logs show: "Initialized WhisperSttService"

---

## Node.js Backend Setup

### Step 1: Install Dependencies

```bash
cd backend-node
npm install
```

### Step 2: Configure Environment

Create `.env` (if not exists):
```env
PORT=5000
NODE_ENV=development
SESSION_SECRET=your-secret-key

# MongoDB
MONGODB_URI=mongodb://localhost:27017/ai_platform_dev

# Google OAuth (optional for now)
GOOGLE_CLIENT_ID=your-client-id
GOOGLE_CLIENT_SECRET=your-client-secret

# Java Service
JAVA_SERVICE_URL=http://localhost:8136
GRPC_SERVICE_URL=localhost:50051
```

### Step 3: Start Node Backend

```bash
npm run dev
```

Verify:
- Port 5000 running
- WebSocket server initialized
- Connected to MongoDB

---

## React Frontend Setup

### Step 1: Install Dependencies

```bash
cd frontend
npm install
```

### Step 2: Configure Environment

Create `.env` (if not exists):
```env
VITE_API_URL=http://localhost:5000
VITE_WS_URL=ws://localhost:5000
```

### Step 3: Start React Dev Server

```bash
npm run dev
```

Verify:
- Port 5173 running
- Opens in browser automatically

---

## Running the Stack

### Full Stack Startup Script

Create `start-dev.ps1` in project root:

```powershell
# Start Development Stack for Voice AI

Write-Host "Starting AI Services Platform - Development Mode" -ForegroundColor Cyan

# Start MongoDB
Write-Host "`n[1/5] Starting MongoDB..." -ForegroundColor Yellow
Start-Process "mongod" -ArgumentList "--dbpath", "C:\data\db"
Start-Sleep 3

# Start Python Whisper Server
Write-Host "`n[2/5] Starting Whisper Server..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd services-python\whisper-server; venv\Scripts\activate; python server.py"
Start-Sleep 5

# Start Java VA Service
Write-Host "`n[3/5] Starting Java VA Service..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd services-java\va-service; .\mvnw spring-boot:run -Dspring-boot.run.profiles=dev"
Start-Sleep 10

# Start Node Backend
Write-Host "`n[4/5] Starting Node.js Backend..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd backend-node; npm run dev"
Start-Sleep 5

# Start React Frontend
Write-Host "`n[5/5] Starting React Frontend..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd frontend; npm run dev"

Write-Host "`nAll services started!" -ForegroundColor Green
Write-Host "Frontend: http://localhost:5173" -ForegroundColor Cyan
Write-Host "Backend: http://localhost:5000" -ForegroundColor Cyan
Write-Host "Java VA: http://localhost:8136" -ForegroundColor Cyan
Write-Host "Whisper: http://localhost:8000" -ForegroundColor Cyan
```

Run:
```powershell
.\start-dev.ps1
```

---

## Testing Voice Flow

### Manual Test Flow

1. **Open Frontend**: http://localhost:5173
2. **Login** (if OAuth configured, or use test mode)
3. **Open Assistant Chat**
4. **Click Microphone Button** (turns red)
5. **Speak**: "Hello, how are you?"
6. **Click Microphone Again** (stops recording)
7. **Verify**:
   - Audio sent to backend (check Network tab)
   - Backend forwards to Java (check logs)
   - Java calls Whisper (check Whisper logs)
   - Transcription appears in chat

### Test with curl

Test Whisper directly:
```bash
# Record audio and convert to base64
# For testing, use online tool: https://base64.guru/converter/encode/audio

curl -X POST http://localhost:8000/transcribe \
  -H "Content-Type: application/json" \
  -d '{
    "audio_data": "<base64-audio>",
    "encoding": "WEBM_OPUS",
    "sample_rate": 16000,
    "language": "en"
  }'
```

### Check Logs

**Whisper Server**:
```
INFO:__main__:Transcribing audio: 15234 bytes, language: en
INFO:__main__:Transcription successful: 'Hello, how are you?'
```

**Java Service**:
```
DEBUG c.a.v.s.s.WhisperSttService : Sending audio to Whisper server. SessionId: abc123, Size: 15234 bytes
INFO  c.a.v.s.s.WhisperSttService : Whisper transcription successful. SessionId: abc123, Text length: 19, Processing time: 1245ms
```

**Node Backend**:
```
[voice-socket] Received audio chunk: 15234 bytes for session abc123
[voice-socket] Voice recording ended for session abc123
```

---

## Troubleshooting

### Issue: Whisper server won't start

**Error**: `ModuleNotFoundError: No module named 'whisper'`

**Solution**:
```bash
# Activate virtual environment
cd services-python/whisper-server
venv\Scripts\activate  # Windows
source venv/bin/activate  # macOS/Linux

# Reinstall dependencies
pip install -r requirements.txt
```

---

### Issue: Java service can't connect to Whisper

**Error**: `Connection refused to localhost:8000`

**Solution**:
1. Verify Whisper is running:
   ```bash
   curl http://localhost:8000/health
   ```

2. Check firewall settings

3. Verify port 8000 not in use:
   ```bash
   netstat -ano | findstr :8000
   ```

---

### Issue: No audio from browser

**Error**: `getUserMedia() failed`

**Solution**:
1. Grant microphone permissions in browser
2. Use HTTPS (or localhost exception)
3. Check browser console for errors

---

### Issue: Slow transcription

**Symptoms**: >5 seconds to transcribe short audio

**Solutions**:
1. Use smaller Whisper model:
   ```bash
   # In server.py or .env
   WHISPER_MODEL=tiny python server.py
   ```

2. Reduce audio quality in frontend:
   ```typescript
   audioBitsPerSecond: 12000  // Lower bitrate
   ```

3. Check CPU usage (Whisper is CPU-intensive)

---

### Issue: MongoDB connection failed

**Error**: `MongoNetworkError: connect ECONNREFUSED 127.0.0.1:27017`

**Solution**:
```bash
# Windows
net start MongoDB

# macOS/Linux
sudo systemctl start mongod

# Or run manually
mongod --dbpath /data/db
```

---

## Development Workflow

### Daily Startup
```bash
# Option 1: Use startup script
.\start-dev.ps1

# Option 2: Manual (recommended for debugging)
# Terminal 1: MongoDB
mongod

# Terminal 2: Whisper (use batch file)
cd services-python/whisper-server
start-server.bat

# Terminal 3: Java
cd services-java/va-service
./mvnw spring-boot:run -Dspring-boot.run.profiles=dev

# Terminal 4: Node
cd backend-node
npm run dev

# Terminal 5: React
cd frontend
npm run dev
```

### Testing Changes

**After modifying STT code**:
```bash
# Restart Java service
Ctrl+C  # Stop current
./mvnw spring-boot:run -Dspring-boot.run.profiles=dev
```

**After modifying Whisper server**:
```bash
# Restart Python server
Ctrl+C
python server.py
```

**After frontend changes**:
- Vite hot-reloads automatically

---

## Next Steps

1. ✅ **Phase 1 Complete**: STT module foundation
2. **Phase 2**: MongoDB transcript storage
3. **Phase 3**: gRPC voice service integration
4. **Phase 4**: TTS module
5. **Phase 5**: Node backend integration
6. **Phase 6**: Frontend voice UI
7. **Phase 7**: End-to-end testing
8. **Phase 8**: Production deployment

See [STT-TTS-IMPLEMENTATION-PLAN.md](./STT-TTS-IMPLEMENTATION-PLAN.md) for full roadmap.

---

## Quick Reference

| Service | URL | Purpose |
|---------|-----|---------|
| Frontend | http://localhost:5173 | React UI |
| Node Backend | http://localhost:5000 | API & WebSocket |
| Java VA Service | http://localhost:8136 | AI Agent |
| Whisper Server | http://localhost:8000 | STT |
| MongoDB | mongodb://localhost:27017 | Database |
| gRPC | localhost:50051 | Java ↔ Node |

**Health Checks**:
```bash
curl http://localhost:8000/health    # Whisper
curl http://localhost:8136/actuator/health  # Java
curl http://localhost:5000/health    # Node (if endpoint exists)
```

---

**Last Updated**: Phase 1 - STT Module Foundation  
**Version**: 1.0.0
