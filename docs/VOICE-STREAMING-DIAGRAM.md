# Voice Streaming Architecture Diagram

## High-Level Flow

```
┌─────────────────────────────────────────────────────────────────────┐
│                         Browser (React)                              │
│                                                                      │
│  ┌──────────────────────────────────────────────────────────┐      │
│  │  AssistantChat.tsx                                       │      │
│  │                                                          │      │
│  │  ┌────────────┐                                         │      │
│  │  │ 🎤 Button  │ ◄─ Click                                │      │
│  │  └────────────┘                                         │      │
│  │        │                                                 │      │
│  │        ▼                                                 │      │
│  │  ┌────────────────────────────────┐                     │      │
│  │  │ getUserMedia()                 │                     │      │
│  │  │ Request Microphone Permission  │                     │      │
│  │  └────────────────────────────────┘                     │      │
│  │        │                                                 │      │
│  │        ▼                                                 │      │
│  │  ┌────────────────────────────────┐                     │      │
│  │  │ MediaRecorder API              │                     │      │
│  │  │ - Format: audio/webm (opus)    │                     │      │
│  │  │ - Sample Rate: 16kHz           │                     │      │
│  │  │ - Chunk Interval: 100ms        │                     │      │
│  │  └────────────────────────────────┘                     │      │
│  │        │                                                 │      │
│  │        ▼ ondataavailable (every 100ms)                   │      │
│  │  ┌────────────────────────────────┐                     │      │
│  │  │ Blob → ArrayBuffer             │                     │      │
│  │  └────────────────────────────────┘                     │      │
│  │        │                                                 │      │
│  │        ▼                                                 │      │
│  │  ┌────────────────────────────────┐                     │      │
│  │  │ socket.emit('voice:chunk')     │                     │      │
│  │  │ { sessionId, audio, timestamp }│                     │      │
│  │  └────────────────────────────────┘                     │      │
│  └──────────────────────────────────────────────────────────┘      │
└─────────────────────────────────────────────────────────────────────┘
                              │
                              │ WebSocket (Socket.IO)
                              │ ~600 KB/minute
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────────┐
│                    Node.js Backend (Port 5000)                       │
│                                                                      │
│  ┌──────────────────────────────────────────────────────────┐      │
│  │  socket.ts (Connection Handler)                          │      │
│  │                                                          │      │
│  │  ┌────────────────────────────────┐                     │      │
│  │  │ JWT Authentication             │                     │      │
│  │  │ Verify user token              │                     │      │
│  │  └────────────────────────────────┘                     │      │
│  │        │                                                 │      │
│  │        ▼                                                 │      │
│  │  ┌────────────────────────────────┐                     │      │
│  │  │ setupVoiceHandlers(socket)     │                     │      │
│  │  └────────────────────────────────┘                     │      │
│  └──────────────────────────────────────────────────────────┘      │
│                              │                                       │
│                              ▼                                       │
│  ┌──────────────────────────────────────────────────────────┐      │
│  │  voice-socket.ts (Event Handlers)                        │      │
│  │                                                          │      │
│  │  on('voice:start')                                      │      │
│  │  ├─ console.log("🎤 Recording started")                 │      │
│  │  ├─ socket.join(`voice:${sessionId}`)                   │      │
│  │  └─ socket.emit('voice:started')                        │      │
│  │                                                          │      │
│  │  on('voice:chunk')                                      │      │
│  │  ├─ Extract: sessionId, audio, timestamp                │      │
│  │  ├─ console.log("📦 Chunk received: XXX bytes")         │      │
│  │  └─ socket.emit('voice:chunk-received')                 │      │
│  │                                                          │      │
│  │  on('voice:end')                                        │      │
│  │  ├─ console.log("🛑 Recording stopped")                 │      │
│  │  ├─ socket.leave(`voice:${sessionId}`)                  │      │
│  │  └─ socket.emit('voice:stopped')                        │      │
│  └──────────────────────────────────────────────────────────┘      │
└─────────────────────────────────────────────────────────────────────┘
```

## Detailed Event Flow

### 1. Recording Start Sequence

```
User Action: Click 🎤 button
     │
     ▼
Frontend: toggleVoiceRecording()
     │
     ├─► startVoiceRecording()
     │   │
     │   ├─► navigator.mediaDevices.getUserMedia({ audio: true })
     │   │   └─► Browser Prompt: "Allow microphone?" ✓ Allow
     │   │
     │   ├─► new MediaRecorder(stream, { mimeType: 'audio/webm;codecs=opus' })
     │   │
     │   ├─► setIsRecording(true)  // Update UI to red button
     │   │
     │   └─► socket.emit('voice:start', { sessionId })
     │
     ▼
Backend: on('voice:start')
     │
     ├─► console.log("🎤 Recording started for session: abc123...")
     │
     ├─► socket.join(`voice:${sessionId}`)
     │
     └─► socket.emit('voice:started', { sessionId, message })
     
Frontend: Receives 'voice:started' acknowledgment
```

### 2. Audio Streaming Sequence (Repeats every ~100ms)

