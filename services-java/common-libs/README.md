# Common Libraries Module

Shared utilities and DTOs for AI Services Platform.

## Structure

- **dto**: Data Transfer Objects for consistent API responses
- **utils**: Utility classes for common operations
- **logging**: Enhanced logging utilities with MDC support
- **clients**: HTTP clients and service communication utilities (coming soon)

## Components

### ApiResponse
Generic wrapper for API responses with consistent structure across all services.

```java
// Success response
ApiResponse<User> response = ApiResponse.success(user);

// Error response
ApiResponse<Void> error = ApiResponse.error("User not found", "USER_NOT_FOUND");

// With metadata
ApiResponse<List<User>> response = ApiResponse.success(users)
    .addMetadata("page", 1)
    .addMetadata("totalPages", 10);
```

### JsonUtils
JSON serialization/deserialization utilities using Jackson.

```java
// Convert to JSON
String json = JsonUtils.toJson(object);

// Parse from JSON
User user = JsonUtils.fromJson(json, User.class);

// Validate JSON
boolean isValid = JsonUtils.isValidJson(jsonString);
```

### LogUtil
Enhanced logging with MDC context support for distributed tracing.

```java
// Initialize request context
String requestId = LogUtil.initRequestContext();

// Set user context
LogUtil.setUserId("user123");

// Log with context
Logger logger = LogUtil.getLogger(MyClass.class);
logger.info("Processing request"); // Automatically includes requestId and userId

// Log with timing
long start = System.currentTimeMillis();
// ... do work ...
LogUtil.logWithTiming(logger, "processData", start);

// Clean up
LogUtil.clearContext();
```

## Usage

Add this dependency to your service's `pom.xml`:

```xml
<dependency>
    <groupId>com.ai</groupId>
    <artifactId>common-libs</artifactId>
    <version>1.0.0</version>
</dependency>
```

## Build

```bash
mvn clean install
```

This will install the library to your local Maven repository for use by other services.
