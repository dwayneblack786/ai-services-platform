# Single Sign-On (SSO) Implementation Guide

## Overview

This implementation provides OpenID Connect (OIDC) based Single Sign-On between:
- **product-management** (acts as Identity Provider - IdP)
- **prompt-management** (acts as Relying Party - Client)

**Protocol**: OpenID Connect (OIDC) with Authorization Code Flow + PKCE (Proof Key for Code Exchange)

### Key Features
✅ **CSRF Protection**: State parameter validation  
✅ **PKCE**: Protection against authorization code interception  
✅ **Identity Mapping**: Stable user identity using `sub` claim  
✅ **JIT Provisioning**: Automatic user creation on first SSO login  
✅ **Token Validation**: Signature, issuer, audience, and expiration checks  
✅ **Session Management**: Secure local sessions with HttpOnly cookies  
✅ **Logout Propagation**: Token revocation support  
✅ **Backward Compatibility**: Existing username/password login preserved  

---

## Architecture

### Components

1. **Identity Provider (IdP)** - `product-management` (port 5000)
   - Central authentication service
   - Issues JWT access tokens, ID tokens, and refresh tokens
   - Manages authorization codes and PKCE challenges
   - Provides OIDC-compliant endpoints

2. **Relying Party (RP)** - `prompt-management` (port 3001)
   - Consumes SSO tokens from IdP
   - Performs Just-In-Time (JIT) user provisioning
   - Validates tokens locally using shared JWT secret
   - Maps IdP user identities to local accounts

### Authentication Flow

```
┌─────────────┐                                     ┌───────────────────────┐
│             │  1. GET /sso/login                  │                       │
│   Browser   │────────────────────────────────────▶│  Prompt Management    │
│             │                                     │  (Relying Party)      │
│             │  2. Redirect to IdP                 │                       │
│             │◀────────────────────────────────────│  - Generate PKCE      │
│             │  /oidc/authorize?                   │  - Generate state     │
│             │    code_challenge=...               │  - Store temporarily  │
│             │    &state=...                       └───────────────────────┘
│             │
│             │  3. Redirect to IdP
│             │────────────────────────────────────┐
│             │                                    │
│             │                                    ▼
│             │                             ┌───────────────────────┐
│             │                             │                       │
│             │  4. Show login (if needed)  │  Product Management   │
│             │◀────────────────────────────│  (Identity Provider)  │
│             │                             │                       │
│             │  5. Submit credentials      │  - Verify user        │
│             │────────────────────────────▶│  - Store auth code    │
│             │                             │  - Bind PKCE          │
│             │  6. Redirect with code      │                       │
│             │◀────────────────────────────│                       │
│             │  /sso/callback?             └───────────────────────┘
│             │    code=...&state=...
│             │
│             │  7. POST /oidc/token
│             │  { code, code_verifier }
│             │────────────────────────────────────┐
│             │                                    │
│             │                                    ▼
│             │                             ┌───────────────────────┐
│             │                             │                       │
│             │  8. Return tokens           │  Product Management   │
│             │◀────────────────────────────│  (IdP)                │
│             │  { access_token,            │                       │
│             │    id_token,                │  - Verify PKCE        │
│             │    refresh_token }          │  - Issue tokens       │
│             │                             └───────────────────────┘
│             │
│             │  9. Callback handler
│             │────────────────────────────────────┐
│             │                                    │
│             │                                    ▼
│             │                             ┌───────────────────────┐
│             │                             │                       │
│             │  10. Set session cookie     │  Prompt Management    │
│             │◀────────────────────────────│  (RP)                 │
│             │                             │                       │
│             │  11. Redirect to app        │  - Validate ID token  │
│             │◀────────────────────────────│  - Map identity       │
│             │                             │  - Create local user  │
└─────────────┘                             └───────────────────────┘
```

---

## OIDC Endpoints

### Identity Provider (product-management)

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/.well-known/openid-configuration` | GET | Discovery endpoint |
| `/api/oidc/authorize` | GET | Authorization endpoint |
| `/api/oidc/token` | POST | Token endpoint |
| `/api/oidc/userinfo` | GET | User info endpoint |
| `/api/oidc/introspect` | POST | Token introspection |
| `/api/oidc/revoke` | POST | Token revocation |
| `/api/oidc/logout` | POST | Logout endpoint |
| `/api/oidc/jwks` | GET | JSON Web Key Set |

### SSO Client Endpoints (both services)

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/auth/sso/login` | GET | Initiate SSO flow |
| `/auth/sso/callback` | GET | Handle OAuth callback |
| `/auth/sso/logout` | POST | SSO logout |

---

## Token Structure

### ID Token (OIDC Standard)

