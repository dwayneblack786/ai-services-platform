# End-to-End Integration Guide

📑 **Table of Contents**
- [Overview](#overview)
- [Scenario: User Sends "Book an appointment for tomorrow"](#scenario-user-sends-book-an-appointment-for-tomorrow)
  - [Architecture Recap](#architecture-recap)
- [Stage 1: Frontend User Input (0ms - 50ms)](#stage-1-frontend-user-input-0ms---50ms)
  - [1.1 User Types Message](#11-user-types-message)
- [Stage 2: WebSocket Transmission (5ms - 15ms)](#stage-2-websocket-transmission-5ms---15ms)
  - [2.1 Socket.IO Client Sends Event](#21-socketio-client-sends-event)
- [Stage 3: Backend Receives WebSocket Event (15ms - 30ms)](#stage-3-backend-receives-websocket-event-15ms---30ms)
  - [3.1 Socket.IO Server Receives Frame](#31-socketio-server-receives-frame)
  - [3.2 Chat Handler Processes Event](#32-chat-handler-processes-event)
- [Stage 4: Backend Calls Java VA Service (30ms - 40ms)](#stage-4-backend-calls-java-va-service-30ms---40ms)
  - [4.1 HTTP POST to Java Service](#41-http-post-to-java-service)
- [Stage 5: Java Receives Request (40ms - 60ms)](#stage-5-java-receives-request-40ms---60ms)
  - [5.1 Spring Boot Controller Receives Request](#51-spring-boot-controller-receives-request)
  - [5.2 Service Layer Processes Message](#52-service-layer-processes-message)
  - [5.3 LLM API Call (The Bottleneck)](#53-llm-api-call-the-bottleneck)
- [Stage 6: Java Returns Response (3100ms - 3120ms)](#stage-6-java-returns-response-3100ms---3120ms)
  - [6.1 Controller Sends HTTP Response](#61-controller-sends-http-response)
- [Stage 7: Backend Receives Java Response (3120ms - 3130ms)](#stage-7-backend-receives-java-response-3120ms---3130ms)
  - [7.1 Node.js Processes Response](#71-nodejs-processes-response)
- [Stage 8: Frontend Receives Response (3130ms - 3150ms)](#stage-8-frontend-receives-response-3130ms---3150ms)
  - [8.1 Socket.IO Client Receives Event](#81-socketio-client-receives-event)
- [Complete Timeline Summary](#complete-timeline-summary)
- [Optimization Opportunities](#optimization-opportunities)
  - [1. Streaming LLM Responses](#1-streaming-llm-responses)
  - [2. Caching Intent Classification](#2-caching-intent-classification)
  - [3. MongoDB Connection Pooling](#3-mongodb-connection-pooling)
- [Debugging Guide](#debugging-guide)
  - [Check Each Layer](#check-each-layer)
- [Error Scenarios](#error-scenarios)
  - [Scenario 1: LLM API Timeout](#scenario-1-llm-api-timeout)
  - [Scenario 2: WebSocket Disconnection](#scenario-2-websocket-disconnection)
- [Summary](#summary)
  - [Key Takeaways](#key-takeaways)
  - [Performance Targets](#performance-targets)

---

## Overview

This document provides a **complete walkthrough** of how a single user message travels through the entire AI Services Platform, from the browser to the Java backend and back. It includes:

- **Step-by-step execution flow**
- **Timing at each stage**
- **Data transformations**
- **Network protocols used**
- **Code snippets from each layer**
- **Sequence diagrams**
- **Debugging tips**

---

## Scenario: User Sends "Book an appointment for tomorrow"

### Architecture Recap

```
┌──────────────────────────────────────────────────────────────────────────┐
│ Browser (React + Socket.IO Client)                                       │
│ - User types message                                                     │
│ - AssistantChat component                                                │
│ - useSocket hook                                                         │
└───────────────────────┬──────────────────────────────────────────────────┘
                        │
                        │ WebSocket (Socket.IO)
                        │ Protocol: WS (upgrade from HTTP)
                        │ Port: 5000
                        │
                        ↓
┌──────────────────────────────────────────────────────────────────────────┐
│ Node.js Backend (Express + Socket.IO Server)                            │
│ - socket.on('chat:send-message')                                        │
│ - Authentication middleware                                              │
│ - Chat socket handlers                                                   │
│ - gRPC client                                                            │
└───────────────────────┬──────────────────────────────────────────────────┘
                        │
                        │ gRPC over HTTP/2
                        │ Protocol: Protocol Buffers (binary)
                        │ Port: 50051
                        │
                        ↓
┌──────────────────────────────────────────────────────────────────────────┐
│ Java VA Service (Spring Boot + gRPC Server)                             │
│ - ChatServiceImpl.sendMessageStream()                                   │
│ - ChatSessionService.processMessage()                                   │
│ - DialogManager (intent, state machine)                                 │
│ - LLM Client (OpenAI/Claude API)                                        │
│ - MongoDB (session storage)                                             │
└──────────────────────────────────────────────────────────────────────────┘
```

---

## Stage 1: Frontend User Input (0ms - 50ms)

### 1.1 User Types Message

**Location:** Browser DOM

**Action:** User types in `<input>` field and clicks Send button

**Code:** `frontend/src/components/AssistantChat.tsx`

```typescript
const [inputValue, setInputValue] = useState('');
const [messages, setMessages] = useState([]);

const handleSendMessage = useCallback(async (content: string) => {
  if (!socket || !sessionId || !content.trim()) {
    console.error('Cannot send message');
    return;
  }

  console.log('[AssistantChat] Sending message:', content);

  // Step 1.1: Create message object
  const userMessage = {
    role: 'user',
    content: content.trim(),
    timestamp: new Date().toISOString()
  };

  // Step 1.2: Optimistic UI update (instant feedback)
  setMessages(prev => [...prev, userMessage]);

  // Step 1.3: Clear input field
  setInputValue('');

  // Step 1.4: Emit via WebSocket
  socket.emit('chat:send-message', {
    sessionId,
    message: content.trim(),
    timestamp: userMessage.timestamp
  });

}, [socket, sessionId]);
```

**Data at this stage:**
```javascript
{
  sessionId: "session-abc123",
  message: "Book an appointment for tomorrow",
  timestamp: "2026-01-15T10:30:00.000Z"
}
```

**Network Activity:** None yet (pure client-side)

**Time Elapsed:** 0ms - 5ms (React state update)

---

## Stage 2: WebSocket Transmission (5ms - 15ms)

### 2.1 Socket.IO Client Sends Event

**Location:** `frontend/src/hooks/useSocket.ts`

**Action:** Socket.IO client serializes data and sends WebSocket frame

**Code:**
```typescript
const emit = useCallback((event: string, data: any) => {
  if (socket && socket.connected) {
    socket.emit(event, data);
    console.log(`[Socket] Emitted ${event}:`, data);
  } else {
    console.error('[Socket] Cannot emit, not connected');
  }
}, [socket]);
```

**Network Frame:**
```
WebSocket Frame (Binary):
┌─────────────────────────────────────────────────┐
│ Type: Message                                   │
│ Event: "chat:send-message"                     │
│ Payload (JSON): {                              │
│   "sessionId": "session-abc123",               │
│   "message": "Book an appointment for tomorrow"│
│   "timestamp": "2026-01-15T10:30:00.000Z"      │
│ }                                               │
└─────────────────────────────────────────────────┘
```

**Protocol:** WebSocket (ws://)
**Size:** ~150 bytes
**Direction:** Client → Server

**Time Elapsed:** 5ms - 10ms (network latency)

---

## Stage 3: Backend Receives WebSocket Event (15ms - 30ms)

### 3.1 Socket.IO Server Receives Frame

**Location:** `backend-node/src/config/socket.ts`

**Action:** Socket.IO server deserializes frame and triggers event handler

**Code:**
```typescript
io.on('connection', (socket: Socket) => {
  console.log(`[Socket.IO] Client connected: ${socket.id}`);
  
  // Attach user info from JWT
  socket.user = decodeToken(socket.handshake.auth.token);
  
  // Setup chat handlers
  setupChatHandlers(socket);
});
```

**Logs:**
```
[Socket.IO] Client connected: abc123xyz
[Socket.IO] User authenticated: user@example.com (ID: user-456)
[Chat Socket] Setting up chat handlers for user: user@example.com
```

**Time Elapsed:** 15ms

---

### 3.2 Chat Handler Processes Event

**Location:** `backend-node/src/sockets/chat-socket.ts`

**Action:** `chat:send-message` handler executes

**Code:**
```typescript
socket.on('chat:send-message', async (data: ChatMessageData) => {
  try {
    const { sessionId, message, timestamp } = data;

    console.log('[Chat Socket] Message received:', {
      sessionId,
      messageLength: message.length,
      user: user.email,
      timestamp
    });

    // Step 3.2.1: Validation
    if (!sessionId || !message) {
      socket.emit('chat:error', { error: 'Missing required fields' });
      return;
    }

    // Step 3.2.2: Send acknowledgment
    socket.emit('chat:message-sent', {
      role: 'user',
      content: message,
      timestamp: new Date()
    });

    // Step 3.2.3: Show typing indicator
    socket.emit('chat:typing', { isTyping: true });

    // Step 3.2.4: Forward to Java VA (next stage)
    const javaResponse = await javaVAClient.post(
      `/chat/message`,
      { sessionId, message },
      { timeout: 30000 }
    );

    // ... (continued in Stage 5)
  } catch (error) {
    // Error handling
  }
});
```

**Logs:**
```
[Chat Socket] Message received: {
  sessionId: 'session-abc123',
  messageLength: 33,
  user: 'user@example.com',
  timestamp: '2026-01-15T10:30:00.000Z'
}
```

**Emitted Events:**
1. `chat:message-sent` → Frontend (acknowledgment)
2. `chat:typing` → Frontend (isTyping: true)

**Time Elapsed:** 20ms

---

## Stage 4: Backend Calls Java VA Service (30ms - 40ms)

### 4.1 HTTP POST to Java Service

**Location:** `backend-node/src/services/apiClient.ts`

**Action:** Node.js makes HTTP POST request to Java VA service

**Code:**
```typescript
const javaVAClient = {
  post: async (url: string, data: any, config: any, fallback?: Function) => {
    try {
      console.log(`[Java VA Client] POST ${JAVA_VA_URL}${url}`);
      console.log('[Java VA Client] Request:', data);

      const response = await axios.post(
        `${JAVA_VA_URL}${url}`,
        data,
        {
          headers: {
            'Content-Type': 'application/json',
            'X-Tenant-Id': 'tenant-123',
            'X-User-Id': 'user-456'
          },
          timeout: config.timeout || 30000
        }
      );

      console.log('[Java VA Client] Response:', response.status);
      return response;

    } catch (error) {
      if (fallback) {
        console.log('[Java VA Client] Using fallback response');
        return { data: fallback() };
      }
      throw error;
    }
  }
};
```

**HTTP Request:**
```http
POST /chat/message HTTP/1.1
Host: localhost:8136
Content-Type: application/json
X-Tenant-Id: tenant-123
X-User-Id: user-456
Content-Length: 78

{
  "sessionId": "session-abc123",
  "message": "Book an appointment for tomorrow"
}
```

**Protocol:** HTTP/1.1
**Port:** 8136
**Method:** POST
**Size:** ~150 bytes (JSON payload)

**Time Elapsed:** 30ms - 40ms (HTTP overhead + network)

---

## Stage 5: Java Receives Request (40ms - 60ms)

### 5.1 Spring Boot Controller Receives Request

**Location:** `services-java/va-service/.../controller/ChatSessionController.java`

**Action:** REST endpoint receives HTTP POST

**Code:**
```java
@RestController
@RequestMapping("/chat")
public class ChatSessionController {

    @Autowired
    private ChatSessionService chatSessionService;

    @PostMapping("/message")
    public ResponseEntity<ChatResponse> sendMessage(
        @RequestBody ChatRequest request,
        @RequestHeader("X-User-Id") String userId,
        @RequestHeader("X-Tenant-Id") String tenantId
    ) {
        logger.info("Received message - sessionId: {}, userId: {}", 
            request.getSessionId(), userId);
        
        // Step 5.1.1: Validate request
        if (request.getSessionId() == null || request.getMessage() == null) {
            return ResponseEntity.badRequest().build();
        }

        // Step 5.1.2: Set user context
        request.setCustomerId(userId);
        request.setTenantId(tenantId);

        // Step 5.1.3: Call service layer
        ChatResponse response = chatSessionService.processMessage(request);

        return ResponseEntity.ok(response);
    }
}
```

**Logs:**
```
[ChatController] Received message - sessionId: session-abc123, userId: user-456
[ChatController] Message: "Book an appointment for tomorrow"
```

**Time Elapsed:** 45ms

---

### 5.2 Service Layer Processes Message

**Location:** `services-java/va-service/.../service/ChatSessionService.java`

**Action:** Core business logic execution

**Code:**
```java
@Service
public class ChatSessionService {

    @Autowired
    private SessionRepository sessionRepository;

    @Autowired
    private DialogManager dialogManager;

    @Autowired
    private LlmClient llmClient;

    @Autowired
    private IntentClassifier intentClassifier;

    public ChatResponse processMessage(ChatRequest request) {
        long startTime = System.currentTimeMillis();

        // Step 5.2.1: Load session from MongoDB
        SessionState session = sessionRepository
            .findById(request.getSessionId())
            .orElseThrow(() -> new SessionNotFoundException(request.getSessionId()));

        logger.info("Session loaded - dialogState: {}, turns: {}", 
            session.getDialogState(), session.getTurns().size());

        // Step 5.2.2: Validate session ownership
        if (!session.getCustomerId().equals(request.getCustomerId())) {
            throw new UnauthorizedException("Session does not belong to user");
        }

        // Step 5.2.3: Detect intent
        String intent = intentClassifier.classify(request.getMessage());
        logger.info("Intent detected: {}", intent);

        // Step 5.2.4: Process with dialog manager
        DialogOutput dialogOutput = dialogManager.processInput(
            request.getMessage(),
            session.getDialogState(),
            intent
        );

        logger.info("Dialog manager output - nextState: {}, requiresAction: {}", 
            dialogOutput.getNextState(), dialogOutput.requiresAction());

        // Step 5.2.5: Generate LLM response (longest step)
        String llmResponse = llmClient.generate(
            dialogOutput.getPrompt(),
            session.getConversationHistory(),
            intent
        );

        logger.info("LLM response generated - length: {}", llmResponse.length());

        // Step 5.2.6: Save conversation turn
        Turn userTurn = new Turn("user", request.getMessage(), System.currentTimeMillis());
        Turn assistantTurn = new Turn("assistant", llmResponse, System.currentTimeMillis());
        
        session.addTurn(userTurn);
        session.addTurn(assistantTurn);
        session.setDialogState(dialogOutput.getNextState());
        session.setLastUpdated(System.currentTimeMillis());

        sessionRepository.save(session);

        logger.info("Session updated - total processing time: {}ms", 
            System.currentTimeMillis() - startTime);

        // Step 5.2.7: Build response
        return ChatResponse.builder()
            .sessionId(session.getId())
            .message(llmResponse)
            .intent(intent)
            .requiresAction(dialogOutput.requiresAction())
            .suggestedAction(dialogOutput.getSuggestedAction())
            .build();
    }
}
```

**Execution Breakdown:**

| Sub-stage | Operation | Time |
|-----------|-----------|------|
| 5.2.1 | Load session from MongoDB | 20ms |
| 5.2.2 | Validate ownership | 1ms |
| 5.2.3 | Intent classification | 50ms |
| 5.2.4 | Dialog manager processing | 10ms |
| 5.2.5 | LLM API call | **500-3000ms** |
| 5.2.6 | Save to MongoDB | 30ms |
| 5.2.7 | Build response | 1ms |
| **Total** | | **612-3112ms** |

**Logs:**
```
[ChatSessionService] Session loaded - dialogState: IDLE, turns: 4
[IntentClassifier] Intent detected: book_appointment
[DialogManager] Dialog output - nextState: APPOINTMENT_BOOKING, requiresAction: true
[LlmClient] Calling OpenAI API - model: gpt-4, tokens: 150
[LlmClient] LLM response generated - length: 87
[ChatSessionService] Session updated - total processing time: 612ms
```

**MongoDB Operations:**

1. **findById(sessionId)**
```javascript
db.sessions.findOne({ _id: "session-abc123" })
// Returns:
{
  _id: "session-abc123",
  customerId: "user-456",
  productId: "va-service",
  dialogState: "IDLE",
  transcript: [
    { speaker: "user", text: "Hello", timestamp: 1705316400000 },
    { speaker: "assistant", text: "Hi! How can I help?", timestamp: 1705316401000 }
  ],
  lastUpdated: 1705316401000
}
```

2. **save(session)**
```javascript
db.sessions.updateOne(
  { _id: "session-abc123" },
  {
    $set: {
      dialogState: "APPOINTMENT_BOOKING",
      lastUpdated: 1705317000000
    },
    $push: {
      transcript: {
        $each: [
          { speaker: "user", text: "Book an appointment for tomorrow", timestamp: 1705317000000 },
          { speaker: "assistant", text: "I can help you book an appointment...", timestamp: 1705317001000 }
        ]
      }
    }
  }
)
```

**Time Elapsed:** 612ms (typical case)

---

### 5.3 LLM API Call (The Bottleneck)

**Location:** `services-java/va-service/.../llm/LlmClient.java`

**Action:** Call OpenAI API for response generation

**Code:**
```java
public String generate(String prompt, List<Turn> history, String intent) {
    logger.info("LLM generation started - prompt length: {}, history turns: {}", 
        prompt.length(), history.size());

    // Build messages array
    List<Map<String, String>> messages = new ArrayList<>();
    
    // System message
    messages.add(Map.of(
        "role", "system",
        "content", "You are a helpful virtual assistant..."
    ));

    // Conversation history
    for (Turn turn : history) {
        messages.add(Map.of(
            "role", turn.getSpeaker().equals("user") ? "user" : "assistant",
            "content", turn.getText()
        ));
    }

    // Current prompt
    messages.add(Map.of(
        "role", "user",
        "content", prompt
    ));

    // Call OpenAI API
    HttpHeaders headers = new HttpHeaders();
    headers.setBearerAuth(openaiApiKey);
    headers.setContentType(MediaType.APPLICATION_JSON);

    Map<String, Object> requestBody = Map.of(
        "model", "gpt-4",
        "messages", messages,
        "max_tokens", 150,
        "temperature", 0.7
    );

    HttpEntity<Map<String, Object>> request = new HttpEntity<>(requestBody, headers);

    long apiCallStart = System.currentTimeMillis();
    ResponseEntity<Map> response = restTemplate.postForEntity(
        "https://api.openai.com/v1/chat/completions",
        request,
        Map.class
    );
    long apiCallTime = System.currentTimeMillis() - apiCallStart;

    logger.info("OpenAI API responded in {}ms", apiCallTime);

    // Extract response
    Map<String, Object> responseBody = response.getBody();
    List<Map> choices = (List<Map>) responseBody.get("choices");
    Map<String, Object> firstChoice = choices.get(0);
    Map<String, String> message = (Map<String, String>) firstChoice.get("message");

    String content = message.get("content");
    logger.info("LLM response: {}", content);

    return content;
}
```

**OpenAI API Request:**
```http
POST /v1/chat/completions HTTP/1.1
Host: api.openai.com
Authorization: Bearer sk-xxxxx
Content-Type: application/json

{
  "model": "gpt-4",
  "messages": [
    { "role": "system", "content": "You are a helpful virtual assistant..." },
    { "role": "user", "content": "Hello" },
    { "role": "assistant", "content": "Hi! How can I help?" },
    { "role": "user", "content": "Book an appointment for tomorrow" }
  ],
  "max_tokens": 150,
  "temperature": 0.7
}
```

**OpenAI API Response:**
```json
{
  "id": "chatcmpl-abc123",
  "object": "chat.completion",
  "created": 1705317001,
  "model": "gpt-4",
  "choices": [
    {
      "index": 0,
      "message": {
        "role": "assistant",
        "content": "I can help you book an appointment for tomorrow. What time would work best for you?"
      },
      "finish_reason": "stop"
    }
  ],
  "usage": {
    "prompt_tokens": 45,
    "completion_tokens": 18,
    "total_tokens": 63
  }
}
```

**Time Elapsed:** 500-3000ms (variable, depends on OpenAI load)

**Logs:**
```
[LlmClient] LLM generation started - prompt length: 35, history turns: 2
[LlmClient] Calling OpenAI API - model: gpt-4
[LlmClient] OpenAI API responded in 612ms
[LlmClient] LLM response: "I can help you book an appointment for tomorrow..."
```

---

## Stage 6: Java Returns Response (3100ms - 3120ms)

### 6.1 Controller Sends HTTP Response

**Location:** `ChatSessionController.java`

**Action:** Return ChatResponse as JSON

**HTTP Response:**
```http
HTTP/1.1 200 OK
Content-Type: application/json
Content-Length: 185

{
  "sessionId": "session-abc123",
  "message": "I can help you book an appointment for tomorrow. What time would work best for you?",
  "intent": "book_appointment",
  "requiresAction": true,
  "suggestedAction": "select_time"
}
```

**Time Elapsed:** 3110ms (total Java processing + LLM)

---

## Stage 7: Backend Receives Java Response (3120ms - 3130ms)

### 7.1 Node.js Processes Response

**Location:** `backend-node/src/sockets/chat-socket.ts`

**Action:** Parse Java response and emit to frontend

**Code:**
```typescript
// (continued from Stage 3.2)

// Received Java response
const javaResponse = await javaVAClient.post(/* ... */);

// Step 7.1.1: Stop typing indicator
socket.emit('chat:typing', { isTyping: false });

// Step 7.1.2: Extract response data
const response = javaResponse.data as ChatResponse;

console.log('[Chat Socket] Response from Java VA:', {
  sessionId: response.sessionId,
  messageLength: response.message.length,
  intent: response.intent,
  requiresAction: response.requiresAction
});

// Step 7.1.3: Send assistant response to frontend
socket.emit('chat:message-received', {
  role: 'assistant',
  content: response.message,
  timestamp: new Date(),
  intent: response.intent,
  requiresAction: response.requiresAction,
  suggestedAction: response.suggestedAction
});
```

**WebSocket Frame Sent:**
```
WebSocket Frame (Binary):
┌──────────────────────────────────────────────────────────┐
│ Type: Message                                            │
│ Event: "chat:message-received"                          │
│ Payload (JSON): {                                       │
│   "role": "assistant",                                  │
│   "content": "I can help you book an appointment...",  │
│   "timestamp": "2026-01-15T10:30:03.130Z",             │
│   "intent": "book_appointment",                         │
│   "requiresAction": true,                               │
│   "suggestedAction": "select_time"                      │
│ }                                                        │
└──────────────────────────────────────────────────────────┘
```

**Logs:**
```
[Chat Socket] Response from Java VA: {
  sessionId: 'session-abc123',
  messageLength: 87,
  intent: 'book_appointment',
  requiresAction: true
}
[Socket.IO] Emitted chat:message-received to client abc123xyz
```

**Time Elapsed:** 3125ms

---

## Stage 8: Frontend Receives Response (3130ms - 3150ms)

### 8.1 Socket.IO Client Receives Event

**Location:** `frontend/src/components/AssistantChat.tsx`

**Action:** Event handler processes assistant response

**Code:**
```typescript
useEffect(() => {
  if (!socket) return;

  const handleMessageReceived = (data: any) => {
    console.log('[AssistantChat] Message received from assistant:', {
      contentLength: data.content.length,
      intent: data.intent,
      requiresAction: data.requiresAction
    });

    // Step 8.1.1: Add message to state
    setMessages(prev => [...prev, {
      role: data.role,
      content: data.content,
      timestamp: data.timestamp,
      intent: data.intent
    }]);

    // Step 8.1.2: Handle suggested actions
    if (data.requiresAction && data.suggestedAction) {
      setSuggestedActions([data.suggestedAction]);
    }

    // Step 8.1.3: Scroll to bottom
    setTimeout(() => scrollToBottom(), 100);
  };

  socket.on('chat:message-received', handleMessageReceived);

  return () => {
    socket.off('chat:message-received', handleMessageReceived);
  };
}, [socket]);
```

**React State Update:**
```javascript
// Before:
messages = [
  { role: 'user', content: 'Hello', timestamp: '...' },
  { role: 'assistant', content: 'Hi! How can I help?', timestamp: '...' },
  { role: 'user', content: 'Book an appointment for tomorrow', timestamp: '...' }
]

// After:
messages = [
  { role: 'user', content: 'Hello', timestamp: '...' },
  { role: 'assistant', content: 'Hi! How can I help?', timestamp: '...' },
  { role: 'user', content: 'Book an appointment for tomorrow', timestamp: '...' },
  { 
    role: 'assistant', 
    content: 'I can help you book an appointment for tomorrow. What time would work best for you?',
    timestamp: '2026-01-15T10:30:03.130Z',
    intent: 'book_appointment'
  }
]
```

**UI Update:**
- New message bubble rendered
- Typing indicator removed
- Suggested action buttons appear
- Auto-scroll to bottom

**Time Elapsed:** 3140ms

**Logs:**
```
[AssistantChat] Message received from assistant: {
  contentLength: 87,
  intent: 'book_appointment',
  requiresAction: true
}
[AssistantChat] Scrolling to bottom
```

---

## Complete Timeline Summary

| Time | Stage | Component | Action | Protocol |
|------|-------|-----------|--------|----------|
| 0ms | 1 | Frontend | User clicks Send | - |
| 5ms | 1 | Frontend | React state update | - |
| 10ms | 2 | Frontend | Socket.IO emit | WebSocket |
| 15ms | 3 | Backend | Socket.IO receive | WebSocket |
| 20ms | 3 | Backend | Event handler start | - |
| 25ms | 3 | Backend | Emit acknowledgment | WebSocket |
| 30ms | 4 | Backend | HTTP POST to Java | HTTP/1.1 |
| 40ms | 5 | Java | Controller receives | HTTP/1.1 |
| 45ms | 5 | Java | Service layer start | - |
| 65ms | 5 | Java | Load session (MongoDB) | MongoDB |
| 115ms | 5 | Java | Intent classification | - |
| 125ms | 5 | Java | Dialog manager | - |
| **135ms** | **5** | **Java** | **LLM API call starts** | **HTTPS** |
| **635ms** | **5** | **Java** | **LLM response received** | **HTTPS** |
| 665ms | 5 | Java | Save to MongoDB | MongoDB |
| 3110ms | 6 | Java | Return HTTP response | HTTP/1.1 |
| 3120ms | 7 | Backend | Process response | - |
| 3125ms | 7 | Backend | Socket.IO emit | WebSocket |
| 3130ms | 8 | Frontend | Socket.IO receive | WebSocket |
| 3140ms | 8 | Frontend | React re-render | - |
| **3150ms** | **8** | **Frontend** | **UI updated, visible** | **-** |

**Total User-Perceived Latency:** ~3.15 seconds

**Breakdown:**
- Network overhead: ~50ms (WebSocket + HTTP)
- Java processing (non-LLM): ~100ms
- **LLM API call: ~500-3000ms** (90% of total time)
- Frontend rendering: ~10ms

---

## Optimization Opportunities

### 1. Streaming LLM Responses

**Current:** Wait for full response
**Optimized:** Stream tokens as they arrive

```java
// Streaming implementation
public void sendMessageStream(ChatRequest request, StreamObserver<ChatResponse> responseObserver) {
    // Call LLM with streaming
    Stream<String> tokenStream = llmClient.generateStream(prompt);
    
    tokenStream.forEach(token -> {
        ChatResponse chunk = ChatResponse.newBuilder()
            .setSessionId(sessionId)
            .setMessage(token)
            .setIsFinal(false)
            .build();
        
        responseObserver.onNext(chunk);  // Send each token immediately
    });
    
    // Final chunk with metadata
    ChatResponse finalChunk = ChatResponse.newBuilder()
        .setIntent(intent)
        .setIsFinal(true)
        .build();
    responseObserver.onNext(finalChunk);
    responseObserver.onCompleted();
}
```

**Result:** User sees response after ~100ms instead of 3000ms

---

### 2. Caching Intent Classification

```java
@Cacheable("intents")
public String classify(String message) {
    // Cache frequently asked questions
    return intentClassifier.classify(message);
}
```

**Result:** Intent classification: 50ms → 2ms

---

### 3. MongoDB Connection Pooling

```java
@Configuration
public class MongoConfig {
    @Bean
    public MongoClient mongoClient() {
        return MongoClients.create(MongoClientSettings.builder()
            .applyToConnectionPoolSettings(builder ->
                builder.maxSize(50)
                       .minSize(10)
                       .maxWaitTime(2000, TimeUnit.MILLISECONDS)
            )
            .build());
    }
}
```

**Result:** MongoDB queries: 20ms → 5ms

---

## Debugging Guide

### Check Each Layer

**1. Frontend Console:**
```javascript
// Enable debug logging
localStorage.setItem('debug', 'socket.io-client:*');

// Check socket connection
console.log('Socket connected:', socket.connected);
console.log('Socket ID:', socket.id);

// Monitor events
socket.onAny((event, ...args) => {
  console.log(`[Socket Event] ${event}:`, args);
});
```

**2. Backend Logs:**
```bash
# Watch Socket.IO events
tail -f logs/backend.log | grep "Chat Socket"

# Check gRPC calls
tail -f logs/backend.log | grep "gRPC"
```

**3. Java Logs:**
```bash
# Watch incoming requests
tail -f logs/va-service.log | grep "ChatController"

# Monitor LLM calls
tail -f logs/va-service.log | grep "LlmClient"

# Track processing time
tail -f logs/va-service.log | grep "processing time"
```

**4. Network Inspection:**
```bash
# Chrome DevTools → Network → WS (WebSocket frames)
# Chrome DevTools → Network → XHR (HTTP requests)
```

---

## Error Scenarios

### Scenario 1: LLM API Timeout

**Problem:** OpenAI API takes >30s

**Flow:**
1. Java waits 30s for LLM response
2. Timeout exception thrown
3. Caught by `ChatSessionService`
4. Returns fallback response
5. Backend emits error event
6. Frontend shows "Sorry, I'm having trouble..."

**Code:**
```java
try {
    String response = llmClient.generate(prompt, history);
} catch (SocketTimeoutException e) {
    logger.error("LLM timeout", e);
    return "I apologize, but I'm experiencing delays. Please try again.";
}
```

---

### Scenario 2: WebSocket Disconnection

**Problem:** User's internet drops

**Flow:**
1. WebSocket connection closed
2. Frontend detects disconnect
3. Shows "Disconnected" indicator
4. Auto-reconnect after 1s, 2s, 4s...
5. On reconnect, rejoin session
6. Fetch missed messages

**Code:**
```typescript
socket.on('disconnect', (reason) => {
  console.warn('[Socket] Disconnected:', reason);
  setConnectionStatus('Disconnected 🔴');
  
  if (reason === 'io server disconnect') {
    // Manual reconnect needed
    socket.connect();
  }
});

socket.on('reconnect', (attemptNumber) => {
  console.log('[Socket] Reconnected after', attemptNumber, 'attempts');
  setConnectionStatus('Connected 🟢');
  
  // Rejoin session
  if (sessionId) {
    socket.emit('chat:join-session', sessionId);
    socket.emit('chat:get-history', sessionId);
  }
});
```

---

## Summary

### Key Takeaways

1. **Total latency is dominated by LLM API call** (90% of time)
2. **WebSocket adds minimal overhead** (~10ms vs ~200ms for REST)
3. **MongoDB queries are fast** (~20ms with proper indexes)
4. **Streaming will dramatically improve UX** (3s → 100ms perceived latency)
5. **Multiple layers provide resilience** (fallbacks at each stage)

### Performance Targets

| Metric | Current | Target | Method |
|--------|---------|--------|--------|
| Total latency | 3.15s | 0.5s | LLM streaming |
| Network overhead | 50ms | 30ms | gRPC everywhere |
| MongoDB query | 20ms | 5ms | Connection pooling |
| Intent classification | 50ms | 2ms | Caching |

---

**Next Document:** [ERROR_HANDLING_PATTERNS.md](./ERROR_HANDLING_PATTERNS.md)  
**Previous Document:** [METHOD_HANDLERS_REFERENCE.md](./METHOD_HANDLERS_REFERENCE.md)

**Document Version:** 1.0.0  
**Last Updated:** January 15, 2026
