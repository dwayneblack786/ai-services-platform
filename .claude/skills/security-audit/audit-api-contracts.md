# Security Audit: API Contracts & Endpoints (All Tiers)

## Purpose

Conduct a comprehensive security audit of API endpoints and gRPC methods to ensure proper authentication, versioning, input validation, and prevent breaking changes that could affect security.

## When to Use

- New REST endpoint or gRPC service method
- Changes to API request/response shapes
- API versioning changes
- Contract breaking changes
- Authentication changes on endpoints
- Rate limiting or throttling updates

---

## Audit Checklist

### 1. Endpoint Authentication & Authorization

```typescript
// ❌ FAIL: Public endpoint, no auth required
app.get('/api/user/:id', (req, res) => {
  res.json(userService.getUser(req.params.id));
});

// ✅ PASS: Authentication required
app.get('/api/user/:id', authenticateToken, (req, res) => {
  const user = userService.getUser(req.params.id);
  if (user.id !== req.user.id && !req.user.isAdmin) {
    throw new ForbiddenError();
  }
  res.json(user);
});
```

**Checks:**
- [ ] All endpoints requiring authentication have auth middleware
- [ ] Authorization verified (not just authentication)
- [ ] Admin endpoints require admin role
- [ ] User-owned resource endpoints verify ownership
- [ ] 401 returned for missing/invalid auth
- [ ] 403 returned for insufficient permission
- [ ] Token expiration handled gracefully

**Verification:**
```bash
# Node backend
grep -n "app\\.get\|app\\.post\|app\\.delete" src/routes/*.ts | grep -v "authenticateToken"

# Java
grep -n "@GetMapping\|@PostMapping" src/main/java/*Controller.java | grep -v "@PreAuthorize"
```

---

### 2. Request/Response Validation

```typescript
// ❌ FAIL: No request validation
app.post('/api/listings', authenticateToken, (req, res) => {
  const listing = listingService.create(req.body);
  res.json(listing);
});

// ✅ PASS: Request and response validated
const listingSchema = Joi.object({
  title: Joi.string().required().max(255),
  address: Joi.string().required(),
  price: Joi.number().positive().required(),
  images: Joi.array().items(Joi.string().uri()).max(10)
});

app.post('/api/listings', authenticateToken, async (req, res) => {
  const { error, value } = listingSchema.validate(req.body);
  if (error) throw new BadRequestError(error.details[0].message);
  
  const listing = await listingService.create(value);
  res.json(listing); // Response is also listing shape
});
```

**Checks:**
- [ ] Request validation schema defined (Joi, Zod, class-validator)
- [ ] All required fields validated
- [ ] Type validation (string, number, boolean)
- [ ] Length/size validation (max length, max items)
- [ ] Format validation (email, URL, date format)
- [ ] Response types match schema (TypeScript types enforced)
- [ ] File uploads validated (MIME type, size)

**Verification:**
```bash
# Check for validation schemas
grep -rn "Joi\|Zod\|@IsString\|@MaxLength" src/

# Check for unvalidated endpoints
grep -n "req.body\|req.query" src/routes/*.ts | grep -v "validate"
```

---

### 3. HTTPS & Protocol Security

```typescript
// ❌ FAIL: Allows insecure connection
app.listen(3000); // HTTP only

// ✅ PASS: HTTPS enforced
if (process.env.NODE_ENV === 'production') {
  const options = {
    key: fs.readFileSync(process.env.TLS_KEY_PATH),
    cert: fs.readFileSync(process.env.TLS_CERT_PATH)
  };
  https.createServer(options, app).listen(443);
} else {
  app.listen(3000);
}

// ✅ PASS: Redirect HTTP → HTTPS
app.use((req, res, next) => {
  if (!req.secure && process.env.NODE_ENV === 'production') {
    return res.redirect(`https://${req.headers.host}${req.url}`);
  }
  next();
});
```

**Checks:**
- [ ] HTTPS enforced in production
- [ ] HTTP redirects to HTTPS
- [ ] TLS certificate valid and not expired
- [ ] Minimum TLS 1.2 (preferably 1.3)
- [ ] Ciphers are strong (no weak algorithms)
- [ ] HSTS header enabled (`Strict-Transport-Security`)
- [ ] Certificates from trusted CA

**Verification:**
```bash
# Check for HTTPS enforcement
grep -rn "https\|secure\|TLS" src/index.ts

# Check HSTS header
grep -rn "Strict-Transport-Security" src/
```

---

### 4. Rate Limiting & DDoS Protection

```typescript
// ❌ FAIL: No rate limiting
app.post('/api/login', handleLogin);

// ✅ PASS: Rate limiting on sensitive endpoint
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 attempts
  message: 'Too many login attempts, try again later'
});

app.post('/api/login', loginLimiter, handleLogin);

