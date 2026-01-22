# Infero - Java Spring Boot Backend API

## 📑 Table of Contents

- [Overview](#overview)
- [Features](#features)
- [Structure](#structure)
- [Installation](#installation)
- [Configuration](#configuration)
  - [Application Settings](#application-settings)
- [Running](#running)
  - [Using Maven Wrapper](#using-maven-wrapper)
  - [Using VS Code Tasks](#using-vs-code-tasks)
  - [Using Eclipse](#using-eclipse)
- [Building](#building)
  - [Clean and Install](#clean-and-install)
  - [Run Tests](#run-tests)
  - [Package JAR](#package-jar)
- [API Endpoints](#api-endpoints)
  - [Available Endpoints](#available-endpoints)
- [API Response Model](#api-response-model)
  - [Example Controller](#example-controller)
- [Dependencies](#dependencies)
- [Development](#development)
  - [Maven Commands](#maven-commands)
  - [Adding Dependencies](#adding-dependencies)
- [Testing](#testing)
- [Project Information](#project-information)
- [Next Steps](#next-steps)
- [Integration](#integration)

---

## Overview

Java Spring Boot RESTful API backend service providing CRUD operations with standardized JSON responses.

## Features

- Spring Boot 4.0.1
- Java 17
- Maven build system
- RESTful API architecture
- Standardized API response format
- Multiple resource endpoints

## Structure

```
Infero/
├── src/
│   ├── main/
│   │   ├── java/
│   │   │   └── com/ai/va/application/
│   │   │       ├── VaServiceApplication.java  # Main application
│   │   │       ├── controller/
│   │   │       │   ├── HomeController.java
│   │   │       │   ├── UserController.java
│   │   │       │   ├── CustomersController.java
│   │   │       │   ├── BillingController.java
│   │   │       │   └── ProductsController.java
│   │   │       └── model/
│   │   │           └── ApiResponse.java              # Standardized response model
│   │   └── resources/
│   │       └── application.yaml                       # Application configuration
│   └── test/
│       └── java/
│           └── com/ai/va/application/
│               └── VaServiceApplicationTests.java
├── pom.xml                                            # Maven configuration
├── mvnw                                               # Maven wrapper (Unix)
├── mvnw.cmd                                           # Maven wrapper (Windows)
└── InferoApplication.launch                           # Eclipse launch config
```

## Installation

No installation needed. The Maven wrapper (`mvnw`) is included.

## Configuration

### Application Settings

Edit `src/main/resources/application.yaml`:

```yaml
server:
  port: 8136

spring:
  application:
    name: Infero
```

## Running

### Quick Start (Recommended)

**Windows PowerShell:**
```powershell
.\start-server.ps1
```

**With Options:**
```powershell
.\start-server.ps1 -Debug          # Remote debugging on port 5005
.\start-server.ps1 -Clean          # Clean build first
.\start-server.ps1 -Fast           # Skip tests
```

📖 **[Complete CLI Guide](MAVEN_CLI_GUIDE.md)** - All Maven commands, PowerShell functions, and workflows

### Using Maven Wrapper

**Windows:**
```bash
.\mvnw spring-boot:run
```

**Unix/Mac:**
```bash
./mvnw spring-boot:run
```

### Using VS Code Tasks

- **Terminal → Run Task → "Infero: Maven Run"**

### Using Eclipse

Open `InferoApplication.launch` or `Infero Maven Run.launch` in Eclipse and run.

The application will start on http://localhost:8136

## Building

### Clean and Install

```bash
./mvnw clean install
```

### Run Tests

```bash
./mvnw test
```

### Package JAR

```bash
./mvnw package
```

The JAR file will be created in `target/infero-0.0.1-SNAPSHOT.jar`

## API Endpoints

All endpoints return standardized JSON responses with the following format:

```json
{
  "statusCode": 200,
  "statusMessage": "success",
  "data": {
    // Response data here
  }
}
```

### Available Endpoints

**Home:**
- `GET /` - Home endpoint

**Users:**
- `GET /users` - Get all users

**Customers:**
- `GET /customers` - Get all customers

**Billing:**
- `GET /billing` - Get all billing records

**Products:**
- `GET /products` - Get all products

## API Response Model

The `ApiResponse` class provides a standardized response format:

```java
public class ApiResponse {
    private Integer statusCode;
    private String statusMessage;
    private Object data;
    
    // Factory methods
    public static ApiResponse success(Object data)
    public static ApiResponse success(Object data, Integer statusCode)
    public static ApiResponse error(String message)
    public static ApiResponse error(String message, Integer statusCode)
}
```

### Example Controller

```java
@RestController
public class UserController {
    @GetMapping("/users")
    public ApiResponse getUsers() {
        Map<String, String> data = new HashMap<>();
        data.put("message", "Users endpoint");
        return ApiResponse.success(data);
    }
}
```

## Dependencies

Defined in `pom.xml`:

- **spring-boot-starter-web** - Web application support
- **spring-boot-starter-test** - Testing support

## Development

### PowerShell Helper Functions

```powershell
# Load helper functions
. .\maven-cli.ps1

# Start server
Start-VaService

# Fast build (skip tests)
Build-VaServiceFast

# Run tests
Test-VaService

# Deep clean
Reset-VaService
```

📖 **[Maven CLI Guide](MAVEN_CLI_GUIDE.md)** - Complete reference with all functions and workflows

### Maven Commands

```bash
# Compile
./mvnw compile

# Clean build
./mvnw clean

# Run tests
./mvnw test

# Package JAR
./mvnw package

# Install to local repository
./mvnw install

# Run application
./mvnw spring-boot:run
```

### Adding Dependencies

Edit `pom.xml` and add dependencies in the `<dependencies>` section:

```xml
<dependency>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-starter-data-jpa</artifactId>
</dependency>
```

Then run `./mvnw install` to download the dependencies.

## Testing

Test files are located in `src/test/java/`. Run tests with:

```bash
./mvnw test
```

## Project Information

- **Group ID:** com.infero
- **Artifact ID:** infero
- **Version:** 0.0.1-SNAPSHOT
- **Java Version:** 17
- **Spring Boot Version:** 4.0.1

## Next Steps

- Add database integration (JPA/Hibernate)
- Implement entity models
- Add service layer
- Implement repository pattern
- Add data validation
- Add exception handling
- Add API documentation (Swagger/OpenAPI)
- Add security (Spring Security)
- Add logging
- Add unit and integration tests
- Add DTOs for request/response
- Implement pagination

## Integration

This API is designed to work with the Node.js middleware server which proxies requests from the React frontend. The complete architecture is:

```
React (5173) → Node.js (5000) → Infero (8136)
```
