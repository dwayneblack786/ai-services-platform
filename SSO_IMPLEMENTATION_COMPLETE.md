# 🔐 Keycloak Multi-Tenant SSO Architecture

## Overview

This platform uses **Keycloak** as the Identity Provider with **tenant-first authentication**. Each tenant has its own Keycloak realm, ensuring complete isolation. Users enter their tenant identifier first, then authenticate via Keycloak.

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                 KEYCLOAK (Port 9999)                         │
│              Multi-Tenant Identity Provider                  │
│                                                              │
│  Realms:                                                     │
│  • tenant-default (default realm)                           │
│  • tenant-acme-corp (Acme Corp users)                       │
│  • tenant-globex (Globex users)                             │
│                                                              │
│  Per-Realm Features:                                        │
│  • Username/password authentication                         │
│  • Google social login                                      │
│  • Microsoft social login                                   │
│  • JWT tokens (RSA256)                                      │
│  • JWKS endpoint                                            │
│  • OIDC Authorization Code + PKCE                           │
│                                                              │
│  Admin: http://localhost:9999/admin (admin/admin)           │
└─────────────────────────────────────────────────────────────┘
                    ↓                          ↓
        ┌───────────────────────┐  ┌───────────────────────┐
        │  PRODUCT-MANAGEMENT   │  │  PROMPT-MANAGEMENT    │
        │   (5000 BE / 5173 FE) │  │   (5001 BE / 3001 FE) │
        │                       │  │                       │
        │  Backend (Port 5000): │  │  Backend (Port 5001): │
        │  • POST /api/auth/    │  │  • POST /api/auth/    │
        │    tenant/lookup      │  │    tenant/lookup      │
        │  • GET /api/auth/     │  │  • GET /api/auth/     │
        │    tenant/login       │  │    tenant/login       │
        │  • GET /api/auth/     │  │  • GET /api/auth/     │
        │    tenant/callback    │  │    tenant/callback    │
        │  • GET /api/users/me  │  │  • GET /api/users/me  │
        │  • POST /api/usage/   │  │  • POST /api/usage/   │
        │    events             │  │    events             │
        │                       │  │                       │
        │  Frontend:            │  │  Frontend:            │
        │  • Tenant selection   │  │  • Tenant selection   │
        │  • Redirects to       │  │  • Redirects to       │
        │    Keycloak           │  │    Keycloak           │
        └───────────────────────┘  └───────────────────────┘
                    ↓                          ↓
        ┌───────────────────────────────────────────────────┐
        │           MONGODB (ai_platform)                   │
        │                                                   │
        │  Collections:                                     │
        │  • keycloak_tenants (tenant → realm mapping)     │
        │  • users (MongoDB-based RBAC + identity linking) │
        │  • usage_events (central usage tracking)         │
        └───────────────────────────────────────────────────┘
```

## User Flow

### First-Time Login (Tenant-First)

1. User visits **Product Management** (`http://localhost:5173`)
2. Frontend shows **tenant identifier form**
3. User enters tenant ID (e.g., "acme-corp")
4. Frontend sends POST to `/api/auth/tenant/lookup`
5. Backend looks up tenant → Returns Keycloak realm ("tenant-acme-corp")
6. Frontend redirects to `/api/auth/tenant/login?tenant=acme-corp`
7. Backend generates PKCE challenge, stores in session
8. Backend redirects to **Keycloak realm login**:
   ```
   http://localhost:9999/realms/tenant-acme-corp/protocol/openid-connect/auth
   ```
9. User sees **Keycloak login page** for "tenant-acme-corp"
10. User enters credentials or chooses Google/Microsoft login
11. Keycloak validates, redirects back with authorization code
12. Backend exchanges code for tokens (JWKS validation)
13. Backend performs **identity mapping**:
    - If user with `keycloakSub` exists → Load user
    - Else if email + tenant match → Link `keycloakSub` to existing user
    - Else → Create new user with Keycloak identity
14. Backend creates **session cookie** (connect.sid)
15. User is logged in!

### Cross-Site SSO (The Magic!)

