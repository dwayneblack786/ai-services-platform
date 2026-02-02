# 🔐 Centralized Authentication Architecture

## Overview

The platform uses **centralized SSO authentication** with Product Management as the Identity Provider (IdP) and other services as Service Providers (SPs).

```
┌─────────────────────┐         ┌─────────────────────┐
│ Product Management  │         │ Prompt Management   │
│   (Site A / IdP)    │         │   (Site B / SP)     │
│                     │         │                     │
│  Frontend: :5173    │◄───────►│  Frontend: :3002    │
│  Backend:  :5000    │   SSO   │  Backend:  :5001    │
│                     │         │                     │
│  Session Cookie:    │         │  Local Token:       │
│  ai_platform.sid    │         │  localStorage       │
│  Domain: localhost  │         │  (per origin)       │
└─────────────────────┘         └─────────────────────┘
          │
          │ Session Cookie Available
          ▼
    All localhost ports
    can check session
    via prompt=none
```

## 🎯 Core Principles

1. **Authentication Centralized** - Only Product Management (IdP) authenticates users
2. **Sessions Are Local** - Each app stores its own JWT token
3. **Global Session Cookie** - IdP session cookie shared across localhost
4. **No Storage Sharing** - No localStorage sharing between origins

## 🔄 SSO Scenarios

### ✅ Scenario 1: User logs into Site A → Site B detects it

```
1. User → Product Management login → authenticated
2. IdP sets session cookie: ai_platform.sid (domain: localhost)
3. User → Prompt Management
4. Prompt Management → IdP /authorize?prompt=none
5. IdP checks cookie → session exists ✅
6. IdP → returns auth code
7. Prompt Management → exchanges code for token
8. Result: Automatically logged in! No form shown! 🎉
```

### ✅ Scenario 2: User logs into Site B → Site A detects it

```
1. User → Prompt Management
2. Prompt Management → IdP /authorize?prompt=none
3. IdP → no session → returns error=login_required
4. User logs in via IdP
5. IdP sets session cookie: ai_platform.sid
6. Prompt Management gets token
7. User → Product Management
8. Product Management checks /api/auth/status
9. Session exists → auto-login! ✅
```

### ✅ Scenario 3: User logs into neither

```
1. User → Product Management → shows login form
2. User → Prompt Management → redirects to IdP with prompt=none
3. IdP → no session → returns error=login_required
4. Prompt Management → shows login form
5. User must authenticate at IdP
```

## 🔑 Technical Implementation

### Session Cookie (Global)
```javascript
// Set by: Product Management backend (port 5000)
// Available to: All services on localhost
{
  name: 'ai_platform.sid',
  domain: 'localhost',  // Shared across all ports!
  httpOnly: true,
  sameSite: 'lax',
  maxAge: 86400000  // 24 hours
}
```

### JWT Tokens (Local - Per App)
```javascript
// Product Management: localStorage on localhost:5173
// Prompt Management: localStorage on localhost:3002
// No sharing - different origins
{
  key: 'auth_token',
  value: 'eyJhbGc...',  // JWT
  expiry: 15 minutes,
  auto-refresh: yes
}
```

### prompt=none Parameter (Key to SSO)
```typescript
// Enables silent authentication check
// IdP checks session WITHOUT forcing login redirect

// Product Management IdP: src/routes/oidc.ts
if (prompt === 'none' && !isAuthenticated) {
  // No session - return error
  return res.redirect(`${redirect_uri}?error=login_required&state=${state}`);
}
// Session exists - return auth code immediately

// Prompt Management SP: src/pages/LoginPage.tsx
if (ssoEnabled && !ssoAttempted) {
  window.location.href = 'http://localhost:5001/api/auth/sso/login';
  // Backend adds prompt=none to IdP authorize URL
}
```

## 🚀 Service Configuration

### Product Management (IdP)
**Backend** `.env`:
```env
SESSION_SECRET=your-secret-here
JWT_SECRET=shared-with-all-services
SESSION_COOKIE_MAX_AGE=86400000
```

**Frontend** - No SSO config needed (it IS the IdP)

