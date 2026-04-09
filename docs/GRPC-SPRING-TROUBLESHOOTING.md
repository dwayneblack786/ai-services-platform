# gRPC + Spring Boot Integration Troubleshooting

## Problem Summary

**Issue:** Java VA Service fails to start with `ClassNotFoundException: HistoryRequest`

**Error Stack:**
```
org.springframework.beans.factory.UnsatisfiedDependencyException: 
Error creating bean with name 'grpcServerConfig': 
Unsatisfied dependency expressed through field 'chatService': 
Error creating bean with name 'chatServiceImpl': 
Lookup method resolution failed

Caused by: java.lang.NoClassDefFoundError: HistoryRequest
Caused by: java.lang.ClassNotFoundException: HistoryRequest
```

**Confirmed Facts:**
- ✅ Code compiles successfully (BUILD SUCCESS)
- ✅ All 105 Java files compile without errors
- ✅ `HistoryRequest.class` exists in `target/classes/com/ai/va/grpc/`
- ✅ Proto generation completes successfully
- ❌ Runtime bean initialization fails

---

## Investigation Plan

### Phase 1: Verify Classpath & Proto Configuration

#### Step 1.1: Verify Proto-Generated Classes Location
```bash
# Check if all proto classes are generated
cd services-java/va-service
ls target/generated-sources/protobuf/java/com/ai/va/grpc/
ls target/classes/com/ai/va/grpc/
```

**Expected Files:**
- `ChatProto.java` (outer class)
- `SessionRequest.java`
- `SessionResponse.java`
- `ChatRequest.java`
- `ChatResponse.java`
- `EndSessionRequest.java`
- `EndSessionResponse.java`
- `HistoryRequest.java` ✓ (This is missing at runtime)
- `HistoryResponse.java`
- `HistoryMessage.java`
- `ChatServiceGrpc.java`

#### Step 1.2: Check Proto File Configuration
**File:** `src/main/proto/chat.proto`

```protobuf
option java_multiple_files = true;      // ← Each message becomes separate class
option java_package = "com.ai.va.grpc"; // ← Package name
option java_outer_classname = "ChatProto";
```

**Verify:**
- [ ] `java_multiple_files = true` is set correctly
- [ ] Package matches import statements in Java code
- [ ] No duplicate message names across proto files

#### Step 1.3: Inspect Maven Build Output
```bash
.\mvnw.cmd clean compile -X | Select-String -Pattern "HistoryRequest"
```

Look for:
- Proto compilation logs
- Class generation confirmation
- Classpath entries

---

### Phase 2: Spring Bean Configuration Analysis

#### Step 2.1: Check @Service vs @Component Annotation
**Current:** `ChatServiceImpl` uses `@Service`

**Test:** Try changing to `@Component` or remove Spring annotations temporarily

**File:** `ChatServiceImpl.java`
```java
// Current:
@Service
public class ChatServiceImpl extends ChatServiceImplBase {
```

**Alternative Approaches:**
1. **Option A:** Remove `@Service`, manage bean manually
2. **Option B:** Use `@Lazy` annotation to defer initialization
3. **Option C:** Use constructor injection instead of field injection

#### Step 2.2: Analyze GrpcServerConfig
**File:** `src/main/java/com/ai/va/config/GrpcServerConfig.java`

Check for:
- [ ] Circular dependencies between beans
- [ ] Autowiring order issues
- [ ] Profile-specific configurations

```java
@Configuration
public class GrpcServerConfig {
    @Autowired
    private ChatServiceImpl chatService; // ← Problem here?
```

**Potential Fix:** Use `@Lazy` or constructor injection:
```java
private final ChatServiceImpl chatService;

public GrpcServerConfig(@Lazy ChatServiceImpl chatService) {
    this.chatService = chatService;
}
```

---

### Phase 3: gRPC Library Compatibility Check

#### Step 3.1: Review pom.xml Dependencies
**File:** `pom.xml`

Check versions:
```xml
<grpc.version>1.61.0</grpc.version>
<protobuf.version>3.25.1</protobuf.version>
<spring-boot.version>4.0.1</spring-boot.version>
```

**Known Compatibility Issues:**
- gRPC 1.61+ may have issues with Spring Boot 4.x
- Protobuf 3.25.x might need specific protoc compiler version

