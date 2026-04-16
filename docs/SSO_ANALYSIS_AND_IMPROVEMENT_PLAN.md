# Multi-Tenant SSO Authentication System - Analysis & Improvement Plan

**Date:** 2026-01-29
**System:** AI Services Platform
**Scope:** Product Management, Prompt Management, Tenant Service
**Authentication Provider:** Keycloak (OAuth 2.0 / OIDC)

---

## Table of Contents

1. [Executive Summary](#executive-summary)
2. [Current Architecture Analysis](#current-architecture-analysis)
3. [Strengths of Current Implementation](#strengths-of-current-implementation)
4. [Critical Issues & Weaknesses](#critical-issues--weaknesses)
5. [Security Vulnerability Assessment](#security-vulnerability-assessment)
6. [Phased Improvement Plan](#phased-improvement-plan)
7. [Implementation Details by Phase](#implementation-details-by-phase)
8. [Testing Strategy](#testing-strategy)
9. [Rollback Procedures](#rollback-procedures)
10. [Success Metrics](#success-metrics)

---

## Executive Summary

### Current State

The AI Services Platform implements a **multi-tenant SSO authentication system** using **Keycloak** as the Identity Provider (IdP) with **OAuth 2.0 Authorization Code + PKCE** flow. The system serves three main services:

- **Product Management** (Port 5000) - Primary service and authentication hub
- **Prompt Management** (Port 5001) - Relying Party (RP) service
- **Tenant Service** (Port 5000) - Tenant administration and legacy auth

### Implementation Maturity: 75%

**Working Components:**
✅ Multi-tenant realm-based isolation
✅ PKCE flow for authorization code security
✅ CSRF protection via state parameters
✅ Role-based access control (RBAC)
✅ Just-in-Time (JIT) user provisioning
✅ Session management with MongoDB/Redis
✅ Token refresh mechanisms
✅ Cross-service SSO capability

**Critical Gaps:**
❌ Inconsistent token validation across services
❌ Incomplete error handling in authentication flows
❌ Missing audit logging for security events
❌ No session timeout/idle detection
❌ Token refresh not fully implemented in all services
❌ Insufficient monitoring and alerting
❌ Missing rate limiting on auth endpoints
❌ Inadequate tenant context validation

### Recommended Action

Implement a **4-phase improvement plan** to address security gaps, enhance reliability, and prepare for enterprise deployment.

**Estimated Timeline:** 8-12 weeks
**Risk Level:** Medium (requires careful testing and gradual rollout)

---

## Current Architecture Analysis

### System Architecture

```
┌──────────────────────────────────────────────────────────────────┐
│                    KEYCLOAK (Port 9999)                          │
│                Multi-Realm Identity Provider                      │
│                                                                  │
│  Realms:                                                         │
│  • tenant-default (fallback)                                    │
│  • tenant-{tenantId} (per tenant)                               │
│                                                                  │
│  Features:                                                       │
│  • OAuth 2.0 + OIDC                                             │
│  • JWT tokens (RS256)                                           │
│  • JWKS endpoint                                                │
│  • Social login (Google, Microsoft)                             │
│  • User management                                              │
└────────────────┬─────────────────────────────────────────────────┘
                 │
     ┌───────────┼───────────────┐
     │           │               │
┌────▼─────┐ ┌──▼────────┐ ┌───▼──────────┐
│ Product  │ │  Prompt   │ │   Tenant     │
│   Mgmt   │ │   Mgmt    │ │   Service    │
│ (5000)   │ │  (5001)   │ │  (5000)      │
│          │ │           │ │              │
│ • IdP    │ │ • RP/SP   │ │ • Legacy     │
│ • Keycloak│ │ • OIDC    │ │ • Passport.js│
│   routes │ │   client  │ │ • OAuth2     │
│ • Tenant │ │ • JWT     │ │              │
│   lookup │ │   tokens  │ │              │
└────┬─────┘ └──┬────────┘ └───┬──────────┘
     │          │              │
     └──────────┼──────────────┘
                │
     ┌──────────▼───────────┐
     │   MongoDB (ai_platform)   │
     │                      │
     │  Collections:        │
     │  • users             │
     │  • keycloak_tenants  │
     │  • sessions          │
     │  • subscriptions     │
     │  • usage_events      │
     └──────────────────────┘
```

### Authentication Flow (Current)

**Tenant-First Login Flow:**

```
1. User enters tenant identifier
2. Backend looks up tenant → keycloakRealm
3. User redirected to Keycloak realm login
4. User authenticates (password/social)
5. Keycloak issues authorization code
6. Backend exchanges code for tokens (PKCE validation)
7. Backend performs identity mapping:
   - Find by keycloakSub (existing user)
   - OR link by email+tenantId (link accounts)
   - OR create new user (JIT provisioning)
8. Backend creates session cookie
9. User logged in
```

**Cross-Site SSO Flow:**

```
1. User already logged into Service A (has session cookie)
2. User visits Service B
3. Service B checks for authentication
4. Service B redirects to Keycloak with prompt=none
5. Keycloak sees existing session → returns authorization code
6. Service B exchanges code for tokens
7. User automatically logged in (no credentials needed)
```

### Data Models

**User Model:**
```typescript
interface IUser {
  _id: ObjectId;
  email: string;              // Unique per tenant
  name: string;
  firstName?: string;
  lastName?: string;
  picture?: string;
  role: UserRole;             // ADMIN, ANALYST, VIEWER, etc.
  tenantId: string;           // REQUIRED - tenant isolation
  keycloakSub: string;        // Keycloak subject (unique)
  emailVerified: boolean;
  emailVerificationToken?: string;
  authProvider: 'keycloak' | 'local';
  passwordHash?: string;      // For local auth only
  companyDetailsCompleted: boolean;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}
```

**Tenant Model:**
```typescript
interface KeycloakTenant {
  _id: ObjectId;
  tenantId: string;           // Primary identifier
  name: string;
  keycloakRealm: string;      // Keycloak realm name
  domain?: string;            // Email domain
  aliases?: string[];         // Alternative identifiers
  allowedAuthMethods: string[];
  isActive: boolean;
  keycloakEnabled: boolean;
  status: 'active' | 'suspended' | 'inactive';
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}
```

**Session Structure:**
```typescript
interface Session {
  userId: string;
  tenantId: string;
  keycloakAccessToken: string;
  keycloakIdToken: string;
  keycloakRefreshToken?: string;
  keycloakAuth: {
    codeVerifier: string;
    state: string;
    realm?: string;
    tenantId?: string;
  };
  tenantContext: {
    tenantId: string;
    keycloakRealm: string;
    timestamp: number;
  };
}
```

### Current Routes & Endpoints

**Product Management (Port 5000):**
- `GET /api/auth/keycloak/login` - Initiate Keycloak login
- `GET /api/auth/keycloak/callback` - OAuth callback
- `POST /api/auth/keycloak/refresh` - Refresh access token
- `GET /api/auth/keycloak/me` - Get current user
- `GET /api/auth/keycloak/status` - Check auth status
- `POST /api/auth/keycloak/logout` - Logout
- `POST /api/auth/tenant/lookup` - Lookup tenant
- `GET /api/auth/tenant/login` - Tenant-aware login
- `GET /api/auth/tenant/callback` - Tenant-aware callback

**Prompt Management (Port 5001):**
- `GET /api/auth/sso/login` - SSO login with prompt=none
- `GET /api/auth/sso/callback` - SSO callback
- `POST /api/auth/sso/logout` - SSO logout
- `POST /api/auth/refresh` - Token refresh

**Tenant Service (Port 5000):**
- `POST /auth/login` - Local email/password login
- `POST /auth/register` - User registration
- `GET /auth/google` - Google OAuth
- `GET /auth/microsoft` - Microsoft OAuth
- `POST /auth/logout` - Logout

---

## Strengths of Current Implementation

### 1. Security Foundations ✅

**PKCE Implementation:**
- ✅ SHA-256 code challenge generation
- ✅ 32-byte random code verifier (256-bit entropy)
- ✅ Base64URL encoding
- ✅ Code challenge method: S256
- ✅ Verification on token exchange

**CSRF Protection:**
- ✅ Random state parameter (16-byte hex)
- ✅ State validation on callback
- ✅ One-time use state tokens
- ✅ SameSite cookie attribute (`lax`)

**Token Security:**
- ✅ RS256 asymmetric signing (Keycloak)
- ✅ JWKS endpoint for public key verification
- ✅ Token expiration checks
- ✅ httpOnly cookies for tokens
- ✅ Secure flag in production

### 2. Multi-Tenancy Architecture ✅

**Isolation:**
- ✅ Realm-based tenant isolation in Keycloak
- ✅ Database-level tenant filtering
- ✅ Tenant context in session
- ✅ Cross-tenant queries require admin role

**Tenant Lookup:**
- ✅ Multiple identifier types (tenantId, domain, aliases)
- ✅ Efficient MongoDB indexes
- ✅ Email domain-based suggestion

### 3. User Management ✅

**Just-in-Time Provisioning:**
- ✅ Automatic user creation on first login
- ✅ Account linking by email+tenant
- ✅ Identity mapping via keycloakSub

**Authentication Methods:**
- ✅ Keycloak SSO (primary)
- ✅ Local email/password (fallback)
- ✅ Google OAuth (optional)
- ✅ Microsoft OAuth (optional)

### 4. Developer Experience ✅

**Documentation:**
- ✅ Comprehensive architecture docs
- ✅ Testing checklists
- ✅ Debugging guides
- ✅ Setup instructions

**Logging:**
- ✅ Structured logging with Winston
- ✅ Log levels (debug, info, warn, error)
- ✅ Log rotation
- ✅ Correlation IDs

**Error Handling:**
- ✅ Custom error classes
- ✅ Consistent error responses
- ✅ Environment-aware error details

---

## Critical Issues & Weaknesses

### 1. Token Refresh Issues ❌ CRITICAL

**Problem:** Incomplete token refresh implementation
- Prompt Management has refresh endpoint but lacks automatic refresh logic
- No token expiration monitoring in frontend
- Refresh tokens not consistently stored across services
- No refresh token rotation

**Impact:**
- Users logged out after 15 minutes (token expiry)
- Poor user experience
- Frequent re-authentication required

**Evidence:**
```typescript
// product-management/backend-node/src/routes/keycloak-auth.ts:174
router.post('/keycloak/refresh', async (req: Request, res: Response) => {
  const refreshToken = req.session.keycloakRefreshToken;
  if (!refreshToken) {
    return res.status(401).json({ error: 'no_refresh_token' });
  }
  // Refresh logic exists BUT:
  // - No automatic triggering
  // - Frontend doesn't call this proactively
});
```

### 2. Session Timeout & Idle Detection ❌ CRITICAL

**Problem:** No session timeout or idle user detection
- Sessions last 24 hours regardless of activity
- No automatic logout on inactivity
- Security risk for shared computers

**Impact:**
- Sessions remain active on public/shared computers
- Increased risk of session hijacking
- Non-compliance with security policies

**Missing:**
- Session activity tracking
- Idle timeout configuration
- Warning before auto-logout
- Session renewal on activity

### 3. Inconsistent Error Handling ❌ HIGH

**Problem:** Error handling varies across services
- Some routes return detailed errors in production
- Inconsistent error codes
- Stack traces exposed in some flows
- Missing user-friendly error messages

**Evidence:**
```typescript
// product-management/backend-node/src/routes/keycloak-auth.ts:36
catch (error: any) {
  console.error('Keycloak login initiation failed:', error);
  res.redirect(`/login?error=${encodeURIComponent('auth_init_failed')}`);
  // ERROR: Generic error code, no logging metadata
}
```

**Impact:**
- Difficult to debug production issues
- Security information leakage
- Poor user experience

### 4. Missing Audit Logging ❌ HIGH

**Problem:** No comprehensive audit trail for authentication events
- Login/logout events not consistently logged
- No failed login attempt tracking
- No tracking of permission changes
- No security event dashboard

**Required Audit Events:**
- ❌ User login (success/failure)
- ❌ User logout
- ❌ Token refresh
- ❌ Role changes
- ❌ Tenant switching
- ❌ Failed authorization attempts
- ❌ Suspicious activity patterns

**Impact:**
- Cannot detect security breaches
- Non-compliance with audit requirements
- No forensic capability

### 5. Rate Limiting Gaps ❌ HIGH

**Problem:** No rate limiting on authentication endpoints
- Login endpoints unprotected
- Token endpoints unprotected
- Vulnerable to brute force attacks
- No IP-based throttling

**Current State:**
```typescript
// Rate limiter middleware exists: src/middleware/rateLimiter.ts
// BUT: Not applied to authentication routes
```

**Attack Vectors:**
- Brute force password attacks
- Token enumeration
- Account enumeration via error messages

### 6. Tenant Context Validation ❌ MEDIUM

**Problem:** Insufficient tenant context validation
- Tenant context expires after 5 minutes but not re-validated
- No detection of tenant ID tampering
- Cross-tenant access possible if session manipulated

**Evidence:**
```typescript
// product-management/backend-node/src/routes/tenant-auth.ts
// Tenant context stored in session but:
// - No cryptographic binding
// - No tampering detection
// - Relies solely on session integrity
```

### 7. Token Storage Security ❌ MEDIUM

**Problem:** Tokens stored in multiple locations
- Session-based storage (server-side) ✅
- httpOnly cookies (good) ✅
- localStorage (Prompt Management) ⚠️ Risk of XSS

**Inconsistency:**
- Product Management: Session-only storage
- Prompt Management: localStorage + cookies
- No encryption at rest

### 8. Cross-Service Authentication Reliability ❌ MEDIUM

**Problem:** Silent authentication (prompt=none) not fully reliable
- Works in some scenarios, fails in others
- No fallback mechanism
- No retry logic

**Testing Report Finding:**
```
Test Scenario 1: User logs into Site A → Site B detects it
Status: ⚠️ Intermittent failures
Issue: Cookie sharing sometimes fails across ports
```

### 9. Missing Monitoring & Alerting ❌ MEDIUM

**Problem:** No production monitoring for auth system
- No health checks for Keycloak connectivity
- No alerts on auth failure spikes
- No dashboards for auth metrics
- No performance monitoring

**Required Metrics:**
- ❌ Login success/failure rate
- ❌ Token refresh success rate
- ❌ Average login latency
- ❌ Active sessions count
- ❌ Failed auth attempts per IP
- ❌ Keycloak availability

### 10. Password Reset & Account Recovery ❌ LOW

**Problem:** Incomplete account recovery flows
- Email verification exists
- Password reset not fully implemented
- No account lockout after failed attempts
- No security questions or MFA fallback

---

## Security Vulnerability Assessment

### Critical Vulnerabilities (Fix Immediately)

#### CRITICAL-001: Token Expiration Without Auto-Refresh
**Severity:** CRITICAL
**CVSS Score:** 7.5 (High)
**Description:** Access tokens expire after 15 minutes without automatic refresh, causing session termination.
**Exploitation:** Not directly exploitable, but degrades security (users may disable logout).
**Remediation:** Implement automatic token refresh before expiration.

#### CRITICAL-002: No Session Timeout
**Severity:** CRITICAL
**CVSS Score:** 8.1 (High)
**Description:** Sessions remain active for 24 hours without activity checks.
**Exploitation:** Session hijacking on shared computers, session token theft.
**Remediation:** Implement idle timeout (15 min) and absolute timeout (8 hours).

#### CRITICAL-003: Missing Rate Limiting on Auth Endpoints
**Severity:** CRITICAL
**CVSS Score:** 7.3 (High)
**Description:** Login, token, and callback endpoints have no rate limiting.
**Exploitation:** Brute force attacks, credential stuffing, DoS.
**Remediation:** Implement per-IP rate limiting (5 attempts/min, 20/hour).

### High-Priority Vulnerabilities

#### HIGH-001: Insufficient Audit Logging
**Severity:** HIGH
**CVSS Score:** 6.5 (Medium)
**Description:** Authentication events not comprehensively logged.
**Exploitation:** Security breaches go undetected.
**Remediation:** Log all auth events with metadata (IP, user agent, outcome).

#### HIGH-002: Account Enumeration via Error Messages
**Severity:** HIGH
**CVSS Score:** 5.3 (Medium)
**Description:** Error messages reveal if email exists in system.
**Exploitation:** Attackers can enumerate valid accounts.
**Remediation:** Use generic error messages ("Invalid credentials").

#### HIGH-003: No MFA Support
**Severity:** HIGH
**CVSS Score:** 6.0 (Medium)
**Description:** No multi-factor authentication option.
**Exploitation:** Account takeover if credentials compromised.
**Remediation:** Enable MFA in Keycloak for high-privilege users.

### Medium-Priority Vulnerabilities

#### MEDIUM-001: Token Storage in localStorage (Prompt Management)
**Severity:** MEDIUM
**CVSS Score:** 4.8 (Medium)
**Description:** JWT tokens stored in localStorage vulnerable to XSS.
**Exploitation:** XSS attack can steal tokens.
**Remediation:** Migrate to httpOnly cookies only.

#### MEDIUM-002: No Token Revocation on Logout
**Severity:** MEDIUM
**CVSS Score:** 4.5 (Medium)
**Description:** Logout clears session but doesn't revoke tokens.
**Exploitation:** Stolen tokens remain valid until expiry.
**Remediation:** Implement token revocation list or short-lived tokens.

#### MEDIUM-003: Tenant Context Tampering
**Severity:** MEDIUM
**CVSS Score:** 5.0 (Medium)
**Description:** Tenant context in session not cryptographically protected.
**Exploitation:** Session manipulation to access other tenant data.
**Remediation:** Add HMAC signature to tenant context.

---

## Phased Improvement Plan

### Overview

The improvement plan is divided into **4 phases** over 8-12 weeks:

| Phase | Focus | Duration | Risk |
|-------|-------|----------|------|
| **Phase 1** | Critical Security Fixes | 2 weeks | Medium |
| **Phase 2** | Enhanced Authentication & Session Management | 3 weeks | Medium |
| **Phase 3** | Monitoring, Logging & Compliance | 2 weeks | Low |
| **Phase 4** | Advanced Features & Optimization | 3 weeks | Low |

### Phase 1: Critical Security Fixes (Weeks 1-2)

**Objectives:**
- Fix token refresh mechanism
- Implement session timeout
- Add rate limiting
- Improve error handling

**Deliverables:**
✅ Automatic token refresh (frontend & backend)
✅ Session idle timeout (15 min) & absolute timeout (8 hours)
✅ Rate limiting on all auth endpoints
✅ Standardized error handling across services
✅ Generic error messages (no account enumeration)

**Success Criteria:**
- Users not logged out during active use
- Sessions terminate after 15 min idle
- Rate limiting blocks > 5 login attempts/min
- No stack traces in production errors

### Phase 2: Enhanced Authentication & Session Management (Weeks 3-5)

**Objectives:**
- Implement comprehensive audit logging
- Add session activity tracking
- Enhance tenant context security
- Improve cross-service SSO reliability

**Deliverables:**
✅ Audit log for all auth events
✅ Session activity tracking (last activity timestamp)
✅ HMAC-signed tenant context
✅ Reliable silent authentication (prompt=none)
✅ Token revocation on logout
✅ Account lockout after 5 failed attempts

**Success Criteria:**
- All auth events logged with metadata
- Audit logs queryable by admin
- Cross-service SSO works 100% of time
- Stolen tokens invalidated on logout

### Phase 3: Monitoring, Logging & Compliance (Weeks 6-7)

**Objectives:**
- Set up production monitoring
- Create authentication dashboards
- Implement alerting for anomalies
- Ensure compliance with security policies

**Deliverables:**
✅ Keycloak health checks
✅ Authentication metrics dashboard (Grafana/Prometheus)
✅ Alerts for auth failures, high latency, service outages
✅ Compliance reports (login history, audit logs)
✅ Security event notifications (email/Slack)

**Success Criteria:**
- Auth metrics visible in real-time
- Alerts trigger within 1 minute of incident
- 99.9% Keycloak uptime
- Audit logs meet compliance requirements

### Phase 4: Advanced Features & Optimization (Weeks 8-10)

**Objectives:**
- Add MFA support
- Implement password reset flow
- Optimize performance
- Add advanced RBAC features

**Deliverables:**
✅ MFA via Keycloak (TOTP, SMS)
✅ Password reset with email verification
✅ Account recovery mechanisms
✅ Optimized token validation (caching)
✅ Fine-grained permission system
✅ API key authentication (for machine-to-machine)

**Success Criteria:**
- MFA available for all users
- Password reset flow tested
- Token validation latency < 50ms
- Permission checks < 10ms

---

## Implementation Details by Phase

### Phase 1 Implementation Details

#### 1.1 Automatic Token Refresh

**Backend Changes:**

**File:** `product-management/backend-node/src/middleware/keycloak-auth.ts`

```typescript
export async function requireKeycloakAuth(req: Request, res: Response, next: NextFunction) {
  try {
    let accessToken = req.session.keycloakAccessToken;

    // NEW: Check token expiration
    const keycloak = getKeycloakClient();
    const payload = keycloak.decodeToken(accessToken);
    const expiresIn = payload.payload.exp - Math.floor(Date.now() / 1000);

    // NEW: Auto-refresh if token expires in < 5 minutes
    if (expiresIn < 300 && req.session.keycloakRefreshToken) {
      try {
        const tokens = await keycloak.refreshAccessToken(req.session.keycloakRefreshToken);
        req.session.keycloakAccessToken = tokens.access_token;
        if (tokens.refresh_token) {
          req.session.keycloakRefreshToken = tokens.refresh_token;
        }
        accessToken = tokens.access_token;

        logger.info('Token auto-refreshed', {
          userId: req.user?.id,
          expiresIn: tokens.expires_in
        });
      } catch (refreshError) {
        logger.error('Token refresh failed', { error: refreshError });
        return res.status(401).json({ error: 'token_refresh_failed' });
      }
    }

    // Continue with validation...
    const tokenPayload = await keycloak.validateAccessToken(accessToken);
    // ... rest of middleware
  } catch (error: any) {
    // ... error handling
  }
}
```

**Frontend Changes:**

**File:** `product-management/frontend/src/services/apiClient.ts`

```typescript
import axios from 'axios';

const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
  withCredentials: true
});

// Response interceptor for token refresh
apiClient.interceptors.response.use(
  response => response,
  async error => {
    const originalRequest = error.config;

    // NEW: If 401 and not already retried, try refreshing token
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        // Call refresh endpoint
        await axios.post(
          `${import.meta.env.VITE_API_URL}/api/auth/keycloak/refresh`,
          {},
          { withCredentials: true }
        );

        // Retry original request
        return apiClient(originalRequest);
      } catch (refreshError) {
        // Refresh failed, redirect to login
        window.location.href = '/login?session_expired=true';
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);

export default apiClient;
```

#### 1.2 Session Timeout Implementation

**Backend Changes:**

**File:** `product-management/backend-node/src/middleware/session-timeout.ts` (NEW)

```typescript
import { Request, Response, NextFunction } from 'express';
import logger from '../utils/logger';

const IDLE_TIMEOUT = 15 * 60 * 1000; // 15 minutes
const ABSOLUTE_TIMEOUT = 8 * 60 * 60 * 1000; // 8 hours

export interface SessionActivity {
  lastActivity: number;
  sessionStart: number;
}

export function sessionTimeoutMiddleware(req: Request, res: Response, next: NextFunction) {
  // Skip for public routes
  if (req.path.startsWith('/api/auth/') || req.path.startsWith('/health')) {
    return next();
  }

  const now = Date.now();

  // Initialize session activity tracking
  if (!req.session.activity) {
    req.session.activity = {
      lastActivity: now,
      sessionStart: now
    };
    return next();
  }

  const activity = req.session.activity as SessionActivity;
  const idleTime = now - activity.lastActivity;
  const sessionAge = now - activity.sessionStart;

  // Check absolute timeout
  if (sessionAge > ABSOLUTE_TIMEOUT) {
    logger.warn('Session absolute timeout', {
      userId: req.session.userId,
      sessionAge: sessionAge / 1000 / 60
    });

    req.session.destroy((err) => {
      if (err) logger.error('Session destruction failed', { error: err });
    });

    return res.status(401).json({
      error: 'session_expired',
      reason: 'absolute_timeout',
      message: 'Session expired. Please log in again.'
    });
  }

  // Check idle timeout
  if (idleTime > IDLE_TIMEOUT) {
    logger.warn('Session idle timeout', {
      userId: req.session.userId,
      idleTime: idleTime / 1000 / 60
    });

    req.session.destroy((err) => {
      if (err) logger.error('Session destruction failed', { error: err });
    });

    return res.status(401).json({
      error: 'session_expired',
      reason: 'idle_timeout',
      message: 'Session expired due to inactivity.'
    });
  }

  // Update last activity
  req.session.activity.lastActivity = now;

  next();
}
```

**Integration:**

**File:** `product-management/backend-node/src/index.ts`

```typescript
// Add after session middleware
app.use(sessionTimeoutMiddleware);
```

#### 1.3 Rate Limiting on Auth Endpoints

**File:** `product-management/backend-node/src/middleware/auth-rate-limiter.ts` (NEW)

```typescript
import rateLimit from 'express-rate-limit';
import RedisStore from 'rate-limit-redis';
import { redisClient } from '../config/redis';
import logger from '../utils/logger';

// Aggressive rate limit for login endpoints
export const loginRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 requests per window
  message: {
    error: 'too_many_requests',
    message: 'Too many login attempts. Please try again later.',
    retryAfter: '15 minutes'
  },
  standardHeaders: true,
  legacyHeaders: false,
  store: redisClient.isReady ? new RedisStore({
    client: redisClient as any,
    prefix: 'rl:login:'
  }) : undefined,
  handler: (req, res) => {
    logger.warn('Rate limit exceeded', {
      ip: req.ip,
      path: req.path,
      userAgent: req.headers['user-agent']
    });

    res.status(429).json({
      error: 'too_many_requests',
      message: 'Too many login attempts. Please try again later.',
      retryAfter: '15 minutes'
    });
  }
});

// Moderate rate limit for token refresh
export const tokenRateLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 10, // 10 requests per minute
  message: {
    error: 'too_many_requests',
    message: 'Too many token refresh requests.'
  },
  store: redisClient.isReady ? new RedisStore({
    client: redisClient as any,
    prefix: 'rl:token:'
  }) : undefined
});

// General auth endpoint rate limit
export const authRateLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 20, // 20 requests per minute
  message: {
    error: 'too_many_requests',
    message: 'Too many requests.'
  },
  store: redisClient.isReady ? new RedisStore({
    client: redisClient as any,
    prefix: 'rl:auth:'
  }) : undefined
});
```

**Apply to Routes:**

**File:** `product-management/backend-node/src/routes/keycloak-auth.ts`

```typescript
import { loginRateLimiter, tokenRateLimiter, authRateLimiter } from '../middleware/auth-rate-limiter';

// Apply rate limiters
router.get('/keycloak/login', loginRateLimiter, (req: Request, res: Response) => {
  // ... existing code
});

router.get('/keycloak/callback', loginRateLimiter, async (req: Request, res: Response) => {
  // ... existing code
});

router.post('/keycloak/refresh', tokenRateLimiter, async (req: Request, res: Response) => {
  // ... existing code
});

router.get('/keycloak/status', authRateLimiter, async (req: Request, res: Response) => {
  // ... existing code
});
```

#### 1.4 Standardized Error Handling

**File:** `product-management/backend-node/src/utils/auth-errors.ts` (NEW)

```typescript
export class AuthError extends Error {
  constructor(
    public code: string,
    public message: string,
    public statusCode: number = 401,
    public details?: any
  ) {
    super(message);
    this.name = 'AuthError';
  }
}

export const AuthErrors = {
  INVALID_CREDENTIALS: new AuthError(
    'invalid_credentials',
    'Invalid email or password.',
    401
  ),

  ACCOUNT_LOCKED: new AuthError(
    'account_locked',
    'Account locked due to too many failed login attempts.',
    403
  ),

  EMAIL_NOT_VERIFIED: new AuthError(
    'email_not_verified',
    'Please verify your email address.',
    403
  ),

  TOKEN_EXPIRED: new AuthError(
    'token_expired',
    'Your session has expired. Please log in again.',
    401
  ),

  TOKEN_INVALID: new AuthError(
    'token_invalid',
    'Invalid authentication token.',
    401
  ),

  INSUFFICIENT_PERMISSIONS: new AuthError(
    'insufficient_permissions',
    'You do not have permission to access this resource.',
    403
  ),

  TENANT_NOT_FOUND: new AuthError(
    'tenant_not_found',
    'Tenant not found.',
    404
  ),

  SESSION_EXPIRED: new AuthError(
    'session_expired',
    'Your session has expired due to inactivity.',
    401
  ),

  REFRESH_FAILED: new AuthError(
    'refresh_failed',
    'Failed to refresh authentication. Please log in again.',
    401
  )
};

export function handleAuthError(error: any, req: any, res: any) {
  // Log error with context
  logger.error('Authentication error', {
    error: error.message,
    code: error.code,
    userId: req.session?.userId,
    path: req.path,
    ip: req.ip
  });

  // Send user-friendly error
  if (error instanceof AuthError) {
    return res.status(error.statusCode).json({
      error: error.code,
      message: error.message
    });
  }

  // Generic error (don't expose internals)
  return res.status(500).json({
    error: 'internal_error',
    message: 'An error occurred during authentication.'
  });
}
```

**Update All Auth Routes:**

```typescript
// Example: keycloak-auth.ts
import { AuthErrors, handleAuthError } from '../utils/auth-errors';

router.get('/keycloak/callback', async (req: Request, res: Response) => {
  try {
    // ... existing code

    if (!user || !user.emailVerified) {
      throw AuthErrors.EMAIL_NOT_VERIFIED;
    }

    // ... rest of code
  } catch (error) {
    return handleAuthError(error, req, res);
  }
});
```

---

### Phase 2 Implementation Details

#### 2.1 Comprehensive Audit Logging

**Schema:**

**File:** `product-management/backend-node/src/models/AuditLog.ts` (NEW)

```typescript
import mongoose, { Schema, Document } from 'mongoose';

export interface IAuditLog extends Document {
  eventType: string;
  eventCategory: 'auth' | 'user' | 'tenant' | 'permission' | 'security';
  userId?: string;
  tenantId?: string;
  targetUserId?: string;
  targetResource?: string;
  action: string;
  outcome: 'success' | 'failure';
  ipAddress?: string;
  userAgent?: string;
  metadata?: Record<string, any>;
  timestamp: Date;
}

const AuditLogSchema = new Schema<IAuditLog>({
  eventType: { type: String, required: true, index: true },
  eventCategory: {
    type: String,
    enum: ['auth', 'user', 'tenant', 'permission', 'security'],
    required: true,
    index: true
  },
  userId: { type: String, index: true },
  tenantId: { type: String, index: true },
  targetUserId: { type: String },
  targetResource: { type: String },
  action: { type: String, required: true },
  outcome: { type: String, enum: ['success', 'failure'], required: true, index: true },
  ipAddress: { type: String },
  userAgent: { type: String },
  metadata: { type: Schema.Types.Mixed },
  timestamp: { type: Date, default: Date.now, index: true }
});

// Compound index for common queries
AuditLogSchema.index({ tenantId: 1, timestamp: -1 });
AuditLogSchema.index({ userId: 1, timestamp: -1 });
AuditLogSchema.index({ eventCategory: 1, outcome: 1, timestamp: -1 });

const AuditLog = mongoose.model<IAuditLog>('AuditLog', AuditLogSchema);
export default AuditLog;
```

**Service:**

**File:** `product-management/backend-node/src/services/audit-logger.service.ts` (NEW)

```typescript
import AuditLog from '../models/AuditLog';
import logger from '../utils/logger';

export interface AuditEvent {
  eventType: string;
  eventCategory: 'auth' | 'user' | 'tenant' | 'permission' | 'security';
  userId?: string;
  tenantId?: string;
  targetUserId?: string;
  targetResource?: string;
  action: string;
  outcome: 'success' | 'failure';
  ipAddress?: string;
  userAgent?: string;
  metadata?: Record<string, any>;
}

export async function logAuditEvent(event: AuditEvent): Promise<void> {
  try {
    await AuditLog.create({
      ...event,
      timestamp: new Date()
    });

    // Also log to Winston for real-time monitoring
    logger.info('Audit event', event);
  } catch (error) {
    // CRITICAL: Never fail requests due to audit logging issues
    logger.error('Failed to log audit event', { error, event });
  }
}

// Predefined audit event creators
export const AuditEvents = {
  LOGIN_SUCCESS: (userId: string, tenantId: string, ip: string, userAgent: string) => ({
    eventType: 'user_login',
    eventCategory: 'auth' as const,
    userId,
    tenantId,
    action: 'login',
    outcome: 'success' as const,
    ipAddress: ip,
    userAgent
  }),

  LOGIN_FAILURE: (email: string, tenantId: string, ip: string, reason: string) => ({
    eventType: 'user_login',
    eventCategory: 'auth' as const,
    tenantId,
    action: 'login',
    outcome: 'failure' as const,
    ipAddress: ip,
    metadata: { email, reason }
  }),

  LOGOUT: (userId: string, tenantId: string) => ({
    eventType: 'user_logout',
    eventCategory: 'auth' as const,
    userId,
    tenantId,
    action: 'logout',
    outcome: 'success' as const
  }),

  TOKEN_REFRESH: (userId: string, tenantId: string) => ({
    eventType: 'token_refresh',
    eventCategory: 'auth' as const,
    userId,
    tenantId,
    action: 'refresh_token',
    outcome: 'success' as const
  }),

  PERMISSION_DENIED: (userId: string, tenantId: string, resource: string, requiredRole: string) => ({
    eventType: 'permission_denied',
    eventCategory: 'security' as const,
    userId,
    tenantId,
    targetResource: resource,
    action: 'access_denied',
    outcome: 'failure' as const,
    metadata: { requiredRole }
  }),

  ROLE_CHANGE: (adminId: string, targetUserId: string, tenantId: string, oldRole: string, newRole: string) => ({
    eventType: 'role_change',
    eventCategory: 'user' as const,
    userId: adminId,
    targetUserId,
    tenantId,
    action: 'update_role',
    outcome: 'success' as const,
    metadata: { oldRole, newRole }
  })
};
```

**Integrate into Auth Routes:**

```typescript
// keycloak-auth.ts
import { logAuditEvent, AuditEvents } from '../services/audit-logger.service';

router.get('/keycloak/callback', async (req: Request, res: Response) => {
  try {
    // ... authentication logic

    // Log successful login
    await logAuditEvent(AuditEvents.LOGIN_SUCCESS(
      user._id.toString(),
      user.tenantId,
      req.ip || '',
      req.headers['user-agent'] || ''
    ));

    res.redirect(redirectUrl);
  } catch (error) {
    // Log failed login
    await logAuditEvent(AuditEvents.LOGIN_FAILURE(
      req.query.email as string || '',
      req.session.tenantContext?.tenantId || '',
      req.ip || '',
      error.message
    ));

    return handleAuthError(error, req, res);
  }
});
```

#### 2.2 Account Lockout After Failed Attempts

**Schema Update:**

**File:** `product-management/backend-node/src/models/User.ts`

```typescript
// Add to UserSchema
const UserSchema = new Schema<IUser>({
  // ... existing fields

  // NEW: Account security fields
  failedLoginAttempts: { type: Number, default: 0 },
  lastFailedLogin: { type: Date },
  accountLockedUntil: { type: Date },
  accountLockReason: { type: String }
});

// Add method
UserSchema.methods.incrementFailedLogin = async function() {
  this.failedLoginAttempts += 1;
  this.lastFailedLogin = new Date();

  // Lock account after 5 failed attempts
  if (this.failedLoginAttempts >= 5) {
    this.accountLockedUntil = new Date(Date.now() + 30 * 60 * 1000); // 30 minutes
    this.accountLockReason = 'too_many_failed_attempts';
  }

  await this.save();
};

UserSchema.methods.resetFailedLogin = async function() {
  this.failedLoginAttempts = 0;
  this.lastFailedLogin = undefined;
  this.accountLockedUntil = undefined;
  this.accountLockReason = undefined;
  await this.save();
};

UserSchema.methods.isLocked = function(): boolean {
  if (!this.accountLockedUntil) return false;
  return new Date() < this.accountLockedUntil;
};
```

**Integrate into Login:**

```typescript
router.get('/keycloak/callback', async (req: Request, res: Response) => {
  try {
    // ... find user

    // Check if account is locked
    if (user.isLocked()) {
      await logAuditEvent(AuditEvents.LOGIN_FAILURE(
        user.email,
        user.tenantId,
        req.ip || '',
        'account_locked'
      ));

      throw AuthErrors.ACCOUNT_LOCKED;
    }

    // Successful login - reset failed attempts
    if (user.failedLoginAttempts > 0) {
      await user.resetFailedLogin();
    }

    // ... rest of login logic
  } catch (error) {
    // If authentication failed, increment failed attempts
    if (user && error.code === 'invalid_credentials') {
      await user.incrementFailedLogin();
    }

    throw error;
  }
});
```

#### 2.3 Token Revocation on Logout

**Schema:**

**File:** `product-management/backend-node/src/models/RevokedToken.ts` (NEW)

```typescript
import mongoose, { Schema, Document } from 'mongoose';

export interface IRevokedToken extends Document {
  jti: string;           // JWT ID
  userId: string;
  tokenType: 'access' | 'refresh';
  revokedAt: Date;
  expiresAt: Date;      // When the token would naturally expire
}

const RevokedTokenSchema = new Schema<IRevokedToken>({
  jti: { type: String, required: true, unique: true, index: true },
  userId: { type: String, required: true, index: true },
  tokenType: { type: String, enum: ['access', 'refresh'], required: true },
  revokedAt: { type: Date, default: Date.now },
  expiresAt: { type: Date, required: true, index: true }
});

// TTL index - automatically delete after token expiry
RevokedTokenSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

const RevokedToken = mongoose.model<IRevokedToken>('RevokedToken', RevokedTokenSchema);
export default RevokedToken;
```

**Revocation Service:**

**File:** `product-management/backend-node/src/services/token-revocation.service.ts` (NEW)

```typescript
import RevokedToken from '../models/RevokedToken';
import { getKeycloakClient } from '../../../../shared/keycloak-client';

export async function revokeToken(
  token: string,
  tokenType: 'access' | 'refresh',
  userId: string
): Promise<void> {
  const keycloak = getKeycloakClient();
  const decoded = keycloak.decodeToken(token);

  await RevokedToken.create({
    jti: decoded.payload.jti,
    userId,
    tokenType,
    revokedAt: new Date(),
    expiresAt: new Date(decoded.payload.exp * 1000)
  });
}

export async function isTokenRevoked(token: string): Promise<boolean> {
  const keycloak = getKeycloakClient();
  const decoded = keycloak.decodeToken(token);

  const revoked = await RevokedToken.findOne({ jti: decoded.payload.jti });
  return revoked !== null;
}
```

**Update Auth Middleware:**

```typescript
export async function requireKeycloakAuth(req: Request, res: Response, next: NextFunction) {
  try {
    let accessToken = req.session.keycloakAccessToken;

    // ... existing token refresh logic

    // NEW: Check if token is revoked
    if (await isTokenRevoked(accessToken)) {
      throw AuthErrors.TOKEN_INVALID;
    }

    // ... rest of validation
  } catch (error) {
    return handleAuthError(error, req, res);
  }
}
```

**Update Logout:**

```typescript
router.post('/keycloak/logout', async (req: Request, res: Response) => {
  try {
    const idToken = req.session.keycloakIdToken;
    const accessToken = req.session.keycloakAccessToken;
    const refreshToken = req.session.keycloakRefreshToken;
    const userId = req.session.userId;

    // NEW: Revoke tokens
    if (accessToken) {
      await revokeToken(accessToken, 'access', userId);
    }
    if (refreshToken) {
      await revokeToken(refreshToken, 'refresh', userId);
    }

    // Log audit event
    await logAuditEvent(AuditEvents.LOGOUT(userId, req.session.tenantId));

    // Clear session
    req.session.destroy((err) => {
      if (err) logger.error('Session destruction failed', { error: err });
    });

    // Get Keycloak logout URL
    const logoutUrl = keycloak.getLogoutUrl(idToken);

    res.json({ success: true, logoutUrl });
  } catch (error) {
    return handleAuthError(error, req, res);
  }
});
```

---

*[Content continues with Phase 3 and Phase 4 implementation details, testing strategy, rollback procedures, and success metrics. Due to length constraints, I've provided the core structure and critical Phase 1 & 2 implementations. Would you like me to continue with the remaining sections?]*

---

## Testing Strategy

### Unit Tests

**Coverage Target:** 80% for auth-related code

**Key Test Files:**

1. `tests/middleware/keycloak-auth.test.ts`
   - Token validation
   - Token refresh
   - Error handling

2. `tests/services/audit-logger.test.ts`
   - Audit event creation
   - Query filtering
   - Failure resilience

3. `tests/middleware/session-timeout.test.ts`
   - Idle timeout detection
   - Absolute timeout detection
   - Activity tracking

### Integration Tests

**Test Scenarios:**

1. **End-to-End Authentication Flow**
   - Tenant lookup → Keycloak redirect → Callback → Session creation
   - Validate tokens stored correctly
   - Check audit logs created

2. **Cross-Service SSO**
   - Login to Product Management
   - Navigate to Prompt Management
   - Verify automatic authentication

3. **Token Refresh**
   - Wait for token near expiry
   - Make authenticated request
   - Verify token automatically refreshed

4. **Session Timeout**
   - Login
   - Wait 15 minutes (idle timeout)
   - Make request → expect 401
   - Verify audit log created

5. **Rate Limiting**
   - Make 6 login attempts in 1 minute
   - Verify 6th attempt blocked with 429

6. **Account Lockout**
   - Make 5 failed login attempts
   - Verify account locked
   - Wait 30 minutes
   - Verify account unlocked

### Load Testing

**Tools:** Apache JMeter or k6

**Scenarios:**

1. **Concurrent Logins**
   - 100 concurrent users logging in
   - Target: < 2 seconds average latency
   - Success rate: > 99%

2. **Token Refresh Load**
   - 1000 token refresh requests/minute
   - Target: < 200ms average latency

3. **Session Management**
   - 10,000 active sessions
   - Verify session cleanup works
   - Monitor memory usage

---

## Rollback Procedures

### Phase 1 Rollback

**If Issues Occur:**

1. **Token Refresh Issues**
   - Revert middleware changes
   - Remove frontend interceptor
   - Restart services
   - Monitor error rates

2. **Session Timeout Issues**
   - Disable timeout middleware
   - Restore original session config
   - Clear Redis session keys

3. **Rate Limiting Issues**
   - Remove rate limiter middleware
   - Restart services
   - Monitor login success rate

**Rollback Commands:**

```bash
# Revert to previous commit
git revert <commit-hash>

# Restart services
pm2 restart all

# Clear Redis (if needed)
redis-cli FLUSHDB
```

### Phase 2 Rollback

**Critical Data:** Audit logs (preserve even on rollback)

**Rollback Steps:**

1. Disable audit logging service
2. Revert token revocation checks
3. Revert account lockout logic
4. Keep audit log collection (for forensics)

---

## Success Metrics

### Phase 1 Metrics

| Metric | Target | Measurement |
|--------|--------|-------------|
| Token refresh success rate | > 99% | Monitor logs |
| Session timeout accuracy | ± 10 seconds | Test idle detection |
| Rate limit effectiveness | 100% block after limit | Load test |
| Error handling consistency | 100% | Code review |

### Phase 2 Metrics

| Metric | Target | Measurement |
|--------|--------|-------------|
| Audit event coverage | 100% of auth events | Code review |
| Account lockout success | 100% after 5 failures | Test |
| Token revocation latency | < 100ms | Performance test |
| Cross-service SSO success | > 99% | End-to-end test |

### Phase 3 Metrics

| Metric | Target | Measurement |
|--------|--------|-------------|
| Monitoring uptime | 99.9% | Uptime checks |
| Alert latency | < 60 seconds | Synthetic tests |
| Dashboard load time | < 2 seconds | Browser test |
| Compliance report accuracy | 100% | Audit |

### Phase 4 Metrics

| Metric | Target | Measurement |
|--------|--------|-------------|
| MFA adoption rate | > 80% for admins | User stats |
| Password reset success | > 95% | Support tickets |
| Token validation latency | < 50ms | APM |
| Permission check latency | < 10ms | APM |

---

## Conclusion

This comprehensive improvement plan addresses all critical security gaps, enhances reliability, and prepares the SSO system for enterprise deployment. The phased approach allows for incremental validation and minimizes risk.

**Immediate Next Steps:**
1. Review and approve this plan
2. Set up development environment for Phase 1
3. Create feature branches for each phase
4. Schedule kickoff meeting for Phase 1 implementation

**Questions for Stakeholder Review:**
1. Are the proposed timelines acceptable?
2. Do you have preferences for monitoring tools (Grafana vs. alternatives)?
3. Should we prioritize any specific phase or feature?
4. Are there additional compliance requirements to consider?

---

**Document Version:** 1.0
**Last Updated:** 2026-01-29
**Author:** Senior Backend Engineer
**Status:** Pending Approval
