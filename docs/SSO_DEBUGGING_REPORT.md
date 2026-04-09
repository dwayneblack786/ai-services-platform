# SSO Implementation Debugging Report
**Date:** January 27, 2026  
**Services:** product-management (IdP) ↔ prompt-management (RP)  
**Protocol:** OIDC Authorization Code Flow with PKCE

---

## 🎯 Executive Summary

The SSO implementation is **90% functional**. All OIDC protocol steps work correctly through authorization code issuance. The failure occurs during token exchange due to a **user persistence mismatch** between the dev-login endpoint and the OIDC token exchange logic.

**Status:** ✅ 7/8 steps working | ❌ 1 critical issue preventing completion

---

## 🔍 Detailed Analysis

### ✅ What's Working (7 Steps)

#### 1. Service Discovery
- **Endpoint:** `/api/oidc/.well-known/openid-configuration`
- **Status:** ✅ Working
- **Response:**
  ```json
  {
    "issuer": "http://localhost:5000",
    "authorization_endpoint": "http://localhost:5000/api/oidc/authorize",
    "token_endpoint": "http://localhost:5000/api/oidc/token",
    "userinfo_endpoint": "http://localhost:5000/api/oidc/userinfo",
    "response_types_supported": ["code"],
    "code_challenge_methods_supported": ["S256"]
  }
  ```

#### 2. SSO Initiation
- **Endpoint:** `http://localhost:5001/api/auth/sso/login`
- **Status:** ✅ Working
- **Logs:**
  ```
  [INFO] Authorization request initiated {"clientId":"prompt-management-client"}
  [INFO] SSO login initiated {"state":"s3N4YutVwv..."}
  ```
- **Output:** Generates authorization URL with PKCE challenge

#### 3. PKCE Challenge Generation
- **Method:** S256 (SHA-256 hash of code_verifier)
- **Status:** ✅ Working
- **Example:**
  ```
  code_challenge: 5Tl5q_mr9jTHFzd1GNbqqzuCHPq4DeeYIf8-DEVlvAs
  code_challenge_method: S256
  ```

#### 4. Authorization URL Construction
- **Status:** ✅ Working
- **Example URL:**
  ```
  http://localhost:5000/api/oidc/authorize?
    response_type=code&
    client_id=prompt-management-client&
    redirect_uri=http://localhost:5001/api/auth/sso/callback&
    scope=openid+profile+email&
    state=s3N4YutVwv0Nr3qGHe0nPvrCy0fQ2mvCRG854l4zqzA&
    code_challenge=5Tl5q_mr9jTHFzd1GNbqqzuCHPq4DeeYIf8-DEVlvAs&
    code_challenge_method=S256
  ```

#### 5. Authentication Check
- **Middleware:** `requireAuthOrRedirect`
- **Status:** ✅ Working correctly
- **Behavior:**
  - Unauthenticated requests → redirect to `/login`
  - Authenticated requests → proceed to authorization

#### 6. Dev Login Endpoint
- **Endpoint:** `/api/auth/dev-login` (development only)
- **Status:** ✅ Working
- **Creates:** In-memory mock user
  ```javascript
  {
    id: 'dev-user-123',
    email: 'dev@example.com',
    name: 'Dev User',
    role: 'DEVELOPER',
    tenantId: 'dev-tenant-001'
  }
  ```

#### 7. Authorization Code Issuance
- **Status:** ✅ Working
- **Example Code:** `Z8OgYqD9nNJABItGwfl301vQ8kavxmIxSqCx6o_JFjc`
- **Callback URL:**
  ```
  http://localhost:5001/api/auth/sso/callback?
    code=Z8OgYqD9nNJABItGwfl301vQ8kavxm&
    state=s3N4YutVwv0Nr3qGHe0nPvrCy0fQ2mvCRG854l4zqzA
  ```

---

### ❌ What's Failing (1 Critical Issue)

#### 8. Token Exchange
- **Status:** ❌ **FAILING**
- **Error:** `invalid_grant: User not found or not verified`
- **Log Entry:**
  ```
  [ERROR] Token exchange failed {
    "error": "Request failed with status code 400",
    "response": {
      "error": "invalid_grant",
      "error_description": "User not found or not verified"
    }
  }
  ```

---

## 🐛 Root Cause Analysis

### Problem

The `exchangeCodeForTokens()` function in the OIDC provider queries MongoDB to fetch user details for the ID token:

```typescript
// File: product-management/backend-node/src/services/oidc-provider.service.ts
export const exchangeCodeForTokens = async (/* ... */) => {
  // ... authorization code validation ...
  
  // ❌ PROBLEM: Queries MongoDB for user
  const user = await db.collection<UserDocument>('users').findOne({ 
    id: authCode.userId 
  });
  
  if (!user || !user.emailVerified) {
    throw new Error('User not found or not verified');
  }
  
  // ... generate tokens ...
};
```

### Why It Fails

1. **Dev-login creates in-memory user** (not persisted to MongoDB)
2. **Token exchange queries MongoDB** for user details
3. **User lookup fails** → token exchange fails
4. **Callback redirects with error:** `?error=sso_callback_failed`

