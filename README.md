# AI Services Platform

A full-stack AI services platform with React (TypeScript) frontend, Node.js Express (TypeScript) backend, and Java Spring Boot microservices featuring Google OAuth2 authentication, product configuration management, and AI service integration.

## Project Structure

```
.
├── frontend/               # React frontend (Vite + TypeScript)
│   ├── src/
│   │   ├── components/     # React components (Layout, Sidebar, SettingsDropdown, etc.)
│   │   ├── context/        # Auth context with role-based access control
│   │   ├── pages/          # Page components (Dashboard, Products, Tenants, etc.)
│   │   ├── styles/         # Emotion-styled component styles
│   │   ├── App.tsx
│   │   └── main.tsx
│   ├── package.json
│   └── vite.config.ts
├── backend-node/           # Node.js Express backend
│   ├── src/
│   │   ├── config/         # Passport OAuth2 configuration
│   │   ├── middleware/     # Authentication middleware
│   │   ├── routes/         # API routes (auth, products, billing, users, etc.)
│   │   ├── services/       # External API clients (Infero)
│   │   ├── types/          # TypeScript type definitions
│   │   └── index.ts        # Express app with Swagger UI integration
│   ├── scripts/            # Database setup and utility scripts
│   ├── openapi.yaml        # OpenAPI 3.0.3 API documentation
│   ├── package.json
│   └── tsconfig.json
├── services-java/          # Java Spring Boot microservices
│   ├── _common-libs/       # Shared libraries and utilities
│   ├── cv-service/         # Computer Vision AI service
│   ├── idp-service/        # Intelligent Document Processing service
│   └── va-service/         # Virtual Assistant service
├── shared/                 # Shared TypeScript types across frontend and backend
│   └── types.ts
└── docs/                   # Project documentation
    ├── PROJECT_OVERVIEW.md
    ├── RepositoryStructure.md
    └── Platform Architecture Diagram.ini
```

## Tech Stack

### Frontend
- React 18.2.0 with TypeScript 5.3.3
- Vite (build tool)
- React Router v6 (navigation)
- Emotion (CSS-in-JS styling)
- Axios (HTTP client)
- Context API for state management

### Backend (Node.js)
- Node.js with Express
- TypeScript 5.3.3
- Passport.js (Google OAuth2 strategy)
- express-session
- JWT (jsonwebtoken)
- MongoDB (product configurations, users, tenants)
- Swagger UI Express (API documentation)
- YAML.js (OpenAPI spec loading)

### Microservices (Java)
- Java 17
- Spring Boot 4.0.1
- Maven build system
- RESTful API architecture
- Generic API client (RestTemplate)

### Authentication & Authorization
- Google OAuth2
- JWT token-based sessions
- Role-based access control (RBAC)
  - USER
  - TENANT_USER
  - TENANT_ADMIN
  - PROJECT_ADMIN
  - SUPER_ADMIN

## Features

✅ **Authentication & Authorization**
- Google OAuth2 integration
- JWT token-based authentication
- HTTP-only cookie sessions
- Role-based access control (5 user roles)
- Development login bypass for testing

✅ **Product Management**
- Product-specific configuration pages
- Three AI service categories:
  - Virtual Assistant (Voice & Chat)
  - Intelligent Document Processing (IDP)
  - Computer Vision
- Prompt configuration with RAG support
- Template management with 7 industry-specific templates
- Unsaved changes tracking with confirmation dialogs

✅ **User Interface**
- Responsive design with mobile support
- Dynamic sidebar navigation
- Settings dropdown for admin users
- Role-based badge display
- Tenant ID management with copy functionality
- Protected routes with authentication checks

✅ **API Documentation**
- Swagger UI at `/api-docs`
- OpenAPI 3.0.3 specification
- Comprehensive endpoint documentation
- Request/response schemas
- Interactive API testing

✅ **Database**
- MongoDB integration
- Product configurations collection
- Unique indexes: (tenantId, productId, status)
- Tenant-based data isolation

✅ **Three-Tier Architecture**
```
React Frontend → Node.js Backend → Java Microservices
  Port 5173         Port 5000          Port 8136+
```

## Prerequisites

