# Voice Endpoints Architecture

## Overview

This document explains the **two distinct voice communication paths** in the AI Services Platform:

1. **UI Voice Chat** - Browser microphone → WebSocket → gRPC → Java
2. **VoIP Voice Chat** - Phone call → VoIP Provider → HTTP Webhooks → REST → Java

Both paths share the same underlying AI services (STT, TTS, LLM) but use completely different transport protocols and endpoints.

---

## 🎯 Quick Comparison

| Aspect | UI Voice Chat | VoIP Voice Chat |
|--------|---------------|-----------------|
| **User Interface** | Browser (React app) | Phone (PSTN/SIP) |
| **Transport Protocol** | WebSocket (Socket.IO) | HTTP Webhooks |
| **Node.js Handler** | `voice-socket.ts` | `voice-routes.ts` |
| **Node→Java Protocol** | gRPC (bidirectional streaming) | REST (request/response) |
| **Java Endpoint** | `VoiceServiceImpl.java` (gRPC) | `VoiceSessionController.java` (REST) |
| **Audio Format** | WebM/Opus 16kHz | μ-law/PCM 8kHz |
| **Connection Type** | Persistent, bidirectional | Stateless, per-chunk |
| **Session Management** | In-memory Map | MongoDB documents |
| **Authentication** | JWT tokens | VoIP provider signatures |
| **Response Delivery** | WebSocket emit | HTTP response |

---

## 📱 UI Voice Chat (Browser → WebSocket → gRPC)

### Architecture

```
┌─────────────┐
│   Browser   │
│ (Microphone)│
└──────┬──────┘
       │ WebSocket (Socket.IO)
       │ voice:start, voice:chunk, voice:end
       ↓
┌─────────────────────┐
│   Node.js Backend   │
│  voice-socket.ts    │
│ - audioBuffers Map  │
│ - gRPC client       │
└──────┬──────────────┘
       │ gRPC (HTTP/2)
       │ transcribeStream(), synthesizeStream()
       ↓
┌─────────────────────┐
│   Java VA Service   │
│ VoiceServiceImpl    │
│ - Bidirectional     │
│ - STT/TTS/LLM       │
└─────────────────────┘
```

### Endpoints

#### Node.js WebSocket Events

**File:** [`backend-node/src/sockets/voice-socket.ts`](../backend-node/src/sockets/voice-socket.ts)

| Event | Direction | Purpose | Data |
|-------|-----------|---------|------|
| `voice:start` | Client → Server | Initialize voice session | `{sessionId, userId, config}` |
| `voice:chunk` | Client → Server | Send audio chunk | `{sessionId, audio: ArrayBuffer}` |
| `voice:end` | Client → Server | End recording, process full audio | `{sessionId}` |
| `voice:audio-response` | Server → Client | Return synthesized audio | `{audioData: Buffer, format: 'pcm'}` |
| `voice:error` | Server → Client | Error occurred | `{error: string}` |

**Example Client Code:**
```typescript
// Start recording
socket.emit('voice:start', {
  sessionId: 'sess_123',
  userId: 'user_456',
  config: { language: 'en-US' }
});

// Send audio chunks
mediaRecorder.ondataavailable = (event) => {
  socket.emit('voice:chunk', {
    sessionId: 'sess_123',
    audio: event.data
  });
};

// Stop and process
socket.emit('voice:end', { sessionId: 'sess_123' });

// Receive response
socket.on('voice:audio-response', (data) => {
  playAudio(data.audioData);
});
```

#### Java gRPC Service

**File:** [`services-java/va-service/src/main/java/com/ai/va/service/VoiceServiceImpl.java`](../services-java/va-service/src/main/java/com/ai/va/service/VoiceServiceImpl.java)

| Method | Type | Purpose |
|--------|------|---------|
| `transcribeStream()` | Bidirectional Streaming | Real-time STT from audio chunks |
| `synthesizeStream()` | Server Streaming | Real-time TTS to audio chunks |
| `streamVoiceConversation()` | Bidirectional Streaming | Full conversation flow |