### Affected Code Path

```
dev-login (creates in-memory user)
    ↓
Authorization code issued (uses session user)
    ↓
Token exchange (queries MongoDB) ← ❌ FAILS HERE
    ↓
User not found error
```

---

## 💡 Recommended Solutions

### Option 1: Create Persistent Dev User (✅ RECOMMENDED)

**Implementation:** Modify `ensureDevTenant()` to also create a dev user in MongoDB

```typescript
// File: product-management/backend-node/src/routes/auth.ts

export const ensureDevTenant = async () => {
  try {
    const db = getDB();
    
    // Existing tenant code...
    
    // ✅ ADD: Create dev user if not exists
    const devUser = await db.collection<UserDocument>('users').findOne({
      email: 'dev@example.com'
    });
    
    if (!devUser) {
      const userId = 'dev-user-123';
      const newDevUser: UserDocument = {
        id: userId,
        email: 'dev@example.com',
        name: 'Dev User',
        picture: 'https://ui-avatars.com/api/?name=Dev+User',
        role: UserRole.DEVELOPER,
        tenantId: DEV_TENANT_ID,
        emailVerified: true, // Auto-verify for dev
        companyDetailsCompleted: true,
        authProvider: 'local',
        createdAt: new Date(),
        updatedAt: new Date()
      };
      
      await db.collection<UserDocument>('users').insertOne(newDevUser as any);
      logger.info('✓ Development user created: dev@example.com');
    } else {
      logger.info('✓ Development user exists: dev@example.com');
    }
  } catch (error) {
    logger.error('Failed to ensure dev tenant/user', error);
  }
};
```

**Pros:**
- ✅ Minimal code changes
- ✅ Realistic testing (uses actual database)
- ✅ Works with all OIDC flows
- ✅ Automatically created on startup

**Cons:**
- ⚠️ Adds dev data to database (but isolated by tenant ID)

---

### Option 2: Support In-Memory Users in Token Exchange

**Implementation:** Check in-memory store before querying database

```typescript
// File: product-management/backend-node/src/services/oidc-provider.service.ts

import { users } from '../config/passport'; // Import in-memory store

export const exchangeCodeForTokens = async (/* ... */) => {
  // ... authorization code validation ...
  
  // ✅ CHECK: Try in-memory first, then database
  let user = users.get(authCode.userId); // In-memory store
  
  if (!user) {
    user = await db.collection<UserDocument>('users').findOne({ 
      id: authCode.userId 
    });
  }
  
  if (!user || !user.emailVerified) {
    throw new Error('User not found or not verified');
  }
  
  // ... generate tokens ...
};
```

**Pros:**
- ✅ Supports both dev and production users
- ✅ No database changes

**Cons:**
- ⚠️ Couples OIDC provider to passport's in-memory store
- ⚠️ Users stored in-memory lost on restart

---

### Option 3: Use Real Database User for Testing

**Implementation:** Create actual user via signup flow or direct database insert

**Steps:**
1. Sign up a test user: `test@example.com`
2. Verify email via verification token
3. Use that user for SSO testing

**Pros:**
- ✅ Tests real production flow
- ✅ No code changes needed

**Cons:**
- ⚠️ Requires manual setup
- ⚠️ Not convenient for automated testing

---

## 🚀 Quick Fix Implementation

**Chosen Solution:** Option 1 (Persistent Dev User)

### Changes Required

**File:** [product-management/backend-node/src/routes/auth.ts](../product-management/backend-node/src/routes/auth.ts)

**Location:** `ensureDevTenant()` function (lines 20-57)

**Change:** Add dev user creation after tenant creation

### Testing After Fix

```powershell
# 1. Restart product-management backend (will create dev user)
# Ctrl+C in terminal, then:
npm run dev

# 2. Run SSO flow test
.\product-management\scripts\test-sso-flow.ps1

# Expected result: All 8 steps pass, tokens issued successfully
```

---

## 📊 Test Results Before Fix

| Step | Component | Status | Details |
|------|-----------|--------|---------|
| 1 | OIDC Discovery | ✅ Pass | Returns valid configuration |
| 2 | SSO Initiation | ✅ Pass | Generates authorization URL |
| 3 | PKCE Generation | ✅ Pass | S256 challenge created |
| 4 | Authorization URL | ✅ Pass | All parameters present |
| 5 | Auth Check | ✅ Pass | Redirects unauthenticated requests |
| 6 | Dev Login | ✅ Pass | Session established |
| 7 | Auth Code Issue | ✅ Pass | Code: `Z8OgYqD...` |
| 8 | Token Exchange | ❌ **FAIL** | **User not found in MongoDB** |

**Pass Rate:** 87.5% (7/8)

---

## 🔐 Security Observations

### Current Implementation Strengths

1. ✅ **PKCE Implemented:** S256 code challenge prevents authorization code interception
2. ✅ **State Parameter:** CSRF protection via random state string
3. ✅ **Secure Redirect Validation:** Only registered redirect URIs accepted
4. ✅ **Code Expiration:** Authorization codes expire in 10 minutes
5. ✅ **Email Verification Check:** Token exchange validates user email is verified

