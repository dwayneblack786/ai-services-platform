# Centralized Debug Logging Control

## Overview
Added centralized control for debug logging across all Java services without requiring code changes or passing parameters.

## Implementation

### 1. Configuration Property
**Location**: `services-java/va-service/src/main/resources/application.properties`

```properties
# Set to false to disable ALL debug logging across the application
logging.debug.enabled=true
```

### 2. LogFactory Enhancement
**Location**: `services-java/common-libs/src/main/java/com/ai/common/logging/LogFactory.java`

- Loads `logging.debug.enabled` property at startup (static initializer)
- Provides `isDebugEnabled()` method to check current state
- All debug methods (`debug()`, `logEntry()`, `logExit()`) respect this flag
- Default is `true` if property is missing or file not found

### 3. Usage

#### In Your Code
```java
private static final Logger logger = LogFactory.getLogger(MyClass.class);

// These will be suppressed when logging.debug.enabled=false
logger.debug("Detailed trace information");
LogFactory.debug(logger, "Processing request for: {}", userId);
LogFactory.logEntry(logger, "myMethod", param1, param2);
LogFactory.logExit(logger, "myMethod", result);

// These always work regardless of debug setting
logger.info("Normal operational message");
logger.warn("Warning message");
logger.error("Error message", exception);
```

#### To Disable Debug Logging Application-Wide

1. Edit `application.properties`:
   ```properties
   logging.debug.enabled=false
   ```

2. Rebuild:
   ```bash
   cd services-java/common-libs
   mvn clean install -DskipTests
   
   cd ../va-service
   mvn clean install -DskipTests
   ```

3. Restart the service

**Result**: All debug statements are suppressed, but INFO/WARN/ERROR logs continue to work.

## Benefits

1. **No Code Changes**: Toggle debug logging without modifying Java code
2. **Environment-Specific**: Different settings for dev/staging/production
3. **Performance**: Skip debug statement execution entirely when disabled
4. **Centralized**: Single property controls all services
5. **Safe Default**: Defaults to enabled if property is missing

## Testing

Run the test class:
```bash
cd services-java/va-service
mvn test-compile
mvn exec:java -Dexec.mainClass="com.ai.va.test.LoggingTest"
```

With `logging.debug.enabled=true`:
- You'll see DEBUG, INFO, WARN, ERROR messages
- Method entry/exit logs appear

With `logging.debug.enabled=false`:
- DEBUG messages are suppressed
- Only INFO, WARN, ERROR messages appear
- Method entry/exit logs are suppressed

## Log4j2 vs LogFactory Control

**Log4j2 XML Configuration** (`log4j2.xml`):
```xml
<Logger name="com.ai.va" level="debug">  <!-- Change to "info" -->
```
- Controls minimum log level for loggers
- Requires rebuild/restart
- Logger-specific control

**LogFactory Property** (`application.properties`):
```properties
logging.debug.enabled=false
```
- Application-wide debug on/off switch
- Skips debug statement execution entirely
- Better performance when disabled
- Simpler for environment-specific configs

**Recommendation**: Use both together
- Log4j2 for fine-grained logger control
- LogFactory for easy application-wide debug toggle

## Files Modified

1. ✅ `services-java/va-service/src/main/resources/application.properties` (created)
2. ✅ `services-java/common-libs/src/main/java/com/ai/common/logging/LogFactory.java` (enhanced)
3. ✅ `services-java/va-service/src/test/java/com/ai/va/test/LoggingTest.java` (test class)

## Status
✅ **IMPLEMENTED AND TESTED**
- Common-libs rebuilt successfully
- Va-service compiled successfully
- Property loaded at startup
- Debug logging respects flag