**gRPC Proto Definition:**
```protobuf
service VoiceService {
  rpc TranscribeStream(stream AudioChunk) returns (stream TranscriptChunk);
  rpc SynthesizeStream(stream TextChunk) returns (stream AudioChunk);
  rpc StreamVoiceConversation(stream VoiceRequest) returns (stream VoiceResponse);
}
```

### Session Management

**Storage:** In-memory Map in `voice-socket.ts`
```typescript
const audioBuffers = new Map<string, Buffer[]>();
audioBuffers.set(sessionId, []);
audioBuffers.get(sessionId).push(audioChunk);
```

**Lifecycle:**
1. `voice:start` → Create session, initialize buffer
2. `voice:chunk` → Accumulate audio in memory
3. `voice:end` → Process complete audio, clear buffer

### Audio Format

- **Codec:** WebM container with Opus codec
- **Sample Rate:** 16kHz
- **Bit Depth:** 16-bit
- **Channels:** Mono
- **Streaming:** Real-time chunks, accumulated in Node.js

---

## ☎️ VoIP Voice Chat (Phone → Webhooks → REST)

### Architecture

```
┌─────────────┐
│  Phone Call │
│   (PSTN)    │
└──────┬──────┘
       │ VoIP Provider Network
       │ (Twilio/Vonage/Bandwidth)
       ↓
┌─────────────────────┐
│  VoIP Provider API  │
│  - Receives call    │
│  - Requests webhook │
└──────┬──────────────┘
       │ HTTP POST (webhook)
       │ Provider-specific format
       ↓
┌─────────────────────┐
│   Node.js Backend   │
│   voice-routes.ts   │
│ - Adapter pattern   │
│ - REST endpoints    │
└──────┬──────────────┘
       │ REST API (HTTP)
       │ POST /voice/session, /voice/process
       ↓
┌─────────────────────┐
│   Java VA Service   │
│VoiceSessionCtrl.java│
│ - Request/response  │
│ - STT/TTS/LLM       │
└─────────────────────┘
```

### Webhook URLs

**All providers use the same endpoint with auto-detection:**

#### Twilio Configuration

**Primary Webhook:** `https://your-domain.com/api/voice/incoming`

**Twilio Console Setup:**
1. Phone Numbers → Active Numbers → Select number
2. **Voice & Fax** section:
   - "A Call Comes In": `https://your-domain.com/api/voice/incoming`
   - Method: `HTTP POST`
   - Format: TwiML

**Example Webhook Body:**
```json
{
  "CallSid": "CA1234567890abcdef1234567890abcdef",
  "AccountSid": "AC1234567890abcdef1234567890abcdef",
  "From": "+15551234567",
  "To": "+15559876543",
  "CallStatus": "ringing",
  "Direction": "inbound"
}
```

**Response Format:** TwiML XML
```xml
<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say>Hello! How can I help you?</Say>
  <Start>
    <Stream url="wss://your-domain.com/voice/stream"/>
  </Start>
</Response>
```

---

#### Vonage Configuration

**Answer Webhook:** `https://your-domain.com/api/voice/incoming`

**Vonage Dashboard Setup:**
1. Applications → Voice → Create Application
2. **Capabilities:**
   - Answer URL: `https://your-domain.com/api/voice/incoming`
   - Event URL: `https://your-domain.com/api/voice/events`
   - Method: `HTTP POST`
3. Link phone number to application

**Example Webhook Body:**
```json
{
  "uuid": "63f61863-4a51-4f6b-86e1-46edebcdef01",
  "conversation_uuid": "CON-f972836a-550e-45d0-8b5f-123456789",
  "from": "15551234567",
  "to": "15559876543",
  "timestamp": "2026-01-22T10:30:00.000Z",
  "direction": "inbound"
}
```

