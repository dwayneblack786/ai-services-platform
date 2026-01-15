# gRPC Streaming: Detailed Implementation Documentation

📑 **Table of Contents**
- [Overview](#overview)
- [Why gRPC for Backend Communication?](#why-grpc-for-backend-communication)
  - [Advantages Over REST](#advantages-over-rest)
  - [Use Cases in This Platform](#use-cases-in-this-platform)
- [Architecture Overview](#architecture-overview)
- [Part 1: Protocol Buffer Definitions](#part-1-protocol-buffer-definitions)
  - [File: chat.proto](#file-chatproto)
  - [RPC Type Breakdown](#rpc-type-breakdown)
  - [Message Definitions](#message-definitions)
- [Part 2: Java gRPC Server Implementation](#part-2-java-grpc-server-implementation)
  - [2.1 Server Configuration](#21-server-configuration)
  - [2.2 ChatService Implementation](#22-chatservice-implementation)
- [Part 3: Node.js gRPC Client Implementation](#part-3-nodejs-grpc-client-implementation)
  - [3.1 Client Initialization](#31-client-initialization)
  - [3.2 Unary RPC Calls](#32-unary-rpc-calls)
  - [3.3 Server-Side Streaming RPC](#33-server-side-streaming-rpc)
- [Part 4: Complete Message Flow (with gRPC)](#part-4-complete-message-flow-with-grpc)
  - [Scenario: User sends "What's the weather?"](#scenario-user-sends-whats-the-weather)
- [Part 5: Voice Streaming (Bidirectional)](#part-5-voice-streaming-bidirectional)
  - [Proto Definition: voice.proto](#proto-definition-voiceproto)
  - [Bidirectional Flow](#bidirectional-flow)
- [Part 6: Error Handling](#part-6-error-handling)
  - [gRPC Status Codes](#grpc-status-codes)
  - [Java Error Handling](#java-error-handling)
  - [Node.js Error Handling](#nodejs-error-handling)
- [Part 7: Performance Optimization](#part-7-performance-optimization)
  - [Connection Pooling](#connection-pooling)
  - [Deadline/Timeout Configuration](#deadlinetimeout-configuration)
  - [Compression](#compression)
- [Summary](#summary)
  - [Key Differences: gRPC vs REST vs WebSocket](#key-differences-grpc-vs-rest-vs-websocket)
  - [When to Use Each](#when-to-use-each)

---

## Overview

This document provides comprehensive documentation on **gRPC implementation** in the AI Services Platform, focusing on:
- **Protocol Buffers (protobuf) definitions**
- **Bidirectional streaming patterns**
- **Method-by-method flow**
- **Node.js client ↔ Java server communication**
- **Streaming vs non-streaming RPCs**

## Why gRPC for Backend Communication?

### Advantages Over REST

| Feature | gRPC | REST |
|---------|------|------|
| **Protocol** | HTTP/2 binary (Protocol Buffers) | HTTP/1.1 text (JSON) |
| **Payload Size** | 30-50% smaller | Larger (JSON overhead) |
| **Latency** | Lower (binary, multiplexing) | Higher (text, single request) |
| **Streaming** | ✅ Bidirectional native support | ❌ Requires SSE or workarounds |
| **Type Safety** | ✅ Strong typing via .proto | ❌ Loose (validation needed) |
| **Code Generation** | ✅ Automatic from .proto | ❌ Manual |
| **Language Support** | ✅ Many languages (Java, Node, Python, Go) | ✅ Universal |

### Use Cases in This Platform

1. **Node.js Backend ↔ Java VA Service** - High-throughput message processing
2. **Token-by-token LLM streaming** - Real-time text generation (future)
3. **Voice bidirectional streaming** - Audio chunks in both directions (future)

---

## Architecture Overview

```
┌──────────────────────────────────────────────────────────────────┐
│ Layer 1: Node.js Backend (gRPC Client)                           │
│ File: backend-node/src/grpc/client.ts                           │
│ Protocol: @grpc/grpc-js                                          │
└───────────────────────┬──────────────────────────────────────────┘
                        │
                        │ gRPC over HTTP/2
                        │ Port: 50051
                        │ Protocol Buffers
                        ↓
┌──────────────────────────────────────────────────────────────────┐
│ Layer 2: Java VA Service (gRPC Server)                          │
│ File: services-java/va-service/.../grpc/ChatServiceImpl.java    │
│ Framework: gRPC Netty (grpc-netty-shaded)                       │
│ Port: 50051 (alongside HTTP REST on 8136)                       │
└──────────────────────┬──────────────────────────────────────────┘
                        │
                        │ Internal Service Layer
                        ↓
┌──────────────────────────────────────────────────────────────────┐
│ Layer 3: Business Logic                                         │
│ - ChatSessionService.java                                       │
│ - DialogManager.java                                            │
│ - LLM Client (OpenAI, Claude)                                   │
│ - MongoDB (Session Storage)                                     │
└──────────────────────────────────────────────────────────────────┘
```

---

## Part 1: Protocol Buffer Definitions

### File: `chat.proto`

**Location:** 
- Java: `services-java/va-service/src/main/proto/chat.proto`
- Node: `backend-node/proto/chat.proto` (copied)

```protobuf
syntax = "proto3";
package com.ai.va.grpc;

service ChatService {
  // 1. Initialize session
  rpc StartSession(SessionRequest) returns (SessionResponse);
  
  // 2. Send message with server-side streaming (LLM tokens)
  rpc SendMessageStream(ChatRequest) returns (stream ChatResponse);
  
  // 3. Send message non-streaming (fallback)
  rpc SendMessage(ChatRequest) returns (ChatResponse);
  
  // 4. End session
  rpc EndSession(EndSessionRequest) returns (EndSessionResponse);
  
  // 5. Get history
  rpc GetHistory(HistoryRequest) returns (HistoryResponse);
}
```

### RPC Type Breakdown

| RPC Method | Type | Request | Response | Use Case |
|------------|------|---------|----------|----------|
| `StartSession` | **Unary** | Single | Single | Initialize chat session |
| `SendMessageStream` | **Server streaming** | Single | **Stream** | LLM token-by-token responses |
| `SendMessage` | **Unary** | Single | Single | Non-streaming fallback |
| `EndSession` | **Unary** | Single | Single | Clean up session |
| `GetHistory` | **Unary** | Single | Single | Retrieve conversation |

### Message Definitions

#### SessionRequest
```protobuf
message SessionRequest {
  string customer_id = 1;  // User identifier
  string product_id = 2;   // Product (e.g., 'va-service')
}
```

#### SessionResponse
```protobuf
message SessionResponse {
  string session_id = 1;   // Unique session UUID
  string greeting = 2;     // Initial greeting message
  bool success = 3;        // Operation success flag
  string error = 4;        // Error message if success=false
}
```

#### ChatRequest
```protobuf
message ChatRequest {
  string session_id = 1;   // Session identifier
  string message = 2;      // User's message text
  string customer_id = 3;  // User ID (validation)
}
```

#### ChatResponse (Streamable)
```protobuf
message ChatResponse {
  string session_id = 1;
  string message = 2;                      // Full message OR token chunk
  string intent = 3;                       // Detected intent (optional)
  bool requires_action = 4;                // If action needed
  string suggested_action = 5;             // Action name (optional)
  bool is_final = 6;                       // Last chunk in stream?
  map<string, string> extracted_slots = 7; // Entities extracted
}
```

**Streaming Behavior:**
- **Non-streaming:** Single `ChatResponse` with full message
- **Streaming:** Multiple `ChatResponse` messages:
  - Each contains a token chunk (`message` field)
  - Last chunk has `is_final=true`
  - Intent/action sent with final chunk

---

## Part 2: Java gRPC Server Implementation

### 2.1 Server Configuration

**File:** `services-java/va-service/src/main/java/com/ai/va/config/GrpcServerConfig.java`

```java
@Configuration
public class GrpcServerConfig {
    
    @Value("${grpc.server.port:50051}")
    private int grpcPort;
    
    @Autowired
    private ChatServiceImpl chatService;
    
    @Autowired
    private VoiceServiceImpl voiceService;
    
    @PostConstruct
    public void startGrpcServer() throws IOException {
        Server server = ServerBuilder.forPort(grpcPort)
            .addService(chatService)    // Register ChatService
            .addService(voiceService)   // Register VoiceService
            .build()
            .start();
        
        System.out.println("✅ gRPC Server started on port " + grpcPort);
        
        // Graceful shutdown hook
        Runtime.getRuntime().addShutdownHook(new Thread(() -> {
            System.out.println("Shutting down gRPC server...");
            server.shutdown();
        }));
    }
}
```

**Key Points:**
- Runs **alongside** HTTP REST server (port 8136)
- Uses **Netty** transport (high-performance async I/O)
- Auto-starts on Spring Boot application launch
- Graceful shutdown on JVM termination

---

### 2.2 ChatService Implementation

**File:** `ChatServiceImpl.java`

#### Method 1: StartSession (Unary RPC)

```java
@Override
public void startSession(
    SessionRequest request, 
    StreamObserver<SessionResponse> responseObserver
) {
    try {
        logger.info("gRPC StartSession - customerId: {}, productId: {}",
            request.getCustomerId(), request.getProductId());
        
        // Call business logic service
        Map<String, String> result = chatSessionService.startSession(
            request.getCustomerId(),
            request.getProductId()
        );
        
        // Build protobuf response
        SessionResponse response = SessionResponse.newBuilder()
            .setSessionId(result.get("sessionId"))
            .setGreeting(result.getOrDefault("greeting", "Hello!"))
            .setSuccess(true)
            .build();
        
        // Send response and complete
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

**Flow:**
1. **Request received** from Node.js client
2. **Validation** - Check customer ID, product ID
3. **Delegate** to `ChatSessionService` (business logic)
4. **Convert** internal model to protobuf `SessionResponse`
5. **Send** response via `responseObserver.onNext()`
6. **Complete** stream via `responseObserver.onCompleted()`

**Error Handling:**
- Try-catch around all logic
- Convert exceptions to gRPC `Status.INTERNAL`
- Send via `responseObserver.onError()`

---

#### Method 2: SendMessageStream (Server-Side Streaming)

```java
@Override
public void sendMessageStream(
    ChatRequest request,
    StreamObserver<ChatResponse> responseObserver
) {
    try {
        logger.info("gRPC SendMessageStream - session: {}", 
            request.getSessionId());
        
        // Convert gRPC request to internal model
        com.ai.va.model.ChatRequest internalRequest = 
            new com.ai.va.model.ChatRequest();
        internalRequest.setSessionId(request.getSessionId());
        internalRequest.setMessage(request.getMessage());
        
        // Process message (blocking call to LLM currently)
        com.ai.va.model.ChatResponse internalResponse = 
            chatSessionService.processMessage(internalRequest);
        
        // Build protobuf response
        ChatResponse.Builder builder = ChatResponse.newBuilder()
            .setSessionId(request.getSessionId())
            .setMessage(internalResponse.getMessage())
            .setIsFinal(true);  // Single chunk for now
        
        if (internalResponse.getIntent() != null) {
            builder.setIntent(internalResponse.getIntent());
        }
        
        if (internalResponse.isRequiresAction()) {
            builder.setRequiresAction(true);
            builder.setSuggestedAction(internalResponse.getSuggestedAction());
        }
        
        // Send single chunk (TODO: actual streaming)
        responseObserver.onNext(builder.build());
        responseObserver.onCompleted();
        
    } catch (Exception e) {
        logger.error("Error in sendMessageStream", e);
        responseObserver.onError(
            Status.INTERNAL.withDescription(e.getMessage()).asRuntimeException()
        );
    }
}
```

**Current Implementation:** Non-streaming (single response)

**Future Streaming Implementation:**
```java
// Pseudocode for true token streaming
LlmClient llmClient = getLlmClient();
Stream<String> tokenStream = llmClient.generateStream(message);

tokenStream.forEach(token -> {
    ChatResponse chunk = ChatResponse.newBuilder()
        .setSessionId(sessionId)
        .setMessage(token)       // Individual token
        .setIsFinal(false)       // More tokens coming
        .build();
    
    responseObserver.onNext(chunk);  // Stream each token
});

// Send final chunk with metadata
ChatResponse finalChunk = ChatResponse.newBuilder()
    .setSessionId(sessionId)
    .setMessage("")
    .setIntent(detectedIntent)
    .setIsFinal(true)
    .build();
responseObserver.onNext(finalChunk);
responseObserver.onCompleted();
```

**Benefits of Streaming:**
- User sees response as it's generated
- Lower perceived latency
- Better UX for long responses
- Can cancel mid-stream

---

#### Method 3: SendMessage (Unary RPC - Non-Streaming Fallback)

```java
@Override
public void sendMessage(
    ChatRequest request,
    StreamObserver<ChatResponse> responseObserver
) {
    // Almost identical to SendMessageStream
    // But client expects single response, not stream
    // ... (see full code above)
}
```

**Use Cases:**
- Client doesn't support streaming
- Short responses where streaming overhead not worth it
- Debugging/testing

---

#### Method 4: EndSession (Unary RPC)

```java
@Override
public void endSession(
    EndSessionRequest request,
    StreamObserver<EndSessionResponse> responseObserver
) {
    try {
        logger.info("gRPC EndSession - sessionId: {}", request.getSessionId());
        
        chatSessionService.endSession(request.getSessionId());
        
        EndSessionResponse response = EndSessionResponse.newBuilder()
            .setSuccess(true)
            .build();
        
        responseObserver.onNext(response);
        responseObserver.onCompleted();
        
    } catch (Exception e) {
        logger.error("Error in endSession gRPC", e);
        responseObserver.onError(
            Status.INTERNAL.withDescription(e.getMessage()).asRuntimeException()
        );
    }
}
```

**Actions:**
- Close MongoDB session document
- Release resources
- Clear in-memory caches

---

#### Method 5: GetHistory (Unary RPC)

```java
@Override
public void getHistory(
    HistoryRequest request,
    StreamObserver<HistoryResponse> responseObserver
) {
    try {
        logger.info("gRPC GetHistory - sessionId: {}", request.getSessionId());
        
        SessionState session = chatSessionService.getSession(request.getSessionId());
        if (session == null) {
            responseObserver.onError(
                Status.NOT_FOUND.withDescription("Session not found").asRuntimeException()
            );
            return;
        }
        
        List<Turn> turns = session.getTranscript();
        HistoryResponse.Builder builder = HistoryResponse.newBuilder();
        
        for (Turn turn : turns) {
            HistoryMessage message = HistoryMessage.newBuilder()
                .setRole(turn.getSpeaker())      // "user" or "assistant"
                .setContent(turn.getText())
                .setTimestamp((long) turn.getTimestamp())
                .build();
            builder.addMessages(message);
        }
        
        responseObserver.onNext(builder.build());
        responseObserver.onCompleted();
        
    } catch (Exception e) {
        logger.error("Error in getHistory gRPC", e);
        responseObserver.onError(
            Status.INTERNAL.withDescription(e.getMessage()).asRuntimeException()
        );
    }
}
```

**Returns:** List of all turns in conversation

---

## Part 3: Node.js gRPC Client Implementation

### 3.1 Client Initialization

**File:** `backend-node/src/grpc/client.ts`

```typescript
import * as grpc from '@grpc/grpc-js';
import * as protoLoader from '@grpc/proto-loader';

const GRPC_SERVER = process.env.VA_GRPC_SERVER || 'localhost:50051';

// Load proto files
const packageDefinition = protoLoader.loadSync(
  ['chat.proto', 'voice.proto'],
  {
    keepCase: true,      // Preserve snake_case field names
    longs: String,       // Convert int64 to String
    enums: String,       // Enum values as strings
    defaults: true,      // Populate default values
    oneofs: true         // Handle oneof fields
  }
);

const protoDescriptor = grpc.loadPackageDefinition(packageDefinition);

// Create client instances
class GrpcClient {
  private chatClient: ChatServiceClient;
  private voiceClient: VoiceServiceClient;
  
  constructor() {
    this.chatClient = new protoDescriptor.com.ai.va.grpc.ChatService(
      GRPC_SERVER,
      grpc.credentials.createInsecure()  // TODO: TLS for production
    );
    
    this.voiceClient = new protoDescriptor.com.ai.va.grpc.VoiceService(
      GRPC_SERVER,
      grpc.credentials.createInsecure()
    );
    
    console.log(`✅ gRPC clients initialized - server: ${GRPC_SERVER}`);
  }
  
  // ... methods below
}

// Export singleton
export const grpcClient = new GrpcClient();
```

**Key Configuration:**
- **Dynamic loading:** Proto files loaded at runtime (no precompilation)
- **Insecure credentials:** For development (TLS in production)
- **Singleton pattern:** One client instance for entire app

---

### 3.2 Unary RPC Calls

#### Example: StartSession

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
```

**Flow:**
1. **Wrap in Promise** for async/await usage
2. **Call RPC method** with request object
3. **Callback receives** error or response
4. **Resolve/reject** promise accordingly

**Usage in Socket Handler:**
```typescript
socket.on('chat:init', async ({ customerId, productId }) => {
  try {
    const response = await grpcClient.startChatSession(customerId, productId);
    socket.emit('chat:session-created', {
      sessionId: response.session_id,
      greeting: response.greeting
    });
  } catch (error) {
    socket.emit('chat:error', { error: error.message });
  }
});
```

---

### 3.3 Server-Side Streaming RPC

#### Example: SendMessageStream

```typescript
sendMessageStream(sessionId: string, message: string): grpc.ClientReadableStream<any> {
  const request = {
    session_id: sessionId,
    message: message
  };
  
  console.log(`gRPC SendMessageStream: session=${sessionId}`);
  return this.chatClient.SendMessageStream(request);
}
```

**Returns:** Readable stream of `ChatResponse` messages

**Usage in Socket Handler:**
```typescript
socket.on('chat:send-message', async ({ sessionId, message }) => {
  try {
    // Get streaming response
    const stream = grpcClient.sendMessageStream(sessionId, message);
    
    // Listen for data chunks (tokens)
    stream.on('data', (chunk: ChatResponse) => {
      if (chunk.is_final) {
        // Final chunk with metadata
        socket.emit('chat:message-received', {
          role: 'assistant',
          content: chunk.message,
          intent: chunk.intent,
          requiresAction: chunk.requires_action,
          suggestedAction: chunk.suggested_action
        });
      } else {
        // Stream token to frontend
        socket.emit('chat:token', {
          token: chunk.message
        });
      }
    });
    
    // Handle stream completion
    stream.on('end', () => {
      console.log('[gRPC] Stream completed');
      socket.emit('chat:typing', { isTyping: false });
    });
    
    // Handle errors
    stream.on('error', (error) => {
      console.error('[gRPC] Stream error:', error);
      socket.emit('chat:error', { error: error.message });
    });
    
  } catch (error) {
    socket.emit('chat:error', { error: error.message });
  }
});
```

**Event Flow:**
1. **Initial request** sent to Java server
2. **Stream opened** - Java can send multiple responses
3. **Each token** received triggers `data` event
4. **Final chunk** identified by `is_final=true`
5. **Stream ends** - `end` event fired
6. **Errors** handled via `error` event

---

## Part 4: Complete Message Flow (with gRPC)

### Scenario: User sends "What's the weather?"

```
[0ms]     Frontend: User clicks Send
[1ms]     Frontend: socket.emit('chat:send-message')
[5ms]     Node.js Backend: Receives Socket.IO event

          ┌─────────────────────────────────────────┐
          │   Node.js calls gRPC sendMessageStream  │
          └─────────────────┬───────────────────────┘
                            │
[10ms]                      │ HTTP/2 Request
                            │ Binary Protocol Buffers
                            ↓
          ┌─────────────────────────────────────────┐
          │   Java gRPC Server receives request     │
          │   1. Validate session                   │
          │   2. Call ChatSessionService            │
          │   3. DialogManager processes intent     │
          │   4. LLM call (OpenAI API)             │
          └─────────────────┬───────────────────────┘
                            │
[500ms]                     │ LLM responds (blocking currently)
                            │
                            ↓
          ┌─────────────────────────────────────────┐
          │   Java builds ChatResponse protobuf     │
          │   - message: "The weather is sunny"     │
          │   - intent: "weather_query"             │
          │   - is_final: true                      │
          └─────────────────┬───────────────────────┘
                            │
[520ms]                     │ gRPC Response Stream
                            │ (Single chunk for now)
                            ↓
          ┌─────────────────────────────────────────┐
          │   Node.js receives stream chunk         │
          │   stream.on('data', chunk => {...})     │
          └─────────────────┬───────────────────────┘
                            │
[525ms]                     │ Socket.IO emit
                            ↓
[530ms]   Frontend: Receives 'chat:message-received'
[531ms]   Frontend: Updates UI with response
```

**Latency Breakdown:**
- Socket.IO: ~5ms
- gRPC Node → Java: ~5ms
- Java processing + LLM: ~500ms
- gRPC Java → Node: ~5ms
- Socket.IO to Frontend: ~5ms
- **Total:** ~520ms

**vs REST API:**
- HTTP request overhead: +50ms
- JSON serialization: +20ms
- **Total REST:** ~590ms
- **Savings with gRPC:** ~70ms (13% faster)

---

## Part 5: Voice Streaming (Bidirectional)

### Proto Definition: voice.proto

```protobuf
service VoiceService {
  // Bidirectional streaming for real-time audio
  rpc StreamVoiceConversation(stream AudioRequest) returns (stream AudioResponse);
  
  // Non-streaming fallback
  rpc ProcessVoice(VoiceRequest) returns (VoiceResponse);
}

message AudioRequest {
  string session_id = 1;
  bytes audio_chunk = 2;      // Raw audio bytes
  int32 sample_rate = 3;
  string encoding = 4;        // "pcm", "opus", etc.
}

message AudioResponse {
  string session_id = 1;
  string transcript = 2;       // STT result
  string response_text = 3;    // LLM response
  bytes response_audio = 4;    // TTS audio
  bool is_final = 5;
}
```

### Bidirectional Flow

```typescript
// Node.js client
streamVoiceConversation(): grpc.ClientDuplexStream<any, any> {
  return this.voiceClient.StreamVoiceConversation();
}

// Usage
const voiceStream = grpcClient.streamVoiceConversation();

// SEND audio chunks TO Java
voiceStream.write({
  session_id: sessionId,
  audio_chunk: audioBuffer,
  sample_rate: 16000,
  encoding: 'pcm'
});

// RECEIVE responses FROM Java
voiceStream.on('data', (response: AudioResponse) => {
  console.log('Transcript:', response.transcript);
  console.log('Response:', response.response_text);
  
  // Play audio
  if (response.response_audio) {
    playAudioChunk(response.response_audio);
  }
});

// End stream
voiceStream.end();
```

**Java Implementation (Pseudocode):**
```java
@Override
public StreamObserver<AudioRequest> streamVoiceConversation(
    StreamObserver<AudioResponse> responseObserver
) {
    return new StreamObserver<AudioRequest>() {
        private StringBuilder audioBuffer = new StringBuilder();
        
        @Override
        public void onNext(AudioRequest request) {
            // Accumulate audio chunks
            audioBuffer.append(request.getAudioChunk());
            
            // When enough audio accumulated (e.g., 1 second)
            if (audioBuffer.length() >= CHUNK_SIZE) {
                // 1. Speech-to-Text
                String transcript = sttService.transcribe(audioBuffer.toString());
                
                // 2. Process with LLM
                String responseText = llmService.generate(transcript);
                
                // 3. Text-to-Speech
                byte[] responseAudio = ttsService.synthesize(responseText);
                
                // 4. Send response
                AudioResponse response = AudioResponse.newBuilder()
                    .setSessionId(request.getSessionId())
                    .setTranscript(transcript)
                    .setResponseText(responseText)
                    .setResponseAudio(ByteString.copyFrom(responseAudio))
                    .setIsFinal(false)
                    .build();
                
                responseObserver.onNext(response);
                audioBuffer.setLength(0);  // Clear buffer
            }
        }
        
        @Override
        public void onCompleted() {
            responseObserver.onCompleted();
        }
        
        @Override
        public void onError(Throwable t) {
            logger.error("Voice stream error", t);
        }
    };
}
```

**Benefits:**
- **True real-time:** Audio flows both ways simultaneously
- **Low latency:** No request-response cycle overhead
- **Chunked processing:** Process audio as it arrives
- **Cancellable:** Either side can end stream

---

## Part 6: Error Handling

### gRPC Status Codes

| Code | Name | Use Case | HTTP Equivalent |
|------|------|----------|----------------|
| `OK` | Success | Normal completion | 200 OK |
| `CANCELLED` | Canceled | Client cancels RPC | 499 |
| `UNKNOWN` | Unknown | Unknown error | 500 |
| `INVALID_ARGUMENT` | Invalid Argument | Bad request data | 400 |
| `DEADLINE_EXCEEDED` | Timeout | RPC took too long | 504 |
| `NOT_FOUND` | Not Found | Resource missing | 404 |
| `ALREADY_EXISTS` | Conflict | Resource exists | 409 |
| `PERMISSION_DENIED` | Forbidden | Access denied | 403 |
| `UNAUTHENTICATED` | Auth Failed | Invalid credentials | 401 |
| `RESOURCE_EXHAUSTED` | Rate Limited | Too many requests | 429 |
| `INTERNAL` | Internal Error | Server error | 500 |
| `UNAVAILABLE` | Service Down | Server unreachable | 503 |

### Java Error Handling

```java
try {
    // Business logic
    SessionState session = chatSessionService.getSession(sessionId);
    
    if (session == null) {
        responseObserver.onError(
            Status.NOT_FOUND
                .withDescription("Session not found: " + sessionId)
                .asRuntimeException()
        );
        return;
    }
    
    // Process...
    
} catch (IllegalArgumentException e) {
    responseObserver.onError(
        Status.INVALID_ARGUMENT
            .withDescription(e.getMessage())
            .asRuntimeException()
    );
} catch (Exception e) {
    logger.error("Unexpected error", e);
    responseObserver.onError(
        Status.INTERNAL
            .withDescription("Internal server error")
            .asRuntimeException()
    );
}
```

### Node.js Error Handling

```typescript
try {
  const response = await grpcClient.sendMessage(sessionId, message);
  return response;
} catch (error: any) {
  if (error.code === grpc.status.NOT_FOUND) {
    throw new Error('Session not found');
  } else if (error.code === grpc.status.DEADLINE_EXCEEDED) {
    throw new Error('Request timeout');
  } else if (error.code === grpc.status.UNAVAILABLE) {
    throw new Error('Service unavailable');
  } else {
    throw new Error(`gRPC error: ${error.message}`);
  }
}
```

---

## Part 7: Performance Optimization

### Connection Pooling

```typescript
// Create multiple clients for load distribution
class GrpcClientPool {
  private clients: GrpcClient[] = [];
  private currentIndex = 0;
  
  constructor(poolSize: number = 5) {
    for (let i = 0; i < poolSize; i++) {
      this.clients.push(new GrpcClient());
    }
  }
  
  getClient(): GrpcClient {
    const client = this.clients[this.currentIndex];
    this.currentIndex = (this.currentIndex + 1) % this.clients.length;
    return client;
  }
}
```

### Deadline/Timeout Configuration

```typescript
// Set deadline for RPC (5 seconds)
const deadline = new Date();
deadline.setSeconds(deadline.getSeconds() + 5);

this.chatClient.SendMessage(
  request,
  { deadline: deadline.getTime() },
  callback
);
```

### Compression

```java
// Enable gzip compression (Java server)
Server server = ServerBuilder.forPort(port)
    .addService(ServerInterceptors.intercept(
        chatService,
        new CompressionInterceptor()
    ))
    .compressorRegistry(CompressorRegistry.getDefaultInstance())
    .decompressorRegistry(DecompressorRegistry.getDefaultInstance())
    .build();
```

---

## Summary

### Key Differences: gRPC vs REST vs WebSocket

| Feature | gRPC | WebSocket | REST |
|---------|------|-----------|------|
| **Protocol** | HTTP/2 binary | WebSocket | HTTP/1.1 text |
| **Use Case** | Backend-to-backend | Frontend-to-backend | Frontend-to-backend |
| **Streaming** | ✅ Bidirectional | ✅ Bidirectional | ❌ |
| **Type Safety** | ✅ Strong (protobuf) | ❌ Manual | ❌ Manual |
| **Browser Support** | ❌ No | ✅ Yes | ✅ Yes |
| **Performance** | High | Medium | Low |
| **Complexity** | Medium | Medium | Low |

### When to Use Each

- **WebSocket (Socket.IO):** Frontend ↔ Node.js Backend
  - Real-time messaging
  - Typing indicators
  - Live notifications
  
- **gRPC:** Node.js Backend ↔ Java Services
  - LLM token streaming
  - Voice bidirectional audio
  - High-throughput data processing
  
- **REST:** Everything else
  - Session initialization
  - User authentication
  - Product configuration
  - Payment processing

---

**Next Document:** [METHOD_HANDLERS_REFERENCE.md](./METHOD_HANDLERS_REFERENCE.md) - Detailed method documentation  
**Previous Document:** [WEBSOCKET_DETAILED_FLOW.md](./WEBSOCKET_DETAILED_FLOW.md)

**Document Version:** 1.0.0  
**Last Updated:** January 15, 2026
