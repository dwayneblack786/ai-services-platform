# Eclipse IDE Setup Guide for VA Service

Complete guide for setting up Eclipse IDE and running/debugging the VA Service Java Spring Boot application.

## Table of Contents
1. [Install Eclipse](#install-eclipse)
2. [Create Workspace](#create-workspace)
3. [Import Project](#import-project)
4. [Run Configurations](#run-configurations)
5. [Debugging](#debugging)
6. [Troubleshooting](#troubleshooting)

---

## Install Eclipse

### Download Eclipse IDE

**Recommended Version:** Eclipse IDE for Enterprise Java and Web Developers (2024-12 or later)

#### Windows
1. Download from [Eclipse Downloads](https://www.eclipse.org/downloads/)
2. Run the Eclipse Installer
3. Select **"Eclipse IDE for Enterprise Java and Web Developers"**
4. Choose installation directory (e.g., `C:\eclipse`)
5. Click **Install**
6. Launch Eclipse when installation completes

#### macOS
```bash
# Via Homebrew
brew install --cask eclipse-jee

# Or download from website
# Visit https://www.eclipse.org/downloads/
# Download Eclipse IDE for Enterprise Java and Web Developers
# Open the .dmg file and drag to Applications
```

#### Linux (Ubuntu/Debian)
```bash
# Download Eclipse Installer
wget https://www.eclipse.org/downloads/download.php?file=/technology/epp/downloads/release/2024-12/R/eclipse-jee-2024-12-R-linux-gtk-x86_64.tar.gz

# Extract
tar -xzf eclipse-jee-*.tar.gz

# Move to /opt
sudo mv eclipse /opt/

# Create desktop launcher (optional)
sudo nano /usr/share/applications/eclipse.desktop
```

### Verify Installation

Launch Eclipse and verify:
- Java 17+ is detected (Window → Preferences → Java → Installed JREs)
- Maven integration is available (Window → Preferences → Maven)

---

## Create Workspace

### 1. Launch Eclipse

On first launch, Eclipse will prompt for a workspace directory.

### 2. Create New Workspace

**Recommended Workspace Location:**
- Windows: `C:\workspace\ai-services-platform`
- macOS: `~/workspace/ai-services-platform`
- Linux: `~/workspace/ai-services-platform`

**Steps:**
1. Click **Browse** when prompted for workspace
2. Navigate to your desired location
3. Create a new folder: `ai-services-platform`
4. Click **Launch**

### 3. Configure Workspace Settings

**a) Set Java Compiler to 17:**
- Window → Preferences → Java → Compiler
- Set **Compiler compliance level** to `17`
- Click **Apply and Close**

**b) Configure Maven:**
- Window → Preferences → Maven
- Check **"Download Artifact Sources"**
- Check **"Download Artifact JavaDoc"**
- Click **Apply and Close**

**c) Set Text File Encoding to UTF-8:**
- Window → Preferences → General → Workspace
- Set **Text file encoding** to `UTF-8`
- Click **Apply and Close**

---

## Import Project

### Option 1: Import Existing Maven Project (Recommended)

1. **Open Import Wizard:**
   - File → Import → Maven → Existing Maven Projects
   - Click **Next**

2. **Select Project:**
   - Click **Browse**
   - Navigate to: `[repository-root]/services-java/va-service`
   - Eclipse will detect `pom.xml`
   - Click **Finish**

3. **Wait for Maven Dependencies:**
   - Eclipse will download dependencies automatically
   - Check progress in bottom-right corner
   - This may take 5-10 minutes

4. **Verify Import:**
   - Project should appear in **Project Explorer**
   - No build errors in **Problems** view
   - Source folders: `src/main/java`, `src/main/resources`, `src/test/java`

### Option 2: Clone from Git and Import

1. **Clone Repository:**
   ```bash
   cd ~/workspace/ai-services-platform
   git clone https://github.com/your-org/ai-services-platform.git .
   ```

2. **Import in Eclipse:**
   - Follow Option 1 steps to import the Maven project

---

## Run Configurations

Pre-configured launch files are available in `services-java/va-service/.eclipse/`

### Import Launch Configurations

1. **Copy Launch Files to Workspace:**
   - From: `services-java/va-service/.eclipse/*.launch`
   - To: `[workspace]/.metadata/.plugins/org.eclipse.debug.core/.launches/`

   Or manually import:
   - Right-click on project → Run As → Run Configurations...
   - Click **Import** button
   - Browse to `services-java/va-service/.eclipse/`
   - Select all `.launch` files

### Available Configurations

#### 1. VA Service - Maven Run

**Purpose:** Run the application using Maven Spring Boot plugin

**Configuration:**
- Type: Maven Build
- Goals: `spring-boot:run`
- Working Directory: `${workspace_loc:/va-service}`

**How to Run:**
1. Run → Run Configurations...
2. Select **Maven Build → VA Service - Maven Run**
3. Click **Run**

**Output:** Application starts on `http://localhost:8136`

---

#### 2. VA Service - Maven Debug

**Purpose:** Run with remote debugging enabled on port 5005

**Configuration:**
- Type: Maven Build
- Goals: `spring-boot:run`
- JVM Arguments: `-Xdebug -Xrunjdwp:transport=dt_socket,server=y,suspend=n,address=*:5005`

**How to Run:**
1. Run → Debug Configurations...
2. Select **Maven Build → VA Service - Maven Debug**
3. Click **Debug**
4. Application starts with debug port 5005 open

**Then attach debugger:**
1. Run → Debug Configurations...
2. Select **Remote Java Application → VA Service - Remote Debug**
3. Click **Debug**

---

#### 3. VA Service - Java Application

**Purpose:** Run as standard Java application (faster startup for development)

**Configuration:**
- Type: Java Application
- Main Class: `com.va_service.VaServiceApplication`
- VM Arguments: `-Dspring.profiles.active=dev`

**How to Run:**
1. Right-click on `VaServiceApplication.java`
2. Run As → Java Application

Or:
1. Run → Run Configurations...
2. Select **Java Application → VA Service - Java Application**
3. Click **Run**

---

#### 4. VA Service - Remote Debug

**Purpose:** Attach debugger to already-running application

**Configuration:**
- Type: Remote Java Application
- Host: `localhost`
- Port: `5005`

**Prerequisites:**
- Application must be running with debug enabled
- Start with **Maven Debug** configuration first

**How to Use:**
1. Start application with debug enabled (Option 2)
2. Run → Debug Configurations...
3. Select **Remote Java Application → VA Service - Remote Debug**
4. Click **Debug**
5. Debugger attaches to running process

---

## Debugging

### Setting Breakpoints

1. **Open Java File:**
   - Navigate to class in Project Explorer
   - Double-click to open

2. **Add Breakpoint:**
   - Double-click on line number in left margin
   - Blue circle appears indicating breakpoint

3. **Conditional Breakpoints:**
   - Right-click on breakpoint circle
   - Select **Breakpoint Properties**
   - Enable **Conditional**
   - Enter condition (e.g., `count > 10`)

### Debug Perspective

1. **Switch to Debug Perspective:**
   - Window → Perspective → Open Perspective → Debug
   - Or click **Debug** button in top-right corner

2. **Debug Views:**
   - **Debug:** Stack trace and thread control
   - **Variables:** Inspect variable values
   - **Breakpoints:** Manage all breakpoints
   - **Expressions:** Watch custom expressions
   - **Console:** Application output

### Debug Controls

- **Resume (F8):** Continue execution
- **Suspend:** Pause execution
- **Step Into (F5):** Enter method calls
- **Step Over (F6):** Execute current line
- **Step Return (F7):** Exit current method
- **Terminate:** Stop debugging

### Hot Code Replace

Eclipse supports **Hot Code Replace** during debugging:
1. Make changes to code while debugging
2. Save file (`Ctrl+S` / `Cmd+S`)
3. Changes apply immediately (if compatible)
4. Application continues running without restart

**Limitations:**
- Can't add new methods
- Can't change method signatures
- Can't add/remove class fields

---

## Troubleshooting

### Project Build Errors

**Problem:** Red X on project, build errors

**Solutions:**
1. **Update Maven Project:**
   - Right-click project → Maven → Update Project
   - Check **Force Update of Snapshots/Releases**
   - Click **OK**

2. **Clean and Build:**
   - Project → Clean...
   - Select **va-service**
   - Click **Clean**

3. **Verify JDK:**
   - Right-click project → Properties
   - Java Build Path → Libraries
   - Ensure JRE System Library is Java 17+

### Maven Dependencies Not Downloaded

**Problem:** Dependencies missing, compile errors

**Solutions:**
1. **Reimport Dependencies:**
   ```
   Right-click project → Maven → Update Project → Force Update
   ```

2. **Clear Maven Cache:**
   ```bash
   # Delete local repository
   rm -rf ~/.m2/repository
   
   # In Eclipse: Right-click project → Maven → Update Project
   ```

3. **Check Maven Settings:**
   - Window → Preferences → Maven
   - Verify **User Settings** points to correct `settings.xml`

### Application Won't Start

**Problem:** Port already in use (8136)

**Solutions:**
1. **Find Process Using Port:**
   ```bash
   # Windows
   netstat -ano | findstr :8136
   taskkill /PID [PID] /F
   
   # macOS/Linux
   lsof -i :8136
   kill -9 [PID]
   ```

2. **Change Port:**
   - Edit `src/main/resources/application.properties`
   - Add: `server.port=8137`

### Debug Connection Refused

**Problem:** Cannot attach remote debugger to port 5005

**Solutions:**
1. **Verify Debug Port Open:**
   - Application must be started with debug configuration
   - Check console for: `Listening for transport dt_socket at address: 5005`

2. **Firewall Blocking:**
   - Add exception for port 5005
   - Or temporarily disable firewall for testing

3. **Port Already in Use:**
   - Kill existing debug process
   - Or use different port in debug configuration

### Out of Memory Errors

**Problem:** `java.lang.OutOfMemoryError`

**Solutions:**
1. **Increase Heap Size:**
   - Run Configurations → Arguments tab
   - VM Arguments: `-Xmx2048m -Xms512m`

2. **Eclipse Memory:**
   - Edit `eclipse.ini`
   - Increase `-Xmx` value: `-Xmx4096m`

---

## Quick Reference

### Keyboard Shortcuts

| Action | Windows/Linux | macOS |
|--------|--------------|-------|
| Run | `Ctrl+F11` | `Cmd+F11` |
| Debug | `F11` | `F11` |
| Step Over | `F6` | `F6` |
| Step Into | `F5` | `F5` |
| Step Return | `F7` | `F7` |
| Resume | `F8` | `F8` |
| Toggle Breakpoint | `Ctrl+Shift+B` | `Cmd+Shift+B` |
| Quick Fix | `Ctrl+1` | `Cmd+1` |
| Organize Imports | `Ctrl+Shift+O` | `Cmd+Shift+O` |
| Format Code | `Ctrl+Shift+F` | `Cmd+Shift+F` |

### Console Commands

```bash
# Run from terminal (alternative to Eclipse)
cd services-java/va-service

# Run normally
./mvnw spring-boot:run

# Run with debug
./mvnw spring-boot:run -Dspring-boot.run.jvmArguments="-Xdebug -Xrunjdwp:transport=dt_socket,server=y,suspend=n,address=*:5005"

# Clean and run
./mvnw clean spring-boot:run
```

---

## Additional Resources

- [Eclipse Documentation](https://help.eclipse.org/)
- [Maven in Eclipse](https://www.eclipse.org/m2e/)
- [Spring Boot Tools for Eclipse](https://spring.io/tools)
- [Java Debugging in Eclipse](https://www.eclipse.org/community/eclipse_newsletter/2017/june/article1.php)

---

**Last Updated:** January 15, 2026
