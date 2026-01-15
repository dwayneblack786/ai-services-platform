# Developer Setup Guide

Complete guide for setting up the AI Services Platform development environment locally.

## Table of Contents
1. [System Requirements](#system-requirements)
2. [Prerequisites Installation](#prerequisites-installation)
3. [Repository Setup](#repository-setup)
4. [Environment Configuration](#environment-configuration)
5. [Service Startup](#service-startup)
6. [Verification](#verification)
7. [IDE Configuration](#ide-configuration)
8. [Troubleshooting](#troubleshooting)

---

## System Requirements

### Minimum Hardware
- **RAM**: 8GB (16GB recommended)
- **Disk Space**: 20GB free
- **CPU**: Quad-core (Intel/Apple Silicon/AMD)

### Operating Systems
- Windows 10+ (PowerShell 7+ or CMD)
- macOS 10.15+
- Linux (Ubuntu 20.04+, CentOS 8+)

---

## Prerequisites Installation

### 1. Node.js & npm

**Required Version**: Node.js 16+ (18+ recommended)

```bash
# Windows (via Chocolatey)
choco install nodejs

# macOS (via Homebrew)
brew install node

# Linux (Ubuntu)
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Verify installation
node --version    # v18.x.x or higher
npm --version     # 8.x.x or higher
```

### 2. Java Development Kit (JDK)

**Required Version**: Java 17+ (for Spring Boot 4.0.1)

```bash
# Windows (via Chocolatey)
choco install openjdk17

# macOS (via Homebrew)
brew install openjdk@17

# Linux (Ubuntu)
sudo apt-get install openjdk-17-jdk

# Verify installation
java -version     # Java 17.x.x
javac -version    # javac 17.x.x
```

### 3. Maven

**Required Version**: Maven 3.6+

```bash
# Windows (via Chocolatey)
choco install maven

# macOS (via Homebrew)
brew install maven

# Linux (Ubuntu)
sudo apt-get install maven

# Verify installation
mvn --version     # Apache Maven 3.8.x
```

**Note**: Java services include Maven Wrapper (`mvnw` / `mvnw.cmd`), so Maven is optional if using wrapper.

### 4. MongoDB

**Required Version**: MongoDB 5.0+ (6.0+ recommended)

```bash
# Windows (via Chocolatey)
choco install mongodb-community

# macOS (via Homebrew)
brew install mongodb-community

# Linux (Ubuntu)
sudo apt-get install -y mongodb-org

# Start MongoDB service
# Windows: MongoDB runs as service (starts automatically)
# macOS: brew services start mongodb-community
# Linux: sudo systemctl start mongod

# Verify connection
mongosh    # Connect to local MongoDB (or mongo for older versions)
```

**Local Configuration**:
- **Host**: localhost
- **Port**: 27017
- **Database**: ai_platform

### 5. Git

```bash
# Windows (via Chocolatey)
choco install git

# macOS (via Homebrew)
brew install git

# Linux (Ubuntu)
sudo apt-get install git

# Verify installation
git --version     # git version 2.x.x
```

### 6. Optional but Recommended Tools

```bash
# VS Code (recommended IDE)
choco install vscode              # Windows
brew install --cask visual-studio-code  # macOS
sudo snap install code --classic  # Linux

# Postman (API testing)
choco install postman             # Windows
brew install --cask postman       # macOS

# DBeaver (MongoDB GUI)
choco install dbeaver             # Windows
brew install --cask dbeaver-community  # macOS
```

---

## Repository Setup

### 1. Clone Repository

```bash
git clone https://github.com/your-org/ai-services-platform.git
cd ai-services-platform
```

### 2. Install Frontend Dependencies

```bash
cd frontend
npm install
# or
yarn install
```

### 3. Install Backend Dependencies

```bash
cd ../backend-node
npm install
# or
yarn install
```

### 4. Java Services (Optional)

The Java services use Maven Wrapper (no separate installation needed):

```bash
cd services-java/va-service
./mvnw clean install    # macOS/Linux
# or
mvnw.cmd clean install  # Windows
```

---

## Environment Configuration

### 1. Backend-Node (.env)

Create `backend-node/.env`:

```env
# Server
PORT=5000
NODE_ENV=development

# Database
MONGODB_URI=mongodb://localhost:27017/ai_platform
MONGODB_HOST=localhost
MONGODB_PORT=27017
MONGODB_DATABASE=ai_platform

# OAuth2 (Google)
GOOGLE_CLIENT_ID=your_google_client_id_here
GOOGLE_CLIENT_SECRET=your_google_client_secret_here
GOOGLE_CALLBACK_URL=http://localhost:5000/api/auth/google/callback

# Session & JWT
SESSION_SECRET=your_session_secret_here_change_in_production
JWT_SECRET=your_jwt_secret_here_change_in_production
JWT_EXPIRATION=24h

# Frontend
CLIENT_URL=http://localhost:5173
VITE_API_URL=http://localhost:5000

# Stripe (Payment)
STRIPE_SECRET_KEY=sk_test_your_key_here
STRIPE_PUBLIC_KEY=pk_test_your_key_here
STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret

# Email (Optional)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password

# Twilio (Voice/SMS)
TWILIO_ACCOUNT_SID=your_account_sid
TWILIO_AUTH_TOKEN=your_auth_token
TWILIO_PHONE_NUMBER=+1234567890

# Infero API Configuration (Java Services)
INFERO_API_BASE_URL=http://localhost:8136
INFERO_API_KEY=your_api_key_here

# Logging
LOG_LEVEL=debug
LOG_DIR=./logs

# Features
ENABLE_DEV_LOGIN=true          # Allow /api/auth/dev-login in development
ENABLE_WEBSOCKET=true          # Enable WebSocket/Socket.IO
```

**Getting Google OAuth Credentials**:
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create new project
3. Enable Google+ API
4. Create OAuth 2.0 credentials (Web application)
5. Add authorized redirect URIs: `http://localhost:5000/api/auth/google/callback`

**Generate Random Secrets**:

For `SESSION_SECRET` and `JWT_SECRET`, use:

```bash
# Node.js method (recommended)
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# OpenSSL method
openssl rand -hex 32
```

### 2. Frontend (.env)

Create `frontend/.env`:

```env
VITE_API_URL=http://localhost:5000
VITE_USE_WEBSOCKET=true
```

### 3. MongoDB Initial Setup

**Step 1: Create Database and Collections**

```bash
# Connect to MongoDB
mongosh

# In mongosh shell:
use ai_platform

# Create indexes (will be done by seed scripts too)
db.users.createIndex({ email: 1 }, { unique: true })
db.users.createIndex({ tenantId: 1 })
db.assistant_channels.createIndex({ tenantId: 1, productId: 1 })
db.chat_sessions.createIndex({ tenantId: 1, userId: 1 })

# Verify database
show collections

# Exit mongosh
exit
```

**Step 2: Run Setup Scripts**

```bash
cd backend-node

# Create product configuration indexes
node scripts/create-product-config-indexes.js

# Verify setup
node scripts/verify-product-config-setup.js

# (Optional) Seed prompt templates
node scripts/seed-product-templates.js
```

---

## Service Startup

### Option 1: Run All Services (Recommended)

Open 4 terminals in the project root:

**Terminal 1 - MongoDB** (if not running as service)
```bash
mongod
```

**Terminal 2 - Backend**
```bash
cd backend-node
npm run dev
# Runs on http://localhost:5000
```

**Terminal 3 - Frontend**
```bash
cd frontend
npm run dev
# Runs on http://localhost:5173
```

**Terminal 4 - Java VA Service** (optional, for voice/chat features)
```bash
cd services-java/va-service
./mvnw spring-boot:run
# Runs on http://localhost:8136
```

### Option 2: Use VS Code Tasks

Tasks are pre-configured in `.vscode/tasks.json`:

1. Open Command Palette: `Ctrl+Shift+P` (Windows/Linux) or `Cmd+Shift+P` (macOS)
2. Type: **Tasks: Run Task**
3. Select from available tasks:
   - **VA Service: Maven Run** - Start VA microservice
   - **VA Service: Maven Run (Debug)** - Start VA with debugger attached
   - **VA Service: Maven Clean Install** - Build VA service
   - **VA Service: Maven Test** - Run VA service tests
   - **Infero: Maven Run** - Start Infero service
   - **Infero: Maven Clean Install** - Build Infero
   - **Infero: Maven Test** - Run Infero tests

Tasks will run in VS Code's integrated terminal with proper working directories.

### Option 3: Docker Compose (if available)

```bash
docker-compose up
```

### Production Build

For production deployment, build optimized versions:

**Backend:**
```bash
cd backend-node
npm run build
npm start
```

**Frontend:**
```bash
cd frontend
npm run build
npm run preview  # Preview production build locally
```

**Java Services:**
```bash
cd services-java/va-service
./mvnw clean package -DskipTests
java -jar target/va-service-*.jar
```

---

## Verification

### 1. Frontend Health Check

```bash
# Expected: Vite dev server running
curl http://localhost:5173
# Output: HTML page loads in browser
```

Open http://localhost:5173 in browser → Should see login page

### 2. Backend Health Check

```bash
# Expected: Health endpoint responds
curl http://localhost:5000/api/health
# Output: { "status": "ok" }
```

### 3. MongoDB Health Check

```bash
mongosh --eval "db.runCommand('ping')"
# Output: { ok: 1 }
```

### 4. OAuth Flow Test

1. Go to http://localhost:5173
2. Click "Sign in with Google"
3. Login with Google account
4. Should redirect to `/dashboard`

### 5. Full Integration Test

```bash
# Test backend auth
curl -X POST http://localhost:5000/api/auth/dev-login

# Expected: Cookie-based session established
```

---

## IDE Configuration

### VS Code Setup (Recommended)

**1. Install Extensions**
```
Extensions → Install:
- ESLint (Microsoft)
- Prettier (Esbenp)
- Thunder Client (Rangav) [for API testing]
- MongoDB for VS Code (MongoDB)
- Thunder Client REST Client
- TypeScript Vue Plugin (Vue)
```

**2. Create `.vscode/settings.json`**

```json
{
  "editor.defaultFormatter": "esbenp.prettier-vscode",
  "editor.formatOnSave": true,
  "editor.codeActionsOnSave": {
    "source.fixAll.eslint": true
  },
  "typescript.tsdk": "node_modules/typescript/lib",
  "[json]": {
    "editor.defaultFormatter": "esbenp.prettier-vscode"
  },
  "typescript.enablePromptUseWorkspaceTsdk": true
}
```

**3. Recommended File Structure**

Open workspace root: `File → Open Folder → ai-services-platform`

### IntelliJ / WebStorm Setup

**1. Enable TypeScript Support**
- Preferences → Languages & Frameworks → TypeScript
- TypeScript version: Use project's TypeScript

**2. Configure Run Configurations**
- Run → Edit Configurations
- Add "npm" configuration for `dev` script

**3. Enable ESLint**
- Preferences → Languages & Frameworks → JavaScript → Code Quality Tools → ESLint
- Enable ESLint

### JetBrains IntelliJ for Java

**1. Open Java Projects**
- File → Open → services-java/va-service
- Let IntelliJ index and detect Maven

**2. Create Run Configuration**
- Run → Edit Configurations → Add "Maven"
- Working directory: `services-java/va-service`
- Command line: `spring-boot:run`

---

## Common Commands Reference

### Frontend Commands

```bash
cd frontend

# Development
npm run dev                # Start dev server (hot reload)
npm run build              # Build for production
npm run preview            # Preview production build
npm run lint               # Run ESLint
npm run type-check         # Run TypeScript compiler

# Testing
npm test                   # Run test suite
npm test -- --coverage     # Generate coverage report
```

### Backend Commands

```bash
cd backend-node

# Development
npm run dev                # Start with nodemon (auto-reload)
npm run build              # Build TypeScript
npm start                  # Start compiled JavaScript
npm run lint               # Run ESLint
npm run type-check         # Run TypeScript compiler

# Database
npm run seed:prompts       # Seed prompt configuration
npm run migrate             # Run database migrations (if any)

# Testing
npm test                   # Run test suite
npm test -- --coverage     # Generate coverage report
```

### Java Commands

```bash
cd services-java/va-service

# Development
./mvnw spring-boot:run     # Start service
./mvnw clean install       # Build project
./mvnw test                # Run tests

# With debugging
./mvnw spring-boot:run -Dspring-boot.run.jvmArguments="-Xdebug -Xrunjdwp:transport=dt_socket,server=y,suspend=n,address=*:5005"
```

---

## Port Reference

| Service | Port | URL |
|---------|------|-----|
| Frontend (Vite) | 5173 | http://localhost:5173 |
| Backend (Node.js) | 5000 | http://localhost:5000 |
| MongoDB | 27017 | mongodb://localhost:27017 |
| VA Service | 8136 | http://localhost:8136 |
| IDP Service | 8137 | http://localhost:8137 |
| CV Service | 8138 | http://localhost:8138 |

---

## Troubleshooting

### Port Already in Use

```bash
# Find process using port
# Windows
netstat -ano | findstr :5000

# macOS/Linux
lsof -i :5000

# Kill process
# Windows
taskkill /PID <PID> /F

# macOS/Linux
kill -9 <PID>
```

### MongoDB Connection Issues

```bash
# Check if MongoDB is running
mongosh

# If fails, start MongoDB:
# Windows: net start MongoDB
# macOS: brew services start mongodb-community
# Linux: sudo systemctl start mongod
```

### npm/Node Issues

```bash
# Clear cache and reinstall
rm -rf node_modules
rm package-lock.json
npm install

# Update npm
npm install -g npm@latest
```

### TypeScript Errors

```bash
# Regenerate types
npm run type-check

# Clear tsc cache
rm -rf .tsbuildinfo
```

### Java Build Issues

```bash
# Clean and rebuild
./mvnw clean install

# Skip tests if needed
./mvnw clean install -DskipTests
```

---

## Next Steps

1. ✅ Complete this setup
2. 📚 Read [SECURITY_ARCHITECTURE.md](SECURITY_ARCHITECTURE.md) for security overview
3. 🔧 Read [API_DESIGN_STANDARDS.md](API_DESIGN_STANDARDS.md) for API conventions
4. 🐛 Bookmark [TROUBLESHOOTING.md](TROUBLESHOOTING.md) for common issues
5. 📖 Read component-specific guides in docs/ folder

---

## Getting Help

- **Setup Issues**: See Troubleshooting section above
- **API Questions**: See openapi.yaml or `/api-docs` endpoint
- **Architecture Questions**: See [PROJECT_OVERVIEW.md](PROJECT_OVERVIEW.md)
- **Code Issues**: Check relevant feature documentation in docs/ folder
