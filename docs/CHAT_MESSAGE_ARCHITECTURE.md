# Chat Message Architecture

## Overview

The AI Services Platform uses a **session-based document model** for storing chat messages in MongoDB. This architecture provides optimal performance, data consistency, and scalability for conversational AI applications.

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                          Frontend                                │
│                                                                   │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │           AssistantChat.tsx Component                      │  │
│  │  • Maintains messages array in React state                 │  │
│  │  • Supports REST API and WebSocket communication           │  │
│  │  • Message interface: { role, content, timestamp, intent } │  │
│  └───────────────────────────────────────────────────────────┘  │
│                            │                                      │
└────────────────────────────┼──────────────────────────────────────┘
                             │
                             │ HTTP/WebSocket
                             │
┌────────────────────────────▼──────────────────────────────────────┐
│                     Backend Node.js                                │
│                                                                    │
│  ┌──────────────────────────────────────────────────────────┐    │
│  │              chat-routes.ts                              │    │
│  │  • POST /chat/session - Create new session               │    │
│  │  • POST /chat/message - Send message                     │    │
│  │  • GET /chat/message/stream - SSE streaming              │    │
│  │  • Proxies all requests to Java VA Service               │    │
│  └──────────────────────────────────────────────────────────┘    │
│                            │                                       │
└────────────────────────────┼───────────────────────────────────────┘
                             │
                             │ Circuit Breaker Protected
                             │
┌────────────────────────────▼───────────────────────────────────────┐
│                     Java VA Service                                 │
│                                                                     │
│  ┌──────────────────────────────────────────────────────────────┐ │
│  │          ChatSessionService.java                             │ │
│  │                                                                │ │
│  │  processMessage()                                             │ │
│  │  ├─ Add user message to in-memory SessionState               │ │
│  │  ├─ saveChatHistory() → MongoDB (user message)               │ │
│  │  ├─ Process through DialogManager                            │ │
│  │  ├─ Generate LLM response via LlmService                     │ │
│  │  ├─ Add assistant message to SessionState                    │ │
│  │  └─ saveChatHistory() → MongoDB (assistant message)          │ │
│  │                                                                │ │
│  │  saveChatHistory()                                            │ │
│  │  ├─ Query: findOne({ sessionId })                            │ │
│  │  ├─ If not found: insertOne() with messages array            │ │
│  │  └─ If found: updateOne() with $push to messages array       │ │
│  └──────────────────────────────────────────────────────────────┘ │
│                            │                                        │
└────────────────────────────┼────────────────────────────────────────┘
                             │
                             │ MongoDB Driver
                             │
