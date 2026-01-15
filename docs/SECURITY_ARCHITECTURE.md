# Security Architecture

Comprehensive guide to the security model, threat mitigation, and implementation details of the AI Services Platform.

## Table of Contents
1. [Overview](#overview)
2. [Authentication](#authentication)
3. [Authorization & Access Control](#authorization--access-control)
4. [Multi-Tenancy & Data Isolation](#multi-tenancy--data-isolation)
5. [API Security](#api-security)
6. [Input Validation](#input-validation)
7. [Data Protection](#data-protection)
8. [Network Security](#network-security)
9. [Security Best Practices](#security-best-practices)
10. [Threat Model & Mitigation](#threat-model--mitigation)

---

## Overview

The platform implements a **multi-tenant, role-based security model** with three layers of enforcement:

```
┌─────────────────────────────────────┐
│      Frontend (React)               │
│   • Token validation                │
│   • UI-level role checks            │
│   • Protected route enforcement     │
└────────────────┬────────────────────┘
                 │ HTTPS/TLS
┌────────────────▼────────────────────┐
│    Backend (Node.js/Express)        │
│   • JWT token verification          │
│   • Role-based access control       │
│   • Tenant ID filtering             │
│   • Input sanitization              │
└────────────────┬────────────────────┘
                 │
┌────────────────▼────────────────────┐
│    MongoDB Database                 │
│   • TenantID-based isolation        │
│   • Indexes for tenant queries      │
│   • Role-based document access      │
└─────────────────────────────────────┘
```

---

## Authentication

### OAuth2 with Google

Implements **Authorization Code Grant Flow** with JWT tokens.

**Flow Diagram**:
```
User                Frontend              Backend              Google
  │                    │                    │                   │
  ├─ Click "Sign in" ──>                   │                   │
  │                    │                    │                   │
  │                    ├─ POST /auth/google>                  │
  │                    │                    │                   │
  │                    │                    ├─ Redirect ────────>
  │                    │                    │   (to Google)      │
  │                    │<─ Redirect URL ───┤                   │
  │<──────────────────────────────────────┤                   │
  │   (Opens Google login)                 │                   │
  │                                        │                   │
  │─ Login & Authorize ──────────────────────────────────────>
  │                                        │                   │
  │<─ Redirect + Auth Code ──────────────────────────────────┤
  │                    │                    │                   │
  │                    ├─ POST /callback ──>                  │
  │                    │ + auth code        │                   │
  │                    │                    ├─ Exchange ────────>
  │                    │                    │ code for token    │
  │                    │                    │<─ ID token ──────┤
  │                    │<─ JWT + Cookies ──┤                   │
  │                    │                    │                   │
  │<─────────────────────────────────────┤                   │
  │   Redirect to dashboard               │                   │
  │   (with httpOnly cookie set)          │                   │
```

**Implementation Details**:

- **Library**: Passport.js with `passport-google-oauth20`
- **Token Type**: JWT (JSON Web Tokens)
- **Token Storage**: HTTP-only secure cookies (prevents XSS attacks)
- **Token Expiration**: 24 hours (configured in `.env`)
- **Refresh Strategy**: Token renewal on backend

### JWT Token Structure

```javascript
// Header
{
  "alg": "HS256",
  "typ": "JWT"
}

// Payload
{
  "id": "user-123",
  "email": "user@example.com",
  "tenantId": "tenant-456",
  "role": "TENANT_ADMIN",
  "iat": 1705276800,      // Issued at
  "exp": 1705363200       // Expires in 24 hours
}

// Signature
HMACSHA256(
  base64UrlEncode(header) + "." +
  base64UrlEncode(payload),
  JWT_SECRET
)
```

**Key Fields**:
- `id`: User ID for session tracking
- `email`: User email (verified by OAuth provider)
- `tenantId`: Multi-tenancy isolation
- `role`: Role-based access control
- `iat`/`exp`: Token lifetime

### Development Login Bypass

For development without Google OAuth:

```bash
POST http://localhost:5000/api/auth/dev-login
# Returns JWT token as httpOnly cookie
# Only available when ENABLE_DEV_LOGIN=true and NODE_ENV=development
```

**Security Note**: MUST be disabled in production.

---

## Authorization & Access Control

### Role Hierarchy

Five-level role system with escalating permissions:

```
USER (Minimal permissions)
    ↓
TENANT_USER (Tenant-scoped)
    ↓
TENANT_ADMIN (Tenant management)
    ↓
PROJECT_ADMIN (Multi-tenant access)
    ↓
SUPER_ADMIN (Full system access)
```

**Permission Matrix**:

| Resource | USER | TENANT_USER | TENANT_ADMIN | PROJECT_ADMIN | SUPER_ADMIN |
|----------|------|-------------|--------------|---------------|-------------|
| View own profile | ✅ | ✅ | ✅ | ✅ | ✅ |
| View tenant users | ❌ | ✅ | ✅ | ✅ | ✅ |
| Manage tenant users | ❌ | ❌ | ✅ | ✅ | ✅ |
| View all tenants | ❌ | ❌ | ❌ | ✅ | ✅ |
| Create/delete tenants | ❌ | ❌ | ❌ | ✅ | ✅ |
| View system reports | ❌ | ❌ | ❌ | ✅ | ✅ |
| Access audit logs | ❌ | ❌ | ❌ | ✅ | ✅ |
| Manage system config | ❌ | ❌ | ❌ | ❌ | ✅ |

### Implementation: Middleware Chain

**File**: `backend-node/src/middleware/rbac.ts`

```typescript
// 1. Auth middleware - Validates JWT
router.use(authenticateToken);

// 2. RBAC middleware - Checks roles
router.get('/api/tenants', requireProjectAdmin, (req, res) => {
  // Only PROJECT_ADMIN+ can access
});

// 3. Tenant filtering - Automatic in query
router.get('/api/products', async (req, res) => {
  // Query automatically filtered by tenantId
  const products = await Product.find({ tenantId: req.tenantId });
});
```

**Middleware Stack Order**:
1. **Authentication** (`auth.ts`) - Validates JWT token
2. **RBAC** (`rbac.ts`) - Checks user role
3. **Authorization** (`authorization.ts`) - Resource-level access
4. **Route Handler** - Business logic

---

## Multi-Tenancy & Data Isolation

### TenantID as Isolation Boundary

Every collection includes `tenantId` as the primary isolation mechanism:

```javascript
// User document
{
  _id: ObjectId("..."),
  tenantId: "tenant-123",  // ← Isolation key
  email: "user@example.com",
  role: "TENANT_ADMIN"
}

// Products document
{
  _id: ObjectId("..."),
  tenantId: "tenant-123",  // ← Same tenant only
  name: "Virtual Assistant",
  price: 99.99
}

// Query automatically includes tenantId filter
db.products.find({ tenantId: "tenant-123" })
```

**Collections with TenantID**:
- `users`
- `products`
- `subscriptions`
- `assistant_calls`
- `chat_sessions`
- `assistant_channels`
- `prompts`
- `transactions`
- `usage_events`
- `payment_methods`
- `product_configurations`
- `chat_history`
- + 2 more

### Tenant Context Propagation

**Request Flow**:

```
1. User logs in
   → JWT created with tenantId
   
2. Frontend sends request
   → JWT in httpOnly cookie
   
3. Backend receives request
   → Middleware extracts JWT
   → Sets req.tenantId from token payload
   → Adds to all database queries
   
4. Database operations
   → All queries filter by tenantId
   → Prevents cross-tenant data access
```

**Example - Safe Query**:

```typescript
// ✅ Safe: TenantId added automatically
async function getUserProducts(userId: string, req: Request) {
  return await Product.find({
    tenantId: req.tenantId,  // ← From middleware
    userId: userId
  });
}

// ❌ Unsafe (DON'T DO THIS)
async function getUserProducts(userId: string, tenantId: string) {
  return await Product.find({
    userId: userId
    // Missing tenantId filter!
  });
}
```

### Preventing Tenant Leakage

**Risks Mitigated**:

1. **Direct URL Manipulation**: User tries `/api/products/tenant-999`
   - Middleware validates JWT's tenantId
   - Request rejected if mismatch

2. **API Parameter Injection**: User sends `?tenantId=other-tenant`
   - Parameter ignored
   - req.tenantId from token used instead

3. **JWT Tampering**: User modifies token
   - HMAC signature fails validation
   - Request rejected

4. **Cross-Service Data Access**: Java service receives malicious request
   - Service validates tenantId in JWT
   - All MongoDB queries filter by tenantId

---

## API Security

### CORS Configuration

**File**: `backend-node/src/index.ts`

```typescript
const cors = require('cors');

app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:5173',
  credentials: true,  // Allow cookies
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
```

**Security Details**:
- ✅ Only trusted origin accepted (not `*`)
- ✅ Credentials included for session management
- ✅ Explicit methods whitelist
- ✅ Explicit headers whitelist

### HTTPS/TLS

**Production Requirement**:
```
All communication must use HTTPS (TLS 1.2+)
```

**Backend Configuration**:
```typescript
// Use 'https' module with certificate
import https from 'https';
import fs from 'fs';

const cert = fs.readFileSync('/path/to/cert.pem');
const key = fs.readFileSync('/path/to/key.pem');

https.createServer({ cert, key }, app).listen(5000);
```

**Reverse Proxy (Recommended)**:
```nginx
# nginx configuration
server {
  listen 443 ssl;
  ssl_certificate /path/to/cert.pem;
  ssl_certificate_key /path/to/key.pem;
  
  location / {
    proxy_pass http://localhost:5000;
    proxy_set_header X-Forwarded-Proto https;
  }
}
```

### Cookie Security

**HTTP-Only Cookies**:
```typescript
res.cookie('token', jwtToken, {
  httpOnly: true,      // Cannot be accessed by JavaScript (XSS protection)
  secure: true,        // Only sent over HTTPS
  sameSite: 'strict',  // CSRF protection
  maxAge: 24 * 60 * 60 * 1000  // 24 hours
});
```

**Comparison**:

| Storage Method | XSS Vulnerable | CSRF Vulnerable | Notes |
|---|---|---|---|
| localStorage | ✅ Yes | ✅ Yes | Avoid for tokens |
| sessionStorage | ✅ Yes | ✅ Yes | Avoid for tokens |
| **httpOnly Cookie** | ❌ No | ✅ Protected | **Recommended** |

---

## Input Validation

### Frontend Validation

```typescript
// frontend/src/types/index.ts
export interface User {
  email: string;      // Must be valid email
  password: string;   // Min 8 chars
  name: string;       // Max 100 chars
  tenantId: string;   // Must be valid ObjectId
}

// Example validation
const validateEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

const validatePassword = (password: string): boolean => {
  return password.length >= 8;
};
```

**Purpose**: User feedback, not security.

### Backend Validation (Security Critical)

**File**: `backend-node/src/routes/user.ts`

```typescript
import { body, validationResult } from 'express-validator';

router.post('/users', [
  // Email: must be valid email format
  body('email')
    .isEmail()
    .normalizeEmail(),
  
  // Password: min 8 chars, requires uppercase/number
  body('password')
    .isLength({ min: 8 })
    .matches(/[A-Z]/)
    .matches(/[0-9]/),
  
  // Name: max 100 chars, no special chars
  body('name')
    .trim()
    .isLength({ max: 100 })
    .escape(),
  
  // TenantId: must be valid MongoDB ObjectId
  body('tenantId')
    .isMongoId()
], (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
  // Validation passed, proceed
});
```

### SQL/NoSQL Injection Prevention

**MongoDB Injection Risk**:

```javascript
// ❌ UNSAFE - Vulnerable to injection
const username = req.body.username;
db.users.find({ username: username });
// If username = { $ne: null }, returns all users!

// ✅ SAFE - MongoDB drivers handle escaping
const username = req.body.username;
db.users.find({ username: username });
// Driver treats as literal string
```

**Best Practices**:
1. Use parameterized queries (MongoDB does this by default)
2. Validate input types on backend
3. Use schema validation (Mongoose)
4. Never concatenate user input into queries

### Rate Limiting

```typescript
import rateLimit from 'express-rate-limit';

// Limit auth attempts
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,  // 15 minutes
  max: 5,                     // 5 requests per window
  message: 'Too many login attempts'
});

router.post('/auth/login', authLimiter, authHandler);

// Limit API calls per tenant
const apiLimiter = rateLimit({
  windowMs: 60 * 1000,        // 1 minute
  max: 100,                   // 100 requests per minute
  keyGenerator: (req) => req.tenantId  // Per-tenant limit
});

router.use('/api/', apiLimiter);
```

---

## Data Protection

### Password Handling

```typescript
import bcrypt from 'bcrypt';

// Hashing
const hashedPassword = await bcrypt.hash(password, 10);
// Never store plain passwords

// Verification
const isMatch = await bcrypt.compare(inputPassword, hashedPassword);
```

**Requirements**:
- ✅ Passwords hashed with bcrypt (salt rounds: 10)
- ✅ Never logged or printed
- ✅ Never stored in session
- ✅ Minimum 8 characters required
- ✅ Complexity requirements enforced

### Sensitive Data Handling

**Data to Encrypt**:
- Payment card tokens
- API keys
- Webhook secrets

**Implementation**:

```typescript
import crypto from 'crypto';

const encrypt = (data: string, secret: string) => {
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv('aes-256-gcm', secret, iv);
  const encrypted = Buffer.concat([
    cipher.update(data),
    cipher.final()
  ]);
  return iv.toString('hex') + ':' + encrypted.toString('hex');
};

const decrypt = (encrypted: string, secret: string) => {
  const [iv, data] = encrypted.split(':');
  const decipher = crypto.createDecipheriv('aes-256-gcm', secret, Buffer.from(iv, 'hex'));
  return decipher.update(Buffer.from(data, 'hex')).toString();
};
```

### Logging Best Practices

**What to Log**:
- ✅ Authentication events
- ✅ Authorization failures
- ✅ Data access
- ✅ Configuration changes
- ✅ Error stack traces

**What NOT to Log**:
- ❌ Passwords
- ❌ API keys/tokens
- ❌ Credit card numbers
- ❌ Personal health information
- ❌ Personally identifiable information (names, emails in logs)

---

## Network Security

### Environment Isolation

**Development vs Production**:

```env
# Development
NODE_ENV=development
ENABLE_DEV_LOGIN=true
LOG_LEVEL=debug
JWT_SECRET=dev-secret-change-in-production

# Production
NODE_ENV=production
ENABLE_DEV_LOGIN=false
LOG_LEVEL=info
JWT_SECRET=<strong-random-secret>
```

### Secret Management

**Development**:
```
Use .env file (in .gitignore)
```

**Production**:
```
Use environment variables (from secrets manager)
Examples:
- AWS Secrets Manager
- HashiCorp Vault
- Azure Key Vault
- Kubernetes Secrets
```

**Never**:
```
✗ Commit secrets to Git
✗ Hardcode secrets in code
✗ Share secrets in Slack/email
✗ Use same secret in all environments
```

---

## Security Best Practices

### Checklist for New Features

- [ ] All database queries filter by `req.tenantId`
- [ ] Role checks before returning sensitive data
- [ ] Input validation on all user inputs
- [ ] Error messages don't leak system details
- [ ] No sensitive data in logs
- [ ] API endpoints use HTTPS in production
- [ ] Rate limiting on auth endpoints
- [ ] CORS origin restricted to trusted domains
- [ ] SQL/NoSQL injection tested
- [ ] XSS prevention (escape HTML output)

### Code Review Checklist

- [ ] Authentication headers validated
- [ ] Authorization enforced at route handler level
- [ ] TenantId filtering present in all queries
- [ ] No direct use of user input in queries
- [ ] Passwords hashed with bcrypt
- [ ] Tokens expire appropriately
- [ ] HTTPS enforced in production
- [ ] Rate limits applied to sensitive endpoints

### Dependency Security

```bash
# Audit dependencies for vulnerabilities
npm audit

# Fix known vulnerabilities
npm audit fix

# Check for outdated packages
npm outdated

# Update packages (carefully)
npm update
```

---

## Threat Model & Mitigation

### Threat: Unauthorized Data Access

**Attack**: User tries to access another tenant's data

**Mitigations**:
1. TenantId validation in middleware
2. All queries filter by tenantId
3. MongoDB indexes for performance
4. Audit logging of access attempts

**Testing**:
```bash
# 1. Login as tenant-A user
# 2. Try to access tenant-B endpoint with modified JWT
# → Should be rejected

# 3. Try to query MongoDB directly as tenant-B
# → MongoDB shell blocks cross-tenant access
```

### Threat: XSS (Cross-Site Scripting)

**Attack**: Inject malicious JavaScript into page

**Mitigations**:
1. React auto-escapes by default
2. HTTP-only cookies prevent token theft
3. Content Security Policy headers
4. Input validation on backend

### Threat: CSRF (Cross-Site Request Forgery)

**Attack**: Trick user into making unintended request

**Mitigations**:
1. SameSite cookies (strict mode)
2. CORS validation
3. Origin header checking

### Threat: Brute Force Login

**Attack**: Try many passwords to guess login

**Mitigations**:
1. Rate limiting (5 attempts / 15 minutes)
2. Account lockout after 5 failed attempts
3. Log suspicious login attempts
4. Email alerts for unusual activity

### Threat: Token Theft

**Attack**: Steal JWT token and impersonate user

**Mitigations**:
1. HTTP-only cookies (immune to XSS)
2. Token expiration (24 hours)
3. Secure HTTPS transmission
4. Token rotation recommended for sensitive operations

### Threat: Man-in-the-Middle (MITM)

**Attack**: Intercept unencrypted traffic

**Mitigations**:
1. HTTPS/TLS encryption
2. Certificate pinning (optional)
3. HSTS headers
4. Secure cookie transmission

---

## Security Incident Response

### If JWT is Compromised

1. Invalidate token
2. User re-authentication required
3. Check audit logs for unauthorized access
4. Notify user of suspicious activity

### If Database is Compromised

1. Rotate all secrets immediately
2. Check integrity of sensitive data
3. Audit logs for unauthorized queries
4. Consider data re-encryption

### Reporting Security Issues

**Do not create public issues for security vulnerabilities**

Instead:
```
Email: security@your-domain.com
Include:
- Vulnerability description
- Steps to reproduce
- Potential impact
- Suggested fix (optional)
```

---

## References

- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [JWT.io](https://jwt.io/)
- [OAuth 2.0 RFC](https://tools.ietf.org/html/rfc6749)
- [MongoDB Security](https://docs.mongodb.com/manual/security/)
- [Express.js Security Best Practices](https://expressjs.com/en/advanced/best-practice-security.html)

---

## Next Steps

1. ✅ Read this document thoroughly
2. 🔒 Configure OAuth credentials from [DEVELOPER_SETUP.md](DEVELOPER_SETUP.md)
3. 🧪 Review security checklist for your code
4. 📋 Check [TROUBLESHOOTING.md](TROUBLESHOOTING.md) for auth issues
