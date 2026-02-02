# Keycloak Identity Layer - Quick Start Guide

## Prerequisites

- ✅ Keycloak running at `http://localhost:9999` (admin/admin)
- ✅ MongoDB running
- ✅ Node.js 18+ installed
- ✅ PowerShell (for setup scripts)

## 5-Minute Setup

### Step 1: Configure Keycloak (2 minutes)

```powershell
# Run the automated setup script
cd ai-services-platform
.\scripts\keycloak\setup-keycloak.ps1
```

This creates:
- ✅ Realm: `tenant-default`
- ✅ Client: `product-management` 
- ✅ Client: `prompt-management`
- ✅ Test user: `testuser@example.com` / `Test123!`
- ✅ OIDC configuration
- ✅ Saves secrets to `keycloak-secrets.txt`

### Step 2: Update Environment Variables (1 minute)

**Product Management:**

```bash
cd product-management/backend-node
cp .env.keycloak.example .env
```

Edit `.env` and add your client secret from `keycloak-secrets.txt`:

```env
KEYCLOAK_CLIENT_SECRET=<paste-secret-here>
```

**Prompt Management:**

```bash
cd prompt-management/backend
cp .env.keycloak.example .env
```

Edit and add client secret for prompt-management.

### Step 3: Install Dependencies (1 minute)

```bash
# Product Management
cd product-management/backend-node
npm install jwks-rsa

# Prompt Management
cd prompt-management/backend
npm install jwks-rsa
```

### Step 4: Update User Model (Manual)

**File:** `product-management/backend-node/src/models/User.ts`

Add one field:

```typescript
keycloakSub?: string;  // Add this line
```

Add index at bottom:

```typescript
UserSchema.index({ keycloakSub: 1 }, { sparse: true, unique: true });
```

### Step 5: Register Routes (1 minute)

**File:** `product-management/backend-node/src/index.ts`

Add these imports:

```typescript
import keycloakAuthRoutes from './routes/keycloak-auth';
```

Add route registration:

```typescript
app.use('/api/auth', keycloakAuthRoutes);
```

### Step 6: Start & Test

```bash
# Terminal 1: Backend
cd product-management/backend-node
npm run dev

# Terminal 2: Frontend  
cd product-management/frontend
npm run dev
```

Visit `http://localhost:5173` and click "Sign in with Keycloak"

## Architecture Overview

```
┌─────────────────────────────────────────────────────┐
│         Keycloak (Port 9999)                        │
│                                                      │
│  • Authentication & SSO                             │
│  • Token Issuance (JWT)                             │
│  • Social Login (Google, Microsoft)                 │
│  • User Management                                  │
│  • Multi-Realm (one per tenant)                     │
└─────────────────────────────────────────────────────┘
                        │
                        │ OIDC + PKCE
                        │
        ┌───────────────┴───────────────┐
        │                               │
        ▼                               ▼
┌──────────────────┐          ┌──────────────────┐
│ product-mgmt     │          │ prompt-mgmt      │
│ (Port 5000)      │          │ (Port 5001)      │
│                  │          │                  │
│ • OIDC Client    │          │ • OIDC Client    │
│ • Token Validate │          │ • Token Validate │
│ • User Mapping   │          │ • User Mapping   │
│ • App Roles      │          │ • App Roles      │
└──────────────────┘          └──────────────────┘
```

## Authentication Flow

### 1. User Clicks "Login"

Frontend → `/api/auth/keycloak/login`

Backend:
- Generates PKCE challenge
- Generates CSRF state
- Stores in session
- Redirects to Keycloak

### 2. Keycloak Login

User enters credentials at Keycloak login page

Keycloak:
- Validates credentials
- Creates session
- Redirects back with authorization code

### 3. Token Exchange

Browser → `/api/auth/keycloak/callback?code=...&state=...`

Backend:
- Validates state (CSRF protection)
- Exchanges code + PKCE verifier for tokens
- Decodes ID token to get user info
- Finds or creates user (Just-in-Time provisioning)
- Creates local session
- Stores tokens
- Redirects to application