// ✅ PASS: Different limits per endpoint type
const publicLimiter = rateLimit({ windowMs: 60000, max: 100 });
const authLimiter = rateLimit({ windowMs: 60000, max: 1000 });

app.get('/api/listings', publicLimiter, handleGetListings);
app.get('/api/user/me', authLimiter, handleGetUser);
```

**Checks:**
- [ ] Rate limiting on login/registration endpoints (5 attempts/15 min)
- [ ] Rate limiting on public endpoints (100 requests/min)
- [ ] Rate limiting on authenticated endpoints (1000 requests/min)
- [ ] Rate limiting on password reset (3 attempts/hour)
- [ ] Rate limiting on file upload (10 uploads/hour)
- [ ] Returns 429 status on limit exceeded
- [ ] Rate limit keys use IP or authenticated user

**Verification:**
```bash
# Check for rate limiting
grep -rn "rateLimit" src/routes/*.ts

# Check for unprotected sensitive endpoints
grep -n "login\|register\|password" src/routes/*.ts | grep -v "Limiter"
```

---

### 5. API Versioning

```typescript
// ❌ FAIL: No versioning; breaking changes affect all clients
app.get('/api/user/:id', (req, res) => {
  res.json(userService.getUser()); // Added field breaks old clients
});

// ✅ PASS: Version in URL path
app.get('/api/v1/user/:id', (req, res) => {
  res.json(userService.getUser());
});

app.get('/api/v2/user/:id', (req, res) => {
  res.json(userService.getUserWithExtendedFields());
});

// ✅ PASS: Accept header versioning
app.get('/api/user/:id', (req, res) => {
  const version = req.get('Accept').includes('application/vnd.api+json;version=2') ? 2 : 1;
  if (version === 2) {
    res.json(userService.getUserWithExtendedFields());
  } else {
    res.json(userService.getUser());
  }
});
```

**Checks:**
- [ ] API versioning strategy documented (URL or header-based)
- [ ] Breaking changes result in new version (v1 → v2)
- [ ] Old versions supported for deprecation period (6 months+)
- [ ] Deprecation warnings sent (`Deprecation` header)
- [ ] Client can opt-in to new behavior without breaking
- [ ] Changelog documents all version changes

**Verification:**
```bash
# Check for versioning
grep -rn "/api/v[0-9]" src/routes/*.ts

# Check for deprecation headers
grep -rn "Deprecation\|Sunset" src/
```

---

### 6. Error Response Format

```typescript
// ❌ FAIL: Inconsistent, leaky error responses
GET /api/user/999 → { error: "User not found" }
GET /api/listing/999 → { message: "Record not found" }
GET /api/admin → Unauthorized (with stack trace)

// ✅ PASS: Consistent error format
{
  "error": {
    "code": "NOT_FOUND",
    "message": "User not found",
    "requestId": "req-123-abc",
    "timestamp": "2024-01-01T00:00:00Z"
  }
}

{
  "error": {
    "code": "FORBIDDEN",
    "message": "Insufficient permissions"
  }
}

{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid input",
    "details": [
      { "field": "email", "message": "Invalid email format" }
    ]
  }
}
```

**Checks:**
- [ ] All error responses have consistent structure
- [ ] Error includes status code (400, 401, 403, 500, etc.)
- [ ] Error code is machine-readable (NOT_FOUND, FORBIDDEN, etc.)
- [ ] Error message is user-friendly (not stack trace)
- [ ] Validation errors include field-level details
- [ ] No sensitive data in error messages
- [ ] Errors include request ID for tracing

**Verification:**
```bash
# Check error handler structure
grep -rn "@ExceptionHandler\|error:" src/ | head -20
```

---

### 7. Data Sensitivity & PII in Responses

```typescript
// ❌ FAIL: Returns sensitive user data to any caller
GET /api/user/123 → {
  id: 123,
  email: "user@example.com",
  password: "hashed_password", // Should never return!
  ssn: "123-45-6789",
  creditCard: "4111-1111-1111-1111"
}

// ✅ PASS: Returns only necessary data
GET /api/user/123 → {
  id: 123,
  name: "John Doe",
  email: "user@example.com" // Only if requesting own profile
}

GET /api/admin/user/123 → {
  id: 123,
  name: "John Doe",
  email: "user@example.com",
  createdAt: "2024-01-01",
  status: "active"
  // No passwords, SSNs, payment data
}
```

**Checks:**
- [ ] Passwords never returned (even hashed)
- [ ] SSN, financial data not returned unless explicitly required
- [ ] Email returned only to authenticated users
- [ ] Admin responses contain only admin-relevant fields
- [ ] User responses contain only user-relevant fields
- [ ] PII fields masked in logs/audit trails
- [ ] GDPR/privacy compliance reviewed

**Verification:**
```bash
# Check what's returned in user endpoints
grep -A 20 "GET.*user\|getUser" src/services/*.ts | grep -i "password\|ssn\|card"
```

---

### 8. CORS & Cross-Origin Requests

```typescript
// ❌ FAIL: Allows all origins
app.use(cors({ origin: '*', credentials: true }));

// ✅ PASS: Explicit whitelist
app.use(cors({
  origin: process.env.CORS_ORIGINS?.split(',') || ['http://localhost:3000'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
```

**Checks:**
- [ ] CORS origin is not `*` when credentials allowed
- [ ] CORS origin whitelist explicit
- [ ] Only required HTTP methods allowed
- [ ] Only required headers allowed
- [ ] `credentials: true` only for same-origin requests
- [ ] Preflight requests cached to reduce overhead

**Verification:**
```bash
# Check CORS configuration
grep -rn "cors(" src/index.ts
```

---

### 9. Backward Compatibility & Deprecation

```typescript
// ❌ FAIL: Breaking change without warning
// Old endpoint removed, client breaks immediately
DELETE /api/v1/listings/:id

// ✅ PASS: Deprecation timeline
// v1.0 - v2.0 (6 months): Both endpoints work
// v2.1+: Old endpoint only returns 410 Gone with migration guide

app.delete('/api/v1/listings/:id', (req, res) => {
  res.set('Deprecation', 'true');
  res.set('Sunset', new Date(Date.now() + 180*24*60*60*1000).toUTCString());
  res.set('Link', '<https://api.example.com/docs/v2-migration>; rel="deprecation"');
  // ... handle request
});
```

**Checks:**
- [ ] Deprecation notices sent 6+ months before removal
- [ ] Migration guides provided
- [ ] Sunset header includes removal date
- [ ] Link header points to migration documentation
- [ ] Old versions supported during deprecation
- [ ] Changelog updated with all changes

**Verification:**
```bash
# Check for deprecation headers
grep -rn "Deprecation\|Sunset\|Link" src/
```

---

### 10. gRPC Security (If Used)

```java
// ❌ FAIL: No authentication
@Override
public void getUserListings(ListingsRequest request, StreamObserver<Listing> responseObserver) {
  List<Listing> listings = service.getListings(request.getUserId());
  responseObserver.onNext(listings);
  responseObserver.onCompleted();
}

// ✅ PASS: Metadata validation
@Override
public void getUserListings(ListingsRequest request, StreamObserver<Listing> responseObserver) {
  String authToken = ExceptionHandler.getAuthToken(headers);
  if (authToken == null) {
    responseObserver.onError(Status.UNAUTHENTICATED.withDescription("Token required").asException());
    return;
  }
  
  UserPrincipal user = validateToken(authToken);
  List<Listing> listings = service.getListings(user.getId());
  responseObserver.onNext(listings);
  responseObserver.onCompleted();
}
```

**Checks:**
- [ ] gRPC methods verify authentication via metadata
- [ ] Authorization enforced (not just authentication)
- [ ] Sensitive data not exposed in gRPC error messages
- [ ] TLS/mTLS configured for production
- [ ] Metadata size limits enforced
- [ ] Message size limits enforced

**Verification:**
```bash
# Check gRPC authentication
grep -rn "getMetadata\|onMetadata" src/main/java/*Service.java
```

---

## Manual Verification Steps

1. **Test with cURL/Postman:**
   ```bash
   # Missing auth
   curl -X GET http://localhost:3001/api/protected
   # Should return 401

   # Missing authorization
   curl -H "Authorization: Bearer <user-token>" \
     -X DELETE http://localhost:3001/api/admin/users/1
   # Should return 403
   ```

2. **Test rate limiting:**
   ```bash
   for i in {1..10}; do
     curl -X POST http://localhost:3001/api/login \
       -d '{"email":"test","password":"test"}'
   done
   # 5th request onwards should return 429
   ```

3. **Verify error responses:**
   - [ ] No stack traces in error messages
   - [ ] No database schema details
   - [ ] Consistent error format

---

## Failure Criteria (Block Merge)

- [ ] Authentication missing on protected endpoint
- [ ] No authorization check (403 should be possible)
- [ ] No request/response validation
- [ ] No rate limiting on sensitive endpoints
- [ ] Breaking change without version increment
- [ ] Error messages expose internals or schema
- [ ] Sensitive data returned unnecessarily
- [ ] CORS allows all origins with credentials
- [ ] No HTTPS enforcement
- [ ] gRPC methods lack authentication

---

## References

- Rule 4: Security Standards (`.ai/rules/04-security-standards.md`)
- REST Best Practices: https://restfulapi.net/
- API Security: https://cheatsheetseries.owasp.org/cheatsheets/REST_Assessment_Cheat_Sheet.html
- gRPC Security: https://grpc.io/docs/guides/auth/
