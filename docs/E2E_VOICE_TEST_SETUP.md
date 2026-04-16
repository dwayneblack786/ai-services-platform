# Voice E2E Test Setup - Quick Start

**Created:** 2026-02-09
**Status:** ✅ Ready to use

---

## What Was Created

Complete end-to-end testing infrastructure for voice streaming:

### 1. Test File ✅
**[tests/e2e/voice-streaming.e2e.test.ts](../ai-product-management/backend-node/tests/e2e/voice-streaming.e2e.test.ts)**

Tests complete voice workflow:
- Load/generate audio input
- Stream to Java service (STT)
- Receive transcription
- Get assistant response
- Synthesize audio (TTS)
- **Save response audio to file**
- Verify audio quality

### 2. Audio Generator ✅
**[tests/fixtures/audio/generate-sample.ts](../ai-product-management/backend-node/tests/fixtures/audio/generate-sample.ts)**

Generates sample audio files using:
- Windows TTS (if available)
- Download from web
- Synthetic beep (fallback)

### 3. Testing Guide ✅
**[tests/e2e/VOICE_TESTING_GUIDE.md](../ai-product-management/backend-node/tests/e2e/VOICE_TESTING_GUIDE.md)**

Complete documentation:
- Prerequisites
- Running tests
- Troubleshooting
- CI/CD integration
- Performance benchmarks

### 4. NPM Scripts ✅
Added to package.json:
```json
{
  "test:e2e:voice": "jest tests/e2e/voice-streaming.e2e.test.ts --verbose",
  "test:voice": "npm run test:e2e:voice"
}
```

---

## Quick Start (3 Steps)

### Step 1: Generate Sample Audio
```bash
cd ai-product-management/backend-node/tests/fixtures/audio
npx ts-node generate-sample.ts
```

**Output:**
```
🎤 Generating sample audio for voice testing...
🔊 Attempting to generate audio with Windows TTS...
✅ WAV file generated, converting to WebM...
✅ Sample audio ready!
📁 Location: tests/fixtures/audio/sample-voice.webm
```

### Step 2: Start Java Service
```bash
# Make sure Java VA service is running on port 50051
cd path/to/java-service
./gradlew bootRun
```

### Step 3: Run Tests
```bash
cd ai-product-management/backend-node
npm run test:voice
```

**Expected Output:**
```
📂 Loading test audio...
✅ Loaded 245632 bytes of audio

🎤 Transcribing audio...
📝 Transcription: Hello, how are you today?

🤖 Assistant response: I heard you say: Hello, how are you today?

🔊 Synthesizing response audio...
💾 Saved response audio to: tests/output/audio/voice-response-1707523456789.mp3
🎧 Play this file to verify audio quality

✅ All tests passed!
```

---

## Verify Audio Response

### 1. Find Output File
```bash
# Output files saved to:
tests/output/audio/voice-response-*.mp3
```

### 2. Play Audio
```bash
# Windows
start tests/output/audio/voice-response-*.mp3

# Mac
open tests/output/audio/voice-response-*.mp3

# Linux
xdg-open tests/output/audio/voice-response-*.mp3
```

### 3. Verify Quality
Listen and check:
- ✅ Audio is clear (no static/noise)
- ✅ Speech is natural (not robotic)
- ✅ Correct content (matches transcription)
- ✅ Proper volume
- ✅ No distortion

---

## What the Test Does

### Complete Flow

```
Input Audio (WebM)
      ↓
[1. Load from file or generate synthetic]
      ↓
[2. Stream to Java gRPC service]
      ↓
[3. STT (Speech-to-Text)]
      ↓
Transcription: "Hello, how are you today?"
      ↓
[4. Assistant Service (LLM)]
      ↓
Response Text: "I heard you say: Hello, how are you today?"
      ↓
[5. TTS (Text-to-Speech)]
      ↓
Response Audio (MP3)
      ↓
[6. Save to file]
      ↓
tests/output/audio/voice-response-{sessionId}.mp3
```

### Test Coverage

1. **Complete Voice Conversation**
   - End-to-end STT → LLM → TTS flow
   - Saves actual audio response
   - Verifies metadata (duration, format, voice)

