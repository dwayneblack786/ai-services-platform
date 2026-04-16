# Security Audit: Node.js/Express + TypeScript Backend

## Purpose

Conduct a comprehensive security audit of Node.js/Express backend changes to ensure authentication, input handling, error management, and secret handling meet production security standards.

## When to Use

- New or modified route handlers and middleware
- Authentication or session changes
- External API integrations
- File upload endpoints
- Database query changes
- Configuration or environment variable handling

---

## Audit Checklist

### 1. Authentication & Session Management

```typescript
// ❌ FAIL: No authentication middleware
app.get('/api/data', (req, res) => {
  res.json(sensitiveData);
});

// ✅ PASS: Authentication required
app.get('/api/data', authenticateToken, (req, res) => {
  res.json(sensitiveData);
});
```

**Checks:**
- [ ] Endpoints requiring auth have `authenticateToken` or similar middleware
- [ ] Session middleware initialized before protected routes
- [ ] Cookies marked as `httpOnly` and `secure` (non-local envs)
- [ ] Session secrets from environment variables (not hardcoded)
- [ ] JWT tokens include expiration (`exp` claim)
- [ ] logout/destroy clears session from Redis/DB
- [ ] No user IDs or credentials in JWT payload claims

**Verification:**
```bash
# Check middleware registration
grep -n "authenticateToken" src/routes/*.ts
grep -n "session\|passport" src/index.ts

# Check env usage
grep -n "SESSION_SECRET\|JWT_SECRET" src/config.ts
```

---

### 2. Input Validation & Rate Limiting

```typescript
// ❌ FAIL: No validation; rate limiting
app.post('/api/login', (req, res) => {
  const { email, password } = req.body;
  // Use directly without validation
  const user = db.users.findOne({ email });
});

// ✅ PASS: Validate and rate-limit
const loginLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 5 });
app.post('/api/login', loginLimiter, (req, res) => {
  const { email, password } = await validateLoginPayload(req.body);
  const user = db.users.findOne({ email });
});
```

**Checks:**
- [ ] Input validation on all POST/PUT/PATCH endpoints
- [ ] Rate limiting on login, password reset, registration
- [ ] Rate limiting on public/unauthenticated endpoints
- [ ] File uploads validate size (< 10MB), type, content
- [ ] Query parameters sanitized before database queries
- [ ] No direct string interpolation in MongoDB/SQL queries
- [ ] Joi/Zod schemas defined for request bodies

**Verification:**
```bash
# Check for validation
grep -n "joi\|zod\|validate(" src/routes/*.ts

# Check for rate limiting
grep -n "rateLimit" src/routes/*.ts src/middleware/*.ts

# Check for file upload config
grep -n "multer\|upload" src/routes/*.ts
```

---

### 3. Error Handling & Logging

```typescript
// ❌ FAIL: Leaks internal error details
app.get('/api/data', (req, res) => {
  try {
    const data = db.query(req.query.filter);
  } catch (err) {
    res.status(500).json({ error: err.message, stack: err.stack });
  }
});

// ✅ PASS: Safe error response + structured logging
app.get('/api/data', (req, res) => {
  try {
    const data = db.query(req.query.filter);
  } catch (err) {
    logger.error('data_fetch_failed', { 
      userId: req.user.id, 
      err: err.message,
      stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
    });
    res.status(500).json({ error: 'Internal server error' });
  }
});
```

**Checks:**
- [ ] Error responses don't expose stack traces (except dev mode)
- [ ] Error responses don't include database schema details
- [ ] Sensitive operations logged with user/tenant context
- [ ] Failed login attempts logged (IP, attempt count, email)
- [ ] No passwords, tokens, or API keys in logs
- [ ] Log levels appropriate (info, warn, error)
- [ ] Errors include request ID for tracing

**Verification:**
```bash
# Check for safe error handling
grep -n "err.message\|err.stack" src/routes/*.ts

# Check for structured logging
grep -n "logger\." src/routes/*.ts

# Check for secret exposure
grep -n "password\|token\|secret\|key" src/routes/*.ts
```

---

### 4. Secret & Configuration Management

