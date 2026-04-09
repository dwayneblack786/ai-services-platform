# Scripts Reference Guide

Comprehensive guide to all available scripts in the AI Services Platform for development, testing, deployment, and maintenance.

---

## 📑 Table of Contents

- [Backend Scripts (Node.js)](#backend-scripts-nodejs)
  - [Development Scripts](#development-scripts)
  - [Build & Production Scripts](#build--production-scripts)
  - [Testing Scripts](#testing-scripts)
  - [Database Seeding Scripts](#database-seeding-scripts)
  - [Code Quality Scripts](#code-quality-scripts)
  - [Utility Scripts](#utility-scripts)
- [Frontend Scripts (React/Vite)](#frontend-scripts-reactvite)
  - [Development Scripts](#development-scripts-1)
  - [Build & Production Scripts](#build--production-scripts-1)
  - [Code Quality Scripts](#code-quality-scripts-1)
- [Java Service Scripts (Maven)](#java-service-scripts-maven)
  - [Build Scripts](#build-scripts)
  - [Run Scripts](#run-scripts)
  - [Test Scripts](#test-scripts)
  - [Debug Scripts](#debug-scripts)
- [PowerShell Utility Scripts](#powershell-utility-scripts)
  - [Port Management](#port-management)
  - [Data Export Scripts](#data-export-scripts)
  - [Testing Scripts](#testing-scripts-1)
  - [Service Management](#service-management)
- [VS Code Tasks](#vs-code-tasks)
  - [Available Tasks](#available-tasks)
  - [Running Tasks](#running-tasks)
- [Common Workflows](#common-workflows)
  - [First-Time Setup](#first-time-setup)
  - [Daily Development](#daily-development)
  - [Running Tests](#running-tests)
  - [Building for Production](#building-for-production)
  - [Database Management](#database-management)
  - [Troubleshooting](#troubleshooting)
- [Script Best Practices](#script-best-practices)

---

## Backend Scripts (Node.js)

All backend scripts are run from the `backend-node/` directory.

```bash
cd backend-node
npm run <script-name>
```

### Development Scripts

#### `npm run dev`
**Description**: Start backend server in development mode with hot reload

**What it does**:
- Validates startup prerequisites (MongoDB connection, required env vars)
- Starts Node.js server with nodemon for auto-restart
- Watches for file changes in `src/` directory
- Includes source maps for debugging
- Runs on port 5000 (default)

**Usage**:
```bash
npm run dev
```

**Environment**: Development
**Requires**: MongoDB running, `.env` file configured

**Output**:
```
✅ Validation successful!
[nodemon] starting `ts-node src/index.ts`
🚀 Server running on http://localhost:5000
🗄️  MongoDB connected successfully
```

---

### Build & Production Scripts

#### `npm run build`
**Description**: Compile TypeScript to JavaScript

**What it does**:
- Compiles `src/` TypeScript files to `dist/` JavaScript
- Generates source maps
- Type checks all files
- Creates production-ready build

**Usage**:
```bash
npm run build
```

**Output**: Compiled files in `dist/` directory

---

#### `npm run build:clean`
**Description**: Clean build directory and rebuild from scratch

**What it does**:
- Removes `dist/` directory
- Runs `npm run build`

**Usage**:
```bash
npm run build:clean
```

**Use when**: Build artifacts are corrupted or outdated

---

#### `npm run clean`
**Description**: Remove compiled build artifacts

**What it does**:
- Deletes `dist/` directory using rimraf

**Usage**:
```bash
npm run clean
```

---

#### `npm start`
**Description**: Start production server (requires build)

**What it does**:
- Runs compiled JavaScript from `dist/index.js`
- No hot reload (production mode)
- Requires prior `npm run build`

**Usage**:
```bash
npm run build
npm start
```

**Environment**: Production

---

#### `npm run start:prod`
**Description**: Clean build and start production server

**What it does**:
- Runs `npm run build:clean`
- Runs `npm start`

**Usage**:
```bash
npm run start:prod
```

**Use when**: Deploying to production or staging

---

### Testing Scripts

#### `npm test`
**Description**: Run all tests once with Jest

**What it does**:
- Executes all test files (`*.test.ts`, `*.spec.ts`)
- Uses Jest with ts-jest transformer
- Exits after completion

**Usage**:
```bash
npm test
```

**Coverage report**: `coverage/` directory

---

#### `npm run test:watch`
**Description**: Run tests in watch mode (re-run on file changes)

**What it does**:
- Starts Jest in watch mode
- Re-runs tests when source files change
- Interactive mode with keyboard shortcuts

**Usage**:
```bash
npm run test:watch
```

**Keyboard shortcuts**:
- `p` - Filter by filename
- `t` - Filter by test name
- `a` - Run all tests
- `q` - Quit watch mode

---

#### `npm run test:coverage`
**Description**: Run tests with coverage report

**What it does**:
- Runs all tests
- Generates coverage report (HTML, JSON, LCOV)
- Shows coverage percentages per file

**Usage**:
```bash
npm run test:coverage
```

**Reports**:
- Console: Summary coverage table
- HTML: `coverage/lcov-report/index.html`
- LCOV: `coverage/lcov.info`

**Coverage thresholds**:
- Statements: 80%
- Branches: 80%
- Functions: 80%
- Lines: 80%

---

#### `npm run test:unit`
**Description**: Run only unit tests

**What it does**:
- Executes tests in `tests/unit/` directory
- Isolated component/function tests

**Usage**:
```bash
npm run test:unit
```

---

#### `npm run test:integration`
**Description**: Run only integration tests

**What it does**:
- Executes tests in `tests/integration/` directory
- Tests API endpoints and database interactions

**Usage**:
```bash
npm run test:integration
```

**Requires**: MongoDB test database

---

#### `npm run test:e2e`
**Description**: Run end-to-end tests

**What it does**:
- Executes tests in `tests/e2e/` directory
- Full application flow tests

**Usage**:
```bash
npm run test:e2e
```

**Requires**: All services running (backend, MongoDB)

---

#### `npm run test:ci`
**Description**: Run tests in CI/CD pipeline mode

**What it does**:
- Runs all tests once (no watch mode)
- Generates coverage report
- Uses `--ci` flag for deterministic output
- Limited to 2 worker threads (CI resource constraint)

**Usage**:
```bash
npm run test:ci
```

**Environment**: CI/CD pipelines (GitHub Actions, Azure DevOps)

---

#### `npm run test:all`
**Description**: Run unit, integration, and E2E tests sequentially

**What it does**:
- Runs `test:unit`
- Runs `test:integration`
- Runs `test:e2e`
- Stops on first failure

**Usage**:
```bash
npm run test:all
```

**Use when**: Pre-deployment validation

---

### Database Seeding Scripts

All seeding scripts use `ts-node` to execute TypeScript directly.

#### `npm run seed:products`
**Description**: Seed product catalog

**What it does**:
- Creates product entries in MongoDB
- Seeds Virtual Assistant, IDP, CV products
- Sets up product metadata

**Usage**:
```bash
npm run seed:products
```

**File**: `src/scripts/seed-products.ts`

---

#### `npm run seed:prompts`
**Description**: Seed legacy prompt configurations (v1)

**What it does**:
- Creates initial prompt templates (v1 schema)
- Sets up default system prompts

**Usage**:
```bash
npm run seed:prompts
```

**File**: `src/scripts/seed-prompt-config.ts`
**Note**: Use `seed:prompts:v2` for new installations

---

#### `npm run seed:prompts:v2`
**Description**: Seed prompt configurations (v2 schema)

**What it does**:
- Creates prompt templates with v2 schema
- Includes RAG configurations
- Sets up multi-turn conversation templates

**Usage**:
```bash
npm run seed:prompts:v2
```

**File**: `src/scripts/seed-prompt-config-v2.ts`
**Recommended**: Use this for new setups

---

#### `npm run seed:templates`
**Description**: Seed industry-specific templates

**What it does**:
- Creates 7 industry templates:
  - Healthcare
  - Financial Services
  - E-commerce
  - Education
  - Legal Services
  - Real Estate
  - Customer Support

**Usage**:
```bash
npm run seed:templates
```

**File**: `src/scripts/seed-templates.ts`

---

#### `npm run seed:all`
**Description**: Run all seeding scripts in sequence

**What it does**:
- Runs `seed:products`
- Runs `seed:prompts:v2`
- Runs `seed:templates`

**Usage**:
```bash
npm run seed:all
```

**Use when**: First-time database setup or reset

---

#### `npm run cleanup:templates`
**Description**: Remove old/orphaned templates

**What it does**:
- Deletes unused prompt templates
- Cleans up duplicate entries
- Archives deprecated templates

**Usage**:
```bash
npm run cleanup:templates
```

**File**: `src/scripts/cleanup-old-templates.ts`

---

### Code Quality Scripts

#### `npm run lint`
**Description**: Check code for linting errors

**What it does**:
- Runs ESLint on `src/` and `tests/` directories
- Checks TypeScript files (`.ts` extension)
- Reports errors and warnings

**Usage**:
```bash
npm run lint
```

**Exit codes**:
- `0` - No errors
- `1` - Errors found

---

#### `npm run lint:fix`
**Description**: Automatically fix linting errors

**What it does**:
- Runs ESLint with `--fix` flag
- Auto-fixes formatting issues
- Reports unfixable errors

**Usage**:
```bash
npm run lint:fix
```

**Use when**: Before committing code

---

#### `npm run format`
**Description**: Alias for `lint:fix`

**Usage**:
```bash
npm run format
```

---

#### `npm run check`
**Description**: Run linting and tests

**What it does**:
- Runs `npm run lint`
- Runs `npm test`

**Usage**:
```bash
npm run check
```

**Use when**: Pre-commit checks

---

#### `npm run validate`
**Description**: Full validation (lint + build + test)

**What it does**:
- Runs `npm run lint`
- Runs `npm run build`
- Runs `npm test`

**Usage**:
```bash
npm run validate
```

**Use when**: Pre-push, pre-deployment validation

---

### Utility Scripts

#### `npm run validate:startup`
**Description**: Validate startup prerequisites

**What it does**:
- Checks MongoDB connection
- Validates environment variables
- Verifies required services

**Usage**:
```bash
npm run validate:startup
```

**File**: `scripts/validate-startup.js`

---

#### `npm run prepare`
**Description**: Post-install hook (runs automatically)

**What it does**:
- Runs `npm run build:clean` after `npm install`
- Ensures fresh build after dependency changes

**Usage**: Automatic (no manual execution needed)

---

## Frontend Scripts (React/Vite)

All frontend scripts are run from the `frontend/` directory.

```bash
cd frontend
npm run <script-name>
```

### Development Scripts

#### `npm run dev`
**Description**: Start Vite dev server with hot module replacement (HMR)

**What it does**:
- Starts development server on port 5173
- Enables HMR (instant updates without page refresh)
- Proxies `/api` requests to backend (port 5000)

**Usage**:
```bash
npm run dev
```

**Environment**: Development
**Access**: http://localhost:5173

**Output**:
```
VITE v5.0.10  ready in 500 ms

➜  Local:   http://localhost:5173/
➜  Network: use --host to expose
```

---

### Build & Production Scripts

#### `npm run build`
**Description**: Build production-optimized bundle

**What it does**:
- Compiles TypeScript (`tsc`)
- Bundles with Vite (optimized for production)
- Minifies JavaScript and CSS
- Generates `dist/` directory

**Usage**:
```bash
npm run build
```

**Output**: `dist/` directory with optimized files

**Optimization**:
- Code splitting
- Tree shaking
- Minification
- Source maps (optional)

---

#### `npm run preview`
**Description**: Preview production build locally

**What it does**:
- Serves built files from `dist/`
- Runs on port 4173 (default)
- Simulates production environment

**Usage**:
```bash
npm run build
npm run preview
```

**Access**: http://localhost:4173
**Use when**: Testing production build before deployment

---

### Code Quality Scripts

#### `npm run lint`
**Description**: Check code for linting errors

**What it does**:
- Runs ESLint on all TypeScript/TSX files
- Checks for unused disable directives
- Maximum warnings: 0 (strict mode)

**Usage**:
```bash
npm run lint
```

**Exit codes**:
- `0` - No errors/warnings
- `1` - Errors or warnings found

---

## Java Service Scripts (Maven)

Java services use Maven Wrapper (`mvnw` / `mvnw.cmd`) for consistency.

All commands run from service directory (e.g., `services-java/va-service/`).

📖 **[Complete Maven CLI Guide](../services-java/va-service/MAVEN_CLI_GUIDE.md)** - PowerShell helper functions, all workflows, IDE integration

### Quick Start Scripts

#### PowerShell Quick Start

```powershell
# Navigate to service
cd services-java/va-service

# Simple start
.\start-server.ps1

# With debugging (port 5005)
.\start-server.ps1 -Debug

# Clean build first
.\start-server.ps1 -Clean -Fast
```

#### PowerShell Helper Functions

```powershell
# Load helper functions
. .\maven-cli.ps1

# Use functions
Start-VaService              # Start server
Build-VaServiceFast          # Build without tests
Test-VaService               # Run tests
Reset-VaService              # Deep clean
Setup-EclipseProject         # Fix Eclipse classpath
```

See [MAVEN_CLI_GUIDE.md](../services-java/va-service/MAVEN_CLI_GUIDE.md) for complete function reference.

### Build Scripts

#### `./mvnw clean install`
**Description**: Clean build directory and install dependencies

**What it does**:
- Removes `target/` directory
- Downloads dependencies
- Compiles Java source files
- Runs unit tests
- Packages JAR file
- Installs to local Maven repository

**Usage**:
```bash
cd services-java/va-service
./mvnw clean install          # macOS/Linux
mvnw.cmd clean install        # Windows
```

**Output**: `target/va-service-*.jar`

---

#### `./mvnw clean install -DskipTests`
**Description**: Build without running tests (faster)

**Usage**:
```bash
./mvnw clean install -DskipTests
```

**Use when**: Quick builds, tests already passed

---

#### `./mvnw clean package`
**Description**: Build JAR without installing to local repository

**Usage**:
```bash
./mvnw clean package
```

**Use when**: Creating deployment artifact

---

### Run Scripts

#### `./mvnw spring-boot:run`
**Description**: Start Spring Boot application

**What it does**:
- Compiles code if needed
- Starts embedded Tomcat server
- Runs application with default profile
- Port 8136 (VA Service)

**Usage**:
```bash
./mvnw spring-boot:run
```

**Environment**: Development
**Access**: http://localhost:8136

---

#### `./mvnw spring-boot:run -Dspring-boot.run.profiles=dev`
**Description**: Run with specific Spring profile

**Usage**:
```bash
./mvnw spring-boot:run -Dspring-boot.run.profiles=dev
```

**Available profiles**:
- `dev` - Development settings
- `prod` - Production settings
- `test` - Testing settings

---

### Test Scripts

#### `./mvnw test`
**Description**: Run unit tests

**What it does**:
- Executes JUnit tests in `src/test/java/`
- Generates test reports
- Shows pass/fail summary

**Usage**:
```bash
./mvnw test
```

**Reports**: `target/surefire-reports/`

---

#### `./mvnw verify`
**Description**: Run tests and integration tests

**What it does**:
- Runs `test` phase
- Runs integration tests
- Verifies build artifacts

**Usage**:
```bash
./mvnw verify
```

---

### Debug Scripts

#### `./mvnw spring-boot:run -Dspring-boot.run.jvmArguments="-Xdebug -Xrunjdwp:transport=dt_socket,server=y,suspend=n,address=*:5005"`
**Description**: Run with remote debugging enabled

**What it does**:
- Starts application with debugger port 5005
- Allows IDE to attach debugger
- `suspend=n` - Don't wait for debugger

**Usage**:
```bash
./mvnw spring-boot:run -Dspring-boot.run.jvmArguments="-Xdebug -Xrunjdwp:transport=dt_socket,server=y,suspend=n,address=*:5005"
```

**Attach debugger**:
- IntelliJ: Run → Attach to Process → Select port 5005
- Eclipse: Debug Configurations → Remote Java Application → Port 5005
- VS Code: Use launch.json with `"type": "java"` and `"request": "attach"`

---

## PowerShell Utility Scripts

PowerShell scripts for development workflow automation.

### Port Management

#### `kill-dev-ports.ps1`
**Description**: Free all development ports by killing processes

**Location**: `kill-dev-ports.ps1` (project root)

**What it does**:
- Checks ports: 5000, 5173, 8136, 50051-50053
- Identifies processes using those ports
- Kills processes gracefully
- Verifies ports are freed
- Optional database port cleanup

**Usage**:
```powershell
# Kill application ports only
.\kill-dev-ports.ps1

# Include MongoDB (27017) and Redis (6379)
.\kill-dev-ports.ps1 -IncludeDatabase
```

**Ports covered**:
- 5000 - Node.js Backend
- 5173 - Vite Frontend
- 8136 - Java VA Service
- 50051-50053 - gRPC Services
- 27017 - MongoDB (optional)
- 6379 - Redis (optional)

**Output**:
```
🔍 Checking for processes on development ports...

  🔴 Port 5000 (Node.js Backend) - PID 12345 (node)
     ✅ Killed successfully
  ✓ Port 5173 (Vite Frontend) - Free
  🔴 Port 8136 (Java VA Service) - PID 67890 (java)
     ✅ Killed successfully

📊 Summary:
   Processes killed: 2
   Ports already free: 4
   Total ports checked: 6

✅ All critical ports are free! Ready to start development servers.
```

**Use when**:
- Server won't start (port in use error)
- Switching between projects
- After abnormal shutdown
- Before starting development workflow

---

### Data Export Scripts

#### `export-prompt-config.ps1`
**Description**: Export prompt configurations from MongoDB

**Location**: `export-prompt-config.ps1` (project root)

**What it does**:
- Connects to MongoDB
- Queries prompt_configurations collection
- Exports to JSON file
- Formats output for readability

**Usage**:
```powershell
.\export-prompt-config.ps1
```

**Output**: `prompt-configuration.json`

**Use when**:
- Backing up prompt configurations
- Migrating between environments
- Documenting current settings

---

### Testing Scripts

#### `test-voice-streaming.ps1`
**Description**: Test voice streaming functionality (WebSocket + gRPC)

**Location**: `test-voice-streaming.ps1` (project root)

**What it does**:
- Validates environment setup
- Tests WebSocket connection
- Tests gRPC streaming
- Sends sample audio data
- Validates responses

**Usage**:
```powershell
.\test-voice-streaming.ps1
```

**Requires**: Backend and VA service running

---

#### `test-whisper-integration.ps1`
**Description**: Test Whisper STT server integration

**Location**: `test-whisper-integration.ps1` (project root)

**What it does**:
- Checks Whisper server status (port 8000)
- Sends sample audio for transcription
- Validates STT response
- Tests error handling

**Usage**:
```powershell
.\test-whisper-integration.ps1
```

**Requires**: Whisper server running (`services-python/whisper-server/`)

---

### Service Management

#### `services-python/whisper-server/start-whisper.ps1`
**Description**: Start Whisper STT server (Python Flask)

**Location**: `services-python/whisper-server/start-whisper.ps1`

**What it does**:
- Activates Python virtual environment
- Installs dependencies if missing
- Starts Flask server on port 8000
- Loads Whisper model (configurable size)

**Usage**:
```powershell
cd services-python/whisper-server
.\start-whisper.ps1
```

**Model sizes**: tiny, base, small, medium, large
**Configuration**: Edit script to change model size

---

#### `services-java/va-service/verify-protobuf.ps1`
**Description**: Verify Protocol Buffer compilation

**Location**: `services-java/va-service/verify-protobuf.ps1`

**What it does**:
- Checks `.proto` files
- Verifies generated Java classes
- Reports compilation status

**Usage**:
```powershell
cd services-java/va-service
.\verify-protobuf.ps1
```

---

#### `services-java/va-service/test-llm-config.ps1`
**Description**: Test LLM configuration (LM Studio)

**Location**: `services-java/va-service/test-llm-config.ps1`

**What it does**:
- Checks LM Studio connection (port 1234)
- Tests model availability
- Sends sample prompt
- Validates response

**Usage**:
```powershell
cd services-java/va-service
.\test-llm-config.ps1
```

**Requires**: LM Studio running with loaded model

---

## VS Code Tasks

Pre-configured tasks in `.vscode/tasks.json` for one-click execution.

### Available Tasks

| Task Name | Description | Working Directory |
|-----------|-------------|-------------------|
| **Infero: Maven Run** | Start VA Service with Maven | `services-java/Infero` |
| **Infero: Maven Clean Install** | Build VA Service | `services-java/Infero` |
| **Infero: Maven Test** | Run VA Service tests | `services-java/Infero` |

### Running Tasks

**Method 1: Command Palette**
1. Press `Ctrl+Shift+P` (Windows/Linux) or `Cmd+Shift+P` (macOS)
2. Type: `Tasks: Run Task`
3. Select task from list

**Method 2: Keyboard Shortcut**
1. Press `Ctrl+Shift+B` (default build task)
2. Or configure custom keyboard shortcuts

**Method 3: Terminal Menu**
1. Terminal → Run Task...
2. Select task

---

## Common Workflows

### First-Time Setup

Run these scripts in order for initial project setup:

```bash
# 1. Install dependencies
cd frontend
npm install

cd ../backend-node
npm install

cd ../services-java/va-service
./mvnw clean install

# 2. Seed database
cd ../../backend-node
npm run seed:all

# 3. Verify setup
npm run validate:startup
```

---

### Daily Development

Start all services for development:

```bash
# Terminal 1 - Free ports (if needed)
.\kill-dev-ports.ps1

# Terminal 2 - Backend
cd backend-node
npm run dev

# Terminal 3 - Frontend
cd frontend
npm run dev

# Terminal 4 - Java VA Service (optional)
cd services-java/va-service
./mvnw spring-boot:run
```

---

### Running Tests

Full test suite across all services:

```bash
# Backend tests
cd backend-node
npm run test:all

# Frontend tests (when implemented)
cd frontend
npm test

# Java service tests
cd services-java/va-service
./mvnw test
```

---

### Building for Production

Create production builds:

```bash
# Backend
cd backend-node
npm run start:prod

# Frontend
cd frontend
npm run build
npm run preview  # Test before deploying

# Java services
cd services-java/va-service
./mvnw clean package -DskipTests
java -jar target/va-service-*.jar
```

---

### Database Management

Common database operations:

```bash
# Seed all data
cd backend-node
npm run seed:all

# Seed specific data
npm run seed:products
npm run seed:prompts:v2
npm run seed:templates

# Export data
cd ../..
.\export-prompt-config.ps1

# Clean up old templates
cd backend-node
npm run cleanup:templates
```

---

### Troubleshooting

Quick fixes for common issues:

```bash
# Port conflicts
.\kill-dev-ports.ps1

# Dependency issues
cd backend-node
rm -rf node_modules
npm install

cd ../frontend
rm -rf node_modules
npm install

# Build errors
cd backend-node
npm run build:clean

# Test MongoDB connection
npm run validate:startup

# Verify environment
node -v          # Check Node.js version
mongosh --version # Check MongoDB version
java -version    # Check Java version
```

---

## Script Best Practices

### Backend Scripts

1. **Always validate startup**: Run `npm run validate:startup` before first dev run
2. **Use `lint:fix` before commits**: Auto-fix formatting issues
3. **Run `test:all` before push**: Ensure all tests pass
4. **Prefer `seed:all` over individual seeds**: Ensures consistency

### Frontend Scripts

1. **Test production build locally**: Run `npm run preview` before deploying
2. **Fix lint errors before commit**: Keep warnings at 0
3. **Clear browser cache**: If HMR behaves oddly, hard refresh

### Java Scripts

1. **Use Maven Wrapper**: Ensures consistent Maven version (`./mvnw` not `mvn`)
2. **Clean before release builds**: `clean install` not just `install`
3. **Skip tests for quick iteration**: `-DskipTests` when testing manually

### PowerShell Scripts

1. **Check execution policy**: May need `Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser`
2. **Run with `-IncludeDatabase` carefully**: Only when not using persistent data
3. **Verify port freedom**: Check output to ensure ports are freed

### General

1. **Read script output**: Many scripts provide helpful troubleshooting info
2. **Check exit codes**: Non-zero exit code = error occurred
3. **Use appropriate script for task**: Don't use production scripts in dev
4. **Keep scripts updated**: Run `npm install` after pulling changes

---

## See Also

- [Developer Setup Guide](DEVELOPER_SETUP.md) - Complete environment setup
- [Troubleshooting Guide](TROUBLESHOOTING.md) - Common issues and solutions
- [Testing Strategy](TESTING_STRATEGY.md) - Testing best practices
- [Deployment Guide](DEPLOYMENT_CHANGES_SUMMARY.md) - Production deployment

---

**Last Updated**: January 22, 2026
