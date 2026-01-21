# Spring AI Agent Implementation

> **Component-level documentation** for the AI Assistant Agent
>
> **Parent Documentation:**
> - [Spring AI Agent Implementation](../../../../../../docs/SPRING_AI_AGENT_IMPLEMENTATION.md) - Complete implementation overview
> - [Quick Start Guide](../../../../QUICKSTART.md) - Get started with LM Studio
> - [Provider-Agnostic Design](../../../../../../docs/PROVIDER_AGNOSTIC_DESIGN.md) - Architecture rationale
> - [Azure Deployment Guide](../../../../../../docs/AZURE_DEPLOYMENT_GUIDE.md) - Production deployment

## Overview

This directory contains the AI Assistant Agent implementation using Spring AI framework. The agent provides autonomous, multi-step task execution with tool selection and conversation memory.

## Architecture

```
┌─────────────────────────────────────────────────────┐
│                   Node.js Backend                    │
│           (Authentication, Session, Routing)         │
└───────────────────┬─────────────────────────────────┘
                    │ HTTP/REST
                    ▼
┌─────────────────────────────────────────────────────┐
│                 AssistantAgent                       │
│           (Orchestration & Decision Making)          │
├─────────────────────────────────────────────────────┤
│  1. Retrieve conversation history (AgentMemory)     │
│  2. Build prompt with system instructions + context │
│  3. Call ChatClient with available tools            │
│  4. LLM decides which tools to use                  │
│  5. Execute tool functions                          │
│  6. Save conversation to memory                     │
│  7. Return structured response                      │
└───────────────────┬─────────────────────────────────┘
                    │
        ┌───────────┼───────────┐
        ▼           ▼           ▼
    ┌────────┐  ┌────────┐  ┌──────────┐
    │ Tool 1 │  │ Tool 2 │  │  Tool N  │
    │ Orders │  │Customer│  │Knowledge │
    └────────┘  └────────┘  └──────────┘
```

## Components

### 1. AssistantAgent.java
**Purpose:** Main orchestration service that manages the agent execution lifecycle.