Before you begin, ensure you have installed:
- [Node.js](https://nodejs.org/) (v18 or higher)
- [npm](https://www.npmjs.com/) (comes with Node.js)
- [MongoDB](https://www.mongodb.com/try/download/community) (v6.0 or higher)
- [Java JDK](https://www.oracle.com/java/technologies/downloads/) (v17 or higher)
- [Maven](https://maven.apache.org/) (or use included Maven Wrapper)

## Google OAuth2 Setup

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Enable the Google+ API
4. Go to **Credentials** → **Create Credentials** → **OAuth 2.0 Client ID**
5. Configure the OAuth consent screen
6. Add authorized redirect URIs:
   - `http://localhost:5000/api/auth/google/callback`
7. Copy the **Client ID** and **Client Secret**

## Installation

### 1. Install Backend Dependencies

```bash
cd backend-node
npm install
```

### 2. Install Frontend Dependencies

```bash
cd frontend
npm install
```

### 3. Configure Environment Variables

#### Backend (.env)

Create a `.env` file in the `backend-node` directory:

```env
PORT=5000
GOOGLE_CLIENT_ID=your_google_client_id_here
GOOGLE_CLIENT_SECRET=your_google_client_secret_here
SESSION_SECRET=your_random_session_secret
JWT_SECRET=your_random_jwt_secret
CLIENT_URL=http://localhost:5173
NODE_ENV=development
MONGODB_URI=mongodb://localhost:27017/ai_platform

# Infero API Configuration
INFERO_API_BASE_URL=http://localhost:8136
INFERO_API_KEY=your_api_key_here
```

#### Frontend (.env)

Create a `.env` file in the `frontend` directory:

```env
VITE_API_URL=http://localhost:5000
```

### 4. Setup MongoDB

#### Create Database and Indexes

```bash
cd backend-node

# Create product configuration indexes
node scripts/create-product-config-indexes.js

# Verify setup
node scripts/verify-product-config-setup.js
```

## Running the Application

You need to run all services:

#### 1. Start MongoDB

```bash
# On Windows (if installed as a service)
net start MongoDB

# Or start manually
mongod --dbpath C:\data\db
```

#### 2. Start the Backend (Node.js)

```bash
cd backend-node
npm run dev
```

The backend will run on `http://localhost:5000`

**API Documentation:** http://localhost:5000/api-docs

#### 3. Start the Frontend (React)

```bash
cd frontend
npm run dev
```

The frontend will run on `http://localhost:5173`

#### 4. (Optional) Start Java Microservices

```bash
cd services-java/va-service
./mvnw spring-boot:run
```

Or use VS Code tasks: Terminal → Run Task → "Infero: Maven Run"

### Production Build

#### Build Backend

```bash
cd backend-node
npm run build
npm start
```

#### Build Frontend

```bash
cd frontend
npm run build
npm run preview
```

## API Documentation

### Interactive Documentation

Visit http://localhost:5000/api-docs for the interactive Swagger UI with full API documentation.

**OpenAPI Version:** 2.0.0

### Key Endpoints

#### Authentication Routes
- `GET /api/auth/google` - Initiate Google OAuth flow
- `GET /api/auth/google/callback` - Google OAuth callback
- `POST /api/auth/dev-login` - Development login (dev only)
- `POST /api/auth/logout` - Logout user
- `GET /api/auth/status` - Check authentication status

#### User Routes (Protected)
- `GET /api/user/me` - Get current user information

#### Chat Assistant Routes (NEW)
- `POST /api/chat/session` - Initialize a new chat session (supports resume)
- `POST /api/chat/message` - Send a message in an active chat session
- `POST /api/chat/end` - End a chat session
- `GET /api/chat/history/:sessionId` - Get conversation history for a session

#### Voice Assistant Routes
- `POST /voice/incoming` - Handle incoming phone call webhook
- `POST /voice/stream` - Handle streaming audio chunks during call
- `POST /voice/end` - Mark a call as ended and finalize metrics
- `GET /assistant/settings` - Get phone assistant settings
- `PATCH /assistant/settings` - Update phone assistant settings
- `GET /assistant/calls` - List assistant call logs

#### Usage Tracking Routes (NEW)
- `POST /api/usage/assistant-call` - Update usage metrics for call/session (supports both ObjectId and UUID)
- `GET /api/usage/assistant-call/:callId` - Get usage metrics for specific call

#### Product Routes
- `GET /api/products` - Get all products
- `GET /api/products/:id` - Get product by ID
- `POST /api/products` - Create product (Admin only)
- `PUT /api/products/:id` - Update product (Admin only)
- `PATCH /api/products/:id/status` - Update product status (Admin only)
- `DELETE /api/products/:id` - Delete product (Admin only)

#### Product Configuration Routes
- `GET /api/product-configurations` - Get all configurations for tenant
- `GET /api/product-configurations/:productId` - Get config for specific product
- `POST /api/product-configurations` - Create/update product configuration
- `DELETE /api/product-configurations/:productId` - Delete configuration (Admin only)

#### Assistant Channels Routes
- `GET /api/assistant-channels` - Get all assistant channel configurations for tenant
- `GET /api/assistant-channels/:productId` - Get assistant channels for product
- `GET /api/assistant-channels/by-phone/:phoneNumber` - Get channels by phone number (public)
- `PATCH /api/assistant-channels` - Update assistant channel configuration
- `PATCH /api/assistant-channels/voice` - Update voice channel configuration
- `PATCH /api/assistant-channels/chat` - Update chat channel configuration
- `POST /api/assistant-channels/voice/toggle` - Toggle voice channel on/off
- `POST /api/assistant-channels/chat/toggle` - Toggle chat channel on/off

#### Prompt Routes
- `GET /api/prompts` - Get all default prompt templates
- `GET /api/prompts/:id` - Get specific prompt template by ID
- `GET /api/prompts/industry/:industry` - Get prompts for specific industry

#### Subscription Routes
- `GET /api/subscriptions` - Get user subscriptions
- `POST /api/subscriptions` - Create new subscription
- `POST /api/subscriptions/create` - Create subscription with validation
- `POST /api/subscriptions/validate-payment` - Validate payment method
- `GET /api/subscriptions/product/:productId` - Get subscription for product
- `PATCH /api/subscriptions/:subscriptionId` - Update subscription
- `GET /api/subscriptions/:subscriptionId/billing` - Get billing history
- `POST /api/subscriptions/:subscriptionId/billing` - Create billing record

#### User Products Routes (NEW)
- `GET /api/user-products` - Get user's subscribed products
- `POST /api/user-products` - Subscribe to a product (requires payment)
- `DELETE /api/user-products/:productId` - Unsubscribe from a product

#### Payment Methods Routes
- `GET /api/payment-methods` - Get all payment methods for user
- `POST /api/payment-methods` - Add new payment method
- `DELETE /api/payment-methods/:id` - Remove payment method
- `PATCH /api/payment-methods/:id/set-default` - Set payment method as default

#### Transaction Routes (NEW)
- `GET /api/transactions` - Get all transactions for tenant (with filters)
- `GET /api/transactions/:transactionId` - Get transaction by ID
- `GET /api/transactions/payment-method/:paymentMethodId` - Get transactions for payment method
- `GET /api/transactions/stats/summary` - Get transaction statistics

#### Tenant Routes (NEW)
- `GET /api/tenants` - Get all tenants (Admin only)
- `POST /api/tenants` - Create new tenant (Admin only)
- `GET /api/tenants/:tenantId/users` - Get users by tenant
- `GET /api/tenants/users/all` - Get all users with tenant info
- `PUT /api/tenants/users/:userId/tenant` - Assign user to tenant (Admin only)

### Authentication Methods

The API supports two authentication methods:

1. **Session Cookie Authentication** (`cookieAuth`)
   - Used for web frontend
   - HTTP-only secure cookies
   - Session-based authentication

2. **JWT Bearer Token** (`bearerAuth`)
   - Used for API integrations
   - Authorization: Bearer <token>
   - Stateless authentication

### API Response Formats

#### Success Response
```json
{
  "success": true,
  "data": { /* response data */ }
}
```

#### Error Response
```json
{
  "error": "Error message",
  "details": "Optional detailed error information"
}
```

### Query Parameters

Many list endpoints support the following query parameters:
- `limit` - Number of results to return (default: 20-50)
- `offset` - Number of results to skip (pagination)
- `status` - Filter by status
- `productId` - Filter by product
- `tenantId` - Filter by tenant

### Rate Limiting

Currently no rate limiting is enforced in development. Production deployments should implement appropriate rate limiting.

## Architecture

### Three-Tier Architecture

```
Client (React) → Backend (Node.js) → Microservices (Java)
   Port 5173          Port 5000           Port 8136+
```

### Authentication Flow

1. User clicks "Sign in with Google"
2. Redirected to `/api/auth/google` on Node.js server
3. Google OAuth authentication
4. Redirect back to callback URL
5. JWT token stored in HTTP-only cookie
6. User redirected to dashboard
7. Protected routes check authentication via `AuthContext`
8. Role-based access control enforced

### Product Configuration Flow

1. User selects a product (Virtual Assistant, IDP, or Computer Vision)
2. Frontend loads product-specific configuration page
3. Configuration data fetched from MongoDB via Node.js backend
4. User modifies prompts, RAG settings, or context
5. Unsaved changes tracked in component state
6. Warning displayed if user attempts to navigate away
7. Confirmation dialog prevents data loss
8. Save operation updates MongoDB with tenantId and productId

### API Request Flow

1. Frontend makes authenticated request to Node.js backend
2. JWT token validated via middleware
3. Request processed and/or proxied to Java microservices
4. Response returned with standardized format
5. Frontend updates UI based on response

## User Roles & Permissions

| Role | Access Level |
|------|-------------|
| USER | Basic access to own data |
| TENANT_USER | Access to tenant-specific data |
| TENANT_ADMIN | Manage users within tenant |
| PROJECT_ADMIN | Access to all tenant management and settings |
| SUPER_ADMIN | Full system access |

**Settings Dropdown** is only visible to users with PROJECT_ADMIN or SUPER_ADMIN roles.

## Development Tips

### Generate Random Secrets

For `SESSION_SECRET` and `JWT_SECRET`, use:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### Using Development Login

For local development without Google OAuth:

```bash
curl -X POST http://localhost:5000/api/auth/dev-login -c cookies.txt
```

### Running with VS Code Tasks

Use the built-in VS Code tasks:
- **Infero: Maven Run** - Start Spring Boot service
- **Infero: Maven Clean Install** - Build project
- **Infero: Maven Test** - Run tests

### Clearing Cookies

If authentication issues occur:
1. Open browser DevTools
2. Go to Application/Storage → Cookies
3. Delete cookies for localhost

### Testing MongoDB Connection

```bash
# Connect to MongoDB shell
mongosh

# Use ai_platform database
use ai_platform

# Show collections
show collections

# Query product configurations
db.product_configurations.find().pretty()
```

### Testing Swagger API

Visit http://localhost:5000/api-docs and use the interactive interface to test endpoints directly from your browser.

## Database Schema

### product_configurations Collection

```javascript
{
  _id: ObjectId,
  tenantId: String,         // Unique tenant identifier
  productId: String,        // Product ID (va-service, idp-service, cv-service)
  productName: String,      // Human-readable product name
  category: String,         // Product category
  status: String,           // 'active' | 'inactive' | 'deleted'
  configuration: {
    prompts: Object,        // Voice/chat prompts
    ragConfig: Object,      // RAG settings
    context: String,        // Additional context
  },
  createdAt: Date,
  updatedAt: Date
}
```

**Indexes:**
- Unique compound index: (tenantId, productId, status)
- Single index: tenantId
- Single index: productId
- Single index: status

## Troubleshooting

### Backend Won't Start
- Ensure MongoDB is running: `mongosh` should connect successfully
- Check `.env` file has all required variables
- Verify ports 5000 and 5173 are not in use
- Run `npm install` in backend-node directory

### Frontend Build Errors
- Clear node_modules: `rm -rf node_modules && npm install`
- Check for TypeScript errors: `npm run build`
- Ensure shared types are accessible

### OAuth Redirect Error
- Verify redirect URI in Google Console: `http://localhost:5000/api/auth/google/callback`
- Check `CLIENT_URL` in `.env` matches frontend URL

### CORS Issues
- Ensure `CLIENT_URL` in backend .env matches frontend URL
- Check `withCredentials: true` in Axios requests
- Verify cookies are being set (DevTools → Application → Cookies)

### MongoDB Connection Failed
- Start MongoDB service: `net start MongoDB` (Windows)
- Check MONGODB_URI in .env
- Verify MongoDB is listening on port 27017

### Settings Dropdown Not Visible
- Check user role in AuthContext
- Verify hasRole function works correctly
- Ensure user has PROJECT_ADMIN or SUPER_ADMIN role

## Security Considerations

- JWT tokens stored in HTTP-only cookies (not accessible via JavaScript)
- CORS configured for specific origin
- Environment variables for sensitive data
- Session secrets should be random and strong (64+ characters)
- In production, use HTTPS and set `secure: true` for cookies
- MongoDB connection string should use authentication
- Role-based access control enforced on all protected routes

## Ports Summary

- **Frontend (React):** http://localhost:5173
- **Backend (Node.js):** http://localhost:5000
- **API Documentation:** http://localhost:5000/api-docs
- **MongoDB:** mongodb://localhost:27017
- **Java Microservices:** Ports 8136+

## Recent Updates

### Latest Features
- ✅ Product-specific configuration pages by category
- ✅ Prompt configuration with unsaved changes tracking
- ✅ Swagger/OpenAPI documentation integration
- ✅ MongoDB indexes for product configurations
- ✅ Responsive layout with dynamic settings positioning
- ✅ Dynamic copyright year in footer
- ✅ Unique IDs for all layout components
- ✅ Template seeding with 7 industry-specific templates
- ✅ Generic Java API client (removed OpenAI dependency)

### Bug Fixes
- Fixed CSS border warning in Sidebar
- Resolved layout spacing issues
- Fixed settings dropdown positioning for PROJECT_ADMIN users
- Corrected userInfoContainer responsive behavior

## Next Steps

- [ ] Add user management UI for tenant admins
- [ ] Implement subscription and billing system
- [ ] Add email verification flow
- [ ] Implement password reset for local auth
- [ ] Add comprehensive unit and integration tests
- [ ] Implement logging and monitoring (Winston, ELK stack)
- [ ] Add Redis for session storage (production)
- [ ] Implement rate limiting and API throttling
- [ ] Add WebSocket support for real-time features
- [ ] Create admin dashboard for SUPER_ADMIN users
- [ ] Add audit logging for configuration changes
- [ ] Implement backup and restore procedures

## Documentation

### � Critical Foundation Documentation (Start Here!)
- [Developer Setup Guide](docs/DEVELOPER_SETUP.md) - Complete environment setup, prerequisites, IDE configuration, common commands
- [Security Architecture](docs/SECURITY_ARCHITECTURE.md) - OAuth2, JWT tokens, CORS, multi-tenancy, role-based access control, threat mitigation
- [Troubleshooting Guide](docs/TROUBLESHOOTING.md) - Solutions for setup, authentication, database, connectivity, frontend, backend, WebSocket, Java services issues
- [API Design Standards](docs/API_DESIGN_STANDARDS.md) - REST conventions, naming, request/response format, versioning, pagination, error handling, rate limiting

### 🎨 Frontend Architecture & Patterns
- [Frontend Architecture Guide](docs/FRONTEND_ARCHITECTURE.md) - Project structure, component hierarchy, data flow, routing, performance optimization
- [State Management & Context API](docs/STATE_MANAGEMENT.md) - AuthContext, ThemeContext, NotificationContext, custom hooks for state management
- [Component Patterns & Best Practices](docs/COMPONENT_PATTERNS.md) - Component types, container/presentational, compound components, form handling, styling
- [React Hooks Conventions](docs/HOOKS_CONVENTIONS.md) - Hook rules, built-in hooks, custom hooks patterns, dependency management, testing

### � Frontend Advanced Topics
- [Performance Optimization](docs/PERFORMANCE_OPTIMIZATION.md) - Code splitting, bundle analysis, runtime optimization, image optimization, network optimization, Core Web Vitals monitoring
- [Testing Strategy](docs/TESTING_STRATEGY.md) - Vitest setup, unit testing, component testing, integration testing, E2E testing with Playwright, mocking strategies, coverage configuration
- [Routing Patterns](docs/ROUTING_PATTERNS.md) - Router setup, route guards, role-based protection, nested routes, navigation hooks, breadcrumbs, route transitions, document title management
- [Form Handling](docs/FORM_HANDLING.md) - Validation strategies, Zod schema validation, async field validation, multi-step wizards, dynamic form fields, file uploads, field dependencies, form state persistence
- [Styling Architecture](docs/STYLING_ARCHITECTURE.md) - Design tokens, light/dark themes, Emotion CSS-in-JS, responsive design, accessibility, CSS variables, styling utilities
- [Error Handling & Resilience](docs/ERROR_HANDLING.md) - Error boundaries, API error handling, error recovery, retry logic, user-friendly error messages, error logging and monitoring
### 🔌 Backend Architecture & Patterns
- [Backend Architecture Guide](docs/BACKEND_ARCHITECTURE.md) - Project structure, layer organization, request-response flow, error handling architecture, dependency injection, configuration management
- [Service Patterns & Design](docs/SERVICE_PATTERNS.md) - Service layer architecture, dependency injection patterns, error handling in services, service composition, caching strategies, transaction management
- [Database Patterns & MongoDB](docs/DATABASE_PATTERNS.md) - Schema design, query optimization, indexing strategies, data validation, consistency management, performance optimization
- [Middleware Guide & Implementation](docs/MIDDLEWARE_GUIDE.md) - Middleware architecture, authentication, RBAC, request validation, data sanitization, logging, error handling, middleware composition
### ⚡ Backend Advanced Topics
- [Caching Strategies](docs/CACHING_STRATEGIES.md) - In-memory caching, LRU cache, Redis integration, cache invalidation, multi-level caching, performance monitoring
- [Session Management](docs/SESSION_MANAGEMENT.md) - Express session, JWT tokens, multi-device sessions, OAuth2 integration, CSRF protection, session hijacking prevention
- [Batch Processing](docs/BATCH_PROCESSING.md) - Bulk operations, BullMQ queues, worker patterns, scheduled tasks, progress tracking, data import/export
- [External APIs Integration](docs/EXTERNAL_APIS.md) - API clients, rate limiting, circuit breaker pattern, retry strategies, exponential backoff, API monitoring
- [Circuit Breaker Implementation](docs/CIRCUIT_BREAKER_TASK_BREAKDOWN.md) - Complete circuit breaker implementation, task breakdown, migration guide, frontend/backend integration
- [Circuit Breaker User Guide](docs/CIRCUIT_BREAKER_USER_GUIDE.md) - User-facing guide, circuit states explained, monitoring UI, troubleshooting, best practices
- [Webhook Handling](docs/WEBHOOK_HANDLING.md) - Webhook verification, signature checking, idempotent processing, retry mechanisms, event handling, security best practices
- [Logging & Monitoring](docs/LOGGING_MONITORING.md) - Structured logging, performance tracking, metrics collection, health checks, alerting, error tracking
### �📚 Project Documentation

#### Architecture & Overview
- [Project Overview](docs/PROJECT_OVERVIEW.md) - Comprehensive platform overview
- [Component Integration Guide](docs/COMPONENT_INTEGRATION_GUIDE.md) - How all components work together with data flows
- [Repository Structure](docs/RepositoryStrucutre.md) - Detailed repository structure guide
- [High-Level Assistant Architecture](docs/high-level-assistant-arch.md) - AI assistant system design
- [Platform Architecture Diagram](docs/Platform%20Architecture%20Diagram.ini) - Visual architecture reference
- [Channels Architecture Diagram](docs/CHANNELS_ARCHITECTURE_DIAGRAM.md) - Communication channels architecture

#### Backend (Node.js)
- [Backend README](backend-node/README.md) - Backend service documentation
- [Implementation Summary](backend-node/IMPLEMENTATION_SUMMARY.md) - Key implementation details
- [Prompt Architecture](backend-node/PROMPT_ARCHITECTURE.md) - AI prompt system design
- [MongoDB Prompt Schema](backend-node/MONGODB_PROMPT_SCHEMA.md) - Database schema for prompts
- [Payment Testing](backend-node/PAYMENT_TESTING.md) - Payment system testing guide
- [Workflow Test](backend-node/WORKFLOW_TEST.md) - End-to-end workflow testing
- [Seed Success Report](backend-node/SEED_SUCCESS_REPORT.md) - Database seeding documentation
- [OpenAPI Specification](backend-node/openapi.yaml) - REST API documentation

##### Backend Scripts
- [MongoDB Scripts README](backend-node/scripts/mongo/README.md) - MongoDB utility scripts
- [Consolidation Summary](backend-node/scripts/mongo/CONSOLIDATION_SUMMARY.md) - Data consolidation report

#### Frontend
- [Frontend README](frontend/README.md) - React frontend documentation
- [React Frontend Verification](docs/REACT_FRONTEND_VERIFICATION.md) - Frontend implementation verification
- [Frontend Requirements Document](docs/Frontend%20Requirements%20Document.docx) - Detailed requirements
- [Mobile Responsive](docs/MOBILE_RESPONSIVE.md) - Mobile responsiveness implementation

#### Java Microservices
- [VA Service README](services-java/va-service/README.md) - Virtual Assistant service
- [CV Service README](services-java/cv-service/README.md) - Computer Vision service
- [IDP Service README](services-java/idp-service/README.md) - Intelligent Document Processing
- [Common Libraries README](services-java/common-libs/README.md) - Shared Java libraries
- [Prompt Builder Usage](services-java/va-service/PROMPT_BUILDER_USAGE.md) - VA prompt builder guide
- [MongoDB Common](services-java/va-service/MONGODB_COMMON.md) - MongoDB integration utilities
- [gRPC Implementation](docs/GRPC_IMPLEMENTATION.md) - gRPC service implementation
- [Java VA Verification](docs/JAVA_VA_VERIFICATION.md) - VA service verification

##### Java Logging
- [Debug Logging Control](services-java/DEBUG_LOGGING_CONTROL.md) - Logging configuration
- [Logging Implementation Complete](services-java/LOGGING_IMPLEMENTATION_COMPLETE.md) - Logging migration
- [Logging Migration Status](services-java/LOGGING_MIGRATION_STATUS.md) - Migration tracking

#### Database & Data
- [MongoDB Documentation](docs/mongo.md) - MongoDB setup and usage
- [MongoDB Changes Summary](docs/MONGODB_CHANGES_SUMMARY.md) - Database schema changes
- [Entity Relationship Diagram](docs/Entity%20relationship%20diagram%20for%20MongoDB.docx) - ER diagram

#### Features & Configuration
- [Product Configuration Guide](docs/PRODUCT_CONFIGURATION_GUIDE.md) - Product setup guide
- [Product-Based Access Control](docs/PRODUCT_BASED_ACCESS_CONTROL.md) - RBAC implementation
- [Payment System](docs/PAYMENT_SYSTEM.md) - Payment integration documentation
- [Assistant Channels](docs/ASSISTANT_CHANNELS.md) - Multi-channel assistant setup
- [Chat Session Management](docs/CHAT_SESSION_MANAGEMENT.md) - Chat system architecture
- [Tenant Validation and Redirect](docs/TENANT_VALIDATION_AND_REDIRECT.md) - Multi-tenant routing
- [Implementation Verification](docs/IMPLEMENTATION_VERIFICATION.md) - Feature verification checklist

#### WebSocket & Real-Time
- [WebSocket Summary](docs/WEBSOCKET_SUMMARY.md) - WebSocket implementation overview
- [WebSocket Implementation](docs/WEBSOCKET_IMPLEMENTATION.md) - Detailed implementation guide
- [WebSocket Configuration](docs/WEBSOCKET_CONFIGURATION.md) - Configuration reference
- [WebSocket Config Reference](docs/WEBSOCKET_CONFIG_REFERENCE.md) - Advanced configuration
- [WebSocket Quick Start](docs/WEBSOCKET_QUICK_START.md) - Getting started with WebSocket

#### API Schemas & Specifications
- [Assistant Calls Schema](docs/assistant_calls.jsonc) - Assistant API call structure
- [Assistant Settings Schema](docs/assistant_setting_schema.jsonc) - Settings configuration schema
- [OpenAPI Specification](docs/openapi.yaml) - API documentation (YAML)

#### Product & Business
- [AI Product Roadmap](docs/ai%20product%20roadman.docx) - Product vision and roadmap
- [Product Roadmap Timeline](docs/📅%20AI%20Services%20Product%20Roadmap%20Timeline.docx) - Timeline view
- [Phased Product Rollout Strategy](docs/Phased%20Product%20Rollout%20Strategy.docx) - Launch strategy
- [Technical Requirements Document](docs/Technical%20requirements%20document.docx) - System requirements
- [Optimized Technical Requirements](docs/Optimized%20Technical%20Requirements.docx) - Refined requirements

### 🔧 Configuration Files
- [Frontend Package](frontend/package.json) - Frontend dependencies
- [Frontend TypeScript Config](frontend/tsconfig.json) - TypeScript configuration
- [Backend Package](backend-node/package.json) - Backend dependencies
- [Backend TypeScript Config](backend-node/tsconfig.json) - Backend TypeScript setup
- [Copilot Instructions](.github/copilot-instructions.md) - GitHub Copilot guidance

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

MIT