1. User already logged into Product Management via Keycloak
2. User visits **Prompt Management** (`http://localhost:3001`)
3. Prompt Management checks session → Not authenticated
4. Frontend reads **tenant ID from localStorage** (stored during first login)
5. Frontend redirects to `/api/auth/tenant/login?tenant=acme-corp`
6. Backend redirects to Keycloak realm
7. Keycloak sees **existing browser session** → Returns authorization code
8. Prompt Management exchanges code, maps identity, creates session
9. **User is automatically logged in** (no credentials required!)

**Note:** If user clears localStorage, they must re-enter tenant ID (but still SSO via Keycloak)

### Logout

**Local Logout** (destroys app session only):
```typescript
await apiClient.post('/api/auth/logout');
// Destroys connect.sid session
// Keycloak session remains active
// User can still SSO into other apps
```

**Global Logout** (destroys Keycloak session):
```typescript
window.location.href = 'http://localhost:9999/realms/tenant-acme-corp/protocol/openid-connect/logout?redirect_uri=http://localhost:5173';
// Destroys Keycloak session
// All apps require fresh login
```

## Technical Implementation

### Identity Mapping

Each user has a stable identity managed by Keycloak:

```typescript
{
  _id: ObjectId,
  email: "user@example.com",
  firstName: "John",
  lastName: "Doe",
  keycloakSub: "uuid-from-keycloak-sub-claim", // Primary identifier
  tenantId: "acme-corp",
  role: "user",                                // MongoDB role
  permissions: ["read:products", "write:products"],
  subscriptions: [/* subscription IDs */],
  isActive: true,
  createdAt: Date,
  updatedAt: Date
}
```

**Identity Mapping Rules (in `mapKeycloakIdentityToUser`):**

1. **Find by Keycloak Sub:**
   - If user with `keycloakSub` exists → Return user
   
2. **Link by Email + Tenant:**
   - If user with same email + tenantId exists (but no `keycloakSub`)
   - Link `keycloakSub` to existing user → Return user
   
3. **Create New User:**
   - If no match found → Create new user with Keycloak identity

### Tenant Lookup

Tenants are stored in MongoDB with Keycloak realm mapping:

```typescript
{
  _id: ObjectId,
  tenantId: "acme-corp",           // Primary identifier
  name: "Acme Corporation",
  domain: "acme.example.com",
  aliases: ["acme", "acme-corp"],  // Alternative lookup values
  keycloakRealm: "tenant-acme-corp", // Keycloak realm name
  settings: {
    theme: "default",
    features: ["usage-tracking"]
  },
  isActive: true
}
```

**Lookup Strategy:**
- POST `/api/auth/tenant/lookup` with `{ "identifier": "acme-corp" }`
- Backend searches: tenantId → domain → aliases
- Returns: `{ "tenantId": "acme-corp", "keycloakRealm": "tenant-acme-corp" }`

### Session Management

**Keycloak:**
- Browser session cookie (SSO session)
- Shared across all realms in same browser
- Enables cross-app SSO

**Product Management:**
- Cookie: `connect.sid`
- Stores: userId, tenantId, keycloakSub, accessToken, idToken, refreshToken
- Expires when token expires or manual logout

**Prompt Management:**
- Cookie: `connect.sid`
- Same structure as Product Management
- Independent session per app

### Token Flow

1. **Authorization Code**: One-time code from Keycloak (10 min TTL)
2. **ID Token**: JWT containing user identity (15 min TTL)
   ```json
   {
     "sub": "uuid-from-keycloak",
     "email": "user@example.com",
     "email_verified": true,
     "given_name": "John",
     "family_name": "Doe",
     "preferred_username": "john.doe",
     "azp": "product-management",
     "iss": "http://localhost:9999/realms/tenant-acme-corp",
     "aud": "product-management",
     "exp": 1706400000
   }
   ```
3. **Access Token**: JWT for API access (15 min TTL)
4. **Refresh Token**: Long-lived token to refresh access tokens (30 days TTL)

### PKCE (Proof Key for Code Exchange)

Protects against authorization code interception:

1. Client generates `codeVerifier` (random 43-128 char string)
2. Computes `codeChallenge` = BASE64URL(SHA256(codeVerifier))
3. Sends `codeChallenge` to Keycloak `/auth` endpoint
4. Keycloak stores challenge with authorization code
5. Client sends `codeVerifier` to `/token` endpoint
6. Keycloak verifies: SHA256(codeVerifier) == stored challenge
7. Only if match, returns tokens

