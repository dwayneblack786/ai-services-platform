# Tenant Validation and Redirect After Login

## Overview
Implemented tenant ID validation on login and redirect to intended URL after successful authentication.

## Changes Made

### Frontend Changes

#### 1. Login.tsx
**Added Features:**
- Store intended redirect URL from query parameter (`?redirect=/intended-path`)
- Redirect to intended URL after successful login (email or dev login)
- Added error handling for `invalid_tenant` error from backend
- Automatically use redirect URL stored in sessionStorage

**Flow:**
1. User tries to access protected route (e.g., `/products`)
2. ProtectedRoute redirects to `/login?redirect=/products`
3. Login page stores redirect URL in sessionStorage
4. After successful login, user is redirected to `/products` instead of `/dashboard`

#### 2. ProtectedRoute.tsx
**Enhanced:**
- Captures current URL when user is not authenticated
- Passes URL as query parameter to login page
- Preserves both pathname and search params

**Example:**
```
User tries: /products?category=ai
Redirect to: /login?redirect=%2Fproducts%3Fcategory%3Dai
After login: /products?category=ai
```

#### 3. AuthContext.tsx
**Updated OAuth Flow:**
- Pass tenant ID as query parameter to backend: `/api/auth/google?tenantId={tenantId}`
- Backend validates tenant before initiating OAuth flow

### Backend Changes

#### 1. auth.ts - Google OAuth Route
**Added Tenant Validation:**
- Validates tenant ID is provided in query parameter
- Checks tenant exists and is active in database
- Stores tenant ID in session for callback validation
- Redirects to login with error if tenant is invalid

**Validation Logic:**
```typescript
router.get('/google', async (req, res, next) => {
  const tenantId = req.query.tenantId;
  
  // Validate tenant ID
  if (!tenantId) {
    return res.redirect('/login?error=invalid_tenant');
  }
  
  // Check tenant exists and is active
  const tenant = await db.collection('tenants').findOne({ 
    tenantId, 
    status: 'active' 
  });
  
  if (!tenant) {
    return res.redirect('/login?error=invalid_tenant');
  }
  
  // Store in session for callback
  req.session.pendingTenantId = tenantId;
  
  // Proceed with OAuth
  passport.authenticate('google', { scope: ['profile', 'email'] })(req, res, next);
});
```

#### 2. auth.ts - Google OAuth Callback
**Enhanced Tenant Validation:**
- Validates user's tenant matches the pending tenant ID from session
- Returns tenant_mismatch error if mismatch detected
- Clears session data after validation

**Security Flow:**
```typescript
router.get('/google/callback', async (req, res) => {
  const user = req.user;
  const pendingTenantId = req.session?.pendingTenantId;
  
  // Validate tenant match
  if (pendingTenantId && user.tenantId !== pendingTenantId) {
    req.session.pendingTenantId = undefined;
    return res.redirect('/login?error=tenant_mismatch');
  }
  
  // Clear session
  req.session.pendingTenantId = undefined;
  
  // Generate token and redirect to dashboard
  const token = jwt.sign({...}, JWT_SECRET, { expiresIn: '24h' });
  res.cookie('token', token, { httpOnly: true });
  res.redirect('/dashboard');
});
```

#### 3. express-session.d.ts (New File)
**Type Definitions:**
- Added TypeScript type definition for session data
- Defines `pendingTenantId` property on SessionData

## Security Enhancements

### 1. Tenant Validation Before OAuth
- Prevents invalid tenant IDs from initiating OAuth flow
- Reduces unnecessary OAuth redirects
- Provides immediate feedback to users

### 2. Session-Based Tenant Verification
- Tenant ID stored in server session (not client-side)
- Validated during OAuth callback
- Prevents tenant ID manipulation

### 3. Error Handling
Multiple error states with clear messages:
- `invalid_tenant`: Tenant ID doesn't exist or inactive
- `tenant_mismatch`: User's tenant doesn't match requested tenant
- `oauth_failed`: OAuth authentication failed
- `oauth_callback_failed`: OAuth callback error

## User Experience Flow

### Scenario 1: Direct Login to Dashboard
```
User navigates to: /login?tenantId=ten-acme-ca-90210
User logs in successfully
Redirected to: /dashboard
```

### Scenario 2: Accessing Specific Page
```
User navigates to: /products
Not authenticated → ProtectedRoute kicks in
Redirected to: /login?redirect=%2Fproducts
User logs in successfully  
Redirected to: /products (intended destination)
```

