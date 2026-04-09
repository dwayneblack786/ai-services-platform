# Client Workflow Diagrams

This document explains how NodeBackendClient, SttClient, TtsClient, and LlmClient work in Java services for both voice and chat scenarios, and their relationship to the backend-node.

## Table of Contents
- [Architecture Overview](#architecture-overview)
- [Client Components](#client-components)
- [Voice Scenario Workflow](#voice-scenario-workflow)
- [Chat Scenario Workflow](#chat-scenario-workflow)
- [Relationship to Backend-Node](#relationship-to-backend-node)
- [Data Flow Diagrams](#data-flow-diagrams)
- [Sequence Diagrams](#sequence-diagrams)

---

## Architecture Overview

```
┌──────────────────────────────────────────────────────────────────────────┐
│                         FRONTEND (React + Vite)                          │
│                                                                          │
│  - Chat UI                                                               │
│  - Voice Call Interface (WebRTC/Twilio)                                 │
│  - Dashboard                                                             │
└────────────┬─────────────────────────────────────────────────┬──────────┘
             │                                                 │
             │ HTTP/WebSocket                                  │ WebRTC/Twilio
             │                                                 │
             ▼                                                 ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                     BACKEND-NODE (Express + TypeScript)                 │
│                                                                         │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐                 │
│  │ Auth Routes  │  │ Voice Routes │  │ Chat Routes  │                 │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘                 │
│         │                  │                  │                         │
│         └──────────────────┼──────────────────┘                         │
│                            │                                            │
│         ┌──────────────────▼───────────────────────┐                   │
│         │     ApiClient (Circuit Breaker)          │                   │
│         │  - Retry Logic                           │                   │
│         │  - Fault Tolerance                       │                   │
│         │  - Health Monitoring                     │                   │
│         └──────────────────┬───────────────────────┘                   │
│                            │                                            │
└────────────────────────────┼────────────────────────────────────────────┘
                             │ HTTP POST/GET
                             │ (JSON payloads)
                             ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                   JAVA VA SERVICE (Spring Boot)                         │
│                                                                         │
│  ┌────────────────────────────────────────────────────────────┐        │
│  │              VoiceSessionController                        │        │
│  │              ChatSessionController                         │        │
│  └──────────────┬─────────────────────────────────────────────┘        │
│                 │                                                       │
│                 ▼                                                       │
│  ┌────────────────────────────────────────────────────────────┐        │
│  │         VoiceSessionService / ChatSessionService           │        │
│  │         (Orchestrates Pipeline)                            │        │
│  └──────┬──────┬──────┬──────┬──────────────────────┬────────┘        │
│         │      │      │      │                      │                  │
│         ▼      ▼      ▼      ▼                      ▼                  │
│  ┌──────────┐ ┌────┐ ┌────┐ ┌────┐         ┌──────────────────┐       │
│  │STT Client│ │TTS │ │LLM │ │DM  │         │UsageMetricsClient│       │
│  └──────────┘ │    │ │    │ │    │         └─────────┬────────┘       │
│  (Whisper/    │    │ │    │ │    │                   │                │
│   Azure)      │    │ │    │ │    │                   │ HTTP POST      │
│               └────┘ └────┘ └────┘                   │ Usage Metrics  │
│                                                       │                │
└───────────────────────────────────────────────────────┼────────────────┘
                                                        │
                                                        ▼
                              ┌────────────────────────────────────┐
                              │   MongoDB                          │
                              │  - assistant_calls.usage           │
                              │  - subscriptions.usage             │
                              │  - chat_history                    │
                              │  - voice_transcripts               │
                              └────────────────────────────────────┘
```

---

## Client Components

### 1. **UsageMetricsClient** 
**Location:** `services-java/va-service/src/main/java/com/ai/va/client/UsageMetricsClient.java`

**Purpose:** Report usage metrics from Java VA service to Node.js backend for billing

**Responsibilities:**
- **POST** usage metrics to Node backend (`/api/usage/assistant-call`)
- **GET** health check of Node backend (`/api/health`)
- Update billing records in MongoDB via Node backend

**Configuration:**
```properties
node.backend.url=http://localhost:5000
```

**Key Methods:**
```java
public boolean postUsageMetrics(UsageUpdate usage)
public boolean isBackendAvailable()
```

**Usage Flow:**
```
Java Service → UsageMetricsClient → HTTP POST → Node Backend → MongoDB
```

---

### 2. **SttClient** (Speech-to-Text)
**Location:** `services-java/va-service/src/main/java/com/ai/va/client/SttClient.java`

**Purpose:** Convert audio to text (Voice scenarios only)

**Current Implementation:** Mock/Placeholder (Phase 1 implementation in progress)

**Planned Providers:**
- **Whisper** (Local/OpenAI) - Phase 1 ✅
- **Azure Speech Services** - Phase 1 ✅
- **Google Cloud STT**
- **AWS Transcribe**
- **AssemblyAI**

**Key Methods:**
```java
public String transcribe(String audioChunk, String language)
public void startStream(String sessionId)
public void endStream(String sessionId)
```

**Phase 1 Update:** Being replaced by `WhisperSttService` and `AzureSpeechSttService` with provider factory pattern.

---

### 3. **TtsClient** (Text-to-Speech)
**Location:** `services-java/va-service/src/main/java/com/ai/va/client/TtsClient.java`

**Purpose:** Convert text to audio (Voice scenarios only)

**Current Implementation:** Mock/Placeholder

**Planned Providers:**
- **Google Cloud TTS**
- **AWS Polly**
- **Azure Speech Services**
- **ElevenLabs**

**Key Methods:**
```java
public String synthesize(String text, String voiceId, String language, double speechRate)
public String[] listVoices(String language)
```

**Output:** Base64 encoded audio

---

### 4. **LlmClient** (Large Language Model)
**Location:** `services-java/va-service/src/main/java/com/ai/va/client/LlmClient.java`

**Purpose:** Generate AI responses (Both voice and chat scenarios)

**Supported Providers:**
- **LM Studio** (Local development)
- **Azure OpenAI** (Production)
- **OpenAI API**

**Key Methods:**
```java
public String generate(String prompt, int maxTokens, double temperature)
public String getChatCompletion(String systemPrompt, String userMessage, double temperature)
public String streamChatCompletion(..., Consumer<String> tokenCallback)
public boolean testConnection()
```

**Configuration:**
```properties
api.endpoints.llm.provider=lm-studio
api.endpoints.llm.url=http://localhost:1234/v1/chat/completions
api.endpoints.llm.api-key=lm-studio
api.endpoints.llm.model=google/gemma-2-9b
api.client.timeout=300
```

**Features:**
- ✅ Streaming support (Server-Sent Events)
- ✅ Azure OpenAI compatibility
- ✅ Timeout handling (30s connect, 300s request)
- ✅ JSON response unwrapping
- ✅ CURL command generation for debugging

---

## Voice Scenario Workflow

### High-Level Flow
```
Caller → Twilio → Node Backend → Java VA Service → External APIs → Response
```

### Detailed Step-by-Step

```
┌──────────────┐
│  Phone Call  │
│  (Caller)    │
└──────┬───────┘
       │ 1. Incoming call
       ▼
┌─────────────────────────────────────────────────────────────────────┐
│                      TWILIO / Telephony Provider                    │
│  - Receives call                                                    │
│  - Streams audio chunks                                             │
└──────┬──────────────────────────────────────────────────────────────┘
       │ 2. POST /voice/incoming (Webhook)
       │    { from, to, callSid, dialedNumber }
       ▼
┌─────────────────────────────────────────────────────────────────────┐
│                        NODE BACKEND (backend-node)                  │
│                                                                     │
│  📍 POST /api/voice/incoming                                        │
│     ┌──────────────────────────────────────────────────┐           │
│     │ 1. Lookup customer by dialedNumber               │           │
│     │ 2. Check assistant.phoneEnabled                  │           │
│     │ 3. Verify business hours                         │           │
│     │ 4. Create assistant_calls record in MongoDB      │           │
│     │ 5. Return TwiML: Start streaming audio           │           │
│     └──────────────────────────────────────────────────┘           │
│                                                                     │
│  📍 POST /api/voice/stream                                          │
│     ┌──────────────────────────────────────────────────┐           │
│     │ Receive audio chunks from Twilio                 │           │
│     │ {                                                 │           │
│     │   callId: "call-123",                             │           │
│     │   audioChunk: "base64..."                         │           │
│     │ }                                                 │           │
│     └────────┬─────────────────────────────────────────┘           │
│              │ 3. Forward to Java VA Service                        │
│              │    javaVAClient.post('/voice/process', ...)          │
└──────────────┼──────────────────────────────────────────────────────┘
               │ HTTP POST
               │ { callId, audioChunk, customerId, tenantId }
               ▼
┌─────────────────────────────────────────────────────────────────────┐
│              JAVA VA SERVICE (services-java/va-service)             │
│                                                                     │
│  📍 POST /voice/process                                             │
│     VoiceSessionController.processAudio()                           │
│              │                                                      │
│              ▼                                                      │
│     ┌────────────────────────────────────────────────┐             │
│     │   VoiceSessionService.processAudioChunk()      │             │
│     │                                                 │             │
│     │   Step 1: STT (Speech-to-Text)                 │             │
│     │   ┌─────────────────────────────────────┐      │             │
│     │   │  SttClient.transcribe(audioChunk)   │      │             │
│     │   │  → "Hello, I need help"             │      │             │
│     │   └─────────────────────────────────────┘      │             │
│     │                                                 │             │
│     │   Step 2: Dialog Management                    │             │
│     │   ┌─────────────────────────────────────┐      │             │
│     │   │  DialogManager.processUserInput()   │      │             │
│     │   │  - Detect intent                     │      │             │
│     │   │  - Extract slots                     │      │             │
│     │   │  - Update session state             │      │             │
│     │   └─────────────────────────────────────┘      │             │
│     │                                                 │             │
│     │   Step 3: LLM (Generate Response)              │             │
│     │   ┌─────────────────────────────────────┐      │             │
│     │   │  LlmClient.getChatCompletion(       │      │             │
│     │   │    systemPrompt,                    │      │             │
│     │   │    userMessage                      │      │             │
│     │   │  )                                   │      │             │
│     │   │  → "Sure, I can help you with..."   │      │             │
│     │   └─────────────────────────────────────┘      │             │
│     │                                                 │             │
│     │   Step 4: TTS (Text-to-Speech)                 │             │
│     │   ┌─────────────────────────────────────┐      │             │
│     │   │  TtsClient.synthesize(responseText) │      │             │
│     │   │  → Base64 audio                     │      │             │
│     │   └─────────────────────────────────────┘      │             │
│     │                                                 │             │
│     │   Step 5: Usage Tracking                       │             │
│     │   ┌─────────────────────────────────────┐      │             │
│     │   │  UsageService.recordUsage()         │      │             │
│     │   │  - sttSeconds                        │      │             │
│     │   │  - llmTokensIn, llmTokensOut        │      │             │
│     │   │  - ttsCharacters                     │      │             │
│     │   └─────────────────────────────────────┘      │             │
│     │                                                 │             │
│     │   Step 6: Report to Node Backend               │             │
│     │   ┌─────────────────────────────────────┐      │             │
│     │   │  UsageMetricsClient.postUsageMetrics()│    │             │
│     │   │  POST /api/usage/assistant-call     │      │             │
│     │   └─────────────────────────────────────┘      │             │
│     │                                                 │             │
│     │   Return: VoiceResponse                        │             │
│     │   {                                             │             │
│     │     callId,                                     │             │
│     │     ttsAudio: "base64...",                      │             │
│     │     transcript,                                 │             │
│     │     assistantResponse                           │             │
│     │   }                                             │             │
│     └────────┬────────────────────────────────────────┘             │
└──────────────┼──────────────────────────────────────────────────────┘
               │ HTTP Response
               ▼
┌─────────────────────────────────────────────────────────────────────┐
│                        NODE BACKEND                                 │
│  📍 Receive TTS audio response                                      │
│     ┌──────────────────────────────────────────────────┐           │
│     │ 1. Extract ttsAudio (base64)                     │           │
│     │ 2. Stream back to Twilio                         │           │
│     │ 3. Update MongoDB assistant_calls record         │           │
│     └──────────────────────────────────────────────────┘           │
└──────┬──────────────────────────────────────────────────────────────┘
       │ 4. Return TwiML with audio
       ▼
┌─────────────────────────────────────────────────────────────────────┐
│                      TWILIO                                         │
│  - Play audio to caller                                             │
│  - Continue conversation loop                                       │
└──────┬──────────────────────────────────────────────────────────────┘
       │ 5. Caller hears response
       ▼
┌──────────────┐
│  Phone Call  │
│  (Caller)    │
└──────────────┘
```

### Voice Scenario - Client Usage

| Client | When Used | Input | Output | Purpose |
|--------|-----------|-------|--------|---------|
| **SttClient** | Every audio chunk | Base64 audio | Text transcript | Convert speech → text |
| **LlmClient** | After STT | System prompt + user text | AI response text | Generate intelligent reply |
| **TtsClient** | After LLM | Response text | Base64 audio | Convert text → speech |
| **UsageMetricsClient** | After processing | UsageUpdate object | Success/failure | Report billing metrics |

---

## Chat Scenario Workflow

### High-Level Flow
```
Web User → Frontend → Node Backend → Java VA Service → LLM API → Response
```

### Detailed Step-by-Step

```
┌──────────────┐
│  Web Browser │
│  (User)      │
└──────┬───────┘
       │ 1. User types message
       │    "Hello, I need help"
       ▼
┌─────────────────────────────────────────────────────────────────────┐
│                    FRONTEND (React + Vite)                          │
│                                                                     │
│  📍 Chat Component                                                  │
│     ┌──────────────────────────────────────────────────┐           │
│     │ 1. User types in chat input                      │           │
│     │ 2. Click send button                             │           │
│     │ 3. apiClient.post('/api/chat/message', {         │           │
│     │      sessionId: "session-xyz",                    │           │
│     │      message: "Hello, I need help"                │           │
│     │    })                                             │           │
│     └──────────────────────────────────────────────────┘           │
└──────┬──────────────────────────────────────────────────────────────┘
       │ 2. HTTP POST
       │    /api/chat/message
       ▼
┌─────────────────────────────────────────────────────────────────────┐
│                      NODE BACKEND (backend-node)                    │
│                                                                     │
│  📍 POST /api/chat/message                                          │
│     ┌──────────────────────────────────────────────────┐           │
│     │ 1. Validate user authentication (JWT)            │           │
│     │ 2. Extract sessionId, message                    │           │
│     │ 3. Forward to Java VA Service                    │           │
│     │    javaVAClient.post('/chat/message', {          │           │
│     │      sessionId,                                   │           │
│     │      message,                                     │           │
│     │      customerId,                                  │           │
│     │      tenantId                                     │           │
│     │    })                                             │           │
│     └────────┬─────────────────────────────────────────┘           │
└──────────────┼──────────────────────────────────────────────────────┘
               │ 3. HTTP POST (JSON)
               │    { sessionId, message, customerId, tenantId }
               ▼
┌─────────────────────────────────────────────────────────────────────┐
│              JAVA VA SERVICE (services-java/va-service)             │
│                                                                     │
│  📍 POST /chat/message                                              │
│     ChatSessionController.sendMessage()                             │
│              │                                                      │
│              ▼                                                      │
│     ┌────────────────────────────────────────────────┐             │
│     │   ChatSessionService.processMessage()          │             │
│     │                                                 │             │
│     │   Step 1: NO STT (already text)                │             │
│     │   ✗ SKIP SttClient                             │             │
│     │                                                 │             │
│     │   Step 2: Dialog Management                    │             │
│     │   ┌─────────────────────────────────────┐      │             │
│     │   │  DialogManager.processUserInput()   │      │             │
│     │   │  - Detect intent                     │      │             │
│     │   │  - Extract slots                     │      │             │
│     │   │  - Update session state             │      │             │
│     │   │  - Add to conversation history      │      │             │
│     │   └─────────────────────────────────────┘      │             │
│     │                                                 │             │
│     │   Step 3: LLM (Generate Response)              │             │
│     │   ┌─────────────────────────────────────┐      │             │
│     │   │  LlmClient.getChatCompletion(       │      │             │
│     │   │    systemPrompt,                    │      │             │
│     │   │    userMessage,                     │      │             │
│     │   │    temperature: 0.7                 │      │             │
│     │   │  )                                   │      │             │
│     │   │                                      │      │             │
│     │   │  OR for streaming:                  │      │             │
│     │   │  LlmClient.streamChatCompletion(    │      │             │
│     │   │    systemPrompt,                    │      │             │
│     │   │    userMessage,                     │      │             │
│     │   │    temperature,                     │      │             │
│     │   │    token -> sseEmitter.send(token)  │      │             │
│     │   │  )                                   │      │             │
│     │   │                                      │      │             │
│     │   │  → "Sure, I can help you with..."   │      │             │
│     │   └─────────────────────────────────────┘      │             │
│     │                                                 │             │
│     │   Step 4: NO TTS (return text directly)        │             │
│     │   ✗ SKIP TtsClient                             │             │
│     │                                                 │             │
│     │   Step 5: Usage Tracking (LLM only)            │             │
│     │   ┌─────────────────────────────────────┐      │             │
│     │   │  UsageService.trackLlmUsage()       │      │             │
│     │   │  - llmTokensIn                       │      │             │
│     │   │  - llmTokensOut                      │      │             │
│     │   │  (NO sttSeconds, NO ttsCharacters)  │      │             │
│     │   └─────────────────────────────────────┘      │             │
│     │                                                 │             │
│     │   Step 6: Save to MongoDB                      │             │
│     │   ┌─────────────────────────────────────┐      │             │
│     │   │  ChatHistoryRepository.save()       │      │             │
│     │   │  - User message                      │      │             │
│     │   │  - Assistant response                │      │             │
│     │   │  - Timestamp                         │      │             │
│     │   └─────────────────────────────────────┘      │             │
│     │                                                 │             │
│     │   Step 7: Report to Node Backend               │             │
│     │   ┌─────────────────────────────────────┐      │             │
│     │   │  UsageMetricsClient.postUsageMetrics()│    │             │
│     │   │  POST /api/usage/assistant-call     │      │             │
│     │   │  {                                   │      │             │
│     │   │    sessionId,                        │      │             │
│     │   │    customerId,                       │      │             │
│     │   │    llmTokensIn,                      │      │             │
│     │   │    llmTokensOut                      │      │             │
│     │   │  }                                   │      │             │
│     │   └─────────────────────────────────────┘      │             │
│     │                                                 │             │
│     │   Return: ChatResponse                         │             │
│     │   {                                             │             │
│     │     sessionId,                                  │             │
│     │     message: "Sure, I can help...",             │             │
│     │     intent,                                     │             │
│     │     extractedSlots                              │             │
│     │   }                                             │             │
│     └────────┬────────────────────────────────────────┘             │
└──────────────┼──────────────────────────────────────────────────────┘
               │ HTTP Response (JSON)
               ▼
┌─────────────────────────────────────────────────────────────────────┐
│                      NODE BACKEND                                   │
│  📍 Receive chat response                                           │
│     ┌──────────────────────────────────────────────────┐           │
│     │ 1. Extract message text                          │           │
│     │ 2. Update assistant_calls.usage in MongoDB       │           │
│     │ 3. Forward response to frontend                  │           │
│     └──────────────────────────────────────────────────┘           │
└──────┬──────────────────────────────────────────────────────────────┘
       │ 4. Return JSON response
       ▼
┌─────────────────────────────────────────────────────────────────────┐
│                    FRONTEND (React)                                 │
│  📍 Display assistant response                                      │
│     ┌──────────────────────────────────────────────────┐           │
│     │ 1. Receive response                              │           │
│     │ 2. Append to chat history UI                     │           │
│     │ 3. Display assistant message bubble              │           │
│     └──────────────────────────────────────────────────┘           │
└──────┬──────────────────────────────────────────────────────────────┘
       │ 5. User sees response
       ▼
┌──────────────┐
│  Web Browser │
│  (User)      │
└──────────────┘
```

### Chat Scenario - Client Usage

| Client | When Used | Input | Output | Purpose |
|--------|-----------|-------|--------|---------|
| **SttClient** | ❌ Never | N/A | N/A | Not needed (text input) |
| **LlmClient** | Every message | System prompt + user text | AI response text | Generate intelligent reply |
| **TtsClient** | ❌ Never | N/A | N/A | Not needed (text output) |
| **UsageMetricsClient** | After processing | UsageUpdate object | Success/failure | Report billing metrics (LLM only) |

---

## Relationship to Backend-Node

### Node Backend as Middleware/Gateway

The Node.js backend serves as the **API gateway** and **orchestrator** between the frontend and Java microservices:

```
┌─────────────────────────────────────────────────────────────────┐
│                    BACKEND-NODE RESPONSIBILITIES                │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  1. AUTHENTICATION & AUTHORIZATION                              │
│     - Google OAuth2 (Passport.js)                               │
│     - JWT token management                                      │
│     - Session management (express-session)                      │
│     - User authentication middleware                            │
│                                                                 │
│  2. API GATEWAY                                                 │
│     - Route frontend requests to Java services                  │
│     - Circuit breaker protection (fault tolerance)              │
│     - Retry logic with exponential backoff                      │
│     - Request/response transformation                           │
│                                                                 │
│  3. BUSINESS LOGIC                                              │
│     - Customer lookup by phone number                           │
│     - Assistant configuration validation                        │
│     - Business hours checking                                   │
│     - Call routing decisions                                    │
│                                                                 │
│  4. DATABASE OPERATIONS (MongoDB)                               │
│     - Create/update assistant_calls records                     │
│     - Update subscriptions.usage                                │
│     - Aggregate usage for billing                               │
│     - Store chat_history                                        │
│     - Manage customer/tenant/product data                       │
│                                                                 │
│  5. WEBHOOKS & EXTERNAL INTEGRATIONS                            │
│     - Twilio webhook handling                                   │
│     - Telephony provider integration                            │
│     - TwiML generation                                          │
│                                                                 │
│  6. HEALTH MONITORING                                           │
│     - Health check endpoints                                    │
│     - Circuit breaker status                                    │
│     - Service dependency monitoring                             │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### Communication Flow: Node ↔ Java

#### Node → Java (Forward Requests)

**Voice Scenario:**
```typescript
// backend-node/src/routes/voice-routes.ts
const response = await javaVAClient.post('/voice/process', {
  callId: callDoc._id.toString(),
  audioChunk: req.body.audioChunk,  // Base64
  customerId: customer._id,
  tenantId: customer.tenantId,
  productId: assistant.productId
}, {
  timeout: 30000  // 30s for STT+LLM+TTS processing
});
```

**Chat Scenario:**
```typescript
// backend-node/src/routes/chat-routes.ts
const response = await javaVAClient.post('/chat/message', {
  sessionId: req.body.sessionId,
  message: req.body.message,
  customerId: req.user.customerId,
  tenantId: req.user.tenantId,
  productId: req.body.productId
}, {
  timeout: 30000  // 30s for LLM processing
});
```

#### Java → Node (Report Metrics)

**From Java:**
```java
// services-java/va-service/src/main/java/com/ai/va/client/UsageMetricsClient.java
UsageUpdate usage = new UsageUpdate();
usage.setSessionId(callId);
usage.setCustomerId(customerId);
usage.setSttSeconds(10);          // Voice only
usage.setLlmTokensIn(250);
usage.setLlmTokensOut(180);
usage.setTtsCharacters(120);      // Voice only
usage.setTimestamp(Instant.now());

usageMetricsClient.postUsageMetrics(usage);
```

**To Node:**
```typescript
// backend-node/src/routes/usage-routes.ts
app.post('/api/usage/assistant-call', async (req, res) => {
  const { sessionId, customerId, sttSeconds, llmTokensIn, llmTokensOut, ttsCharacters } = req.body;
  
  // Update MongoDB
  await AssistantCall.updateOne(
    { _id: sessionId },
    {
      $set: {
        'usage.sttSeconds': sttSeconds,
        'usage.llmTokensIn': llmTokensIn,
        'usage.llmTokensOut': llmTokensOut,
        'usage.ttsCharacters': ttsCharacters
      }
    }
  );
  
  // Update subscription usage for billing
  await Subscription.updateOne(
    { customerId },
    {
      $inc: {
        'usage.conversations': 1,
        'usage.totalTokens': llmTokensIn + llmTokensOut
      }
    }
  );
  
  res.json({ success: true });
});
```

---

## Data Flow Diagrams

### Voice Call Data Flow

```
┌─────────┐  Audio   ┌──────────┐  Audio    ┌──────────┐  Text    ┌──────────┐
│ Caller  │─────────>│  Twilio  │──────────>│  Node    │─────────>│   STT    │
│         │          │          │           │ Backend  │          │  Client  │
└─────────┘          └──────────┘           └────┬─────┘          └────┬─────┘
     ▲                                            │                     │
     │                                            │                     ▼
     │                                            │             ┌──────────────┐
     │                                            │             │ "Hello..."   │
     │                                            │             └──────┬───────┘
     │                                            │                    │
     │                                            │                    ▼
     │                                            │             ┌──────────────┐
     │                                            │             │  Dialog Mgr  │
     │                                            │             │ (Intent/Slot)│
     │                                            │             └──────┬───────┘
     │                                            │                    │
     │                                            │                    ▼
     │                                            │             ┌──────────────┐
     │                                            │             │  LLM Client  │
     │                                            │             │ (GPT/Gemma)  │
     │                                            │             └──────┬───────┘
     │                                            │                    │
     │                                            │                    ▼
     │                                            │             ┌──────────────┐
     │                                            │             │ "Sure, I..." │
     │                                            │             └──────┬───────┘
     │                                            │                    │
     │                                            │                    ▼
     │  Audio  ┌──────────┐  Audio    ┌──────────┤             ┌──────────────┐
└───────────│  Twilio  │<──────────│  Node    │<────────────│  TTS Client  │
            │          │           │ Backend  │             │              │
            └──────────┘           └────┬─────┘             └──────────────┘
                                        │
                                        ▼
                                 ┌──────────────┐
                                 │   MongoDB    │
                                 │  (Usage)     │
                                 └──────────────┘
                                        ▲
                                        │
                                        │ POST /api/usage/assistant-call
                                        │
                                 ┌──────────────┐
                                 │UsageMetrics  │
                                 │   Client     │
                                 └──────────────┘
```

### Chat Message Data Flow

```
┌─────────┐  Text    ┌──────────┐  JSON     ┌──────────┐           ┌──────────┐
│  User   │─────────>│ Frontend │──────────>│  Node    │──────────>│  Dialog  │
│ Browser │          │  React   │           │ Backend  │           │  Manager │
└─────────┘          └──────────┘           └────┬─────┘           └────┬─────┘
     ▲                                            │                      │
     │                                            │                      ▼
     │                                            │              ┌──────────────┐
     │                                            │              │  LLM Client  │
     │                                            │              │ (GPT/Gemma)  │
     │                                            │              └──────┬───────┘
     │                                            │                     │
     │                                            │                     ▼
     │  JSON   ┌──────────┐  JSON     ┌──────────┤              ┌──────────────┐
└────────────│ Frontend │<──────────│  Node    │<─────────────│   Response   │
             │  React   │           │ Backend  │              │    Text      │
             └──────────┘           └────┬─────┘              └──────────────┘
                                         │
                                         ▼
                                  ┌──────────────┐
                                  │   MongoDB    │
                                  │ (chat_history│
                                  │   + usage)   │
                                  └──────────────┘
                                         ▲
                                         │
                                         │ POST /api/usage/assistant-call
                                         │
                                  ┌──────────────┐
                                  │UsageMetrics  │
                                  │   Client     │
                                  └──────────────┘
```

---

## Sequence Diagrams

### Voice Processing Sequence

```
Caller   Twilio   Node Backend   Java VA   STT   LLM   TTS   UsageMetrics   MongoDB
  │        │           │            │       │     │     │       Client       │
  │ Speak  │           │            │       │     │     │         │          │
  ├───────>│           │            │       │     │     │         │          │
  │        │ Webhook   │            │       │     │     │         │          │
  │        ├──────────>│            │       │     │     │         │          │
  │        │           │ Create Call│       │     │     │         │          │
  │        │           ├───────────────────────────────────────────────────>│
  │        │           │            │       │     │     │         │     ←────┤
  │        │           │ Forward    │       │     │     │         │          │
  │        │           │ Audio      │       │     │     │         │          │
  │        │           ├───────────>│       │     │     │         │          │
  │        │           │            │ STT   │     │     │         │          │
  │        │           │            ├──────>│     │     │         │          │
  │        │           │            │←──────┤     │     │         │          │
  │        │           │            │ Dialog│     │     │         │          │
  │        │           │            │ Mgr   │     │     │         │          │
  │        │           │            ├───────┼────>│     │         │          │
  │        │           │            │       │     │     │         │          │
  │        │           │            │       │  LLM│     │         │          │
  │        │           │            │       │     │     │         │          │
  │        │           │            │←──────┼─────┤     │         │          │
  │        │           │            │       │     │     │         │          │
  │        │           │            │ TTS   │     │     │         │          │
  │        │           │            ├───────┼─────┼────>│         │          │
  │        │           │            │←──────┼─────┼─────┤         │          │
  │        │           │            │       │     │     │         │          │
  │        │           │            │ Usage │     │     │         │          │
  │        │           │            ├───────┼─────┼─────┼────────>│          │
  │        │           │            │       │     │     │         │ POST     │
  │        │           │            │       │     │     │         ├─────────>│
  │        │           │            │       │     │     │         │     ←────┤
  │        │           │            │       │     │     │         │          │
  │        │           │ Response   │       │     │     │         │          │
  │        │           │ (Audio)    │       │     │     │         │          │
  │        │           │<───────────┤       │     │     │         │          │
  │        │ TwiML     │            │       │     │     │         │          │
  │        │<──────────┤            │       │     │     │         │          │
  │ Hear   │           │            │       │     │     │         │          │
  │<───────┤           │            │       │     │     │         │          │
  │        │           │            │       │     │     │         │          │
```

### Chat Processing Sequence

```
User   Frontend   Node Backend   Java VA   Dialog Mgr   LLM   UsageMetrics   MongoDB
 │        │            │            │           │         │      Client       │
 │ Type   │            │            │           │         │        │          │
 ├───────>│            │            │           │         │        │          │
 │        │ POST       │            │           │         │        │          │
 │        ├───────────>│            │           │         │        │          │
 │        │            │ Forward    │           │         │        │          │
 │        │            ├───────────>│           │         │        │          │
 │        │            │            │ Process   │         │        │          │
 │        │            │            ├──────────>│         │        │          │
 │        │            │            │           │         │        │          │
 │        │            │            │           │ LLM     │        │          │
 │        │            │            ├───────────┼────────>│        │          │
 │        │            │            │           │         │        │          │
 │        │            │            │←──────────┼─────────┤        │          │
 │        │            │            │           │         │        │          │
 │        │            │            │ Save      │         │        │          │
 │        │            │            │ History   │         │        │          │
 │        │            │            ├───────────┼─────────┼────────┼─────────>│
 │        │            │            │           │         │        │     ←────┤
 │        │            │            │           │         │        │          │
 │        │            │            │ Usage     │         │        │          │
 │        │            │            ├───────────┼─────────┼───────>│          │
 │        │            │            │           │         │        │ POST     │
 │        │            │            │           │         │        ├─────────>│
 │        │            │            │           │         │        │     ←────┤
 │        │            │            │           │         │        │          │
 │        │            │ Response   │           │         │        │          │
 │        │            │ (Text)     │           │         │        │          │
 │        │            │<───────────┤           │         │        │          │
 │        │ JSON       │            │           │         │        │          │
 │        │<───────────┤            │           │         │        │          │
 │ Read   │            │            │           │         │        │          │
 │<───────┤            │           │           │         │        │          │
 │        │            │            │           │         │        │          │
```

---

## Key Differences: Voice vs Chat

| Aspect | Voice Scenario | Chat Scenario |
|--------|---------------|---------------|
| **Input** | Audio chunks (Base64) | Text messages |
| **STT Client** | ✅ Used (audio → text) | ❌ Not used |
| **LLM Client** | ✅ Used (text → response) | ✅ Used (text → response) |
| **TTS Client** | ✅ Used (response → audio) | ❌ Not used |
| **Output** | Audio (Base64) | Text |
| **Session Duration** | Minutes (synchronous call) | Hours/Days (async messages) |
| **Latency Requirement** | <2s (real-time) | <5s (acceptable) |
| **Usage Metrics** | STT sec + LLM tokens + TTS chars | LLM tokens only |
| **Storage** | voice_transcripts collection | chat_history collection |
| **Entry Point** | Twilio webhook | Web frontend |
| **Protocol** | Telephony + HTTP | HTTP/WebSocket |

---

## Client Configuration

### Application Properties

**Development (application-dev.properties):**
```properties
# STT Configuration
stt.provider=whisper
stt.whisper.url=http://localhost:8000
stt.whisper.model=base

# LLM Configuration
api.endpoints.llm.provider=lm-studio
api.endpoints.llm.url=http://localhost:1234/v1/chat/completions
api.endpoints.llm.api-key=lm-studio
api.endpoints.llm.model=google/gemma-2-9b
api.client.timeout=300

# Node Backend
node.backend.url=http://localhost:5000
```

**Production (application-prod.properties):**
```properties
# STT Configuration
stt.provider=azure
azure.speech.key=${AZURE_SPEECH_KEY}
azure.speech.region=eastus

# LLM Configuration
api.endpoints.llm.provider=azure-openai
api.endpoints.llm.url=https://your-resource.openai.azure.com
api.endpoints.llm.api-key=${AZURE_OPENAI_KEY}
api.endpoints.llm.deployment=gpt-4
api.client.timeout=300

# Node Backend
node.backend.url=https://api.production.com
```

---

## Error Handling & Resilience

### Circuit Breaker (Node Backend)

```typescript
// backend-node/src/services/apiClient.ts
export const javaVAClient = new ApiClient({
  baseURL: process.env.JAVA_VA_URL || 'http://localhost:8136',
  timeout: 30000,
  retryAttempts: 2,
  circuitBreakerConfig: {
    failureThreshold: 5,      // Open circuit after 5 failures
    successThreshold: 2,      // Close after 2 successes
    timeout: 60000,           // 1 minute timeout
  },
  name: 'JavaVA',
});
```

**States:**
- **CLOSED:** Normal operation, requests flow through
- **OPEN:** Too many failures, requests rejected immediately
- **HALF_OPEN:** Testing recovery, limited requests allowed

### Retry Logic

**Exponential Backoff:**
```
Attempt 1: Wait 1s
Attempt 2: Wait 2s + jitter
Attempt 3: Wait 4s + jitter
```

### Fallback Responses

```typescript
const response = await javaVAClient.post('/voice/process', data, {}, 
  // Fallback function if all retries fail
  () => ({
    message: "I'm sorry, I'm having trouble processing your request. Please try again."
  })
);
```

---

## Monitoring & Debugging

### Health Checks

**Node Backend:**
```
GET /api/health/detailed
{
  "status": "healthy",
  "services": {
    "mongodb": { "status": "up", "responseTime": 5 },
    "javaVA": { "status": "up", "responseTime": 120 },
    "circuitBreaker": { "state": "CLOSED", "failures": 0 }
  }
}
```

**Java Service:**
```
GET /actuator/health
{
  "status": "UP",
  "components": {
    "nodeBackend": { "status": "UP" },
    "llmClient": { "status": "UP" }
  }
}
```

### Logging

**LLM Client Debug:**
```java
logger.info("[LLMClient] CURL COMMAND FOR DEBUGGING:");
logger.info(curlCommand);
```

**Example CURL Output:**
```bash
curl -X POST \
  'http://localhost:1234/v1/chat/completions' \
  -H 'Content-Type: application/json' \
  -d '{"messages":[{"role":"system","content":"You are..."},{"role":"user","content":"Hello"}],"temperature":0.7,"max_tokens":2000,"model":"google/gemma-2-9b"}'
```

---

## Related Documentation

- [VOICE-DEV-SETUP.md](./VOICE-DEV-SETUP.md) - Development environment setup
- [VOICE-CONFIGURATION.md](./VOICE-CONFIGURATION.md) - Configuration reference
- [PHASE-1-COMPLETION-REPORT.md](./archive/PHASE-1-COMPLETION-REPORT.md) - Phase 1 implementation details
- [COMPONENT_INTEGRATION_GUIDE.md](./COMPONENT_INTEGRATION_GUIDE.md) - Component integration
- [END_TO_END_INTEGRATION_GUIDE.md](./END_TO_END_INTEGRATION_GUIDE.md) - End-to-end flows
- [high-level-assistant-arch.md](./high-level-assistant-arch.md) - Architecture overview

---

## Summary

### Voice Pipeline
```
Audio → STT → Dialog → LLM → TTS → Audio
        ↓              ↓       ↓
     (Text)     (Intent)  (Response)
```

### Chat Pipeline
```
Text → Dialog → LLM → Text
       ↓        ↓
   (Intent) (Response)
```

### Key Takeaways

1. **UsageMetricsClient** = Java ➔ Node communication (usage metrics, health checks)
2. **SttClient** = Audio ➔ Text (Voice only)
3. **TtsClient** = Text ➔ Audio (Voice only)
4. **LlmClient** = Text ➔ AI Response (Both scenarios)

5. **Node Backend** serves as:
   - API Gateway
   - Authentication layer
   - Database orchestrator
   - Circuit breaker for fault tolerance

6. **Java VA Service** handles:
   - Core AI pipeline (STT → LLM → TTS)
   - Dialog management
   - Session state
   - Usage tracking

7. **Workflow differences:**
   - Voice: 6 steps (STT + Dialog + LLM + TTS + Usage + Node)
   - Chat: 4 steps (Dialog + LLM + Usage + Node)

---

*Last Updated: 2026-01-20*