## Files Created/Modified

### New Files Created

**Models:**
- `backend-node/src/models/KeycloakTenant.ts` - Tenant model with realm mapping
- `backend-node/src/models/UsageEvent.ts` - Usage tracking schema
- `backend-node/src/models/User.ts` - Updated with keycloakSub field

**Services:**
- `backend-node/src/services/tenant.service.ts` - Tenant lookup and identity mapping

**Routes:**
- `backend-node/src/routes/tenant-auth.ts` - Tenant-first authentication flow
- `backend-node/src/routes/user-profile.ts` - User profile API with RBAC
- `backend-node/src/routes/usage.ts` - Usage collection hub

**Middleware:**
- `backend-node/src/middleware/keycloak-auth.ts` - Keycloak authentication middleware

**Scripts:**
- `scripts/keycloak/seed-tenants.ts` - Seed sample tenants
- `scripts/keycloak/setup-keycloak.ps1` - Create Keycloak realms

**Documentation:**
- `docs/TENANT_FIRST_LOGIN_FLOW.md` - Complete tenant-first flow guide
- `docs/KEYCLOAK_INTEGRATION_COMPLETE.md` - Integration steps

### Modified Files

**Product Management:**
- `backend-node/src/routes/subscriptions-routes.ts` - Updated to use Keycloak auth
- `backend-node/.env` - Added Keycloak configuration

**Scripts:**
- `start-sso-services.ps1` - Updated to check Keycloak
- `start-sso-system.ps1` - Updated to Keycloak architecture

## Environment Configuration

### Keycloak
```bash
# Admin Console
URL=http://localhost:9999/admin
Username=admin
Password=admin

# Realms
- tenant-default (fallback realm)
- tenant-acme-corp (Acme Corp)
- tenant-globex (Globex)
```

### Product Management (.env)
```bash
# Keycloak Configuration
KEYCLOAK_URL=http://localhost:9999
KEYCLOAK_DEFAULT_REALM=tenant-default

# MongoDB
MONGODB_URI=mongodb://localhost:27017/ai_platform

# Session
SESSION_SECRET=your-session-secret-change-in-production
SESSION_NAME=connect.sid

# CORS
APP_URL=http://localhost:5173
```

### Prompt Management (.env)
```bash
# Keycloak Configuration
KEYCLOAK_URL=http://localhost:9999
KEYCLOAK_DEFAULT_REALM=tenant-default

# MongoDB
MONGODB_URI=mongodb://localhost:27017/ai_platform

# Session
SESSION_SECRET=your-session-secret-change-in-production
SESSION_NAME=connect.sid

# CORS
APP_URL=http://localhost:3001
```

## Starting the System

### Prerequisites
1. **Start Keycloak:**
   ```powershell
   # Download Keycloak 23.0.0+
   cd keycloak-23.0.0
   .\bin\kc.bat start-dev --http-port=9999
   ```

2. **Seed Tenants:**
   ```powershell
   cd product-management/backend-node
   npx ts-node scripts/keycloak/seed-tenants.ts
   ```

3. **Create Keycloak Realms:**
   ```powershell
   .\scripts\keycloak\setup-keycloak.ps1 -RealmName "tenant-acme-corp"
   .\scripts\keycloak\setup-keycloak.ps1 -RealmName "tenant-globex"
   ```

### Automated Startup (Recommended)
```powershell
.\start-sso-system.ps1
```

### Manual Startup
```powershell
# 1. Start Product Management Backend
cd product-management/backend-node
npm run dev

# 2. Start Prompt Management Backend
cd prompt-management/backend
npm run dev

# 3. Start Product Management Frontend
cd product-management/frontend
npm run dev

# 4. Start Prompt Management Frontend
cd prompt-management/frontend
npm run dev
```

## Testing

### 1. Test Tenant Lookup
```bash
curl -X POST http://localhost:5000/api/auth/tenant/lookup \
  -H "Content-Type: application/json" \
  -d '{"identifier": "acme-corp"}'

# Expected Response:
{
  "tenantId": "acme-corp",
  "keycloakRealm": "tenant-acme-corp"
}
```