**Response Format:** NCCO JSON
```json
[
  {
    "action": "talk",
    "text": "Hello! How can I help you?",
    "voiceName": "Amy"
  },
  {
    "action": "connect",
    "endpoint": [
      {
        "type": "websocket",
        "uri": "wss://your-domain.com/voice/stream",
        "content-type": "audio/l16;rate=16000"
      }
    ]
  }
]
```

---

#### Bandwidth Configuration

**Inbound Callback:** `https://your-domain.com/api/voice/incoming`

**Bandwidth Dashboard Setup:**
1. Applications → Create Voice Application
2. **Call Settings:**
   - Inbound Callback URL: `https://your-domain.com/api/voice/incoming`
   - Callback HTTP Method: `POST`
3. Associate phone number with application

**Example Webhook Body:**
```json
{
  "eventType": "initiate",
  "callId": "c-d45a41f7-a4d4-4a0d-8b5f-123456789abc",
  "from": "+15551234567",
  "to": "+15559876543",
  "applicationId": "a-25c4c5d0-23d1-4a4e-b6a1-123456789",
  "accountId": "5555555",
  "direction": "inbound"
}
```

**Response Format:** BXML XML
```xml
<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <SpeakSentence>Hello! How can I help you?</SpeakSentence>
  <StartStream>
    <StreamUrl>wss://your-domain.com/voice/stream</StreamUrl>
  </StartStream>
</Response>
```

---

### Node.js REST Endpoints

**File:** [`backend-node/src/routes/voice-routes.ts`](../backend-node/src/routes/voice-routes.ts)

| Endpoint | Method | Purpose | Provider Usage |
|----------|--------|---------|----------------|
| `/voice/incoming` | POST | Handle incoming call webhook | Twilio, Vonage, Bandwidth (auto-detected) |
| `/voice/stream` | POST | Receive audio chunks during call | All providers (WebSocket callback) |
| `/voice/end` | POST | Call ended, cleanup | All providers (status callback) |

**Provider Auto-Detection:**
```typescript
const adapter = VoipAdapterFactory.detectProvider(req.body, req.headers);
// Returns: TwilioAdapter | VonageAdapter | BandwidthAdapter

const callData = adapter.parseIncomingCall(req.body, req.headers);
// Normalized to: { callId, from, to, provider, timestamp }

const response = adapter.generateCallResponse({
  action: 'answer',
  message: 'Hello, how can I help?'
});
// Returns: TwiML XML | NCCO JSON | BXML XML
```

**Detection Logic:**

| Provider | Detection Criteria |
|----------|-------------------|
| **Twilio** | `CallSid` field OR `x-twilio-signature` header |
| **Vonage** | `uuid` + `conversation_uuid` fields OR `Authorization: Bearer` header |
| **Bandwidth** | `callId` + `applicationId` fields |

---

### Java REST Endpoints

**File:** [`services-java/va-service/src/main/java/com/ai/va/controller/VoiceSessionController.java`](../services-java/va-service/src/main/java/com/ai/va/controller/VoiceSessionController.java)

| Endpoint | Method | Purpose | Request Body |
|----------|--------|---------|--------------|
| `/voice/session` | POST | Initialize call session | `{callId, from, to, language}` |
| `/voice/process` | POST | Process audio chunk | `{callId, audioChunk: Base64}` |
| `/voice/end` | POST | End call session | `{callId, duration}` |

**Request/Response Flow:**

1. **Initialize Session:**
```bash
POST http://java-va:8082/voice/session
Content-Type: application/json

{
  "callId": "CA123...",
  "from": "+15551234567",
  "to": "+15559876543",
  "language": "en-US"
}

# Response:
{
  "sessionId": "voice_sess_abc123",
  "status": "active",
  "tenantConfig": {...}
}
```

2. **Process Audio Chunk:**
```bash
POST http://java-va:8082/voice/process
Content-Type: application/json

{
  "callId": "CA123...",
  "audioChunk": "UklGRiQAAABXQVZF..." # Base64 encoded
}

# Response:
{
  "transcription": "Hello, I need help",
  "assistantResponse": "I'm here to help. What do you need?",
  "audioResponse": "UklGRiQEAABXQVZF...", # Base64 TTS audio
  "format": "wav"
}
```