```
MediaRecorder: ondataavailable event fires (every 100ms)
     │
     ├─► event.data (Blob) available
     │   Size: ~500-5000 bytes (varies with speech)
     │
     ▼
Frontend: Convert Blob → ArrayBuffer
     │
     ├─► event.data.arrayBuffer()
     │
     └─► socket.emit('voice:chunk', {
           sessionId: "abc123...",
           audio: ArrayBuffer(1024),  // Binary audio data
           timestamp: 1705320645123
         })
     │
     ├─► console.log("[Voice] Sent audio chunk: 1024 bytes")
     │
     ▼
Backend: on('voice:chunk')
     │
     ├─► Extract data: { sessionId, audio, timestamp }
     │
     ├─► Calculate size: audio.byteLength
     │
     ├─► console.log("📦 Chunk received:", {
     │     sessionId: 'abc123...',
     │     size: '1024 bytes',
     │     timestamp: '2024-01-15T10:30:45.123Z',
     │     user: 'user@example.com'
     │   })
     │
     └─► socket.emit('voice:chunk-received', {
           sessionId,
           size: 1024,
           timestamp,
           message: "Received 1024 bytes at 10:30:45"
         })
     
Frontend: Receives acknowledgment (optional logging)
```

### 3. Recording Stop Sequence

```
User Action: Click ⏹️ button
     │
     ▼
Frontend: toggleVoiceRecording()
     │
     ├─► stopVoiceRecording()
     │   │
     │   ├─► mediaRecorder.stop()
     │   │   └─► Triggers 'onstop' event
     │   │       └─► socket.emit('voice:end', { sessionId })
     │   │
     │   ├─► audioStream.getTracks().forEach(track => track.stop())
     │   │   └─► Release microphone
     │   │
     │   ├─► setIsRecording(false)  // Update UI to green button
     │   │
     │   └─► console.log("[Voice] Recording stopped and cleaned up")
     │
     ▼
Backend: on('voice:end')
     │
     ├─► console.log("🛑 Recording stopped for session: abc123...")
     │
     ├─► socket.leave(`voice:${sessionId}`)
     │
     └─► socket.emit('voice:stopped', { sessionId, message })
     
Frontend: Receives 'voice:stopped' acknowledgment
```

## State Diagram

```
                         ┌─────────┐
                         │  IDLE   │
                         │  (🎤)   │
                         └────┬────┘
                              │
                     User clicks button
                              │
                              ▼
                   ┌──────────────────────┐
                   │ REQUESTING_PERMISSION │
                   └──────────┬────────────┘
                              │
                    Browser prompt appears
                              │
                  ┌───────────┴───────────┐
                  │                       │
            Permission Denied       Permission Granted
                  │                       │
                  ▼                       ▼
           ┌──────────┐           ┌────────────┐
           │  ERROR   │           │ RECORDING  │
           │ (show msg)│           │    (⏹️)    │
           └─────┬────┘           └─────┬──────┘
                 │                      │
                 │               Audio chunks streaming
                 │               (~10 chunks/second)
                 │                      │
                 │              User clicks stop
                 │                      │
                 │                      ▼
                 │               ┌─────────────┐
                 │               │  STOPPING   │
                 │               │ (cleanup)   │
                 │               └──────┬──────┘
                 │                      │
                 └──────────┬───────────┘
                            │
                            ▼
                        ┌─────────┐
                        │  IDLE   │
                        │  (🎤)   │
                        └─────────┘
```

## Component Interaction Diagram

```
┌─────────────────────────────────────────────────────────────────────┐
│                       React Component Tree                           │
│                                                                      │
│                          App.tsx                                     │
│                             │                                        │
│                             ▼                                        │
│                        Dashboard.tsx                                 │
│                             │                                        │
│                             ▼                                        │
│                    ┌─────────────────┐                              │
│                    │ AssistantChat   │                              │
│                    │    Component    │                              │
│                    └────────┬────────┘                              │
│                             │                                        │
│              ┌──────────────┼──────────────┐                        │
│              │              │              │                        │
│              ▼              ▼              ▼                        │
│        ┌─────────┐   ┌──────────┐  ┌──────────┐                   │
│        │ useSocket│   │ useState │  │ useEffect│                   │
│        │  Hook    │   │  Hooks   │  │  Hooks   │                   │
│        └────┬────┘   └────┬─────┘  └────┬─────┘                   │
│             │             │             │                           │
│             │     ┌───────┴───────┐     │                           │
│             │     │               │     │                           │
│             ▼     ▼               ▼     ▼                           │
│        ┌─────────────────────────────────────┐                     │
│        │     Component State & Props          │                     │
│        │                                      │                     │
│        │  - sessionId                         │                     │
│        │  - messages                          │                     │
│        │  - isRecording                       │                     │
│        │  - audioStream                       │                     │
│        │  - mediaRecorderRef                  │                     │
│        │  - socket (from useSocket)           │                     │
│        └─────────────────────────────────────┘                     │
└─────────────────────────────────────────────────────────────────────┘
                              │
                              │ Socket.IO Connection
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────────┐
│                      Backend Architecture                            │
│                                                                      │
│                         index.ts                                     │
│                            │                                         │
│                            ├─► Express Server (HTTP)                 │
│                            │   └─► REST API Routes                   │
│                            │                                         │
│                            └─► Socket.IO Server (WebSocket)          │
│                                └─► initializeSocketIO()              │
│                                    │                                 │
│                    ┌───────────────┼────────────────┐               │
│                    │               │                │               │
│                    ▼               ▼                ▼               │
│              ┌──────────┐   ┌────────────┐  ┌────────────┐         │
│              │   Auth   │   │    Chat    │  │   Voice    │         │
│              │Middleware│   │  Handlers  │  │  Handlers  │         │
│              └────┬─────┘   └─────┬──────┘  └─────┬──────┘         │
│                   │               │               │                 │
│                   └───────────────┴───────────────┘                 │
│                                   │                                 │
│                                   ▼                                 │
│                          ┌─────────────────┐                        │
│                          │ Socket Instance │                        │
│                          │                 │                        │
│                          │ - user info     │                        │
│                          │ - sessionId     │                        │
│                          │ - rooms         │                        │
│                          └─────────────────┘                        │
└─────────────────────────────────────────────────────────────────────┘
```

