# Testing the Spring AI Agent with LM Studio

## 🎯 Quick Test Plan

### Phase 1: Direct Agent Testing (5 minutes)
Test the Java agent directly with curl → **START HERE**

### Phase 2: Node.js Integration (10 minutes)
Connect Node.js backend to Java agent

### Phase 3: Chat UI Testing (5 minutes)
Test through your existing chat assistant

---

## Phase 1: Direct Agent Testing

### Step 1: Start LM Studio

1. **Open LM Studio**
2. **Load a model** (if not already loaded):
   - Go to "Discover" tab
   - Download: **Google Gemma 2 9B** (recommended) or any other model
3. **Start the local server**:
   - Go to "Local Server" tab
   - Click "Start Server"
   - **Verify**: You should see "Server running on port 1234"
4. **Test LM Studio is working**:
   ```powershell
   curl http://localhost:1234/v1/models
   ```
   Should return: `{"data":[{"id":"google/gemma-2-9b",...}]}`

### Step 2: Start MongoDB

If not already running:
```powershell
# Check if running
mongosh --eval "db.version()" --quiet

# If not running, start it
# Windows (as admin):
net start MongoDB

# Or use MongoDB Compass to start it
```

### Step 3: Create Test Data (Optional but Recommended)

```powershell
mongosh
```
```javascript
use ai_platform

// Create test customer
db.customers.insertOne({
  _id: ObjectId("507f1f77bcf86cd799439011"),
  name: "John Doe",
  email: "john@example.com",
  phone: "+1-555-0123",
  status: "active",
  createdAt: new Date()
})

// Create test order
db.orders.insertOne({
  _id: ObjectId("507f1f77bcf86cd799439012"),
  customerId: "507f1f77bcf86cd799439011",
  orderNumber: "ORD-12345",
  total: 129.99,
  status: "shipped",
  estimatedDelivery: "2024-01-25",
  items: [
    { productId: "PRD-001", name: "Widget", quantity: 2, price: 64.99 }
  ],
  createdAt: new Date()
})

// Exit
exit
```

### Step 4: Build and Start va-service

Open a **new PowerShell terminal**:

```powershell
cd services-java/va-service

# Build (first time only)
./mvnw clean install -DskipTests

# Start the service
./mvnw spring-boot:run
```

**Wait for startup message:**
```
Started VaServiceApplication in X.XXX seconds
```

### Step 5: Test Agent Endpoints

Open **another PowerShell terminal** and test:

#### Test 1: Health Check
```powershell
curl http://localhost:8136/agent/health
```
**Expected:** `{"status":"healthy","service":"ai-assistant-agent"}`

#### Test 2: Simple Greeting (No Tools)
```powershell
curl -X POST http://localhost:8136/agent/execute `
  -H "Content-Type: application/json" `
  -d '{
    "sessionId": "test-123",
    "message": "Hello! Who are you?",
    "context": {}
  }'
```

**Expected Response:**
```json
{
  "sessionId": "test-123",
  "message": "Hello! I'm a helpful AI assistant...",
  "toolsUsed": [],
  "tokensUsed": 150,
  "executionTimeMs": 1200
}
```

#### Test 3: Tool Usage - Order Lookup
```powershell
curl -X POST http://localhost:8136/agent/execute `
  -H "Content-Type: application/json" `
  -d '{
    "sessionId": "test-456",
    "message": "What is my latest order?",
    "context": {
      "customerId": "507f1f77bcf86cd799439011"
    }
  }'
```

**Expected Response:**
```json
{
  "sessionId": "test-456",
  "message": "Your latest order ORD-12345 for $129.99 is currently shipped...",
  "toolsUsed": ["lookupOrder"],
  "tokensUsed": 245,
  "executionTimeMs": 1800
}
```

#### Test 4: Multi-Turn Conversation
```powershell
# First message
curl -X POST http://localhost:8136/agent/execute `
  -H "Content-Type: application/json" `
  -d '{
    "sessionId": "conversation-789",
    "message": "My name is Alice",
    "context": {}
  }'

# Second message (should remember context)
curl -X POST http://localhost:8136/agent/execute `
  -H "Content-Type: application/json" `
  -d '{
    "sessionId": "conversation-789",
    "message": "What did I just tell you my name was?",
    "context": {}
  }'
```

**Expected:** Second response should mention "Alice"

### ✅ Phase 1 Complete!

If all tests pass, your agent is working with LM Studio! 🎉

---

## Phase 2: Node.js Integration

### Step 1: Create Agent Route in Node.js Backend

Create file: `backend-node/src/routes/agent-routes.ts`

