# Security Audit: Java/Spring Boot Services

## Purpose

Conduct a comprehensive security audit of Spring Boot changes to ensure proper authentication, authorization, input validation, and protect against OWASP vulnerabilities.

## When to Use

- New or modified Spring controllers or endpoints
- Service layer or business logic security changes
- Database operations or ORM queries
- Authentication/authorization configuration
- External service integrations
- Dependency updates

---

## Audit Checklist

### 1. Spring Security Configuration

```java
// ❌ FAIL: Missing security config
@Configuration
public class WebConfig implements WebMvcConfigurer {
  // No Spring Security; all endpoints public
}

// ✅ PASS: Proper security configuration
@Configuration
@EnableWebSecurity
public class SecurityConfig {
  @Bean
  public SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
    http
      .authorizeHttpRequests(auth -> auth
        .requestMatchers("/actuator/**").permitAll()
        .requestMatchers("/api/login", "/api/register").permitAll()
        .anyRequest().authenticated()
      )
      .formLogin(form -> form.loginPage("/login").permitAll())
      .logout(logout -> logout.permitAll())
      .csrf(csrf -> csrf.csrfTokenRepository(CookieCsrfTokenRepository.withHttpOnlyFalse()));
    return http.build();
  }
}
```

**Checks:**
- [ ] Spring Security is enabled (`@EnableWebSecurity`)
- [ ] Authentication required for protected endpoints
- [ ] CSRF protection enabled
- [ ] Unauthorized requests return 401/403, not 200
- [ ] CORS is configured explicitly (not enabling all origins)
- [ ] HTTPS enforced in production
- [ ] Session management configured (STATELESS or SESSION)

**Verification:**
```bash
# Check Spring Security config
grep -rn "@EnableWebSecurity\|SecurityFilterChain" src/main/java/

# Check authorization annotations
grep -rn "@PreAuthorize\|@Secured\|@PostAuthorize" src/main/java/
```

---

### 2. Authentication & JWT Tokens

```java
// ❌ FAIL: No token validation
@PostMapping("/api/data")
public ResponseEntity<?> getData(@RequestHeader("Authorization") String token) {
  String userId = JwtUtil.extractUserId(token); // No verification!
  return ResponseEntity.ok(service.getData(userId));
}

// ✅ PASS: Token validated and verified
@PostMapping("/api/data")
public ResponseEntity<?> getData(Authentication auth) {
  UserPrincipal user = (UserPrincipal) auth.getPrincipal();
  return ResponseEntity.ok(service.getData(user.getId()));
}
```

**Checks:**
- [ ] JWT tokens validated with server-side secret
- [ ] Token expiration checked (claim `exp`)
- [ ] Token issuer verified (claim `iss`)
- [ ] Token subject verified (claim `sub` = userId)
- [ ] Refresh tokens stored securely (Redis/DB with TTL)
- [ ] Access tokens short-lived (15-60 min)
- [ ] Refresh tokens longer-lived (7-30 days)
- [ ] Token revocation possible (logout clears refresh token)

**Verification:**
```bash
# Check JWT configuration
grep -rn "JwtUtil\|jwtSecret\|@JwtSecret" src/main/java/

# Check token validation
grep -rn "validateToken\|verify\|getClaims" src/main/java/
```

---

### 3. Authorization & Role-Based Access Control

```java
// ❌ FAIL: No authorization check
@DeleteMapping("/api/users/{id}")
public ResponseEntity<?> deleteUser(@PathVariable Long id) {
  userService.delete(id); // Any authenticated user can delete anyone!
  return ResponseEntity.ok().build();
}

// ✅ PASS: Admin-only operation
@DeleteMapping("/api/users/{id}")
@PreAuthorize("hasRole('ADMIN')")
public ResponseEntity<?> deleteUser(@PathVariable Long id) {
  userService.delete(id);
  return ResponseEntity.ok().build();
}

// ✅ PASS: User can only access own data
@GetMapping("/api/users/{id}")
public ResponseEntity<?> getUser(@PathVariable Long id, Authentication auth) {
  UserPrincipal user = (UserPrincipal) auth.getPrincipal();
  if (!user.getId().equals(id) && !user.hasRole("ADMIN")) {
    throw new ForbiddenException("Not authorized");
  }
  return ResponseEntity.ok(userService.getUser(id));
}
```

**Checks:**
- [ ] Admin endpoints have `@PreAuthorize("hasRole('ADMIN')")`
- [ ] User endpoints verify ownership (user can only see own data)
- [ ] Tenant-scoped endpoints verify tenant membership
- [ ] Method-level security used (`@PreAuthorize`, `@PostAuthorize`)
- [ ] No privilege escalation possible (roles from DB, not request)
- [ ] Role inheritance if used is documented and correct
- [ ] Denied access returns 403, not 400/404

**Verification:**
```bash
# Check for authorization annotations
grep -rn "@PreAuthorize" src/main/java/

# Check for missing authorization
grep -rn "@PostMapping\|@DeleteMapping" src/main/java/ | grep -v "@PreAuthorize"
```

---

### 4. Input Validation & SQL Injection Prevention