┌────────────────────────────▼────────────────────────────────────────┐
│                      MongoDB Database                                │
│                                                                      │
│  ┌────────────────────────────────────────────────────────────┐    │
│  │           chat_messages Collection                          │    │
│  │                                                               │    │
│  │  {                                                           │    │
│  │    _id: ObjectId,                                           │    │
│  │    sessionId: "uuid",                                       │    │
│  │    customerId: "customer-123",                              │    │
│  │    productId: "va-service",                                 │    │
│  │    messages: [                                              │    │
│  │      { role: "user", content: "...", timestamp, intent },   │    │
│  │      { role: "assistant", content: "...", timestamp, ... }  │    │
│  │    ],                                                         │    │
│  │    startedAt: Date,                                         │    │
│  │    lastUpdatedAt: Date,                                     │    │
│  │    isActive: true                                           │    │
│  │  }                                                           │    │
│  │                                                               │    │
│  │  Index: { sessionId: 1 } UNIQUE                             │    │
│  │  Index: { customerId: 1, isActive: 1 }                      │    │
│  │  Index: { lastUpdatedAt: -1 }                               │    │
│  └────────────────────────────────────────────────────────────┘    │
│                                                                      │
└──────────────────────────────────────────────────────────────────────┘
```

## Data Model

### Session-Based Document Structure

Each chat session is represented by **one MongoDB document** containing all messages in an array:

```javascript
{
  _id: ObjectId("507f1f77bcf86cd799439011"),
  sessionId: "a3d8c947-1234-5678-9abc-def012345678",  // UUID
  customerId: "customer-123",                          // Tenant ID
  productId: "va-service",                             // Service identifier
  messages: [
    {
      role: "user",                                    // "user" | "assistant"
      content: "What are your business hours?",
      timestamp: ISODate("2024-01-15T10:30:00Z"),
      intent: "hours_inquiry"                          // Optional
    },
    {
      role: "assistant",
      content: "We're open Monday-Friday 9AM-5PM EST.",
      timestamp: ISODate("2024-01-15T10:30:02Z"),
      intent: "hours_inquiry"
    },
    {
      role: "user",
      content: "Are you open on weekends?",
      timestamp: ISODate("2024-01-15T10:31:00Z"),
      intent: "hours_inquiry"
    }
    // ... more messages
  ],
  startedAt: ISODate("2024-01-15T10:30:00Z"),
  lastUpdatedAt: ISODate("2024-01-15T10:31:00Z"),
  isActive: true
}
```

### Benefits of Session-Based Model

#### 1. **Query Performance**
- **Single Read Operation**: Retrieve entire conversation with one `findOne()` query
- **No Joins**: All related messages in one document (no aggregation pipeline needed)
- **Indexed Lookups**: Fast session retrieval via indexed `sessionId` field

#### 2. **Atomic Updates**
- **Consistent State**: Messages added atomically using `$push` operator
- **Race Condition Free**: MongoDB ensures document-level atomicity
- **No Orphans**: All messages guaranteed to belong to valid session

#### 3. **Natural Data Locality**
- **MongoDB Document Model**: Aligns with document-oriented design principles
- **Memory Efficiency**: Related data stored contiguously on disk
- **Cache Friendly**: Single document fits in memory/cache layers

#### 4. **Scalability**
- **Efficient Storage**: One document overhead instead of N documents
- **Index Efficiency**: Fewer index entries (one per session vs one per message)
- **Sharding Ready**: Can shard by `customerId` or `sessionId` for horizontal scaling

#### 5. **Simplified Queries**
```javascript
// Get all messages for session (ONE query)
db.chat_messages.findOne({ sessionId: "session-id" })

// vs Individual Message Model (N queries or complex aggregation)
db.messages.find({ sessionId: "session-id" }).sort({ timestamp: 1 })
```

## Message Flow

### 1. Session Initialization

```
User → Frontend → Backend Node → Java VA Service → MongoDB
                                        ↓
                                 Creates session document:
                                 {
                                   sessionId: UUID,
                                   messages: [],
                                   startedAt: Date,
                                   isActive: true
                                 }
```

### 2. User Message Processing

```
User sends message
    ↓
Frontend (AssistantChat.tsx)
    ↓ POST /api/chat/message
Backend Node (chat-routes.ts)
    ↓ Circuit Breaker Protected Proxy
Java VA Service (ChatSessionService.processMessage)
    ↓
┌─────────────────────────────────────────┐
│ 1. Add to in-memory SessionState        │
│ 2. saveChatHistory() → MongoDB:         │
│    $push user message to messages array │
│ 3. Process with DialogManager           │
│ 4. Generate LLM response                │
│ 5. Add assistant message to SessionState│
│ 6. saveChatHistory() → MongoDB:         │
│    $push assistant message              │
└─────────────────────────────────────────┘
    ↓
Response sent back to Frontend
```

### 3. Message Persistence

#### First Message (Create Document)
```java
Document newHistory = new Document()
    .append("sessionId", sessionId)
    .append("customerId", customerId)
    .append("productId", productId)
    .append("messages", Arrays.asList(messageDoc))  // Array with first message
    .append("startedAt", new Date())
    .append("lastUpdatedAt", new Date())
    .append("isActive", true);

