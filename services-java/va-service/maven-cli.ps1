# ============================================================================
# VA-Service Maven CLI Helper Script
# ============================================================================
# This script provides convenient functions for managing the va-service
# Java application using Maven commands.
#
# Usage: . .\maven-cli.ps1  (dot-source to load functions)
# Then call any function like: Start-VaService, Build-VaService, etc.
# ============================================================================

$VaServicePath = "c:\Users\Owner\Documents\ai-services-platform\services-java\va-service"

# ----------------------------------------------------------------------------
# SERVER MANAGEMENT
# ----------------------------------------------------------------------------

function Start-VaService {
    <#
    .SYNOPSIS
        Starts the VA-Service using Maven Spring Boot plugin
    .DESCRIPTION
        Runs the Spring Boot application in development mode with hot reload
        Server runs on: http://localhost:8136
        gRPC runs on: localhost:50051
    .EXAMPLE
        Start-VaService
    #>
    Write-Host "🚀 Starting VA-Service..." -ForegroundColor Green
    Set-Location $VaServicePath
    .\mvnw spring-boot:run
}

function Start-VaServiceDebug {
    <#
    .SYNOPSIS
        Starts VA-Service with remote debugging enabled
    .DESCRIPTION
        Starts with debug agent on port 5005 for remote debugging
        Connect your IDE debugger to localhost:5005
    .EXAMPLE
        Start-VaServiceDebug
    #>
    Write-Host "🐛 Starting VA-Service in DEBUG mode..." -ForegroundColor Yellow
    Write-Host "Debug port: 5005" -ForegroundColor Yellow
    Set-Location $VaServicePath
    $env:MAVEN_OPTS = "-agentlib:jdwp=transport=dt_socket,server=y,suspend=n,address=*:5005"
    .\mvnw spring-boot:run
}

# ----------------------------------------------------------------------------
# BUILD & COMPILE
# ----------------------------------------------------------------------------

function Build-VaService {
    <#
    .SYNOPSIS
        Full Maven build with tests
    .DESCRIPTION
        Runs clean, compile, test, and package phases
        Creates executable JAR in target/ directory
    .EXAMPLE
        Build-VaService
    #>
    Write-Host "🔨 Building VA-Service (with tests)..." -ForegroundColor Green
    Set-Location $VaServicePath
    .\mvnw clean install
}

function Build-VaServiceFast {
    <#
    .SYNOPSIS
        Fast build without running tests
    .DESCRIPTION
        Skips test execution for faster builds
        Use for quick iterations during development
    .EXAMPLE
        Build-VaServiceFast
    #>
    Write-Host "⚡ Fast building VA-Service (skipping tests)..." -ForegroundColor Green
    Set-Location $VaServicePath
    .\mvnw clean install -DskipTests
}

function Compile-VaService {
    <#
    .SYNOPSIS
        Compile source code only (no packaging)
    .DESCRIPTION
        Runs clean and compile phases
        Generates protobuf/gRPC classes and compiles Java sources
    .EXAMPLE
        Compile-VaService
    #>
    Write-Host "⚙️  Compiling VA-Service..." -ForegroundColor Green
    Set-Location $VaServicePath
    .\mvnw clean compile
}

# ----------------------------------------------------------------------------
# TESTING
# ----------------------------------------------------------------------------

function Test-VaService {
    <#
    .SYNOPSIS
        Run all unit tests
    .DESCRIPTION
        Executes all test classes using Maven Surefire plugin
    .EXAMPLE
        Test-VaService
    #>
    Write-Host "🧪 Running tests..." -ForegroundColor Green
    Set-Location $VaServicePath
    .\mvnw test
}

function Test-VaServiceSingle {
    <#
    .SYNOPSIS
        Run a specific test class
    .PARAMETER TestClass
        Name of the test class (e.g., ChatSessionServiceTest)
    .EXAMPLE
        Test-VaServiceSingle -TestClass "ChatSessionServiceTest"
    #>
    param(
        [Parameter(Mandatory=$true)]
        [string]$TestClass
    )
    Write-Host "🧪 Running test: $TestClass..." -ForegroundColor Green
    Set-Location $VaServicePath
    .\mvnw test -Dtest=$TestClass
}

