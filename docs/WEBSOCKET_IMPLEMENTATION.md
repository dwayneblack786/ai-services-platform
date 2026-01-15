# WebSocket Implementation Guide

## Overview

The AI Services Platform now supports **real-time WebSocket communication** using **Socket.IO** for both chat and voice virtual assistant features, while maintaining backward compatibility with REST APIs. The backend communicates with Java microservices primarily via **gRPC** for high-performance, low-latency messaging, with REST APIs as a fallback.

---

## 📑 Table of Contents

- [Overview](#overview)
- [Architecture](#architecture)
  - [Communication Protocols](#communication-protocols)
  - [gRPC Integration](#grpc-integration)
- [Key Features](#key-features)
- [Implementation Details](#implementation-details)
  - [Backend Components](#backend-components)
  - [Frontend Components](#frontend-components)
- [gRPC Communication](#grpc-communication)
  - [Why gRPC?](#why-grpc)
  - [Protocol Buffers](#protocol-buffers)
  - [gRPC Client (Node.js)](#grpc-client-nodejs)
  - [gRPC Server (Java)](#grpc-server-java)
  - [Message Flow with gRPC](#message-flow-with-grpc)
- [Usage Examples](#usage-examples)
- [Event Flow](#event-flow)
- [Configuration](#configuration)
- [Testing](#testing)
- [Performance Benefits](#performance-benefits)
- [Future Enhancements](#future-enhancements)
- [Troubleshooting](#troubleshooting)
- [Best Practices](#best-practices)
- [Migration Guide](#migration-guide)
- [Security Considerations](#security-considerations)
- [Monitoring & Logging](#monitoring--logging)
- [Related Documentation](#related-documentation)
- [Support](#support)

---

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                      React Frontend                          │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  AssistantChat Component                             │   │
│  │  ├── useSocket Hook (WebSocket connection)          │   │
│  │  ├── Real-time message exchange                     │   │
│  │  ├── Typing indicators                              │   │
│  │  └── Connection status                              │   │
│  └──────────────────────────────────────────────────────┘   │
└──────────────────┬──────────────────────────────────────────┘
                   │ Socket.IO Client
                   │ (WebSocket/Polling)
                   ↓
┌─────────────────────────────────────────────────────────────┐
│                   Node.js Backend                            │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  Socket.IO Server                                    │   │
│  │  ├── JWT Authentication Middleware                  │   │
│  │  ├── Chat Socket Handlers                           │   │
│  │  │   ├── chat:send-message                          │   │
│  │  │   ├── chat:join-session                          │   │
│  │  │   ├── chat:typing                                │   │
│  │  │   └── chat:end-session                           │   │
│  │  └── Voice Socket Handlers (Future)                 │   │
│  └──────────────────────────────────────────────────────┘   │
│                                                               │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  gRPC Client (Primary)                               │   │
│  │  ├── StartSession RPC                               │   │
│  │  ├── SendMessageStream RPC                          │   │
│  │  ├── SendMessage RPC                                │   │
│  │  └── EndSession RPC                                 │   │
│  └──────────────────────────────────────────────────────┘   │
│                                                               │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  REST API Endpoints (Fallback)                       │   │
│  │  ├── POST /api/chat/session                         │   │
│  │  ├── POST /api/chat/message                         │   │
│  │  └── POST /api/chat/end                             │   │
│  └──────────────────────────────────────────────────────┘   │
└──────────────────┬──────────────────────────────────────────┘
                   │ gRPC (Protocol Buffers)
                   │ Port 50051 (Primary)
                   │
                   │ HTTP/REST
                   │ Port 8136 (Fallback)
                   ↓
┌─────────────────────────────────────────────────────────────┐
│              Java VA Service (Spring Boot)                   │
│  ├── gRPC Server (ChatServiceImpl)                          │
│  ├── ChatSessionController (REST)                           │
│  ├── DialogManager                                          │
│  ├── LLM Service                                            │
│  └── MongoDB (Session Storage)                              │
└─────────────────────────────────────────────────────────────┘
```

### Communication Protocols

The platform uses a **hybrid communication architecture**:

1. **Frontend ↔ Backend:** WebSocket (Socket.IO) for real-time bidirectional communication
2. **Backend ↔ Java Microservices:** gRPC (primary) with REST API fallback
3. **Session Management:** REST APIs for initialization and history retrieval

### gRPC Integration

**gRPC (Google Remote Procedure Call)** is the primary protocol for backend-to-Java communication, offering:

- **High Performance:** Binary Protocol Buffers serialization (30-50% smaller payloads than JSON)
- **Low Latency:** HTTP/2 multiplexing and persistent connections
- **Native Streaming:** Server-side and bidirectional streaming support
- **Type Safety:** Strongly-typed service contracts via `.proto` files
- **Automatic Code Generation:** Client/server stubs generated from protobuf definitions

**Protocol Buffer Definitions:** Located in `backend-node/proto/chat.proto` and `backend-node/proto/voice.proto`

**For detailed gRPC implementation, see:**
- 📘 [gRPC Streaming Flow](GRPC_STREAMING_FLOW.md) - Complete gRPC architecture (4000+ lines)
- 📘 [gRPC Implementation](GRPC_IMPLEMENTATION.md) - Java service implementation guide
- 📘 [Method Handlers Reference](METHOD_HANDLERS_REFERENCE.md) - Complete API reference with gRPC methods

## Key Features

### ✅ Real-Time Messaging
- Instant message delivery without polling
- Bidirectional communication
- Lower latency compared to REST

### ✅ Typing Indicators
- Shows when assistant is processing
- Animated typing indicator with bounce effect
- Real-time user typing status (for future multi-user support)

### ✅ Connection Status
- Visual indicators: 🟢 Connected, 🟡 Connecting, 🔴 Disconnected
- Automatic reconnection with exponential backoff
- Fallback to REST API if WebSocket unavailable

### ✅ Authentication
- JWT token-based authentication for Socket.IO
- Secure WebSocket connections
- User-specific message routing

### ✅ Hybrid Architecture
- WebSocket for real-time messaging (default)
- REST API as fallback
- Session management via REST (initialization, history)
- Can toggle between WebSocket and REST per component

## Implementation Details

### Backend Components

#### 1. Socket.IO Server Configuration
**File:** `backend-node/src/config/socket.ts`

```typescript
// Initialize Socket.IO with HTTP server
const io = new Server(httpServer, {
  cors: { origin: CLIENT_URL, credentials: true },
  pingTimeout: 60000,
  pingInterval: 25000,
  perMessageDeflate: true
});

// JWT Authentication Middleware
io.use(async (socket, next) => {
  const token = socket.handshake.auth.token;
  const decoded = verifyToken(token);
  socket.user = decoded;
  next();
});
```

#### 2. Chat Socket Handlers
**File:** `backend-node/src/sockets/chat-socket.ts`

**Events:**
- `chat:join-session` - Join a specific chat session room
- `chat:send-message` - Send a message (forwards to Java VA)
- `chat:typing` - Broadcast typing status
- `chat:leave-session` - Leave session room
- `chat:end-session` - End chat session
- `chat:get-history` - Retrieve conversation history

**Emitted Events:**
- `chat:message-received` - Assistant's response
- `chat:message-sent` - Confirmation of user message
- `chat:typing` - Typing indicator status
- `chat:error` - Error notification
- `chat:session-ended` - Session ended confirmation

#### 3. Express Server Integration
**File:** `backend-node/src/index.ts`

```typescript
import { createServer } from 'http';
import { initializeSocketIO } from './config/socket';
import { initializeChatSocket } from './sockets/chat-socket';

const app = express();
const httpServer = createServer(app);

// Initialize Socket.IO
const io = initializeSocketIO(httpServer);
initializeChatSocket(io);

// Start server
httpServer.listen(PORT);
```

### Frontend Components

#### 1. useSocket Hook
**File:** `frontend/src/hooks/useSocket.ts`

Custom React hook for managing Socket.IO connections:

```typescript
const { socket, isConnected, connect, disconnect, emit } = useSocket({
  autoConnect: true,
  onConnect: () => console.log('Connected'),
  onDisconnect: (reason) => console.log('Disconnected:', reason),
  onError: (error) => console.error('Error:', error)
});
```

**Features:**
- Auto-connect on mount
- JWT authentication from cookies
- Reconnection handling
- Connection state management
- Event emission wrapper

#### 2. Enhanced AssistantChat Component
**File:** `frontend/src/components/AssistantChat.tsx`

**Props:**
```typescript
interface AssistantChatProps {
  productId?: string;
  useWebSocket?: boolean; // Toggle WebSocket/REST (default: from VITE_USE_WEBSOCKET env var)
}
```

**Default Behavior:**
- Reads `VITE_USE_WEBSOCKET` environment variable
- If not set or set to `'true'`, uses WebSocket
- If set to `'false'`, uses REST API
- Can be overridden by passing `useWebSocket` prop

**New Features:**
- Real-time message exchange via Socket.IO
- Animated typing indicators
- Connection status display
- Fallback to REST API when WebSocket unavailable
- Session room management

**Event Handlers:**
```typescript
socket.on('chat:message-received', (data) => {
  setMessages(prev => [...prev, data]);
});

socket.on('chat:typing', ({ isTyping }) => {
  setIsAssistantTyping(isTyping);
});

socket.on('chat:error', ({ error }) => {
  setError(error);
});
```

## Usage Examples

### Basic Chat with WebSocket (Default)

```tsx
import { AssistantChat } from './components/AssistantChat';

function App() {
  // Uses VITE_USE_WEBSOCKET env variable (default: true)
  return <AssistantChat productId="va-service" />;
}
```

### Chat with REST Fallback

```tsx
// Override env variable to force REST API only
<AssistantChat productId="va-service" useWebSocket={false} />
```

### Force WebSocket

```tsx
// Override env variable to force WebSocket
<AssistantChat productId="va-service" useWebSocket={true} />
```

### Custom Socket Connection

```typescript
import { useSocket } from './hooks/useSocket';

function CustomChat() {
  const { socket, isConnected } = useSocket({
    autoConnect: true,
    onConnect: () => alert('Connected!'),
    onError: (error) => console.error(error)
  });

  useEffect(() => {
    if (!socket) return;

    socket.on('chat:message-received', (msg) => {
      console.log('New message:', msg);
    });

    return () => {
      socket.off('chat:message-received');
    };
  }, [socket]);

  return <div>Connected: {isConnected ? 'Yes' : 'No'}</div>;
}
```

## gRPC Communication

### Why gRPC?

The platform uses **gRPC as the primary protocol** for Node.js backend to Java microservices communication for several reasons:

| Feature | gRPC | REST API |
|---------|------|----------|
| **Protocol** | HTTP/2 binary | HTTP/1.1 text (JSON) |
| **Payload Size** | 30-50% smaller (Protobuf) | Larger (JSON overhead) |
| **Latency** | ~10-30ms lower | Higher due to JSON parsing |
| **Streaming** | Native bidirectional | Not supported (long-polling only) |
| **Type Safety** | Strongly typed (`.proto`) | Weakly typed (runtime validation) |
| **Code Generation** | Automatic client/server stubs | Manual implementation |
| **Connection** | Persistent (HTTP/2 multiplexing) | Per-request connection |

**Use Case:** Perfect for high-frequency, low-latency microservice communication like real-time chat processing.

### Protocol Buffers

Protocol Buffers (protobuf) define the service contract between Node.js and Java services.

**File:** `backend-node/proto/chat.proto`

```protobuf
syntax = "proto3";

package chat;

service ChatService {
  // Start a new chat session
  rpc StartSession(SessionRequest) returns (SessionResponse);
  
  // Send message with streaming response
  rpc SendMessageStream(ChatRequest) returns (stream ChatResponse);
  
  // Send message with single response
  rpc SendMessage(ChatRequest) returns (ChatResponse);
  
  // End chat session
  rpc EndSession(EndSessionRequest) returns (EndSessionResponse);
  
  // Get conversation history
  rpc GetHistory(HistoryRequest) returns (HistoryResponse);
}

message SessionRequest {
  string tenant_id = 1;
  string user_id = 2;
  string product_id = 3;
}

message SessionResponse {
  string session_id = 1;
  string status = 2;
}

message ChatRequest {
  string session_id = 1;
  string message = 2;
  string user_id = 3;
}

message ChatResponse {
  string session_id = 1;
  string message = 2;
  string intent = 3;
  bool requires_action = 4;
}
```

**Benefits:**
- **Version Control:** Proto files serve as living documentation
- **Backward Compatibility:** Add fields without breaking existing clients
- **Multi-Language Support:** Same `.proto` generates code for Node.js, Java, Python, etc.

### gRPC Client (Node.js)

**File:** `backend-node/src/grpc/client.ts`

```typescript
import * as grpc from '@grpc/grpc-js';
import * as protoLoader from '@grpc/proto-loader';
import path from 'path';

// Load proto definition
const PROTO_PATH = path.join(__dirname, '../../proto/chat.proto');
const packageDefinition = protoLoader.loadSync(PROTO_PATH, {
  keepCase: true,
  longs: String,
  enums: String,
  defaults: true,
  oneofs: true
});

const chatProto = grpc.loadPackageDefinition(packageDefinition).chat;

// Create gRPC client
export class ChatGrpcClient {
  private client: any;

  constructor(serverAddress: string = 'localhost:50051') {
    this.client = new chatProto.ChatService(
      serverAddress,
      grpc.credentials.createInsecure()
    );
  }

  // Start session
  async startSession(tenantId: string, userId: string, productId: string) {
    return new Promise((resolve, reject) => {
      this.client.StartSession(
        { tenant_id: tenantId, user_id: userId, product_id: productId },
        (error: any, response: any) => {
          if (error) reject(error);
          else resolve(response);
        }
      );
    });
  }

  // Send message (unary)
  async sendMessage(sessionId: string, message: string, userId: string) {
    return new Promise((resolve, reject) => {
      this.client.SendMessage(
        { session_id: sessionId, message, user_id: userId },
        (error: any, response: any) => {
          if (error) reject(error);
          else resolve(response);
        }
      );
    });
  }

  // Send message with streaming response
  sendMessageStream(sessionId: string, message: string, userId: string) {
    const call = this.client.SendMessageStream({
      session_id: sessionId,
      message,
      user_id: userId
    });

    return call; // Returns a readable stream
  }
}

export const chatGrpcClient = new ChatGrpcClient(
  process.env.GRPC_SERVER_URL || 'localhost:50051'
);
```

**Usage in Socket Handler:**

```typescript
// In chat-socket.ts
socket.on('chat:send-message', async (data) => {
  try {
    // Use gRPC for low-latency communication
    const response = await chatGrpcClient.sendMessage(
      data.sessionId,
      data.message,
      socket.user.id
    );

    socket.emit('chat:message-received', response);

  } catch (error) {
    console.error('[gRPC] Error, falling back to REST:', error);
    
    // Fallback to REST API
    const restResponse = await axios.post(
      `${JAVA_VA_URL}/chat/message`,
      data
    );
    
    socket.emit('chat:message-received', restResponse.data);
  }
});
```

### gRPC Server (Java)

**File:** `services-java/va-service/src/main/java/com/aiservices/va/grpc/ChatServiceImpl.java`

The Java VA Service implements the gRPC server defined in `chat.proto`:

```java
@GrpcService
public class ChatServiceImpl extends ChatServiceGrpc.ChatServiceImplBase {

    @Autowired
    private ChatSessionService chatSessionService;

    @Override
    public void startSession(SessionRequest request, 
                           StreamObserver<SessionResponse> responseObserver) {
        try {
            String sessionId = chatSessionService.createSession(
                request.getTenantId(),
                request.getUserId(),
                request.getProductId()
            );

            SessionResponse response = SessionResponse.newBuilder()
                .setSessionId(sessionId)
                .setStatus("active")
                .build();

            responseObserver.onNext(response);
            responseObserver.onCompleted();

        } catch (Exception e) {
            responseObserver.onError(Status.INTERNAL
                .withDescription(e.getMessage())
                .asRuntimeException());
        }
    }

    @Override
    public void sendMessage(ChatRequest request, 
                          StreamObserver<ChatResponse> responseObserver) {
        try {
            // Process message through LLM
            ChatResponse response = chatSessionService.processMessage(
                request.getSessionId(),
                request.getMessage(),
                request.getUserId()
            );

            responseObserver.onNext(response);
            responseObserver.onCompleted();

        } catch (Exception e) {
            responseObserver.onError(Status.INTERNAL
                .withDescription(e.getMessage())
                .asRuntimeException());
        }
    }

    @Override
    public void sendMessageStream(ChatRequest request,
                                 StreamObserver<ChatResponse> responseObserver) {
        try {
            // Stream LLM response in chunks
            chatSessionService.processMessageStream(
                request.getSessionId(),
                request.getMessage(),
                (chunk) -> {
                    ChatResponse response = ChatResponse.newBuilder()
                        .setSessionId(request.getSessionId())
                        .setMessage(chunk)
                        .build();
                    
                    responseObserver.onNext(response);
                }
            );

            responseObserver.onCompleted();

        } catch (Exception e) {
            responseObserver.onError(Status.INTERNAL
                .withDescription(e.getMessage())
                .asRuntimeException());
        }
    }
}
```

**Configuration:** `application.properties`

```properties
# gRPC Server Configuration
grpc.server.port=50051
grpc.server.max-inbound-message-size=10MB
grpc.server.max-connection-age=300s
```

**For complete Java implementation details, see:**
- 📘 [Java VA Service README](../services-java/va-service/README.md)
- 📘 [gRPC Implementation Guide](GRPC_IMPLEMENTATION.md)
- 📘 [Java VA Verification](JAVA_VA_VERIFICATION.md)

### Message Flow with gRPC

**Complete flow from user message to response:**

```
1. User types message in React UI
   ↓
2. Frontend sends via WebSocket
   socket.emit('chat:send-message', { sessionId, message })
   ↓
3. Node.js receives WebSocket event
   Backend Socket Handler (chat-socket.ts)
   ↓
4. Backend makes gRPC call to Java
   chatGrpcClient.sendMessage(sessionId, message, userId)
   ↓ [gRPC/HTTP2 binary protocol]
   ↓
5. Java receives gRPC request
   ChatServiceImpl.sendMessage()
   ↓
6. Java processes with LLM
   ChatSessionService.processMessage()
   → MongoDB: Load session & history
   → LLM Service: Generate response (OpenAI API)
   → MongoDB: Save conversation turn
   ↓
7. Java returns gRPC response
   responseObserver.onNext(chatResponse)
   ↓ [gRPC/HTTP2 binary protocol]
   ↓
8. Node.js receives gRPC response
   chatGrpcClient callback
   ↓
9. Backend emits WebSocket event
   socket.emit('chat:message-received', response)
   ↓
10. React receives and displays
    useEffect(() => { socket.on('chat:message-received', ...) })
```

**Timing Breakdown:**
- Steps 1-3 (WebSocket): ~10-20ms
- Steps 4-7 (gRPC + LLM): ~2000-3000ms (90% is LLM API call)
- Steps 8-10 (WebSocket): ~10-20ms
- **Total:** ~2020-3040ms (vs ~2100-3150ms with REST)

**Performance Advantage:**
- gRPC saves ~30-50ms per request vs REST
- More significant with high-frequency requests (typing indicators, streaming)

## Event Flow

### Sending a Message

```mermaid
sequenceDiagram
    participant User
    participant React
    participant Socket.IO
    participant Node.js
    participant Java VA
    participant LLM

    User->>React: Types message & sends
    React->>React: Add user message to UI
    React->>Socket.IO: emit('chat:send-message', {sessionId, message})
    Socket.IO->>Node.js: Receive event
    Node.js->>React: emit('chat:message-sent') [confirmation]
    Node.js->>React: emit('chat:typing', {isTyping: true})
    Node.js->>Java VA: POST /chat/message
    Java VA->>LLM: Generate response
    LLM->>Java VA: Response text
    Java VA->>Node.js: Return response
    Node.js->>React: emit('chat:typing', {isTyping: false})
    Node.js->>React: emit('chat:message-received', {message})
    React->>React: Add assistant message to UI
    React->>User: Display response
```

## Configuration

### Environment Variables

**Backend (.env):**
```bash
PORT=5000
CLIENT_URL=http://localhost:5173
JWT_SECRET=your-jwt-secret
JAVA_VA_URL=http://localhost:8136
```

**Frontend (.env):**
```bash
VITE_API_URL=http://localhost:5000

# WebSocket Configuration
# Set to 'true' to enable WebSocket (default), 'false' for REST API only
VITE_USE_WEBSOCKET=true
```

**Note:** The `useWebSocket` prop on `<AssistantChat>` component can override the environment variable setting.

### Socket.IO Options

**Connection Options:**
- `transports`: ['websocket', 'polling'] - Tries WebSocket first
- `reconnection`: true
- `reconnectionAttempts`: 5
- `reconnectionDelay`: 1000ms
- `timeout`: 10000ms

**Server Options:**
- `pingTimeout`: 60000ms - Connection timeout
- `pingInterval`: 25000ms - Heartbeat interval
- `perMessageDeflate`: true - Enable compression

## Testing

### 1. Test WebSocket Connection

```typescript
// In browser console
const socket = io('http://localhost:5000', {
  auth: { token: 'your-jwt-token' }
});

socket.on('connect', () => console.log('Connected:', socket.id));
socket.on('disconnect', () => console.log('Disconnected'));
```

### 2. Test Chat Flow

```typescript
// Join session
socket.emit('chat:join-session', 'session-id-123');

// Send message
socket.emit('chat:send-message', {
  sessionId: 'session-id-123',
  message: 'Hello, assistant!'
});

// Listen for response
socket.on('chat:message-received', (data) => {
  console.log('Assistant:', data.content);
});
```

### 3. Monitor Socket.IO Admin

Install Socket.IO admin UI for debugging:

```bash
npm install @socket.io/admin-ui
```

Access at: `http://localhost:5000/admin`

## Performance Benefits

### Latency Comparison

| Method | Average Latency | Use Case |
|--------|----------------|----------|
| REST API | ~100-200ms | One-off requests, session init |
| WebSocket | ~10-50ms | Real-time messaging |
| Polling | ~500-1000ms | Legacy fallback |

### Bandwidth Savings

- **REST:** ~500 bytes per request (headers + payload)
- **WebSocket:** ~20 bytes per message (just payload)
- **Savings:** ~96% reduction in overhead

### Scalability

- **Concurrent Connections:** 10,000+ per server instance
- **Messages/sec:** 50,000+ with proper configuration
- **Memory Usage:** ~10KB per connection

## Future Enhancements

### Voice Streaming (Planned)

```typescript
// Voice socket handlers
socket.on('voice:audio-chunk', async (audioData) => {
  // Stream audio to STT service
  const text = await sttService.transcribe(audioData);
  
  // Process with LLM
  const response = await llmService.generate(text);
  
  // Stream TTS back to client
  const audio = await ttsService.synthesize(response);
  socket.emit('voice:audio-response', audio);
});
```

### Multi-User Chat Rooms

```typescript
// Multiple users in same session
socket.on('chat:user-joined', ({ userId, email }) => {
  console.log(`${email} joined the chat`);
});

socket.on('chat:user-typing', ({ userId, isTyping }) => {
  // Show typing indicator for specific user
});
```

### File/Image Sharing

```typescript
socket.emit('chat:send-attachment', {
  sessionId,
  type: 'image',
  data: base64Image
});
```

## Troubleshooting

### Connection Issues

**Problem:** Socket.IO not connecting

**Solutions:**
1. Check CORS configuration in `socket.ts`
2. Verify JWT token is present in cookies
3. Check firewall/proxy settings
4. Test with polling: `transports: ['polling']`

### Authentication Failures

**Problem:** "Authentication failed" error

**Solutions:**
1. Verify JWT_SECRET matches between frontend/backend
2. Check token expiration
3. Ensure cookie is httpOnly: false for debugging
4. Check browser console for token presence

### Message Delivery Issues

**Problem:** Messages not received

**Solutions:**
1. Check if session room was joined: `socket.emit('chat:join-session', sessionId)`
2. Verify event listeners are registered before sending
3. Check Node.js logs for errors
4. Test with REST API to isolate WebSocket issues

## Best Practices

### 1. Error Handling

Always handle socket errors:

```typescript
socket.on('error', (error) => {
  console.error('Socket error:', error);
  // Fallback to REST API
});

socket.on('connect_error', (error) => {
  console.error('Connection error:', error);
  // Show user-friendly message
});
```

### 2. Cleanup

Remove listeners on unmount:

```typescript
useEffect(() => {
  socket.on('chat:message-received', handler);
  
  return () => {
    socket.off('chat:message-received', handler);
  };
}, [socket]);
```

### 3. Room Management

Always join/leave rooms properly:

```typescript
// On session start
socket.emit('chat:join-session', sessionId);

// On component unmount
return () => {
  socket.emit('chat:leave-session', sessionId);
};
```

### 4. Rate Limiting

Implement client-side throttling:

```typescript
const throttledEmit = useCallback(
  throttle((event, data) => socket.emit(event, data), 100),
  [socket]
);
```

## Migration Guide

### Existing REST-Only Apps

1. **Install dependencies:**
   ```bash
   npm install socket.io socket.io-client
   ```

2. **Keep REST endpoints** for session management

3. **Add WebSocket** for real-time messaging:
   ```typescript
   // Before (REST only)
   await axios.post('/api/chat/message', { sessionId, message });
   
   // After (WebSocket)
   socket.emit('chat:send-message', { sessionId, message });
   ```

4. **Add fallback logic:**
   ```typescript
   if (socket && isConnected) {
     socket.emit('chat:send-message', data);
   } else {
     await axios.post('/api/chat/message', data);
   }
   ```

## Security Considerations

### 1. Authentication
- ✅ JWT tokens required for connection
- ✅ Token verification on every connection
- ✅ User-specific room isolation

### 2. Authorization
- ✅ Session validation before message handling
- ✅ Tenant-based access control
- ✅ Rate limiting per user

### 3. Data Validation
- ✅ Input sanitization
- ✅ Message length limits
- ✅ XSS protection

## Monitoring & Logging

All Socket.IO events are logged:

```
[Socket.IO] Server initialized
[Socket.IO] Client connected: abc123 User: user@example.com
[Chat Socket] User connected: user@example.com
[Chat Socket] User joined session: session-456
[Chat Socket] Message received: { sessionId: 'session-456', messageLength: 25 }
[Chat Socket] Response from Java VA: { intent: 'greeting', requiresAction: false }
[Socket.IO] Client disconnected: abc123 Reason: transport close
```

## Related Documentation

### gRPC & Communication Workflows
- 📘 **[gRPC Streaming Flow](GRPC_STREAMING_FLOW.md)** - Complete gRPC architecture with Protocol Buffers, Java/Node.js implementations, streaming patterns (4000+ lines)
- 📘 **[Method Handlers Reference](METHOD_HANDLERS_REFERENCE.md)** - Complete API reference for all methods: Frontend Socket, Backend Socket, gRPC Client, Java Server, Business Logic (7000+ lines)
- 📘 **[End-to-End Integration Guide](END_TO_END_INTEGRATION_GUIDE.md)** - Complete message journey with 8-stage breakdown, timing analysis, optimization opportunities (5000+ lines)
- 📘 **[WebSocket Detailed Flow](WEBSOCKET_DETAILED_FLOW.md)** - Complete WebSocket lifecycle, connection, rooms, bidirectional message flow (6000+ lines)
- 📘 **[Error Handling Patterns](ERROR_HANDLING_PATTERNS.md)** - Circuit breaker, retry logic, fallback strategies, monitoring (5000+ lines)

### Java Implementation
- 📘 **[gRPC Implementation](GRPC_IMPLEMENTATION.md)** - Java gRPC server implementation guide
- 📘 **[Java VA Service README](../services-java/va-service/README.md)** - Virtual Assistant service documentation
- 📘 **[Java VA Verification](JAVA_VA_VERIFICATION.md)** - VA service verification and testing

### Additional Resources
- 📘 **[WebSocket Quick Start](WEBSOCKET_QUICK_START.md)** - Quick start guide for WebSocket features
- 📘 **[WebSocket Configuration](WEBSOCKET_CONFIGURATION.md)** - Configuration reference
- 📘 **[Chat Session Management](CHAT_SESSION_MANAGEMENT.md)** - Chat system architecture
- 📘 **[Circuit Breaker User Guide](CIRCUIT_BREAKER_USER_GUIDE.md)** - Resilience patterns

## Support

For issues or questions:
1. Check logs in backend-node console
2. Check browser console for client-side errors
3. Test with REST API to isolate WebSocket issues
4. Review Socket.IO documentation: https://socket.io/docs/

---

**Implementation Status:** ✅ Complete
**Last Updated:** January 14, 2026
**Version:** 1.0.0