```typescript
// ❌ FAIL: Hardcoded secrets
const dbPassword = 'super-secret-password';
const apiKey = 'sk_live_12345678';

// ✅ PASS: Environment variables
const dbPassword = process.env.DB_PASSWORD;
const apiKey = process.env.CLAUDE_API_KEY;
```

**Checks:**
- [ ] No hardcoded passwords, API keys, tokens in code
- [ ] All secrets read from environment variables
- [ ] `.env` file not committed (in `.gitignore`)
- [ ] `.env.example` present with dummy values
- [ ] Database URLs include auth from environment
- [ ] JWT secret has minimum 32 characters
- [ ] Session secret has minimum 32 characters
- [ ] API key validation: never log full key, only prefix

**Verification:**
```bash
# Check for hardcoded secrets
grep -En "password|secret|apiKey|token" src/ | grep -v "process.env"

# Check .gitignore
cat .gitignore | grep ".env"

# Check .env.example exists
ls -la .env.example
```

---

### 5. Tenant & User Boundary Enforcement

```typescript
// ❌ FAIL: No tenant check
app.get('/api/listings/:id', authenticateToken, (req, res) => {
  const listing = db.listings.findById(req.params.id);
  res.json(listing); // Any authenticated user sees any listing
});

// ✅ PASS: Verify tenant ownership
app.get('/api/listings/:id', authenticateToken, (req, res) => {
  const listing = await db.listings.findById(req.params.id);
  if (listing.tenantId !== req.user.tenantId) {
    throw new ForbiddenError('Not authorized');
  }
  res.json(listing);
});
```

**Checks:**
- [ ] All data queries filter by `req.user.tenantId`
- [ ] No cross-tenant data leakage in queries
- [ ] User cannot update other users' resources
- [ ] Admin operations verify role (not just presence)
- [ ] Tenant ID comes from authenticated token, not request body
- [ ] Database indexes include tenant ID on queries

**Verification:**
```bash
# Check for tenant filtering
grep -n "tenantId\|req.user.id" src/services/*.ts

# Check query patterns
grep -n "findById\|find(" src/services/*.ts | grep -v "tenantId"
```

---

### 6. External Service Calls

```typescript
// ❌ FAIL: No timeout, retry, or error handling
const vision = await fetchExternalVisionAPI(imageUrl);

// ✅ PASS: Timeout, retry logic, safe error handling
const vision = await fetchWithTimeout(
  fetchExternalVisionAPI(imageUrl),
  5000 // 5 second timeout
);
```

**Checks:**
- [ ] External API calls have timeout (5-30 seconds)
- [ ] Retry logic with exponential backoff
- [ ] Error handling doesn't leak internal IPs or stack
- [ ] API responses validated before use
- [ ] API keys not logged or displayed in errors
- [ ] Circuit breaker pattern for failover

**Verification:**
```bash
# Check for timeouts
grep -n "timeout\|AbortSignal" src/services/*.ts

# Check for error handling
grep -n "try\|catch" src/services/*.ts
```

---

### 7. Dependencies & Supply Chain

```bash
# ❌ FAIL: Unvetted dependency
npm install some-random-package

# ✅ PASS: Check before installing
npm audit
npm view some-random-package
npm install some-random-package && npm audit
```

**Checks:**
- [ ] `npm audit` shows no high/critical vulnerabilities
- [ ] New dependencies vetted (downloads, downloads trend, repo)
- [ ] Dependency version pinned (not `*` or `latest`)
- [ ] No duplicate dependencies in package.json
- [ ] Lockfile committed to Git (package-lock.json)

**Verification:**
```bash
# Check vulnerabilities
npm audit

# Check outdated packages
npm outdated

# Check lockfile
ls -la package-lock.json
```

---

### 8. CORS & Headers

```typescript
// ❌ FAIL: Insecure CORS
app.use(cors({ origin: '*', credentials: true }));

// ✅ PASS: Explicit whitelist
app.use(cors({
  origin: process.env.CORS_ORIGINS?.split(',') || ['http://localhost:3000'],
  credentials: true
}));
```