**Key Responsibilities:**
- Retrieve conversation history from memory
- Build prompts with system instructions and contextual information
- Coordinate with ChatClient (Spring AI's LLM interface)
- Extract tool usage metadata from responses
- Maintain conversation state across turns

**Usage:**
```java
@Autowired
private AssistantAgent agent;

AgentResponse response = agent.execute(
    "session-123",
    "What is my latest order?",
    Map.of("userId", "user-456", "customerId", "cust-789")
);
```

### 2. AgentResponse.java
**Purpose:** Structured response model for agent execution results.

**Fields:**
- `sessionId` - Conversation identifier
- `message` - LLM-generated response text
- `toolsUsed` - List of tools invoked during execution
- `tokensUsed` - Token consumption for cost tracking
- `executionTimeMs` - Performance metric

**Pattern:** Builder pattern for fluent API
```java
AgentResponse response = AgentResponse.builder()
    .sessionId("abc")
    .message("Your order #12345...")
    .toolsUsed(List.of("lookupOrder"))
    .tokensUsed(245)
    .executionTimeMs(1250)
    .build();
```

### 3. AgentMemory.java
**Purpose:** In-memory conversation history management with automatic pruning.

**Features:**
- Thread-safe storage using `ConcurrentHashMap`
- Circular buffer with max 50 messages per session
- Auto-prune oldest messages when limit exceeded

**Production Note:**
For production deployments, replace with:
- **MongoDB** - Persistent storage
- **Redis** - Fast caching layer
- **Vector DB** (Pinecone/Weaviate) - Semantic search over history

**Usage:**
```java
// Get history
List<Message> history = memory.getHistory("session-123");

// Add message
memory.addToHistory("session-123", new UserMessage("Hello"));

// Clear session
memory.clearHistory("session-123");
```

### 4. AgentController.java
**Purpose:** REST API endpoints for agent execution and session management.

**Endpoints:**

#### POST `/agent/execute`
Execute the agent with a user message.

**Request:**
```json
{
  "sessionId": "session-123",
  "message": "What is my latest order?",
  "context": {
    "userId": "user-456",
    "customerId": "cust-789",
    "userRole": "CLIENT"
  }
}
```

**Response:**
```json
{
  "sessionId": "session-123",
  "message": "Your latest order #12345 was placed on Jan 15, 2024 for $129.99. Status: Shipped",
  "toolsUsed": ["lookupOrder"],
  "tokensUsed": 245,
  "executionTimeMs": 1250
}
```

#### DELETE `/agent/session/{sessionId}`
Clear conversation history for a session.

#### GET `/agent/health`
Health check endpoint.

### 5. ToolsConfiguration.java
**Purpose:** Define tools (functions) the agent can use.

**Available Tools:**

#### lookupOrder
Look up customer orders by customer ID or order ID.
- **Input:** `OrderLookupRequest(orderId, customerId)`
- **Output:** `OrderLookupResponse(status, message, orderData)`

#### getCustomerInfo
Get customer profile information.
- **Input:** `CustomerInfoRequest(customerId)`
- **Output:** `CustomerInfoResponse(status, message, customerData)`

#### scheduleAppointment
Schedule an appointment for a customer.
- **Input:** `AppointmentRequest(customerId, date, time)`
- **Output:** `AppointmentResponse(status, message, appointmentId)`

#### searchKnowledge
Search knowledge base for information.
- **Input:** `KnowledgeSearchRequest(query)`
- **Output:** `KnowledgeSearchResponse(status, message, results)`

**Adding New Tools:**
```java
@Bean
@Description("Description of what the tool does - used by LLM to decide when to use it")
public Function<InputType, OutputType> myTool() {
    return (input) -> {
        // Tool implementation
        return output;
    };
}
```

## Configuration

### application.properties

**OpenAI (Production):**
```properties
spring.ai.openai.api-key=${OPENAI_API_KEY}
spring.ai.openai.chat.options.model=gpt-4
spring.ai.openai.chat.options.temperature=0.7
spring.ai.openai.chat.options.max-tokens=500
```

**LM Studio (Local Development):**
```properties
spring.ai.openai.base-url=http://localhost:1234/v1
spring.ai.openai.api-key=lm-studio
spring.ai.openai.chat.options.model=google/gemma-2-9b
```

**Agent Settings:**
```properties
agent.memory.max-history-size=50
agent.execution.timeout=30000
```

## Testing

### Manual Testing with curl

```bash
# Start va-service
cd services-java/va-service
./mvnw spring-boot:run

# Test agent execution
curl -X POST http://localhost:8136/agent/execute \
  -H "Content-Type: application/json" \
  -d '{
    "sessionId": "test-123",
    "message": "What is my latest order?",
    "context": {
      "userId": "user-456",
      "customerId": "cust-789"
    }
  }'

# Clear session
curl -X DELETE http://localhost:8136/agent/session/test-123

# Health check
curl http://localhost:8136/agent/health
```

### Integration with Node.js Backend

Update `backend-node/src/routes/chat-routes.ts`:

```typescript
import { Request, Response } from 'express';
import axios from 'axios';

// Create Java VA client
const javaVAClient = axios.create({
    baseURL: 'http://localhost:8136',
    timeout: 30000
});

// Agent route
router.post('/agent', authenticateToken, async (req: Request, res: Response) => {
    try {
        const response = await javaVAClient.post('/agent/execute', {
            sessionId: req.body.sessionId,
            message: req.body.message,
            context: {
                userId: req.user.id,
                customerId: req.user.tenantId,
                userRole: req.user.role
            }
        });
        
        // Track token usage for rate limiting
        if (response.data.tokensUsed) {
            await trackTokenUsage(req.user.id, response.data.tokensUsed);
        }
        
        res.json(response.data);
    } catch (error) {
        console.error('Agent execution failed:', error);
        res.status(500).json({ error: 'Agent execution failed' });
    }
});
```

## Agentic Workflow Example

**User Request:** "Book an appointment for tomorrow at 2pm and send me a confirmation"

**Agent Execution:**
1. **Tool Selection:** Agent decides to use `scheduleAppointment` tool
2. **Tool Execution:** Calls `scheduleAppointment("cust-123", "2024-01-16", "14:00")`
3. **Result Processing:** Gets appointmentId from response
4. **Second Tool Selection:** Agent decides to use `sendEmail` tool (if available)
5. **Second Tool Execution:** Sends confirmation email
6. **Response Synthesis:** Combines both results into natural language response

**Response:** "I've scheduled your appointment for tomorrow (January 16) at 2:00 PM. You should receive a confirmation email shortly. Your appointment ID is APT-789."

## Performance Considerations

**Latency:**
- Direct Java → LLM: ~1-2 seconds
- With tool execution: +200-500ms per tool
- Target: <3 seconds for 2-tool operations

**Token Usage:**
- System prompt: ~150 tokens
- Tool definitions: ~50 tokens per tool
- Conversation history: ~20 tokens per turn
- Monitor with `tokensUsed` field

**Memory Management:**
- In-memory: 50 messages per session
- MongoDB persistence: Unlimited with TTL index
- Redis cache: Fast access, auto-expire after 24h

## Troubleshooting

### Agent not calling tools
**Symptom:** Agent responds but never uses tools.
**Solution:** 
- Check tool @Description annotations are clear
- Verify tools are registered as @Bean
- Ensure ChatClient is configured with function calling enabled

### High latency
**Symptom:** Responses taking >5 seconds.
**Solution:**
- Reduce max-tokens in configuration
- Limit number of tools (max 10)
- Check network latency to OpenAI/LM Studio
- Use Redis for conversation history

### Memory leaks
**Symptom:** Memory usage growing over time.
**Solution:**
- Implement session expiry in AgentMemory
- Use MongoDB for persistent storage
- Add scheduled cleanup task for old sessions

## Future Enhancements

1. **Persistent Memory** - Replace in-memory with MongoDB + Redis
2. **Vector Search** - Add semantic search over conversation history
3. **Multi-Agent** - Orchestrate multiple specialized agents
4. **Streaming** - Support real-time streaming responses
5. **Observability** - Add tracing, metrics, and dashboard
6. **Tool Authorization** - Role-based tool access control
7. **Retry Logic** - Handle transient failures gracefully
8. **Rate Limiting** - Protect against abuse and cost overruns

## Resources

- [Spring AI Documentation](https://docs.spring.io/spring-ai/reference/)
- [OpenAI Function Calling](https://platform.openai.com/docs/guides/function-calling)
- [Agentic Workflows Guide](https://www.anthropic.com/index/building-effective-agents)
- [Quick Start Guide](../../../../QUICKSTART.md) - Local setup
- [Spring AI Agent Implementation](../../../../../../docs/SPRING_AI_AGENT_IMPLEMENTATION.md) - Full overview
- [Provider-Agnostic Design](../../../../../../docs/PROVIDER_AGNOSTIC_DESIGN.md) - Why this architecture
- [Azure Deployment](../../../../../../docs/AZURE_DEPLOYMENT_GUIDE.md) - Production setup