```json
{
  "iss": "http://localhost:5000",
  "sub": "user-id-123",
  "aud": "prompt-management-client",
  "exp": 1738000000,
  "iat": 1737996400,
  "auth_time": 1737996400,
  "nonce": "random-nonce",
  "email": "user@example.com",
  "email_verified": true,
  "name": "John Doe",
  "given_name": "John",
  "family_name": "Doe",
  "picture": "https://...",
  "role": "ADMIN",
  "tenant_id": "tenant-001"
}
```

### Access Token

```json
{
  "iss": "http://localhost:5000",
  "sub": "user-id-123",
  "aud": "prompt-management-client",
  "exp": 1738000000,
  "iat": 1737996400,
  "scope": "openid profile email",
  "client_id": "prompt-management-client",
  "jti": "unique-token-id"
}
```

### Refresh Token

```json
{
  "iss": "http://localhost:5000",
  "sub": "user-id-123",
  "aud": "prompt-management-client",
  "exp": 1740588400,
  "iat": 1737996400,
  "jti": "unique-refresh-id",
  "token_type": "refresh"
}
```

---

## Detailed Flow Walkthrough

### 1. User Initiates SSO Login

**User Action**: Clicks "Login with Product Management" in prompt-management

**Request**:
```http
GET http://localhost:3001/api/auth/sso/login
```

**Backend Process** (prompt-management):
1. Generate PKCE challenge:
   - `code_verifier`: Random 32-byte base64url string
   - `code_challenge`: SHA256(code_verifier) in base64url
2. Generate state: Random 32-byte base64url string (CSRF protection)
3. Store state and code_verifier in memory (expires in 10 minutes)
4. Build authorization URL

**Redirect Response**:
```http
HTTP/1.1 302 Found
Location: http://localhost:5000/api/oidc/authorize?
  response_type=code
  &client_id=prompt-management-client
  &redirect_uri=http://localhost:3001/api/auth/sso/callback
  &scope=openid profile email
  &state=abc123xyz
  &code_challenge=E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM
  &code_challenge_method=S256
```

### 2. User Authenticates at IdP

**Request**:
```http
GET http://localhost:5000/api/oidc/authorize?...
```

**Backend Process** (product-management):
1. Check if user is authenticated:
   - If NO: Redirect to login page (preserving OAuth params)
   - If YES: Continue to authorization
2. Validate OAuth parameters:
   - `client_id` must be registered
   - `redirect_uri` must match registered URI
   - `response_type` must be `code`
   - `code_challenge_method` must be `S256`
3. Generate authorization code (10-minute expiry)
4. Store authorization code with metadata:
   ```json
   {
     "code": "auth-code-123",
     "userId": "user-id-123",
     "clientId": "prompt-management-client",
     "redirectUri": "http://localhost:3001/api/auth/sso/callback",
     "scope": "openid profile email",
     "codeChallenge": "E9Melhoa...",
     "codeChallengeMethod": "S256",
     "expiresAt": 1737997000
   }
   ```
5. Redirect to client callback with code

**Redirect Response**:
```http
HTTP/1.1 302 Found
Location: http://localhost:3001/api/auth/sso/callback?
  code=auth-code-123
  &state=abc123xyz
```

### 3. Token Exchange

**Request** (prompt-management → product-management):
```http
POST http://localhost:5000/api/oidc/token
Content-Type: application/json

{
  "grant_type": "authorization_code",
  "code": "auth-code-123",
  "redirect_uri": "http://localhost:3001/api/auth/sso/callback",
  "client_id": "prompt-management-client",
  "client_secret": "your-client-secret",
  "code_verifier": "dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk"
}
```

**Backend Process** (product-management):
1. Validate authorization code:
   - Code exists and not expired
   - `client_id` matches
   - `redirect_uri` matches
2. Verify PKCE:
   - Compute `SHA256(code_verifier)` in base64url
   - Compare with stored `code_challenge`
   - If mismatch: Reject with 400 error
3. Validate client credentials:
   - `client_id` and `client_secret` match
4. Delete authorization code (one-time use)
5. Generate tokens:
   - Access token (1 hour expiry)
   - ID token (1 hour expiry)
   - Refresh token (30 days expiry)