**Checks:**
- [ ] CORS origin is not `*` when credentials allowed
- [ ] CORS origin whitelist explicit (not wildcard)
- [ ] Security headers set: CSP, X-Frame-Options, X-Content-Type-Options
- [ ] HTTPS forced in production (`secure: true` on cookies)
- [ ] HSTS header enabled (`Strict-Transport-Security`)

**Verification:**
```bash
# Check CORS config
grep -n "cors" src/index.ts

# Check security headers
grep -n "helmet\|setHeader" src/index.ts
```

---

### 9. Database Security

```typescript
// ❌ FAIL: String interpolation
const query = `SELECT * FROM users WHERE id = ${userId}`;
db.query(query);

// ✅ PASS: Parameterized query
const query = `SELECT * FROM users WHERE id = ?`;
db.query(query, [userId]);
```

**Checks:**
- [ ] All database queries use parameterized queries or ORM
- [ ] No string interpolation in SQL or MongoDB queries
- [ ] Database connection string from environment
- [ ] Database user has minimal required permissions (least privilege)
- [ ] Sensitive fields (passwords, API keys) not stored plaintext
- [ ] Encryption keys rotated periodically

**Verification:**
```bash
# Check for string interpolation in queries
grep -rn "\`.*\${.*}\`\|'.*\+.*'" src/services/*.ts | grep -i "select\|insert\|update"
```

---

### 10. Compliance & Audit Trail

```typescript
// ❌ FAIL: No audit log
app.post('/api/admin/users/:id/suspend', adminOnly, (req, res) => {
  db.users.update(id, { suspended: true });
  res.json({ success: true });
});

// ✅ PASS: Audit log recorded
app.post('/api/admin/users/:id/suspend', adminOnly, (req, res) => {
  db.users.update(id, { suspended: true });
  logger.warn('user_suspended', { 
    adminId: req.user.id, 
    userId: id, 
    timestamp: new Date()
  });
  res.json({ success: true });
});
```

**Checks:**
- [ ] High-impact actions logged (admin, data deletion, permission changes)
- [ ] Audit logs include user, action, timestamp, resource
- [ ] Audit logs retained for 90+ days
- [ ] Logs Cannot be modified after creation
- [ ] Compliance requirements (GDPR, privacy) documented
- [ ] Data retention policy documented and enforced

---

## Manual Verification Steps

1. **Start the server:**
   ```bash
   npm run dev
   ```

2. **Test authentication:**
   - [ ] Unauthenticated requests return 401
   - [ ] Invalid tokens return 401
   - [ ] Expired tokens return 401
   - [ ] Valid tokens grant access

3. **Test rate limiting:**
   - [ ] Multiple failed logins trigger throttle
   - [ ] Rate limit returns 429 status
   - [ ] Rate limit resets after window

4. **Test error handling:**
   - [ ] Invalid JSON returns 400, not stack trace
   - [ ] Database errors don't leak schema
   - [ ] Stack traces never shown to client

5. **Test tenant isolation:**
   - [ ] User A can't see User B's data
   - [ ] Change tenant ID in query; verify 403
   - [ ] Admin sees all tenants; user sees only own

6. **Environment variables:**
   - [ ] No `.env` file committed
   - [ ] `.env.example` documents all variables
   - [ ] Server starts with missing `.env` (graceful error)

---

## Failure Criteria (Block Merge)

- [ ] Authentication missing on protected endpoint
- [ ] Secrets hardcoded in source code
- [ ] SQL/injection or command injection vulnerability
- [ ] Tenant boundary not enforced
- [ ] Error messages expose internals or schema
- [ ] Passwords stored plaintext
- [ ] Rate limiting missing on login/sensitive endpoints
- [ ] npm audit shows high/critical vulnerabilities
- [ ] No input validation on external input

---

## References

- Rule 4: Security Standards (`.claude/rules/04-security-standards.md`)
- OWASP Top 10: `code-review/review-security-scanning-pentesting.md`
- Express Security: https://expressjs.com/en/advanced/best-practice-security.html
- Node.js Security: https://nodejs.org/en/docs/guides/security/
