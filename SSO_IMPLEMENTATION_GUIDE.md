# Keycloak Multi-Tenant SSO Implementation Guide

## Overview
This guide documents the implementation of Keycloak-based multi-tenant authentication with tenant-first login flow. Each tenant has its own Keycloak realm, providing complete isolation.

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                      KEYCLOAK (IdP)                              │
│                     localhost:9999                               │
│                                                                   │
│  Realms:                                                         │
│  • tenant-default (default realm)                               │
│  • tenant-acme-corp (Acme Corp users)                           │
│  • tenant-globex (Globex users)                                 │
│                                                                   │
│  Features:                                                       │
│  • Username/password authentication                             │
│  • Social login (Google, Microsoft)                             │
│  • JWT tokens (RSA256)                                          │
│  • OIDC Authorization Code + PKCE                               │
│  • Session management (SSO across realms)                       │
│  • JWKS endpoint per realm                                      │
└─────────────────────────────────────────────────────────────────┘
                              │
                              │ OIDC Authorization Code + PKCE
                              │
                ┌─────────────┴─────────────┐
                │                           │
                ▼                           ▼
┌───────────────────────────┐ ┌───────────────────────────┐
│ product-management (RP)   │ │ prompt-management (RP)    │
│ localhost:5000            │ │ localhost:5001            │
│                           │ │                           │
│ - POST /auth/tenant/      │ │ - POST /auth/tenant/      │
│   lookup                  │ │   lookup                  │
│ - GET /auth/tenant/login  │ │ - GET /auth/tenant/login  │
│ - GET /auth/tenant/       │ │ - GET /auth/tenant/       │
│   callback                │ │   callback                │
│ - GET /users/me (RBAC)    │ │ - GET /users/me (RBAC)    │
│ - POST /usage/events      │ │ - POST /usage/events      │
│ - Identity Mapping        │ │ - Identity Mapping        │
│   (keycloakSub)           │ │   (keycloakSub)           │
│ - Local Session           │ │ - Local Session           │
│ - MongoDB (System of      │ │ - MongoDB (System of      │
│   Record)                 │ │   Record)                 │
└───────────────────────────┘ └───────────────────────────┘
                              │
                              │
                              ▼
                ┌─────────────────────────┐
                │  MONGODB (ai_platform)  │
                │                         │
                │  • keycloak_tenants     │
                │  • users (keycloakSub)  │
                │  • usage_events         │
                └─────────────────────────┘
