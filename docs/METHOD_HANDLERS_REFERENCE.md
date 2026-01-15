# Method Handlers Reference Guide

## Overview

This document provides a **comprehensive reference** for all methods, handlers, and functions across the AI Services Platform's communication layers. Each entry includes:

- **Purpose** - What the method does
- **Location** - File path and line reference
- **Inputs** - Parameters with types
- **Outputs** - Return types and values
- **Side Effects** - State changes, database operations, external calls
- **Error Handling** - How errors are managed
- **Code Example** - Usage patterns
- **Related Methods** - Dependencies and call chains

---

## Table of Contents

1. [Frontend Socket Methods](#frontend-socket-methods)
2. [Backend Socket Handlers](#backend-socket-handlers)
3. [Backend gRPC Client Methods](#backend-grpc-client-methods)
4. [Java gRPC Server Methods](#java-grpc-server-methods)
5. [Java Business Logic Services](#java-business-logic-services)
6. [Database Operations](#database-operations)

---

## Frontend Socket Methods

### Location: `frontend/src/hooks/useSocket.ts`

### Method: `useSocket(options)`

**Purpose:** Custom React hook to manage Socket.IO connection lifecycle

**Inputs:**
```typescript
interface UseSocketOptions {
  autoConnect?: boolean;           // Auto-connect on mount (default: true)
  onConnect?: () => void;          // Connect callback
  onDisconnect?: (reason: string) => void;  // Disconnect callback
  onError?: (error: Error) => void;         // Error callback
}
```

**Outputs:**
```typescript
interface UseSocketReturn {
  socket: Socket | null;           // Socket.IO instance
  isConnected: boolean;            // Connection status
  connect: () => void;             // Manual connect
  disconnect: () => void;          // Manual disconnect
  emit: (event: string, data: any) => void;  // Send event
}
```

**Side Effects:**
- Creates Socket.IO connection to backend
- Registers event listeners
- Stores JWT token from cookies
- Updates React state on connection changes

**Code Example:**
```typescript
const { socket, isConnected, emit } = useSocket({
  autoConnect: true,
  onConnect: () => console.log('Connected!'),
  onDisconnect: (reason) => console.log('Disconnected:', reason),
  onError: (error) => console.error('Socket error:', error)
});

useEffect(() => {
  if (socket) {
    socket.on('chat:message-received', handleMessage);
    return () => socket.off('chat:message-received', handleMessage);
  }
}, [socket]);
```

**Error Handling:**
- Connection errors trigger `onError` callback
- Auto-reconnection with exponential backoff (5 attempts)
- Fallback to polling if WebSocket fails

**Related Methods:**
- `connect()` - Manual connection trigger
- `disconnect()` - Cleanup on unmount
- `emit()` - Wrapper for socket.emit with error handling

---

### Method: `socket.emit('chat:send-message', data)`

**Purpose:** Send user message to backend via WebSocket

**Inputs:**
```typescript
interface SendMessageData {
  sessionId: string;    // Active session ID
  message: string;      // User's message text
  timestamp?: string;   // Optional client timestamp
}
```

**Outputs:**
- No direct return value
- Triggers backend `chat:send-message` handler
- Expects `chat:message-sent` and `chat:message-received` responses

**Side Effects:**
- Sends WebSocket frame to server
- Updates local UI (optimistic update)
- Starts loading/typing indicator

**Code Example:**
```typescript
const handleSendMessage = (content: string) => {
  const messageData = {
    sessionId: currentSessionId,
    message: content,
    timestamp: new Date().toISOString()
  };
  
  // Optimistic UI update
  setMessages(prev => [...prev, {
    role: 'user',
    content,
    timestamp: messageData.timestamp
  }]);
  
  // Send via WebSocket
  socket.emit('chat:send-message', messageData);
};
```

**Error Handling:**
- If socket disconnected, fall back to REST API
- Timeout after 30 seconds shows error message
- Retry mechanism for transient failures

**Related Methods:**
- Backend: `socket.on('chat:send-message')` handler
- Backend: `javaVAClient.post('/chat/message')`
- Java: `ChatSessionService.processMessage()`

---

### Method: `socket.on('chat:message-received', handler)`

**Purpose:** Receive assistant responses from backend

**Inputs (received data):**
```typescript
interface MessageReceivedData {
  role: 'assistant';
  content: string;              // Response text
  timestamp: string;
  intent?: string;              // Detected intent
  requiresAction?: boolean;     // If user action needed
  suggestedAction?: string;     // Action name (e.g., 'book_appointment')
}
```

**Outputs:**
- Triggers React state update
- Updates messages array
- Renders response in UI

**Side Effects:**
- Appends message to conversation history
- Clears typing indicator
- Auto-scrolls to bottom
- May trigger suggested action buttons

**Code Example:**
```typescript
useEffect(() => {
  if (!socket) return;

  const handleMessageReceived = (data: MessageReceivedData) => {
    setMessages(prev => [...prev, data]);
    setIsTyping(false);
    
    if (data.requiresAction && data.suggestedAction) {
      setSuggestedActions([data.suggestedAction]);
    }
    
    scrollToBottom();
  };

  socket.on('chat:message-received', handleMessageReceived);

  return () => {
    socket.off('chat:message-received', handleMessageReceived);
  };
}, [socket]);
```

**Error Handling:**
- Validates data structure before rendering
- Handles missing optional fields gracefully
- Logs malformed responses

**Related Methods:**
- Backend: `socket.emit('chat:message-received')` sender
- Frontend: `scrollToBottom()` utility
- Frontend: `setSuggestedActions()` state updater

---

## Backend Socket Handlers

### Location: `backend-node/src/sockets/chat-socket.ts`

### Handler: `socket.on('chat:join-session', sessionId)`

**Purpose:** Add socket to session-specific room for targeted messaging

**Inputs:**
```typescript
sessionId: string    // Session UUID to join
```

**Outputs:**
```typescript
// Emits to joining socket:
socket.emit('chat:session-joined', {
  sessionId: string;
  message: string;
  timestamp: Date;
});

// Broadcasts to room:
socket.to(`session:${sessionId}`).emit('chat:user-joined', {
  userId: string;
  email: string;
  timestamp: Date;
});
```

**Side Effects:**
- Joins Socket.IO room `session:${sessionId}`
- Broadcasts join event to other room members
- Logs join action

**Execution Time:** <5ms

**Code Example:**
```typescript
socket.on('chat:join-session', (sessionId: string) => {
  socket.join(`session:${sessionId}`);
  console.log('[Chat Socket] User', user.email, 'joined session:', sessionId);
  
  socket.to(`session:${sessionId}`).emit('chat:user-joined', {
    userId: user.id,
    email: user.email,
    timestamp: new Date()
  });
});
```

**Error Handling:**
- No explicit error handling (room join always succeeds)
- Invalid sessionId format accepted (client responsibility)

**Related Methods:**
- Frontend: `socket.emit('chat:join-session', sessionId)`
- Backend: `socket.on('chat:leave-session')`
- Backend: `socket.to(room).emit()` broadcasting

---

### Handler: `socket.on('chat:send-message', data)`

**Purpose:** Process user message and forward to Java VA service

**Inputs:**
```typescript
interface ChatMessageData {
  sessionId: string;    // Active session ID
  message: string;      // User's message text
}
```

**Outputs:**
```typescript
// Immediate acknowledgment:
socket.emit('chat:message-sent', {
  role: 'user';
  content: string;
  timestamp: Date;
});

// Typing indicator:
socket.emit('chat:typing', { isTyping: boolean });

// Assistant response:
socket.emit('chat:message-received', {
  role: 'assistant';
  content: string;
  timestamp: Date;
  intent?: string;
  requiresAction?: boolean;
  suggestedAction?: string;
});

// On error:
socket.emit('chat:error', {
  error: string;
  canRetry: boolean;
  circuitState: string;
});
```

**Side Effects:**
- Validates input fields (sessionId, message required)
- Sends acknowledgment to client
- Emits typing indicator (isTyping: true)
- Makes HTTP POST to Java VA service
- Emits response or error
- Emits typing indicator (isTyping: false)

**Execution Time:** 500ms - 5s (depends on LLM processing)

**Code Example:**
```typescript
socket.on('chat:send-message', async (data: ChatMessageData) => {
  try {
    const { sessionId, message } = data;

    // Validation
    if (!sessionId || !message) {
      socket.emit('chat:error', { error: 'Missing required fields' });
      return;
    }

    console.log('[Chat Socket] Message received:', { sessionId, messageLength: message.length });

    // Immediate acknowledgment
    socket.emit('chat:message-sent', {
      role: 'user',
      content: message,
      timestamp: new Date()
    });

    // Show typing
    socket.emit('chat:typing', { isTyping: true });

    // Forward to Java VA
    const javaResponse = await javaVAClient.post(
      `/chat/message`,
      { sessionId, message },
      { timeout: 30000 }
    );

    // Hide typing
    socket.emit('chat:typing', { isTyping: false });

    // Send response
    socket.emit('chat:message-received', {
      role: 'assistant',
      content: javaResponse.data.message,
      timestamp: new Date(),
      intent: javaResponse.data.intent,
      requiresAction: javaResponse.data.requiresAction,
      suggestedAction: javaResponse.data.suggestedAction
    });

  } catch (error: any) {
    console.error('[Chat Socket] Error:', error);
    
    socket.emit('chat:typing', { isTyping: false });
    socket.emit('chat:error', {
      error: 'Failed to process message',
      canRetry: javaVAClient.getCircuitState() !== 'OPEN',
      circuitState: javaVAClient.getCircuitState()
    });
  }
});
```

**Error Handling:**
- **Validation errors:** Return immediately with error event
- **Network errors:** Caught by try-catch, emit chat:error
- **Circuit breaker:** Fallback response if Java service unavailable
- **Timeout:** 30s timeout on Java VA call
- **Cleanup:** Always emit typing:false even on error

**Related Methods:**
- Frontend: `socket.emit('chat:send-message')`
- Backend: `javaVAClient.post('/chat/message')` - HTTP client
- Java: `POST /chat/message` REST endpoint
- Java: `ChatSessionService.processMessage()`

---

### Handler: `socket.on('chat:typing', data)`

**Purpose:** Broadcast typing status to other users in session

**Inputs:**
```typescript
interface TypingData {
  sessionId: string;
  isTyping: boolean;
}
```

**Outputs:**
```typescript
// Broadcasts to others in room (not sender):
socket.to(`session:${sessionId}`).emit('chat:user-typing', {
  userId: string;
  email: string;
  isTyping: boolean;
  timestamp: Date;
});
```

**Side Effects:**
- Broadcasts typing status to session room
- Excludes sender from broadcast

**Execution Time:** <5ms

**Code Example:**
```typescript
socket.on('chat:typing', (data: TypingData) => {
  const { sessionId, isTyping } = data;
  
  socket.to(`session:${sessionId}`).emit('chat:user-typing', {
    userId: user.id,
    email: user.email,
    isTyping,
    timestamp: new Date()
  });
});
```

**Error Handling:**
- No explicit error handling
- Missing sessionId results in no broadcast

**Related Methods:**
- Frontend: `socket.emit('chat:typing')` sender
- Frontend: `socket.on('chat:user-typing')` receiver
- Backend: `socket.to(room).emit()` broadcasting

---

### Handler: `socket.on('chat:end-session', sessionId)`

**Purpose:** End chat session and clean up resources

**Inputs:**
```typescript
sessionId: string    // Session to end
```

**Outputs:**
```typescript
// On success:
socket.emit('chat:session-ended', {
  sessionId: string;
  timestamp: Date;
});

// On error:
socket.emit('chat:error', {
  error: 'Failed to end session properly';
});
```

**Side Effects:**
- Calls Java VA service to end session
- Leaves Socket.IO room
- Logs session end

**Execution Time:** 50-100ms

**Code Example:**
```typescript
socket.on('chat:end-session', async (sessionId: string) => {
  try {
    console.log('[Chat Socket] Ending session:', sessionId);

    await javaVAClient.post(
      `/chat/end`,
      null,
      { params: { sessionId }, timeout: 5000 }
    );

    socket.emit('chat:session-ended', {
      sessionId,
      timestamp: new Date()
    });

    socket.leave(`session:${sessionId}`);

  } catch (error) {
    console.error('[Chat Socket] Error ending session:', error);
    socket.emit('chat:error', { error: 'Failed to end session properly' });
  }
});
```

**Error Handling:**
- Try-catch wraps Java VA call
- Errors emitted to client
- Socket room left regardless of Java VA response

**Related Methods:**
- Frontend: `socket.emit('chat:end-session')`
- Backend: `javaVAClient.post('/chat/end')`
- Java: `POST /chat/end` endpoint
- Java: `ChatSessionService.endSession()`

---

### Handler: `socket.on('chat:get-history', sessionId)`

**Purpose:** Retrieve conversation history for a session

**Inputs:**
```typescript
sessionId: string    // Session to fetch history for
```

**Outputs:**
```typescript
// On success:
socket.emit('chat:history', {
  sessionId: string;
  messages: Array<{
    role: 'user' | 'assistant';
    content: string;
    timestamp: number;
    intent?: string;
  }>;
  timestamp: Date;
});

// On error:
socket.emit('chat:error', {
  error: 'Failed to retrieve chat history';
});
```

**Side Effects:**
- Queries Java VA service for history
- Logs fetch operation

**Execution Time:** 50-200ms

**Code Example:**
```typescript
socket.on('chat:get-history', async (sessionId: string) => {
  try {
    console.log('[Chat Socket] Fetching history for session:', sessionId);

    const historyResponse = await javaVAClient.get(
      `/chat/history/${sessionId}`,
      { timeout: 5000 },
      () => ({ messages: [], sessionId })  // Fallback
    );

    socket.emit('chat:history', {
      sessionId,
      messages: historyResponse.data.messages || [],
      timestamp: new Date()
    });

  } catch (error) {
    console.error('[Chat Socket] Error fetching history:', error);
    socket.emit('chat:error', { error: 'Failed to retrieve chat history' });
  }
});
```

**Error Handling:**
- Circuit breaker provides fallback empty array
- Timeout of 5 seconds
- Errors emitted to client

**Related Methods:**
- Frontend: `socket.emit('chat:get-history')`
- Backend: `javaVAClient.get('/chat/history/:sessionId')`
- Java: `GET /chat/history/{sessionId}` endpoint
- Java: `ChatSessionService.getSession()`

---

## Backend gRPC Client Methods

### Location: `backend-node/src/grpc/client.ts`

### Method: `grpcClient.startChatSession(customerId, productId)`

**Purpose:** Initialize new chat session via gRPC

**Inputs:**
```typescript
customerId: string    // User identifier
productId: string     // Product name (e.g., 'va-service')
```

**Outputs:**
```typescript
Promise<{
  session_id: string;    // Unique session UUID
  greeting: string;      // Initial greeting message
  success: boolean;      // Operation success flag
  error?: string;        // Error message if success=false
}>
```

**Side Effects:**
- Sends gRPC `StartSession` RPC to Java service
- Java creates MongoDB session document
- Java initializes dialog state

**Execution Time:** 50-100ms

**Code Example:**
```typescript
async startChatSession(customerId: string, productId: string): Promise<any> {
  return new Promise((resolve, reject) => {
    this.chatClient.StartSession(
      {
        customer_id: customerId,
        product_id: productId
      },
      (error: grpc.ServiceError | null, response: any) => {
        if (error) {
          console.error('gRPC StartSession error:', error);
          reject(error);
        } else {
          console.log(`gRPC session started: ${response.session_id}`);
          resolve(response);
        }
      }
    );
  });
}

// Usage:
try {
  const session = await grpcClient.startChatSession('user123', 'va-service');
  console.log('Session ID:', session.session_id);
  console.log('Greeting:', session.greeting);
} catch (error) {
  console.error('Failed to start session:', error);
}
```

**Error Handling:**
- gRPC errors (connection, timeout, internal) caught and rejected
- Promise rejection allows caller to handle errors
- Logs errors with context

**Related Methods:**
- Java gRPC: `ChatServiceImpl.startSession()`
- Java service: `ChatSessionService.startSession()`
- MongoDB: Insert session document

---

### Method: `grpcClient.sendMessageStream(sessionId, message)`

**Purpose:** Send message and receive streaming response (future token-by-token)

**Inputs:**
```typescript
sessionId: string    // Active session ID
message: string      // User's message text
```

**Outputs:**
```typescript
grpc.ClientReadableStream<{
  session_id: string;
  message: string;              // Token or full message
  intent?: string;
  requires_action?: boolean;
  suggested_action?: string;
  is_final: boolean;            // True for last chunk
}>
```

**Side Effects:**
- Opens gRPC stream to Java service
- Stream remains open until complete
- Java may emit multiple chunks

**Execution Time:** 500ms - 5s (LLM processing)

**Code Example:**
```typescript
sendMessageStream(sessionId: string, message: string): grpc.ClientReadableStream<any> {
  const request = {
    session_id: sessionId,
    message: message
  };
  
  console.log(`gRPC SendMessageStream: session=${sessionId}`);
  return this.chatClient.SendMessageStream(request);
}

// Usage with Socket.IO:
socket.on('chat:send-message', async ({ sessionId, message }) => {
  const stream = grpcClient.sendMessageStream(sessionId, message);
  
  // Listen for chunks
  stream.on('data', (chunk) => {
    if (chunk.is_final) {
      // Final chunk with metadata
      socket.emit('chat:message-received', {
        role: 'assistant',
        content: chunk.message,
        intent: chunk.intent
      });
    } else {
      // Stream token to frontend
      socket.emit('chat:token', { token: chunk.message });
    }
  });
  
  stream.on('end', () => {
    console.log('[gRPC] Stream completed');
    socket.emit('chat:typing', { isTyping: false });
  });
  
  stream.on('error', (error) => {
    console.error('[gRPC] Stream error:', error);
    socket.emit('chat:error', { error: error.message });
  });
});
```

**Error Handling:**
- Stream errors emitted via 'error' event
- Handle in caller with error listener
- Cleanup on error or completion

**Related Methods:**
- Java gRPC: `ChatServiceImpl.sendMessageStream()`
- Frontend: `socket.on('chat:token')` for streaming tokens
- Backend: `socket.emit('chat:token')` for token forwarding

---

### Method: `grpcClient.sendMessage(sessionId, message)`

**Purpose:** Send message and receive single response (non-streaming fallback)

**Inputs:**
```typescript
sessionId: string    // Active session ID
message: string      // User's message text
```

**Outputs:**
```typescript
Promise<{
  session_id: string;
  message: string;
  intent?: string;
  requires_action?: boolean;
  suggested_action?: string;
  is_final: boolean;
}>
```

**Side Effects:**
- Sends gRPC unary RPC to Java service
- Java processes message and returns complete response

**Execution Time:** 500ms - 5s

**Code Example:**
```typescript
async sendMessage(sessionId: string, message: string): Promise<any> {
  return new Promise((resolve, reject) => {
    this.chatClient.SendMessage(
      { session_id: sessionId, message },
      (error: grpc.ServiceError | null, response: any) => {
        if (error) {
          console.error('gRPC SendMessage error:', error);
          reject(error);
        } else {
          resolve(response);
        }
      }
    );
  });
}

// Usage:
try {
  const response = await grpcClient.sendMessage('session-123', 'Hello');
  console.log('Response:', response.message);
} catch (error) {
  console.error('Failed to send message:', error);
}
```

**Error Handling:**
- gRPC errors rejected in promise
- Caller handles with try-catch
- Logs errors

**Related Methods:**
- Java gRPC: `ChatServiceImpl.sendMessage()`
- Alternative: `sendMessageStream()` for streaming

---

## Java gRPC Server Methods

### Location: `services-java/va-service/.../grpc/ChatServiceImpl.java`

### Method: `startSession(request, responseObserver)`

**Purpose:** Initialize new chat session with dialog state

**Inputs:**
```java
SessionRequest {
  String customer_id;    // User identifier
  String product_id;     // Product name
}
StreamObserver<SessionResponse> responseObserver;
```

**Outputs:**
```java
// Sent via responseObserver.onNext():
SessionResponse {
  String session_id;     // UUID
  String greeting;       // Initial message
  boolean success;       // true
  String error;          // null on success
}
```

**Side Effects:**
- Calls `ChatSessionService.startSession()`
- Creates MongoDB session document
- Initializes dialog manager
- Logs session start

**Execution Time:** 50-100ms

**Code Example:**
```java
@Override
public void startSession(
    SessionRequest request, 
    StreamObserver<SessionResponse> responseObserver
) {
    try {
        logger.info("gRPC StartSession - customerId: {}, productId: {}",
            request.getCustomerId(), request.getProductId());
        
        Map<String, String> result = chatSessionService.startSession(
            request.getCustomerId(),
            request.getProductId()
        );
        
        SessionResponse response = SessionResponse.newBuilder()
            .setSessionId(result.get("sessionId"))
            .setGreeting(result.getOrDefault("greeting", "Hello!"))
            .setSuccess(true)
            .build();
        
        responseObserver.onNext(response);
        responseObserver.onCompleted();
        
    } catch (Exception e) {
        logger.error("Error in startSession gRPC", e);
        responseObserver.onError(
            Status.INTERNAL
                .withDescription("Failed to start session")
                .asRuntimeException()
        );
    }
}
```

**Error Handling:**
- Try-catch wraps all logic
- Exceptions converted to gRPC `Status.INTERNAL`
- Sent via `responseObserver.onError()`
- Client receives as rejected promise

**Related Methods:**
- Called by: Node.js `grpcClient.startChatSession()`
- Calls: `ChatSessionService.startSession()`
- Database: MongoDB session insert

---

### Method: `sendMessageStream(request, responseObserver)`

**Purpose:** Process message and stream response chunks (token-by-token)

**Inputs:**
```java
ChatRequest {
  String session_id;
  String message;
  String customer_id;
}
StreamObserver<ChatResponse> responseObserver;
```

**Outputs:**
```java
// Multiple ChatResponse messages via responseObserver.onNext():
ChatResponse {
  String session_id;
  String message;              // Token or full message
  String intent;
  boolean requires_action;
  String suggested_action;
  boolean is_final;            // true for last chunk
  Map<String, String> extracted_slots;
}
```

**Side Effects:**
- Validates session ownership
- Calls `ChatSessionService.processMessage()`
- Calls LLM (OpenAI/Claude)
- Intent detection
- Entity extraction
- Stores turn in MongoDB

**Execution Time:** 500ms - 5s (LLM dependent)

**Current Implementation:** Non-streaming (single response)

**Future Implementation:**
```java
// Pseudocode for true streaming
Stream<String> tokenStream = llmClient.generateStream(message);

tokenStream.forEach(token -> {
    ChatResponse chunk = ChatResponse.newBuilder()
        .setSessionId(sessionId)
        .setMessage(token)
        .setIsFinal(false)
        .build();
    responseObserver.onNext(chunk);
});

ChatResponse finalChunk = ChatResponse.newBuilder()
    .setSessionId(sessionId)
    .setMessage("")
    .setIntent(detectedIntent)
    .setIsFinal(true)
    .build();
responseObserver.onNext(finalChunk);
responseObserver.onCompleted();
```

**Error Handling:**
- Try-catch wraps processing
- gRPC status codes for different errors
- Logged with context

**Related Methods:**
- Called by: Node.js `grpcClient.sendMessageStream()`
- Calls: `ChatSessionService.processMessage()`
- Calls: `DialogManager.processInput()`
- Calls: `LlmClient.generate()`

---

## Java Business Logic Services

### Location: `services-java/va-service/.../service/ChatSessionService.java`

### Method: `processMessage(ChatRequest request)`

**Purpose:** Core business logic for processing user messages

**Inputs:**
```java
ChatRequest {
  String sessionId;
  String message;
  String customerId;
}
```

**Outputs:**
```java
ChatResponse {
  String sessionId;
  String message;              // Assistant response
  String intent;               // Detected intent
  boolean requiresAction;      // If action needed
  String suggestedAction;      // Action name
}
```

**Side Effects:**
- Loads session from MongoDB
- Updates dialog state
- Calls DialogManager
- Calls LLM service
- Performs intent detection
- Extracts entities
- Saves turn to MongoDB
- Updates session document

**Execution Time:** 500ms - 5s

**Code Example:**
```java
public ChatResponse processMessage(ChatRequest request) {
    // 1. Load session
    SessionState session = sessionRepository.findById(request.getSessionId())
        .orElseThrow(() -> new IllegalArgumentException("Session not found"));
    
    // 2. Validate ownership
    if (!session.getCustomerId().equals(request.getCustomerId())) {
        throw new SecurityException("Unauthorized access");
    }
    
    // 3. Process with dialog manager
    DialogOutput output = dialogManager.processInput(
        request.getMessage(),
        session.getDialogState()
    );
    
    // 4. Generate LLM response
    String llmResponse = llmClient.generate(
        output.getPrompt(),
        session.getConversationHistory()
    );
    
    // 5. Intent detection
    String intent = intentClassifier.classify(request.getMessage());
    
    // 6. Entity extraction
    Map<String, String> entities = entityExtractor.extract(request.getMessage());
    
    // 7. Save turn
    Turn userTurn = new Turn("user", request.getMessage(), System.currentTimeMillis());
    Turn assistantTurn = new Turn("assistant", llmResponse, System.currentTimeMillis());
    session.addTurn(userTurn);
    session.addTurn(assistantTurn);
    
    // 8. Update session
    session.setDialogState(output.getNextState());
    sessionRepository.save(session);
    
    // 9. Build response
    return ChatResponse.builder()
        .sessionId(session.getId())
        .message(llmResponse)
        .intent(intent)
        .requiresAction(output.requiresAction())
        .suggestedAction(output.getSuggestedAction())
        .build();
}
```

**Error Handling:**
- Session not found: `IllegalArgumentException`
- Authorization failure: `SecurityException`
- LLM errors: Retry with exponential backoff
- Database errors: Logged and rethrown

**Related Methods:**
- Called by: gRPC `sendMessageStream()` or REST `/chat/message`
- Calls: `DialogManager.processInput()`
- Calls: `LlmClient.generate()`
- Calls: `IntentClassifier.classify()`
- Calls: `EntityExtractor.extract()`
- Database: MongoDB `sessionRepository.save()`

---

## Summary Tables

### Event Flow Summary

| Layer | Event/Method | Next Layer | Execution Time |
|-------|--------------|------------|----------------|
| Frontend | `socket.emit('chat:send-message')` | Backend Socket | 5ms |
| Backend Socket | `socket.on('chat:send-message')` | Backend gRPC | 10ms |
| Backend gRPC | `grpcClient.sendMessageStream()` | Java gRPC | 5ms |
| Java gRPC | `sendMessageStream()` | Java Service | 5ms |
| Java Service | `ChatSessionService.processMessage()` | LLM API | 500-5000ms |
| LLM API | Response | Java Service | 5ms |
| Java Service | Return | Java gRPC | 5ms |
| Java gRPC | Stream response | Backend gRPC | 5ms |
| Backend gRPC | Emit event | Backend Socket | 5ms |
| Backend Socket | `socket.emit('chat:message-received')` | Frontend | 5ms |
| Frontend | Update UI | User | 10ms |

**Total:** ~550-5050ms (depending on LLM)

---

### Error Code Reference

| Error Type | Frontend | Backend | Java | gRPC Code |
|-----------|----------|---------|------|-----------|
| Not authenticated | Redirect to login | 401 | - | UNAUTHENTICATED |
| Session not found | Show error | 404 | IllegalArgumentException | NOT_FOUND |
| Invalid input | Form validation | 400 | ValidationException | INVALID_ARGUMENT |
| Timeout | Show retry | 408 | TimeoutException | DEADLINE_EXCEEDED |
| Service down | Fallback to REST | 503 | - | UNAVAILABLE |
| Internal error | Generic error | 500 | Exception | INTERNAL |

---

**Next Document:** [END_TO_END_INTEGRATION_GUIDE.md](./END_TO_END_INTEGRATION_GUIDE.md)  
**Previous Document:** [GRPC_STREAMING_FLOW.md](./GRPC_STREAMING_FLOW.md)

**Document Version:** 1.0.0  
**Last Updated:** January 15, 2026