### 2. Test Tenant-First Login Flow
1. Visit `http://localhost:5173`
2. Enter tenant identifier: "acme-corp"
3. Should redirect to: `http://localhost:9999/realms/tenant-acme-corp/protocol/openid-connect/auth`
4. Login with test user:
   - Username: testuser@example.com
   - Password: Test123!
5. Should redirect back to Product Management, logged in

### 3. Test User Profile API
```bash
curl http://localhost:5000/api/users/me \
  -H "Cookie: connect.sid=<session-cookie>"

# Expected Response:
{
  "user_id": "507f1f77bcf86cd799439011",
  "tenant_id": "acme-corp",
  "email": "testuser@example.com",
  "firstName": "Test",
  "lastName": "User",
  "role": "user",
  "permissions": ["read:products", "write:products"],
  "subscriptions": [],
  "feature_flags": {},
  "usage_limits": { "requests_per_day": 1000 }
}
```

### 4. Test Cross-Site SSO
1. Ensure logged into Product Management
2. Visit `http://localhost:3001` (Prompt Management)
3. Enter tenant identifier: "acme-corp"
4. Should **auto-login via Keycloak** without entering credentials
5. Success! SSO working!

### 5. Test Usage Tracking
```bash
curl -X POST http://localhost:5000/api/usage/events \
  -H "Content-Type: application/json" \
  -H "Cookie: connect.sid=<session-cookie>" \
  -d '{
    "eventType": "api_call",
    "resourceType": "subscription",
    "operation": "read",
    "quantity": 1
  }'
```

## Security Considerations

✅ **Implemented:**
- PKCE protection against code interception
- HttpOnly cookies prevent XSS attacks
- Secure session management
- RSA-256 JWT signing by Keycloak
- State parameter prevents CSRF
- Token expiration (15 min access, 30 days refresh)
- Authorization code single-use only
- Tenant isolation via separate Keycloak realms
- JWKS-based token validation

⚠️ **Production Requirements:**
- Use HTTPS everywhere
- Store secrets in secure vault (Azure Key Vault, AWS Secrets Manager)
- Enable Redis for session storage (distributed sessions)
- Implement rate limiting on auth endpoints
- Add monitoring and alerting
- Regular security audits
- Multi-factor authentication (MFA) in Keycloak
- Configure Keycloak with production database (PostgreSQL)
- Set up Keycloak clustering for high availability

## Troubleshooting

### "Tenant not found" Error
**Symptom:** POST /tenant/lookup returns 404
**Solution:** 
- Run seed script: `npx ts-node scripts/keycloak/seed-tenants.ts`
- Verify tenant exists in MongoDB `keycloak_tenants` collection

### "Invalid realm" Error
**Symptom:** Keycloak returns 404 on /auth endpoint
**Solution:**
- Create realm in Keycloak: `.\scripts\keycloak\setup-keycloak.ps1 -RealmName "tenant-acme-corp"`
- Verify realm exists in Keycloak Admin Console

### "Invalid State" Error
**Symptom:** Callback fails with invalid_state
**Solution:** PKCE entry expired (>10 min). Try logging in again.

### User Created Multiple Times
**Symptom:** Duplicate users with same email
**Solution:** Check identity mapping logic in `mapKeycloakIdentityToUser`

### Cookies Not Being Set
**Symptom:** No session persistence
**Solution:** 
- Check CORS credentials: true
- Verify domain matches (no cross-domain cookies)
- Check browser settings (allow cookies)

### Token Expired
**Symptom:** 401 errors after 15 minutes
**Solution:** Implement refresh token flow or re-authenticate

## Database Schema

### keycloak_tenants Collection
```javascript
{
  _id: ObjectId,
  tenantId: String,            // unique, indexed
  name: String,
  domain: String,              // unique, indexed
  aliases: [String],           // indexed
  keycloakRealm: String,       // Keycloak realm name
  settings: Object,
  isActive: Boolean,
  createdAt: Date,
  updatedAt: Date
}
```

### users Collection
```javascript
{
  _id: ObjectId,
  email: String,               // indexed with tenantId
  firstName: String,
  lastName: String,
  keycloakSub: String,        // unique, indexed (Keycloak subject)
  tenantId: String,           // indexed
  role: String,               // user, admin, etc.
  permissions: [String],      // derived from role
  subscriptions: [ObjectId],  // references
  isActive: Boolean,
  createdAt: Date,
  updatedAt: Date
}
```

