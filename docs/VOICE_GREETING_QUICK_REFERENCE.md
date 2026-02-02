# Voice Greeting Quick Reference

**Quick start guide for developers working with the voice greeting system.**

---

## 🚀 Quick Start

### Start All Services

```bash
# 1. Start MongoDB
mongod --dbpath /data/db

# 2. Start LM Studio (GUI)
# Load model → Enable API Server (port 1234)

# 3. Start Java Backend
cd services-java/voice-service
./mvnw spring-boot:run
# Running on http://localhost:8136

# 4. Start Node.js Backend
cd backend-node
npm run dev
# Running on http://localhost:3001

# 5. Start Frontend
cd frontend
npm run dev
# Running on http://localhost:5173
```

### Test Voice Greeting

1. Open `http://localhost:5173`
2. Log in with test credentials
3. Navigate to Voice Demo page
4. Click green microphone button 🎤
5. Wait 2-3 seconds for greeting to play
6. Speak into microphone when ready

---

## 📋 Component Checklist

### Frontend State Variables

```typescript
// In AssistantChat.tsx
greetingState: 'none' | 'initializing' | 'playing' | 'played'
greetingAudio: string | null  // Base64 WAV
greetingText: string | null
voiceStatus: 'idle' | 'listening' | 'processing' | 'speaking'
```

### Key Functions

```typescript
// Initialize voice session with greeting
const initializeVoiceSession = async (): Promise<boolean>

// Play greeting audio from Base64
const playGreetingAudio = async (audioBase64: string): Promise<void>

// Start voice recording (includes greeting initialization)
const startVoiceRecording = async (): Promise<void>
```

---

## 🔧 Socket.IO Events

### Client → Server

```typescript
// Initialize voice session
socket.emit('voice:session:init', {
  sessionId: string,
  customerId: string,
  productId?: string,
  tenantId?: string
});

// Start recording
socket.emit('voice:start', { sessionId: string });

// Send audio chunk
socket.emit('voice:chunk', {
  sessionId: string,
  audio: ArrayBuffer,
  timestamp: number
});

// Stop recording
socket.emit('voice:end', { sessionId: string });
```

### Server → Client

```typescript
// Session initialized with greeting
socket.on('voice:session:initialized', (data: {
  sessionId: string,
  greeting: { text: string, audio: string } | null,
  status: 'ready' | 'ready_no_greeting'
}) => { });

// Initialization error
socket.on('voice:session:init:error', (data: {
  error: string,
  details?: string
}) => { });

// Transcription result
socket.on('voice:transcription', (data: {
  text: string,
  isFinal: boolean
}) => { });

// TTS audio response
socket.on('voice:audio-response', (data: {
  audioData: string,  // Base64
  format: string,
  metadata: { voiceName, language, durationMs, provider }
}) => { });
```

---

## 🎨 UI States

| State | Button Color | Button Icon | Status Banner | Enabled |
|-------|-------------|-------------|---------------|---------|
| `none` | 🟢 Green | 🎤 Microphone | None | ✅ Yes |
| `initializing` | 🟡 Amber | 🕐 Clock | ⏳ Preparing voice assistant... | ❌ No |
| `playing` | 🟡 Amber | 🕐 Clock | 👋 Playing greeting... [Skip] | ❌ No |
| `played` | 🟢 Green | 🎤 Microphone | None | ✅ Yes |
| `listening` | 🔴 Red | ⏹️ Stop | 🎤 Listening... | ✅ Yes |
| `processing` | 🟡 Amber | ⚙️ Gear | ⚙️ Processing speech... | ❌ No |
| `speaking` | 🟡 Amber | 🔊 Speaker | 🔊 Assistant is speaking... [Stop] | ❌ No |

---

## 🐛 Common Issues

### Issue: Greeting not playing

**Check:**
```bash
# 1. LM Studio running?
curl http://localhost:1234/v1/models

# 2. Java service running?
curl http://localhost:8136/actuator/health

# 3. MongoDB running?
mongosh --eval "db.adminCommand('ping')"
```

**Browser Console:**
```javascript
// Should see:
[Voice] Initializing voice session with greeting for session: abc123
[Voice] Session initialized: { hasGreeting: true, hasAudio: true }
[Voice] Playing greeting audio...
```

---

### Issue: Frontend stuck on "Initializing..."

**Diagnosis:**
```javascript
// Browser console shows timeout
[Voice] Greeting initialization timeout after 10 seconds
```

**Solutions:**
1. Check backend logs: `pm2 logs backend-node`
2. Verify Java REST endpoint: `curl http://localhost:8136/voice/session`
3. Test WebSocket connection: Open DevTools → Network → WS

---

### Issue: "Microphone permission denied"

**Browser Settings:**
1. **Chrome:** Settings → Privacy and security → Site Settings → Microphone
2. **Firefox:** Preferences → Privacy & Security → Permissions → Microphone
3. Allow `http://localhost:5173`

---

## 📊 Performance Targets