### 4. Protected Requests

Frontend → `/api/protected-endpoint`

Backend middleware (`requireKeycloakAuth`):
- Gets access token from session
- Validates token using JWKS (public key from Keycloak)
- Checks signature, expiration, issuer, audience
- Attaches user to request
- Continues to route handler

### 5. Token Refresh (Automatic)

When token expires:
- Middleware detects invalid token
- Uses refresh token to get new access token
- Updates session
- Continues request

### 6. Logout

User clicks logout

Backend:
- Clears local session
- Returns Keycloak logout URL
- Frontend redirects to Keycloak logout
- Keycloak ends session
- Redirects back to application

## Key Features

### ✅ Authorization Code + PKCE

Most secure OAuth2 flow:
- Prevents authorization code interception
- No client secret in frontend
- CSRF protection via state parameter

### ✅ Token Validation with JWKS

Tokens validated using Keycloak's public keys:
- No shared secrets needed
- Automatic key rotation support
- Cached for performance

### ✅ Just-in-Time User Provisioning

Users created automatically on first login:
- Gets info from Keycloak ID token
- Creates local user record
- Links via `keycloakSub` field
- Account linking for existing users

### ✅ Single Sign-On (SSO)

Login once, access all applications:
- Keycloak session shared across apps
- Silent authentication with `prompt=none`
- Single logout from all apps

### ✅ Social Login

Configure in Keycloak (zero code changes):
- Google OAuth
- Microsoft Azure AD
- GitHub, Facebook, Twitter, etc.

### ✅ Multi-Tenant via Realms

Each tenant gets own realm:
- Isolated user base
- Separate configuration
- Independent branding

## API Endpoints

### Application Endpoints

```
GET  /api/auth/keycloak/login          - Initiate login
GET  /api/auth/keycloak/callback       - OAuth callback
GET  /api/auth/keycloak/me             - Get current user
POST /api/auth/keycloak/refresh        - Refresh token
POST /api/auth/keycloak/logout         - Logout
GET  /api/auth/keycloak/status         - Check auth status
GET  /api/auth/keycloak/silent-check   - SSO check
```

### Keycloak Endpoints

```
GET  /realms/{realm}/.well-known/openid-configuration
     → OIDC Discovery Document

GET  /realms/{realm}/protocol/openid-connect/certs
     → JWKS (Public Keys)

GET  /realms/{realm}/protocol/openid-connect/auth
     → Authorization Endpoint

POST /realms/{realm}/protocol/openid-connect/token
     → Token Endpoint

GET  /realms/{realm}/protocol/openid-connect/userinfo
     → User Info Endpoint

GET  /realms/{realm}/protocol/openid-connect/logout
     → Logout Endpoint
```

## Middleware Usage

### Require Authentication

```typescript
import { requireKeycloakAuth } from '../../shared/keycloak-middleware';

router.get('/api/protected', requireKeycloakAuth, (req, res) => {
  // req.keycloakUser contains validated token payload
  res.json({ user: req.keycloakUser });
});
```

### Optional Authentication

```typescript
import { optionalKeycloakAuth } from '../../shared/keycloak-middleware';

router.get('/api/public', optionalKeycloakAuth, (req, res) => {
  // req.keycloakUser is present if authenticated, undefined otherwise
  const isAuth = !!req.keycloakUser;
  res.json({ authenticated: isAuth });
});
```

### Require Roles

```typescript
import { requireKeycloakAuth, requireKeycloakRoles } from '../../shared/keycloak-middleware';

router.get('/api/admin', 
  requireKeycloakAuth,
  requireKeycloakRoles('admin'),
  (req, res) => {
    res.json({ message: 'Admin only' });
  }
);
```

## Testing

### Test User Credentials

```
Username: testuser@example.com
Password: Test123!
```

### Test Login Flow

1. Visit `http://localhost:5173`
2. Click "Sign in with Keycloak"
3. Login page should show Keycloak branding
4. Enter test credentials
5. Redirect back to application
6. Check browser DevTools → Application → Cookies
7. Should see session cookie with Keycloak tokens