3. **End Session:**
```bash
POST http://java-va:8082/voice/end
Content-Type: application/json

{
  "callId": "CA123...",
  "duration": 120
}

# Response: 200 OK
```

### Session Management

**Storage:** MongoDB `call_logs` collection
```typescript
{
  _id: ObjectId("..."),
  callId: "CA123...",
  tenantId: "tenant_456",
  userId: "user_789",
  from: "+15551234567",
  to: "+15559876543",
  provider: "twilio",
  startTime: ISODate("2026-01-22T10:30:00Z"),
  endTime: ISODate("2026-01-22T10:35:30Z"),
  duration: 330,
  transcript: [...],
  audioSegments: 45,
  status: "completed"
}
```

**Lifecycle:**
1. `/voice/incoming` → Create call_log document, status: "ringing"
2. `/voice/stream` (chunks) → Append to transcript array
3. `/voice/end` → Update endTime, duration, status: "completed"

### Audio Format

- **Codec:** μ-law (G.711) or PCM
- **Sample Rate:** 8kHz (telephony standard)
- **Bit Depth:** 8-bit (μ-law) or 16-bit (PCM)
- **Channels:** Mono
- **Streaming:** Each chunk is separate HTTP request

---

## 🔄 Why Two Different Approaches?

### Technical Constraints

| Reason | UI Voice | VoIP Voice |
|--------|----------|------------|
| **Browser Limitations** | MediaRecorder API requires persistent connection | N/A - Phone network |
| **Real-time Requirements** | User expects instant feedback | Telephony latency acceptable |
| **Connection Type** | Browser can maintain WebSocket | VoIP providers send webhooks |
| **Audio Source** | JavaScript MediaRecorder | Phone PSTN/SIP network |
| **Session Context** | User authenticated with JWT | Call identified by provider callId |

### Why Not Unified?

❌ **Can't use WebSocket for VoIP:**
- VoIP providers (Twilio, Vonage) send HTTP POST webhooks
- They don't establish WebSocket connections to your server
- Standard telephony architecture

❌ **Can't use HTTP webhooks for UI:**
- Browser can't expose public HTTP endpoint
- CORS and security restrictions
- Need server-initiated push for audio response

✅ **Solution:** Two entry points, shared backend
- UI path: WebSocket → gRPC (optimal for browser)
- VoIP path: HTTP → REST (optimal for telephony)
- Both converge at Java STT/TTS/LLM services

---

## 🔗 Shared Backend Services

Despite different entry points, both paths use the **same AI services**:

### Java Services (Provider-Agnostic)

| Service | Purpose | Used By |
|---------|---------|---------|
| **WhisperSttService** | Speech-to-Text | UI (16kHz) + VoIP (8kHz) |
| **AzureTtsService** | Text-to-Speech | UI (16kHz) + VoIP (8kHz) |
| **ChatSessionService** | LLM conversation | Both paths (same logic) |
| **VoiceSessionService** | Session orchestration | Both paths (different entry) |
| **TenantConfigService** | Tenant settings | Both paths (shared config) |

**Example:** STT service handles both audio formats:
```java
@Service
public class WhisperSttService {
  public String transcribe(byte[] audioData, String format, int sampleRate) {
    // Automatically resamples if needed
    if (sampleRate == 8000) {
      audioData = resample8kTo16k(audioData);
    }
    
    // Same Whisper model for both
    return whisperClient.transcribe(audioData);
  }
}
```

---

## 📊 Complete Flow Comparison

### UI Voice Chat Flow

