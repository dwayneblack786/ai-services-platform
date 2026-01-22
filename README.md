# AI Services Platform

A full-stack AI services platform with React (TypeScript) frontend, Node.js Express (TypeScript) backend, and Java Spring Boot microservices featuring Google OAuth2 authentication, product configuration management, and AI service integration.

---

## 📑 Table of Contents

- [Project Structure](#project-structure)
- [Tech Stack](#tech-stack)
  - [Frontend](#frontend)
  - [Backend (Node.js)](#backend-nodejs)
  - [Microservices (Java)](#microservices-java)
  - [Database & Storage](#database--storage)
  - [Real-Time & Communication](#real-time--communication)
  - [Authentication & Authorization](#authentication--authorization)
  - [Development & Tooling](#development--tooling)
- [Features](#features)
- [Quick Start](#quick-start)
- [Google OAuth2 Setup](#google-oauth2-setup)
- [Installation](#installation)
- [Running the Application](#running-the-application)
  - [Quick Start Commands](#quick-start-commands)
  - [Eclipse IDE Setup (Java Services)](#eclipse-ide-setup-java-services)
- [API Documentation](#api-documentation)
  - [API Endpoints](#api-endpoints)
  - [Authentication Methods](#authentication-methods)
  - [API Response Formats](#api-response-formats)
  - [Query Parameters](#query-parameters)
  - [Rate Limiting](#rate-limiting)
- [Architecture](#architecture)
  - [Three-Tier Architecture](#three-tier-architecture)
  - [Authentication Flow](#authentication-flow)
  - [Product Configuration Flow](#product-configuration-flow)
  - [API Request Flow](#api-request-flow)
- [User Roles & Permissions](#user-roles--permissions)
- [Development Tips](#development-tips)
  - [Generate Random Secrets](#generate-random-secrets)
  - [Using Development Login](#using-development-login)
  - [Running with VS Code Tasks](#running-with-vs-code-tasks)
  - [Clearing Cookies](#clearing-cookies)
  - [Testing MongoDB Connection](#testing-mongodb-connection)
  - [Testing Swagger API](#testing-swagger-api)
- [Database Schema](#database-schema)
  - [product_configurations Collection](#product_configurations-collection)
- [Troubleshooting](#troubleshooting)
  - [Backend Won't Start](#backend-wont-start)
  - [Frontend Build Errors](#frontend-build-errors)
  - [OAuth Redirect Error](#oauth-redirect-error)
  - [CORS Issues](#cors-issues)
  - [MongoDB Connection Failed](#mongodb-connection-failed)
  - [Settings Dropdown Not Visible](#settings-dropdown-not-visible)
- [Security Considerations](#security-considerations)
- [Ports Summary](#ports-summary)
- [Recent Updates](#recent-updates)
  - [Latest Features (January 2026)](#latest-features-january-2026)
  - [Bug Fixes](#bug-fixes)
- [Next Steps](#next-steps)
  - [🎯 High Priority](#-high-priority)
  - [🔧 Infrastructure & DevOps](#-infrastructure--devops)
  - [📊 Features & Enhancements](#-features--enhancements)
  - [✅ Already Implemented](#-already-implemented)
- [Documentation](#documentation)
  - [🚀 Critical Foundation Documentation](#-critical-foundation-documentation-start-here)
  - [🎨 Frontend Architecture & Patterns](#-frontend-architecture--patterns)
  - [🎯 Frontend Advanced Topics](#-frontend-advanced-topics)
  - [🔌 Backend Architecture & Patterns](#-backend-architecture--patterns)
  - [⚡ Backend Advanced Topics](#-backend-advanced-topics)
  - [📚 Project Documentation](#project-documentation)
    - [Architecture & Overview](#architecture--overview)
    - [Backend (Node.js)](#backend-nodejs-1)
    - [Backend Scripts](#backend-scripts)
    - [Frontend](#frontend-1)
    - [Java Microservices](#java-microservices)
    - [Java Logging](#java-logging)
    - [Database & Data](#database--data)
    - [Features & Configuration](#features--configuration)
    - [WebSocket & Real-Time](#websocket--real-time)
    - [🔄 Communication Workflows & Integration](#-communication-workflows--integration)
    - [API Schemas & Specifications](#api-schemas--specifications)
    - [Product & Business](#product--business)
  - [🔧 Configuration Files](#-configuration-files)
- [Contributing](#contributing)
- [License](#license)

---

## Project Structure

```
ai-services-platform/
│
├── .github/
│   └── copilot-instructions.md
│
├── frontend/                           # React + Vite + TypeScript
│   ├── docs/                           # Frontend documentation
│   │   ├── README.md
│   │   └── VOICE-STREAMING-CHECKLIST.md
│   ├── src/
│   │   ├── components/                 # React components
│   │   ├── config/                     # Configuration files
│   │   ├── context/                    # React Context (Auth, etc.)
│   │   ├── hooks/                      # Custom React hooks
│   │   ├── pages/                      # Page components
│   │   ├── services/                   # API clients
│   │   ├── styles/                     # Emotion CSS-in-JS styles
│   │   ├── types/                      # TypeScript types
│   │   ├── utils/                      # Utility functions
│   │   ├── App.tsx
│   │   ├── index.css
│   │   ├── main.tsx
│   │   └── vite-env.d.ts
│   ├── index.html
│   ├── package.json
│   ├── tsconfig.json
│   ├── tsconfig.node.json
│   └── vite.config.ts
│
├── backend-node/                       # Node.js + Express + TypeScript
│   ├── src/
│   │   ├── config/                     # Database, Passport, Redis config
│   │   ├── grpc/                       # gRPC client implementations
│   │   ├── middleware/                 # Auth & RBAC middleware
│   │   ├── models/                     # MongoDB/Mongoose models
│   │   ├── routes/                     # Express API routes
│   │   ├── scripts/                    # Database scripts
│   │   ├── services/                   # Business logic & external APIs
│   │   ├── sockets/                    # Socket.IO/WebSocket handlers
│   │   ├── types/                      # TypeScript type definitions
│   │   ├── utils/                      # Utilities (logger, etc.)
│   │   └── index.ts                    # Express app entry point
│   ├── docs/                           # Backend-specific docs
│   ├── proto/                          # Protocol Buffer definitions
│   ├── scripts/                        # Utility scripts
│   ├── tests/                          # Test files
│   ├── openapi.yaml                    # OpenAPI 3.0.3 specification
│   ├── package.json
│   ├── tsconfig.json
│   ├── jest.config.js
│   ├── nodemon.json
│   ├── CIRCUIT_BREAKER_IMPLEMENTATION.md
│   ├── IMPLEMENTATION_SUMMARY.md
│   ├── MONGODB_PROMPT_SCHEMA.md
│   ├── PAYMENT_TESTING.md
│   ├── PROMPT_ARCHITECTURE.md
│   ├── RATE_LIMITING.md
│   ├── SEED_SUCCESS_REPORT.md
│   ├── WORKFLOW_TEST.md
│   └── README.md
│
├── services-java/                      # Java Spring Boot Microservices
│   ├── common-libs/                    # Common Java libraries
│   │   ├── src/main/java/com/ai/common/
│   │   ├── src/test/
│   │   ├── pom.xml
│   │   ├── mvnw / mvnw.cmd
│   │   └── README.md
│   │
│   ├── cv-service/                     # Computer Vision Service
│   │   ├── src/main/java/com/ai/cv/
│   │   ├── src/main/proto/
│   │   ├── src/main/resources/
│   │   ├── src/test/
│   │   ├── pom.xml
│   │   ├── mvnw / mvnw.cmd
│   │   └── README.md
│   │
│   ├── idp-service/                    # Intelligent Document Processing
│   │   ├── src/main/java/com/ai/idp/
│   │   ├── src/main/proto/
│   │   ├── src/main/resources/
│   │   ├── src/test/
│   │   ├── pom.xml
│   │   ├── mvnw / mvnw.cmd
│   │   └── README.md
│   │
│   ├── va-service/                     # Virtual Assistant Service (Voice & Chat)
│   │   ├── src/
│   │   │   ├── main/
│   │   │   │   ├── java/com/ai/va/
│   │   │   │   │   ├── config/         # Spring configuration
│   │   │   │   │   ├── controller/     # REST controllers
│   │   │   │   │   ├── dto/            # Data transfer objects
│   │   │   │   │   ├── grpc/           # gRPC service implementations
│   │   │   │   │   ├── model/          # Domain models
│   │   │   │   │   ├── repository/     # Data repositories
│   │   │   │   │   ├── service/        # Business logic
│   │   │   │   │   └── VaServiceApplication.java
│   │   │   │   ├── proto/              # Protocol Buffer definitions
│   │   │   │   └── resources/
│   │   │   │       ├── application.yml
│   │   │   │       ├── application-dev.yml
│   │   │   │       └── log4j2.xml
│   │   │   └── test/
│   │   ├── .eclipse/                   # Eclipse launch configurations
│   │   ├── pom.xml
│   │   ├── mvnw / mvnw.cmd
│   │   ├── MONGODB_COMMON.md
│   │   ├── PROMPT_BUILDER_USAGE.md
│   │   └── README.md
│   │
│   ├── DEBUG_LOGGING_CONTROL.md
│   ├── LOGGING_IMPLEMENTATION_COMPLETE.md
│   └── LOGGING_MIGRATION_STATUS.md
│
├── services-python/                    # Python ML/AI Services (Future)
│
├── shared/                             # Shared TypeScript types
│   ├── types.ts
│   ├── types.d.ts
│   └── types.js
│
├── docs/                               # Comprehensive Documentation (100+ files)
│   ├── API_DESIGN_STANDARDS.md
│   ├── ASSISTANT_CHANNELS.md
│   ├── BACKEND_ARCHITECTURE.md
│   ├── BATCH_PROCESSING.md
│   ├── CACHING_STRATEGIES.md
│   ├── CHANNELS_ARCHITECTURE_DIAGRAM.md
│   ├── CHAT_SESSION_MANAGEMENT.md
│   ├── CIRCUIT_BREAKER_TASK_BREAKDOWN.md
│   ├── CIRCUIT_BREAKER_USER_GUIDE.md
│   ├── COMPONENT_INTEGRATION_GUIDE.md
│   ├── COMPONENT_PATTERNS.md
│   ├── DATABASE_PATTERNS.md
│   ├── DEVELOPER_SETUP.md
│   ├── ECLIPSE_SETUP.md
│   ├── END_TO_END_INTEGRATION_GUIDE.md
│   ├── ERROR_HANDLING.md
│   ├── ERROR_HANDLING_PATTERNS.md
│   ├── EXTERNAL_APIS.md
│   ├── FORM_HANDLING.md
│   ├── FRONTEND_ARCHITECTURE.md
│   ├── GRPC_IMPLEMENTATION.md
│   ├── GRPC_STREAMING_FLOW.md
│   ├── HOOKS_CONVENTIONS.md
│   ├── IMPLEMENTATION_VERIFICATION.md
│   ├── JAVA_VA_VERIFICATION.md
│   ├── LOGGING_MONITORING.md
│   ├── METHOD_HANDLERS_REFERENCE.md
│   ├── MIDDLEWARE_GUIDE.md
│   ├── MOBILE_RESPONSIVE.md
│   ├── MONGODB_CHANGES_SUMMARY.md
│   ├── PAYMENT_SYSTEM.md
│   ├── PERFORMANCE_OPTIMIZATION.md
│   ├── PRODUCT_BASED_ACCESS_CONTROL.md
│   ├── PRODUCT_CONFIGURATION_GUIDE.md
│   ├── PROJECT_OVERVIEW.md
│   ├── REACT_FRONTEND_VERIFICATION.md
│   ├── REDIS_IMPLEMENTATION_GUIDE.md
│   ├── RepositoryStrucutre.md
│   ├── ROUTING_PATTERNS.md
│   ├── SECURITY_ARCHITECTURE.md
│   ├── SERVICE_PATTERNS.md
│   ├── SESSION_MANAGEMENT.md
│   ├── STATE_MANAGEMENT.md
│   ├── STYLING_ARCHITECTURE.md
│   ├── TECHNOLOGY_FEATURES.md
│   ├── TENANT_VALIDATION_AND_REDIRECT.md
│   ├── TESTING_STRATEGY.md
│   ├── TROUBLESHOOTING.md
│   ├── VOICE-STREAMING.md
│   ├── WEBHOOK_HANDLING.md
│   ├── WEBSOCKET_CONFIGURATION.md
│   ├── WEBSOCKET_DETAILED_FLOW.md
│   ├── WEBSOCKET_IMPLEMENTATION.md
│   ├── WEBSOCKET_QUICK_START.md
│   ├── WEBSOCKET_SUMMARY.md
│   ├── assistant_calls.jsonc
│   ├── assistant_setting_schema.jsonc
│   ├── high-level-assistant-arch.md
│   ├── mongo.md
│   ├── openapi.yaml
│   ├── testing/                        # Testing documentation
│   ├── voice-streaming/                # Voice streaming docs
│   ├── Platform Architecture Diagram.ini
│   └── (70+ additional documentation files)
│
├── examples/                           # Example code and configurations
│
├── README.md                          # This file
├── .gitignore                         # Git ignore rules
├── export-prompt-config.ps1           # Script to export prompt configurations
├── prompt-configuration.json          # Prompt configuration data
└── test-voice-streaming.ps1           # Voice streaming test script
```

**Key Directories:**

- **frontend/** - React 18 + Vite + TypeScript + Emotion CSS-in-JS + Socket.IO client
- **backend-node/** - Node.js + Express + TypeScript + Passport OAuth2 + MongoDB + Redis + Socket.IO + gRPC clients
- **services-java/** - Spring Boot microservices (VA, IDP, CV) with gRPC servers, Protocol Buffers, Log4j2
- **services-python/** - Python ML/AI services (future implementation)
- **shared/** - TypeScript types shared between frontend and backend
- **docs/** - 100+ comprehensive documentation files covering all aspects
- **examples/** - Example configurations and code samples

**Port Allocation:**
- **Frontend:** `5173` (Vite dev server)
- **Backend-Node:** `5000` (REST API + WebSocket + Swagger UI at `/api-docs`)
- **VA Service (Java):** `8136` (HTTP/REST), `50051` (gRPC server)
- **IDP Service (Java):** `8137` (HTTP/REST + gRPC)
- **CV Service (Java):** `8138` (HTTP/REST + gRPC)
- **LM Studio (LLM):** `1234` (OpenAI-compatible API at `/v1`)
- **Whisper STT Server (Python):** `8000` (Speech-to-Text API - dev only)
- **MongoDB:** `27017`
- **Redis:** `6379`

## Tech Stack

### Frontend
- **React** 18.2.0 with **TypeScript** 5.3.3
- **Vite** 5.0+ (build tool and dev server)
- **React Router** v6.21+ (navigation)
- **Emotion** 11.14+ (CSS-in-JS styling)
- **Axios** 1.6+ (HTTP client with interceptors)
- **Socket.IO Client** 4.8+ (real-time WebSocket communication)
- **js-cookie** (client-side cookie management)
- Context API for state management
- ESLint + TypeScript ESLint (code quality)

### Backend (Node.js)
- **Node.js** with **Express** 4.18+
- **TypeScript** 5.3.3
- **Passport.js** 0.7+ (OAuth2 strategies)
  - passport-google-oauth20
  - passport-local
- **express-session** 1.17+ (session management)
- **JWT** (jsonwebtoken 9.0+)
- **MongoDB** 6.21+ (native driver)
- **Mongoose** 9.1+ (ODM for MongoDB)
- **Socket.IO** 4.8+ (WebSocket server)
- **gRPC** (@grpc/grpc-js, @grpc/proto-loader)
- **bcrypt** 5.1+ (password hashing)
- **Swagger UI Express** 5.0+ (API documentation)
- **YAMLJS** (OpenAPI spec loading)
- **cookie-parser** (cookie handling)
- **CORS** (cross-origin resource sharing)

### Microservices (Java)
- **Java** 21 LTS (⚠️ **Upgrade from Java 17 recommended** - See [Java 21 Upgrade Notes](#java-21-upgrade-notes))
- **Spring Boot** 4.0.1
- **Maven** build system
- **Log4j2** (logging framework)
- **gRPC** 1.61+ (inter-service communication)
- **Protocol Buffers** 3.25+ (data serialization)
- RESTful API architecture
- Generic API client (RestTemplate)

### Database & Storage
- **MongoDB** 6.0+ (primary database)
- Collections: users, tenants, product_configurations, assistant_channels, chat_sessions, subscriptions, payment_methods, transactions
- Compound indexes for multi-tenant queries
- Native MongoDB driver + Mongoose ODM

### Real-Time & Communication
- **Socket.IO** 4.8+ (WebSocket communication)
- **gRPC** (backend-to-Java microservices)
- Protocol Buffers for efficient serialization
- Circuit breaker pattern for resilience

### Authentication & Authorization
- **Google OAuth2** (primary authentication)
- **JWT** token-based sessions (HTTP-only cookies)
- **bcrypt** password hashing (local auth)
- **Role-based access control (RBAC)**
  - USER - Basic access to own data
  - TENANT_USER - Access to tenant-specific data
  - TENANT_ADMIN - Manage users within tenant
  - PROJECT_ADMIN - Access to all tenant management
  - SUPER_ADMIN - Full system access

### Development & Tooling
- **TypeScript** 5.3.3 (full-stack type safety)
- **Vite** (fast HMR and optimized builds)
- **Nodemon** (backend hot reload)
- **ESLint** (code linting)
- **ts-node** (TypeScript execution)
- **VS Code** (recommended IDE)
- **Git** (version control)

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

## Quick Start

For complete installation and setup instructions, see the [Developer Setup Guide](docs/DEVELOPER_SETUP.md).

For all available scripts and commands, see the [Scripts Reference Guide](docs/SCRIPTS_REFERENCE.md).

**Prerequisites Summary:**
- Node.js 18+
- MongoDB 6.0+
- **Java JDK 21 LTS** (Java 17+ minimum, Java 21 recommended)
- Maven 3.6+ (or use included Maven Wrapper)

## Google OAuth2 Setup

For detailed OAuth2 configuration, see [Environment Configuration](docs/DEVELOPER_SETUP.md#environment-configuration) in the Developer Setup Guide.

## Installation

For complete installation instructions, environment configuration, and database setup, please refer to:

📘 **[Developer Setup Guide](docs/DEVELOPER_SETUP.md)**

The guide includes:
- Detailed prerequisites installation for all platforms
- Environment variable configuration
- MongoDB setup and initialization
- Service startup instructions
- IDE configuration (VS Code, IntelliJ)
- Common commands reference
- Troubleshooting tips

## Running the Application

For detailed startup instructions and troubleshooting, see [Service Startup](docs/DEVELOPER_SETUP.md#service-startup) in the Developer Setup Guide.

### Quick Start Commands

**Terminal 1 - Backend:**
```bash
cd backend-node
npm run dev
# Runs on http://localhost:5000
# API Docs: http://localhost:5000/api-docs
```

**Terminal 2 - Frontend:**
```bash
cd frontend
npm run dev
# Runs on http://localhost:5173
```

**Terminal 3 - Java VA Service (Optional):**
```bash
cd services-java/va-service
./mvnw spring-boot:run  # macOS/Linux
mvnw.cmd spring-boot:run  # Windows
# Runs on http://localhost:8136
```

**Note:** MongoDB must be running. See [Developer Setup Guide](docs/DEVELOPER_SETUP.md) for details.

### Eclipse IDE Setup (Java Services)

For Java microservices development using Eclipse IDE:

📘 **[Eclipse Setup Guide](docs/ECLIPSE_SETUP.md)** - Complete Eclipse IDE configuration

The guide includes:
- **Installation:** Download and install Eclipse IDE for Enterprise Java
- **Workspace Setup:** Create and configure Eclipse workspace
- **Project Import:** Import VA Service Maven project
- **Run Configurations:** Pre-configured launch files for running and debugging
- **Debugging:** Breakpoints, hot code replace, debug controls
- **Troubleshooting:** Common issues and solutions

**Pre-configured Run Configurations:**
- `VA Service - Maven Run.launch` - Run with Maven Spring Boot plugin
- `VA Service - Maven Debug.launch` - Run with remote debugging enabled (port 5005)
- `VA Service - Java Application.launch` - Run as standard Java application
- `VA Service - Remote Debug.launch` - Attach debugger to running process

**Location:** `services-java/va-service/.eclipse/*.launch`

**Quick Start with Eclipse:**
1. Install Eclipse IDE for Enterprise Java and Web Developers
2. Create workspace: `File → Switch Workspace → Other → [your-workspace]`
3. Import project: `File → Import → Maven → Existing Maven Projects`
4. Select: `services-java/va-service`
5. Import launch configurations from `.eclipse` folder
6. Run: `Run → Run Configurations → VA Service - Maven Run`

See [Eclipse Setup Guide](docs/ECLIPSE_SETUP.md) for detailed instructions.

## API Documentation

### API Endpoints

For a complete list of all API endpoints with detailed request/response schemas, authentication requirements, and examples, see:

📖 **[Interactive API Documentation (Swagger UI)](http://localhost:5000/api-docs)** - Available when backend is running

📄 **[OpenAPI Specification](backend-node/openapi.yaml)** - Complete API specification (OpenAPI 3.0.3)

The interactive documentation includes:
- All available endpoints organized by category
- Request/response schemas with examples
- Authentication methods (Cookie Auth, JWT Bearer Token)
- Try-it-out functionality for testing endpoints
- Query parameters and filtering options
- Error response formats and status codes

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

## Java 21 Upgrade Notes

### Why Upgrade to Java 21?

Java 21 is a **Long-Term Support (LTS)** release with significant improvements:

**Performance:**
- 🚀 Virtual threads (Project Loom) - Lightweight concurrency for high-throughput applications
- ⚡ Generational ZGC - Improved garbage collection with lower latency
- 📈 JIT compiler improvements - Better runtime optimization

**Language Features:**
- ✨ Record patterns (preview) - Enhanced pattern matching
- 🎯 Pattern matching for switch - More expressive conditional logic
- 📝 String templates (preview) - Safer string interpolation
- 🔒 Sequenced collections - Predictable collection ordering

**Security & Stability:**
- 🛡️ Security updates through September 2031 (8+ years)
- 🔐 Enhanced cryptographic algorithms
- 📦 Better encapsulation with strong module system

### Migration Path

**1. Update Java Installation:**

```bash
# Check current version
java -version

# Windows (using Chocolatey)
choco install openjdk21

# macOS (using Homebrew)
brew install openjdk@21

# Linux (Ubuntu/Debian)
sudo apt update
sudo apt install openjdk-21-jdk

# Verify installation
java -version  # Should show version 21.x.x
```

**2. Update Maven Configuration:**

Each Java service `pom.xml` needs updating:

```xml
<!-- FROM: Java 17 -->
<properties>
    <java.version>17</java.version>
    <maven.compiler.source>17</maven.compiler.source>
    <maven.compiler.target>17</maven.compiler.target>
</properties>

<!-- TO: Java 21 -->
<properties>
    <java.version>21</java.version>
    <maven.compiler.source>21</maven.compiler.source>
    <maven.compiler.target>21</maven.compiler.target>
</properties>
```

**Files to update:**
- `services-java/va-service/pom.xml`
- `services-java/cv-service/pom.xml`
- `services-java/idp-service/pom.xml`
- `services-java/common-libs/pom.xml`

**3. Update JAVA_HOME Environment Variable:**

```bash
# Windows (PowerShell as Administrator)
[System.Environment]::SetEnvironmentVariable('JAVA_HOME', 'C:\Program Files\OpenJDK\jdk-21', 'Machine')

# macOS/Linux (add to ~/.bashrc or ~/.zshrc)
export JAVA_HOME=$(/usr/libexec/java_home -v 21)  # macOS
export JAVA_HOME=/usr/lib/jvm/java-21-openjdk      # Linux
export PATH=$JAVA_HOME/bin:$PATH

# Verify
echo $JAVA_HOME
java -version
```

**4. Rebuild Projects:**

```bash
# Clean and rebuild each service
cd services-java/va-service
./mvnw clean install

cd ../cv-service
./mvnw clean install

cd ../idp-service
./mvnw clean install

cd ../common-libs
./mvnw clean install
```

**5. Update IDE Configuration:**

**Eclipse:**
1. Window → Preferences → Java → Installed JREs
2. Add → Standard VM → Directory: `/path/to/jdk-21`
3. Check the box to make it default
4. Window → Preferences → Java → Compiler
5. Set "Compiler compliance level" to `21`
6. Right-click project → Properties → Java Build Path → Libraries
7. Remove old JRE, add JRE System Library [JavaSE-21]

**IntelliJ IDEA:**
1. File → Project Structure → Project
2. SDK: Select JDK 21 (or download if not available)
3. Language Level: `21 - Record patterns, pattern matching for switch`
4. File → Project Structure → Modules
5. Select each module → Dependencies tab → Module SDK: `Project SDK (21)`
6. File → Settings → Build, Execution, Deployment → Compiler → Java Compiler
7. Target bytecode version: `21`

**VS Code:**
1. Install "Extension Pack for Java" if not already installed
2. Open Settings (Ctrl+, / Cmd+,)
3. Search "java.configuration.runtimes"
4. Edit in settings.json:
```json
"java.configuration.runtimes": [
  {
    "name": "JavaSE-21",
    "path": "/path/to/jdk-21",
    "default": true
  }
]
```
5. Reload VS Code window

### Testing After Upgrade

```bash
# Run unit tests
cd services-java/va-service
./mvnw test

# Start service and verify
./mvnw spring-boot:run

# Check health endpoint
curl http://localhost:8136/actuator/health
```

### Known Compatibility Issues

✅ **Spring Boot 4.0.1** - Fully compatible with Java 21
✅ **gRPC** - Works with Java 21
✅ **MongoDB Driver** - Compatible
✅ **Log4j2** - Compatible

⚠️ **Potential Issues:**
- Third-party libraries using internal APIs (rare)
- Deprecated API usage (compiler warnings)
- JVM flags may need adjustment for GC (use `-XX:+UseZGC` for Generational ZGC)

### Performance Tuning for Java 21

**Recommended JVM Flags:**

```bash
# For high-concurrency applications (Virtual Threads)
java -XX:+UseZGC \
     -XX:+ZGenerational \
     -Xms512m -Xmx2g \
     -jar your-app.jar

# For low-latency requirements
java -XX:+UseZGC \
     -XX:+ZGenerational \
     -XX:MaxGCPauseMillis=10 \
     -jar your-app.jar
```

**application.yml optimization:**

```yaml
spring:
  threads:
    virtual:
      enabled: true  # Enable virtual threads for Tomcat
```

### Benefits for This Platform

| Feature | Impact |
|---------|--------|
| **Virtual Threads** | Handle 10,000+ concurrent voice/chat sessions with minimal memory |
| **Generational ZGC** | Reduce GC pauses from 100ms → <10ms (99th percentile) |
| **Pattern Matching** | Cleaner code in gRPC request handlers |
| **LTS Support** | Security updates until 2031 |
| **Better Performance** | 15-20% throughput improvement in benchmarks |

### Rollback Plan

If issues arise, rollback is simple:

1. Revert `pom.xml` changes to Java 17
2. Switch JAVA_HOME back to JDK 17
3. Rebuild: `./mvnw clean install`
4. Restart services

### Additional Resources

- [Java 21 Release Notes](https://openjdk.org/projects/jdk/21/)
- [Spring Boot 3.x and Java 21](https://spring.io/blog/2023/09/20/spring-boot-3-2-0-m3-available-now)
- [Virtual Threads Guide](https://openjdk.org/jeps/444)
- [Generational ZGC](https://openjdk.org/jeps/439)

---

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
- **API Documentation (Swagger):** http://localhost:5000/api-docs
- **VA Service (Java):** http://localhost:8136 (REST), port 50051 (gRPC)
- **IDP Service (Java):** http://localhost:8137 (REST + gRPC)
- **CV Service (Java):** http://localhost:8138 (REST + gRPC)
- **LM Studio (LLM):** http://localhost:1234/v1 (OpenAI-compatible)
- **Whisper STT Server:** http://localhost:8000 (dev only)
- **MongoDB:** mongodb://localhost:27017
- **Redis:** redis://localhost:6379

## Recent Updates

### Latest Features (January 2026)

**☎️ VoIP Multi-Provider Support** *(Jan 22, 2026)*
- ✅ **Universal VoIP Integration** - Support for ANY VoIP provider (Twilio, Vonage, Bandwidth)
- ✅ **Adapter Pattern** - BaseVoipAdapter with provider-specific implementations
- ✅ **Auto-Detection** - Automatically detect provider from webhook format
- ✅ **Provider-Agnostic Backend** - Same Java services work with all providers
- ✅ **Webhook Signature Validation** - Security for each provider (SHA1, JWT, User-Agent)
- ✅ **Universal Endpoint** - Single `/api/voice/incoming` endpoint for all providers
- ✅ **Response Format Generation** - TwiML XML, NCCO JSON, BXML XML as needed
- ✅ **Complete Documentation** - Setup guides, webhook examples, testing instructions
- 📚 See [Voice Endpoints Architecture](docs/VOICE_ENDPOINTS_ARCHITECTURE.md), [VoIP Provider Configuration](docs/VOIP_PROVIDER_CONFIGURATION.md), [Multi-Provider Support](docs/VOIP_MULTI_PROVIDER_SUPPORT.md)

**🎤 Voice Streaming (STT/TTS) - Phases 6-7 Complete** *(Jan 21, 2026)*
- ✅ **Phase 6: Whisper STT Server** - Python Flask server with OpenAI Whisper (port 8000)
- ✅ **Phase 7: Frontend Enhancement** - Complete voice UI with real-time features
- ✅ Local speech-to-text for development (zero Azure costs)
- ✅ Real-time transcription display with interim results
- ✅ TTS audio playback with Azure Neural voices
- ✅ Audio visualization (live waveforms during recording/playback)
- ✅ Voice status indicators (listening 🎤, processing ⚙️, speaking 🔊)
- ✅ Enhanced error handling (microphone permissions, connectivity)
- ✅ Voice Demo page at `/voice-demo` with full documentation
- ✅ Multi-model support (tiny, base, small, medium, large)
- ✅ Automated setup scripts (start-server.bat, PowerShell)
- ✅ Phases 1-7 complete (95.2% overall progress)
- 📚 See [Phase 6 Complete](docs/PHASE-6-WHISPER-SERVER-COMPLETE.md), [Phase 7 Complete](docs/PHASE-7-FRONTEND-ENHANCEMENT-COMPLETE.md), [Implementation Plan](docs/STT-TTS-IMPLEMENTATION-PLAN.md)

**🛡️ Circuit Breaker & Resilience**
- ✅ Circuit breaker pattern implementation (CLOSED/OPEN/HALF_OPEN states)
- ✅ Automatic failure detection with 5 failure threshold
- ✅ Exponential backoff retry logic (1s → 2s → 4s with jitter)
- ✅ Real-time circuit monitor UI with clickable badge
- ✅ Circuit state dropdown with statistics and reset button
- ✅ 70+ API calls protected across frontend and backend

**🔌 Backend Infrastructure**
- ✅ Centralized API client service with retry logic
- ✅ WebSocket/Socket.IO integration with circuit breaker
- ✅ gRPC client implementations for Java microservices
- ✅ MongoDB models and improved data layer
- ✅ Enhanced middleware for authentication and authorization
- ✅ Swagger/OpenAPI 3.0.3 documentation integration

**🎨 Frontend Enhancements**
- ✅ Product-specific configuration pages by category
- ✅ Prompt configuration with unsaved changes tracking
- ✅ Real-time WebSocket communication (Socket.IO 4.8+)
- ✅ CircuitMonitor component with live updates (2-second polling)
- ✅ Enhanced error boundaries and error handling
- ✅ Responsive layout with dynamic settings positioning
- ✅ Custom hooks for API calls and state management

**📊 Data & Configuration**
- ✅ MongoDB indexes for product configurations
- ✅ Template seeding with 7 industry-specific templates
- ✅ Unique compound indexes (tenantId, productId, status)
- ✅ Chat session and assistant channels collections
- ✅ Payment methods and transactions support

**📚 Documentation**
- ✅ Comprehensive circuit breaker documentation (3 guides)
- ✅ Technology features guide with benefits/downsides
- ✅ Updated developer setup guide
- ✅ Backend-specific implementation documentation

### Bug Fixes

**Circuit Breaker & API Integration**
- Fixed TypeScript compilation errors in chat-routes.ts (20 errors resolved)
- Fixed duplicate console.error statements in chat message handling
- Fixed incomplete JSON responses in error handlers
- Fixed duplicate javaVAClient parameters in WebSocket handlers
- Fixed ttsAudio.length type checking in voice routes
- Fixed getCircuitState() returning string vs object expectations
- Fixed circuit breaker reset() not clearing all statistics (totalRequests, timestamps)
- Fixed CircuitMonitor badge not updating immediately after manual reset

**Frontend UI & UX**
- Fixed CSS border warning in Sidebar component
- Fixed settings dropdown positioning for PROJECT_ADMIN users
- Fixed userInfoContainer responsive behavior
- Fixed CircuitMonitor badge not being clickable
- Fixed missing tooltips on circuit monitor UI elements
- Fixed circuit state not refreshing after actions

**Backend & Services**
- Resolved layout spacing issues in main application
- Fixed missing fallback responses in API error scenarios
- Fixed session management in WebSocket connections
- Corrected dynamic copyright year calculation in footer

**Type Safety & Code Quality**
- Fixed ChatResponse interface with optional fields for WebSocket
- Fixed type assertions for Buffer objects in voice processing
- Added proper error boundaries for component failures
- Improved error message clarity across all API endpoints

## Next Steps

### 🎯 High Priority

- [ ] **User Management UI** - Create tenant admin interface for managing users
  - Assign roles (USER, TENANT_USER, TENANT_ADMIN)
  - View user activity and permissions
  - Invite new users to tenant
  - Related: [Product-Based Access Control](docs/PRODUCT_BASED_ACCESS_CONTROL.md), [Security Architecture](docs/SECURITY_ARCHITECTURE.md)

- [ ] **Email Verification Flow** - Implement email verification for new users
  - Send verification emails on registration
  - Token-based verification links
  - Resend verification email option
  - Related: Email templates in `backend-node/emails/`

- [ ] **Password Reset** - Add forgot password flow for local authentication
  - Reset token generation and expiration
  - Email-based reset links
  - Secure password update process

- [ ] **Comprehensive Testing** - Expand test coverage across platform
  - Unit tests for services and utilities
  - Integration tests for API endpoints
  - E2E tests for critical user flows
  - Related: [Testing Strategy](docs/TESTING_STRATEGY.md)

### 🔧 Infrastructure & DevOps

- [ ] **Redis Integration for Java Services** - ⚠️ **Required for load balancing**
  - Session storage for multi-instance deployments
  - Circuit breaker state sharing
  - API response caching
  - LLM response caching (90% cost reduction)
  - **📖 See [Redis Implementation Guide](docs/REDIS_IMPLEMENTATION_GUIDE.md) when scaling horizontally**
  - Related: [Caching Strategies](docs/CACHING_STRATEGIES.md), [Technology Features](docs/TECHNOLOGY_FEATURES.md)
  - Status: Backend-Node ✅ using Redis | Java Services ⚠️ using in-memory (not production-ready)

- [ ] **Rate Limiting & Throttling** - Implement API rate limiting
  - Per-endpoint rate limits
  - Per-user/tenant quotas
  - DDoS protection
  - Related: [API Design Standards](docs/API_DESIGN_STANDARDS.md#rate-limiting)

- [ ] **Advanced Monitoring** - Implement comprehensive logging and monitoring
  - Prometheus metrics collection
  - Grafana dashboards
  - Distributed tracing (Jaeger/Zipkin)
  - Alert system for critical issues
  - Related: [Logging & Monitoring](docs/LOGGING_MONITORING.md), [Technology Features](docs/TECHNOLOGY_FEATURES.md)

- [ ] **Backup & Restore** - Implement automated backup procedures
  - MongoDB automated backups
  - Point-in-time recovery
  - Disaster recovery procedures
  - Per-tenant data export

### 📊 Features & Enhancements

- [ ] **Admin Dashboard** - Create comprehensive dashboard for SUPER_ADMIN users
  - System-wide metrics and analytics
  - Tenant management interface
  - User activity monitoring
  - Service health status

- [ ] **Audit Logging** - Track configuration changes and user actions
  - Who changed what and when
  - Configuration version history
  - Compliance reporting
  - Related: [Database Patterns](docs/DATABASE_PATTERNS.md)

- [ ] **Advanced Circuit Breaker** - Enhance circuit breaker functionality
  - Per-endpoint circuit breakers
  - Adaptive timeout configuration
  - Bulkhead pattern for resource isolation
  - Related: [Circuit Breaker Implementation](backend-node/CIRCUIT_BREAKER_IMPLEMENTATION.md), [External APIs](docs/EXTERNAL_APIS.md)

- [ ] **WebHook System** - Implement outbound webhook support
  - Event-based notifications
  - Webhook retry logic
  - Signature verification
  - Related: [Webhook Handling](docs/WEBHOOK_HANDLING.md)

### ✅ Already Implemented

- ✅ **Subscription and Billing** - Payment methods, transactions, and subscription management
  - Related: [Payment System](docs/PAYMENT_SYSTEM.md), [Payment Testing](backend-node/PAYMENT_TESTING.md)
  
- ✅ **WebSocket Support** - Real-time features with Socket.IO
  - Related: [WebSocket Implementation](docs/WEBSOCKET_IMPLEMENTATION.md), [WebSocket Quick Start](docs/WEBSOCKET_QUICK_START.md)
  
- ✅ **Circuit Breaker Pattern** - Resilience and failure detection
  - Related: [Circuit Breaker User Guide](docs/CIRCUIT_BREAKER_USER_GUIDE.md)
  
- ✅ **gRPC Integration** - Backend-to-Java microservice communication
  - Related: [gRPC Implementation](docs/GRPC_IMPLEMENTATION.md)

- ✅ **Multi-Tenant Architecture** - Complete tenant isolation
  - Related: [Tenant Validation](docs/TENANT_VALIDATION_AND_REDIRECT.md)

## Documentation

> 📋 **[Documentation Assessment & Improvement Plan](docs/DOCUMENTATION_ASSESSMENT_AND_IMPROVEMENTS.md)** - Complete analysis of 100+ documents, identified gaps, priorities, and 18 action items with timeline

### 🚀 Critical Foundation Documentation (Start Here!)
- [Developer Setup Guide](docs/DEVELOPER_SETUP.md) - Complete environment setup, prerequisites, IDE configuration, common commands
- [Scripts Reference Guide](docs/SCRIPTS_REFERENCE.md) - All available scripts (npm, Maven, PowerShell), usage examples, common workflows
- [Technology Features Guide](docs/TECHNOLOGY_FEATURES.md) - Key technology features, benefits, downsides, and improvement roadmap
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
- [Frontend README](frontend/docs/README.md) - React frontend documentation
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

#### 🔄 Communication Workflows & Integration
- **[Voice Endpoints Architecture](docs/VOICE_ENDPOINTS_ARCHITECTURE.md)** - Complete comparison of UI voice vs VoIP voice workflows, webhook examples for all providers (Twilio, Vonage, Bandwidth), endpoint documentation, request/response formats, protocol differences
- **[VoIP Provider Configuration](docs/VOIP_PROVIDER_CONFIGURATION.md)** - Setup guide for Twilio, Vonage, and Bandwidth with webhook URLs, environment variables, testing examples, security configuration
- **[VoIP Multi-Provider Support](docs/VOIP_MULTI_PROVIDER_SUPPORT.md)** - Adapter pattern implementation, auto-detection, universal webhook endpoint, provider-agnostic architecture
- [WebSocket Detailed Flow](docs/WEBSOCKET_DETAILED_FLOW.md) - Complete WebSocket lifecycle, connection, rooms, bidirectional message flow, typing indicators, method reference tables (6000+ lines)
- [gRPC Streaming Flow](docs/GRPC_STREAMING_FLOW.md) - Protocol Buffers definitions, Java gRPC server, Node.js client, streaming patterns, bidirectional voice streaming (4000+ lines)
- [Method Handlers Reference](docs/METHOD_HANDLERS_REFERENCE.md) - Complete API reference for all methods: Frontend Socket, Backend Socket, gRPC Client, Java Server, Business Logic with code examples (7000+ lines)
- [End-to-End Integration Guide](docs/END_TO_END_INTEGRATION_GUIDE.md) - Complete message journey walkthrough with 8-stage breakdown, timing analysis (3.15s total), optimization opportunities, debugging guide (5000+ lines)
- [Error Handling Patterns](docs/ERROR_HANDLING_PATTERNS.md) - Circuit breaker implementation, retry logic with exponential backoff, fallback strategies, error classification, monitoring and observability (5000+ lines)

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
