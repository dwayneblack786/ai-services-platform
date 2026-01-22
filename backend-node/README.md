# Server - Node.js Middleware

Node.js Express TypeScript middleware server that handles authentication, manages API requests to Java microservices with circuit breaker protection, and provides resilient service communication.

📑 **Table of Contents**
- [Features](#features)
- [Structure](#structure)
- [Installation](#installation)
- [Environment Variables](#environment-variables)
  - [Environment Configuration Guide](docs/ENVIRONMENT.md) 📖
- [Running](#running)
  - [Development Mode](#development-mode)
  - [Production Mode](#production-mode)
- [Deployment](#deployment)
  - [Graceful Shutdown & Zero-Downtime Deployment Guide](../docs/DEPLOYMENT_GRACEFUL_SHUTDOWN.md) 🚀
- [API Routes](#api-routes)
  - [Authentication](#authentication-apiauth)
  - [User](#user-apiuser)
  - [Infero Proxy](#infero-proxy-apibackend)
  - [Health Check](#health-check)
- [Development Features](#development-features)
  - [Dev Login](#dev-login)
  - [Infero API Client](#infero-api-client)
- [Security](#security)
- [Dependencies](#dependencies)
- [Circuit Breaker Pattern](#circuit-breaker-pattern)

---

## Features

- **Environment Validation** - Type-safe, validated configuration with startup checks ([Configuration Guide](docs/ENVIRONMENT.md))
- **Graceful Shutdown** - Zero-downtime deployments with WebSocket notification and connection draining ([Deployment Guide](../docs/DEPLOYMENT_GRACEFUL_SHUTDOWN.md))
- **Circuit Breaker Pattern** - Automatic failure detection and recovery for Java microservice calls ([Implementation Guide](CIRCUIT_BREAKER_IMPLEMENTATION.md))
- **Resilient API Client** - Exponential backoff retry logic with fallback responses
- Google OAuth2 authentication with Passport.js
- Development login bypass for local development
- JWT token-based session management
- API proxy layer to Java microservices with fault tolerance
- CORS configuration
- TypeScript support with strict type safety
- Comprehensive API documentation (Swagger/OpenAPI)

## Structure

```
backend-node/
├── src/
│   ├── config/
│   │   ├── env.ts             # Environment validation & type-safe access ⭐ NEW
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

> 📖 **[Complete Environment Configuration Guide](docs/ENVIRONMENT.md)** - Detailed documentation of all 30+ environment variables, validation, and security best practices.

The application uses a comprehensive **environment validation system** that:
- ✅ Validates all required variables on startup
- ✅ Provides type-safe access (no more `process.env.VAR || 'default'`)
- ✅ Validates formats (URLs, secrets, MongoDB URIs)
- ✅ Warns about insecure settings in production
- ✅ Fails fast with clear error messages

### Quick Start

1. Copy the example environment file:
   ```bash
   cp .env.example .env
   ```

2. Update required variables in `.env`:

```env
# Database & Cache
MONGODB_URI=mongodb://localhost:27017/ai_platform
REDIS_URL=redis://localhost:6379

# Authentication (minimum 32 characters each)
SESSION_SECRET=your-session-secret-here-min-32-chars
JWT_SECRET=your-jwt-secret-here-min-32-chars

# Google OAuth
GOOGLE_CLIENT_ID=your-google-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-google-client-secret
GOOGLE_CALLBACK_URL=http://localhost:3001/api/auth/google/callback

# Frontend
FRONTEND_URL=http://localhost:5173
CORS_ORIGINS=http://localhost:5173,http://localhost:3000

# Server
NODE_ENV=development
PORT=3001
LOG_LEVEL=info
```

3. The application will validate all variables on startup and exit with clear error messages if any are missing or invalid.

### Validation Output

**Success:**
```
✅ Environment validation passed
   - Environment: development
   - Port: 3001
   - Database: mongodb://***:***@localhost:27017/ai_platform
   - Redis: redis://localhost:6379
   - Frontend: http://localhost:5173
   - Rate Limiting: Enabled
```

**Failure:**
```
❌ Environment validation failed:
   - Missing required environment variable: MONGODB_URI
   - SESSION_SECRET must be at least 32 characters long for security

Please check your .env file and ensure all required variables are set correctly.
```

See [.env.example](.env.example) for all available configuration options.

## Running

> 📦 **[View all available npm scripts](package.json#L5-L28)** - Complete list of build, test, seed, and utility commands

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

### Common Commands

```bash
# Development
npm run dev              # Start dev server with hot reload
npm run build            # Compile TypeScript to JavaScript
npm run build:clean      # Clean build from scratch
npm run start:prod       # Full production build and start

# Testing
npm run test             # Run all tests
npm run test:watch       # Run tests in watch mode
npm run test:coverage    # Generate coverage report
npm run test:all         # Run unit, integration, and e2e tests

# Database Seeding
npm run seed:products    # Seed product data
npm run seed:prompts:v2  # Seed prompt configurations
npm run seed:templates   # Seed email/notification templates
npm run seed:all         # Seed all data

# Code Quality
npm run lint             # Check code style
npm run lint:fix         # Auto-fix code style issues
npm run format           # Alias for lint:fix
npm run check            # Lint + test (quick check)
npm run validate         # Lint + build + test (full validation)
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

### Health Check (`/api/health`)
Comprehensive health monitoring endpoints:
- `GET /api/health` - Basic health check (returns 200 if server responding)
- `GET /api/health/detailed` - Detailed health status with all dependencies
  - MongoDB connection status
  - Redis connection status
  - Java VA service status
  - Circuit breaker states
  - Memory usage statistics
- `GET /api/health/liveness` - Kubernetes liveness probe
- `GET /api/health/readiness` - Kubernetes readiness probe

#### Health Check Response Example

**Basic (`/api/health`):**
```json
{
  "status": "ok",
  "message": "Server is running",
  "timestamp": "2026-01-16T10:30:00.000Z"
}
```

**Detailed (`/api/health/detailed`):**
```json
{
  "status": "healthy",
  "timestamp": "2026-01-16T10:30:00.000Z",
  "uptime": 3600,
  "services": {
    "mongodb": {
      "status": "up",
      "responseTime": 5,
      "message": "MongoDB is connected"
    },
    "redis": {
      "status": "up",
      "responseTime": 2,
      "message": "Redis is connected"
    },
    "javaVA": {
      "status": "up",
      "responseTime": 120,
      "message": "Java VA service is responding"
    },
    "circuitBreakers": {
      "status": "healthy",
      "circuits": {
        "JavaVAClient": {
          "state": "CLOSED",
          "failureCount": 0,
          "successCount": 150,
          "totalRequests": 150
        }
      }
    }
  },
  "system": {
    "memory": {
      "used": 145,
      "total": 512,
      "percentage": 28
    },
    "nodeVersion": "v20.10.0",
    "environment": "development"
  },
  "responseTime": "45ms"
}
```

**Health Status Codes:**
- `200 OK` - System is healthy or degraded but operational
- `503 Service Unavailable` - System is unhealthy (critical services down)

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
- Session secrets should be strong random strings (minimum 32 characters)
- OAuth credentials kept in environment variables
- **Environment validation** ensures secure configuration in production
- In production, set `NODE_ENV=production` and use HTTPS
- Secure cookies automatically enabled in production (`SESSION_COOKIE_SECURE=true`)

## TypeScript & Type Safety

The codebase uses **TypeScript strict mode** with comprehensive type safety improvements:

### Type-Safe Configuration
```typescript
import { env } from './config/env';

// Before: process.env.PORT || 3001
// After:  env.PORT  // typed as number

// Before: process.env.RATE_LIMIT_ENABLED !== 'false'
// After:  env.RATE_LIMIT_ENABLED  // typed as boolean
```

### Eliminated `any` Types
Replaced 30+ `any` type instances with proper TypeScript interfaces:

- **JWTPayload** - Type-safe JWT token structure ([src/types/jwt.types.ts](src/types/jwt.types.ts))
- **LogMetadata** - Structured logging metadata ([src/utils/logger.ts](src/utils/logger.ts))
- **Error Guards** - Type-safe error handling ([src/utils/error-guards.ts](src/utils/error-guards.ts))
- **Express Extensions** - Typed `req.user` property via module augmentation
- **API Client Generics** - Removed default `any` types, forcing explicit typing

### Code Quality
- **ESLint** configured with TypeScript rules
- Warns on `any` usage
- Enforces nullish coalescing over `||` operator
- Catches floating promises
- 79 passing tests with Jest

Run quality checks:
```bash
npm run lint          # Check for issues
npm run lint:fix      # Auto-fix what's possible
npm test              # Run test suite
npm run test:coverage # Check test coverage
```

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

## MongoDB Chat Messages Schema

Chat messages are stored in the `chat_messages` collection using a **session-based document model**. Each session has **one document** containing all messages in an array, ordered by timestamp.

### Schema Structure

```javascript
{
  _id: ObjectId,
  sessionId: String,          // Unique session identifier (UUID)
  customerId: String,         // Customer/tenant ID
  productId: String,          // Product ID (e.g., "va-service")
  messages: [                 // Array of messages ordered by timestamp
    {
      role: String,           // "user" | "assistant"
      content: String,        // Message text
      timestamp: Date,        // Message timestamp
      intent: String          // Detected intent (optional)
    }
  ],
  startedAt: Date,           // Session start time
  lastUpdatedAt: Date,       // Last message timestamp
  isActive: Boolean          // Session active status
}
```

### Key Features

- **Single document per session** - All messages grouped by `sessionId`
- **Atomic updates** - New messages appended using `$push` operator
- **Ordered messages** - Messages maintain insertion order
- **Efficient queries** - One read operation retrieves entire conversation history
- **Session lifecycle** - `startedAt`, `lastUpdatedAt`, `isActive` track session state

### Implementation

Messages are persisted by the Java VA service (`ChatSessionService.saveChatHistory`):

1. **First message**: Creates new document with message array
2. **Subsequent messages**: Appends to existing messages array using `$push`

```java
// Create new session document
Document newHistory = new Document()
    .append("sessionId", sessionId)
    .append("customerId", customerId)
    .append("productId", productId)
    .append("messages", Arrays.asList(messageDoc))
    .append("startedAt", new Date())
    .append("lastUpdatedAt", new Date())
    .append("isActive", true);

// Append to existing session
Document update = new Document("$push", new Document("messages", messageDoc))
    .append("$set", new Document("lastUpdatedAt", new Date()));
```

### Example Document

```json
{
  "_id": ObjectId("507f1f77bcf86cd799439011"),
  "sessionId": "a3d8c947-1234-5678-9abc-def012345678",
  "customerId": "customer-123",
  "productId": "va-service",
  "messages": [
    {
      "role": "user",
      "content": "What are your business hours?",
      "timestamp": ISODate("2024-01-15T10:30:00Z"),
      "intent": "hours_inquiry"
    },
    {
      "role": "assistant",
      "content": "We're open Monday-Friday 9AM-5PM EST.",
      "timestamp": ISODate("2024-01-15T10:30:02Z"),
      "intent": "hours_inquiry"
    }
  ],
  "startedAt": ISODate("2024-01-15T10:30:00Z"),
  "lastUpdatedAt": ISODate("2024-01-15T10:30:02Z"),
  "isActive": true
}
```

### Querying

```javascript
// Get all messages for a session
db.chat_messages.findOne({ sessionId: "session-id-here" })

// Get active sessions for a customer
db.chat_messages.find({ customerId: "customer-123", isActive: true })

// Get recent sessions
db.chat_messages.find().sort({ lastUpdatedAt: -1 }).limit(10)
```

## Circuit Breaker Pattern

The backend implements a circuit breaker pattern for resilient communication with Java microservices. This provides automatic failure detection, fast-fail responses, and graceful degradation.

**Key Benefits:**
- ✅ Prevents cascading failures
- ✅ Fast-fail responses (instant vs 30+ second timeouts)
- ✅ Automatic recovery after service restoration
- ✅ Graceful degradation with fallback messages

**Protected Services:**
- Chat routes (6 API calls)
- WebSocket handlers (3 API calls)
- Voice routes (1 API call)

For complete details, see **[Circuit Breaker Implementation Guide](CIRCUIT_BREAKER_IMPLEMENTATION.md)** and **[Redis Implementation Guide](../docs/REDIS_IMPLEMENTATION_GUIDE.md)**