mongoDBService.insertOne("chat_messages", newHistory);
```

#### Subsequent Messages (Append to Array)
```java
Document messageDoc = new Document()
    .append("role", message.getRole())
    .append("content", message.getContent())
    .append("timestamp", message.getTimestamp())
    .append("intent", message.getIntent());

Document update = new Document("$push", new Document("messages", messageDoc))
    .append("$set", new Document("lastUpdatedAt", new Date()));

mongoDBService.updateOne(
    new Document("sessionId", sessionId),
    update
);
```

### 4. History Retrieval

```java
public ChatHistory getChatHistory(String sessionId) {
    Document query = new Document("sessionId", sessionId);
    Document historyDoc = mongoDBService.findOne("chat_messages", query);
    
    if (historyDoc == null) {
        return null;
    }
    
    // Extract messages array
    List<Document> messageDocs = (List<Document>) historyDoc.get("messages");
    List<ChatMessage> messages = messageDocs.stream()
        .map(doc -> new ChatMessage(
            doc.getString("role"),
            doc.getString("content"),
            doc.getDate("timestamp"),
            doc.getString("intent")
        ))
        .collect(Collectors.toList());
    
    return new ChatHistory(sessionId, messages);
}
```

## Indexing Strategy

### Recommended Indexes

```javascript
// Primary access pattern: lookup by sessionId
db.chat_messages.createIndex({ sessionId: 1 }, { unique: true })

// Find active sessions for customer
db.chat_messages.createIndex({ customerId: 1, isActive: 1 })

// Sort by recent activity
db.chat_messages.createIndex({ lastUpdatedAt: -1 })

// Find sessions by product
db.chat_messages.createIndex({ productId: 1, lastUpdatedAt: -1 })
```

### Index Performance

| Query Pattern | Index Used | Performance |
|--------------|------------|-------------|
| Find session by ID | `{ sessionId: 1 }` | O(log n) - Index scan |
| Active sessions for customer | `{ customerId: 1, isActive: 1 }` | O(log n) - Compound index |
| Recent sessions | `{ lastUpdatedAt: -1 }` | O(log n) - Index scan |
| Messages in session | In-memory array | O(1) - Already in document |

## Scaling Considerations

### Document Size Limits

MongoDB has a 16MB document size limit. Considerations:

- **Average message**: ~500 bytes (role + content + metadata)
- **Maximum messages per document**: ~32,000 messages (theoretical)
- **Practical limit**: ~10,000 messages per session (5MB document)

### Mitigation Strategies

1. **Session Duration Limits**: End sessions after 24 hours or inactivity
2. **Message Archival**: Move old messages to separate archive collection
3. **Session Splitting**: Create new session if approaching size limits

```java
// Example: Check message count and archive if needed
if (messages.size() > 5000) {
    archiveOldMessages(sessionId);
}
```

### Sharding Strategy

For horizontal scaling:

```javascript
// Shard by customerId for tenant isolation
sh.shardCollection("chatdb.chat_messages", { customerId: 1, sessionId: 1 })