```java
// ❌ FAIL: SQL Injection risk
String query = "SELECT * FROM users WHERE email = '" + email + "'";
List<User> users = entityManager.createNativeQuery(query).getResultList();

// ✅ PASS: Parameterized query (JPA)
List<User> users = userRepository.findByEmail(email);

// ✅ PASS: Named parameters
String query = "SELECT u FROM User u WHERE u.email = :email";
List<User> users = entityManager.createQuery(query)
  .setParameter("email", email)
  .getResultList();
```

**Checks:**
- [ ] All database queries use JPA/ORM (no native SQL)
- [ ] If native SQL, uses parameterized queries
- [ ] Input validation on all controller methods
- [ ] Validation annotations on entity fields (`@NotNull`, `@Email`, `@Size`)
- [ ] Custom validators for complex rules
- [ ] No string interpolation in queries
- [ ] XPath injection prevented for XML operations

**Verification:**
```bash
# Check for native SQL queries
grep -rn "createNativeQuery\|@Query" src/main/java/

# Check for validation annotations
grep -rn "@Valid\|@NotNull\|@Email" src/main/java/
```

---

### 5. Tenant Boundary Enforcement

```java
// ❌ FAIL: No tenant check
@GetMapping("/api/listings/{id}")
public ResponseEntity<?> getListing(@PathVariable Long id) {
  Listing listing = listingService.findById(id);
  return ResponseEntity.ok(listing);
}

// ✅ PASS: Verify tenant ownership
@GetMapping("/api/listings/{id}")
public ResponseEntity<?> getListing(@PathVariable Long id, @CurrentTenant Long tenantId) {
  Listing listing = listingService.findById(id);
  if (!listing.getTenantId().equals(tenantId)) {
    throw new ForbiddenException("Not authorized");
  }
  return ResponseEntity.ok(listing);
}
```

**Checks:**
- [ ] Tenant ID extracted from JWT token or session (not request param)
- [ ] All queries filter by tenant ID automatically (custom repository base class)
- [ ] Cross-tenant data leakage not possible
- [ ] Tenant context propagated through service layers
- [ ] Admin queries explicitly cross-tenant if intended
- [ ] Database constraints enforce tenant boundaries (unique index on (tenant_id, entity_id))

**Verification:**
```bash
# Check for tenant filtering
grep -rn "getTenantId\|@CurrentTenant" src/main/java/

# Check repository patterns
grep -rn "findByTenantId" src/main/java/
```

---

### 6. Error Handling & Logging

```java
// ❌ FAIL: Leaks sensitive details
@ExceptionHandler(Exception.class)
public ResponseEntity<?> handleException(Exception e) {
  return ResponseEntity.status(500).body(new ErrorResponse(e.getMessage(), e.getStackTrace()));
}

// ✅ PASS: Safe error response
@ExceptionHandler(Exception.class)
public ResponseEntity<?> handleException(Exception e) {
  logger.error("Unexpected error", e);
  return ResponseEntity.status(500).body(new ErrorResponse("Internal server error"));
}

// ✅ PASS: Structured logging with context
logger.info("user_login", Map.of(
  "userId", user.getId(),
  "timestamp", System.currentTimeMillis()
));
logger.warn("failed_login", Map.of(
  "email", email,
  "attempt", attemptCount,
  "ip", request.getRemoteAddr()
));
```

**Checks:**
- [ ] Exception handlers return generic error messages
- [ ] Stack traces never returned to client
- [ ] Security events logged (login, failed auth, permission denied)
- [ ] Logs include context (userId, tenantId, timestamp)
- [ ] Sensitive data (passwords, tokens) not logged
- [ ] Log levels appropriate (INFO, WARN, ERROR)
- [ ] Log aggregation for audit trail

**Verification:**
```bash
# Check exception handling
grep -rn "@ExceptionHandler" src/main/java/

# Check logging statements
grep -rn "logger\\." src/main/java/ | head -20
```

---

### 7. Secret & Configuration Management

```java
// ❌ FAIL: Hardcoded secrets
private String jwtSecret = "my-super-secret-key";
private String dbPassword = "postgres123";

// ✅ PASS: Environment variables
@Value("${jwt.secret}")
private String jwtSecret;

@Value("${spring.datasource.password}")
private String dbPassword;

// ✅ PASS: Secure vaults (AWS Secrets Manager, Vault)
@Bean
public SecretsManagerClient secretsClient() {
  return SecretsManagerClient.builder().build();
}
```

**Checks:**
- [ ] No hardcoded secrets in source code
- [ ] Secrets read from environment or secure vault
- [ ] `application.yml` not committed (in `.gitignore`)
- [ ] `application-example.yml` documents all properties
- [ ] Secrets have minimum length (32+ chars)
- [ ] Database user has minimal required permissions
- [ ] API keys stored in secure vault (not properties file)

**Verification:**
```bash
# Check for hardcoded secrets
grep -En "password|secret|apiKey|token" src/main/java/ | grep -i "=.*[\'\"]"

# Check .gitignore
grep -E "application.*\\.yml|properties" .gitignore
```

---

### 8. External Service Calls & Resilience