# ----------------------------------------------------------------------------
# CLEANUP
# ----------------------------------------------------------------------------

function Clean-VaService {
    <#
    .SYNOPSIS
        Clean build artifacts
    .DESCRIPTION
        Removes target/ directory and all compiled files
    .EXAMPLE
        Clean-VaService
    #>
    Write-Host "🧹 Cleaning build artifacts..." -ForegroundColor Yellow
    Set-Location $VaServicePath
    .\mvnw clean
}

function Reset-VaService {
    <#
    .SYNOPSIS
        Deep clean - removes all Maven and IDE artifacts
    .DESCRIPTION
        Cleans target/, .settings/, .classpath, .project
        Use this when build is corrupted or after major changes
    .EXAMPLE
        Reset-VaService
    #>
    Write-Host "🔄 Deep cleaning VA-Service..." -ForegroundColor Yellow
    Set-Location $VaServicePath
    
    Write-Host "  Cleaning Maven artifacts..." -ForegroundColor Gray
    .\mvnw clean
    
    Write-Host "  Removing IDE files..." -ForegroundColor Gray
    Remove-Item -Path ".classpath",".project",".settings" -Recurse -Force -ErrorAction SilentlyContinue
    
    Write-Host "✅ Reset complete. Re-import project in your IDE." -ForegroundColor Green
}

# ----------------------------------------------------------------------------
# DEPENDENCIES
# ----------------------------------------------------------------------------

function Show-VaServiceDeps {
    <#
    .SYNOPSIS
        Display dependency tree
    .DESCRIPTION
        Shows all project dependencies in tree format
        Useful for debugging dependency conflicts
    .EXAMPLE
        Show-VaServiceDeps
    #>
    Write-Host "📦 Showing dependency tree..." -ForegroundColor Green
    Set-Location $VaServicePath
    .\mvnw dependency:tree
}

function Update-VaServiceDeps {
    <#
    .SYNOPSIS
        Update snapshot dependencies
    .DESCRIPTION
        Forces Maven to check for updated snapshot versions
    .EXAMPLE
        Update-VaServiceDeps
    #>
    Write-Host "🔄 Updating dependencies..." -ForegroundColor Green
    Set-Location $VaServicePath
    .\mvnw clean install -U
}

# ----------------------------------------------------------------------------
# CODE QUALITY
# ----------------------------------------------------------------------------

function Format-VaServiceCode {
    <#
    .SYNOPSIS
        Format Java code using Maven formatter
    .DESCRIPTION
        Applies code formatting rules to all Java files
        (Requires maven-formatter-plugin in pom.xml)
    .EXAMPLE
        Format-VaServiceCode
    #>
    Write-Host "✨ Formatting code..." -ForegroundColor Green
    Set-Location $VaServicePath
    .\mvnw formatter:format
}

function Verify-VaService {
    <#
    .SYNOPSIS
        Run full verification (build + tests + checks)
    .DESCRIPTION
        Runs all build phases including integration tests
        Use before committing or deploying
    .EXAMPLE
        Verify-VaService
    #>
    Write-Host "✔️  Running full verification..." -ForegroundColor Green
    Set-Location $VaServicePath
    .\mvnw verify
}

# ----------------------------------------------------------------------------
# IDE INTEGRATION
# ----------------------------------------------------------------------------

function Setup-EclipseProject {
    <#
    .SYNOPSIS
        Generate Eclipse project files
    .DESCRIPTION
        Creates .project, .classpath, and .settings for Eclipse
        Run this after cloning or when classpath issues occur
    .EXAMPLE
        Setup-EclipseProject
    #>
    Write-Host "🔧 Generating Eclipse project files..." -ForegroundColor Green
    Set-Location $VaServicePath
    .\mvnw eclipse:eclipse
    Write-Host "✅ Import project in Eclipse: File > Import > Existing Projects" -ForegroundColor Green
}