**Response**:
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "id_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refresh_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "token_type": "Bearer",
  "expires_in": 3600,
  "scope": "openid profile email"
}
```

### 4. Identity Mapping & Session Creation

**Backend Process** (prompt-management):

1. **Validate ID Token**:
   ```typescript
   const payload = jwt.verify(id_token, JWT_SECRET, {
     issuer: 'http://localhost:5000',
     audience: 'prompt-management-client'
   });
   ```

2. **Extract Claims**:
   ```json
   {
     "sub": "user-id-123",
     "email": "john@example.com",
     "email_verified": true,
     "name": "John Doe",
     "given_name": "John",
     "family_name": "Doe",
     "role": "ADMIN",
     "tenant_id": "tenant-001"
   }
   ```

3. **Identity Mapping Strategy**:
   ```typescript
   // Try 1: Find by IdP subject identifier
   let user = await User.findOne({
     idpSub: payload.sub,
     idpIssuer: 'http://localhost:5000'
   });

   // Try 2: Find by email (link existing account)
   if (!user) {
     user = await User.findOne({ email: payload.email });
     if (user) {
       // Link IdP identity to existing account
       user.idpSub = payload.sub;
       user.idpIssuer = 'http://localhost:5000';
       user.ssoProvider = 'product-management';
       await user.save();
     }
   }

   // Try 3: Create new user (JIT Provisioning)
   if (!user) {
     user = await User.create({
       email: payload.email,
       firstName: payload.given_name,
       lastName: payload.family_name,
       idpSub: payload.sub,
       idpIssuer: 'http://localhost:5000',
       ssoProvider: 'product-management',
       role: mapRole(payload.role),
       emailVerified: payload.email_verified,
       isActive: true
     });
   }
   ```

4. **Create Local Session**:
   ```typescript
   // Generate local JWT token
   const localToken = jwt.sign(
     {
       userId: user._id,
       email: user.email,
       role: user.role
     },
     JWT_SECRET,
     { expiresIn: '24h' }
   );

   // Set HttpOnly cookie
   res.cookie('token', localToken, {
     httpOnly: true,
     secure: process.env.NODE_ENV === 'production',
     sameSite: 'lax',
     maxAge: 24 * 60 * 60 * 1000
   });
   ```

5. **Redirect to Application**:
   ```http
   HTTP/1.1 302 Found
   Location: http://localhost:5174/dashboard
   ```

---

## Role Mapping

Roles from product-management are mapped to prompt-management roles:

| Product-Mgmt Role | Prompt-Mgmt Role | Description |
|------------------|------------------|-------------|
| `ADMIN` | `admin` | Full system access |
| `DEVELOPER` | `developer` | Can execute prompts, read workflows |
| `EDITOR` | `editor` | Can create/edit prompts |
| `USER` | `editor` | Same as editor |
| `VIEWER` | `viewer` | Read-only access |
| (default) | `viewer` | Fallback for unknown roles |

```typescript
function mapRole(idpRole: string): string {
  const roleMap: Record<string, string> = {
    'ADMIN': 'admin',
    'DEVELOPER': 'developer',
    'EDITOR': 'editor',
    'USER': 'editor',
    'VIEWER': 'viewer'
  };
  return roleMap[idpRole] || 'viewer';
}
```

---

## Configuration

### 1. Product Management (.env)

```bash
# OIDC Issuer (this server)
OIDC_ISSUER=http://localhost:5000

# Client Secrets (min 32 characters)
OIDC_CLIENT_SECRET_PROMPT_MGMT=your-secure-secret-min-32-chars-12345678

# Redirect URIs (whitelist)
PROMPT_MGMT_REDIRECT_URI=http://localhost:3001/api/auth/sso/callback

# JWT Secret (MUST be shared with all services)
JWT_SECRET=your-super-secret-jwt-key-min-64-chars-abcdefghijk123456789

# Session Secret
SESSION_SECRET=your-session-secret-min-32-chars-xyz

# Token Expiry
ACCESS_TOKEN_EXPIRY=1h
REFRESH_TOKEN_EXPIRY=30d

# Security Settings
COOKIE_SECURE=false  # Set to true in production
COOKIE_SAME_SITE=lax

# Production Settings
# ALGORITHM=RS256  # Use asymmetric keys in production
# REDIS_URL=redis://localhost:6379  # For distributed state storage
```

### 2. Prompt Management (.env)

```bash
# SSO Configuration
SSO_ENABLED=true
SSO_ISSUER=http://localhost:5000
SSO_CLIENT_ID=prompt-management-client
SSO_CLIENT_SECRET=your-secure-secret-min-32-chars-12345678
SSO_REDIRECT_URI=http://localhost:3001/api/auth/sso/callback

# JWT Secret (MUST match product-management)
JWT_SECRET=your-super-secret-jwt-key-min-64-chars-abcdefghijk123456789

# Frontend URL
CLIENT_URL=http://localhost:5174

# Session Settings
SESSION_SECRET=your-session-secret-xyz
COOKIE_SECURE=false  # Set to true in production
COOKIE_SAME_SITE=lax