### usage_events Collection
```javascript
{
  _id: ObjectId,
  userId: ObjectId,           // reference to users
  tenantId: String,
  eventType: String,          // api_call, feature_usage, etc.
  resourceType: String,
  operation: String,
  quantity: Number,
  metadata: Object,
  timestamp: Date
}
```

## Next Steps

- [ ] Implement refresh token flow
- [ ] Add MFA support in Keycloak
- [ ] Implement frontend tenant selection UI
- [ ] Migrate remaining routes to `requireKeycloakAuth`
- [ ] Add user profile management
- [ ] Implement advanced RBAC policies
- [ ] Add audit logging
- [ ] Implement session timeout
- [ ] Add brute force protection (Keycloak built-in)
- [ ] Set up Keycloak with PostgreSQL
- [ ] Configure social login (Google, Microsoft)

## Support

For issues or questions, check:
1. Browser console for frontend errors
2. Keycloak Admin Console for realm configuration
3. Backend terminals for callback errors
4. MongoDB for tenant and user data
5. Documentation: `docs/KEYCLOAK_INTEGRATION_COMPLETE.md`
│              Central Identity Provider (IdP)                 │
│                                                              │
│  • Single login page for entire platform                    │
│  • OIDC Authorization Code + PKCE flow                      │
│  • RSA-256 JWT signing with JWKS                            │
│  • IdP session cookie (auth_service.sid)                    │
│  • Endpoints:                                               │
│    - /login (HTML login page)                               │
│    - /register (user registration)                          │
│    - /authorize (OIDC authorization)                        │
│    - /token (token exchange)                                │
│    - /userinfo (user profile)                               │
│    - /logout (IdP logout)                                   │
│    - /.well-known/openid-configuration                      │
│    - /.well-known/jwks.json                                 │
└─────────────────────────────────────────────────────────────┘
                    ↓                          ↓
        ┌───────────────────────┐  ┌───────────────────────┐
        │  PRODUCT-MANAGEMENT   │  │  PROMPT-MANAGEMENT    │
        │   (5000 BE / 5173 FE) │  │   (5001 BE / 3001 FE) │
        │                       │  │                       │
        │  Backend (Port 5000): │  │  Backend (Port 5001): │
        │  • /api/auth/sso/     │  │  • /api/auth/sso/     │
        │    login              │  │    login              │
        │  • /api/auth/sso/     │  │  • /api/auth/sso/     │
        │    callback           │  │    callback           │
        │  • /api/auth/sso/     │  │  • /api/auth/sso/     │
        │    logout             │  │    logout             │
        │  • /api/auth/sso/     │  │  • /api/auth/sso/     │
        │    status             │  │    status             │
        │                       │  │                       │
        │  Frontend:            │  │  Frontend:            │
        │  • No login form      │  │  • No login form      │
        │  • Redirects to IdP   │  │  • Redirects to IdP   │
        │  • Silent auth check  │  │  • Silent auth check  │
        └───────────────────────┘  └───────────────────────┘
```

## User Flow

### First-Time Login

1. User visits **Product Management** (`http://localhost:5173`)
2. Frontend attempts **silent authentication** (`prompt=none`)
3. Backend redirects to `auth-service/authorize?prompt=none`
4. No IdP session exists → Returns `login_required` error
5. Frontend redirects to explicit login (`prompt=login`)
6. User sees **Auth Service login page** (`http://localhost:4000/login`)
7. User enters credentials
8. Auth Service validates, creates **IdP session cookie**
9. Redirects back with authorization code
10. Product Management exchanges code for tokens
11. Product Management creates **local session**
12. User is logged in!

### Cross-Site SSO (The Magic!)

1. User already logged into Product Management
2. User visits **Prompt Management** (`http://localhost:3001`)
3. Prompt Management attempts **silent authentication**
4. Auth Service sees **IdP session cookie** → Returns authorization code
5. Prompt Management exchanges code, creates local session
6. **User is automatically logged in** (no credentials required!)

### Logout

**Local Logout** (preserves IdP session):
```typescript
await apiClient.post('/api/auth/sso/logout', { idpLogout: false });
// Destroys local session only
// User can still SSO into other apps
```