### Prompt Management (SP)
**Backend** `.env`:
```env
SSO_ENABLED=true
SSO_ISSUER=http://localhost:5000
SSO_CLIENT_ID=prompt-management
SSO_REDIRECT_URI=http://localhost:5001/api/auth/sso/callback
JWT_SECRET=shared-with-all-services  # MUST MATCH IdP
```

**Frontend** `.env`:
```env
VITE_SSO_ENABLED=true
VITE_API_URL=http://localhost:5001/api
VITE_PRODUCT_MGMT_URL=http://localhost:5000
```

## 📊 Flow Diagram

### Complete SSO Flow (User at Site B, logged in at Site A)

```
┌─────────────┐
│   User      │
│ (Browser)   │
└──────┬──────┘
       │
       │ 1. Navigate to localhost:3002
       ▼
┌─────────────────────────────┐
│ Prompt Management Frontend  │
│ - Check localStorage        │
│ - No token found            │
│ - SSO enabled ✅            │
└──────┬──────────────────────┘
       │
       │ 2. Redirect to SP backend SSO endpoint
       ▼
┌─────────────────────────────┐
│ Prompt Management Backend   │
│ /api/auth/sso/login         │
│ - Build authorize URL       │
│ - Add prompt=none           │
│ - Add PKCE challenge        │
└──────┬──────────────────────┘
       │
       │ 3. Redirect to IdP
       ▼
┌─────────────────────────────┐
│ Product Management Backend  │
│ /api/oidc/authorize         │
│ ?prompt=none                │
│ &code_challenge=...         │
└──────┬──────────────────────┘
       │
       │ 4. Check session
       ▼
┌─────────────────────────────┐
│ Passport Session Check      │
│ - req.isAuthenticated()     │
│ - Cookie: ai_platform.sid   │
│ - Result: ✅ Authenticated  │
└──────┬──────────────────────┘
       │
       │ 5. Generate auth code
       ▼
┌─────────────────────────────┐
│ Return to SP redirect_uri   │
│ ?code=abc123&state=xyz      │
└──────┬──────────────────────┘
       │
       │ 6. SP backend receives code
       ▼
┌─────────────────────────────┐
│ Prompt Management Backend   │
│ /api/auth/sso/callback      │
│ - Verify state              │
│ - Exchange code for token   │
│ - Verify PKCE               │
└──────┬──────────────────────┘
       │
       │ 7. Return JWT to frontend
       ▼
┌─────────────────────────────┐
│ Prompt Management Frontend  │
│ - Store token in localStorage│
│ - Navigate to /dashboard    │
└──────┬──────────────────────┘
       │
       ▼
    SUCCESS! 🎉
    User logged in automatically
    No login form shown
```

## 🛡️ Security Features

- ✅ **HttpOnly Cookies** - Session cookie not accessible to JavaScript
- ✅ **PKCE** - Code challenge prevents authorization code interception
- ✅ **Short-lived Tokens** - JWT expires in 15 minutes
- ✅ **Auto-refresh** - Seamless token renewal
- ✅ **Token Rotation** - New refresh token on each refresh
- ✅ **SameSite Cookie** - CSRF protection
- ✅ **Origin Isolation** - Each app's token on separate origin
- ✅ **Centralized Auth** - Single source of truth (IdP)

## 📚 Related Documentation

- [SSO Architecture Verification Report](./SSO_ARCHITECTURE_VERIFICATION.md) - Detailed verification
- [Prompt Management Setup](./prompt-management/SETUP_SUMMARY.md) - Service-specific docs
- [OIDC Implementation](./docs/GRPC_IMPLEMENTATION.md) - Technical details

## 🎓 Key Takeaways

1. **One IdP, Multiple SPs** - Product Management is the identity source
2. **Session Cookie = Source of Truth** - All SPs check IdP session via prompt=none
3. **No Magic** - Standard OAuth2/OIDC Authorization Code + PKCE flow
4. **prompt=none = Silent SSO** - Check session without forcing login redirect
5. **localStorage ≠ Shared** - Each origin has its own isolated storage (that's correct!)
6. **Cookie Domain** - `localhost` (not `localhost:5000`) enables cross-port sharing

---

**Status**: ✅ Production-ready centralized SSO architecture following industry best practices