function Setup-IntellijProject {
    <#
    .SYNOPSIS
        Generate IntelliJ IDEA project files
    .DESCRIPTION
        Creates .iml and .idea files for IntelliJ
    .EXAMPLE
        Setup-IntellijProject
    #>
    Write-Host "🔧 Generating IntelliJ project files..." -ForegroundColor Green
    Set-Location $VaServicePath
    .\mvnw idea:idea
    Write-Host "✅ Open project in IntelliJ: File > Open > Select pom.xml" -ForegroundColor Green
}

# ----------------------------------------------------------------------------
# PACKAGE & DEPLOY
# ----------------------------------------------------------------------------

function Package-VaService {
    <#
    .SYNOPSIS
        Create executable JAR without tests
    .DESCRIPTION
        Builds and packages the application as Spring Boot JAR
        Output: target/va-service-0.0.1-SNAPSHOT.jar
    .EXAMPLE
        Package-VaService
    #>
    Write-Host "📦 Packaging VA-Service..." -ForegroundColor Green
    Set-Location $VaServicePath
    .\mvnw clean package -DskipTests
    
    if (Test-Path "target\va-service-0.0.1-SNAPSHOT.jar") {
        Write-Host "✅ Package created: target\va-service-0.0.1-SNAPSHOT.jar" -ForegroundColor Green
    }
}

function Start-VaServiceJar {
    <#
    .SYNOPSIS
        Run the packaged JAR file
    .DESCRIPTION
        Starts the application using the built JAR
        Must run Package-VaService first
    .EXAMPLE
        Start-VaServiceJar
    #>
    Set-Location $VaServicePath
    
    if (-not (Test-Path "target\va-service-0.0.1-SNAPSHOT.jar")) {
        Write-Host "❌ JAR not found. Run Package-VaService first." -ForegroundColor Red
        return
    }
    
    Write-Host "🚀 Starting VA-Service from JAR..." -ForegroundColor Green
    java -jar target\va-service-0.0.1-SNAPSHOT.jar
}

# ----------------------------------------------------------------------------
# INFORMATION
# ----------------------------------------------------------------------------

function Get-VaServiceInfo {
    <#
    .SYNOPSIS
        Display project information
    .DESCRIPTION
        Shows Maven project details, version, and properties
    .EXAMPLE
        Get-VaServiceInfo
    #>
    Write-Host "ℹ️  VA-Service Project Information" -ForegroundColor Cyan
    Set-Location $VaServicePath
    .\mvnw help:effective-pom | Select-String -Pattern "artifactId|version|name" | Select-Object -First 10
}

function Show-MavenHelp {
    <#
    .SYNOPSIS
        Display available Maven lifecycle phases and goals
    .EXAMPLE
        Show-MavenHelp
    #>
    Write-Host "`n📖 Maven Lifecycle Phases:" -ForegroundColor Cyan
    Write-Host "  clean       - Remove target/ directory"
    Write-Host "  validate    - Validate project structure"
    Write-Host "  compile     - Compile source code"
    Write-Host "  test        - Run unit tests"
    Write-Host "  package     - Create JAR file"
    Write-Host "  verify      - Run integration tests"
    Write-Host "  install     - Install to local Maven repo"
    Write-Host "  deploy      - Deploy to remote Maven repo"
    
    Write-Host "`n🎯 Common Plugin Goals:" -ForegroundColor Cyan
    Write-Host "  spring-boot:run     - Run Spring Boot app"
    Write-Host "  dependency:tree     - Show dependency tree"
    Write-Host "  dependency:analyze  - Analyze dependencies"
    Write-Host "  versions:display-dependency-updates - Check for updates"
    Write-Host ""
}

# ----------------------------------------------------------------------------
# UTILITY FUNCTIONS
# ----------------------------------------------------------------------------