// Or shard by sessionId for uniform distribution
sh.shardCollection("chatdb.chat_messages", { sessionId: "hashed" })
```

## Comparison: Session-Based vs Individual Message Model

| Aspect | Session-Based (Current) | Individual Message Model |
|--------|------------------------|--------------------------|
| **Query Complexity** | Simple `findOne()` | Requires `find()` + sort or aggregation |
| **Query Performance** | O(1) document lookup | O(n) messages scanned |
| **Network Overhead** | One document transfer | N documents transferred |
| **Atomicity** | Atomic `$push` updates | Multiple inserts (no atomicity) |
| **Storage Overhead** | One doc header (~100 bytes) | N doc headers (~100 bytes each) |
| **Index Entries** | One entry per session | N entries (one per message) |
| **Scalability** | Excellent until 16MB limit | Better for massive sessions (>10K msgs) |
| **Code Complexity** | Simple queries | Aggregation pipelines needed |
| **Cache Efficiency** | High (single document) | Lower (N documents) |

## API Endpoints

### Create Session
```
POST /api/chat/session
Body: {
  customerId: "customer-123",
  productId: "va-service"
}
Response: {
  sessionId: "a3d8c947-...",
  message: "Hello! How can I help you today?"
}
```

### Send Message
```
POST /api/chat/message
Body: {
  sessionId: "a3d8c947-...",
  message: "What are your hours?"
}
Response: {
  sessionId: "a3d8c947-...",
  response: "We're open Monday-Friday 9AM-5PM EST.",
  intent: "hours_inquiry",
  extractedSlots: {}
}
```

### Get History
```
GET /api/chat/history/:sessionId
Response: {
  sessionId: "a3d8c947-...",
  messages: [
    { role: "user", content: "...", timestamp: "...", intent: "..." },
    { role: "assistant", content: "...", timestamp: "..." }
  ]
}
```

## Error Handling

### Circuit Breaker Protection

All chat API calls are protected by circuit breaker:

```typescript
// chat-routes.ts
router.post('/message', authenticateToken, async (req, res) => {
  try {
    const result = await circuitBreaker.execute(
      () => javaVAClient.post('/chat/message', req.body),
      'chat-message'
    );
    res.json(result.data);
  } catch (error) {
    // Circuit breaker provides fallback response
    res.status(503).json({
      error: 'Chat service temporarily unavailable',
      sessionId: req.body.sessionId
    });
  }
});
```

### MongoDB Error Handling

```java
// ChatSessionService.java
public void saveChatHistory(String sessionId, String customerId, 
                           String productId, ChatMessage message) {
    try {
        // ... save logic
    } catch (Exception e) {
        logger.error("[ChatHistory] Error saving message: {}", e.getMessage(), e);
        // Don't throw - allow session to continue even if persistence fails
    }
}
```

## Future Enhancements

### 1. Message Search
```javascript
// Text index for full-text search across messages
db.chat_messages.createIndex({ "messages.content": "text" })

// Search query
db.chat_messages.find({ $text: { $search: "business hours" } })
```

### 2. Message Reactions
```javascript
messages: [
  {
    role: "assistant",
    content: "...",
    timestamp: Date,
    intent: "...",
    reactions: {
      helpful: true,
      unhelpful: false
    }
  }
]
```

### 3. Message Attachments
```javascript
messages: [
  {
    role: "user",
    content: "Here's the document",
    timestamp: Date,
    attachments: [
      {
        filename: "invoice.pdf",
        url: "s3://bucket/files/...",
        mimeType: "application/pdf"
      }
    ]
  }
]
```

### 4. Session Analytics
```javascript
{
  sessionId: "...",
  messages: [...],
  analytics: {
    messageCount: 10,
    userMessageCount: 5,
    assistantMessageCount: 5,
    avgResponseTime: 1.2,  // seconds
    intents: ["hours_inquiry", "product_inquiry"],
    sentiment: "positive"
  }
}
```

## Related Documentation

- [Backend Node.js README](../backend-node/README.md) - Complete MongoDB schema documentation
- [Circuit Breaker Implementation Guide](./CIRCUIT_BREAKER_IMPLEMENTATION.md) - Fault tolerance for API calls
- [Redis Implementation Guide](./REDIS_IMPLEMENTATION_GUIDE.md) - Session storage and caching
- [VA Service README](../services-java/va-service/README.md) - Java implementation details

## Summary

The session-based document model provides:

✅ **Optimal Performance** - Single query retrieves all messages  
✅ **Data Consistency** - Atomic updates with MongoDB `$push`  
✅ **Scalability** - Efficient storage and indexing  
✅ **Simplicity** - Natural MongoDB document model  
✅ **Maintainability** - Clean separation of concerns  

This architecture supports the AI Services Platform's conversational AI capabilities while maintaining excellent performance characteristics suitable for production workloads.