**Action:** Check [gRPC-Spring compatibility matrix](https://github.com/grpc-ecosystem/grpc-spring)

#### Step 3.2: Check for Conflicting Dependencies
```bash
.\mvnw.cmd dependency:tree | Select-String -Pattern "protobuf|grpc"
```

Look for:
- Multiple protobuf versions
- Conflicting grpc libraries
- Shaded vs non-shaded dependencies

---

### Phase 4: ClassLoader Investigation

#### Step 4.1: Enable Verbose Class Loading
**Add to `application-dev.properties`:**
```properties
# Enable class loading logs
logging.level.org.springframework.beans=DEBUG
logging.level.org.springframework.context=DEBUG
logging.level.org.springframework.boot=DEBUG

# Java class loading verbose
java.util.logging.config.file=logging.properties
```

**Create `logging.properties`:**
```properties
.level=INFO
java.lang.ClassLoader.level=FINE
```

**Run with JVM args:**
```bash
.\mvnw.cmd spring-boot:run "-Dspring-boot.run.profiles=dev" "-Dspring-boot.run.jvmArguments=-verbose:class"
```

#### Step 4.2: Check for Duplicate Classes
```bash
# Search for duplicate HistoryRequest classes
cd target
Get-ChildItem -Recurse -Filter "HistoryRequest.class" | Select-Object FullName
```

---

### Phase 5: Alternative gRPC Integration Approaches

#### Option A: Use grpc-spring-boot-starter
**Add dependency:**
```xml
<dependency>
    <groupId>net.devh</groupId>
    <artifactId>grpc-spring-boot-starter</artifactId>
    <version>3.1.0.RELEASE</version>
</dependency>
```

**Change annotation:**
```java
import net.devh.boot.grpc.server.service.GrpcService;

@GrpcService  // Instead of @Service
public class ChatServiceImpl extends ChatServiceImplBase {
```

#### Option B: Manual gRPC Server Configuration
Remove Spring management of gRPC services entirely:

**Create:** `ManualGrpcServer.java`
```java
@Component
public class ManualGrpcServer implements ApplicationRunner {
    
    private Server server;
    
    @Autowired
    private ChatSessionService chatSessionService;
    
    @Override
    public void run(ApplicationArguments args) throws Exception {
        server = ServerBuilder.forPort(9090)
            .addService(new ChatServiceImpl(chatSessionService))
            .build()
            .start();
    }
    
    @PreDestroy
    public void shutdown() {
        if (server != null) {
            server.shutdown();
        }
    }
}
```

**Update ChatServiceImpl:**
```java
// Remove @Service annotation
public class ChatServiceImpl extends ChatServiceImplBase {
    
    private final ChatSessionService chatSessionService;
    
    // Constructor injection instead of @Autowired
    public ChatServiceImpl(ChatSessionService chatSessionService) {
        this.chatSessionService = chatSessionService;
    }
}
```

---

### Phase 6: Temporary Workarounds

#### Workaround 1: Disable gRPC Temporarily
**Add to `application-dev.properties`:**
```properties
# Disable gRPC auto-configuration
spring.autoconfigure.exclude=com.ai.va.config.GrpcServerConfig
```

**Or use profile:**
```java
@Configuration
@Profile("grpc")  // Only activate with --spring.profiles.active=dev,grpc
public class GrpcServerConfig {
```

#### Workaround 2: Lazy Bean Initialization
**Add to `application-dev.properties`:**
```properties
spring.main.lazy-initialization=true
```

This defers bean creation until first use.

---

## Debugging Commands

### 1. Verify Class Exists
```powershell
Test-Path "C:\Users\Owner\Documents\ai-services-platform\services-java\va-service\target\classes\com\ai\va\grpc\HistoryRequest.class"
# Should return: True
```

### 2. Inspect Compiled Class
```powershell
cd services-java/va-service/target/classes
javap -verbose com.ai.va.grpc.HistoryRequest | Select-Object -First 30
```

### 3. Check Spring Bean Dependencies
```bash
.\mvnw.cmd spring-boot:run -Dspring-boot.run.profiles=dev -Ddebug
```

Look for bean creation order and circular dependencies.

### 4. Test Proto Classes Directly
**Create test file:** `src/test/java/com/ai/va/grpc/ProtoClassTest.java`
```java
package com.ai.va.grpc;

import org.junit.jupiter.api.Test;
import static org.junit.jupiter.api.Assertions.*;

public class ProtoClassTest {
    
    @Test
    public void testHistoryRequestExists() {
        HistoryRequest request = HistoryRequest.newBuilder()
            .setSessionId("test-123")
            .build();
        
        assertNotNull(request);
        assertEquals("test-123", request.getSessionId());
    }
}
```

Run: `.\mvnw.cmd test -Dtest=ProtoClassTest`

---

## Recommended Investigation Order

1. ✅ **Start Simple:** Try Workaround 1 (disable gRPC) to verify REST endpoints work
2. 🔍 **Classpath Check:** Verify all proto classes are generated and in classpath (Phase 1)
3. 🔧 **Bean Config:** Add `@Lazy` to GrpcServerConfig dependencies (Phase 2.2)
4. 📦 **Library Check:** Review gRPC/Spring compatibility (Phase 3.1)
5. 🔄 **Alternative:** Try grpc-spring-boot-starter library (Phase 5 Option A)
6. 🛠️ **Manual Config:** Implement manual gRPC server (Phase 5 Option B)

---

## Expected Resolution

**Most Likely Cause:**
- Spring's bean introspection happens before proto-generated classes are fully loaded into the classpath
- The `@Service` annotation on gRPC implementation classes may conflict with Spring's component scanning

**Most Likely Solution:**
1. Use `grpc-spring-boot-starter` library (handles integration properly)
2. OR: Remove Spring annotations from gRPC services and manage manually
3. OR: Use `@Lazy` initialization for GrpcServerConfig

---

## Next Steps After Resolution

Once the server starts successfully:

### Immediate Testing
1. Test REST endpoints:
   - `GET /actuator/health`
   - `POST /voice/session`
   - `POST /chat/message`

2. Test gRPC endpoints (if enabled):
   - Use `grpcurl` or BloomRPC
   - Test `ChatService.StartSession`
   - Test `ChatService.SendMessage`

### Validation
1. Verify LLM Client connects to LM Studio
2. Verify MongoDB connection
3. Test UsageMetricsClient reports to Node backend
4. Check logs for any warnings

---

## Related Documentation

- [VOICE-DEV-SETUP.md](./VOICE-DEV-SETUP.md) - Development environment setup
- [PHASE-1-COMPLETION-REPORT.md](./archive/PHASE-1-COMPLETION-REPORT.md) - Phase 1 implementation
- [CLIENT-WORKFLOW-DIAGRAMS.md](./CLIENT-WORKFLOW-DIAGRAMS.md) - Client architecture

---

*Last Updated: 2026-01-20*