**Global Logout** (destroys all sessions):
```typescript
await apiClient.post('/api/auth/sso/logout', { idpLogout: true });
// Destroys local session
// Redirects to IdP logout
// Destroys IdP session
// All apps require fresh login
```

## Technical Implementation

### Identity Mapping

Each user has a stable identity managed by the IdP:

```typescript
{
  sub: "uuid-generated-by-idp",        // Primary identifier
  email: "user@example.com",            // Email (can change)
  idpSub: "uuid-generated-by-idp",     // IdP subject (local copy)
  idpIssuer: "http://localhost:4000",  // IdP issuer
  firstName: "John",
  lastName: "Doe",
  emailVerified: true,
  role: "USER",
  isActive: true
}
```

**Just-in-Time (JIT) Provisioning:**
- When a user logs in for the first time to Product/Prompt Management
- Backend checks if user exists by `idpSub`
- If not, creates new user with data from ID token
- No duplicate users across services

### Session Management

**Auth Service (IdP):**
- Cookie: `auth_service.sid`
- Secure, HttpOnly, SameSite=Lax
- Contains user session
- Used for silent authentication

**Product Management:**
- Cookie: `connect.sid` (or custom name)
- Stores: userId, idpSub, accessToken, tokenExpiry
- Expires when token expires or manual logout

**Prompt Management:**
- Cookie: `connect.sid` (or custom name)
- Same structure as Product Management
- Independent session per app

### Token Flow

1. **Authorization Code**: One-time code from IdP (10 min TTL)
2. **ID Token**: JWT containing user identity (1 hour TTL)
   ```json
   {
     "sub": "user-uuid",
     "email": "user@example.com",
     "email_verified": true,
     "name": "John Doe",
     "given_name": "John",
     "family_name": "Doe",
     "aud": "product-management",
     "iss": "http://localhost:4000",
     "exp": 1706400000
   }
   ```
3. **Access Token**: JWT for API access (1 hour TTL)

### PKCE (Proof Key for Code Exchange)

Protects against authorization code interception:

1. Client generates `codeVerifier` (random 32-byte string)
2. Computes `codeChallenge` = BASE64URL(SHA256(codeVerifier))
3. Sends `codeChallenge` to `/authorize`
4. IdP stores challenge with authorization code
5. Client sends `codeVerifier` to `/token`
6. IdP verifies: SHA256(codeVerifier) == stored challenge
7. Only if match, returns tokens

## Files Changed

### New Files Created

**Auth-Service:**
- `src/utils/jwks.ts` - JWKS keypair generation, JWT signing/verification

**Shared:**
- `shared/sso-client.ts` - Reusable SSO utilities for clients

**Prompt Management:**
- `backend/src/routes/sso.ts` - SSO routes
- `frontend/src/pages/LoginPage.tsx` - SSO-only login page (replaced)

**Scripts:**
- `start-sso-system.ps1` - Startup script for all services

### Modified Files

**Auth-Service:**
- `src/index.ts` - Added JWKS initialization, IdP logout endpoint
- `src/routes/oidc.ts` - Updated to use JWKS functions
- `.env` - Updated MongoDB to ai_platform

**Product Management:**
- `frontend/src/pages/Login.tsx` - Removed local login, added SSO redirect
- `frontend/src/context/AuthContext.tsx` - Updated to use SSO endpoints
- `backend-node/.env` - Added IdP configuration

**Prompt Management:**
- `backend/src/index.ts` - Added SSO routes
- `backend/.env` - Added IdP configuration

## Environment Configuration

### Auth-Service (.env)
```bash
PORT=4000
MONGODB_URI=mongodb://localhost:27017/ai_platform
OIDC_ISSUER=http://localhost:4000
SESSION_SECRET=auth-service-dev-session-secret-key-minimum-32-chars-required

# Registered Clients
CLIENT_PRODUCT_MANAGEMENT_ID=product-management
CLIENT_PRODUCT_MANAGEMENT_SECRET=product-mgmt-secret-change-in-production
CLIENT_PRODUCT_MANAGEMENT_REDIRECTS=http://localhost:5000/api/auth/sso/callback

CLIENT_PROMPT_MANAGEMENT_ID=prompt-management
CLIENT_PROMPT_MANAGEMENT_SECRET=prompt-mgmt-secret-change-in-production
CLIENT_PROMPT_MANAGEMENT_REDIRECTS=http://localhost:3001/api/auth/sso/callback
```