2. **Streaming Audio Chunks**
   - Splits audio into 4KB chunks
   - Streams via gRPC
   - Receives interim transcriptions

3. **Format Validation**
   - Accepts: WebM, Ogg/Opus, MP4
   - Rejects: Invalid formats

4. **Error Handling**
   - Empty audio buffer
   - Invalid session ID
   - Service unavailable

---

## Audio File Formats

### Recommended Input Format
```
Container: WebM
Codec: Opus
Sample Rate: 16000 Hz
Channels: Mono (1)
Bitrate: 32-64 kbps
Duration: 2-5 seconds
```

### Output Format (TTS)
```
Format: MP3
Bitrate: 64-128 kbps
Sample Rate: 24000 Hz (or service default)
Quality: High
```

---

## Troubleshooting

### "Java gRPC service not available"
```bash
# Check if service is running
curl http://localhost:50051

# Start service
cd java-service
./gradlew bootRun
```

### "sample-voice.webm not found"
```bash
cd tests/fixtures/audio
npx ts-node generate-sample.ts
```

### Audio Output is Silent
1. Check TTS service logs
2. Verify Azure/Google credentials
3. Test TTS endpoint directly

### Test Hangs
1. Increase timeout: `jest.setTimeout(60000)`
2. Check Java service logs
3. Verify network connectivity

---

## Alternative: Use Your Own Audio

### Option 1: Record with Browser
```javascript
// Paste in Chrome DevTools Console
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
    console.log('Recording...');
    setTimeout(() => {
      recorder.stop();
      stream.getTracks().forEach(t => t.stop());
    }, 3000);
  });
```
Say: "Hello, how are you today?"

### Option 2: Convert Existing Audio
```bash
# Using ffmpeg
ffmpeg -i your-audio.mp3 -c:a libopus -b:a 64k -vn sample-voice.webm
```

### Option 3: Copy to Fixtures
```bash
# Copy your WebM file
cp your-audio.webm tests/fixtures/audio/sample-voice.webm
```

---

## Performance Benchmarks

Expected latency (typical hardware):

| Stage | Target | Threshold |
|-------|--------|-----------|
| Load Audio | < 100ms | < 500ms |
| STT | < 500ms | < 2s |
| LLM | < 1000ms | < 5s |
| TTS | < 500ms | < 2s |
| **Total** | **< 2s** | **< 10s** |

---

## CI/CD Integration

### GitHub Actions
```yaml
- name: Generate sample audio
  run: cd tests/fixtures/audio && npx ts-node generate-sample.ts

- name: Run voice E2E tests
  run: npm run test:voice

- name: Upload audio artifacts
  uses: actions/upload-artifact@v3
  with:
    name: voice-test-outputs
    path: tests/output/audio/*.mp3
```

---

## Files Created

```
tests/
├── e2e/
│   ├── voice-streaming.e2e.test.ts    # Main test file
│   └── VOICE_TESTING_GUIDE.md          # Complete guide
├── fixtures/
│   └── audio/
│       ├── generate-sample.ts          # Audio generator
│       └── sample-voice.webm           # Sample audio (generated)
└── output/
    └── audio/
        └── voice-response-*.mp3        # Test outputs
```

---

## Next Steps

1. ✅ Generate sample audio
2. ✅ Start Java service
3. ✅ Run test: `npm run test:voice`
4. ✅ Listen to output audio
5. ✅ Verify quality
6. 🔄 Iterate if needed

---

## Related Documentation

- [Voice Testing Guide](../ai-product-management/backend-node/tests/e2e/VOICE_TESTING_GUIDE.md) - Detailed guide
- [Voice Critical Fixes](./VOICE_CRITICAL_FIXES.md) - Recent improvements
- [Voice Socket Implementation](../ai-product-management/backend-node/src/sockets/voice-socket.ts)
- [gRPC Proto Definition](../ai-product-management/backend-node/proto/voice.proto)

---

## Support

**Need Help?**
1. Check [VOICE_TESTING_GUIDE.md](../ai-product-management/backend-node/tests/e2e/VOICE_TESTING_GUIDE.md)
2. Review service logs
3. Test services individually
4. Verify audio file format

**Issues?**
- Ensure all services are running
- Check gRPC connectivity
- Verify audio file is valid
- Review test output for specific errors