# Production Settings
# REDIS_URL=redis://localhost:6379  # For session storage
```

---

## Security Features

### 1. CSRF Protection (State Parameter)

- **Generation**: 32-byte cryptographically random string
- **Storage**: Temporarily stored on server (10-minute expiry)
- **Validation**: Must match between request and callback
- **One-time use**: Deleted after validation

```typescript
const state = crypto.randomBytes(32).toString('base64url');
pendingAuthRequests.set(state, {
  codeVerifier,
  expiresAt: Date.now() + 10 * 60 * 1000
});
```

### 2. PKCE Protection

**Purpose**: Protects against authorization code interception attacks

**Flow**:
1. Client generates `code_verifier` (random 32-byte string)
2. Client computes `code_challenge = BASE64URL(SHA256(code_verifier))`
3. Client sends `code_challenge` in authorization request
4. Server stores `code_challenge` with authorization code
5. Client sends `code_verifier` in token request
6. Server computes `SHA256(code_verifier)` and compares with stored `code_challenge`

```typescript
// Client (prompt-management)
function generatePKCEChallenge() {
  const codeVerifier = crypto.randomBytes(32).toString('base64url');
  const hash = crypto.createHash('sha256').update(codeVerifier).digest();
  const codeChallenge = hash.toString('base64url');
  return { codeVerifier, codeChallenge };
}

// Server (product-management)
function verifyPKCE(codeVerifier: string, codeChallenge: string): boolean {
  const hash = crypto.createHash('sha256').update(codeVerifier).digest();
  const computedChallenge = hash.toString('base64url');
  return computedChallenge === codeChallenge;
}
```

### 3. Token Security

| Feature | Implementation |
|---------|----------------|
| **Algorithm** | HS256 (symmetric) - use RS256 in production |
| **Signature** | JWT signed with `JWT_SECRET` |
| **Expiration** | Access: 1h, Refresh: 30d |
| **Audience** | Client-specific (`prompt-management-client`) |
| **Issuer** | Fixed (`http://localhost:5000`) |
| **Unique ID** | `jti` claim for revocation tracking |
| **One-time codes** | Authorization codes deleted after use |

### 4. Client Authentication

- **Client ID**: Public identifier
- **Client Secret**: Shared secret (min 32 characters)
- **Redirect URI**: Whitelist validation
- **Secret Storage**: Hashed in database (not implemented yet)

---

## Testing the SSO Flow

### Prerequisites

1. **Install Dependencies**:
   ```bash
   cd product-management/backend-node
   npm install pkce-challenge

   cd ../prompt-management/backend
   npm install pkce-challenge
   ```

2. **Configure Environment**:
   - Copy `.env.oidc.example` to `.env`
   - Set matching `JWT_SECRET` in both services
   - Set `OIDC_CLIENT_SECRET_PROMPT_MGMT` and `SSO_CLIENT_SECRET` to same value

3. **Start Services**:
   ```bash
   # Terminal 1
   cd product-management/backend-node
   npm run dev

   # Terminal 2
   cd prompt-management/backend
   npm run dev

   # Terminal 3 (if needed)
   cd product-management/frontend
   npm run dev

   # Terminal 4 (if needed)
   cd prompt-management/frontend
   npm run dev
   ```

### Manual Testing

#### Test 1: Discovery Endpoint

```bash
curl http://localhost:5000/api/oidc/.well-known/openid-configuration | jq
```

**Expected**: OIDC configuration JSON with all endpoints

#### Test 2: Complete SSO Flow

1. Open browser: `http://localhost:3001/api/auth/sso/login`
2. Should redirect to: `http://localhost:5000/api/oidc/authorize?...`
3. If not logged in, should show login page
4. After login, should redirect back to: `http://localhost:3001/api/auth/sso/callback?code=...&state=...`
5. Should be logged into prompt-management

#### Test 3: Identity Mapping - First Login

**Setup**: User exists in product-management, not in prompt-management

**Steps**:
1. Complete SSO flow (Test 2)
2. Check prompt-management database:
   ```bash
   # MongoDB
   db.users.findOne({ email: "test@example.com" })
   ```
3. Verify user created with:
   - `idpSub` set to product-management user ID
   - `idpIssuer` set to `http://localhost:5000`
   - `ssoProvider` set to `product-management`

#### Test 4: Identity Mapping - Existing User

**Setup**: User exists in both systems with same email

**Steps**:
1. Create user in prompt-management manually:
   ```javascript
   db.users.insertOne({
     email: "existing@example.com",
     firstName: "Existing",
     lastName: "User",
     role: "viewer"
   })
   ```
2. Complete SSO flow
3. Verify user record updated with:
   - `idpSub` added
   - `idpIssuer` added
   - Role potentially updated

#### Test 5: PKCE Validation

**Test with tampered code_verifier**:

```bash
# Step 1: Start SSO flow and capture code_challenge
curl -v http://localhost:3001/api/auth/sso/login 2>&1 | grep Location

# Step 2: Complete authorization and get code
# (manual browser login)

# Step 3: Try token exchange with wrong code_verifier
curl -X POST http://localhost:5000/api/oidc/token \
  -H "Content-Type: application/json" \
  -d '{
    "grant_type": "authorization_code",
    "code": "captured_code",
    "client_id": "prompt-management-client",
    "client_secret": "your-secret",
    "code_verifier": "wrong-verifier-abcdefghijk123456789",
    "redirect_uri": "http://localhost:3001/api/auth/sso/callback"
  }'
```

**Expected**: `400 Bad Request` with error `invalid_grant` (PKCE verification failed)

#### Test 6: State Validation

**Test with invalid state**:

```bash
# Manually construct callback URL with wrong state
curl -v "http://localhost:3001/api/auth/sso/callback?code=some-code&state=invalid-state"
```

**Expected**: `400 Bad Request` with error `invalid_state`

#### Test 7: Token Validation

```bash
# Get tokens from SSO flow
TOKEN="<access_token_from_flow>"

# Introspect token
curl -X POST http://localhost:5000/api/oidc/introspect \
  -H "Content-Type: application/json" \
  -d "{\"token\": \"$TOKEN\"}" | jq

# Get user info
curl http://localhost:5000/api/oidc/userinfo \
  -H "Authorization: Bearer $TOKEN" | jq
```

#### Test 8: Token Revocation

```bash
# Revoke token
curl -X POST http://localhost:5000/api/oidc/revoke \
  -H "Content-Type: application/json" \
  -d "{\"token\": \"$TOKEN\"}"

# Try introspecting revoked token
curl -X POST http://localhost:5000/api/oidc/introspect \
  -H "Content-Type: application/json" \
  -d "{\"token\": \"$TOKEN\"}" | jq
```

**Expected**: `{"active": false}`

#### Test 9: Refresh Token

```bash
REFRESH_TOKEN="<refresh_token_from_flow>"

curl -X POST http://localhost:5000/api/oidc/token \
  -H "Content-Type: application/json" \
  -d "{
    \"grant_type\": \"refresh_token\",
    \"refresh_token\": \"$REFRESH_TOKEN\",
    \"client_id\": \"prompt-management-client\",
    \"client_secret\": \"your-secret\"
  }" | jq
```

**Expected**: New access token issued

---

## Error Handling

### Client-Side Errors (4xx)

| Error Code | Error | Cause | User Message |
|------------|-------|-------|--------------|
| 400 | `invalid_request` | Missing required parameter | "Invalid login request. Please try again." |
| 400 | `invalid_grant` | Authorization code invalid/expired | "Your login session expired. Please try again." |
| 400 | `invalid_grant` | PKCE verification failed | "Security validation failed. Please try again." |
| 400 | `invalid_state` | State mismatch/expired | "Your login session expired. Please try again." |
| 401 | `invalid_client` | Client credentials invalid | "Authentication failed. Please contact support." |
| 403 | `access_denied` | User denied authorization | "You must authorize access to continue." |

### Server-Side Errors (5xx)

| Error Code | Error | Cause | User Message |
|------------|-------|-------|--------------|
| 500 | `server_error` | Internal server error | "Something went wrong. Please try again later." |
| 503 | `temporarily_unavailable` | Service temporarily down | "Service temporarily unavailable. Please try again later." |

### Error Response Format

```json
{
  "error": "invalid_grant",
  "error_description": "Authorization code has expired",
  "error_uri": "https://docs.example.com/errors/invalid_grant"
}
```

### Logging

**Security Events** (always logged):
- Authentication attempts (success/failure)
- Token issuance
- Token revocation
- PKCE verification failures
- State validation failures

**Debug Events** (development only):
- Authorization request parameters
- Token exchange details
- Identity mapping decisions

```typescript
logger.info('SSO authentication successful', {
  userId: user._id,
  email: user.email,
  idpSub: payload.sub,
  isNewUser: !existingUser
});

logger.warn('PKCE verification failed', {
  clientId,
  expectedChallenge: storedChallenge,
  computedChallenge
});
```

---

## Frontend Integration

### Product-Management Frontend

**Login Button** (if product-management wants to use SSO to itself):

```tsx
import React from 'react';

function LoginPage() {
  const handleSSOLogin = () => {
    // Redirect to SSO login endpoint
    window.location.href = 'http://localhost:5000/auth/sso/login';
  };

  return (
    <div>
      <h1>Login</h1>
      
      {/* Regular login form */}
      <form>
        <input type="email" placeholder="Email" />
        <input type="password" placeholder="Password" />
        <button type="submit">Login</button>
      </form>

      {/* OR divider */}
      <div>OR</div>

      {/* SSO login button */}
      <button onClick={handleSSOLogin}>
        Login with SSO
      </button>
    </div>
  );
}
```