### Critical Vulnerabilities (From Previous Audit)

⚠️ These issues remain from the security audit and should be addressed:

1. **CRITICAL:** HS256 symmetric signing instead of RS256 asymmetric
2. **CRITICAL:** No ID token signature verification in OIDC client
3. **CRITICAL:** In-memory storage (codes/tokens lost on restart)
4. **HIGH:** Cookie `sameSite='lax'` instead of `'none'` for cross-site SSO
5. **HIGH:** No silent authentication (`prompt=none` not implemented)

---

## 📝 Services Configuration

### Current Ports

| Service | Port | URL |
|---------|------|-----|
| product-management backend | 5000 | http://localhost:5000 |
| product-management frontend | 5174 | http://localhost:5174 |
| prompt-management backend | 5001 | http://localhost:5001 |
| prompt-management frontend | 3002 | http://localhost:3002 |

⚠️ **Port Mismatch Issue:** Registered redirect URIs reference ports 5173 and 3001, but frontends running on 5174 and 3002

### Environment Variables

**product-management/.env:**
```env
OIDC_ISSUER=http://localhost:5000
OIDC_CLIENT_SECRET_PROMPT_MGMT=prompt-mgmt-secret-key-min-32-chars-required
PROMPT_MGMT_REDIRECT_URI=http://localhost:5001/api/auth/sso/callback
```

**prompt-management/.env:**
```env
SSO_ENABLED=true
SSO_ISSUER=http://localhost:5000
SSO_CLIENT_ID=prompt-management-client
SSO_CLIENT_SECRET=prompt-mgmt-secret-key-min-32-chars-required
SSO_REDIRECT_URI=http://localhost:5001/api/auth/sso/callback
```

---

## 🧪 Testing Commands

### Manual Testing

```powershell
# 1. Start all services
cd product-management/backend-node && npm run dev  # Terminal 1
cd product-management/frontend && npm run dev      # Terminal 2
cd prompt-management/backend && npm run dev         # Terminal 3
cd prompt-management/frontend && npm run dev        # Terminal 4

# 2. Test OIDC discovery
Invoke-WebRequest -Uri "http://localhost:5000/api/oidc/.well-known/openid-configuration" -UseBasicParsing | Select-Object -Expand Content | ConvertFrom-Json

# 3. Test dev login
Invoke-WebRequest -Uri "http://localhost:5000/api/auth/dev-login" -Method POST -UseBasicParsing

# 4. Test SSO flow (after fix)
.\product-management\scripts\test-sso-flow.ps1
```

### Automated Test Script

Created: [`test-sso-flow.ps1`](../product-management/scripts/test-sso-flow.ps1)

---

## 📚 Related Documentation

- [OIDC Provider Service](../product-management/backend-node/src/services/oidc-provider.service.ts)
- [OIDC Client Service (product-mgmt)](../product-management/backend-node/src/services/oidc-client.service.ts)
- [OIDC Client Service (prompt-mgmt)](../prompt-management/backend/src/services/oidc-client.service.ts)
- [OIDC Routes (IdP)](../product-management/backend-node/src/routes/oidc.ts)
- [SSO Routes (RP)](../product-management/backend-node/src/routes/sso.ts)
- [Auth Routes (product-mgmt)](../product-management/backend-node/src/routes/auth.ts)
- [Auth Routes (prompt-mgmt)](../prompt-management/backend/src/routes/auth.ts)
- [Security Audit Report](SECURITY_AUDIT_REPORT.md) (if exists from previous session)

---

## 🎯 Next Steps

### Immediate (Fix Current Issue)

1. ✅ Implement Option 1: Add dev user creation to `ensureDevTenant()`
2. ✅ Restart product-management backend
3. ✅ Verify dev user exists in MongoDB: `db.users.findOne({email: 'dev@example.com'})`
4. ✅ Retest SSO flow end-to-end
5. ✅ Verify tokens issued successfully

### Short Term (Port Configuration)

1. Update registered redirect URIs to match actual frontend ports (5174, 3002)
2. Or configure frontends to use fixed ports (5173, 3001)

### Long Term (Security Hardening)

1. Implement RS256 with key rotation (CRITICAL-001 from audit)
2. Add ID token signature verification (CRITICAL-003)
3. Migrate to Redis for token storage (CRITICAL-002)
4. Fix cookie sameSite for cross-site SSO (HIGH-003)
5. Implement silent authentication with `prompt=none` (HIGH-002)

---

## 📞 Support Information

**Logs Location:**
- product-management: Check terminal running `npm run dev` (port 5000)
- prompt-management: Check terminal running `npm run dev` (port 5001)

**Common Issues:**
- Port conflicts: Use `Get-NetTCPConnection -LocalPort <port>` to find blocking processes
- MongoDB connection: Verify MongoDB running on `localhost:27017`
- Redis connection: Optional in development (uses memory store)

**Debug Mode:**
- Backend logs include correlation IDs for request tracing
- Look for `[ERROR]` entries in logs for detailed stack traces

---

*End of Report*