### Scenario 3: Accessing Page with Query Params
```
User navigates to: /customers?status=active&page=2
Not authenticated → ProtectedRoute kicks in
Redirected to: /login?redirect=%2Fcustomers%3Fstatus%3Dactive%26page%3D2
User logs in successfully
Redirected to: /customers?status=active&page=2 (preserves all params)
```

### Scenario 4: Invalid Tenant ID
```
User enters tenant: ten-invalid-123
Clicks "Sign in with Google"
Backend validates tenant → Not found
Redirected to: /login?error=invalid_tenant
Error displayed: "Invalid tenant ID. Please check and try again"
```

### Scenario 5: Tenant Mismatch (OAuth)
```
User's account tenant: ten-acme-ca-90210
Login attempt tenant: ten-other-ny-10001
OAuth succeeds but tenant validation fails
Redirected to: /login?error=tenant_mismatch
Error displayed: "Your account does not belong to the specified tenant"
```

## Testing

### Test Cases

#### 1. Valid Tenant - Email Login
```bash
# Prerequisites
- Valid tenant ID: dev-tenant-001
- Valid user credentials

# Steps
1. Go to /login?tenantId=dev-tenant-001
2. Enter email and password
3. Click "Sign In"

# Expected Result
✓ Login successful
✓ Redirected to /dashboard
```

#### 2. Valid Tenant - OAuth Login
```bash
# Prerequisites  
- Valid tenant ID: dev-tenant-001
- Google OAuth configured

# Steps
1. Go to /login?tenantId=dev-tenant-001
2. Click "Sign in with Google"
3. Complete Google OAuth

# Expected Result
✓ Tenant validated before OAuth redirect
✓ OAuth succeeds
✓ Tenant validated in callback
✓ Redirected to /dashboard
```

#### 3. Invalid Tenant - OAuth Login
```bash
# Prerequisites
- Invalid tenant ID: ten-nonexistent-123

# Steps
1. Go to /login?tenantId=ten-nonexistent-123
2. Click "Sign in with Google"

# Expected Result
✓ No OAuth redirect
✓ Immediately redirected to /login?error=invalid_tenant
✓ Error message displayed
```

#### 4. Protected Route Redirect
```bash
# Prerequisites
- User not authenticated
- Target: /products

# Steps
1. Navigate to /products
2. Automatically redirected to login
3. Enter credentials for valid tenant
4. Login successfully

# Expected Result
✓ Redirected to /login?redirect=%2Fproducts
✓ After login, redirected to /products (not /dashboard)
```

#### 5. Tenant Mismatch - OAuth
```bash
# Prerequisites
- User account tenant: ten-acme-ca-90210
- Login attempt tenant: ten-other-ny-10001

# Steps
1. Go to /login?tenantId=ten-other-ny-10001
2. Click "Sign in with Google"
3. Complete OAuth with account from ten-acme-ca-90210

# Expected Result
✓ OAuth succeeds
✓ Backend detects tenant mismatch
✓ Redirected to /login?error=tenant_mismatch
✓ Error message displayed
```

## Files Modified

### Frontend
- [Login.tsx](../frontend/src/pages/Login.tsx)
  - Store and use redirect URL from query params
  - Added invalid_tenant error handling
  - Redirect to intended URL after login

- [ProtectedRoute.tsx](../frontend/src/components/ProtectedRoute.tsx)
  - Capture current URL when redirecting to login
  - Include full path and query parameters

- [AuthContext.tsx](../frontend/src/context/AuthContext.tsx)
  - Pass tenant ID as query parameter for OAuth

### Backend
- [auth.ts](../backend-node/src/routes/auth.ts)
  - Validate tenant before OAuth redirect
  - Store tenant in session
  - Validate tenant in OAuth callback
  - Enhanced error messages

- [express-session.d.ts](../backend-node/src/types/express-session.d.ts) (New)
  - TypeScript type definitions for session

## Environment Variables
No new environment variables required. Uses existing:
- `CLIENT_URL`: Frontend URL for redirects
- `JWT_SECRET`: JWT token signing

## Security Considerations

1. **Tenant Isolation**: Prevents users from accessing other tenants' data
2. **Session Security**: Tenant ID stored server-side in session
3. **Early Validation**: Validates tenant before OAuth flow
4. **Clear Error Messages**: Helps users understand authentication failures
5. **URL Preservation**: Maintains intended destination after login

## Future Enhancements

- [ ] Add tenant selection UI for users with multiple tenants
- [ ] Remember last used tenant per user
- [ ] Add tenant domain validation for OAuth
- [ ] Implement tenant switching without logout
- [ ] Add audit logging for tenant access attempts