| Metric | Target | Typical |
|--------|--------|---------|
| Greeting generation (LLM + TTS) | < 2.5s | ~2.1s |
| Frontend → Backend (Socket.IO) | < 50ms | ~15ms |
| Base64 decode + Blob creation | < 100ms | ~70ms |
| Audio playback start | < 100ms | ~80ms |
| **Total time to greeting** | **< 3s** | **~2.5s** |
| Greeting audio duration | 2-3s | ~2.8s |
| Microphone activation | < 200ms | ~150ms |
| **Total time to recording** | **< 5s** | **~4.8s** |

---

## 🔍 Debug Logging

### Enable verbose logging

**Frontend:**
```typescript
// In AssistantChat.tsx
const DEBUG_VOICE = true;

if (DEBUG_VOICE) {
  console.log('[Voice Debug]', {
    greetingState,
    greetingAudio: greetingAudio?.substring(0, 50),
    voiceStatus,
    sessionId
  });
}
```

**Backend:**
```bash
# Node.js
DEBUG=socket.io:* npm run dev

# Java
# Set logging.level.com.infero=DEBUG in application.yml
```

### Log Locations

```bash
# Node.js
pm2 logs backend-node

# Java
tail -f services-java/voice-service/logs/application.log

# MongoDB
tail -f /var/log/mongodb/mongod.log

# Frontend (browser)
# Open DevTools → Console
```

---

## 🧪 Testing Commands

### Manual Testing

```bash
# Test 1: Happy path (all services running)
# Expected: Greeting plays, mic activates

# Test 2: LLM unavailable
systemctl stop lm-studio
# Expected: Timeout after 10s, mic activates without greeting

# Test 3: TTS failure
# Disconnect internet
# Expected: Text greeting shows, no audio, mic activates

# Test 4: Greeting already played
# Click voice button twice
# Expected: Second click skips greeting initialization
```

### Automated Testing

```bash
# Frontend unit tests
cd frontend
npm test -- AssistantChat.test.tsx

# Backend integration tests
cd backend-node
npm test -- voice-socket.test.ts

# End-to-end tests
npm run test:e2e -- voice-greeting.spec.ts
```

---

## 📝 Code Snippets

### Add greeting to message history

```typescript
if (greetingText) {
  setMessages(prev => [...prev, {
    role: 'assistant',
    content: greetingText,
    timestamp: new Date()
  }]);
}
```

### Decode Base64 audio

```typescript
const binaryString = atob(audioBase64);
const bytes = new Uint8Array(binaryString.length);
for (let i = 0; i < binaryString.length; i++) {
  bytes[i] = binaryString.charCodeAt(i);
}
const blob = new Blob([bytes], { type: 'audio/wav' });
const audioUrl = URL.createObjectURL(blob);
```

### Play audio with cleanup

```typescript
if (greetingAudioRef.current) {
  greetingAudioRef.current.src = audioUrl;
  
  greetingAudioRef.current.onended = () => {
    URL.revokeObjectURL(audioUrl); // Clean up memory
    setGreetingState('played');
    resolve();
  };
  
  greetingAudioRef.current.play().catch(error => {
    console.error('Playback failed:', error);
    reject(error);
  });
}
```

---

## 🔗 Related Files

### Frontend
- [AssistantChat.tsx](../frontend/src/components/AssistantChat.tsx) - Main component
- [VoiceDemo.tsx](../frontend/src/pages/VoiceDemo.tsx) - Demo page
- [useSocket.ts](../frontend/src/hooks/useSocket.ts) - Socket.IO hook

### Backend
- [voice-socket.ts](../backend-node/src/sockets/voice-socket.ts) - Event handlers
- [client.ts](../backend-node/src/grpc/client.ts) - gRPC client
- [api.types.ts](../backend-node/src/types/api.types.ts) - TypeScript types

### Java
- [VoiceController.java](../services-java/voice-service/.../VoiceController.java) - REST endpoint
- [LLMService.java](../services-java/voice-service/.../LLMService.java) - Greeting generation
- [TTSService.java](../services-java/voice-service/.../TTSService.java) - Audio synthesis

### Documentation
- [VOICE_GREETING_IMPLEMENTATION.md](./VOICE_GREETING_IMPLEMENTATION.md) - Full guide (45 pages)
- [VOICE_GREETING_WORKFLOW.md](./diagrams/VOICE_GREETING_WORKFLOW.md) - Diagrams (10 charts)
- [PHASE_3_SUMMARY.md](./PHASE_3_SUMMARY.md) - Implementation summary

---

## 🆘 Help & Support

**Questions?**
- Slack: #ai-services-dev
- Email: dev-team@ai-services.com
- GitHub: [Open an issue](https://github.com/ai-services/platform/issues)

**Need to escalate?**
- Critical bugs: @tech-lead
- Production issues: @on-call-engineer
- Feature requests: @product-manager

---

## 📚 Additional Resources

- [Socket.IO Docs](https://socket.io/docs/v4/)
- [Web Audio API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Audio_API)
- [MediaRecorder API](https://developer.mozilla.org/en-US/docs/Web/API/MediaRecorder)
- [Azure TTS Docs](https://docs.microsoft.com/en-us/azure/cognitive-services/speech-service/text-to-speech)

---

**Last Updated:** 2025-01-28  
**Version:** 1.0

