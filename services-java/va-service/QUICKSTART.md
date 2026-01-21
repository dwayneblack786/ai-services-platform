# Spring AI Agent - Quick Start Guide

> **Get started in 5 minutes** with LM Studio for free local development!
>
> **See also:**
> - [Provider-Agnostic Design](../../docs/PROVIDER_AGNOSTIC_DESIGN.md) - Why LM Studio + Azure is perfect
> - [Spring AI Agent Implementation](../../docs/SPRING_AI_AGENT_IMPLEMENTATION.md) - Full implementation overview
> - [Azure Deployment Guide](../../docs/AZURE_DEPLOYMENT_GUIDE.md) - Deploy to production
> - [Agent Components README](src/main/java/com/ai/va/agent/README.md) - Detailed component docs

## Prerequisites

- Java 17+
- Maven 3.8+
- MongoDB running on `localhost:27017`
- **LM Studio** installed and running (for local development)
- OR Azure OpenAI access (for production)

## 1. Configure LLM Provider

### Option A: LM Studio (Recommended for Local Development)

1. **Install LM Studio** from [lmstudio.ai](https://lmstudio.ai/)
2. **Download a model:**
   - Open LM Studio
   - Go to "Discover" tab
   - Download: **Google Gemma 2 9B** (recommended) or **Llama 2 7B**
3. **Start the local server:**
   - Go to "Local Server" tab in LM Studio
   - Click "Start Server"
   - Verify it's running on `http://localhost:1234`

The application is **already configured** to use LM Studio by default! No changes needed.

### Option B: Azure OpenAI (Production)

For production deployment, see [Azure Deployment Guide](../../docs/AZURE_DEPLOYMENT_GUIDE.md).

Quick setup:
```bash
# Windows
$env:AZURE_OPENAI_ENDPOINT="https://your-resource.openai.azure.com/"
$env:AZURE_OPENAI_KEY="your-azure-key"
$env:AZURE_OPENAI_DEPLOYMENT="gpt-4-deployment"

# Linux/Mac
export AZURE_OPENAI_ENDPOINT="https://your-resource.openai.azure.com/"
export AZURE_OPENAI_KEY="your-azure-key"
export AZURE_OPENAI_DEPLOYMENT="gpt-4-deployment"
```

Then run with production profile:
```bash
./mvnw spring-boot:run -Dspring-boot.run.profiles=prod
```

## 2. Verify MongoDB

Ensure MongoDB is running and has test data:

```bash
# Connect to MongoDB
mongosh

# Create test customer
use ai_platform
db.customers.insertOne({
  _id: ObjectId("507f1f77bcf86cd799439011"),
  name: "John Doe",
  email: "john@example.com",
  phone: "+1-555-0123",
  status: "active"
})

# Create test order
db.orders.insertOne({
  _id: ObjectId("507f1f77bcf86cd799439012"),
  customerId: "507f1f77bcf86cd799439011",
  orderNumber: "ORD-12345",
  total: 129.99,
  status: "shipped",
  estimatedDelivery: "2024-01-18",
  items: [
    { productId: "PRD-001", name: "Widget", quantity: 2, price: 64.99 }
  ]
})
```

## 3. Build and Run va-service

```bash
cd services-java/va-service

# Clean and build
./mvnw clean install

# Run the service
./mvnw spring-boot:run
```

Wait for startup message:
```
Started VaServiceApplication in X.XXX seconds
```

## 4. Test the Agent

### Health Check

```bash
curl http://localhost:8136/agent/health
```

Expected response:
```json
{
  "status": "healthy",
  "service": "ai-assistant-agent"
}
```

### Test Order Lookup

```bash
curl -X POST http://localhost:8136/agent/execute \
  -H "Content-Type: application/json" \
  -d '{
    "sessionId": "test-123",
    "message": "What is my latest order?",
    "context": {
      "userId": "user-456",
      "customerId": "507f1f77bcf86cd799439011"
    }
  }'
```

Expected response:
```json
{
  "sessionId": "test-123",
  "message": "Your latest order ORD-12345 for $129.99 is currently shipped and should arrive by January 18th.",
  "toolsUsed": ["lookupOrder"],
  "tokensUsed": 245,
  "executionTimeMs": 1250
}
```

### Test Customer Info

```bash
curl -X POST http://localhost:8136/agent/execute \
  -H "Content-Type: application/json" \
  -d '{
    "sessionId": "test-123",
    "message": "What is my email address?",
    "context": {
      "userId": "user-456",
      "customerId": "507f1f77bcf86cd799439011"
    }
  }'
```

### Test Multi-Turn Conversation

```bash
# First message
curl -X POST http://localhost:8136/agent/execute \
  -H "Content-Type: application/json" \
  -d '{
    "sessionId": "conversation-456",
    "message": "Hello!",
    "context": {}
  }'

# Second message (uses history)
curl -X POST http://localhost:8136/agent/execute \
  -H "Content-Type: application/json" \
  -d '{
    "sessionId": "conversation-456",
    "message": "What did I just say?",
    "context": {}
  }'
```

### Clear Session

```bash
curl -X DELETE http://localhost:8136/agent/session/test-123
```

## 5. Run Tests

```bash
./mvnw test
```

Expected output:
```
[INFO] Tests run: 6, Failures: 0, Errors: 0, Skipped: 0
[INFO] BUILD SUCCESS
```

## 6. Integrate with Node.js Backend

Update `backend-node/src/routes/chat-routes.ts`:

```typescript
import axios from 'axios';

const javaVAClient = axios.create({
    baseURL: 'http://localhost:8136',
    timeout: 30000
});

router.post('/agent', authenticateToken, async (req: Request, res: Response) => {
    try {
        const response = await javaVAClient.post('/agent/execute', {
            sessionId: req.body.sessionId || req.user.id,
            message: req.body.message,
            context: {
                userId: req.user.id,
                customerId: req.user.tenantId,
                userRole: req.user.role
            }
        });
        
        res.json(response.data);
    } catch (error) {
        console.error('Agent execution failed:', error);
        res.status(500).json({ error: 'Agent execution failed' });
    }
});
```

Test from frontend:
```typescript
const response = await fetch('/api/agent', {
    method: 'POST',
    headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({
        sessionId: sessionId,
        message: userMessage
    })
});

const data = await response.json();
console.log('Agent response:', data.message);
console.log('Tools used:', data.toolsUsed);
console.log('Tokens:', data.tokensUsed);
```

## Troubleshooting

### Issue: "Failed to connect to LLM"

**Solution:**
- Verify LM Studio server is running (green indicator in LM Studio)
- Check LM Studio is on port 1234: `http://localhost:1234`
- Try loading a different model (smaller models are faster)
- For Azure: Verify endpoint and API key are correct

### Issue: "Connection refused on localhost:1234"

**Solution:**
- Open LM Studio → "Local Server" tab
- Click "Start Server"
- Wait for "Server started on port 1234" message
- Verify in browser: `http://localhost:1234/v1/models`

### Issue: "MongoDB connection refused"

**Solution:**
```bash
# Check if MongoDB is running
# Windows
net start MongoDB

# Linux
sudo systemctl start mongod

# Mac
brew services start mongodb-community
```

### Issue: "No tools are being called"

**Solution:**
- Check tool @Description annotations are clear
- Verify tools are registered as @Bean in ToolsConfiguration
- Review application logs for function calling errors
- Try with explicit tool request: "Use the lookupOrder tool to find my order"

### Issue: "High latency (>5 seconds)"

**Solution:**
- Reduce `max-tokens` in application.properties
- Limit number of tools (remove unused tools from configuration)
- Use LM Studio locally for faster development
- Check network latency to OpenAI

### Issue: "OutOfMemoryError"

**Solution:**
- Implement session expiry in AgentMemory
- Reduce MAX_HISTORY_SIZE from 50 to 20
- Add scheduled cleanup task for old sessions

## Next Steps

1. **Add More Tools** - See [README.md](../services-java/va-service/src/main/java/com/ai/va/agent/README.md#adding-new-tools)
2. **Persistent Memory** - Replace in-memory with MongoDB/Redis
3. **Monitoring** - Add Spring Boot Actuator and custom metrics
4. **Security** - Implement role-based tool authorization
5. **Error Handling** - Add retry logic and circuit breakers

## Resources

- [LM Studio](https://lmstudio.ai/) - Local development
- [Spring AI Agent Implementation](../../docs/SPRING_AI_AGENT_IMPLEMENTATION.md) - Complete guide
- [Spring AI Documentation](https://docs.spring.io/spring-ai/reference/)
- [OpenAI Function Calling](https://platform.openai.com/docs/guides/function-calling)
- [Agent README](src/main/java/com/ai/va/agent/README.md) - Detailed documentation
- [Provider-Agnostic Design](../../docs/PROVIDER_AGNOSTIC_DESIGN.md) - Architecture analysis
- [Azure Deployment Guide](../../docs/AZURE_DEPLOYMENT_GUIDE.md) - Production deployment
