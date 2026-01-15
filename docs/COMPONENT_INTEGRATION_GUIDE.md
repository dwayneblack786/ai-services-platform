# AI Services Platform - Component Integration Guide

📑 **Table of Contents**
- [Overview](#overview)
- [MongoDB Shared Database Architecture](#mongodb-shared-database-architecture)
  - [Why MongoDB is Shared](#why-mongodb-is-shared)
  - [Collection Access Patterns](#collection-access-patterns)
  - [Java Service Database Access](#java-service-database-access)
  - [Data Isolation with Tenant ID](#data-isolation-with-tenant-id)
- [Component Interaction Flows](#component-interaction-flows)
  - [1. User Authentication Flow](#1-user-authentication-flow)
  - [2. Product Subscription Flow](#2-product-subscription-flow)
  - [3. Virtual Assistant Voice Flow](#3-virtual-assistant-voice-flow)
  - [4. Chat Session Flow](#4-chat-session-flow)
  - [5. Tenant Data Isolation Flow](#5-tenant-data-isolation-flow)
- [Data Flow Examples](#data-flow-examples)
  - [Example 1: User Subscribes to Virtual Assistant Product](#example-1-user-subscribes-to-virtual-assistant-product)
  - [Example 2: Incoming Phone Call to Voice Assistant](#example-2-incoming-phone-call-to-voice-assistant)
  - [Example 3: PROJECT_ADMIN Views All Tenants](#example-3-project_admin-views-all-tenants)
  - [Example 4: Regular User (Non-PROJECT_ADMIN) Views Transactions](#example-4-regular-user-non-project_admin-views-transactions)
- [Integration Points Reference](#integration-points-reference)
  - [Frontend ↔ Backend](#frontend--backend)
  - [Backend ↔ MongoDB](#backend--mongodb)
  - [Backend ↔ Java Services](#backend--java-services)
  - [Frontend ↔ Google OAuth](#frontend--google-oauth)
  - [Access Control & Multi-Tenancy](#access-control--multi-tenancy)
- [Component Dependencies](#component-dependencies)
- [Real-World Use Case: HR Department Configures Voice Assistant](#real-world-use-case-hr-department-configures-voice-assistant)
  - [Scenario](#scenario)
  - [Flow](#flow)
- [Key Files Reference](#key-files-reference)
- [Performance Considerations](#performance-considerations)
  - [Database Query Patterns](#database-query-patterns)
  - [API Response Times](#api-response-times)
  - [Scalability](#scalability)
- [Troubleshooting Common Issues](#troubleshooting-common-issues)
  - [Issue: User can't see tenants page](#issue-user-cant-see-tenants-page)
  - [Issue: Chat not connecting](#issue-chat-not-connecting)
  - [Issue: Voice call fails](#issue-voice-call-fails)
  - [Issue: Tenant data leakage](#issue-tenant-data-leakage)
- [Development Workflow](#development-workflow)
  - [Starting the Platform](#starting-the-platform)
  - [Adding a New Feature](#adding-a-new-feature)
  - [Testing Workflows](#testing-workflows)

---

## Overview

The AI Services Platform is a full-stack application that orchestrates AI services through a three-tier architecture:

```
┌─────────────────────────────────────────────────────────────────┐
│                    React Frontend (Port 5173)                    │
│         (Vite + TypeScript + Emotion Styling)                    │
└────────────────────────────┬────────────────────────────────────┘
                             │
                    ┌────────▼─────────┐
                    │ Socket.IO WebSocket  │
                    │ HTTP/REST API     │
                    └────────┬──────────┘
                             │
┌────────────────────────────▼────────────────────────────────────┐
│         Node.js Express Backend (Port 5000)                     │
│      (TypeScript + MongoDB + OAuth2 + Passport.js)              │
│                                                                  │
│  ┌─ Authentication Routes ──┐  ┌─ Data Routes ────────┐        │
│  │ • OAuth2 (Google)        │  │ • Products           │        │
│  │ • JWT Tokens             │  │ • Subscriptions      │        │
│  │ • Sessions               │  │ • Configurations     │        │
│  │ • Tenants                │  │ • Transactions       │        │
│  │ • Users                  │  │ • Payment Methods    │        │
│  └──────────────────────────┘  └──────────────────────┘        │
│                                                                  │
│  ┌─ AI Service Routes ──────┐  ┌─ Monitoring Routes ─┐        │
│  │ • Chat Sessions          │  │ • Usage Metrics      │        │
│  │ • Voice Calls            │  │ • Reports            │        │
│  │ • Assistant Channels     │  │ • Analytics          │        │
│  │ • Prompt Configs         │  └──────────────────────┘        │
│  └──────────────────────────┘                                   │
└────┬───────────────────┬────────────────────────────┬──────────┘
     │                   │                            │
     │                   │                            │
     │          ┌────────▼──────────────────────────┐ │
     │          │  MongoDB (ai_platform)            │ │
     │          │  ┌──────────────────────────────┐ │ │
     │          │  │ Collections (All Services):  │ │ │
     │          │  │ • users (Node RW)            │ │ │
     │          │  │ • subscriptions (Node RW)    │ │ │
     │          │  │ • products (Node RW)         │ │ │
     │          │  │ • assistant_calls (Java RW)  │ │ │
     │          │  │ • chat_sessions (Java RW)    │ │ │
     │          │  │ • assistant_channels (Java R)│ │ │
     │          │  │ • prompts (Java R)           │ │ │
     │          │  │ • usage_events (Node RW)     │ │ │
     │          │  │ • transactions (Node RW)     │ │ │
     │          │  │ • + 6 more collections       │ │ │
     │          │  └──────────────────────────────┘ │ │
     │          └────┬──────────────────────────┬──┘ │
     │               │                          │    │
     ├───────────────┼──────────────────────────┼────┤
     │               │                          │    │
     ▼               │                          │    ▼
  gRPC              │                          │
   │                │                          │
   │                ▼                          ▼
   │          
   │   Java Services (Direct MongoDB Access via Drivers)
   │
   ├─ Java VA Service (Port 8136) ─────────────────┐
   │   (Spring Boot + gRPC + LLM Integration)       │
   │                                                │
   │   ┌─ Voice Processing ────────────────────┐   │
   │   │ • Audio Stream Handling               │   │
   │   │ • STT (Speech-to-Text)               │   │
   │   │ • TTS (Text-to-Speech)               │   │
   │   │ • Session Management                 │   │
   │   └──────────────────────────────────────┘   │
   │                                                │
   │   ┌─ Chat Processing ─────────────────────┐   │
   │   │ • Dialog Management                   │   │
   │   │ • LLM Integration                     │   │
   │   │ • Context/Memory Management          │   │
   │   │ • Transcript Generation               │   │
   │   │ Reads: prompts, assistant_channels   │   │
   │   │ Writes: assistant_calls, chat_sessions│  │
   │   └──────────────────────────────────────┘   │
   │                                                │
   ├─ Java IDP Service (Port 8137) ──────────────┘
   │   (Spring Boot + Document Processing)
   │
   └─ Java CV Service (Port 8138)
       (Spring Boot + Computer Vision)
```

---

## MongoDB Shared Database Architecture

**Critical Design Pattern:** MongoDB serves as the **central data store for BOTH Node.js backend and Java microservices**.

### Why MongoDB is Shared

The architecture uses MongoDB as a shared database rather than having each service maintain its own data because:

1. **Real-time Data Coordination**: Java VA Service writes `assistant_calls` and `chat_sessions` records that Node.js backend immediately reads for API responses and analytics
2. **Single Source of Truth**: User data, subscriptions, configurations are maintained in one place and accessed by all services
3. **Simplified Data Sync**: Eliminates complexity of eventual consistency and cross-service synchronization
4. **Audit Trail**: All service interactions create database records accessible for debugging and monitoring

### Collection Access Patterns

| Collection | Node.js Backend | Java VA Service | Purpose |
|---|---|---|---|
| `users` | RW | R | User profiles, authentication |
| `subscriptions` | RW | R | Subscription tiers, feature access |
| `products` | RW | R | Product definitions, pricing |
| `assistant_calls` | R | W | Voice call logs, metrics |
| `chat_sessions` | RW | W | Chat session state, transcripts |
| `assistant_channels` | RW | R | Channel configs, LLM settings |
| `prompts` | RW | R | System prompts, instructions |
| `usage_events` | W | - | API usage tracking |
| `transactions` | RW | - | Payment records |
| `verification_tokens` | RW | - | Email verification |
| `product_configurations` | RW | - | Tenant-specific settings |
| `payment_methods` | RW | - | Stored payment details |
| `chat_history` | RW | - | Chat message history |
| `api_keys` | RW | - | API key management |
| `audit_logs` | W | - | System event logging |

### Java Service Database Access

Java services connect to MongoDB directly via MongoDB Java Drivers:

```
Java VA Service
├─ Queries assistant_calls collection for session lookup
├─ Writes new call records after processing
├─ Reads prompts for LLM configuration
├─ Reads assistant_channels for channel-specific settings
├─ Updates chat_sessions with transcript data
└─ All queries include tenantId filter for data isolation

Java IDP Service
├─ Similar pattern for document processing workflows

Java CV Service
├─ Similar pattern for computer vision tasks
```

### Data Isolation with Tenant ID

All collections include a `tenantId` field as the primary isolation mechanism:

```javascript
// Example: Java VA Service writing assistant_call
{
  _id: ObjectId("..."),
  tenantId: "tenant-123",              // Critical for isolation
  assistantChannelId: "channel-456",
  userId: "user-789",
  transcript: "...",
  startTime: ISODate("2024-01-15T10:30:00Z"),
  duration: 3600,
  metadata: { ... }
}

// Backend query includes tenantId automatically
db.assistant_calls.find({ tenantId: "tenant-123" })
```

This ensures:
- Multi-tenancy is enforced at the database level
- Java services cannot access data from other tenants even if they receive malicious requests
- All data remains properly isolated across the entire platform

---

## Component Interaction Flows

### 1. User Authentication Flow

**Reference:** `docs/PROJECT_OVERVIEW.md`

```
User                          Frontend                Backend              Google OAuth
│                             │                       │                    │
├─ Click "Sign in with Google"─>                     │                    │
│                             │                       │                    │
│                             ├─ POST /api/auth/google─>                 │
│                             │                       │                    │
│                             │                       ├─ Redirect to OAuth ─>
│                             │                       │    Consent Screen   │
│                             │                       │                    │
│                             │                       │<─ Auth Code ────────┤
│                             │                       │                    │
│                             │                       ├─ Token Exchange    │
│                             │<─ JWT + Session ──────┤                    │
│                             │                       │                    │
│                             ├─ Set HTTP-only Cookie │                    │
│                             │                       │                    │
└─ Redirected to Dashboard ──┘                       │                    │
```

**Key Components:**
- **Frontend:** `src/pages/Login.tsx` - Initiates OAuth
- **Backend:** `src/routes/auth.ts` - Passport.js OAuth handler
- **Config:** `src/config/passport.ts` - Google OAuth strategy
- **Middleware:** `src/middleware/auth.ts` - JWT validation
- **Shared Types:** `shared/types.ts` - User interface

**Example Request:**
```bash
# Frontend initiates OAuth
GET /api/auth/google?tenantId=ten-splendor-florida-33064

# Backend redirects to Google
Google OAuth Consent Screen
User authorizes application

# Backend receives callback
GET /api/auth/google/callback?code=AUTH_CODE

# Backend returns
HTTP/1.1 200 OK
Set-Cookie: connect.sid=SESSION_ID; HttpOnly; Secure
{
  "authenticated": true,
  "user": {
    "id": "user123",
    "email": "user@example.com",
    "role": "PROJECT_ADMIN",
    "tenantId": "ten-splendor-florida-33064"
  }
}
```

---

### 2. Product Subscription Flow

**Reference:** `docs/PAYMENT_SYSTEM.md`, `docs/PRODUCT_BASED_ACCESS_CONTROL.md`

```
User                    Frontend                  Backend             Java Service
│                       │                         │                   │
│ Browse Products       │                         │                   │
├──────────────────────>│                         │                   │
│                       ├─ GET /api/products ────>│                   │
│                       │                         ├─ Query MongoDB    │
│                       │<─ Product List ────────┤                   │
│                       │                         │                   │
│ Select Product        │                         │                   │
├──────────────────────>│                         │                   │
│                       ├─ Add to Cart            │                   │
│ Choose Plan           │                         │                   │
├──────────────────────>│                         │                   │
│                       ├─ POST /api/subscriptions─>                 │
│                       │   (with paymentMethodId) │                   │
│                       │                         │                   │
│ Complete Payment      │                         ├─ Create in Stripe │
├──────────────────────>│                         │                   │
│                       │                         ├─ Save Subscription│
│                       │                         │                   │
│                       │<─ Success Response ────┤                   │
│                       │                         │                   │
│ Redirected to Config  │                         │                   │
├──────────────────────>│                         │                   │
│                       ├─ GET /api/subscriptions ─>                │
│                       │   /product/:productId   │                   │
│                       │                         ├─ Load config      │
│                       │                         │<─ Subscription + Config
│                       │                         │                   │
│ Configure AI Service  │                         │                   │
├──────────────────────>│                         │                   │
│                       ├─ POST /api/product-configurations─>        │
│                       │   (with AI settings)    │                   │
│                       │                         ├─ Save to DB      │
│                       │                         ├─ Notify VA       ─>
│                       │<─ Saved ───────────────┤                   │
│                       │                         │                   │
│ Ready to Use Service  │                         │                   │
└─ Access Active ──────>│                         │                   │
```

**Key Collections:**
```typescript
// MongoDB Collections
db.subscriptions                  // Product subscriptions
db.product_subscriptions         // Extended subscription data
db.products                       // Product catalog
db.product_configurations        // User-specific configs
db.payment_methods              // Payment info
db.transactions                 // Billing history
```

**Example Configuration:**
```typescript
// POST /api/product-configurations
{
  "productId": "672f8c5e9d7a8b0c1d2e3f4g",
  "configuration": {
    "voice": {
      "promptTemplateId": "template123",
      "language": "en-US",
      "voiceId": "en-US-Neural2-A",
      "businessHours": {
        "timezone": "America/New_York",
        "monday": { "open": "09:00", "close": "17:00" }
      }
    },
    "chat": {
      "greeting": "Hello! How can I help?",
      "maxTurns": 20,
      "showIntent": false
    }
  }
}
```

---

### 3. Virtual Assistant Voice Flow

**Reference:** `docs/CHANNELS_ARCHITECTURE_DIAGRAM.md`, `docs/WEBSOCKET_CONFIGURATION.md`

```
Caller                   Twilio Webhook         Node.js Backend          Java VA Service
│                        │                       │                        │
├─ Call AI Service ─────>│                       │                        │
│                        │                       │                        │
│                        ├─ POST /voice/incoming ┤                        │
│                        │                       │                        │
│                        │                       ├─ Lookup Channel Config │
│                        │                       │  by Phone Number       │
│                        │                       │                        │
│                        │                       ├─ Create Session ──────>│
│                        │                       │  via gRPC              │
│                        │                       │                        │
│                        │                       │<─ Session ID + Greeting
│                        │<─ TwiML Response ────┤                        │
│                        │  (audio greeting)    │                        │
│                        │                       │                        │
├─ Speak Request ───────>│                       │                        │
│                        │                       │                        │
│                        ├─ POST /voice/stream ──┤                        │
│                        │  (audio chunk)        │                        │
│                        │                       ├─ STT + LLM ──────────>│
│                        │                       │   Processing          │
│                        │                       │                        │
│                        │                       │<─ LLM Response ───────┤
│                        │                       │   (text)              │
│                        │                       │                        │
│                        │                       ├─ TTS Generation       │
│                        │                       │                        │
│                        │<─ TTS Audio ─────────┤                        │
│                        │                       │                        │
├─ Hear Response ───────┤                       │                        │
│                        │                       │                        │
└─ Hang Up ────────────>│                       │                        │
│                        ├─ POST /voice/end ────>│                        │
│                        │                       ├─ End Session ────────>│
│                        │                       │  Save Transcript      │
│                        │                       │                        │
│                        │                       │<─ Session Summary ────┤
│                        │<─ Success ───────────┤                        │
```

**Key Routes:**
```typescript
// backend-node/src/routes/voice-routes.ts

// POST /voice/incoming
// Twilio webhook for incoming calls
// Returns TwiML instructions

// POST /voice/stream
// Audio stream chunks during active call
// Processes STT → LLM → TTS

// POST /voice/end
// Marks call as ended
// Saves metrics and transcript
```

**Example Request/Response:**
```bash
# Incoming Call
POST /voice/incoming
Content-Type: application/x-www-form-urlencoded

To=+1234567890&From=+9876543210&CallSid=CA123

# Response
<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Gather numDigits="1" action="/voice/stream">
    <Say voice="alice">
      Hello! Welcome to our AI assistant. Press 1 to continue.
    </Say>
  </Gather>
</Response>

# Audio Stream
POST /voice/stream
{
  "callId": "call_123",
  "audioChunk": "BASE64_ENCODED_AUDIO"
}

# Response
{
  "ttsAudio": "BASE64_ENCODED_RESPONSE"
}

# End Call
POST /voice/end
{
  "callId": "call_123",
  "durationSeconds": 120,
  "endedBy": "caller"
}
```

---

### 4. Chat Session Flow

**Reference:** `docs/CHAT_SESSION_MANAGEMENT.md`, `docs/WEBSOCKET_IMPLEMENTATION.md`

```
User (Browser)          Frontend + Socket.IO      Backend              Java VA Service
│                       │                         │                    │
│ Click "Start Chat"    │                         │                    │
├──────────────────────>│                         │                    │
│                       ├─ Socket.IO Connect ──>│                    │
│                       │                        │                    │
│                       │                        ├─ Socket.IO Setup ──>│
│                       │                        │                    │
│                       │<─ Connected ──────────┤                    │
│                       │                        │                    │
│ Type Message          │                        │                    │
├──────────────────────>│ socket.emit('message')│                    │
│                       │                        │                    │
│                       ├─ POST /chat/message ──>│                    │
│                       │   (tenantId, sessionId,│                    │
│                       │    userMessage)        │                    │
│                       │                        │                    │
│                       │                        ├─ Query Config ────>│
│                       │                        │  by productId      │
│                       │                        │                    │
│                       │                        ├─ Send to VA ──────>│
│                       │                        │  via gRPC          │
│                       │                        │  (LLM processing)  │
│                       │                        │                    │
│                       │                        │<─ AI Response ─────┤
│                       │                        │                    │
│                       │ socket.emit('message')│                    │
│                       │  (assistantMessage)   │                    │
│                       │<─ Response Stream ───┤                    │
│                       │  (via Socket.IO)      │                    │
│                       │                        │                    │
│ See AI Response       │                        │                    │
├ (streaming) ────────┤                         │                    │
│                       │                        │                    │
│ End Chat              │                        │                    │
├──────────────────────>│ socket.emit('end')    │                    │
│                       │                        │                    │
│                       ├─ POST /chat/end ─────>│                    │
│                       │                        ├─ Close Session ───>│
│                       │                        │  Save Transcript   │
│                       │                        │                    │
│                       │<─ Session Saved ──────┤                    │
│                       │<─ Disconnect ─────────┤                    │
```

**Key Data Models:**
```typescript
// Chat Session
{
  _id: ObjectId,
  tenantId: string,
  productId: string,
  userId: string,
  status: 'active' | 'ended',
  startTime: Date,
  endTime?: Date,
  durationSeconds?: number,
  messages: [
    {
      role: 'user' | 'assistant',
      content: string,
      timestamp: Date,
      metadata?: {}
    }
  ],
  usage?: {
    llmTokensIn: number,
    llmTokensOut: number,
    totalCost: number
  }
}

// Chat Message
{
  _id: ObjectId,
  sessionId: string,
  tenantId: string,
  userId: string,
  role: 'user' | 'assistant',
  content: string,
  timestamp: Date
}
```

---

### 5. Tenant Data Isolation Flow

**Reference:** `docs/TENANT_ACCESS_CONTROL.md`

```
User Request                    Middleware                  Database Query
│                               │                           │
├─ HTTP Request + JWT Token ──>│                           │
│  (GET /api/transactions)      │                           │
│                               ├─ Verify JWT              │
│                               │  Extract tenantId        │
│                               │  Extract role            │
│                               │                           │
│                      ┌────────┴─ Check Role ────────┐    │
│                      │                              │    │
│              Is PROJECT_ADMIN?                      │    │
│                 Yes   │ No                          │    │
│                       │                              │    │
│                       ├─ req.tenantId = 'ALL'       │    │
│                       │                          req.tenantId = user.tenantId
│                       │                              │    │
│                       ├─ Query MongoDB ────────────>│
│                       │  filter: {}                  ├─ All data
│                       │  (OR)                        │
│                       │  filter: {tenantId: 'XXX'}   ├─ Only tenant data
│                       │                              │
│                       │<─ Filtered Results ────────┤
│                       │                              │
│<─ JSON Response ───┤                           │
```

**Authorization Middleware:**
```typescript
// backend-node/src/middleware/rbac.ts

export const requireProjectAdmin = (req, res, next) => {
  const user = req.user;
  if (user.role !== UserRole.PROJECT_ADMIN) {
    return res.status(403).json({ error: 'Access denied' });
  }
  req.tenantId = 'ALL';
  next();
};

export const requireTenantOrAdmin = (req, res, next) => {
  const user = req.user;
  req.tenantId = user.tenantId;
  
  if (user.role === UserRole.PROJECT_ADMIN) {
    req.tenantId = 'ALL'; // Cross-tenant access
  }
  next();
};
```

---

## Data Flow Examples

### Example 1: User Subscribes to Virtual Assistant Product

**Step-by-step:**

1. **Frontend** (React)
   - User navigates to `/products`
   - Clicks on "Voice Assistant" product
   - Clicks "Subscribe Now"

2. **Backend Query** (Node.js)
   - `GET /api/products` → Returns product catalog
   - `GET /api/payment-methods` → Gets user's payment methods
   - `POST /api/subscriptions` → Creates subscription

3. **Database Writes** (MongoDB)
   - Insert into `subscriptions` collection
   - Update `users` collection (usage tracking)
   - Record in `transactions` collection

4. **Java Service Notification** (Optional)
   - VA Service receives notification of new subscription
   - Pre-loads voice models and configurations

5. **Frontend Updates**
   - Redirects to `/products/:productId/configure`
   - User configures voice assistant settings
   - `POST /api/product-configurations` saves config

---

### Example 2: Incoming Phone Call to Voice Assistant

**Step-by-step:**

1. **Caller** dials AI Service phone number
2. **Twilio** (Telephony Provider)
   - Receives incoming call
   - Sends webhook to `POST /voice/incoming`

3. **Node.js Backend**
   - Looks up phone number in `assistant_channels`
   - Retrieves tenantId, productId, config
   - Creates call session in `assistant_calls`
   - Initiates gRPC call to Java VA Service

4. **Java VA Service**
   - Creates voice session
   - Loads LLM model based on product config
   - Returns greeting message

5. **Caller** hears greeting
6. **Caller** speaks message
7. **Twilio** streams audio to `POST /voice/stream`

8. **Java VA Service**
   - STT: Converts speech to text
   - LLM: Processes with language model
   - TTS: Converts response to speech
   - Returns audio stream

9. **Node.js Backend**
   - Streams audio back to Twilio
   - Records usage metrics (STT seconds, TTS characters)

10. **Caller** hears response
11. **Conversation continues** (loop from step 6)

12. **Caller** hangs up
13. **Twilio** sends `POST /voice/end`

14. **Java VA Service**
    - Ends session
    - Generates transcript
    - Calculates costs

15. **Node.js Backend**
    - Saves call record to `assistant_calls`
    - Updates usage in `usage_events`
    - Updates subscription usage for billing

---

### Example 3: PROJECT_ADMIN Views All Tenants

**Step-by-step:**

1. **User** (PROJECT_ADMIN role) logs in
2. **Frontend** SettingsDropdown appears (PROJECT_ADMIN only)
3. **User** clicks "Tenants"
4. **Frontend** → `GET /api/tenants`

5. **Backend Middleware**
   - Verifies JWT token
   - Checks user role (PROJECT_ADMIN ✓)
   - Sets `req.tenantId = 'ALL'`

6. **Backend Route Handler**
   ```typescript
   router.get('/', requireProjectAdmin, (req, res) => {
     // req.tenantId = 'ALL'
     // Can query all tenants
     const tenants = db.tenants.find({}).toArray();
     return res.json({ success: true, tenants });
   });
   ```

7. **Frontend** displays list of all tenants with users
8. **User** can click on tenant to see associated users

---

### Example 4: Regular User (Non-PROJECT_ADMIN) Views Transactions

**Step-by-step:**

1. **User** (CLIENT role) logs in
   - tenantId: "ten-user-12345"

2. **Frontend** → `GET /api/transactions`

3. **Backend Middleware**
   - Verifies JWT token
   - Checks user role (CLIENT, not PROJECT_ADMIN)
   - Sets `req.tenantId = "ten-user-12345"` (user's own tenant)

4. **Backend Route Handler**
   ```typescript
   router.get('/', async (req, res) => {
     // req.tenantId = "ten-user-12345"
     const transactions = db.transactions.find({
       tenantId: req.tenantId
     }).toArray();
     
     // Only this user's tenant's transactions returned
     return res.json({ success: true, transactions });
   });
   ```

5. **Frontend** displays only transactions from user's tenant

---

## Integration Points Reference

### Frontend ↔ Backend
- **HTTP API:** REST endpoints in `/api/*` routes
- **WebSocket:** Socket.IO for real-time chat and streaming
- **Authentication:** JWT tokens in HTTP-only cookies
- **Documentation:** OpenAPI spec at `openapi.yaml`

### Backend ↔ MongoDB
- **Collections:** 15+ collections for data persistence
- **Reference:** `docs/mongo.md`, `docs/MONGODB_CHANGES_SUMMARY.md`, `docs/COMPONENT_INTEGRATION_GUIDE.md#mongodb-shared-database-architecture`
- **Shared Access:** MongoDB accessed by both Node.js backend and Java services
- **Indexes:** Created via seed scripts in `backend-node/scripts/`

### Backend ↔ Java Services
- **Protocol:** gRPC for high-performance communication
- **Methods:** 
  - `StartChatSession(customerId, productId)`
  - `SendMessage(sessionId, message)`
  - `StartVoiceSession(customerId, productId)`
  - `ProcessAudioStream(sessionId, audioChunk)`
- **Reference:** `docs/GRPC_IMPLEMENTATION.md`

### Frontend ↔ Google OAuth
- **Flow:** OAuth 2.0 Authorization Code Flow
- **Redirect URL:** `/api/auth/google/callback`
- **Reference:** `src/config/passport.ts`

### Access Control & Multi-Tenancy
- **Role-Based Access Control:** 5 roles (USER, TENANT_USER, TENANT_ADMIN, PROJECT_ADMIN, SUPER_ADMIN)
- **Tenant Isolation:** All queries filtered by tenantId at middleware level
- **Reference:** `docs/TENANT_ACCESS_CONTROL.md`, `docs/CUSTOMER_TO_TENANT_MIGRATION.md`

---

## Component Dependencies

```
frontend/
├── pages/
│   ├── Login.tsx              → AuthContext, axios
│   ├── Dashboard.tsx          → useAuth, useNavigate
│   ├── Products.tsx           → API: /api/products
│   ├── ProductConfiguration.tsx → API: /api/product-configurations
│   ├── Chat.tsx               → Socket.IO, useAuth
│   ├── CallLogs.tsx           → API: /api/assistant-calls
│   ├── Transactions.tsx       → API: /api/transactions
│   ├── Subscriptions.tsx      → API: /api/subscriptions
│   ├── Users.tsx              → API: /api/tenants/users
│   ├── Tenants.tsx            → API: /api/tenants (PROJECT_ADMIN only)
│   └── Reports.tsx            → (PROJECT_ADMIN only)
│
├── components/
│   ├── Layout.tsx             → Sidebar, SettingsDropdown
│   ├── SettingsDropdown.tsx   → hasRole(PROJECT_ADMIN)
│   └── ProtectedRoute.tsx     → useAuth

backend-node/
├── routes/
│   ├── auth.ts                → Passport, Google OAuth
│   ├── products-routes.ts     → GET /api/products
│   ├── subscription-routes.ts → Subscriptions CRUD
│   ├── product-configuration-routes.ts → Configurations
│   ├── chat-routes.ts         → Chat sessions
│   ├── voice-routes.ts        → Voice calls (Twilio)
│   ├── transactions-routes.ts → Transactions
│   ├── tenant-routes.ts       → Tenant management
│   ├── usage-routes.ts        → Usage metrics
│   └── payment-routes.ts      → Payment methods
│
├── middleware/
│   ├── auth.ts                → JWT validation
│   ├── rbac.ts                → Role-based access control
│   └── authorization.ts       → Subscription validation
│
└── config/
    ├── passport.ts            → Google OAuth strategy
    ├── database.ts            → MongoDB connection
    └── socket.io.ts           → WebSocket configuration
```

---

## Real-World Use Case: HR Department Configures Voice Assistant

### Scenario
An HR department subscribes to a Virtual Assistant to handle employee inquiries about benefits, leave, and policies.

### Flow

**Week 1: Purchase & Initial Setup**
1. HR Manager logs in → `POST /api/auth/google`
2. Creates account in tenant "hr-corp-employee-services"
3. Navigates to Products page → `GET /api/products`
4. Selects "Voice Assistant" product
5. Chooses "Professional" plan → `POST /api/subscriptions`
6. Pays via Stripe (backend processes via payment-routes.ts)
7. Subscription created in MongoDB

**Week 2: Configuration**
1. HR Admin navigates to `/products/productId/configure`
2. Sets up Voice Assistant
   - Greeting: "Welcome to HR Assistant. Please state your question."
   - Language: English (US)
   - Voice: Professional female voice
   - Business hours: 8 AM - 6 PM EST
3. Saves configuration → `POST /api/product-configurations`

**Week 3: Prompt Setup**
1. HR Admin navigates to Prompt Configuration page
2. Creates custom prompt with:
   - Context: Company policies (HR documents)
   - System message: Role instructions
   - Fine-tuning examples: Common Q&A
3. Saves → `POST /api/prompts`
4. Assigns to Voice Assistant channel

**Week 4: Employee Uses Service**
1. Employee dials the HR Assistant phone number
2. Twilio sends webhook → `POST /voice/incoming`
3. Backend looks up phone in assistant_channels collection
4. gRPC call to Java VA Service
5. Greeting played to employee
6. Employee asks: "What's my vacation balance?"
7. Audio streamed → `POST /voice/stream`
8. Java VA Service processes:
   - STT: Converts speech to text
   - LLM + RAG: Queries HR context docs
   - Response generated
   - TTS: Converts to speech
9. Employee hears answer
10. Call ends → `POST /voice/end`
11. Call recorded in assistant_calls
12. Usage metrics calculated and saved

**Week 5+: Monitoring**
1. HR Admin views `/call-logs` to see all interactions
2. Checks `/reports` for usage analytics
3. Views `/transactions` for billing
4. Logs data to external systems via API

---

## Key Files Reference

| File | Purpose |
|------|---------|
| `shared/types.ts` | Shared TypeScript types (User, UserRole, etc.) |
| `frontend/src/context/AuthContext.tsx` | Authentication state management |
| `backend-node/src/middleware/rbac.ts` | Role-based access control |
| `backend-node/src/middleware/auth.ts` | JWT validation middleware |
| `backend-node/openapi.yaml` | API documentation (52 endpoints) |
| `docs/PROJECT_OVERVIEW.md` | Architecture overview |
| `docs/CHANNELS_ARCHITECTURE_DIAGRAM.md` | Voice & Chat flow diagrams |
| `docs/PAYMENT_SYSTEM.md` | Payment & subscription details |
| `docs/TENANT_ACCESS_CONTROL.md` | Multi-tenant isolation |
| `docs/GRPC_IMPLEMENTATION.md` | Java microservice communication |

---

## Performance Considerations

### Database Query Patterns
- **Tenant Filtering:** All queries include `tenantId` filter for security and performance
- **Indexes:** Created on `tenantId`, `userId`, `productId`, `status`
- **Pagination:** Implemented via `limit` and `offset` parameters

### API Response Times
- **Product List:** 50-100ms (cached in frontend)
- **Subscription Creation:** 200-500ms (Stripe integration)
- **Chat Message:** 100-1000ms (LLM processing in Java service)
- **Voice Processing:** Real-time (gRPC streaming)

### Scalability
- **Horizontal:** Node.js stateless backend (Socket.IO using Redis adapter for scaling)
- **Vertical:** Java services can be load-balanced
- **Database:** MongoDB with tenant-based sharding strategy

---

## Troubleshooting Common Issues

### Issue: User can't see tenants page
**Solution:** Check user role is PROJECT_ADMIN
```javascript
// Set user role in MongoDB
db.users.updateOne(
  { email: 'user@example.com' },
  { $set: { role: 'PROJECT_ADMIN' } }
);
```

### Issue: Chat not connecting
**Solution:** Check Socket.IO configuration
```bash
# Verify backend Socket.IO is running
# Check CORS settings in backend-node/src/index.ts
# Ensure frontend connects to correct backend URL
```

### Issue: Voice call fails
**Solution:** Check Twilio webhook
```bash
# Verify phone number configured in assistant_channels
# Check webhook URL in Twilio console
# Monitor backend logs for gRPC errors
```

### Issue: Tenant data leakage
**Solution:** Verify tenantId filtering in queries
```bash
# Check all routes filter by tenantId
# Verify middleware correctly sets req.tenantId
# Test with different tenant users
```

---

## Development Workflow

### Starting the Platform

```bash
# Terminal 1: Start MongoDB
mongod

# Terminal 2: Start Backend
cd backend-node
npm install
npm run dev

# Terminal 3: Start Frontend
cd frontend
npm install
npm run dev

# Terminal 4: Start Java VA Service
cd services-java/va-service
./mvnw spring-boot:run
```

### Adding a New Feature

1. **Define Types** in `shared/types.ts`
2. **Create Backend Route** in `backend-node/src/routes/`
3. **Add Middleware** for auth/authorization if needed
4. **Create Frontend Component** in `frontend/src/pages/` or `components/`
5. **Update OpenAPI** spec in `openapi.yaml`
6. **Add Documentation** reference in `docs/`

### Testing Workflows

```bash
# Test Backend
cd backend-node
npm run dev

# Open API Docs
http://localhost:5000/api-docs

# Test Frontend
http://localhost:5173

# Test OAuth (Google account required)
# Click "Sign in with Google"

# Test Chat
# Navigate to Chat page after login
# Start conversation

# Test Voice (Twilio account required)
# Configure phone number in assistant_channels
# Dial configured number
```

---

This integration guide provides a complete view of how components interact. For specific implementation details, refer to the linked documentation files in the `docs/` directory.
