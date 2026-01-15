# Server - Node.js Middleware

Node.js Express TypeScript middleware server that handles authentication, manages API requests to Java microservices with circuit breaker protection, and provides resilient service communication.

## Features

- **Circuit Breaker Pattern** - Automatic failure detection and recovery for Java microservice calls
- **Resilient API Client** - Exponential backoff retry logic with fallback responses
- Google OAuth2 authentication with Passport.js
- Development login bypass for local development
- JWT token-based session management
- API proxy layer to Java microservices with fault tolerance
- CORS configuration
- TypeScript support
- Comprehensive API documentation (Swagger/OpenAPI)

## Structure

```
backend-node/
├── src/
│   ├── config/
│   │   ├── passport.ts        # Passport OAuth configuration
│   │   ├── database.ts        # MongoDB connection
│   │   └── socket.ts          # Socket.IO configuration
│   ├── middleware/
│   │   └── auth.ts            # JWT authentication middleware
│   ├── routes/
│   │   ├── auth-routes.ts     # Authentication routes
│   │   ├── user-routes.ts     # User routes
│   │   ├── chat-routes.ts     # Chat session routes (circuit breaker protected)
│   │   ├── voice-routes.ts    # Voice assistant routes (circuit breaker protected)
│   │   ├── product-routes.ts  # Product management routes
│   │   ├── subscription-routes.ts # Subscription management
│   │   ├── payment-routes.ts  # Payment methods routes
│   │   └── ...               # Additional route modules
│   ├── sockets/
│   │   └── chat-socket.ts     # WebSocket handlers (circuit breaker protected)
│   ├── services/
│   │   ├── circuitBreaker.ts  # Circuit breaker implementation ⭐ NEW
│   │   ├── apiClient.ts       # Centralized API client with retry logic ⭐ NEW
│   │   └── infero-api.ts      # Legacy Infero API client (deprecated)
│   ├── types/
│   │   └── api.types.ts       # API response types
│   └── index.ts               # Main server file
├── scripts/                   # Database utility scripts
├── .env                       # Environment variables
├── openapi.yaml               # OpenAPI 3.0.3 specification
├── package.json
└── tsconfig.json
```

## Installation

```bash
npm install
```

## Environment Variables

Create a `.env` file in the server directory:

```env
PORT=5000
GOOGLE_CLIENT_ID=your_google_client_id_here
GOOGLE_CLIENT_SECRET=your_google_client_secret_here
SESSION_SECRET=your_session_secret_here
JWT_SECRET=your_jwt_secret_here
CLIENT_URL=http://localhost:5173
NODE_ENV=development
```

## Running

### Development Mode

```bash
npm run dev
```

Starts the server with nodemon on port 5000.

### Production Mode

```bash
npm run build
npm start
```

## API Routes

### Authentication (`/api/auth`)
- `GET /api/auth/google` - Initiate Google OAuth
- `GET /api/auth/google/callback` - OAuth callback
- `POST /api/auth/dev-login` - Dev login (development only)
- `POST /api/auth/logout` - Logout
- `GET /api/auth/status` - Check auth status

### User (`/api/user`)
- `GET /api/user/me` - Get current user (protected)

### Infero Proxy (`/api/backend`)
All routes proxy to Infero API on port 8136:
- `/api/backend/home` - Home endpoint
- `/api/backend/users/*` - Users CRUD operations
- `/api/backend/customers/*` - Customers CRUD operations
- `/api/backend/billing/*` - Billing CRUD operations
- `/api/backend/products/*` - Products CRUD operations

### Health Check
- `GET /api/health` - Server health status

## Development Features

### Dev Login

When `NODE_ENV !== 'production'`, the `/api/auth/dev-login` endpoint is available:

```bash
curl -X POST http://localhost:5000/api/auth/dev-login
```

This creates a mock user without requiring Google OAuth setup.

### Infero API Client

The server uses Axios to communicate with the Java Infero API. All API calls go through the `infero-api.ts` service:

```typescript
import javaApi from '../services/infero-api';

// Example usage
const response = await javaApi.users.getUsers();
```

## Security

- JWT tokens stored in HTTP-only cookies
- CORS configured for specific origin
- Session secrets should be strong random strings
- OAuth credentials kept in environment variables
- In production, set `NODE_ENV=production` and use HTTPS

## Dependencies

- **express** - Web framework
- **passport** - Authentication middleware
- **passport-google-oauth20** - Google OAuth strategy
- **jsonwebtoken** - JWT token generation
- **express-session** - Session management
- **axios** - HTTP client for API calls
- **socket.io** - WebSocket support for real-time features
- **mongodb** - MongoDB driver for database operations
- **cookie-parser** - Cookie parsing
- **cors** - CORS middleware
- **dotenv** - Environment variables
- **typescript** - Type safety
- **ts-node** - TypeScript execution
- **nodemon** - Development auto-reload
- **swagger-ui-express** - API documentation UI
- **yaml** - OpenAPI spec parsing

---

## 🔄 Circuit Breaker Pattern (NEW)

The backend now implements a **Circuit Breaker Pattern** for all Java microservice communications, providing automatic failure detection, fast-fail responses, and graceful degradation.

### What Changed?

