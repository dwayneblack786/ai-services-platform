# Maven CLI Helper Guide

Complete reference for managing the VA-Service using PowerShell scripts and Maven commands.

## 📑 Table of Contents

- [Quick Start](#quick-start)
- [Script Files](#script-files)
- [Common Workflows](#common-workflows)
- [Function Reference](#function-reference)
- [Maven Command Reference](#maven-command-reference)
- [Troubleshooting](#troubleshooting)
- [IDE Integration](#ide-integration)

---

## Quick Start

### Start Server (Simple)

```powershell
# Navigate to va-service directory
cd c:\Users\Owner\Documents\ai-services-platform\services-java\va-service

# Start the server
.\start-server.ps1
```

Server will be available at:
- **HTTP API:** http://localhost:8136
- **gRPC:** localhost:50051

### Start with Options

```powershell
# Start with remote debugging
.\start-server.ps1 -Debug

# Clean build before starting
.\start-server.ps1 -Clean

# Skip tests for faster startup
.\start-server.ps1 -Fast

# Combine options
.\start-server.ps1 -Clean -Fast -Debug
```

### Use Advanced Functions

```powershell
# Load all helper functions
. .\maven-cli.ps1

# Now use any function
Start-VaService
Build-VaServiceFast
Test-VaService
```

---

## Script Files

### 🚀 start-server.ps1

Simple quick-start script with common options.

**Location:** `services-java/va-service/start-server.ps1`

**Usage:**
```powershell
.\start-server.ps1 [options]
```

**Options:**
- `-Debug` - Start with remote debugging on port 5005
- `-Clean` - Run clean build before starting
- `-Fast` - Skip tests during build
- `-Help` - Display help information

**Examples:**
```powershell
# Normal start
.\start-server.ps1

# Debug mode (attach debugger to port 5005)
.\start-server.ps1 -Debug

# Clean build without tests
.\start-server.ps1 -Clean -Fast

# Show help
.\start-server.ps1 -Help
```

### 🛠️ maven-cli.ps1

Comprehensive PowerShell module with documented functions for all Maven operations.

**Location:** `services-java/va-service/maven-cli.ps1`

**Loading:**
```powershell
# Dot-source to load all functions into current session
. .\maven-cli.ps1
```

**Function Categories:**
- **Server Management** - Start, stop, debug server
- **Build & Compile** - Full builds, fast builds, compilation
- **Testing** - Run all tests or specific test classes
- **Cleanup** - Remove artifacts, deep clean
- **Dependencies** - View and update dependencies
- **IDE Integration** - Generate Eclipse/IntelliJ files
- **Code Quality** - Verify, format code
- **Package & Deploy** - Create JARs, run packaged apps
- **Information** - Project info, logs, help

---

## Common Workflows

### Development Workflow

```powershell
# 1. Load helper functions
. .\maven-cli.ps1

# 2. Start development server
Start-VaService

# 3. Make code changes...

# 4. Quick rebuild (skip tests)
# Ctrl+C to stop server, then:
Build-VaServiceFast

# 5. Restart server
Start-VaService
```

### Testing Workflow

```powershell
. .\maven-cli.ps1

# Run all tests
Test-VaService

# Run specific test class
Test-VaServiceSingle -TestClass "ChatServiceTest"

# Build with tests
Build-VaService
```

### Debugging Workflow

```powershell
# Start server with debugging
.\start-server.ps1 -Debug

# Or using function
. .\maven-cli.ps1
Start-VaServiceDebug
```

**Connect your debugger:**
- **Host:** localhost
- **Port:** 5005
- **Protocol:** JDWP

### Production Build Workflow

```powershell
. .\maven-cli.ps1

# 1. Clean everything
Reset-VaService

# 2. Full build with tests
Build-VaService

# 3. Package executable JAR
Package-VaService

# 4. Verify package
Get-Item target\va-service-0.0.1-SNAPSHOT.jar

# 5. Test packaged app
Start-VaServiceJar
```

### Fixing Eclipse Classpath Issues

```powershell
. .\maven-cli.ps1

# 1. Deep clean
Reset-VaService

# 2. Rebuild
Build-VaServiceFast

# 3. Generate Eclipse files
Setup-EclipseProject

# 4. In Eclipse: File → Import → Existing Projects
```

### Dependency Management

```powershell
. .\maven-cli.ps1

# View dependency tree
Show-VaServiceDeps

# Update snapshot dependencies
Update-VaServiceDeps

# Check for dependency updates
cd services-java\va-service
.\mvnw versions:display-dependency-updates
```

---

## Function Reference

### Server Management

#### Start-VaService
Start development server using Maven Spring Boot plugin.

```powershell
Start-VaService
```

**Features:**
- Hot reload enabled
- HTTP on port 8136
- gRPC on port 50051

#### Start-VaServiceDebug
Start server with remote debugging enabled.

```powershell
Start-VaServiceDebug
```

**Debug Configuration:**
- Port: 5005
- Suspend: No (starts immediately)
- Transport: Socket

#### Start-VaServiceJar
Run the packaged JAR file directly.

```powershell
Start-VaServiceJar
```

**Prerequisites:** Must run `Package-VaService` first.

#### Stop-VaService
Stop all running VA-Service Java processes.

```powershell
Stop-VaService
```

### Build & Compile

#### Build-VaService
Full Maven build with all tests.

```powershell
Build-VaService
```

**Phases:** clean, compile, test, package, install

#### Build-VaServiceFast
Fast build skipping tests.

```powershell
Build-VaServiceFast
```

**Use Case:** Quick iterations during development.

**Phases:** clean, compile, package, install (skip tests)

#### Compile-VaService
Compile source code only (no packaging).

```powershell
Compile-VaService
```

**Phases:** clean, compile

**Generates:**
- Protobuf classes
- gRPC stubs
- Compiled Java classes

#### Package-VaService
Create executable Spring Boot JAR.

```powershell
Package-VaService
```

**Output:** `target/va-service-0.0.1-SNAPSHOT.jar`

### Testing

#### Test-VaService
Run all unit tests.

```powershell
Test-VaService
```

#### Test-VaServiceSingle
Run a specific test class.

```powershell
Test-VaServiceSingle -TestClass "ChatServiceTest"
```

**Example:**
```powershell
Test-VaServiceSingle -TestClass "VoiceServiceImplTest"
Test-VaServiceSingle -TestClass "HealthServiceTest"
```

### Cleanup

#### Clean-VaService
Remove build artifacts (target/ directory).

```powershell
Clean-VaService
```

#### Reset-VaService
Deep clean - removes all Maven and IDE artifacts.

```powershell
Reset-VaService
```

**Removes:**
- target/ directory
- .classpath file
- .project file
- .settings/ directory

**When to use:**
- Build corruption
- Major dependency changes
- Eclipse classpath issues
- After pulling major changes from git

### Dependencies

#### Show-VaServiceDeps
Display dependency tree.

```powershell
Show-VaServiceDeps
```

**Output:** Hierarchical tree of all dependencies and transitive dependencies.

#### Update-VaServiceDeps
Force update of snapshot dependencies.

```powershell
Update-VaServiceDeps
```

**Flag:** `-U` (update snapshots)

### IDE Integration

#### Setup-EclipseProject
Generate Eclipse project files (.project, .classpath, .settings).

```powershell
Setup-EclipseProject
```

**Steps after running:**
1. File → Import → Existing Projects into Workspace
2. Browse to `va-service` directory
3. Select project
4. Click Finish

#### Setup-IntellijProject
Generate IntelliJ IDEA project files (.iml, .idea).

```powershell
Setup-IntellijProject
```

**Steps after running:**
1. File → Open
2. Select `pom.xml` in va-service directory
3. Choose "Open as Project"

### Code Quality

#### Verify-VaService
Run full verification (build + tests + integration tests).

```powershell
Verify-VaService
```

**Use Case:** Pre-commit verification, CI/CD preparation.

#### Format-VaServiceCode
Format Java code using formatter plugin.

```powershell
Format-VaServiceCode
```

**Note:** Requires `maven-formatter-plugin` in pom.xml.

### Information & Utilities

#### Get-VaServiceInfo
Display project information (artifact ID, version, name).

```powershell
Get-VaServiceInfo
```

#### Show-MavenHelp
Display Maven lifecycle phases and common plugin goals.

```powershell
Show-MavenHelp
```

#### Watch-VaServiceLogs
Tail application logs in real-time.

```powershell
Watch-VaServiceLogs
```

**Log Path:** `logs/application.log`

**Stop watching:** Press Ctrl+C

---

## Maven Command Reference

### Direct Maven Commands

If you prefer using Maven directly instead of PowerShell functions:

```powershell
# Navigate to va-service
cd c:\Users\Owner\Documents\ai-services-platform\services-java\va-service

# Use mvnw (Maven wrapper)
```

### Lifecycle Phases

```powershell
# Clean
.\mvnw clean

# Validate
.\mvnw validate

# Compile
.\mvnw compile

# Test
.\mvnw test

# Package
.\mvnw package

# Verify
.\mvnw verify

# Install
.\mvnw install

# Deploy (to remote repo)
.\mvnw deploy
```

### Common Plugin Goals

```powershell
# Run Spring Boot app
.\mvnw spring-boot:run

# Run with debug
$env:MAVEN_OPTS="-agentlib:jdwp=transport=dt_socket,server=y,suspend=n,address=*:5005"
.\mvnw spring-boot:run

# Dependency tree
.\mvnw dependency:tree

# Analyze dependencies
.\mvnw dependency:analyze

# Check for updates
.\mvnw versions:display-dependency-updates

# Generate Eclipse files
.\mvnw eclipse:eclipse

# Generate IntelliJ files
.\mvnw idea:idea

# Skip tests
.\mvnw install -DskipTests

# Update snapshots
.\mvnw clean install -U

# Specific test
.\mvnw test -Dtest=ChatServiceTest

# Multiple tests
.\mvnw test -Dtest=ChatServiceTest,VoiceServiceTest

# Run single test method
.\mvnw test -Dtest=ChatServiceTest#testCreateSession
```

### Build Profiles

```powershell
# Development profile
.\mvnw clean install -Pdev

# Production profile
.\mvnw clean install -Pprod

# Test profile
.\mvnw clean install -Ptest
```

### Useful Flags

```powershell
# Skip tests
-DskipTests

# Update snapshots
-U

# Offline mode
-o

# Quiet output
-q

# Debug output
-X

# Show version
-V

# Fail at end
-fae

# Fail never
-fn

# Threads (parallel build)
-T 4
```

---

## Troubleshooting

### Problem: "Unknown Product" on Subscription Page

**Solution:** Restart Node.js backend to load subscription route fixes:

```powershell
# Kill existing Node.js processes
Get-Process -Name node | Stop-Process -Force

# Start backend
cd c:\Users\Owner\Documents\ai-services-platform\backend-node
npm run dev
```

### Problem: Eclipse Shows ClassNotFoundException

**Root Cause:** Eclipse classpath not recognizing generated protobuf sources.

**Solution 1 - Use Maven Command Line (Recommended):**
```powershell
.\start-server.ps1
```

**Solution 2 - Fix Eclipse Build Path:**
```powershell
. .\maven-cli.ps1
Reset-VaService
Build-VaServiceFast
Setup-EclipseProject
```

Then in Eclipse:
1. Right-click project → Refresh
2. Project → Clean → Clean all projects
3. Close and reopen project

**Solution 3 - Manual Build Path:**
1. Right-click project → Properties
2. Java Build Path → Source
3. Add Folder: `target/generated-sources/protobuf/java`
4. Add Folder: `target/generated-sources/protobuf/grpc-java`

### Problem: Port Already in Use

**Error:** `Address already in use: bind`

**Solution:**
```powershell
# Find process using port 8136
netstat -ano | findstr :8136

# Kill process (replace PID)
Stop-Process -Id <PID> -Force

# Or use function
. .\maven-cli.ps1
Stop-VaService
```

### Problem: Build Fails with Compilation Errors

**Solution:**
```powershell
. .\maven-cli.ps1

# Deep clean
Reset-VaService

# Rebuild
Build-VaService

# Check for errors
Get-Item target\classes\com\ai\va\
```

### Problem: Tests Failing

**Debug Tests:**
```powershell
# Run with debug output
.\mvnw test -X

# Run specific failing test
.\mvnw test -Dtest=ChatServiceTest

# Skip tests temporarily
.\mvnw install -DskipTests
```

### Problem: Dependency Conflicts

**Analyze Dependencies:**
```powershell
. .\maven-cli.ps1

# View full tree
Show-VaServiceDeps

# Analyze for issues
.\mvnw dependency:analyze

# Find specific dependency
.\mvnw dependency:tree -Dincludes=org.springframework:*
```

### Problem: Out of Memory During Build

**Increase Maven Memory:**
```powershell
$env:MAVEN_OPTS="-Xmx2048m -XX:MaxPermSize=512m"
.\mvnw clean install
```

### Problem: Stale Generated Code

**Regenerate Protobuf Classes:**
```powershell
. .\maven-cli.ps1
Clean-VaService
Compile-VaService
```

---

## IDE Integration

### Eclipse IDE

#### Initial Setup

1. **Import Project:**
   ```powershell
   . .\maven-cli.ps1
   Setup-EclipseProject
   ```

2. **In Eclipse:**
   - File → Import → Existing Projects into Workspace
   - Browse to `services-java/va-service`
   - Select project → Finish

3. **Configure Build Path:**
   - Right-click project → Properties
   - Java Build Path → Source
   - Verify generated sources are included:
     - `target/generated-sources/protobuf/java`
     - `target/generated-sources/protobuf/grpc-java`

#### Running in Eclipse

**Method 1 - Maven Run Configuration:**
- Right-click `pom.xml` → Run As → Maven Build
- Goals: `spring-boot:run`
- Click Run

**Method 2 - Launch Configuration:**
- Open `va-serviceMaven Run.launch`
- Run → Run Configurations → Maven Build
- Select configuration → Run

**Method 3 - Main Class:**
- Right-click `VaServiceApplication.java`
- Run As → Java Application

#### Debugging in Eclipse

1. Right-click `pom.xml` → Debug As → Maven Build
2. Goals: `spring-boot:run`
3. Environment → MAVEN_OPTS: `-agentlib:jdwp=transport=dt_socket,server=y,suspend=y,address=*:5005`
4. Debug

### IntelliJ IDEA

#### Initial Setup

1. **Generate Project Files:**
   ```powershell
   . .\maven-cli.ps1
   Setup-IntellijProject
   ```

2. **Open in IntelliJ:**
   - File → Open
   - Select `pom.xml` in va-service directory
   - Choose "Open as Project"

#### Running in IntelliJ

**Method 1 - Maven Tool Window:**
- View → Tool Windows → Maven
- va-service → Plugins → spring-boot → spring-boot:run
- Double-click to run

**Method 2 - Run Configuration:**
- Run → Edit Configurations → + → Maven
- Name: "VA Service"
- Command line: `spring-boot:run`
- Working directory: `services-java/va-service`
- Run

**Method 3 - Main Class:**
- Navigate to `VaServiceApplication.java`
- Click green arrow next to class
- Run 'VaServiceApplication'

#### Debugging in IntelliJ

1. Run → Edit Configurations → + → Maven
2. Name: "VA Service Debug"
3. Command line: `spring-boot:run`
4. Runner → Environment Variables:
   - `MAVEN_OPTS`: `-agentlib:jdwp=transport=dt_socket,server=y,suspend=n,address=*:5005`
5. Debug (Shift+F9)

### VS Code

#### Running in VS Code

**Method 1 - Tasks:**
- Terminal → Run Task
- Select "Infero: Maven Run"

**Method 2 - Terminal:**
```powershell
.\start-server.ps1
```

**Method 3 - Java Extension:**
- Install "Extension Pack for Java"
- Open `VaServiceApplication.java`
- Click "Run" above main method

#### Debugging in VS Code

1. Install "Debugger for Java" extension
2. Create `.vscode/launch.json`:
```json
{
  "version": "0.2.0",
  "configurations": [
    {
      "type": "java",
      "name": "VA Service Debug",
      "request": "attach",
      "hostName": "localhost",
      "port": 5005
    }
  ]
}
```
3. Run: `.\start-server.ps1 -Debug`
4. F5 to attach debugger

---

## Related Documentation

- **[VA Service README](README.md)** - Project overview, structure, API endpoints
- **[Developer Setup Guide](../../docs/DEVELOPER_SETUP.md)** - Complete development environment setup
- **[Testing Guide](../../docs/TESTING_GUIDE.md)** - Testing strategies and best practices
- **[Scripts Reference](../../docs/SCRIPTS_REFERENCE.md)** - All project scripts (npm, Maven, PowerShell)
- **[Troubleshooting Guide](../../docs/TROUBLESHOOTING.md)** - Common issues and solutions
- **[Eclipse Setup](../../docs/ECLIPSE_SETUP.md)** - Eclipse-specific configuration
- **[gRPC Implementation](../../docs/GRPC_IMPLEMENTATION.md)** - gRPC service architecture

---

## PowerShell Tips

### Get Help for Functions

```powershell
# Load functions first
. .\maven-cli.ps1

# Get function help
Get-Help Start-VaService

# Detailed help
Get-Help Start-VaService -Detailed

# Show examples
Get-Help Start-VaService -Examples

# Show all parameters
Get-Help Start-VaService -Full
```

### Create Aliases

```powershell
# Add to PowerShell profile
Set-Alias -Name vas -Value Start-VaService
Set-Alias -Name vab -Value Build-VaServiceFast
Set-Alias -Name vat -Value Test-VaService

# Use aliases
vas  # Start server
vab  # Build fast
vat  # Run tests
```

### Load Functions Automatically

Add to your PowerShell profile (`$PROFILE`):

```powershell
# Auto-load Maven CLI when in va-service directory
function Load-VaServiceCli {
    $scriptPath = "c:\Users\Owner\Documents\ai-services-platform\services-java\va-service\maven-cli.ps1"
    if (Test-Path $scriptPath) {
        . $scriptPath
        Write-Host "✅ VA-Service CLI loaded" -ForegroundColor Green
    }
}

# Create alias
Set-Alias -Name load-va -Value Load-VaServiceCli
```

Then use:
```powershell
load-va
Start-VaService
```

---

## Quick Reference Card

```
╔═══════════════════════════════════════════════════════════════╗
║                    VA-SERVICE QUICK REFERENCE                 ║
╠═══════════════════════════════════════════════════════════════╣
║ START SERVER                                                  ║
║   .\start-server.ps1              Simple start                ║
║   .\start-server.ps1 -Debug       With debugging (port 5005)  ║
║   .\start-server.ps1 -Clean       Clean build first           ║
║                                                               ║
║ LOAD FUNCTIONS                                                ║
║   . .\maven-cli.ps1               Load all functions          ║
║                                                               ║
║ COMMON FUNCTIONS                                              ║
║   Start-VaService                 Start dev server            ║
║   Start-VaServiceDebug            Start with debugging        ║
║   Build-VaService                 Full build with tests       ║
║   Build-VaServiceFast             Build without tests         ║
║   Test-VaService                  Run all tests               ║
║   Clean-VaService                 Remove build artifacts      ║
║   Reset-VaService                 Deep clean (Maven + IDE)    ║
║   Setup-EclipseProject            Fix Eclipse classpath       ║
║   Stop-VaService                  Stop running server         ║
║                                                               ║
║ MAVEN COMMANDS                                                ║
║   .\mvnw spring-boot:run          Run server                  ║
║   .\mvnw clean install            Full build                  ║
║   .\mvnw clean install -DskipTests  Fast build                ║
║   .\mvnw test                     Run tests                   ║
║   .\mvnw dependency:tree          Show dependencies           ║
║   .\mvnw eclipse:eclipse          Generate Eclipse files      ║
║                                                               ║
║ SERVER URLS                                                   ║
║   http://localhost:8136           HTTP API                    ║
║   localhost:50051                 gRPC                        ║
║   localhost:5005                  Remote debugger             ║
║                                                               ║
║ HELP                                                          ║
║   .\start-server.ps1 -Help        Script help                 ║
║   Show-MavenHelp                  Maven commands              ║
║   Get-Help Start-VaService        Function help               ║
╚═══════════════════════════════════════════════════════════════╝
```

---

**Last Updated:** January 22, 2026  
**Version:** 1.0  
**Maintainer:** Development Team
