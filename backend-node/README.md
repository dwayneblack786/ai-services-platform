# Server - Node.js Middleware

Node.js Express TypeScript middleware server that handles authentication, manages API requests to Java microservices with circuit breaker protection, and provides resilient service communication.

📑 **Table of Contents**
- [Features](#features)
- [Structure](#structure)
- [Installation](#installation)
- [Environment Variables](#environment-variables)
- [Running](#running)
  - [Development Mode](#development-mode)
  - [Production Mode](#production-mode)
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

- **Circuit Breaker Pattern** - Automatic failure detection and recovery for Java microservice calls ([Implementation Guide](CIRCUIT_BREAKER_IMPLEMENTATION.md))
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

For complete details, see **[Circuit Breaker Implementation Guide](CIRCUIT_BREAKER_IMPLEMENTATION.md)**