```

## Implementation Steps

### ✅ Step 1: Install and Configure Keycloak - COMPLETED
- [x] Download Keycloak 23.0.0+
- [x] Start on port 9999: `kc.bat start-dev --http-port=9999`
- [x] Access admin console: http://localhost:9999/admin (admin/admin)

### ✅ Step 2: Create MongoDB Models - COMPLETED
- [x] `KeycloakTenant.ts` - Tenant model with realm mapping
- [x] `User.ts` - Updated with keycloakSub field
- [x] `UsageEvent.ts` - Usage tracking schema

### ✅ Step 3: Implement Tenant Service - COMPLETED
**File**: `product-management/backend-node/src/services/tenant.service.ts`

Features implemented:
- [x] `lookupTenant()` - Multi-strategy tenant lookup (ID, domain, aliases)
- [x] `mapKeycloakIdentityToUser()` - 3-rule identity mapping:
  1. Find by keycloakSub → Return user
  2. Link by email + tenant → Update keycloakSub
  3. Create new user → With Keycloak identity

### ✅ Step 4: Implement Tenant-First Auth Routes - COMPLETED
**File**: `product-management/backend-node/src/routes/tenant-auth.ts`

Routes implemented:
- [x] POST `/api/auth/tenant/lookup` - Tenant lookup
- [x] GET `/api/auth/tenant/login` - Initiate tenant-specific login
- [x] GET `/api/auth/tenant/callback` - OAuth callback handler

Flow:
1. User enters tenant identifier
2. Backend looks up Keycloak realm
3. Redirects to realm-specific Keycloak login
4. Keycloak redirects back with code
5. Backend exchanges code for tokens (JWKS validation)
6. Backend maps identity to MongoDB user
7. Session created

### ✅ Step 5: Implement User Profile API - COMPLETED
**File**: `product-management/backend-node/src/routes/user-profile.ts`

Route implemented:
- [x] GET `/api/users/me` - Returns MongoDB-based RBAC data

Response includes:
- user_id, tenant_id, email
- role (from MongoDB)
- permissions (computed from role)
- subscriptions (from MongoDB)
- feature_flags, usage_limits

### ✅ Step 6: Implement Usage Collection - COMPLETED
**File**: `product-management/backend-node/src/routes/usage.ts`

Routes implemented:
- [x] POST `/api/usage/events` - Ingest usage events
- [x] GET `/api/usage/summary` - Usage analytics

Features:
- Validates tenant and user existence
- Stores in central MongoDB collection
- Supports aggregation queries

### ✅ Step 7: Implement Keycloak Auth Middleware - COMPLETED
**File**: `product-management/backend-node/src/middleware/keycloak-auth.ts`

Middleware implemented:
- [x] `requireKeycloakAuth` - Validates Keycloak tokens via JWKS
- [x] `optionalKeycloakAuth` - Optional authentication
- [x] `trackUsage` - Usage tracking wrapper
- [x] `trackRouteUsage` - Auto-track route usage

Features:
- JWKS-based token validation
- Loads user from MongoDB by keycloakSub
- Attaches user to request object
- Automatic usage tracking

### ✅ Step 8: Migrate Routes to Keycloak Auth - COMPLETED
**Files Updated:**
- [x] `subscriptions-routes.ts` - Uses `requireKeycloakAuth` and `trackUsage`

Pattern:
```typescript
router.get('/active', requireKeycloakAuth, trackUsage('subscription', 'read'), async (req, res) => {
  // Route handler
});
```

### ✅ Step 9: Create Setup Scripts - COMPLETED
- [x] `scripts/keycloak/seed-tenants.ts` - Seeds sample tenants
- [x] `scripts/keycloak/setup-keycloak.ps1` - Creates Keycloak realms

### ✅ Step 10: Update Startup Scripts - COMPLETED
- [x] `start-sso-services.ps1` - Updated to check Keycloak
- [x] `start-sso-system.ps1` - Updated to Keycloak architecture

## Configuration

### Keycloak Setup

#### 1. Create Realm
```powershell
.\scripts\keycloak\setup-keycloak.ps1 -RealmName "tenant-acme-corp"
```

#### 2. Create OIDC Client
In Keycloak Admin Console:
- Client ID: `product-management`
- Client Protocol: `openid-connect`
- Access Type: `confidential`
- Valid Redirect URIs: `http://localhost:5000/api/auth/tenant/callback`
- Web Origins: `http://localhost:5173`

#### 3. Get Client Secret
- Go to Credentials tab
- Copy Client Secret

### Environment Configuration

#### Product Management (.env)
```bash
# Keycloak
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

#### Prompt Management (.env)
```bash
# Keycloak
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

## Testing

### 1. Seed Tenants
```powershell
cd product-management/backend-node
npx ts-node scripts/keycloak/seed-tenants.ts
```

### 2. Create Keycloak Realms
```powershell
.\scripts\keycloak\setup-keycloak.ps1 -RealmName "tenant-acme-corp"
.\scripts\keycloak\setup-keycloak.ps1 -RealmName "tenant-globex"
```

### 3. Test Tenant Lookup
```bash
curl -X POST http://localhost:5000/api/auth/tenant/lookup \
  -H "Content-Type: application/json" \
  -d '{"identifier": "acme-corp"}'
```

Expected:
```json
{
  "tenantId": "acme-corp",
  "keycloakRealm": "tenant-acme-corp"
}
```

