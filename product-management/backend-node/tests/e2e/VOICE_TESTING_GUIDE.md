# Voice Streaming E2E Testing Guide

Complete guide for testing voice streaming functionality end-to-end.

---

## Overview

The voice E2E test validates the complete voice workflow:
1. ✅ Load/generate audio input
2. ✅ Stream audio to Java service (STT)
3. ✅ Receive transcription
4. ✅ Get assistant response (via LLM)
5. ✅ Synthesize response audio (TTS)
6. ✅ Save audio response to file
7. ✅ Manually verify audio quality

---

## Prerequisites

### 1. Java VA Service Running
```bash
# Start Java service on port 50051
cd path/to/java-service
./gradlew bootRun
```

### 2. Required Services
- ✅ STT Service (Speech-to-Text)
- ✅ LLM Service (Assistant)
- ✅ TTS Service (Text-to-Speech)
- ✅ MongoDB
- ✅ Redis

### 3. Audio File
You need a sample audio file. Three options:

**Option A: Generate with script (recommended)**
```bash
cd tests/fixtures/audio
npx ts-node generate-sample.ts
```

**Option B: Use your own audio**
```bash
# Copy your WebM audio file to:
tests/fixtures/audio/sample-voice.webm
```

**Option C: Record with browser**
1. Open Chrome DevTools Console
2. Paste this code:
```javascript
navigator.mediaDevices.getUserMedia({ audio: true })
  .then(stream => {
    const recorder = new MediaRecorder(stream, { mimeType: 'audio/webm' });
    const chunks = [];

    recorder.ondataavailable = e => chunks.push(e.data);
    recorder.onstop = () => {
      const blob = new Blob(chunks, { type: 'audio/webm' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'sample-voice.webm';
      a.click();
    };

    recorder.start();
    console.log('Recording... Say: "Hello, how are you?"');

    setTimeout(() => {
      recorder.stop();
      stream.getTracks().forEach(t => t.stop());
      console.log('Recording stopped! Check downloads.');
    }, 3000);
  });
```
3. Say: "Hello, how are you today?"
4. Download will start automatically
5. Move file to `tests/fixtures/audio/sample-voice.webm`

---

## Running the Tests

### Run All E2E Voice Tests
```bash
npm test tests/e2e/voice-streaming.e2e.test.ts
```

### Run Specific Test
```bash
npm test -- --testNamePattern="should process audio, transcribe, respond, and synthesize"
```

### Run with Verbose Output
```bash
npm test tests/e2e/voice-streaming.e2e.test.ts -- --verbose
```

### Skip if Java Service Not Available
The tests automatically skip if Java service is not running:
```
⏭️ Java gRPC service not running, skipping test
```

---

## Test Output

### Console Output
```
📂 Loading test audio...
✅ Loaded 245632 bytes of audio

🎤 Transcribing audio...
📝 Transcription: Hello, how are you today?
🎯 Confidence: 0.94

🤖 Assistant response: I heard you say: Hello, how are you today?

🔊 Synthesizing response audio...
🎵 Received 128456 bytes of audio response

💾 Saved response audio to: tests/output/audio/voice-response-test-session-1707523456789.mp3
🎧 Play this file to verify audio quality

📊 Audio metadata:
  voiceName: en-US-JennyNeural
  language: en-US
  duration: 3200ms
  provider: azure

✅ Stream ended
```

### Output Files
Response audio files are saved to:
```
tests/output/audio/voice-response-{sessionId}.mp3
```

**Verify Quality:**
1. Open file in audio player
2. Listen to response
3. Verify:
   - ✅ Audio is clear
   - ✅ Speech is natural
   - ✅ Correct content (matches transcription)
   - ✅ No distortion

---

## Test Coverage

### 1. Complete Voice Flow ✅
- Load audio file
- Transcribe with STT
- Process with assistant
- Synthesize with TTS
- Save output

### 2. Streaming Audio ✅
- Split audio into chunks
- Stream via gRPC
- Receive interim transcriptions
- Handle final transcription

### 3. Format Validation ✅
- Accept WebM format
- Accept Ogg/Opus format
- Reject invalid formats

### 4. Error Handling ✅
- Empty audio buffer
- Invalid session ID
- Service unavailable
- Corrupt audio data

---

## Troubleshooting

### Test Fails: "Java gRPC service not available"
**Problem:** Java service not running

**Solution:**
```bash
# Check if Java service is running
curl http://localhost:50051

# Start Java service
cd path/to/java-service
./gradlew bootRun
```

### Test Fails: "ENOENT: sample-voice.webm not found"
**Problem:** No audio file

**Solution:**
```bash
cd tests/fixtures/audio
npx ts-node generate-sample.ts
```