```typescript
import express, { Request, Response } from 'express';
import axios from 'axios';
import { authenticateToken } from '../middleware/auth';

const router = express.Router();

// Create Java VA client
const javaVAClient = axios.create({
    baseURL: 'http://localhost:8136',
    timeout: 30000
});

/**
 * POST /api/agent/execute
 * Execute the AI agent with user message
 */
router.post('/execute', authenticateToken, async (req: Request, res: Response) => {
    try {
        const { sessionId, message } = req.body;
        
        // Validate inputs
        if (!message || typeof message !== 'string') {
            return res.status(400).json({ error: 'Message is required' });
        }
        
        // Call Java agent
        const response = await javaVAClient.post('/agent/execute', {
            sessionId: sessionId || req.user.id, // Use user ID if no sessionId
            message: message,
            context: {
                userId: req.user.id,
                customerId: req.user.tenantId,
                userRole: req.user.role,
                userName: req.user.name
            }
        });
        
        // Track token usage if available
        if (response.data.tokensUsed) {
            // TODO: Track tokens for rate limiting/billing
            console.log(`Agent used ${response.data.tokensUsed} tokens for user ${req.user.id}`);
        }
        
        res.json(response.data);
    } catch (error) {
        console.error('Agent execution failed:', error);
        
        // Handle specific errors
        if (axios.isAxiosError(error) && error.response) {
            return res.status(error.response.status).json({
                error: 'Agent service error',
                details: error.response.data
            });
        }
        
        res.status(500).json({ 
            error: 'Agent execution failed',
            message: 'The AI assistant is temporarily unavailable'
        });
    }
});

/**
 * DELETE /api/agent/session/:sessionId
 * Clear conversation history for a session
 */
router.delete('/session/:sessionId', authenticateToken, async (req: Request, res: Response) => {
    try {
        const { sessionId } = req.params;
        
        await javaVAClient.delete(`/agent/session/${sessionId}`);
        
        res.json({ message: 'Session cleared successfully' });
    } catch (error) {
        console.error('Failed to clear session:', error);
        res.status(500).json({ error: 'Failed to clear session' });
    }
});

/**
 * GET /api/agent/health
 * Check agent service health
 */
router.get('/health', async (req: Request, res: Response) => {
    try {
        const response = await javaVAClient.get('/agent/health', {
            timeout: 5000
        });
        res.json(response.data);
    } catch (error) {
        res.status(503).json({ 
            status: 'unhealthy',
            error: 'Agent service unavailable'
        });
    }
});

export default router;
```

### Step 2: Register Agent Route

Update `backend-node/src/index.ts`:

```typescript
// Add this import
import agentRoutes from './routes/agent-routes';

// Add this route (with other routes)
app.use('/api/agent', agentRoutes);
```

### Step 3: Start Node.js Backend

```powershell
cd backend-node
npm run dev
```

**Wait for:** `🚀 Server is running on port 5000`

### Step 4: Test Through Node.js

You need a valid JWT token first:

```powershell
# Login to get token (use your actual credentials)
$loginResponse = Invoke-RestMethod -Uri "http://localhost:5000/api/auth/login" `
  -Method POST `
  -ContentType "application/json" `
  -Body '{"email":"your-email","password":"your-password"}'

$token = $loginResponse.token

# Test agent through Node.js
Invoke-RestMethod -Uri "http://localhost:5000/api/agent/execute" `
  -Method POST `
  -Headers @{Authorization="Bearer $token"} `
  -ContentType "application/json" `
  -Body '{
    "message": "Hello! What can you help me with?",
    "sessionId": "test-session"
  }'