```
1. User clicks microphone button
   ↓
2. Browser MediaRecorder starts
   ↓
3. WebSocket emit: voice:start {sessionId}
   ↓
4. Node.js creates audioBuffers[sessionId] = []
   ↓
5. Browser sends chunks: voice:chunk {audio}
   ↓
6. Node.js accumulates: audioBuffers[sessionId].push(chunk)
   ↓
7. User releases button
   ↓
8. WebSocket emit: voice:end {sessionId}
   ↓
9. Node.js: Buffer.concat(audioBuffers[sessionId])
   ↓
10. gRPC call: grpcClient.transcribe(sessionId, audioData, 'webm')
    ↓
11. Java VoiceServiceImpl.transcribeStream()
    ↓
12. WhisperSttService.transcribe(audioData, 16000)
    ↓
13. Returns: "Hello, I need help"
    ↓
14. ChatSessionService.processMessage(transcript)
    ↓
15. LLM generates: "I'm here to help. What do you need?"
    ↓
16. AzureTtsService.synthesize(response, voice='en-US-AriaNeural')
    ↓
17. Returns: Buffer<PCM audio>
    ↓
18. Node.js receives gRPC response
    ↓
19. WebSocket emit: voice:audio-response {audioData}
    ↓
20. Browser plays audio via Web Audio API
```

**Total Time:** ~1-2 seconds (real-time feel)

---

### VoIP Voice Chat Flow

```
1. Customer calls phone number
   ↓
2. VoIP provider receives call
   ↓
3. Provider HTTP POST: https://your-domain.com/api/voice/incoming
   Body: {CallSid, From, To} (Twilio format)
   ↓
4. Node.js voice-routes.ts receives webhook
   ↓
5. VoipAdapterFactory.detectProvider(body, headers)
   ↓
6. Returns: TwilioAdapter (detected from CallSid)
   ↓
7. adapter.parseIncomingCall() → {callId, from, to}
   ↓
8. Check business hours, tenant config
   ↓
9. REST POST: http://java-va:8082/voice/session
   Body: {callId, from, to, language: 'en-US'}
   ↓
10. Java VoiceSessionController.startSession()
    ↓
11. Creates voice session, returns sessionId
    ↓
12. Node.js generates response
    ↓
13. adapter.generateCallResponse({action: 'answer', message: 'Hello'})
    ↓
14. Returns TwiML: <Response><Say>Hello</Say><Start><Stream url="wss://..."/></Start></Response>
    ↓
15. HTTP 200 with TwiML body → VoIP provider
    ↓
16. Provider plays greeting, starts audio stream
    ↓
17. For each audio chunk (every 20ms):
    Provider POST: /voice/stream {callId, audioChunk}
    ↓
18. Node.js forwards: POST http://java-va:8082/voice/process
    ↓
19. Java VoiceSessionController.processAudio()
    ↓
20. WhisperSttService.transcribe(audioChunk, 8000)
    ↓
21. Accumulates chunks until silence detected
    ↓
22. Full utterance: "Hello, I need help"
    ↓
23. ChatSessionService.processMessage(transcript)
    ↓
24. LLM generates: "I'm here to help. What do you need?"
    ↓
25. AzureTtsService.synthesize(response, voice='en-US-GuyNeural')
    ↓
26. Returns: Buffer<μ-law audio, 8kHz>
    ↓
27. HTTP 200 response to Node.js
    ↓
28. Node.js returns audio to VoIP provider
    ↓
29. Provider plays audio to caller
    ↓
30. Call ends → Provider POST: /voice/end {callId, duration}
    ↓
31. Java updates call_logs, flushes metrics
```

**Total Time:** ~2-3 seconds (includes network latency)

---

## 🛡️ Security & Authentication

### UI Voice Chat

**Authentication:**
- JWT token in WebSocket handshake
- Validated in `voice-socket.ts` middleware
- User session linked to voice session

```typescript
io.use(async (socket, next) => {
  const token = socket.handshake.auth.token;
  const decoded = jwt.verify(token, process.env.JWT_SECRET);
  socket.userId = decoded.userId;
  next();
});
```

---

### VoIP Voice Chat

**Authentication:**
- VoIP provider webhook signatures
- Each provider has different validation method