### Test Passes but Audio Output is Silent
**Problem:** TTS service misconfigured or API key missing

**Solution:**
1. Check TTS service logs
2. Verify Azure/Google TTS credentials
3. Test TTS endpoint directly:
```bash
curl -X POST http://localhost:50051/tts/synthesize \
  -H "Content-Type: application/json" \
  -d '{"text":"Hello world","language":"en-US"}'
```

### Test Fails: "Transcription returned empty"
**Problem:** STT service can't process audio

**Solutions:**
1. Check audio format is valid WebM
2. Verify audio has actual content (not silence)
3. Check STT service logs
4. Try different audio file

### Test Hangs/Timeout
**Problem:** Service taking too long

**Solutions:**
1. Increase test timeout: `jest.setTimeout(60000)`
2. Check Java service logs for errors
3. Verify network connectivity
4. Check if services are overloaded

---

## Audio File Specifications

### Recommended Format
- **Container:** WebM
- **Codec:** Opus
- **Sample Rate:** 16000 Hz (16 kHz)
- **Channels:** 1 (mono)
- **Bitrate:** 32-64 kbps
- **Duration:** 2-5 seconds

### Alternative Formats
- Ogg/Opus
- MP4/AAC
- WAV (PCM)

### Creating Custom Audio Files

**Using ffmpeg:**
```bash
# Convert any audio to WebM/Opus
ffmpeg -i input.mp3 -c:a libopus -b:a 64k -vn output.webm

# Record from microphone
ffmpeg -f dshow -i audio="Microphone" -t 5 -c:a libopus output.webm

# Generate test tone
ffmpeg -f lavfi -i "sine=frequency=440:duration=2" -c:a libopus test-tone.webm
```

**Using SoX:**
```bash
# Generate test tone
sox -n test-tone.wav synth 2 sine 440
```

---

## Integration with CI/CD

### GitHub Actions Example
```yaml
name: E2E Voice Tests

on: [push, pull_request]

jobs:
  voice-e2e:
    runs-on: ubuntu-latest

    services:
      mongodb:
        image: mongo:6
        ports:
          - 27017:27017

      redis:
        image: redis:7
        ports:
          - 6379:6379

    steps:
      - uses: actions/checkout@v3

      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'

      - name: Install dependencies
        run: npm ci

      - name: Generate sample audio
        run: cd tests/fixtures/audio && npx ts-node generate-sample.ts

      - name: Start Java VA service
        run: |
          cd ../java-service
          ./gradlew bootRun &
          sleep 10

      - name: Run E2E tests
        run: npm test tests/e2e/voice-streaming.e2e.test.ts
        env:
          GRPC_SERVER_URL: localhost:50051

      - name: Upload audio artifacts
        if: always()
        uses: actions/upload-artifact@v3
        with:
          name: voice-test-outputs
          path: tests/output/audio/*.mp3
```

---

## Performance Benchmarks

Expected performance (on typical hardware):

| Metric | Target | Threshold |
|--------|--------|-----------|
| Audio Load Time | < 100ms | < 500ms |
| STT Transcription | < 500ms | < 2000ms |
| LLM Response | < 1000ms | < 5000ms |
| TTS Synthesis | < 500ms | < 2000ms |
| **Total E2E** | **< 2 seconds** | **< 10 seconds** |

Monitor test duration:
```bash
npm test tests/e2e/voice-streaming.e2e.test.ts -- --verbose --maxWorkers=1
```

---

## Advanced Testing

### Test with Different Voices
```typescript
const voices = [
  'en-US-JennyNeural',
  'en-US-GuyNeural',
  'en-GB-SoniaNeural',
  'es-ES-ElviraNeural'
];

for (const voice of voices) {
  // Test each voice...
}
```

### Test with Different Languages
```typescript
const testCases = [
  { text: 'Hello', language: 'en-US' },
  { text: 'Hola', language: 'es-ES' },
  { text: 'Bonjour', language: 'fr-FR' }
];
```

### Stress Test (Multiple Concurrent Sessions)
```typescript
const sessions = 10;
const promises = [];

for (let i = 0; i < sessions; i++) {
  promises.push(testVoiceFlow());
}

await Promise.all(promises);
```

---

## Related Documentation

- [Voice Socket Implementation](../../src/sockets/voice-socket.ts)
- [gRPC Client](../../src/grpc/client.ts)
- [Voice Proto Definition](../../proto/voice.proto)
- [Voice Critical Fixes](../../docs/VOICE_CRITICAL_FIXES.md)

---

## Support

**Issues?**
1. Check service logs
2. Verify audio file format
3. Test services individually
4. Review gRPC proto definitions

**Questions?**
- Check documentation links above
- Review existing test examples
- Consult gRPC/WebSocket debugging guides
