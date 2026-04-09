# SSO Cross-Application Authentication - Implementation Summary

## What Was Implemented

Automatic Single Sign-On (SSO) authentication between Product Management and Prompt Management applications that allows users to:
1. Stay authenticated when navigating between applications
2. Remain logged in when refreshing Prompt Management
3. Automatically authenticate without manual login when coming from Product Management

## Changes Made

### 1. Product Management Backend (`product-management/backend-node`)

**File: `src/routes/sso-routes.ts`**
- Added `GET /api/sso/get-token` endpoint
- Generates SSO token for currently authenticated user
- Returns token with user information
- Used for automatic authentication in Prompt Management

**File: `.env`**
- Added `CORS_ORIGINS=http://localhost:5173,http://localhost:3000,http://localhost:3001`
- Enables Prompt Management frontend to access SSO endpoints

### 2. Product Management Frontend (`product-management/frontend`)

**File: `src/components/Sidebar.tsx`**
- Added "Prompt Management 📝" menu item
- Implemented `openPromptManagement()` function
- Fetches SSO token from backend
- Opens Prompt Management in new tab with SSO token in URL
- Shows external link indicator (↗)

### 3. Prompt Management Frontend (`prompt-management/frontend`)

**File: `src/App.tsx`**
- Added automatic SSO authentication on app initialization
- Checks for `ssoToken` in URL query parameters
- Attempts to fetch SSO token from Product Management backend
- Auto-authenticates user if valid token found
- Falls back to normal authentication if no SSO token available

**File: `src/vite-env.d.ts`**
- Added `VITE_PRODUCT_MGMT_URL` environment variable type

**File: `.env`**
- Created with `VITE_PRODUCT_MGMT_URL=http://localhost:5000`
- Configures Product Management backend URL

**File: `.env.example`**
- Updated with `VITE_PRODUCT_MGMT_URL=http://localhost:5000`

### 4. Documentation

**File: `docs/SSO_SETUP_GUIDE.md`**
- Comprehensive setup and troubleshooting guide
- Configuration examples
- Flow diagrams
- Security considerations
- Production deployment checklist

## How It Works

### Flow 1: User Navigates from Product Management

```
1. User logged into Product Management
2. User clicks "Prompt Management 📝" in sidebar
3. Frontend calls GET /api/sso/get-token
4. Backend generates JWT token for current user
5. Frontend opens Prompt Management with ?ssoToken=xxx
6. Prompt Management detects token in URL
7. Calls POST /api/auth/sso/login with token
8. User automatically authenticated
9. Redirects to /dashboard
```

### Flow 2: User Refreshes Prompt Management

```
1. User refreshes Prompt Management page
2. App.tsx checks localStorage for existing token
3. If no token, attempts to fetch from Product Management
4. Calls GET http://localhost:5000/api/sso/get-token
5. If Product Management session active, gets SSO token
6. Automatically authenticates with SSO token
7. User stays logged in without re-authentication
```

### Flow 3: User Visits Prompt Management Directly

```
1. User navigates to Prompt Management URL
2. App.tsx checks localStorage (no token)
3. Attempts to fetch SSO token from Product Management
4. Product Management session not found
5. Falls back to normal authentication
6. Redirects to /login page
```

## Key Features

✅ **Automatic Authentication** - No manual login required when coming from Product Management
✅ **Session Persistence** - Refreshing Prompt Management doesn't require re-login
✅ **Seamless UX** - Single click navigation between applications
✅ **Secure Token Exchange** - JWT-based authentication with validation
✅ **Fallback Support** - Works even if Product Management session not available
✅ **CORS Compliant** - Properly configured cross-origin requests

## Testing Instructions

### Prerequisites
Ensure both applications are running:
```bash
# Product Management Backend (Port 5000)
cd product-management/backend-node
npm run dev

# Product Management Frontend (Port 5173)
cd product-management/frontend  
npm run dev

# Prompt Management Backend (Port 5001)
cd prompt-management/backend
npm run dev

# Prompt Management Frontend (Port 3001)
cd prompt-management/frontend
npm run dev
```

### Test Case 1: Initial SSO Login
1. Open http://localhost:5173
2. Login to Product Management
3. Navigate to Dashboard
4. Click "Prompt Management 📝" in sidebar
5. **Expected**: New tab opens, automatically logged into Prompt Management

### Test Case 2: Session Persistence on Refresh
1. Complete Test Case 1 (logged into Prompt Management via SSO)
2. Refresh the Prompt Management page (F5 or Ctrl+R)
3. **Expected**: Stay logged in, no redirect to login page

