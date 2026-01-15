# WebSocket Communication: Detailed Flow Documentation

📑 **Table of Contents**
- [Overview](#overview)
- [Architecture Layers](#architecture-layers)
- [Part 1: WebSocket Connection Lifecycle](#part-1-websocket-connection-lifecycle)
  - [1.1 Initial Connection (Frontend → Backend)](#11-initial-connection-frontend--backend)
  - [1.2 Joining a Chat Session (Session Room Management)](#12-joining-a-chat-session-session-room-management)
- [Part 2: Sending a Message (Complete Bidirectional Flow)](#part-2-sending-a-message-complete-bidirectional-flow)
  - [2.1 User Sends Message (Frontend → Backend)](#21-user-sends-message-frontend--backend)
  - [2.2 Backend Receives Message](#22-backend-receives-message)
  - [2.3 Backend Forwards to Java VA Service](#23-backend-forwards-to-java-va-service)
  - [2.4 Backend Sends Response to Frontend](#24-backend-sends-response-to-frontend)
  - [2.5 Frontend Receives Response](#25-frontend-receives-response)
- [Part 3: Typing Indicators (Real-Time Feedback)](#part-3-typing-indicators-real-time-feedback)
  - [3.1 User Starts Typing](#31-user-starts-typing)
  - [3.2 Backend Broadcasts Typing Status](#32-backend-broadcasts-typing-status)
  - [3.3 Frontend Shows Typing Indicator](#33-frontend-shows-typing-indicator)
- [Part 4: Error Handling & Fallbacks](#part-4-error-handling--fallbacks)
  - [4.1 Connection Loss Handling](#41-connection-loss-handling)
  - [4.2 REST API Fallback](#42-rest-api-fallback)
  - [4.3 Timeout Handling](#43-timeout-handling)
- [Part 5: Method Reference Table](#part-5-method-reference-table)
  - [Frontend Methods (`useSocket.ts`)](#frontend-methods-usesocketts)
  - [Backend Socket Handlers (`chat-socket.ts`)](#backend-socket-handlers-chat-socketts)
- [Part 6: Data Flow Diagrams](#part-6-data-flow-diagrams)
  - [Complete Message Flow (Timing)](#complete-message-flow-timing)
- [Part 7: Comparison: WebSocket vs REST](#part-7-comparison-websocket-vs-rest)
- [Part 8: Advanced Topics](#part-8-advanced-topics)
  - [8.1 WebSocket Rooms (Detailed)](#81-websocket-rooms-detailed)
  - [8.2 Namespace Segregation](#82-namespace-segregation)
- [Summary](#summary)
  - [Key Takeaways](#key-takeaways)
  - [Next Steps](#next-steps)

---

## Overview

This document provides a comprehensive explanation of how WebSocket (Socket.IO) bidirectional communication works in the AI Services Platform, including:
- **Complete message lifecycle**
- **Method-by-method responsibilities**
- **Code execution flow**
- **Two-way communication patterns**

## Architecture Layers

```
┌─────────────────────────────────────────────────────────────────────┐
│ Layer 1: Frontend (React + Socket.IO Client)                        │
│ Files: frontend/src/hooks/useSocket.ts                             │
│        frontend/src/components/AssistantChat.tsx                    │
└──────────────────────────┬──────────────────────────────────────────┘
                           │
                           │ WebSocket Connection
                           │ (Bidirectional, Persistent)
                           ↓
┌─────────────────────────────────────────────────────────────────────┐
│ Layer 2: Backend Socket.IO Server (Node.js)                        │
│ Files: backend-node/src/config/socket.ts                           │
│        backend-node/src/sockets/chat-socket.ts                     │
└──────────────────────────┬──────────────────────────────────────────┘
                           │
                           │ HTTP/REST or gRPC
                           ↓
┌─────────────────────────────────────────────────────────────────────┐
│ Layer 3: Java VA Service (Spring Boot)                             │
│ Files: services-java/va-service/.../ChatServiceImpl.java           │
│        services-java/va-service/.../ChatSessionService.java        │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Part 1: WebSocket Connection Lifecycle

### 1.1 Initial Connection (Frontend → Backend)

**File:** `frontend/src/hooks/useSocket.ts`

```typescript
// STEP 1: User loads the page, useSocket hook initializes
const { socket, isConnected } = useSocket({
  autoConnect: true,
  onConnect: () => console.log('Connected to server'),
  onDisconnect: (reason) => console.log('Disconnected:', reason)
});
```

**What Happens:**
1. **`useSocket` hook creates Socket.IO client instance**
   ```typescript
   const socketInstance = io(SOCKET_URL, {
     auth: { token: getAuthToken() }, // JWT from cookies
     transports: ['websocket', 'polling'], // Try WebSocket first
     reconnection: true,
     reconnectionAttempts: 5
   });
   ```

2. **Connection Request Sent:**
   - Browser establishes WebSocket handshake to `ws://localhost:5000`
   - Sends HTTP Upgrade request with JWT token in headers
   - Socket.IO negotiates protocol version

3. **Backend Authentication Middleware Executes:**

**File:** `backend-node/src/config/socket.ts`

```typescript
// STEP 2: Server receives connection request
io.use(async (socket, next) => {
  try {
    const token = socket.handshake.auth.token;
    
    // Verify JWT token
    const decoded = jwt.verify(token, JWT_SECRET);
    
    // Attach user info to socket
    socket.user = {
      customerId: decoded.customerId,
      email: decoded.email,
      tenantId: decoded.tenantId
    };
    
    console.log(`[Socket.IO] Client authenticated: ${socket.user.email}`);
    next(); // Allow connection
  } catch (error) {
    console.error('[Socket.IO] Authentication failed:', error);
    next(new Error('Authentication failed'));
  }
});
```

4. **Connection Established:**
   - Socket ID assigned (e.g., `abc123xyz`)
   - `connect` event fired on both client and server
   - Connection status changes: 🔴 → 🟢

**Frontend State Update:**
```typescript
useEffect(() => {
  if (!socket) return;

  socket.on('connect', () => {
    setIsConnected(true);
    setConnectionStatus('Connected 🟢');
  });

  socket.on('disconnect', (reason) => {
    setIsConnected(false);
    setConnectionStatus(`Disconnected 🔴: ${reason}`);
  });
}, [socket]);
```

---

### 1.2 Joining a Chat Session (Session Room Management)

**File:** `frontend/src/components/AssistantChat.tsx`

```typescript
// STEP 3: Component mounts, joins session-specific room
useEffect(() => {
  if (!socket || !sessionId) return;

  console.log(`[AssistantChat] Joining session: ${sessionId}`);
  socket.emit('chat:join-session', sessionId);

  // Cleanup on unmount
  return () => {
    socket.emit('chat:leave-session', sessionId);
  };
}, [socket, sessionId]);
```

**Backend Handler Executes:**

**File:** `backend-node/src/sockets/chat-socket.ts`

```typescript
// STEP 4: Backend receives join request
socket.on('chat:join-session', async (sessionId: string) => {
  try {
    console.log(`[Chat Socket] User ${socket.user.email} joining session: ${sessionId}`);

    // Join Socket.IO room (enables targeted broadcasting)
    await socket.join(sessionId);

    // Send confirmation back to this socket only
    socket.emit('chat:session-joined', {
      sessionId,
      message: 'Successfully joined chat session',
      timestamp: new Date().toISOString()
    });

    console.log(`[Chat Socket] User joined session room: ${sessionId}`);
  } catch (error) {
    console.error('[Chat Socket] Error joining session:', error);
    socket.emit('chat:error', {
      error: 'Failed to join session',
      details: error.message
    });
  }
});
```

**What is a Socket.IO Room?**
- A **virtual channel** for grouping connected sockets
- Messages sent to a room are received by all sockets in that room
- Used here for **session isolation**: Only participants of session `ABC` receive messages for session `ABC`
- Enables features like:
  - Multi-user chat (future)
  - Typing indicators per session
  - Session-specific notifications

---

## Part 2: Sending a Message (Complete Bidirectional Flow)

### 2.1 User Sends Message (Frontend → Backend)

**File:** `frontend/src/components/AssistantChat.tsx`

```typescript
// STEP 5: User types message and clicks Send
const handleSendMessage = useCallback(async (content: string) => {
  if (!socket || !sessionId) {
    console.error('Socket or session not ready');
    return;
  }

  // Optimistic UI update (add message immediately)
  const userMessage = {
    role: 'user',
    content,
    timestamp: new Date().toISOString()
  };
  setMessages(prev => [...prev, userMessage]);

  // Emit message to server via WebSocket
  socket.emit('chat:send-message', {
    sessionId,
    message: content,
    timestamp: userMessage.timestamp
  });

  // Clear input field
  setInputValue('');
}, [socket, sessionId]);
```

**What Happens:**
1. User message displayed instantly in UI (optimistic update)
2. `socket.emit()` sends data over WebSocket connection
3. Data format: JSON object serialized and sent as binary/text frame
4. No HTTP request/response cycle - **persistent connection used**

---

### 2.2 Backend Receives Message

**File:** `backend-node/src/sockets/chat-socket.ts`

```typescript
// STEP 6: Backend receives message event
socket.on('chat:send-message', async ({ sessionId, message, timestamp }) => {
  try {
    console.log(`[Chat Socket] Message received from ${socket.user.email}`);
    console.log(`  Session: ${sessionId}`);
    console.log(`  Message: "${message}"`);

    // Validate session belongs to user
    const isValid = await validateSession(sessionId, socket.user.customerId);
    if (!isValid) {
      socket.emit('chat:error', { error: 'Invalid session' });
      return;
    }

    // ACKNOWLEDGMENT: Confirm receipt
    socket.emit('chat:message-sent', {
      sessionId,
      messageId: generateId(),
      timestamp
    });

    // TYPING INDICATOR: Show assistant is processing
    io.to(sessionId).emit('chat:typing', {
      isTyping: true,
      typedBy: 'assistant'
    });

    // FORWARD TO JAVA VA SERVICE (via REST or gRPC)
    // See Step 7 below...

  } catch (error) {
    console.error('[Chat Socket] Error processing message:', error);
    socket.emit('chat:error', {
      error: 'Failed to process message',
      details: error.message
    });
  }
});
```

**Key Methods and Responsibilities:**

| Method/Action | Purpose | Response Time |
|--------------|---------|---------------|
| `socket.on('chat:send-message')` | **Entry point** for user messages | Instant |
| `validateSession()` | **Security check** - Verify user owns session | 5-10ms |
| `socket.emit('chat:message-sent')` | **Acknowledgment** to sender only | Instant |
| `io.to(sessionId).emit('chat:typing')` | **Broadcast** typing indicator to all in room | Instant |

---

### 2.3 Backend Forwards to Java VA Service

```typescript
// STEP 7: Call Java VA service (HTTP REST or gRPC)

// OPTION A: REST API (current default)
const javaResponse = await axios.post(`${JAVA_VA_URL}/chat/message`, {
  sessionId,
  message,
  customerId: socket.user.customerId,
  tenantId: socket.user.tenantId
}, {
  headers: {
    'Content-Type': 'application/json',
    'X-User-Id': socket.user.customerId
  },
  timeout: 30000 // 30 second timeout
});

// OPTION B: gRPC (future streaming implementation)
const stream = grpcClient.sendMessageStream(sessionId, message);
stream.on('data', (token) => {
  // Stream individual tokens back to frontend in real-time
  socket.emit('chat:token', { token });
});
stream.on('end', () => {
  socket.emit('chat:typing', { isTyping: false });
});
```

**What Happens:**
1. **REST Call:** Node.js makes HTTP POST to Java service
2. **Java Processing:** 
   - Validates session
   - Calls LLM (OpenAI, Claude, etc.)
   - Processes intent, entities
   - Generates response
3. **Response Returns:** JSON with assistant message, intent, actions
4. **Latency:** 500ms - 5s depending on LLM

---

### 2.4 Backend Sends Response to Frontend

```typescript
// STEP 8: Process Java VA response and emit to frontend

const { response, intent, requiresAction, suggestedAction } = javaResponse.data;

// Turn off typing indicator
io.to(sessionId).emit('chat:typing', {
  isTyping: false,
  typedBy: 'assistant'
});

// Send assistant response
io.to(sessionId).emit('chat:message-received', {
  role: 'assistant',
  content: response,
  intent,
  requiresAction,
  suggestedAction,
  timestamp: new Date().toISOString()
});

console.log(`[Chat Socket] Response sent to session: ${sessionId}`);
```

**Broadcasting Methods:**

| Method | Scope | Use Case |
|--------|-------|----------|
| `socket.emit()` | **Single socket** only | Acknowledgments, errors for sender |
| `io.to(room).emit()` | **All sockets in room** | Messages, typing indicators |
| `socket.broadcast.emit()` | **All except sender** | "User X is typing" notifications |
| `io.emit()` | **All connected sockets** | System-wide announcements |

---

### 2.5 Frontend Receives Response

**File:** `frontend/src/components/AssistantChat.tsx`

```typescript
// STEP 9: Frontend receives assistant response
useEffect(() => {
  if (!socket) return;

  // Handler for new messages
  const handleMessageReceived = (data: any) => {
    console.log('[AssistantChat] Message received:', data);

    setMessages(prev => [...prev, {
      role: data.role,
      content: data.content,
      timestamp: data.timestamp,
      intent: data.intent,
      requiresAction: data.requiresAction
    }]);

    // Handle suggested actions
    if (data.suggestedAction) {
      setSuggestedActions([data.suggestedAction]);
    }

    // Scroll to bottom
    scrollToBottom();
  };

  // Register listener
  socket.on('chat:message-received', handleMessageReceived);

  // Cleanup
  return () => {
    socket.off('chat:message-received', handleMessageReceived);
  };
}, [socket]);
```

**What Happens:**
1. WebSocket frame received from server
2. Socket.IO deserializes JSON payload
3. Event handler `handleMessageReceived` executes
4. React state updated with new message
5. Component re-renders, showing assistant response
6. Auto-scroll to latest message

---

## Part 3: Typing Indicators (Real-Time Feedback)

### 3.1 User Starts Typing

```typescript
// Frontend: Debounced typing event
const handleInputChange = useCallback(
  debounce((value: string) => {
    if (socket && value.length > 0) {
      socket.emit('chat:typing', {
        sessionId,
        isTyping: true,
        typedBy: 'user'
      });
    }
  }, 300), // Wait 300ms after last keystroke
  [socket, sessionId]
);
```

### 3.2 Backend Broadcasts Typing Status

```typescript
// Backend: Forward typing status to all in session
socket.on('chat:typing', ({ sessionId, isTyping, typedBy }) => {
  socket.to(sessionId).broadcast.emit('chat:typing', {
    isTyping,
    typedBy,
    userId: socket.user.customerId
  });
});
```

### 3.3 Frontend Shows Typing Indicator

```typescript
// Frontend: Render typing indicator
{isAssistantTyping && (
  <div className="typing-indicator">
    <span></span><span></span><span></span>
    <style>{`
      .typing-indicator span {
        animation: bounce 1.4s infinite ease-in-out both;
      }
    `}</style>
  </div>
)}
```

**Result:** Real-time visual feedback with <50ms latency

---

## Part 4: Error Handling & Fallbacks

### 4.1 Connection Loss Handling

```typescript
// Frontend: Auto-reconnect logic
socket.on('disconnect', (reason) => {
  console.warn('[WebSocket] Disconnected:', reason);
  setConnectionStatus('Disconnected 🔴');

  if (reason === 'io server disconnect') {
    // Server forcefully disconnected, manual reconnect needed
    socket.connect();
  }
  // For all other reasons, Socket.IO auto-reconnects
});

socket.on('reconnect', (attemptNumber) => {
  console.log(`[WebSocket] Reconnected after ${attemptNumber} attempts`);
  setConnectionStatus('Connected 🟢');

  // Re-join session room
  if (sessionId) {
    socket.emit('chat:join-session', sessionId);
  }
});
```

### 4.2 REST API Fallback

```typescript
// If WebSocket unavailable, use REST
const sendMessage = async (content: string) => {
  if (socket && isConnected) {
    // WebSocket path
    socket.emit('chat:send-message', { sessionId, message: content });
  } else {
    // REST fallback
    const response = await axios.post('/api/chat/message', {
      sessionId,
      message: content
    });
    setMessages(prev => [...prev, response.data]);
  }
};
```

### 4.3 Timeout Handling

```typescript
// Backend: Timeout for Java VA calls
const javaResponse = await axios.post(
  `${JAVA_VA_URL}/chat/message`,
  payload,
  { timeout: 30000 } // 30s timeout
).catch(error => {
  if (error.code === 'ECONNABORTED') {
    socket.emit('chat:error', {
      error: 'Request timeout',
      message: 'The assistant is taking too long to respond'
    });
  }
});
```

---

## Part 5: Method Reference Table

### Frontend Methods (`useSocket.ts`)

| Method | Purpose | Returns | Side Effects |
|--------|---------|---------|--------------|
| `connect()` | Manually initiate connection | void | Opens WebSocket |
| `disconnect()` | Close connection | void | Cleans up listeners |
| `emit(event, data)` | Send event to server | void | Sends WebSocket frame |
| `on(event, handler)` | Register event listener | void | Adds callback |
| `off(event, handler)` | Unregister listener | void | Removes callback |

### Backend Socket Handlers (`chat-socket.ts`)

| Event Handler | Trigger | Response Events | Processing Time |
|--------------|---------|----------------|----------------|
| `chat:join-session` | User joins session | `chat:session-joined` | <10ms |
| `chat:send-message` | User sends message | `chat:message-sent`<br>`chat:typing`<br>`chat:message-received` | 500ms-5s |
| `chat:typing` | User types | `chat:typing` (broadcast) | <5ms |
| `chat:get-history` | Request history | `chat:history` | 50-200ms |
| `chat:end-session` | End session | `chat:session-ended` | 50-100ms |
| `chat:leave-session` | Leave room | None | <5ms |
| `disconnect` | Connection lost | None | <5ms (cleanup) |

---

## Part 6: Data Flow Diagrams

### Complete Message Flow (Timing)

```
[0ms]     User clicks Send
[1ms]     Frontend adds message to UI (optimistic)
[2ms]     socket.emit('chat:send-message') called
[5ms]     Backend receives message
[6ms]     Backend validates session
[8ms]     Backend emits 'chat:message-sent' (acknowledgment)
[10ms]    Frontend receives acknowledgment
[12ms]    Backend emits 'chat:typing' (isTyping: true)
[15ms]    Frontend shows typing indicator
[20ms]    Backend calls Java VA service (HTTP request sent)
[520ms]   Java VA response received (500ms LLM processing)
[522ms]   Backend emits 'chat:typing' (isTyping: false)
[524ms]   Backend emits 'chat:message-received'
[530ms]   Frontend receives response
[531ms]   Frontend updates UI
[532ms]   User sees assistant response
```

**Total User-Perceived Latency:** ~530ms
- **WebSocket overhead:** ~30ms (vs ~200ms for REST)
- **Savings:** ~170ms per message

---

## Part 7: Comparison: WebSocket vs REST

| Aspect | WebSocket | REST API |
|--------|-----------|----------|
| **Connection** | Persistent, bidirectional | Request-response per message |
| **Latency** | 10-50ms | 100-200ms |
| **Overhead** | ~20 bytes/message | ~500 bytes/request |
| **Server Push** | ✅ Yes (instant) | ❌ No (requires polling) |
| **Typing Indicators** | ✅ Real-time | ❌ Not practical |
| **Streaming** | ✅ Native | ❌ Requires workarounds |
| **Complexity** | Medium | Low |
| **Fallback** | Polling | N/A |

---

## Part 8: Advanced Topics

### 8.1 WebSocket Rooms (Detailed)

**What They Do:**
- Grouping mechanism for sockets
- Enable **targeted broadcasting**
- Managed by Socket.IO server-side

**Example:**
```typescript
// 3 users in session 'ABC'
socket1.join('ABC'); // User Alice
socket2.join('ABC'); // User Bob
socket3.join('ABC'); // User Charlie

// Broadcast to all in room
io.to('ABC').emit('chat:message', { text: 'Hello!' });
// ✅ Alice, Bob, Charlie receive message

// Socket 4 NOT in room
socket4.join('XYZ'); // User Dave in different session
// ❌ Dave does NOT receive message sent to 'ABC'
```

### 8.2 Namespace Segregation

```typescript
// Separate namespaces for different features
const chatNamespace = io.of('/chat');
const voiceNamespace = io.of('/voice');

chatNamespace.on('connection', (socket) => {
  // Handle chat-specific events
});

voiceNamespace.on('connection', (socket) => {
  // Handle voice-specific events
});

// Frontend connects to specific namespace
const chatSocket = io('/chat');
const voiceSocket = io('/voice');
```

**Benefits:**
- Logical separation
- Independent scaling
- Cleaner code organization

---

## Summary

### Key Takeaways

1. **WebSocket provides persistent, bidirectional communication**
   - No need to repeatedly establish connections
   - ~5x lower latency than REST
   - ~20x less overhead per message

2. **Socket.IO simplifies WebSocket usage**
   - Auto-reconnection
   - Fallback to polling
   - Room-based broadcasting
   - Event-driven API

3. **Hybrid architecture leverages both protocols**
   - WebSocket for real-time messaging
   - REST for session management
   - gRPC for backend-to-backend (future streaming)

4. **Two-way communication is truly real-time**
   - Server can push updates without client request
   - Enables typing indicators, live notifications
   - Streaming responses in the future

### Next Steps

1. ✅ **WebSocket implementation complete**
2. 🔄 **gRPC streaming** - See [GRPC_STREAMING_FLOW.md](./GRPC_STREAMING_FLOW.md) (next document)
3. 📋 **Voice streaming** - Planned for future
4. 🚀 **Production deployment** - TLS, load balancing

---

**Document Version:** 1.0.0  
**Last Updated:** January 15, 2026  
**Next Document:** [GRPC_STREAMING_FLOW.md](./GRPC_STREAMING_FLOW.md) - Detailed gRPC bidirectional streaming