```

### ✅ Phase 2 Complete!

If successful, Node.js is now proxying to the Java agent! 🎉

---

## Phase 3: Chat UI Testing

### Step 1: Update Frontend to Use Agent

Update `frontend/src/pages/Dashboard.tsx` or wherever your chat is:

```typescript
// Add this function
const sendAgentMessage = async (message: string) => {
    try {
        const response = await fetch('/api/agent/execute', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
                message: message,
                sessionId: sessionId // You can generate this: crypto.randomUUID()
            })
        });
        
        const data = await response.json();
        
        console.log('Agent response:', data.message);
        console.log('Tools used:', data.toolsUsed);
        console.log('Tokens:', data.tokensUsed);
        
        return data;
    } catch (error) {
        console.error('Agent error:', error);
        throw error;
    }
};
```

### Step 2: Test in Browser

1. **Start frontend** (if not running):
   ```powershell
   cd frontend
   npm run dev
   ```

2. **Open browser**: http://localhost:5173

3. **Login** to your app

4. **Send a test message** through the chat UI:
   - "Hello!"
   - "What is my latest order?"
   - "Tell me about my account"

### ✅ Phase 3 Complete!

Your chat assistant is now powered by the agentic AI! 🎉

---

## What's Currently Missing

Based on the implementation, here's what you need to add:

### ✅ Already Complete
- [x] AssistantAgent orchestration
- [x] AgentResponse model
- [x] AgentMemory for conversation history
- [x] AgentController REST endpoints
- [x] ToolsConfiguration with 4 tools
- [x] MongoDB configuration
- [x] Spring AI auto-configuration
- [x] LM Studio configuration

### ⚠️ Need to Add

1. **Node.js Agent Route** (Phase 2 above)
   - File: `backend-node/src/routes/agent-routes.ts`
   - Register in `index.ts`

2. **Frontend Integration** (Phase 3 above)
   - Update chat component to call `/api/agent/execute`
   - Display agent responses
   - Show tools used (optional but cool!)

3. **Test Data** (Optional)
   - MongoDB test orders/customers
   - Makes tool testing more realistic

4. **Enhanced Tools** (Future)
   - More tool definitions in ToolsConfiguration.java
   - Payment processing
   - Email notifications
   - Calendar integration

### 🔄 Optional Enhancements

1. **Streaming Responses** (for better UX)
   ```java
   // In AgentController.java
   @GetMapping(value = "/execute/stream", produces = MediaType.TEXT_EVENT_STREAM_VALUE)
   public Flux<String> executeStream(@RequestBody AgentRequest request) {
       // Stream tokens as they're generated
   }
   ```

2. **Token Usage Tracking**
   ```typescript
   // In backend-node
   await trackTokenUsage(req.user.id, response.data.tokensUsed);
   ```

3. **Rate Limiting**
   ```typescript
   // Add to agent-routes.ts
   if (await isRateLimited(req.user.id)) {
       return res.status(429).json({ error: 'Too many requests' });
   }
   ```

4. **Error Recovery**
   ```java
   // In AssistantAgent.java
   @Retryable(maxAttempts = 3, backoff = @Backoff(delay = 1000))
   public AgentResponse execute(...) {
       // Retry on transient failures
   }
   ```

---

## Troubleshooting

### LM Studio Issues

**Problem:** `Connection refused on localhost:1234`

**Solution:**
- Open LM Studio
- Go to "Local Server" tab
- Click "Start Server"
- Verify in browser: http://localhost:1234/v1/models

### MongoDB Issues

**Problem:** `MongoTimeoutException`

**Solution:**
```powershell
# Start MongoDB
net start MongoDB

# Or check if running
mongosh --eval "db.version()"
```

### Agent Not Calling Tools

**Problem:** Agent responds but never uses tools

**Solution:**
- Check LM Studio model supports function calling (Gemma 2 does)
- Verify tool @Description annotations are clear
- Try explicit request: "Use the lookupOrder tool to find my order"

### High Latency

**Problem:** Responses taking >10 seconds

**Solution:**
- Use smaller model (7B instead of 13B)
- Reduce `max-tokens` in application.properties
- Check CPU usage in LM Studio

---

## Quick Reference

### Service URLs
- **Java Agent:** http://localhost:8136/agent/execute
- **Node.js Backend:** http://localhost:5000/api/agent/execute
- **Frontend:** http://localhost:5173
- **LM Studio:** http://localhost:1234/v1

### Key Commands
```powershell
# Start LM Studio (UI - Local Server tab)

# Start MongoDB
net start MongoDB

# Start Java Agent
cd services-java/va-service
./mvnw spring-boot:run

# Start Node.js
cd backend-node
npm run dev

# Start Frontend
cd frontend
npm run dev
```

### Test Order
1. LM Studio running ✓
2. MongoDB running ✓
3. Java agent running ✓
4. Test with curl ✓
5. Node.js running ✓
6. Test through Node.js ✓
7. Frontend running ✓
8. Test in browser ✓

---

## Next Steps After Testing

1. **Add More Tools** - See ToolsConfiguration.java
2. **Implement Streaming** - Real-time token streaming
3. **Add Metrics** - Track performance and usage
4. **Enhance Memory** - MongoDB persistence + Redis caching
5. **Deploy to Azure** - Follow [Azure Deployment Guide](../../docs/AZURE_DEPLOYMENT_GUIDE.md)

**See also:**
- [Spring AI Agent Implementation](../../docs/SPRING_AI_AGENT_IMPLEMENTATION.md)
- [Provider-Agnostic Design](../../docs/PROVIDER_AGNOSTIC_DESIGN.md)
- [Quick Start Guide](QUICKSTART.md)
