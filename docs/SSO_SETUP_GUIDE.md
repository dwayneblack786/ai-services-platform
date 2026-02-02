# SSO Setup Guide - Automatic Cross-Application Authentication

This guide explains how to set up Single Sign-On (SSO) between Product Management and Prompt Management applications.

## Overview

The SSO implementation allows users to automatically authenticate between Product Management (IdP) and Prompt Management (SP) without needing to log in separately to each application.

## How It Works

1. **User logs into Product Management** - Standard authentication via OAuth/email
2. **User navigates to Prompt Management** - Clicks "Prompt Management" in sidebar
3. **Automatic SSO** - Product Management generates an SSO token and passes it to Prompt Management
4. **Auto-authentication** - Prompt Management validates the token and logs the user in automatically
5. **Session persistence** - On refresh, Prompt Management checks for active Product Management session

## Configuration

### Product Management Backend

**File: `product-management/backend-node/.env`**

```env
# CORS Origins - Must include prompt-management frontend URL
CORS_ORIGINS=http://localhost:5173,http://localhost:3000,http://localhost:3001

# SSO Configuration (already in shared/sso-types.ts)
JWT_SECRET=your-shared-secret-minimum-32-chars
```

### Prompt Management Frontend

**File: `prompt-management/frontend/.env`**

```env
VITE_API_URL=http://localhost:5001/api
VITE_PRODUCT_MGMT_URL=http://localhost:5000
VITE_SSO_ENABLED=true
```

### Prompt Management Backend

**File: `prompt-management/backend/.env`**

```env
SSO_ENABLED=true
SSO_ISSUER=http://localhost:5000
SSO_CLIENT_ID=prompt-management-client
JWT_SECRET=your-shared-secret-minimum-32-chars  # MUST match product-management
```

## SSO Flow

### Initial Authentication

```
┌─────────────────────┐
│ Product Management  │
│  (User logs in)     │
└──────────┬──────────┘
           │
           │ Click "Prompt Management" in sidebar
           ▼
┌─────────────────────┐
│ GET /api/sso/       │
│     get-token       │
│ Returns JWT token   │
└──────────┬──────────┘
           │
           │ Open new tab with ?ssoToken=xxx
           ▼
┌─────────────────────┐
│ Prompt Management   │
│  App.tsx detects    │
│  ssoToken in URL    │
└──────────┬──────────┘
           │
           │ POST /api/auth/sso/login
           ▼
┌─────────────────────┐
│ User authenticated  │
│ Redirect /dashboard │
└─────────────────────┘
```

### Refresh/Return Visit

```
┌─────────────────────┐
│ User refreshes      │
│ Prompt Management   │
└──────────┬──────────┘
           │
           │ Check localStorage for token
           ▼
        ┌─────┐
        │ No? │
        └──┬──┘
           │
           │ Try to get SSO token from Product Management
           ▼
┌─────────────────────┐
│ GET http://         │
│ localhost:5000/api/ │
│ sso/get-token       │
│ (with credentials)  │
└──────────┬──────────┘
           │
        ┌──┴──┐
        │ OK? │
        └──┬──┘
           │ Yes - Auto-login with SSO token
           ▼
┌─────────────────────┐
│ User authenticated  │
│ without re-login    │
└─────────────────────┘
```

## Key Endpoints

### Product Management (IdP)

- `GET /api/sso/get-token` - Get SSO token for current session
- `POST /api/sso/token` - OAuth2-compatible token endpoint
- `POST /api/sso/introspect` - Token validation endpoint
- `POST /api/sso/revoke` - Token revocation
- `GET /api/sso/.well-known/openid-configuration` - OIDC discovery

### Prompt Management (SP)

- `POST /api/auth/sso/login` - SSO token validation and login
- `GET /api/auth/me` - Get current user info

## Testing the SSO Flow

1. **Start both applications:**
   ```bash
   # Terminal 1: Product Management Backend
   cd product-management/backend-node
   npm run dev

   # Terminal 2: Product Management Frontend
   cd product-management/frontend
   npm run dev

   # Terminal 3: Prompt Management Backend
   cd prompt-management/backend
   npm run dev

   # Terminal 4: Prompt Management Frontend
   cd prompt-management/frontend
   npm run dev
   ```

2. **Login to Product Management:**
   - Navigate to http://localhost:5173
   - Login with your credentials

3. **Test SSO to Prompt Management:**
   - Click "Prompt Management 📝" in the sidebar
   - New tab opens with Prompt Management
   - You should be automatically logged in

