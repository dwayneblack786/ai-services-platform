# gRPC Streaming Gap Analysis - What Was Broken During Refactor

**Date**: January 15, 2026  
**Status**: 🔴 **CRITICAL** - gRPC streaming not being used despite full implementation

---

## Problem Summary

We have a **fully implemented gRPC streaming solution** in Java, but the Node.js backend is **still using HTTP SSE** to connect to Java, completely bypassing the faster gRPC streaming path.

---

## What Was Implemented ✅

### Java Side (FULLY WORKING)
1. **Proto Definition** ([proto/chat.proto](../backend-node/proto/chat.proto)):
   ```protobuf
   service ChatService {
     rpc SendMessageStream(ChatRequest) returns (stream ChatResponse);
   }
   ```

2. **Java gRPC Server** ([ChatServiceImpl.java](../services-java/va-service/src/main/java/com/ai/va/grpc/ChatServiceImpl.java#L60)):
   ```java
   @Override
   public void sendMessageStream(ChatRequest request, StreamObserver<ChatResponse> responseObserver) {
       // Fully implemented token-by-token streaming
       chatSessionService.processMessageStreamingGrpc(
           request.getSessionId(),
           request.getMessage(),
           responseObserver
       );
   }
   ```

3. **Streaming Service** ([ChatSessionService.java](../services-java/va-service/src/main/java/com/ai/va/service/ChatSessionService.java#L713)):
   ```java
   public void processMessageStreamingGrpc(
       String sessionId, 
       String userMessage, 
       StreamObserver<ChatResponse> responseObserver
   ) {
       // Streams each token via:
       llmClient.streamChatCompletion(systemPrompt, prompt, 0.7, (token) -> {
           ChatResponse tokenResponse = ChatResponse.newBuilder()
               .setSessionId(sessionId)
               .setMessage(token)
               .setIsFinal(false)
               .build();
           responseObserver.onNext(tokenResponse);
       });
   }
   ```

4. **Test Script** ([test-grpc.js](../backend-node/test-grpc.js)):
   - ✅ Successfully tests gRPC streaming
   - ✅ Results: 60.61 tokens/sec, 280ms to first token
   - ✅ Proves gRPC streaming works end-to-end

---

## What's Broken 🔴

### Node.js Backend (NOT USING gRPC)

**Current Implementation** ([chat-routes.ts](../backend-node/src/routes/chat-routes.ts#L256)):
```typescript
router.get('/message/stream', authenticateToken, streamRateLimiter, async (req, res) => {
  // ❌ PROBLEM: Still using HTTP SSE instead of gRPC!
  const javaUrl = `http://localhost:8136/chat/message/stream?...`;
  
  const javaResponse = await fetch(javaUrl, {
    method: 'GET',
    headers: { 'Accept': 'text/event-stream' },  // ❌ Using HTTP SSE
  });
  
  // Proxies HTTP SSE stream to frontend
  javaResponse.body?.on('data', (chunk) => res.write(chunk));
});
```

**What It Should Be**:
```typescript
router.get('/message/stream', authenticateToken, streamRateLimiter, async (req, res) => {
  // ✅ Use gRPC streaming instead
  const grpcClient = new GrpcChatClient();
  const stream = grpcClient.sendMessageStream(sessionId, message);
  
  // Set SSE headers for frontend
  res.setHeader('Content-Type', 'text/event-stream');
  
  // Convert gRPC stream to SSE for frontend
  stream.on('data', (response) => {
    res.write(`event: token\ndata: ${JSON.stringify({
      token: response.message,
      isFinal: response.is_final
    })}\n\n`);
  });
  
  stream.on('end', () => res.end());
  stream.on('error', (err) => {
    res.write(`event: error\ndata: ${JSON.stringify({ error: err.message })}\n\n`);
    res.end();
  });
});
```

---

## Performance Impact

### Current (HTTP SSE → HTTP SSE):
```
Frontend → SSE → Node.js → HTTP SSE → Java → LM Studio
  129ms to first token
  81 tokens/sec
  HTTP overhead on Node→Java link
```

### If We Use gRPC (SSE → gRPC):
```
Frontend → SSE → Node.js → gRPC → Java → LM Studio
  108ms to first token (16% FASTER ⚡)
  86 tokens/sec (6% HIGHER)
  Binary protocol efficiency
```

**Savings**: 21ms faster first token, better throughput

---

## Documentation Says It's Implemented

From [GRPC_IMPLEMENTATION.md](./GRPC_IMPLEMENTATION.md):

> ✅ **Token streaming now implemented**: `sendMessageStream()` uses `processMessageStreamingGrpc()`

> **Winner**: gRPC is 16.1% faster to first token, 6.2% higher throughput

> **Recommendation**: Use gRPC for inter-service communication

**But we're not using it!** 🤦

---

## What Needs to Be Done

### Option 1: Create gRPC Client Wrapper (Recommended)

**File**: `backend-node/src/services/grpcChatClient.ts` (NEW)
```typescript
import * as grpc from '@grpc/grpc-js';
import * as protoLoader from '@grpc/proto-loader';
import path from 'path';

export class GrpcChatClient {
  private client: any;
  
  constructor() {
    const PROTO_PATH = path.join(__dirname, '../../proto/chat.proto');
    const packageDefinition = protoLoader.loadSync(PROTO_PATH, {
      keepCase: true,
      longs: String,
      enums: String,
      defaults: true,
      oneofs: true
    });
    
    const chatProto = grpc.loadPackageDefinition(packageDefinition).com.ai.va.grpc;
    this.client = new chatProto.ChatService(
      'localhost:50051',
      grpc.credentials.createInsecure()
    );
  }
  
  sendMessageStream(sessionId: string, message: string) {
    const request = {
      session_id: sessionId,
      message: message,
      customer_id: 'from-node'
    };
    
    return this.client.SendMessageStream(request);
  }
  
  // ... other methods
}
```

### Option 2: Update chat-routes.ts

Replace the SSE fetch with gRPC stream consumption:
1. Import GrpcChatClient
2. Call `sendMessageStream()` instead of HTTP fetch
3. Convert gRPC data events to SSE format for frontend
4. Handle errors and completion properly

### Option 3: Add Circuit Breaker to gRPC Client

Wrap gRPC calls in circuit breaker just like HTTP calls.

---

## Testing Checklist

After implementing gRPC client in Node.js:

- [ ] Test `/api/chat/message/stream` still works from frontend
- [ ] Verify tokens stream progressively (same UX as before)
- [ ] Check performance: should be ~108ms to first token
- [ ] Test rate limiting still works
- [ ] Test authentication middleware still applies
- [ ] Test error handling (Java down, network issues)
- [ ] Test circuit breaker opens on failures
- [ ] Run `test-grpc.js` to verify direct gRPC still works
- [ ] Compare with SSE performance baseline

---

## Files That Need Changes

1. **NEW**: `backend-node/src/services/grpcChatClient.ts` - Create gRPC client wrapper
2. **MODIFY**: `backend-node/src/routes/chat-routes.ts` - Update `/message/stream` route
3. **MODIFY**: `backend-node/src/services/apiClient.ts` - Add gRPC circuit breaker (optional)
4. **UPDATE**: `docs/GRPC_IMPLEMENTATION.md` - Document actual usage, not just "implemented"

---

## Root Cause Analysis

### Why Did This Happen?

1. **gRPC was implemented in Java** ✅
2. **gRPC was tested directly with Node.js script** ✅  
3. **Documentation was written saying "implemented"** ✅
4. **BUT: Express routes were never updated to use it** ❌

The refactor/implementation focused on the Java side and direct testing, but the integration into the actual Express API routes that serve the frontend was **never completed**.

### Evidence

- `test-grpc.js` works perfectly → gRPC Java implementation is solid
- `/api/chat/message/stream` uses `fetch(http://localhost:8136/...)` → Still HTTP
- Performance docs show gRPC is faster → But we're not using that code path
- GRPC_IMPLEMENTATION.md says "Use gRPC for inter-service" → We're not following our own recommendation

---

## Recommendation

**Priority**: 🔴 **HIGH**

**Action**: Implement Option 1 (Create GrpcChatClient wrapper)

**Rationale**:
- 16% faster token delivery improves UX significantly
- Already have all the Java code working
- Just need to wire up the Node.js side
- Small change, big performance win
- Follows our documented architecture

**Estimated Effort**: 2-4 hours
- 1 hour: Create GrpcChatClient.ts
- 1 hour: Update chat-routes.ts
- 1 hour: Testing
- 1 hour: Buffer for issues

---

## Conclusion

We have a **working, tested, documented gRPC streaming solution** that is **16% faster** than SSE, but we're **not using it** because the Node.js Express routes still call the old HTTP SSE endpoints.

This is a **quick win** - the hard work (Java implementation, protobuf definitions, testing) is done. We just need to connect the dots in the Node.js backend.

**Status**: Ready to implement ✅  
**Blocker**: None (all dependencies in place)  
**Next Step**: Create GrpcChatClient and update chat-routes.ts