### Test Token Validation

```bash
# Get your access token from session
TOKEN="<your-access-token>"

# Call protected endpoint
curl http://localhost:5000/api/auth/keycloak/me \
  -H "Authorization: Bearer $TOKEN"
```

### Test OIDC Discovery

```bash
curl http://localhost:9999/realms/tenant-default/.well-known/openid-configuration | jq
```

### Test JWKS

```bash
curl http://localhost:9999/realms/tenant-default/protocol/openid-connect/certs | jq
```

## Frontend Integration

### React Login Button

```typescript
const LoginPage = () => {
  const handleLogin = () => {
    window.location.href = 'http://localhost:5000/api/auth/keycloak/login';
  };

  return (
    <button onClick={handleLogin}>
      Sign in with Keycloak
    </button>
  );
};
```

### Check Authentication Status

```typescript
const checkAuth = async () => {
  const response = await fetch('http://localhost:5000/api/auth/keycloak/status', {
    credentials: 'include'
  });
  const data = await response.json();
  return data.authenticated;
};
```

### Logout

```typescript
const handleLogout = async () => {
  const response = await fetch('http://localhost:5000/api/auth/keycloak/logout', {
    method: 'POST',
    credentials: 'include'
  });
  const data = await response.json();
  
  // Redirect to Keycloak logout
  window.location.href = data.logoutUrl;
};
```

## Troubleshooting

### ❌ "Keycloak is not accessible"

**Solution:**
```bash
# Start Keycloak
cd <keycloak-installation>
.\bin\kc.bat start-dev
```

### ❌ "Invalid redirect_uri"

**Solution:** 
- Open Keycloak Admin Console
- Realm → Clients → product-management
- Add your redirect URI to "Valid Redirect URIs"
- Save

### ❌ "Token signature verification failed"

**Solution:**
- Check KEYCLOAK_URL in .env is correct
- Verify JWKS endpoint is accessible:
  ```bash
  curl http://localhost:9999/realms/tenant-default/protocol/openid-connect/certs
  ```

### ❌ "CORS error"

**Solution:**
- Keycloak Admin → Clients → product-management
- Add your frontend URL to "Web Origins"
- E.g., `http://localhost:5173`

### ❌ Session lost after login

**Solution:**
- Check session middleware is configured BEFORE Keycloak routes
- Verify SESSION_SECRET is set in .env
- Check cookie settings (sameSite, secure)

## Next Steps

### 1. Configure Social Login

[Keycloak Implementation Guide - Social Identity Providers](KEYCLOAK_IMPLEMENTATION_GUIDE.md#social-identity-providers)

### 2. Set Up Additional Realms

```powershell
# For each tenant
.\scripts\keycloak\setup-keycloak.ps1 -RealmName "tenant-acmecorp"
```

### 3. Migrate Existing Users

[Keycloak Migration Checklist - User Migration](KEYCLOAK_MIGRATION_CHECKLIST.md#migration-of-existing-users)

### 4. Implement Role-Based Access Control

Use Keycloak realm roles or client roles:

```typescript
router.get('/admin', 
  requireKeycloakAuth,
  requireKeycloakRoles('admin'),
  adminHandler
);
```

### 5. Production Deployment

[Keycloak Implementation Guide - Production](KEYCLOAK_IMPLEMENTATION_GUIDE.md#production-deployment)

## Documentation

- 📘 [Complete Implementation Guide](KEYCLOAK_IMPLEMENTATION_GUIDE.md)
- ✅ [Migration Checklist](KEYCLOAK_MIGRATION_CHECKLIST.md)
- 🔐 [Keycloak Admin Console](http://localhost:9999/admin)

## Support

For issues or questions:
1. Check [Troubleshooting](#troubleshooting) section
2. Review Keycloak logs
3. Check application logs
4. Verify OIDC discovery document
5. Test with OIDC Debugger tools

---

**Status:** Ready to use
**Time to Complete:** 5 minutes
**Difficulty:** Easy (automated scripts)