## Data Structure

### Frontend Voice State

```typescript
// Component State
{
  sessionId: "abc123def456...",              // Current chat session
  isRecording: false,                        // Boolean recording status
  audioStream: MediaStream | null,           // Browser audio stream
  mediaRecorderRef: {
    current: MediaRecorder | null            // Recorder instance
  },
  socket: Socket | null                      // Socket.IO connection
}
```

### WebSocket Events

```typescript
// voice:start event
{
  sessionId: string;                         // "abc123..."
}

// voice:chunk event
{
  sessionId: string;                         // "abc123..."
  audio: ArrayBuffer;                        // Binary audio data (500-5000 bytes)
  timestamp: number;                         // Unix timestamp (ms)
}

// voice:end event
{
  sessionId: string;                         // "abc123..."
}

// voice:chunk-received event (acknowledgment)
{
  sessionId: string;                         // "abc123..."
  size: number;                              // Chunk size in bytes
  timestamp: number;                         // Unix timestamp (ms)
  message: string;                           // Human-readable log
}
```

## File Structure

```
ai-services-platform/
├── frontend/
│   └── src/
│       └── components/
│           └── AssistantChat.tsx          ← Voice UI & streaming logic
│
├── backend-node/
│   └── src/
│       ├── config/
│       │   └── socket.ts                  ← Socket.IO initialization
│       │                                     (imports voice handlers)
│       └── sockets/
│           ├── chat-socket.ts             ← Existing chat handlers
│           └── voice-socket.ts            ← NEW: Voice event handlers
│
└── docs/
    ├── VOICE-STREAMING.md                 ← Full documentation
    ├── VOICE-STREAMING-SUMMARY.md         ← Quick summary
    └── VOICE-STREAMING-DIAGRAM.md         ← This file
```

## Network Traffic Example

```
Time    Direction  Event                Size        Data
────────────────────────────────────────────────────────────────────
0.000s  C→S       voice:start           50 bytes   { sessionId: "abc..." }
0.001s  S→C       voice:started         80 bytes   { sessionId: "abc...", message: "..." }

0.100s  C→S       voice:chunk          1024 bytes  { sessionId, audio: [binary], timestamp }
0.101s  S→C       voice:chunk-received  120 bytes  { sessionId, size: 1024, ... }

0.200s  C→S       voice:chunk          2048 bytes  { sessionId, audio: [binary], timestamp }
0.201s  S→C       voice:chunk-received  120 bytes  { sessionId, size: 2048, ... }

0.300s  C→S       voice:chunk          1536 bytes  { sessionId, audio: [binary], timestamp }
0.301s  S→C       voice:chunk-received  120 bytes  { sessionId, size: 1536, ... }

...     ...       ...                   ...         ... (continues every ~100ms)

5.000s  C→S       voice:end             50 bytes   { sessionId: "abc..." }
5.001s  S→C       voice:stopped         80 bytes   { sessionId: "abc...", message: "..." }

────────────────────────────────────────────────────────────────────
Total for 5 seconds of speech: ~30-50KB upstream, ~3KB downstream
```

## Browser Compatibility

```
Feature              Chrome  Edge  Firefox  Safari  Mobile
─────────────────────────────────────────────────────────
MediaRecorder API      ✅     ✅      ✅      ✅      ✅
getUserMedia           ✅     ✅      ✅      ✅      ✅
WebSocket/Socket.IO    ✅     ✅      ✅      ✅      ✅
audio/webm codec       ✅     ✅      ✅      ⚠️      ⚠️
ArrayBuffer            ✅     ✅      ✅      ✅      ✅

✅ = Fully supported
⚠️ = May need fallback codec (use audio/mp4 or audio/ogg)
```

---

**Diagram Version**: 1.0  
**Last Updated**: January 15, 2024  
**Implementation Status**: ✅ Complete