### Prompt-Management Frontend

**SSO Login Button**:

```tsx
import React from 'react';

function LoginPage() {
  const handleSSOLogin = () => {
    // Redirect to SSO login endpoint
    window.location.href = 'http://localhost:3001/api/auth/sso/login';
  };

  return (
    <div>
      <h1>Login to Prompt Management</h1>
      
      {/* SSO login button */}
      <button onClick={handleSSOLogin}>
        Login with Product Management
      </button>

      {/* OR divider */}
      <div>OR</div>

      {/* Local login form */}
      <form>
        <input type="email" placeholder="Email" />
        <input type="password" placeholder="Password" />
        <button type="submit">Login</button>
      </form>
    </div>
  );
}
```

**Callback Handler**:

The backend handles the callback automatically. Frontend just needs to handle post-login redirect:

```tsx
// App.tsx or Router setup
import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

function SSOCallbackPage() {
  const navigate = useNavigate();

  useEffect(() => {
    // Backend sets cookie automatically
    // Just check if user is authenticated
    const checkAuth = async () => {
      try {
        const response = await fetch('http://localhost:3001/api/auth/me', {
          credentials: 'include'
        });
        
        if (response.ok) {
          // User is authenticated, redirect to dashboard
          navigate('/dashboard');
        } else {
          // Authentication failed, redirect to login
          navigate('/login');
        }
      } catch (error) {
        console.error('Auth check failed:', error);
        navigate('/login');
      }
    };

    checkAuth();
  }, [navigate]);

  return <div>Logging you in...</div>;
}
```

**API Client with Token**:

```typescript
// api-client.ts
import axios from 'axios';

const apiClient = axios.create({
  baseURL: 'http://localhost:3001/api',
  withCredentials: true  // Important: Send cookies
});

// Optional: Handle 401 errors
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Redirect to login
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export default apiClient;
```

**Protected Route**:

```tsx
import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from './hooks/useAuth';

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();

  if (loading) {
    return <div>Loading...</div>;
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}
```

---

## Production Deployment

### Required Changes

#### 1. Use RS256 Algorithm (Asymmetric Keys)

**Why**: HS256 uses shared secrets. If any service is compromised, all tokens can be forged.

**How**:

```bash
# Generate RSA key pair
openssl genrsa -out private-key.pem 2048
openssl rsa -in private-key.pem -pubout -out public-key.pem
```

```typescript
// product-management (IdP) - Sign tokens
const privateKey = fs.readFileSync('private-key.pem');
const token = jwt.sign(payload, privateKey, {
  algorithm: 'RS256',
  expiresIn: '1h'
});

// prompt-management (RP) - Verify tokens
const publicKey = fs.readFileSync('public-key.pem');
const payload = jwt.verify(token, publicKey, {
  algorithms: ['RS256'],
  issuer: 'https://auth.example.com',
  audience: 'prompt-management-client'
});
```

**JWKS Endpoint**:

```typescript
// Expose public key via JWKS endpoint
app.get('/api/oidc/jwks', (req, res) => {
  const jwks = {
    keys: [{
      kty: 'RSA',
      use: 'sig',
      kid: 'key-1',
      n: '<modulus_base64url>',
      e: '<exponent_base64url>'
    }]
  };
  res.json(jwks);
});
```

#### 2. Use Redis for State Storage

**Why**: In-memory storage doesn't work with multiple server instances (horizontal scaling)

**How**:

```typescript
import Redis from 'ioredis';

const redis = new Redis(process.env.REDIS_URL);

// Store PKCE state
await redis.setex(
  `pkce:${state}`,
  600,  // 10 minutes
  JSON.stringify({ codeVerifier, expiresAt })
);

// Retrieve PKCE state
const data = await redis.get(`pkce:${state}`);
if (data) {
  const { codeVerifier } = JSON.parse(data);
  await redis.del(`pkce:${state}`);  // One-time use
}

// Store authorization code
await redis.setex(
  `authcode:${code}`,
  600,
  JSON.stringify({ userId, clientId, codeChallenge, ... })
);
```

#### 3. Enable HTTPS

```bash
# .env
COOKIE_SECURE=true
OIDC_ISSUER=https://auth.example.com
SSO_ISSUER=https://auth.example.com
SSO_REDIRECT_URI=https://app.example.com/api/auth/sso/callback
```

#### 4. Rate Limiting