4. **Test Session Persistence:**
   - Refresh the Prompt Management page
   - You should remain logged in (auto-authenticated via SSO)

## Troubleshooting

### Issue: Prompt Management doesn't auto-authenticate

**Check:**
1. CORS is properly configured in product-management backend
2. Both apps are using the same JWT_SECRET
3. Product Management session is active (check cookies)
4. Browser console for CORS errors

**Solution:**
```bash
# Verify CORS in product-management/.env
CORS_ORIGINS=http://localhost:5173,http://localhost:3000,http://localhost:3001
```

### Issue: "SSO authentication failed" error

**Check:**
1. JWT_SECRET matches between both backends
2. SSO token hasn't expired (default 1 hour)
3. Prompt management backend is running
4. Check backend logs for token validation errors

**Solution:**
```bash
# Verify JWT secrets match
# product-management/backend-node/.env
JWT_SECRET=your-shared-secret

# prompt-management/backend/.env
JWT_SECRET=your-shared-secret  # Must be identical
```

### Issue: CORS errors in browser console

**Check:**
1. Product Management backend CORS_ORIGINS includes prompt-management URL
2. Credentials: 'include' is set in fetch requests

**Solution:**
```typescript
// In prompt-management/frontend/src/App.tsx
fetch(`${productMgmtUrl}/api/sso/get-token`, {
  credentials: 'include',  // This is critical
  headers: { 'Accept': 'application/json' }
})
```

## Security Considerations

1. **JWT Secret Sharing**: Both applications must share the same JWT_SECRET for token validation
2. **Token Expiry**: SSO tokens expire after 1 hour by default
3. **HTTPS in Production**: Always use HTTPS for SSO in production
4. **Token in URL**: Token is briefly visible in URL but removed immediately after authentication
5. **Cross-Origin Cookies**: Session cookies work across origins when credentials: 'include' is used

## Production Deployment

For production, update the following:

1. **Use HTTPS URLs:**
   ```env
   # Product Management
   CORS_ORIGINS=https://product.yourdomain.com,https://prompts.yourdomain.com

   # Prompt Management
   VITE_PRODUCT_MGMT_URL=https://product.yourdomain.com
   ```

2. **Secure JWT Secret:**
   ```bash
   # Generate strong secret (32+ characters)
   openssl rand -base64 32
   ```

3. **Token Security:**
   - Consider using RS256 instead of HS256 for asymmetric signing
   - Implement refresh token rotation
   - Add rate limiting on SSO endpoints

4. **Cookie Settings:**
   ```typescript
   // Update session config for production
   cookie: {
     secure: true,        // HTTPS only
     sameSite: 'none',    // Cross-site cookies
     domain: '.yourdomain.com'  // Share across subdomains
   }
   ```

## Architecture Diagram

```
┌──────────────────────────────────────────────────────────┐
│                  Product Management                       │
│                    (Identity Provider)                    │
│                                                           │
│  ┌─────────────┐      ┌──────────────┐                  │
│  │  Frontend   │─────▶│   Backend    │                  │
│  │ :5173/:3000 │      │    :5000     │                  │
│  └─────────────┘      └──────┬───────┘                  │
│                               │                           │
│                               │ Generate SSO Token        │
│                               │ GET /api/sso/get-token    │
└───────────────────────────────┼───────────────────────────┘
                                │
                                │ SSO Token (JWT)
                                │
                                ▼
┌──────────────────────────────────────────────────────────┐
│                  Prompt Management                        │
│                   (Service Provider)                      │
│                                                           │
│  ┌─────────────┐      ┌──────────────┐                  │
│  │  Frontend   │─────▶│   Backend    │                  │
│  │    :3001    │      │    :5001     │                  │
│  └─────────────┘      └──────────────┘                  │
│                                                           │
│  Auto-authenticate with SSO token                        │
│  POST /api/auth/sso/login                                │
└──────────────────────────────────────────────────────────┘
```

## References

- [SSO Implementation Guide](./SSO_IMPLEMENTATION_GUIDE.md) - Detailed implementation
- [SSO Quick Reference](./SSO_QUICK_REFERENCE.md) - API endpoints and token structure
- [OAuth 2.0 RFC 6749](https://tools.ietf.org/html/rfc6749)
- [OpenID Connect Core 1.0](https://openid.net/specs/openid-connect-core-1_0.html)