### 4. Test Login Flow
1. Visit http://localhost:5173
2. Enter tenant: "acme-corp"
3. Redirects to Keycloak
4. Login with: testuser@example.com / Test123!
5. Redirects back, logged in

### 5. Test User Profile
```bash
curl http://localhost:5000/api/users/me \
  -H "Cookie: connect.sid=<session-cookie>"
```

Expected:
```json
{
  "user_id": "507f1f77bcf86cd799439011",
  "tenant_id": "acme-corp",
  "role": "user",
  "permissions": ["read:products"],
  "subscriptions": []
}
```

### 6. Test Cross-Site SSO
1. Login to Product Management
2. Visit Prompt Management (http://localhost:3001)
3. Enter tenant: "acme-corp"
4. Should auto-login via Keycloak SSO

## Identity Mapping Logic

### Rule 1: Find by Keycloak Sub
```typescript
const user = await User.findOne({ keycloakSub: sub });
if (user) return user;
```

### Rule 2: Link by Email + Tenant
```typescript
const existingUser = await User.findOne({ email, tenantId });
if (existingUser) {
  existingUser.keycloakSub = sub;
  existingUser.firstName = given_name;
  existingUser.lastName = family_name;
  await existingUser.save();
  return existingUser;
}
```

### Rule 3: Create New User
```typescript
const newUser = await User.create({
  email,
  keycloakSub: sub,
  tenantId,
  firstName: given_name,
  lastName: family_name,
  role: 'user',
  isActive: true
});
return newUser;
```

## Migration Path

### For Existing Users
Run migration script to link Keycloak identities:

```typescript
// scripts/keycloak/migrate-users.ts
const users = await User.find({ keycloakSub: { $exists: false } });

for (const user of users) {
  // Lookup user in Keycloak by email
  const keycloakUser = await keycloakAdmin.users.find({ email: user.email });
  
  if (keycloakUser.length === 1) {
    user.keycloakSub = keycloakUser[0].id;
    await user.save();
    console.log(`Linked user ${user.email} to Keycloak`);
  }
}
```

## Next Steps

### Remaining Work
- [ ] Migrate all routes to `requireKeycloakAuth`
- [ ] Implement frontend tenant selection UI
- [ ] Add refresh token flow
- [ ] Configure social login in Keycloak
- [ ] Set up MFA in Keycloak
- [ ] Implement advanced RBAC policies
- [ ] Add user profile management UI
- [ ] Set up Keycloak with PostgreSQL (production)

### Frontend Implementation
1. **Tenant Selection Component:**
   ```tsx
   const [tenant, setTenant] = useState('');
   
   const handleLogin = async () => {
     const response = await fetch('/api/auth/tenant/lookup', {
       method: 'POST',
       body: JSON.stringify({ identifier: tenant })
     });
     
     if (response.ok) {
       localStorage.setItem('tenantId', tenant);
       window.location.href = `/api/auth/tenant/login?tenant=${tenant}`;
     }
   };
   ```

2. **Auto-Login on Subsequent Visits:**
   ```tsx
   useEffect(() => {
     const tenantId = localStorage.getItem('tenantId');
     if (tenantId && !user) {
       // Attempt SSO
       window.location.href = `/api/auth/tenant/login?tenant=${tenantId}`;
     }
   }, [user]);
   ```

## Support

For implementation details, see:
- [KEYCLOAK_INTEGRATION_COMPLETE.md](./docs/KEYCLOAK_INTEGRATION_COMPLETE.md)
- [TENANT_FIRST_LOGIN_FLOW.md](./docs/TENANT_FIRST_LOGIN_FLOW.md)
- [SSO_IMPLEMENTATION_COMPLETE.md](./SSO_IMPLEMENTATION_COMPLETE.md)
│                     localhost:4000                               │
│                                                                   │
│  - User Authentication (local + OAuth)                           │
│  - OIDC Endpoints (/authorize, /token, /userinfo)                │
│  - Session Management (global cookie: auth_service.sid)          │
│  - User Database (MongoDB - users collection)                    │
│  - Sub-based identity (stable, unique identifier)                │
└─────────────────────────────────────────────────────────────────┘
                              │
                              │ OIDC Authorization Code + PKCE
                              │
                ┌─────────────┴─────────────┐
                │                           │
                ▼                           ▼
┌───────────────────────────┐ ┌───────────────────────────┐
│ product-management (RP)   │ │ prompt-management (RP)    │
│ localhost:5000            │ │ localhost:5001            │
│                           │ │                           │
│ - /auth/sso/login         │ │ - /auth/sso/login         │
│ - /auth/sso/callback      │ │ - /auth/sso/callback      │
│ - Identity Mapping (sub)  │ │ - Identity Mapping (sub)  │
│ - Local Session           │ │ - Local Session           │
│ - Local User DB           │ │ - Local User DB           │
└───────────────────────────┘ └───────────────────────────┘
```

## Implementation Steps

### ✅ Step 1: Create auth-service (IdP) - COMPLETED
- [x] Project structure created
- [x] User model with `sub` field
- [x] OIDC endpoints implemented:
  - [x] GET `/.well-known/openid-configuration`
  - [x] GET `/.well-known/jwks.json`
  - [x] GET `/authorize` (with `prompt=none` support)
  - [x] POST `/token`
  - [x] GET `/userinfo`
- [x] Local authentication (username/password)
- [x] OAuth integration (Google) - optional
- [x] Session management with passport
- [x] PKCE verification
- [x] Client registration (product-management, prompt-management)

### Step 2: Update Product Management to RP/SP

#### 2.1: Add Sub-based Identity Mapping
**File**: `product-management/backend-node/src/models/User.ts`

Add field:
```typescript
oidcSub?: string; // Maps to IdP's sub claim for SSO users
```

Add index:
```typescript
UserSchema.index({ oidcSub: 1 }, { sparse: true, unique: true });
```

#### 2.2: Create SSO Routes
**File**: `product-management/backend-node/src/routes/sso.ts` (NEW)

```typescript
import { Router } from 'express';
import { initiateAuthorizationRequest, exchangeAuthorizationCode, validateIDToken } from '../services/oidc-client.service';
import { User } from '../models/User';
import { generateAccessToken, generateRefreshToken } from '../utils/token.utils';

const router = Router();

const OIDC_CONFIG = {
  issuer: process.env.OIDC_ISSUER || 'http://localhost:4000',
  clientId: process.env.OIDC_CLIENT_ID || 'product-management',
  clientSecret: process.env.OIDC_CLIENT_SECRET || 'product-mgmt-secret',
  redirectUri: process.env.OIDC_REDIRECT_URI || 'http://localhost:5000/api/auth/sso/callback',
  scopes: ['openid', 'profile', 'email']
};

// GET /api/auth/sso/login
router.get('/sso/login', (req, res) => {
  const authRequest = initiateAuthorizationRequest(OIDC_CONFIG, 'none');
  
  // Store state and codeVerifier in session
  req.session.oidcState = authRequest.state;
  req.session.oidcCodeVerifier = authRequest.codeVerifier;
  
  res.redirect(authRequest.authorizationUrl);
});

// GET /api/auth/sso/callback
router.get('/sso/callback', async (req, res) => {
  const { code, state, error } = req.query;
  
  if (error) {
    return res.redirect(`/login?error=${error}`);
  }
  
  // Verify state
  if (state !== req.session.oidcState) {
    return res.redirect('/login?error=invalid_state');
  }
  
  const codeVerifier = req.session.oidcCodeVerifier;
  delete req.session.oidcState;
  delete req.session.oidcCodeVerifier;
  
  try {
    // Exchange code for tokens
    const tokens = await exchangeAuthorizationCode(OIDC_CONFIG, code, codeVerifier);
    
    // Validate ID token
    const idToken = validateIDToken(tokens.idToken, OIDC_CONFIG);
    
    // Find or create user based on sub
    let user = await User.findOne({ oidcSub: idToken.sub });
    
    if (!user) {
      // Check if user exists with same email (link accounts)
      user = await User.findOne({ email: idToken.email });
      
      if (user) {
        // Link IdP sub to existing user
        user.oidcSub = idToken.sub;
        await user.save();
      } else {
        // Create new user (just-in-time provisioning)
        user = new User({
          oidcSub: idToken.sub,
          email: idToken.email,
          name: idToken.name,
          firstName: idToken.given_name,
          lastName: idToken.family_name,
          picture: idToken.picture,
          role: 'user',
          tenantId: 'default', // Assign default tenant
          emailVerified: idToken.email_verified,
          isActive: true
        });
        await user.save();
      }
    }
    
    // Create local session
    const accessToken = generateAccessToken(user);
    const refreshToken = generateRefreshToken(user);
    
    // Set refresh token cookie
    res.cookie('refreshToken', refreshToken, refreshTokenCookieOptions);
    
    // Redirect to frontend with token in URL fragment
    res.redirect(`http://localhost:5173/login/callback#token=${accessToken}`);
  } catch (error) {
    console.error('SSO callback error:', error);
    res.redirect('/login?error=sso_failed');
  }
});

export default router;
```

#### 2.3: Update auth.ts to Import SSO Routes
**File**: `product-management/backend-node/src/routes/auth.ts`

Add at top:
```typescript
import ssoRoutes from './sso';
```

Add before export:
```typescript
router.use(ssoRoutes);
```

#### 2.4: Update Environment Variables
**File**: `product-management/backend-node/.env`

Add:
```env
# OIDC Configuration (Relying Party)
OIDC_ISSUER=http://localhost:4000
OIDC_CLIENT_ID=product-management
OIDC_CLIENT_SECRET=product-mgmt-secret
OIDC_REDIRECT_URI=http://localhost:5000/api/auth/sso/callback
```

#### 2.5: Update OIDC Client Service
**File**: `product-management/backend-node/src/services/oidc-client.service.ts`

Change line 88-89:
```typescript
// OLD
const authUrl = new URL(`${config.issuer}/api/oidc/authorize`);

// NEW
const authUrl = new URL(`${config.issuer}/authorize`);
```

Change line 127:
```typescript
// OLD
const tokenUrl = `${config.issuer}/api/oidc/token`;

// NEW
const tokenUrl = `${config.issuer}/token`;
```

Change line 185:
```typescript
// OLD
const userInfoUrl = `${config.issuer}/api/oidc/userinfo`;

// NEW
const userInfoUrl = `${config.issuer}/userinfo`;
```

#### 2.6: Remove Old IdP Code
**Files to Remove/Modify**:
- `product-management/backend-node/src/routes/oidc.ts` - DELETE (IdP functionality)
- `product-management/backend-node/src/services/oidc-provider.service.ts` - DELETE
- Update `src/index.ts` to remove OIDC route mounting

### Step 3: Update Prompt Management Configuration

#### 3.1: Update Environment Variables
**File**: `prompt-management/backend/.env`

Change:
```env
# OLD
SSO_ISSUER=http://localhost:5000

# NEW
SSO_ISSUER=http://localhost:4000
OIDC_CLIENT_ID=prompt-management
OIDC_CLIENT_SECRET=prompt-mgmt-secret
OIDC_REDIRECT_URI=http://localhost:5001/api/auth/sso/callback
```

#### 3.2: Update OIDC Client Service
**File**: `prompt-management/backend/src/services/oidc-client.service.ts`

Same changes as product-management - update endpoints to remove `/api/oidc` prefix.

#### 3.3: Add Sub-based Identity Mapping
**File**: `prompt-management/backend/src/models/User.ts`

Add field:
```typescript
oidcSub?: string;
```

Update SSO callback to map based on `sub` instead of email.

### Step 4: Database Migrations

#### Migration Script
**File**: `migrations/add-oidc-sub.js`

```javascript
// Run on both product-management and prompt-management databases

db.users.updateMany(
  { oidcSub: { $exists: false } },
  { $set: { oidcSub: null } }
);

db.users.createIndex({ oidcSub: 1 }, { sparse: true, unique: true });

print('✅ Added oidcSub field and index to users collection');
```

### Step 5: Frontend Updates

#### Product Management Frontend
**File**: `product-management/frontend/.env`

Add:
```env
VITE_SSO_ENABLED=true
VITE_AUTH_SERVICE_URL=http://localhost:4000
```

Update LoginPage to support SSO button that redirects to `/api/auth/sso/login`.

#### Prompt Management Frontend
**File**: `prompt-management/frontend/.env`

Update:
```env
VITE_SSO_ENABLED=true
VITE_AUTH_SERVICE_URL=http://localhost:4000
```

### Step 6: Testing Scenarios

#### Test 1: User logs into auth-service → Product Management detects it
1. Visit http://localhost:4000/login
2. Register/login as new user
3. Note the session cookie `auth_service.sid`
4. Visit http://localhost:5173 (Product Management)
5. Click "Login with SSO"
6. Should redirect to auth-service with `prompt=none`
7. Auth-service detects session → returns code immediately
8. Product Management exchanges code → creates local user with `oidcSub`
9. User logged into Product Management ✅

#### Test 2: User logs into Product Management → Prompt Management detects it
Same flow as Test 1, but starting from Product Management login.

#### Test 3: Bi-directional SSO
1. Login to Product Management via SSO
2. Visit Prompt Management → automatic SSO login
3. Both apps now have local sessions linked to same IdP `sub`

## Configuration Reference

### auth-service (Port 4000)
```env
PORT=4000
MONGODB_URI=mongodb://localhost:27017/auth-service
SESSION_SECRET=auth-service-secret-change-in-production
JWT_SECRET=shared-jwt-secret-all-services
OIDC_ISSUER=http://localhost:4000

CLIENT_PRODUCT_MANAGEMENT_ID=product-management
CLIENT_PRODUCT_MANAGEMENT_SECRET=product-mgmt-secret
CLIENT_PRODUCT_MANAGEMENT_REDIRECTS=http://localhost:5000/api/auth/sso/callback

CLIENT_PROMPT_MANAGEMENT_ID=prompt-management
CLIENT_PROMPT_MANAGEMENT_SECRET=prompt-mgmt-secret
CLIENT_PROMPT_MANAGEMENT_REDIRECTS=http://localhost:5001/api/auth/sso/callback
```

### product-management (Port 5000)
```env
OIDC_ISSUER=http://localhost:4000
OIDC_CLIENT_ID=product-management
OIDC_CLIENT_SECRET=product-mgmt-secret
OIDC_REDIRECT_URI=http://localhost:5000/api/auth/sso/callback
JWT_SECRET=shared-jwt-secret-all-services
```

### prompt-management (Port 5001)
```env
SSO_ISSUER=http://localhost:4000
OIDC_CLIENT_ID=prompt-management
OIDC_CLIENT_SECRET=prompt-mgmt-secret
OIDC_REDIRECT_URI=http://localhost:5001/api/auth/sso/callback
JWT_SECRET=shared-jwt-secret-all-services
```

## Startup Order

1. Start MongoDB: `mongod`
2. Start auth-service: `cd auth-service && npm run dev`
3. Start product-management backend: `cd product-management/backend-node && npm run dev`
4. Start prompt-management backend: `cd prompt-management/backend && npm run dev`
5. Start frontends: Product Management (5173), Prompt Management (3002)

## Next Steps

Run the following command to install auth-service dependencies:

```powershell
cd auth-service
npm install
```

Then copy `.env.example` to `.env` and configure MongoDB URI and secrets.

Start the auth-service and test OIDC discovery:
```powershell
curl http://localhost:4000/.well-known/openid-configuration
```

---

**Status**: Implementation guide complete. Ready to execute step-by-step.
