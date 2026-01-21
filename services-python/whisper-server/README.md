# Whisper STT Server

Flask server providing OpenAI Whisper speech-to-text API for local development.

## Quick Start

**Easiest Method** (recommended):
```cmd
start-server.bat
```

This automatically handles virtual environment and starts the server in a new window.

**Alternative Methods**:
- PowerShell script: `.\start-whisper.ps1`
- Manual: `.\venv\Scripts\python.exe server.py`

**Related Documentation**:
- [Voice Development Setup Guide](../../../docs/VOICE-DEV-SETUP.md)
- [Voice Configuration Guide](../../../docs/VOICE-CONFIGURATION.md)

---

## Detailed Setup

### 1. Create Virtual Environment
```bash
python -m venv venv

# Windows
venv\Scripts\activate

# macOS/Linux
source venv/bin/activate
```

### 2. Install Dependencies
```bash
pip install -r requirements.txt
```

**Note**: First install may take 10-15 minutes as it downloads Whisper models.

### 3. Start Server
```bash
python server.py
```

Server runs on **http://localhost:8000**

## API Endpoints

### GET /health
Health check endpoint.

**Response**:
```json
{
  "status": "healthy",
  "model": "base",
  "version": "20231117"
}
```

### POST /transcribe
Transcribe audio to text.

**Request**:
```json
{
  "audio_data": "<base64-encoded-audio>",
  "encoding": "WEBM_OPUS",
  "sample_rate": 16000,
  "language": "en",
  "model": "base"
}
```

**Response**:
```json
{
  "text": "transcribed text here",
  "confidence": 0.95,
  "duration_ms": 2500,
  "language": "en"
}
```

## Whisper Models

| Model | Size | Speed | Accuracy |
|-------|------|-------|----------|
| tiny  | 39M  | Very Fast | Basic |
| base  | 74M  | Fast | Good (recommended) |
| small | 244M | Medium | Better |
| medium| 769M | Slow | High |
| large | 1550M| Very Slow | Best |

Change model via environment variable:
```bash
WHISPER_MODEL=small python server.py
```

## Testing

```bash
# Health check
curl http://localhost:8000/health

# Transcribe (requires base64 audio)
curl -X POST http://localhost:8000/transcribe \
  -H "Content-Type: application/json" \
  -d '{"audio_data": "<base64>", "language": "en"}'
```

## Troubleshooting

**Issue**: Slow transcription
- Use smaller model (tiny or base)
- Check CPU usage

**Issue**: Import errors
- Ensure virtual environment is activated
- Reinstall: `pip install -r requirements.txt`

**Issue**: Port already in use
- Change port: `PORT=8001 python server.py`