### Product Management (.env)
```bash
IDP_ISSUER=http://localhost:4000
IDP_CLIENT_ID=product-management
IDP_CLIENT_SECRET=product-mgmt-secret-change-in-production
IDP_REDIRECT_URI=http://localhost:5000/api/auth/sso/callback
APP_URL=http://localhost:5173
```

### Prompt Management (.env)
```bash
IDP_ISSUER=http://localhost:4000
IDP_CLIENT_ID=prompt-management
IDP_CLIENT_SECRET=prompt-mgmt-secret-change-in-production
IDP_REDIRECT_URI=http://localhost:3001/api/auth/sso/callback
APP_URL=http://localhost:3001
```

## Starting the System

### Automated (Recommended)
```powershell
.\start-sso-system.ps1
```

### Manual
```powershell
# 1. Start Auth Service
cd auth-service
npm start

# 2. Start Product Management Backend
cd product-management/backend-node
npm run dev

# 3. Start Prompt Management Backend
cd prompt-management/backend
npm run dev

# 4. Start Product Management Frontend
cd product-management/frontend
npm run dev

# 5. Start Prompt Management Frontend
cd prompt-management/frontend
npm run dev
```

## Testing

### 1. Register a New User
```
http://localhost:4000/register
```
- Email: test@example.com
- Password: password123
- First Name: Test
- Last Name: User

### 2. Test Product Management Login
```
http://localhost:5173
```
- Click "Sign In"
- Should redirect to `http://localhost:4000/login`
- Enter credentials
- Should redirect back to Product Management, logged in

### 3. Test Cross-Site SSO
```
http://localhost:3001
```
- Should automatically log you in
- **No credentials required!** (This is SSO working!)

### 4. Test Logout
- Logout from one app
- Check if other app still has session
- Test global logout to destroy all sessions

## Security Considerations

✅ **Implemented:**
- PKCE protection against code interception
- HttpOnly cookies prevent XSS attacks
- Secure session management
- RSA-256 JWT signing
- State parameter prevents CSRF
- Token expiration (1 hour)
- Authorization code single-use only

⚠️ **Production Requirements:**
- Use HTTPS everywhere
- Store secrets in secure vault (Azure Key Vault, AWS Secrets Manager)
- Enable Redis for session storage (distributed sessions)
- Implement rate limiting on auth endpoints
- Add monitoring and alerting
- Regular security audits
- Multi-factor authentication (MFA)

## Troubleshooting

### Silent Auth Fails Immediately
**Symptom:** Redirected to login without attempting silent auth
**Solution:** Clear sessionStorage: `sessionStorage.clear()`

### "Invalid State" Error
**Symptom:** Callback fails with invalid_state
**Solution:** PKCE entry expired (>10 min). Try logging in again.

### User Not Found After Login
**Symptom:** Login succeeds but app shows error
**Solution:** Check IdP sub claim matches database idpSub field

### Cookies Not Being Set
**Symptom:** No session persistence
**Solution:** 
- Check CORS credentials: true
- Verify domain matches (no cross-domain cookies)
- Check browser settings (allow cookies)

### Token Expired
**Symptom:** 401 errors after 1 hour
**Solution:** Implement token refresh or re-authenticate

## Database Schema

### Users Collection (ai_platform database)
```javascript
{
  _id: ObjectId,
  email: String,              // unique, indexed
  passwordHash: String,       // for local IdP users
  firstName: String,
  lastName: String,
  emailVerified: Boolean,
  idpSub: String,            // IdP subject (unique)
  idpIssuer: String,         // IdP issuer URL
  role: String,              // USER, ADMIN, etc.
  isActive: Boolean,
  createdAt: Date,
  updatedAt: Date,
  lastLogin: Date
}
```

## Next Steps

- [ ] Implement token refresh
- [ ] Add MFA support
- [ ] Implement remember me
- [ ] Add user profile management
- [ ] Implement role-based access control (RBAC)
- [ ] Add audit logging
- [ ] Implement session timeout
- [ ] Add brute force protection

## Support

For issues or questions, check:
1. Browser console for frontend errors
2. Auth-service terminal for IdP logs
3. Backend terminals for callback errors
4. MongoDB for user data issues
