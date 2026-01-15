# MongoDB Common Configuration

## 📑 Table of Contents

- [Overview](#overview)
- [Components](#components)
  - [MongoDBConfig.java](#mongodbconfigjava)
  - [MongoDBService.java](#mongodbservicejava)
- [Configuration](#configuration)
- [Dependencies](#dependencies)
- [Example Usage](#example-usage)
- [Reusability](#reusability)

---

## Overview

This package provides reusable MongoDB configuration and services that can be shared across all Java microservices in the platform.

## Components

### MongoDBConfig.java
Spring Boot configuration class that provides MongoDB beans:
- `MongoClient`: Connection pool manager
- `MongoDatabase`: Direct database access

**Usage**: Automatically configured via Spring's dependency injection. Just add the config class to your project.

### MongoDBService.java
Common MongoDB operations service with error handling:
- `findOne()`: Find single document
- `find()`: Find multiple documents (with optional limit)
- `insertOne()`: Insert document
- `updateOne()`: Update document
- `deleteOne()`: Delete document
- `count()`: Count matching documents

**Usage**: Inject `MongoDBService` into your service classes and use the helper methods.

## Configuration

Add to `application.yaml`:
```yaml
mongodb:
  uri: mongodb://localhost:27017
  database: ai_platform
  connection-timeout: 10000
  socket-timeout: 30000
```

## Dependencies

Add to `pom.xml` (let Spring Boot manage the version):
```xml
<dependency>
    <groupId>org.mongodb</groupId>
    <artifactId>mongodb-driver-sync</artifactId>
</dependency>
```

**Note**: Don't specify a version - let Spring Boot's dependency management handle it to avoid version conflicts.

## Example Usage

```java
@Service
public class MyService {
    private final MongoDBService mongoDBService;
    
    @Autowired
    public MyService(MongoDBService mongoDBService) {
        this.mongoDBService = mongoDBService;
    }
    
    public void example() {
        // Find single document
        Document query = new Document("customerId", "123");
        Document result = mongoDBService.findOne("my_collection", query);
        
        // Find multiple documents with limit
        List<Document> results = mongoDBService.find("my_collection", query, 10);
    }
}
```

## Reusability

These classes can be copied to other microservices (idp-service, cv-service, etc.) to provide consistent MongoDB access patterns across the platform.

**Location in va-service**:
- `src/main/java/com/ai/va/config/MongoDBConfig.java`
- `src/main/java/com/ai/va/service/MongoDBService.java`

**To reuse in another service**:
1. Copy both files to the new service
2. Update package names (e.g., `com.ai.idp.config` and `com.ai.idp.service`)
3. Add MongoDB dependency to `pom.xml`
4. Add MongoDB configuration to `application.yaml`
5. Inject `MongoDBService` in your service classes
