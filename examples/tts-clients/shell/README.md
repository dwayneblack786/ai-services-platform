# grpcurl Commands for TTS Testing

This directory contains shell scripts for testing TTS gRPC endpoints using `grpcurl`.

## Prerequisites

Install `grpcurl`:

**Windows**:
```powershell
choco install grpcurl
```

**Mac**:
```bash
brew install grpcurl
```

**Linux**:
```bash
# Download from https://github.com/fullstorydev/grpcurl/releases
wget https://github.com/fullstorydev/grpcurl/releases/download/v1.8.9/grpcurl_1.8.9_linux_x86_64.tar.gz
tar -xvf grpcurl_1.8.9_linux_x86_64.tar.gz
sudo mv grpcurl /usr/local/bin/
```

## Usage

### PowerShell (Windows)

```powershell
# Basic test
.\test-synthesize.ps1

# Custom text
.\test-synthesize.ps1 "Your custom text here"

# Custom host
.\test-synthesize.ps1 -Text "Hello" -Host "yourserver:50051"
```

### Bash (Linux/Mac)

```bash
# Basic test
./test-synthesize.sh

# Custom text
./test-synthesize.sh "Your custom text here"

# Custom host
./test-synthesize.sh "Hello" "yourserver:50051"
```

## Manual grpcurl Commands

### List Services

```bash
grpcurl -plaintext localhost:50051 list
```

**Output**:
```
com.ai.va.grpc.HealthService
com.ai.va.grpc.VoiceService
grpc.health.v1.Health
grpc.reflection.v1alpha.ServerReflection
```

### List VoiceService Methods

```bash
grpcurl -plaintext localhost:50051 list com.ai.va.grpc.VoiceService
```

**Output**:
```
com.ai.va.grpc.VoiceService.EndSession
com.ai.va.grpc.VoiceService.StreamVoiceConversation
com.ai.va.grpc.VoiceService.Synthesize
com.ai.va.grpc.VoiceService.SynthesizeStream
com.ai.va.grpc.VoiceService.Transcribe
com.ai.va.grpc.VoiceService.TranscribeStream
```

### Describe Synthesize Method

```bash
grpcurl -plaintext localhost:50051 describe com.ai.va.grpc.VoiceService.Synthesize
```

**Output**:
```
com.ai.va.grpc.VoiceService.Synthesize is a method:
rpc Synthesize ( .com.ai.va.grpc.SynthesisRequest ) returns ( .com.ai.va.grpc.AudioResponse );
```

### Call Synthesize

```bash
grpcurl -plaintext \
  -d '{
    "session_id": "test-session",
    "text": "Hello, this is a test",
    "language": "en-US",
    "voice_name": "en-US-JennyNeural",
    "format": "mp3",
    "customer_id": "test-customer"
  }' \
  localhost:50051 \
  com.ai.va.grpc.VoiceService/Synthesize
```

### Test Different Voices

**JennyNeural** (friendly, female):
```bash
grpcurl -plaintext -d '{
  "session_id": "test-jenny",
  "text": "Hello from JennyNeural",
  "language": "en-US",
  "voice_name": "en-US-JennyNeural"
}' localhost:50051 com.ai.va.grpc.VoiceService/Synthesize
```

**GuyNeural** (professional, male):
```bash
grpcurl -plaintext -d '{
  "session_id": "test-guy",
  "text": "Hello from GuyNeural",
  "language": "en-US",
  "voice_name": "en-US-GuyNeural"
}' localhost:50051 com.ai.va.grpc.VoiceService/Synthesize
```

**AriaNeural** (conversational, female):
```bash
grpcurl -plaintext -d '{
  "session_id": "test-aria",
  "text": "Hello from AriaNeural",
  "language": "en-US",
  "voice_name": "en-US-AriaNeural"
}' localhost:50051 com.ai.va.grpc.VoiceService/Synthesize
```

### Test Spanish Voice

```bash
grpcurl -plaintext -d '{
  "session_id": "test-spanish",
  "text": "Hola, esta es una prueba",
  "language": "es-ES",
  "voice_name": "es-ES-ElviraNeural"
}' localhost:50051 com.ai.va.grpc.VoiceService/Synthesize
```

### Health Check

```bash
grpcurl -plaintext \
  -d '{"service": "VoiceService"}' \
  localhost:50051 \
  com.ai.va.grpc.HealthService/Check
```

## Output Format

The response is JSON with base64-encoded audio:

```json
{
  "session_id": "test-session",
  "audio_data": "base64_encoded_audio_bytes_here...",
  "format": "mp3",
  "metadata": {
    "voice_name": "en-US-JennyNeural",
    "language": "en-US",
    "duration_ms": "2500",
    "sample_rate": 24000,
    "bitrate": 48,
    "provider": "AzureTTS",
    "processing_time_ms": "1234",
    "success": true
  }
}
```

## Limitations

**Note**: `grpcurl` is useful for testing but has limitations:
- Audio data is base64-encoded in JSON (not saved directly)
- Streaming RPCs are difficult to test
- Better to use proper clients (Node.js, Python, Java) for real usage

## Troubleshooting

### "connection refused"

**Issue**: va-service not running

**Solution**:
```bash
cd ../../services-java/va-service
.\mvnw.cmd spring-boot:run -Dspring-boot.run.profiles=dev
```

### "method not found"

**Issue**: gRPC reflection not enabled or proto mismatch

**Solution**: Verify service is running and accepting connections:
```bash
grpcurl -plaintext localhost:50051 list
```

### "UNAUTHENTICATED"

**Issue**: Azure Speech key not configured (prod mode)

**Solution**: Use dev profile (mock TTS):
```bash
.\mvnw.cmd spring-boot:run -Dspring-boot.run.profiles=dev
```

## See Also

- [Full TTS Documentation](../../../docs/PHASE-4-COMPLETE.md)
- [Node.js Client Example](../nodejs/tts-client.ts)
- [Python Client Example](../python/tts_client.py)
- [Java Client Example](../java/TtsGrpcClient.java)