```typescript
import rateLimit from 'express-rate-limit';

// Token endpoint rate limiting
const tokenLimiter = rateLimit({
  windowMs: 60 * 1000,  // 1 minute
  max: 10,  // 10 requests per minute
  message: 'Too many token requests, please try again later'
});

app.post('/api/oidc/token', tokenLimiter, tokenHandler);

// Authorization endpoint rate limiting
const authLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 20,  // 20 requests per minute
  message: 'Too many authorization requests, please try again later'
});

app.get('/api/oidc/authorize', authLimiter, authorizeHandler);
```

#### 5. Token Revocation Database

```typescript
// Instead of in-memory Map
const RevokedTokenSchema = new mongoose.Schema({
  jti: { type: String, required: true, unique: true },
  expiresAt: { type: Date, required: true, index: { expires: 0 } }
});

// Revoke token
await RevokedToken.create({ jti, expiresAt });

// Check if revoked
const revoked = await RevokedToken.findOne({ jti });
```

#### 6. Monitoring & Logging

```typescript
// Structured logging
logger.info('sso.authentication.success', {
  userId,
  clientId,
  idpSub,
  isNewUser,
  timestamp: new Date().toISOString()
});

logger.warn('sso.pkce.verification.failed', {
  clientId,
  timestamp: new Date().toISOString()
});

// Metrics (Prometheus example)
const authCounter = new promClient.Counter({
  name: 'sso_authentications_total',
  help: 'Total number of SSO authentications',
  labelNames: ['client_id', 'status']
});

authCounter.inc({ client_id: 'prompt-management-client', status: 'success' });
```

#### 7. Security Headers

```typescript
import helmet from 'helmet';

app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"]
    }
  },
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true
  }
}));
```

---

## Production Checklist

- [ ] Replace HS256 with RS256 algorithm
- [ ] Generate and securely store RSA key pair
- [ ] Implement JWKS endpoint
- [ ] Set up Redis for state storage
- [ ] Configure Redis persistence and backup
- [ ] Enable HTTPS on all services
- [ ] Set `COOKIE_SECURE=true`
- [ ] Set `COOKIE_SAME_SITE=strict` or `lax`
- [ ] Implement rate limiting on all endpoints
- [ ] Set up MongoDB indexes for performance
- [ ] Configure token revocation with TTL
- [ ] Implement structured logging
- [ ] Set up log aggregation (ELK, Datadog, etc.)
- [ ] Configure monitoring and alerting
- [ ] Set up health check endpoints
- [ ] Implement automated token cleanup job
- [ ] Document service registration process
- [ ] Test disaster recovery (IdP down)
- [ ] Implement MFA hooks (optional)
- [ ] Set up audit logging for compliance
- [ ] Configure CORS properly
- [ ] Review and test error messages (no sensitive data)
- [ ] Implement secret rotation strategy
- [ ] Set up penetration testing schedule
- [ ] Document incident response procedures

---

## Troubleshooting

### Issue: "Invalid state" error

**Symptoms**: Callback fails with `400 Bad Request: Invalid state parameter`

**Causes**:
1. State expired (>10 minutes)
2. State reused (already validated once)
3. Clock skew between servers
4. Lost state (server restart with in-memory storage)

**Solutions**:
1. Reduce time between steps (complete flow faster)
2. Don't refresh/back button during flow
3. Sync server clocks (NTP)
4. Use Redis for state storage (production)

**Debugging**:
```bash
# Check server logs
grep "Invalid state" logs/app.log

# Check state storage
# In-memory: Restart flow
# Redis: Check key exists
redis-cli GET "pkce:<state>"
```

### Issue: "PKCE verification failed"

**Symptoms**: Token exchange fails with `400 Bad Request: Invalid grant`

**Causes**:
1. `code_verifier` doesn't match `code_challenge`
2. Wrong hashing algorithm (must be SHA-256)
3. Wrong encoding (must be base64url, not base64)
4. Tampered authorization code

**Solutions**:
1. Use `pkce-challenge` library (handles encoding correctly)
2. Don't manually implement PKCE (easy to get wrong)
3. Verify both client and server use same algorithm

**Debugging**:
```typescript
// Server-side logging
logger.debug('PKCE verification', {
  codeVerifier,
  storedChallenge,
  computedChallenge: crypto.createHash('sha256')
    .update(codeVerifier)
    .digest()
    .toString('base64url')
});
```

### Issue: "Token signature verification failed"

**Symptoms**: ID token validation fails in prompt-management

**Causes**:
1. `JWT_SECRET` mismatch between services
2. Token tampered with
3. Wrong algorithm (HS256 vs RS256)
4. Token corrupted in transit

**Solutions**:
1. Ensure `JWT_SECRET` is identical in both `.env` files
2. Restart all services after changing secret
3. Clear all existing tokens/sessions
4. Check for URL encoding issues (spaces, special characters)