```java
// ❌ FAIL: No timeout or error handling
RestTemplate restTemplate = new RestTemplate();
String response = restTemplate.getForObject("https://external-api.com/data", String.class);

// ✅ PASS: Timeout, retry, circuit breaker
@Configuration
public class HttpClientConfig {
  @Bean
  public RestTemplate restTemplate() {
    HttpComponentsClientHttpRequestFactory factory = new HttpComponentsClientHttpRequestFactory();
    factory.setConnectTimeout(5000); // 5 sec
    factory.setReadTimeout(5000);
    return new RestTemplate(factory);
  }
}

@Retry(maxAttempts = 3, delay = 1000, multiplier = 2)
@CircuitBreaker(failureThreshold = 5, delay = 10000)
public String callExternalAPI() {
  return restTemplate.getForObject("https://external-api.com/data", String.class);
}
```

**Checks:**
- [ ] HTTP calls have connection timeout (5-10 sec)
- [ ] HTTP calls have read timeout (5-10 sec)
- [ ] Retry logic with exponential backoff
- [ ] Circuit breaker pattern for failover
- [ ] Error responses validated before use
- [ ] API credentials not logged in errors

**Verification:**
```bash
# Check for RestTemplate/WebClient usage
grep -rn "RestTemplate\|WebClient" src/main/java/

# Check for timeout configuration
grep -rn "timeout\|setConnectTimeout" src/main/java/
```

---

### 9. Dependency Security

```bash
# ❌ FAIL: Vulnerable dependencies
mvn dependency-check:check

# ✅ PASS: No vulnerabilities
mvn clean install
mvn dependency-check:check # Should show no HIGH/CRITICAL
```

**Checks:**
- [ ] `mvn dependency-check:check` shows no HIGH/CRITICAL
- [ ] Spring Security version is current (5.7+)
- [ ] No deprecated or EOL dependencies
- [ ] Dependencies from central Maven repository
- [ ] `pom.xml` pinned versions (not range)

**Verification:**
```bash
cd services-java/listing-service
mvn dependency-check:check
mvn dependency:tree | grep -i "security\|validation"
```

---

### 10. API Endpoint Security

```java
// ❌ FAIL: No rate limiting, no pagination
@GetMapping("/api/users")
public ResponseEntity<?> getAllUsers() {
  return ResponseEntity.ok(userService.findAll());
}

// ✅ PASS: Rate limiting, pagination, authorization
@GetMapping("/api/users")
@PreAuthorize("hasRole('ADMIN')")
@RateLimit(maxRequests = 100, window = "1h")
public ResponseEntity<?> getAllUsers(
  @RequestParam(defaultValue = "0") int page,
  @RequestParam(defaultValue = "20") int size
) {
  Page<User> users = userService.findAll(PageRequest.of(page, size));
  return ResponseEntity.ok(users);
}
```

**Checks:**
- [ ] Rate limiting on all public endpoints
- [ ] Pagination enforced (no returning all records)
- [ ] Authentication required for sensitive endpoints
- [ ] CSRF tokens required for state-changing operations
- [ ] Request size limits enforced
- [ ] No direct object references (use IDs, verify ownership)

**Verification:**
```bash
# Check for rate limiting
grep -rn "@RateLimit\|RateLimiters" src/main/java/

# Check for pagination
grep -rn "Pageable\|Page<" src/main/java/
```

---

## Manual Verification Steps

1. **Start the application:**
   ```bash
   mvn spring-boot:run
   ```

2. **Test Authentication:**
   - [ ] Unauthenticated requests return 401
   - [ ] Invalid tokens return 401
   - [ ] Valid tokens grant access
   - [ ] Expired tokens return 401

3. **Test Authorization:**
   - [ ] Non-admin users cannot access `/api/admin/*`
   - [ ] Users cannot access other users' data
   - [ ] Users cannot cross tenant boundaries

4. **Test Input Validation:**
   - [ ] SQL injection payload rejected
   - [ ] Email validation enforced
   - [ ] Required fields not null
   - [ ] Invalid JSON returns 400

5. **Test Errors:**
   - [ ] Errors don't expose stack traces
   - [ ] Error messages are generic
   - [ ] Logs capture security events

---

## Failure Criteria (Block Merge)

- [ ] No Spring Security configuration
- [ ] Authentication missing on protected endpoints
- [ ] Authorization bypass possible (missing `@PreAuthorize`)
- [ ] SQL injection or parameter injection vulnerability
- [ ] Tenant boundary not enforced
- [ ] Secrets hardcoded in source
- [ ] Error messages expose internals
- [ ] Passwords stored plaintext
- [ ] `mvn dependency-check:check` shows HIGH/CRITICAL
- [ ] No rate limiting on public endpoints

---

## References

- Rule 4: Security Standards (`.claude/rules/04-security-standards.md`)
- OWASP Top 10: `code-review/review-security-scanning-pentesting.md`
- Spring Security: https://spring.io/projects/spring-security
- Spring Boot Actuator: https://spring.io/guides/gs/actuator-service/
- OWASP for Java: https://cheatsheetseries.owasp.org/cheatsheets/Java_Security_Cheat_Sheet.html
