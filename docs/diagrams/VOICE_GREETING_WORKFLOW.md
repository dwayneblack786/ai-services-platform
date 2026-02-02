# Voice Greeting Workflow Diagrams

This document contains visual workflow diagrams for the voice greeting system implementation.

## Table of Contents
1. [Frontend User Workflow](#frontend-user-workflow)
2. [System Sequence Diagram](#system-sequence-diagram)
3. [State Machine Diagram](#state-machine-diagram)
4. [Component Interaction](#component-interaction)
5. [Error Handling Flow](#error-handling-flow)

---

## Frontend User Workflow

### Voice Session Initialization Flow

```mermaid
flowchart TD
    Start([User Opens Voice Demo]) --> CheckAuth{Authenticated?}
    CheckAuth -->|No| Login[Redirect to Login]
    CheckAuth -->|Yes| ShowUI[Show Voice Chat UI]
    
    ShowUI --> WaitClick[Voice Button Ready 🎤]
    WaitClick --> UserClick[User Clicks Voice Button]
    
    UserClick --> CheckGreeting{Greeting Played Before?}
    CheckGreeting -->|Yes greetingState='played'| StartMic[Request Microphone Permission]
    CheckGreeting -->|No greetingState='none'| InitSession[Initialize Voice Session]
    
    InitSession --> ShowInit[🕐 Show 'Initializing...' UI]
    ShowInit --> EmitEvent[Emit 'voice:session:init']
    EmitEvent --> WaitResponse{Wait for Response 10s}
    
    WaitResponse -->|Timeout| SkipGreeting[Skip Greeting, Start Mic]
    WaitResponse -->|Error| SkipGreeting
    WaitResponse -->|Success| ReceiveGreeting[Receive Greeting Data]
    
    ReceiveGreeting --> HasAudio{Has Audio?}
    HasAudio -->|Yes| PlayAudio[👋 Play Greeting Audio]
    HasAudio -->|No| ShowText[Show Greeting Text Only]
    
    PlayAudio --> AudioPlaying[🔊 'Playing greeting...' UI]
    AudioPlaying --> WaitEnd{Audio Ends or Skip?}
    WaitEnd -->|Ended| AddHistory[Add Greeting to Message History]
    WaitEnd -->|Skip Button| AddHistory
    
    ShowText --> AddHistory
    AddHistory --> MarkPlayed[Set greetingState = 'played']
    MarkPlayed --> StartMic
    
    SkipGreeting --> StartMic
    
    StartMic --> MicPermission{Permission Granted?}
    MicPermission -->|No| ShowError[❌ Show Error: 'Microphone permission denied']
    MicPermission -->|Yes| Recording[🎤 Recording... User Speaks]
    
    Recording --> UserStops[User Clicks Stop]
    UserStops --> ProcessAudio[Process Audio with STT]
    ProcessAudio --> SendToLLM[Send Transcript to Assistant]
    SendToLLM --> GetResponse[Receive Assistant Response]
    GetResponse --> PlayResponse[🔊 Play TTS Response]
    
    PlayResponse --> VoiceEnd([Voice Session Active])
    ShowError --> End([Session Ended])
    
    style Start fill:#e1f5e1
    style VoiceEnd fill:#e1f5e1
    style ShowError fill:#ffe1e1
    style End fill:#ffe1e1
    style InitSession fill:#fff4e1
    style PlayAudio fill:#e1f0ff
    style Recording fill:#f0e1ff
```

---

## System Sequence Diagram

### Complete Voice Greeting Sequence

```mermaid
sequenceDiagram
    actor User
    participant Frontend as React Frontend
    participant WS as Node.js WebSocket
    participant Java as Java Backend
    participant LLM as LM Studio
    participant TTS as Azure TTS
    participant DB as MongoDB

    Note over User,DB: Phase 1: Session Initialization
    
    User->>Frontend: Click Voice Button
    activate Frontend
    Frontend->>Frontend: Check greetingState === 'none'
    Frontend->>Frontend: Set greetingState = 'initializing'
    Frontend->>Frontend: Update UI: "⏳ Initializing..."
    
    Frontend->>WS: voice:session:init<br/>{sessionId, customerId, productId, tenantId}
    activate WS
    
    WS->>Java: POST /voice/session<br/>{callId, customerId, tenantId, productId}
    activate Java
    
    Note over Java,LLM: Phase 2: Greeting Generation
    
    Java->>LLM: Generate Greeting Prompt<br/>"Create friendly greeting for {tenant}, {product}"
    activate LLM
    LLM-->>Java: Greeting Text<br/>"Hello! How can I assist you today?"
    deactivate LLM
    
    Java->>TTS: Synthesize(greetingText, voice='en-US-JennyNeural')
    activate TTS
    TTS-->>Java: WAV Audio Bytes
    deactivate TTS
    
    Java->>DB: Store AssistantCall<br/>{callId, greetingText, greetingAudio(Base64)}
    activate DB
    DB-->>Java: Success
    deactivate DB
    
    Java-->>WS: VoiceSessionResponse<br/>{sessionId, greetingText, greetingAudio}
    deactivate Java
    
    WS->>WS: Prepare Greeting Object
    WS-->>Frontend: voice:session:initialized<br/>{sessionId, greeting{text, audio}, status}
    deactivate WS
    
    Note over User,Frontend: Phase 3: Greeting Playback
    
    Frontend->>Frontend: Set greetingState = 'playing'
    Frontend->>Frontend: Update UI: "👋 Playing greeting..."
    Frontend->>Frontend: Decode Base64 → Blob → Audio
    
    Frontend->>User: 🔊 Play Audio<br/>"Hello! How can I assist you today?"
    activate User
    User-->>Frontend: Audio Playback Ends
    deactivate User
    
    Frontend->>Frontend: Add Greeting to Message History
    Frontend->>Frontend: Set greetingState = 'played'
    Frontend->>Frontend: Set voiceStatus = 'idle'
    
    Note over User,Frontend: Phase 4: Microphone Activation
    
    Frontend->>Frontend: Request Microphone Permission
    Frontend->>User: 🎤 Microphone Ready
    deactivate Frontend
    
    User->>Frontend: Speak...
    activate Frontend
    Frontend->>WS: voice:chunk<br/>{sessionId, audio, timestamp}
    activate WS
    WS-->>Frontend: voice:chunk-received
    deactivate WS
    
    User->>Frontend: Click Stop
    Frontend->>WS: voice:end<br/>{sessionId}
    activate WS
    
    WS->>Java: Transcribe(audio)
    activate Java
    Java-->>WS: Transcription Text
    WS->>Java: Process Message
    Java-->>WS: Assistant Response
    deactivate Java
    
    WS->>Java: TTS Synthesize(response)
    activate Java
    Java-->>WS: TTS Audio
    deactivate Java
    
    WS-->>Frontend: voice:transcription<br/>{text, isFinal: true}
    WS-->>Frontend: chat:message-received<br/>{role: 'assistant', content}
    WS-->>Frontend: voice:audio-response<br/>{audioData, format, metadata}
    deactivate WS
    
    Frontend->>User: 🔊 Play Assistant Response
    deactivate Frontend
    
    Note over User,DB: Voice Conversation Active
```

---

## State Machine Diagram

### Greeting State Transitions

```mermaid
stateDiagram-v2
    [*] --> None: Component Mounted
    
    None --> Initializing: User Clicks Voice Button<br/>(first time)
    None --> Listening: User Clicks Voice Button<br/>(if already played)
    
    Initializing --> Playing: Greeting Received<br/>with Audio
    Initializing --> Played: Greeting Received<br/>without Audio
    Initializing --> None: Timeout (10s) or Error
    
    Playing --> Played: Audio Playback Ends
    Playing --> Played: User Clicks Skip Button
    
    Played --> Listening: Microphone Permission Granted
    Played --> None: Microphone Permission Denied
    
    Listening --> Processing: User Stops Recording
    Processing --> Speaking: TTS Audio Ready
    Speaking --> Idle: Audio Playback Ends
    Idle --> Listening: User Clicks Voice Button Again
    
    None --> [*]: Component Unmounted
    
    note right of None
        Initial state
        Voice button: Green
        Enabled: Yes
    end note
    
    note right of Initializing
        Fetching greeting
        Voice button: Amber
        Enabled: No
        UI: "⏳ Preparing..."
    end note
    
    note right of Playing
        Playing greeting audio
        Voice button: Amber
        Enabled: No
        UI: "👋 Playing greeting..."
        Actions: Skip button visible
    end note
    
    note right of Played
        Greeting completed
        Voice button: Green
        Enabled: Yes
        Greeting in message history
    end note
    
    note right of Listening
        Recording user audio
        Voice button: Red
        Enabled: Yes
        UI: "🎤 Listening..."
    end note
    
    note right of Processing
        Transcribing audio
        Voice button: Amber
        Enabled: No
        UI: "⚙️ Processing..."
    end note
    
    note right of Speaking
        Playing TTS response
        Voice button: Amber
        Enabled: No
        UI: "🔊 Speaking..."
        Actions: Stop button visible
    end note
```

---

## Component Interaction

### Frontend Component Architecture

```mermaid
graph TB
    subgraph "React Frontend"
        VoiceDemo[VoiceDemo Page]
        AssistantChat[AssistantChat Component]
        VoiceButton[Voice Button]
        StatusIndicator[Voice Status Indicator]
        MessageHistory[Message History]
        AudioPlayer[Audio Player Ref]
        GreetingAudio[Greeting Audio Ref]
        
        VoiceDemo --> AssistantChat
        AssistantChat --> VoiceButton
        AssistantChat --> StatusIndicator
        AssistantChat --> MessageHistory
        AssistantChat --> AudioPlayer
        AssistantChat --> GreetingAudio
    end
    
    subgraph "State Management"
        SessionState[sessionId: string]
        GreetingState[greetingState: none|initializing|playing|played]
        VoiceStatus[voiceStatus: idle|listening|processing|speaking]
        GreetingData[greetingAudio: string<br/>greetingText: string]
        Messages[messages: Message[]]
        
        AssistantChat --> SessionState
        AssistantChat --> GreetingState
        AssistantChat --> VoiceStatus
        AssistantChat --> GreetingData
        AssistantChat --> Messages
    end
    
    subgraph "Socket.IO Client"
        SocketHook[useSocket Hook]
        SocketConnection[Socket Instance]
        
        AssistantChat --> SocketHook
        SocketHook --> SocketConnection
    end
    
    subgraph "Audio Processing"
        MediaRecorder[MediaRecorder API]
        AudioContext[Audio Context]
        Base64Decoder[Base64 Decoder]
        BlobCreator[Blob Creator]
        URLCreator[URL.createObjectURL]
        
        AssistantChat --> MediaRecorder
        AssistantChat --> AudioContext
        AssistantChat --> Base64Decoder
        Base64Decoder --> BlobCreator
        BlobCreator --> URLCreator
        URLCreator --> GreetingAudio
    end
    
    subgraph "Functions"
        InitVoice[initializeVoiceSession]
        PlayGreeting[playGreetingAudio]
        StartRecord[startVoiceRecording]
        StopRecord[stopVoiceRecording]
        ToggleRecord[toggleVoiceRecording]
        
        VoiceButton --> ToggleRecord
        ToggleRecord --> StartRecord
        ToggleRecord --> StopRecord
        StartRecord --> InitVoice
        InitVoice --> PlayGreeting
        PlayGreeting --> GreetingAudio
    end
    
    SocketConnection -->|voice:session:init| Backend[Node.js Backend]
    Backend -->|voice:session:initialized| SocketConnection
    
    style AssistantChat fill:#e1f0ff
    style GreetingState fill:#fff4e1
    style PlayGreeting fill:#e1ffe1
```

---

## Error Handling Flow

### Error Recovery Workflow

```mermaid
flowchart TD
    Start([Voice Button Clicked]) --> InitSession[Initialize Voice Session]
    
    InitSession --> EmitEvent[Emit voice:session:init]
    EmitEvent --> WaitResponse{Wait for Response}
    
    WaitResponse -->|Success| CheckAudio{Has Greeting Audio?}
    WaitResponse -->|Timeout 10s| TimeoutError[Error: Timeout]
    WaitResponse -->|Network Error| NetworkError[Error: Network Failed]
    WaitResponse -->|Server Error| ServerError[Error: Server 500]
    
    CheckAudio -->|Yes| DecodeAudio[Decode Base64 Audio]
    CheckAudio -->|No| TextOnly[Display Text Greeting Only]
    
    DecodeAudio --> ValidAudio{Audio Valid?}
    ValidAudio -->|Yes| CreateBlob[Create Audio Blob]
    ValidAudio -->|No| AudioError[Error: Invalid Audio Format]
    
    CreateBlob --> PlayAudio[Play Audio]
    PlayAudio --> AutoplayCheck{Autoplay Allowed?}
    
    AutoplayCheck -->|Yes| PlaySuccess[✅ Greeting Plays]
    AutoplayCheck -->|No| AutoplayError[Error: Autoplay Blocked]
    
    TimeoutError --> LogError1[Log: Timeout waiting for greeting]
    NetworkError --> LogError2[Log: Network connection failed]
    ServerError --> LogError3[Log: Server error response]
    AudioError --> LogError4[Log: Invalid audio format]
    AutoplayError --> LogError5[Log: Browser autoplay policy]
    
    LogError1 --> Fallback1[Skip Greeting]
    LogError2 --> Fallback1
    LogError3 --> Fallback1
    LogError4 --> Fallback1
    LogError5 --> ShowButton[Show 'Click to Play' Button]
    
    TextOnly --> MarkPlayed1[Set greetingState = 'played']
    ShowButton --> UserClick[User Clicks Play Button]
    UserClick --> PlayAudio
    
    PlaySuccess --> MarkPlayed2[Set greetingState = 'played']
    MarkPlayed1 --> Continue[Continue to Microphone]
    MarkPlayed2 --> Continue
    Fallback1 --> Continue
    
    Continue --> RequestMic[Request Microphone Permission]
    RequestMic --> MicPermission{Permission?}
    
    MicPermission -->|Granted| StartRecording[✅ Start Recording]
    MicPermission -->|Denied| MicError[Error: Permission Denied]
    MicPermission -->|Not Found| MicNotFound[Error: No Microphone Found]
    MicPermission -->|In Use| MicInUse[Error: Microphone In Use]
    
    MicError --> ShowMicError[Show User-Friendly Error<br/>'Please grant microphone permission']
    MicNotFound --> ShowMicError
    MicInUse --> ShowMicError
    
    ShowMicError --> End([Session Blocked])
    StartRecording --> Recording([Voice Session Active])
    
    style Start fill:#e1f5e1
    style Recording fill:#e1f5e1
    style End fill:#ffe1e1
    style TimeoutError fill:#ffe1e1
    style NetworkError fill:#ffe1e1
    style ServerError fill:#ffe1e1
    style AudioError fill:#ffe1e1
    style AutoplayError fill:#fff4e1
    style MicError fill:#ffe1e1
    style MicNotFound fill:#ffe1e1
    style MicInUse fill:#ffe1e1
    style Fallback1 fill:#fff4e1
    style PlaySuccess fill:#e1ffe1
    style StartRecording fill:#e1ffe1
```

---

## WebSocket Event Flow

### Socket.IO Event Sequence

```mermaid
sequenceDiagram
    participant C as Client (React)
    participant WS as WebSocket (Socket.IO)
    participant N as Node.js Handler
    participant J as Java Service

    Note over C,J: Connection Phase
    C->>WS: Connect with JWT Token
    WS->>N: Authenticate Token
    N-->>WS: Auth Success
    WS-->>C: 'connect' event
    C->>C: setConnectionStatus('connected')

    Note over C,J: Voice Session Initialization
    C->>WS: emit('voice:session:init')<br/>{sessionId, customerId, productId, tenantId}
    WS->>N: Handle 'voice:session:init'
    N->>J: POST /voice/session<br/>{callId, customerId, tenantId, productId}
    J->>J: Generate Greeting (LLM + TTS)
    J-->>N: {sessionId, greetingText, greetingAudio}
    N->>N: Prepare VoiceGreeting object
    N->>WS: emit('voice:session:initialized')<br/>{sessionId, greeting, status}
    WS-->>C: Receive 'voice:session:initialized'
    C->>C: setGreetingAudio(greeting.audio)
    C->>C: setGreetingText(greeting.text)
    C->>C: playGreetingAudio()

    alt Initialization Error
        N->>WS: emit('voice:session:init:error')<br/>{error, details}
        WS-->>C: Receive error event
        C->>C: Skip greeting, continue to microphone
    end

    Note over C,J: Voice Recording Phase
    C->>WS: emit('voice:start')<br/>{sessionId}
    WS-->>C: emit('voice:started')<br/>{sessionId, message}
    
    loop Audio Chunks
        C->>WS: emit('voice:chunk')<br/>{sessionId, audio, timestamp}
        WS-->>C: emit('voice:chunk-received')<br/>{sessionId, size, timestamp}
    end
    
    C->>WS: emit('voice:end')<br/>{sessionId}
    WS->>J: Transcribe(audio)
    J-->>WS: {text, confidence}
    WS-->>C: emit('voice:transcription')<br/>{text, isFinal: true}
    
    WS->>J: Process Message (LLM)
    J-->>WS: {message, intent}
    WS-->>C: emit('chat:message-received')<br/>{role, content, intent}
    
    WS->>J: TTS Synthesize(message)
    J-->>WS: {audioData, format, metadata}
    WS-->>C: emit('voice:audio-response')<br/>{audioData, format, metadata}
    
    C->>C: Play TTS Response

    Note over C,J: Disconnection
    C->>WS: disconnect()
    WS->>N: Handle 'disconnect'
    N->>N: Clean up audio buffers
    N-->>WS: Disconnect acknowledged
```

---

## UI State Transitions

### Visual State Changes

```mermaid
graph LR
    subgraph "Voice Button States"
        GreenMic[🎤 Green<br/>Ready to Record]
        AmberClock[🕐 Amber<br/>Initializing]
        AmberWave[👋 Amber<br/>Playing Greeting]
        RedStop[⏹️ Red<br/>Recording]
    end
    
    subgraph "Status Banner States"
        None1[No Banner]
        Initializing[⏳ Preparing voice assistant...<br/>Generating personalized greeting]
        PlayingGreeting[👋 Playing greeting...<br/>[Skip Button]]
        Listening[🎤 Listening...<br/>Click the microphone to stop]
        Processing[⚙️ Processing speech...]
        Speaking[🔊 Assistant is speaking...<br/>[Stop Button]]
    end
    
    GreenMic -->|Click| AmberClock
    AmberClock -->|Greeting Ready| AmberWave
    AmberWave -->|Audio Ends| GreenMic
    GreenMic -->|Start Recording| RedStop
    RedStop -->|Stop| GreenMic
    
    None1 -->|Initialize| Initializing
    Initializing -->|Greeting Ready| PlayingGreeting
    PlayingGreeting -->|Audio Ends| None1
    None1 -->|Start Recording| Listening
    Listening -->|Stop Recording| Processing
    Processing -->|Response Ready| Speaking
    Speaking -->|Audio Ends| None1
    
    style GreenMic fill:#10b981
    style RedStop fill:#ef4444
    style AmberClock fill:#f59e0b
    style AmberWave fill:#f59e0b
    style None1 fill:#f3f4f6
    style Initializing fill:#fef3c7
    style PlayingGreeting fill:#d1fae5
    style Listening fill:#dbeafe
    style Processing fill:#fef3c7
    style Speaking fill:#d1fae5
```

---

## Comparison: VoIP vs Web Client Workflows

### Side-by-Side Comparison

```mermaid
flowchart LR
    subgraph "VoIP Provider Flow"
        direction TB
        VP1[VoIP Provider<br/>Twilio/Vonage/Bandwidth] --> VP2[Incoming Call Webhook]
        VP2 --> VP3[voice-routes.ts<br/>POST /voice/webhooks/:provider]
        VP3 --> VP4[Call Java REST API<br/>Store Greeting in MongoDB]
        VP4 --> VP5[Return WebSocket Stream URL<br/>wss://domain/voip-stream]
        VP5 --> VP6[Provider Connects to WebSocket]
        VP6 --> VP7[voip-stream-socket.ts<br/>Load Greeting from DB]
        VP7 --> VP8[Send Greeting as First Audio Chunk<br/>Format: μ-law/PCM]
        VP8 --> VP9[Bidirectional Audio Streaming]
    end
    
    subgraph "Web Client Flow"
        direction TB
        WC1[React Frontend<br/>User Clicks Voice Button] --> WC2[Check greetingState]
        WC2 --> WC3[Emit voice:session:init<br/>via Socket.IO]
        WC3 --> WC4[voice-socket.ts<br/>Handle Event]
        WC4 --> WC5[Call Java REST API<br/>Get Greeting Immediately]
        WC5 --> WC6[Emit voice:session:initialized<br/>with Greeting Data]
        WC6 --> WC7[Frontend Receives Greeting]
        WC7 --> WC8[Decode Base64 → Play Audio<br/>Format: WAV]
        WC8 --> WC9[Start Microphone<br/>Bidirectional Audio Streaming]
    end
    
    VP1 -.Connection.-> VP9
    WC1 -.Connection.-> WC9
    
    style VP1 fill:#e1f0ff
    style VP9 fill:#e1ffe1
    style WC1 fill:#f0e1ff
    style WC9 fill:#e1ffe1
```

### Key Differences

| Aspect | VoIP Provider | Web Client |
|--------|---------------|------------|
| **Trigger** | Incoming phone call | User clicks voice button |
| **Authentication** | None (webhook validates signature) | JWT token required |
| **Namespace** | `/voip-stream` (separate) | Main namespace with auth |
| **Greeting Storage** | MongoDB (loaded on WebSocket connect) | Sent directly in Socket.IO event |
| **Audio Format** | Provider-specific (μ-law 8kHz for Twilio, PCM 16kHz for Vonage) | WAV 24kHz (browser-compatible) |
| **Greeting Delivery** | First audio chunk in stream (sendGreeting() function) | Base64 in event payload (playGreetingAudio() function) |
| **Session Lifecycle** | Provider manages call state | Frontend manages recording state |
| **Error Handling** | Call proceeds without greeting | Skip greeting, show UI message |

---

## Performance Metrics

### Expected Timings

```mermaid
gantt
    title Voice Greeting Initialization Timeline
    dateFormat X
    axisFormat %Ls
    
    section User Action
    User Clicks Button            :milestone, 0, 0
    
    section Frontend
    Emit voice:session:init       :a1, 0, 50
    Wait for response             :a2, 50, 10000
    Receive greeting data         :milestone, 2500, 0
    Decode Base64                 :a3, 2500, 100
    Create Blob                   :a4, 2600, 50
    Start audio playback          :milestone, 2650, 0
    Play greeting (2s audio)      :a5, 2650, 2000
    Add to message history        :a6, 4650, 50
    Request microphone            :a7, 4700, 200
    Microphone ready              :milestone, 4900, 0
    
    section Backend
    Receive init event            :b1, 50, 50
    Call Java REST API            :b2, 100, 2000
    Prepare response              :b3, 2100, 50
    Emit initialized event        :b4, 2150, 50
    
    section Java Service
    Receive REST request          :c1, 100, 50
    Call LLM                      :c2, 150, 1500
    Call TTS                      :c3, 1650, 300
    Store in MongoDB              :c4, 1950, 100
    Return response               :c5, 2050, 50
    
    section Total Time
    End-to-End Latency            :crit, 0, 4900
```

**Target Performance:**
- **Greeting Generation:** 1.5-2.5 seconds (LLM + TTS)
- **Network Round Trip:** 100-200ms
- **Audio Playback:** 2-3 seconds (greeting length)
- **Microphone Activation:** 100-200ms
- **Total Time to Recording:** ~5 seconds

---

## Revision History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2025-01-28 | AI Services Team | Initial workflow diagrams for Phase 3 |

---

## Related Documents

- [Voice Greeting Implementation Guide](../VOICE_GREETING_IMPLEMENTATION.md)
- [VoIP Voice Sessions](../VOIP_VOICE_SESSIONS.md)
- [Platform Architecture](../Platform%20Architecture%20Diagram.ini)