**Debugging**:
```bash
# Decode token without verification
node -e "console.log(JSON.stringify(JSON.parse(Buffer.from('${TOKEN}'.split('.')[1], 'base64url').toString()), null, 2))"

# Check JWT secret in both services
grep JWT_SECRET product-management/backend-node/.env
grep JWT_SECRET prompt-management/backend/.env
```

### Issue: "User not found after SSO"

**Symptoms**: SSO completes but user not logged in

**Causes**:
1. JIT provisioning failed (database error)
2. Identity mapping failed (wrong email/sub)
3. User creation validation failed
4. Missing required fields in ID token

**Solutions**:
1. Check database connection
2. Verify ID token contains all required claims
3. Check server logs for validation errors
4. Manually create user and try again

**Debugging**:
```bash
# Check MongoDB logs
tail -f /var/log/mongodb/mongod.log

# Check user creation logs
grep "JIT provisioning" logs/app.log

# Verify user in database
mongo
> use prompt_management
> db.users.findOne({ email: "test@example.com" })
```

### Issue: "Clock skew" errors

**Symptoms**: Tokens rejected with "Token used before valid" or similar

**Causes**:
1. System clocks out of sync between servers
2. Timezone misconfiguration
3. Virtual machine time drift

**Solutions**:
1. Install and configure NTP:
   ```bash
   # Linux
   sudo apt-get install ntp
   sudo systemctl enable ntp
   sudo systemctl start ntp

   # Check time sync status
   timedatectl status
   ```
2. Add clock skew tolerance:
   ```typescript
   jwt.verify(token, secret, {
     clockTolerance: 60  // Allow 60 seconds skew
   });
   ```

---

## Maintenance

### Token Cleanup Job

**Purpose**: Remove expired authorization codes and revoked tokens

```typescript
// Cron job (runs every hour)
import cron from 'node-cron';

cron.schedule('0 * * * *', async () => {
  // Clean expired authorization codes
  const deletedCodes = await AuthorizationCode.deleteMany({
    expiresAt: { $lt: new Date() }
  });

  // Clean expired revoked tokens
  // (TTL index handles this automatically, but manual cleanup is good practice)
  const deletedTokens = await RevokedToken.deleteMany({
    expiresAt: { $lt: new Date() }
  });

  logger.info('Token cleanup completed', {
    deletedCodes: deletedCodes.deletedCount,
    deletedTokens: deletedTokens.deletedCount
  });
});
```

### Secret Rotation

**When**: Every 90 days or after security incident

**Process**:
1. Generate new secret
2. Update both IdP and RP configurations
3. Restart all services simultaneously
4. Invalidate all existing tokens
5. Users must re-authenticate

```bash
# Generate new secret
openssl rand -base64 48

# Update .env files
vim product-management/backend-node/.env
vim prompt-management/backend/.env

# Restart services
pm2 restart product-management-backend
pm2 restart prompt-management-backend

# Revoke all tokens (optional)
mongo
> use product_management
> db.revoked_tokens.insertMany(
    db.users.find({}, { sessions: 1 })
      .flatMap(u => u.sessions.map(s => ({ jti: s.jti, expiresAt: new Date(s.exp * 1000) })))
  )
```

---

## Future Enhancements

1. **Multiple Client Support**: Register more clients dynamically
2. **OAuth Scopes**: Fine-grained permissions (`read:prompts`, `write:workflows`)
3. **Consent Screen**: User approves permissions before redirect
4. **Dynamic Client Registration**: Clients self-register via API
5. **Device Flow**: Support for CLI/IoT devices
6. **Multi-Factor Authentication**: TOTP/SMS before issuing tokens
7. **Session Management API**: View and revoke active sessions
8. **Admin Dashboard**: Manage clients, users, tokens
9. **SAML Support**: Enterprise SSO integration
10. **Passwordless Login**: WebAuthn/FIDO2 support

---

## References

- **OpenID Connect Core 1.0**: https://openid.net/specs/openid-connect-core-1_0.html
- **OAuth 2.0 RFC 6749**: https://tools.ietf.org/html/rfc6749
- **PKCE RFC 7636**: https://tools.ietf.org/html/rfc7636
- **Token Introspection RFC 7662**: https://tools.ietf.org/html/rfc7662
- **Token Revocation RFC 7009**: https://tools.ietf.org/html/rfc7009
- **JWKS RFC 7517**: https://tools.ietf.org/html/rfc7517
- **JWT RFC 7519**: https://tools.ietf.org/html/rfc7519

---

**Last Updated**: January 27, 2025  
**Version**: 2.0.0 (OIDC Implementation)  
**Author**: AI Services Platform Team