#### 🆕 New Services Created

**1. Circuit Breaker Service** (`src/services/circuitBreaker.ts`)
- Implements three-state circuit breaker (CLOSED, OPEN, HALF_OPEN)
- Tracks failure/success counts and request statistics
- Automatic timeout-based recovery (60 seconds)
- Manual reset capability
- Comprehensive logging of state transitions

**2. API Client Service** (`src/services/apiClient.ts`)
- Centralized HTTP client for all Java microservice calls
- Automatic exponential backoff retry (1s → 2s → 4s with jitter)
- Circuit breaker integration on every request
- Support for fallback responses
- Request/response logging
- Methods: GET, POST, PUT, PATCH, DELETE

**3. Java VA Client Instance** (`javaVAClient`)
- Pre-configured client for Virtual Assistant service
- Exported singleton for consistent usage
- Circuit breaker protection enabled by default

#### 🔄 Routes Migrated to Circuit Breaker

**1. Chat Routes** (`src/routes/chat-routes.ts`)
- ✅ 6 Java VA API calls migrated
- All chat operations protected:
  - Session initialization with resume support
  - Message processing with fallback responses
  - Session end handling
  - Chat history retrieval
- Fallback messages provide graceful degradation
- Circuit state included in error responses

**2. Chat WebSocket Handler** (`src/sockets/chat-socket.ts`)
- ✅ 3 Java VA API calls migrated
- Real-time chat protected:
  - Message streaming
  - Session end events
  - History fetching
- Circuit state emitted to clients
- Retry flags for client-side handling

**3. Voice Routes** (`src/routes/voice-routes.ts`)
- ✅ 1 Java VA API call migrated
- Voice processing protected:
  - TTS audio generation with fallback
  - Error responses include circuit state

### How It Works

```typescript
// Example: Making a protected API call
import { javaVAClient } from '../services/apiClient';

// Automatic circuit breaker + retry + fallback
const response = await javaVAClient.post(
  '/chat/message',
  { sessionId, message },
  { timeout: 30000 },
  () => ({
    // Fallback response if circuit is OPEN
    sessionId,
    message: 'Service temporarily unavailable. Please try again shortly.',
    intent: 'system_error',
    requiresAction: false
  })
);
```

### Circuit States

| State | Description | Behavior |
|-------|-------------|----------|
| **CLOSED** 🟢 | Normal operation | All requests proceed normally |
| **OPEN** 🔴 | Service failing | Requests fast-fail, fallback responses returned |
| **HALF_OPEN** 🟡 | Testing recovery | Limited requests allowed to test service health |

### Configuration

**Circuit Breaker Thresholds:**
- **Failure Threshold:** 5 consecutive failures → Circuit OPENS
- **Success Threshold:** 2 consecutive successes → Circuit CLOSES
- **Timeout:** 60 seconds before retry attempt
- **Retry Strategy:** Exponential backoff (1s → 2s → 4s) with jitter

**Request Configuration:**
- **Max Retry Attempts:** 3
- **Request Timeout:** 30 seconds (chat/voice), 10 seconds (default)
- **Retry Conditions:** Network errors and 5xx server errors only

### Benefits

✅ **Resilience**
- Prevents cascading failures when Java services are down
- System remains responsive during partial outages
- Automatic recovery without manual intervention

✅ **Performance**
- Fast-fail responses (instant vs 30+ second timeouts)
- Reduces resource exhaustion from hanging requests
- Circuit opens after 5 failures, not 50+

✅ **User Experience**
- Graceful degradation with fallback messages
- Users informed about service status
- No hanging requests or browser freezes

✅ **Observability**
- Detailed logging of circuit state changes
- Request statistics tracking (failures, successes, totals)
- Circuit state exposed in API responses

✅ **Maintainability**
- Centralized error handling
- Consistent retry logic across all endpoints
- Easy to add new protected endpoints

### Monitoring

Circuit breaker logs to console:
```
[CircuitBreaker:JavaVA] Initialized
[CircuitBreaker:JavaVA] Circuit OPENED until 10:30:45 PM
[CircuitBreaker:JavaVA] Circuit CLOSED
```

Request statistics available via:
```typescript
const stats = javaVAClient.getCircuitState();
// { state: 'CLOSED', failureCount: 0, successCount: 142, totalRequests: 142 }
```

### Migration Summary

| Component | Before | After |
|-----------|--------|-------|
| **chat-routes.ts** | Direct axios calls | Circuit breaker protected |
| **chat-socket.ts** | Direct axios calls | Circuit breaker protected |
| **voice-routes.ts** | Direct axios calls | Circuit breaker protected |
| **Retry Logic** | None | 3 attempts with backoff |
| **Timeout Handling** | 30s+ hang | Instant fast-fail |
| **Failure Recovery** | Manual restart | Automatic retry after 60s |
| **Fallback Responses** | Generic errors | User-friendly messages |

### Documentation

For detailed implementation and usage:
- 📖 [Circuit Breaker Implementation Guide](../docs/CIRCUIT_BREAKER_TASK_BREAKDOWN.md)
- 📖 [Circuit Breaker User Guide](../docs/CIRCUIT_BREAKER_USER_GUIDE.md)

---