function Stop-VaService {
    <#
    .SYNOPSIS
        Stop running VA-Service processes
    .DESCRIPTION
        Kills all Java processes running va-service
    .EXAMPLE
        Stop-VaService
    #>
    Write-Host "🛑 Stopping VA-Service..." -ForegroundColor Yellow
    Get-Process -Name java -ErrorAction SilentlyContinue | Where-Object {
        $_.MainWindowTitle -like "*va-service*" -or 
        $_.CommandLine -like "*va-service*"
    } | Stop-Process -Force
    Write-Host "✅ VA-Service stopped" -ForegroundColor Green
}

function Watch-VaServiceLogs {
    <#
    .SYNOPSIS
        Tail application logs in real-time
    .DESCRIPTION
        Monitors logs/application.log file
        Press Ctrl+C to stop watching
    .EXAMPLE
        Watch-VaServiceLogs
    #>
    $logPath = Join-Path $VaServicePath "logs\application.log"
    
    if (Test-Path $logPath) {
        Write-Host "📋 Watching logs (Ctrl+C to stop)..." -ForegroundColor Cyan
        Get-Content $logPath -Wait -Tail 50
    } else {
        Write-Host "❌ Log file not found: $logPath" -ForegroundColor Red
    }
}

# ----------------------------------------------------------------------------
# INITIALIZATION
# ----------------------------------------------------------------------------

Write-Host "`n╔══════════════════════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║         VA-Service Maven CLI Helper Loaded                  ║" -ForegroundColor Cyan
Write-Host "╚══════════════════════════════════════════════════════════════╝" -ForegroundColor Cyan
Write-Host "`n📝 Available Functions:" -ForegroundColor Green
Write-Host ""
Write-Host "  Server Management:" -ForegroundColor Yellow
Write-Host "    Start-VaService          - Start development server"
Write-Host "    Start-VaServiceDebug     - Start with remote debugging"
Write-Host "    Start-VaServiceJar       - Run packaged JAR"
Write-Host "    Stop-VaService           - Stop running server"
Write-Host ""
Write-Host "  Build & Compile:" -ForegroundColor Yellow
Write-Host "    Build-VaService          - Full build with tests"
Write-Host "    Build-VaServiceFast      - Build without tests"
Write-Host "    Compile-VaService        - Compile only"
Write-Host "    Package-VaService        - Create JAR package"
Write-Host ""
Write-Host "  Testing:" -ForegroundColor Yellow
Write-Host "    Test-VaService           - Run all tests"
Write-Host "    Test-VaServiceSingle     - Run specific test"
Write-Host ""
Write-Host "  Cleanup:" -ForegroundColor Yellow
Write-Host "    Clean-VaService          - Remove build artifacts"
Write-Host "    Reset-VaService          - Deep clean (Maven + IDE)"
Write-Host ""
Write-Host "  Dependencies:" -ForegroundColor Yellow
Write-Host "    Show-VaServiceDeps       - Display dependency tree"
Write-Host "    Update-VaServiceDeps     - Update snapshots"
Write-Host ""
Write-Host "  IDE Setup:" -ForegroundColor Yellow
Write-Host "    Setup-EclipseProject     - Generate Eclipse files"
Write-Host "    Setup-IntellijProject    - Generate IntelliJ files"
Write-Host ""
Write-Host "  Quality & Info:" -ForegroundColor Yellow
Write-Host "    Verify-VaService         - Full verification"
Write-Host "    Format-VaServiceCode     - Format Java code"
Write-Host "    Get-VaServiceInfo        - Project information"
Write-Host "    Watch-VaServiceLogs      - Tail log files"
Write-Host "    Show-MavenHelp           - Maven commands help"
Write-Host ""
Write-Host "💡 Usage: Start-VaService" -ForegroundColor Cyan
Write-Host "💡 Help:  Get-Help Start-VaService -Detailed" -ForegroundColor Cyan
Write-Host ""