### Test Case 3: Direct Access Without Product Management Session
1. Clear browser storage (localStorage and cookies)
2. Navigate directly to http://localhost:3001
3. **Expected**: Redirected to login page (no active SSO session)

### Test Case 4: Cross-Session Authentication
1. Login to Product Management in one tab
2. Open new tab, navigate to Prompt Management
3. **Expected**: Automatically authenticated via background SSO check

## Configuration

### Required Environment Variables

**Product Management Backend (.env)**
```env
CORS_ORIGINS=http://localhost:5173,http://localhost:3000,http://localhost:3001
JWT_SECRET=your-shared-secret-minimum-32-chars
```

**Prompt Management Frontend (.env)**
```env
VITE_API_URL=http://localhost:5001/api
VITE_PRODUCT_MGMT_URL=http://localhost:5000
VITE_SSO_ENABLED=true
```

**Prompt Management Backend (.env)**
```env
SSO_ENABLED=true
SSO_ISSUER=http://localhost:5000
JWT_SECRET=your-shared-secret-minimum-32-chars  # MUST match Product Management
```

## Troubleshooting

### Problem: Prompt Management doesn't auto-authenticate

**Solutions:**
1. Check browser console for CORS errors
2. Verify CORS_ORIGINS in product-management backend includes `http://localhost:3001`
3. Ensure JWT_SECRET matches between both backends
4. Confirm Product Management session is active (test by visiting dashboard)

### Problem: "SSO authentication failed" error

**Solutions:**
1. Verify JWT_SECRET is identical in both backend .env files
2. Check that Product Management backend is running
3. Review backend logs for token validation errors
4. Ensure token hasn't expired (default 1 hour lifetime)

### Problem: CORS errors in browser

**Solutions:**
1. Add Prompt Management URL to CORS_ORIGINS in product-management backend
2. Restart product-management backend after .env changes
3. Verify fetch includes `credentials: 'include'`

## Security Considerations

1. **Shared Secret**: Both backends must use same JWT_SECRET for token validation
2. **Token Expiry**: Tokens expire after 1 hour (configurable)
3. **Token Visibility**: Token briefly visible in URL but removed immediately
4. **Cross-Origin**: Session cookies work with `credentials: 'include'`
5. **HTTPS Required**: Production must use HTTPS for security

## Production Checklist

- [ ] Update URLs to production domains
- [ ] Use HTTPS for all endpoints
- [ ] Generate strong JWT_SECRET (32+ characters)
- [ ] Configure secure cookie settings
- [ ] Implement rate limiting on SSO endpoints
- [ ] Set up monitoring for SSO failures
- [ ] Test cross-domain cookie functionality
- [ ] Consider RS256 instead of HS256 for production

## Architecture

```
┌─────────────────────────────────────────┐
│     Product Management (IdP)            │
│  http://localhost:5173 (Frontend)       │
│  http://localhost:5000 (Backend)        │
│                                          │
│  [Sidebar] ─┐                           │
│             │ Click "Prompt Management" │
│             ▼                            │
│  GET /api/sso/get-token                 │
│             │                            │
└─────────────┼────────────────────────────┘
              │ JWT Token
              │
              ▼
┌─────────────────────────────────────────┐
│    Prompt Management (SP)               │
│  http://localhost:3001 (Frontend)       │
│  http://localhost:5001 (Backend)        │
│                                          │
│  App.tsx                                │
│    │                                    │
│    ├─ Check URL for ssoToken           │
│    ├─ Try fetch from Product Mgmt      │
│    └─ Auto-authenticate if found       │
│                                          │
│  POST /api/auth/sso/login               │
│  Validate token & create session        │
└─────────────────────────────────────────┘
```

## Next Steps

1. **Test the implementation** - Follow test cases above
2. **Monitor SSO usage** - Add analytics to track SSO authentication success rate
3. **User feedback** - Gather user experience feedback on seamless authentication
4. **Performance** - Monitor token generation and validation performance
5. **Security audit** - Review token handling and session management

## Related Documentation

- [SSO Implementation Guide](../product-management/docs/SSO_IMPLEMENTATION_GUIDE.md) - Detailed technical implementation
- [SSO Quick Reference](./SSO_QUICK_REFERENCE.md) - API endpoints and token structure
- [SSO Setup Guide](./SSO_SETUP_GUIDE.md) - Configuration and troubleshooting

## Statistics

- **Files Modified**: 8
- **New Endpoints**: 1 (GET /api/sso/get-token)
- **New Components**: 1 SSO button in Sidebar
- **Environment Variables**: 3 new/updated
- **Documentation**: 1 comprehensive guide
