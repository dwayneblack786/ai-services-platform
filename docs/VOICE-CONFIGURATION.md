# Voice Service Configuration Guide

Complete configuration reference for STT (Speech-to-Text) and TTS (Text-to-Speech) services in the AI Services Platform.

**Related Documentation**:
- [Voice Development Setup](./VOICE-DEV-SETUP.md) - Step-by-step setup guide
- [Phase 1 Summary](./PHASE-1-SUMMARY.md) - Quick reference
- [Voice Streaming Architecture](./VOICE-STREAMING.md) - Streaming details

## Table of Contents
- [Overview](#overview)
- [STT Configuration](#stt-configuration)
- [Environment Profiles](#environment-profiles)
- [Provider-Specific Settings](#provider-specific-settings)
- [Audio Format Settings](#audio-format-settings)
- [Performance Tuning](#performance-tuning)
- [Troubleshooting](#troubleshooting)

---

## Overview

The voice service supports multiple STT/TTS providers with automatic fallback:
- **Development**: Whisper (local Python server)
- **Production**: Azure Cognitive Services Speech

Configuration is profile-based:
- `application.properties` - Base configuration
- `application-dev.properties` - Development (Whisper)
- `application-prod.properties` - Production (Azure Speech)

---

## STT Configuration

### Basic Settings

```properties
# STT Provider Selection
stt.provider=whisper           # Options: whisper, azure

# Whisper Configuration (Development)
stt.whisper.url=http://localhost:8000
stt.whisper.model=base         # Options: tiny, base, small, medium, large

# Azure Speech Configuration (Production)
azure.speech.key=${AZURE_SPEECH_KEY}
azure.speech.region=${AZURE_SPEECH_REGION:eastus}
```

### Whisper Models

| Model | Size | Speed | Accuracy | Use Case |
|-------|------|-------|----------|----------|
| `tiny` | 39M | Very Fast | Basic | Quick testing |
| `base` | 74M | Fast | Good | **Recommended for dev** |
| `small` | 244M | Medium | Better | High accuracy dev |
| `medium` | 769M | Slow | High | Production-like testing |
| `large` | 1550M | Very Slow | Best | Research only |

**Recommendation**: Use `base` for development. It provides good accuracy with reasonable speed.

---

## Environment Profiles

### Development Profile (`application-dev.properties`)

```properties
# Activate with: --spring.profiles.active=dev

# STT - Whisper
stt.provider=whisper
stt.whisper.url=http://localhost:8000
stt.whisper.model=base

# MongoDB (Local)
mongodb.uri=mongodb://localhost:27017
mongodb.database=ai_platform_dev

# LLM (LM Studio)
api.endpoints.llm.provider=lm-studio
api.endpoints.llm.url=http://localhost:1234/v1/chat/completions
api.endpoints.llm.model=google/gemma-2-9b

# Debug Logging
logging.level.com.ai.va.service.stt=DEBUG
logging.level.com.ai.va.grpc=DEBUG
logging.debug.enabled=true
```

### Production Profile (`application-prod.properties`)

```properties
# Activate with: --spring.profiles.active=prod

# STT - Azure Speech
stt.provider=azure
azure.speech.key=${AZURE_SPEECH_KEY}
azure.speech.region=${AZURE_SPEECH_REGION:eastus}

# MongoDB (Atlas/Production)
mongodb.uri=${MONGODB_URI}
mongodb.database=ai_platform_prod

# LLM (Azure OpenAI)
api.endpoints.llm.provider=azure-openai
api.endpoints.llm.url=${AZURE_OPENAI_ENDPOINT}
api.endpoints.llm.model=gpt-4

# Production Logging
logging.level.com.ai.va.service.stt=INFO
logging.level.com.ai.va.grpc=INFO
logging.debug.enabled=false
```

---

## Provider-Specific Settings

### Whisper Provider

**Requirements**:
- Python 3.9+
- OpenAI Whisper installed
- Flask server running on port 8000

**Configuration**:
```properties
stt.provider=whisper
stt.whisper.url=http://localhost:8000
stt.whisper.model=base
```

**API Endpoint**: `POST http://localhost:8000/transcribe`

**Request Format**:
```json
{
  "audio_data": "<base64-encoded-audio>",
  "encoding": "WEBM_OPUS",
  "sample_rate": 16000,
  "language": "en",
  "model": "base"
}
```

**Response Format**:
```json
{
  "text": "transcribed text",
  "confidence": 0.95,
  "duration_ms": 2500,
  "language": "en"
}
```

**Setup**: See [VOICE-DEV-SETUP.md](./VOICE-DEV-SETUP.md)

---

### Azure Speech Provider

**Requirements**:
- Azure Cognitive Services subscription
- Speech service resource
- API key and region

**Configuration**:
```properties
stt.provider=azure
azure.speech.key=${AZURE_SPEECH_KEY}
azure.speech.region=eastus  # Your Azure region
```

**Supported Regions**:
- `eastus`, `westus`, `westus2`
- `westeurope`, `northeurope`
- `southeastasia`, `eastasia`
- Full list: https://learn.microsoft.com/azure/cognitive-services/speech-service/regions

**Languages Supported**: 100+ languages
- English: `en-US`, `en-GB`, `en-AU`
- Spanish: `es-ES`, `es-MX`
- French: `fr-FR`, `fr-CA`
- See full list: https://learn.microsoft.com/azure/cognitive-services/speech-service/language-support

**Environment Variables**:
```bash
# Required for production
export AZURE_SPEECH_KEY=your-key-here
export AZURE_SPEECH_REGION=eastus

# Optional
export AZURE_SPEECH_LANGUAGE=en-US
```

---

## Audio Format Settings

### Supported Formats

| Format | Encoding | Sample Rate | Channels | Use Case |
|--------|----------|-------------|----------|----------|
| WebM Opus | `WEBM_OPUS` | 16000 Hz | 1 | Web browser recording |
| PCM WAV | `LINEAR16` | 16000 Hz | 1 | High quality |
| μ-law | `MULAW` | 8000 Hz | 1 | Telephony |

### Default Configuration

```java
// In Java code
AudioFormat defaultFormat = new AudioFormat(
    "WEBM_OPUS",  // Browser-compatible
    16000,        // 16 kHz (speech optimized)
    1             // Mono
);
```

### Browser Recording Settings

```typescript
// In frontend (AssistantChat.tsx)
const mediaRecorder = new MediaRecorder(stream, {
  mimeType: 'audio/webm;codecs=opus',
  audioBitsPerSecond: 16000
});
```

**Recommendation**: Use WebM Opus at 16 kHz for web applications. It provides good quality with small file sizes.

---

## Performance Tuning

### Buffer Management

```properties
# Maximum audio buffer size per session (default: 10MB)
# Prevents memory exhaustion from long recordings
audio.buffer.max-size=10485760
```

**Java Configuration**:
```java
// In AudioBufferManager
private static final long MAX_BUFFER_SIZE = 10 * 1024 * 1024; // 10MB
```

### Timeouts

```properties
# API client timeout (milliseconds)
api.client.timeout=300000  # 5 minutes

# Agent execution timeout
agent.execution.timeout=30000  # 30 seconds (prod)
agent.execution.timeout=60000  # 60 seconds (dev)
```

### Connection Pooling

```properties
# For high-volume production
server.tomcat.max-threads=200
server.tomcat.max-connections=10000
```

---

## Troubleshooting

### Whisper Connection Issues

**Problem**: `Connection refused to localhost:8000`

**Solutions**:
1. Verify Whisper server is running:
   ```bash
   curl http://localhost:8000/health
   ```

2. Check Python server logs:
   ```bash
   cd services-python/whisper-server
   python server.py
   ```

3. Verify firewall allows port 8000

**Problem**: Slow transcription

**Solutions**:
- Use smaller Whisper model (`tiny` or `base`)
- Reduce audio chunk size
- Check CPU usage

---

### Azure Speech Issues

**Problem**: `401 Unauthorized`

**Solutions**:
1. Verify API key:
   ```bash
   echo $AZURE_SPEECH_KEY
   ```

2. Check key validity in Azure Portal

3. Verify region matches resource location

**Problem**: `429 Too Many Requests`

**Solutions**:
- Check Azure quotas
- Implement request throttling
- Upgrade service tier

---

### Audio Quality Issues

**Problem**: Poor transcription accuracy

**Solutions**:
1. Increase sample rate to 16 kHz (minimum)
2. Use mono audio (reduce noise)
3. Enable echo cancellation in browser:
   ```typescript
   const stream = await navigator.mediaDevices.getUserMedia({
     audio: {
       echoCancellation: true,
       noiseSuppression: true,
       autoGainControl: true
     }
   });
   ```

4. Check audio encoding matches configuration

**Problem**: Large audio files

**Solutions**:
- Use Opus codec (better compression)
- Reduce bitrate to 16 kbps
- Implement streaming (send chunks)

---

### Debug Logging

Enable detailed logging for troubleshooting:

```properties
# Development
logging.level.com.ai.va.service.stt=DEBUG
logging.level.com.ai.va.grpc=DEBUG
logging.level.org.springframework.web.client=DEBUG

# Production (minimal)
logging.level.com.ai.va.service.stt=INFO
logging.level.com.ai.va.grpc=WARN
```

**View logs**:
```bash
# Development
tail -f logs/application.log

# Production
kubectl logs -f <pod-name>
```

---

## Quick Reference

### Development (Whisper)
```bash
# Start Whisper server (easiest method)
cd services-python/whisper-server
start-server.bat

# OR using PowerShell script
cd services-python/whisper-server
.\start-whisper.ps1

# OR manual
cd services-python/whisper-server
.\venv\Scripts\python.exe server.py

# Run Java service
cd services-java/va-service
./mvnw spring-boot:run -Dspring-boot.run.profiles=dev
```

### Production (Azure Speech)
```bash
# Set environment variables
export AZURE_SPEECH_KEY=your-key
export AZURE_SPEECH_REGION=eastus

# Run Java service
./mvnw spring-boot:run -Dspring-boot.run.profiles=prod
```

### Health Checks
```bash
# Whisper
curl http://localhost:8000/health

# Java service
curl http://localhost:8136/actuator/health

# gRPC (use grpcurl)
grpcurl -plaintext localhost:50051 list
```

---

## Next Steps

1. **Setup Development**: Follow [VOICE-DEV-SETUP.md](./VOICE-DEV-SETUP.md)
2. **Implementation Plan**: See [STT-TTS-IMPLEMENTATION-PLAN.md](./STT-TTS-IMPLEMENTATION-PLAN.md)
3. **Voice Streaming**: See [VOICE-STREAMING.md](./VOICE-STREAMING.md)

---

**Last Updated**: Phase 1 - STT Module Foundation
**Version**: 1.0.0