**Twilio:** SHA1 HMAC signature
```typescript
const signature = req.headers['x-twilio-signature'];
const isValid = validateTwilioSignature(
  req.body,
  signature,
  process.env.TWILIO_AUTH_TOKEN
);
```

**Vonage:** JWT Bearer token
```typescript
const token = req.headers['authorization'].replace('Bearer ', '');
const decoded = jwt.verify(token, process.env.VONAGE_PUBLIC_KEY);
```

**Bandwidth:** User-Agent + IP whitelist
```typescript
const userAgent = req.headers['user-agent'];
const isValid = userAgent.includes('Bandwidth-API');
```

---

## 🧪 Testing Examples

### Test UI Voice WebSocket

```bash
# Install wscat
npm install -g wscat

# Connect with JWT
wscat -c "ws://localhost:5000" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIs..."

# Send events
> {"event": "voice:start", "data": {"sessionId": "test_123", "userId": "user_456"}}
> {"event": "voice:chunk", "data": {"sessionId": "test_123", "audio": "..."}}
> {"event": "voice:end", "data": {"sessionId": "test_123"}}

# Receive response
< {"event": "voice:audio-response", "data": {"audioData": "...", "format": "pcm"}}
```

---

### Test VoIP Webhooks

**Twilio format:**
```bash
curl -X POST http://localhost:5000/api/voice/incoming \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "CallSid=CA1234567890abcdef" \
  -d "AccountSid=AC1234567890abcdef" \
  -d "From=+15551234567" \
  -d "To=+15559876543" \
  -d "CallStatus=ringing"

# Expected response: TwiML XML
```

**Vonage format:**
```bash
curl -X POST http://localhost:5000/api/voice/incoming \
  -H "Content-Type: application/json" \
  -d '{
    "uuid": "63f61863-4a51-4f6b-86e1-46edebcdef01",
    "conversation_uuid": "CON-123",
    "from": "15551234567",
    "to": "15559876543",
    "timestamp": "2026-01-22T10:00:00.000Z"
  }'

# Expected response: NCCO JSON
```

**Bandwidth format:**
```bash
curl -X POST http://localhost:5000/api/voice/incoming \
  -H "Content-Type: application/json" \
  -d '{
    "eventType": "initiate",
    "callId": "c-d45a41f7-1234-5678-90ab-cdef01234567",
    "from": "+15551234567",
    "to": "+15559876543",
    "applicationId": "a-12345",
    "accountId": "5555555"
  }'

# Expected response: BXML XML
```

---

## 📚 Related Documentation

- **[VoIP Provider Configuration](VOIP_PROVIDER_CONFIGURATION.md)** - Detailed setup for Twilio, Vonage, Bandwidth
- **[VoIP Multi-Provider Support](VOIP_MULTI_PROVIDER_SUPPORT.md)** - Adapter pattern implementation details
- **[Project Overview](PROJECT_OVERVIEW.md)** - Overall system architecture
- **[Repository Structure](RepositoryStrucutre.md)** - Codebase organization

---

## 🎯 Summary

### Key Takeaways

✅ **Two Separate Entry Points:**
- UI Voice: `voice-socket.ts` (WebSocket handlers)
- VoIP Voice: `voice-routes.ts` (REST endpoints)

✅ **Two Java APIs:**
- UI Voice: `VoiceServiceImpl.java` (gRPC bidirectional streaming)
- VoIP Voice: `VoiceSessionController.java` (REST request/response)

✅ **Shared AI Services:**
- Both paths use same STT, TTS, LLM, MongoDB storage
- Java backend is protocol-agnostic

✅ **Universal VoIP Support:**
- Works with any provider (Twilio, Vonage, Bandwidth, extensible)
- Auto-detection from webhook format
- Provider-specific response generation (TwiML, NCCO, BXML)

✅ **Why Different Approaches:**
- Browser constraints require WebSocket
- VoIP providers send HTTP webhooks
- Each optimized for its use case
- Can't unify without sacrificing performance

---

**Questions?** Both voice paths lead to the same powerful AI services - they just take different roads to get there! 🚀
