# Keycloak Identity Layer Implementation Guide

## Overview

This guide implements Keycloak as the **ONLY Identity Provider (IdP)** for the AI Services Platform. Keycloak handles all authentication, SSO, social login, and token issuance using **Authorization Code + PKCE** flow.

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                    Keycloak IdP (Port 9999)                      │
│                    http://localhost:9999/                       │
│                                                                   │
│  • Multi-Realm Architecture (one realm per tenant)               │
│  • Social Login (Google, Microsoft, GitHub, etc.)               │
│  • User Federation (LDAP, Active Directory optional)            │
│  • OIDC Authorization Code + PKCE                               │
│  • Token Issuance (ID Token, Access Token, Refresh Token)      │
│  • User Management (NO application roles stored here)           │
│  • Session Management & SSO                                     │
└─────────────────────────────────────────────────────────────────┘
                              │
                              │ OIDC + PKCE
                              │
                ┌─────────────┴─────────────┐
                │                           │
                ▼                           ▼
┌───────────────────────────┐ ┌───────────────────────────┐
│ product-management        │ │ prompt-management         │
│ OIDC Client (Port 5000)   │ │ OIDC Client (Port 5001)   │
│                           │ │                           │
│ • Redirect to Keycloak    │ │ • Redirect to Keycloak    │
│ • Token Validation (JWKS) │ │ • Token Validation (JWKS) │
│ • User Mapping (sub)      │ │ • User Mapping (sub)      │
│ • Application Roles       │ │ • Application Roles       │
│ • Subscription Logic      │ │ • Subscription Logic      │
└───────────────────────────┘ └───────────────────────────┘
```

## Key Principles

1. **Keycloak is the ONLY IdP** - No custom auth logic in applications
2. **Authorization Code + PKCE** - Most secure OAuth2 flow for SPAs and confidential clients
3. **Multi-Tenant via Realms** - Each tenant has its own Keycloak realm
4. **No Business Logic in Keycloak** - Application roles, subscriptions, and business rules stay in applications
5. **Token Validation via JWKS** - Applications validate Keycloak tokens using public keys

## Keycloak Realm Configuration

### Default Realm Structure

Each tenant gets its own realm with this naming convention:
- **Master Realm**: `master` (admin only, don't use for users)
- **Tenant Realms**: `tenant-{tenantId}` (e.g., `tenant-acme-corp`, `tenant-default`)

### Realm Settings

```javascript
{
  "realm": "tenant-default",
  "enabled": true,
  "sslRequired": "none",  // Development only! Use "external" in production
  "registrationAllowed": false,  // Disable self-registration
  "loginWithEmailAllowed": true,
  "duplicateEmailsAllowed": false,
  "resetPasswordAllowed": true,
  "editUsernameAllowed": false,
  "bruteForceProtected": true,
  
  // Token settings
  "accessTokenLifespan": 900,  // 15 minutes
  "accessTokenLifespanForImplicitFlow": 900,
  "ssoSessionIdleTimeout": 1800,  // 30 minutes
  "ssoSessionMaxLifespan": 36000,  // 10 hours
  "offlineSessionIdleTimeout": 2592000,  // 30 days
  "accessCodeLifespan": 60,  // 1 minute
  "accessCodeLifespanUserAction": 300,  // 5 minutes
  
  // Security
  "passwordPolicy": "length(8) and digits(1) and lowerCase(1) and upperCase(1)",
  "otpPolicyType": "totp",
  "otpPolicyAlgorithm": "HmacSHA1",
  "otpPolicyDigits": 6,
  "otpPolicyPeriod": 30
}
```

## OIDC Client Configuration

### Product Management Client

```javascript
{
  "clientId": "product-management",
  "name": "Product Management Application",
  "description": "AI Services Product Management Console",
  "rootUrl": "http://localhost:5173",
  "baseUrl": "/",
  "enabled": true,
  "clientAuthenticatorType": "client-secret",
  "secret": "YOUR_CLIENT_SECRET_HERE",  // Generate securely
  
  // OAuth2 Settings
  "protocol": "openid-connect",
  "publicClient": false,  // Confidential client (has backend)
  "standardFlowEnabled": true,  // Authorization Code flow
  "implicitFlowEnabled": false,  // Disable implicit flow
  "directAccessGrantsEnabled": false,  // Disable direct access
  "serviceAccountsEnabled": false,
  
  // PKCE
  "attributes": {
    "pkce.code.challenge.method": "S256",
    "oauth2.device.authorization.grant.enabled": "false",
    "oidc.ciba.grant.enabled": "false"
  },
  
  // Redirect URIs
  "redirectUris": [
    "http://localhost:5173/auth/callback",
    "http://localhost:5000/api/auth/callback"
  ],
  "webOrigins": [
    "http://localhost:5173",
    "http://localhost:5000"
  ],
  
  // Scopes
  "defaultClientScopes": [
    "profile",
    "email",
    "roles",
    "web-origins"
  ],
  "optionalClientScopes": [
    "address",
    "phone",
    "offline_access"
  ]
}
```

### Prompt Management Client

```javascript
{
  "clientId": "prompt-management",
  "name": "Prompt Management Application",
  "description": "AI Services Prompt Management Console",
  "rootUrl": "http://localhost:3002",
  "baseUrl": "/",
  "enabled": true,
  "clientAuthenticatorType": "client-secret",
  "secret": "YOUR_CLIENT_SECRET_HERE",
  
  "protocol": "openid-connect",
  "publicClient": false,
  "standardFlowEnabled": true,
  "implicitFlowEnabled": false,
  "directAccessGrantsEnabled": false,
  
  "attributes": {
    "pkce.code.challenge.method": "S256"
  },
  
  "redirectUris": [
    "http://localhost:3002/auth/callback",
    "http://localhost:5001/api/auth/callback"
  ],
  "webOrigins": [
    "http://localhost:3002",
    "http://localhost:5001"
  ],
  
  "defaultClientScopes": [
    "profile",
    "email",
    "roles",
    "web-origins"
  ]
}
```

## Social Identity Providers

### Google OAuth2 Setup

1. In Keycloak Admin Console → Realm → Identity Providers → Add Provider → Google
2. Configure:
   - **Client ID**: From Google Cloud Console
   - **Client Secret**: From Google Cloud Console
   - **Default Scopes**: `openid profile email`
   - **Store Tokens**: ON (if you need Google API access)
   - **Trust Email**: ON
   - **First Login Flow**: `first broker login`

3. Google Cloud Console Setup:
   - Authorized Redirect URIs: `http://localhost:9999/realms/{realm-name}/broker/google/endpoint`

### Microsoft Azure AD Setup

1. In Keycloak → Identity Providers → Add Provider → Microsoft
2. Configure:
   - **Application ID**: From Azure AD App Registration
   - **Client Secret**: From Azure AD
   - **Default Scopes**: `openid profile email`
   - **Trust Email**: ON

3. Azure AD Portal Setup:
   - Redirect URI: `http://localhost:9999/realms/{realm-name}/broker/microsoft/endpoint`

## User Mapping & Identity Linking

### Subject (sub) Claim

Keycloak generates a UUID for each user in a realm. This becomes the `sub` claim in tokens:

```json
{
  "sub": "f7a9b6c4-3d2e-4f1a-8b9c-5e6d7f8a9b0c",
  "email": "user@example.com",
  "email_verified": true,
  "name": "John Doe",
  "given_name": "John",
  "family_name": "Doe",
  "preferred_username": "user@example.com"
}
```

### Application User Mapping

Applications should:
1. **Store Keycloak `sub`** in your User model as `keycloakSub` or `oidcSub`
2. **Use `sub` as primary identifier** for user linking
3. **Map on first login** (Just-in-Time provisioning)

Example User Model:

```typescript
interface User {
  _id: ObjectId;
  keycloakSub: string;  // Keycloak sub claim (unique, immutable)
  email: string;
  firstName?: string;
  lastName?: string;
  
  // Application-specific fields (NOT in Keycloak)
  role: 'user' | 'admin' | 'super_admin';
  tenantId: string;
  subscriptionId?: string;
  subscriptionStatus?: string;
  subscriptionTier?: string;
}
```

## OIDC Implementation in Applications

### Environment Variables

**product-management/.env**
```env
# Keycloak Configuration
KEYCLOAK_URL=http://localhost:9999
KEYCLOAK_REALM=tenant-default
KEYCLOAK_CLIENT_ID=product-management
KEYCLOAK_CLIENT_SECRET=your-secret-here

# OIDC Endpoints (auto-discovered)
OIDC_ISSUER=http://localhost:9999/realms/tenant-default
OIDC_AUTHORIZATION_ENDPOINT=${OIDC_ISSUER}/protocol/openid-connect/auth
OIDC_TOKEN_ENDPOINT=${OIDC_ISSUER}/protocol/openid-connect/token
OIDC_USERINFO_ENDPOINT=${OIDC_ISSUER}/protocol/openid-connect/userinfo
OIDC_JWKS_URI=${OIDC_ISSUER}/protocol/openid-connect/certs

# Redirect URIs
OIDC_REDIRECT_URI=http://localhost:5000/api/auth/callback
OIDC_POST_LOGOUT_REDIRECT_URI=http://localhost:5173
```

### OIDC Discovery

Keycloak provides OIDC discovery at:
```
http://localhost:9999/realms/{realm}/.well-known/openid-configuration
```

Example response:
```json
{
  "issuer": "http://localhost:9999/realms/tenant-default",
  "authorization_endpoint": "http://localhost:9999/realms/tenant-default/protocol/openid-connect/auth",
  "token_endpoint": "http://localhost:9999/realms/tenant-default/protocol/openid-connect/token",
  "userinfo_endpoint": "http://localhost:9999/realms/tenant-default/protocol/openid-connect/userinfo",
  "jwks_uri": "http://localhost:9999/realms/tenant-default/protocol/openid-connect/certs",
  "end_session_endpoint": "http://localhost:9999/realms/tenant-default/protocol/openid-connect/logout",
  "response_types_supported": ["code"],
  "subject_types_supported": ["public"],
  "id_token_signing_alg_values_supported": ["RS256"],
  "code_challenge_methods_supported": ["plain", "S256"]
}
```

## Authorization Code + PKCE Flow

### Step 1: Generate PKCE Challenge

```typescript
import crypto from 'crypto';

function generatePKCE() {
  // Generate code verifier (43-128 characters)
  const codeVerifier = crypto.randomBytes(32).toString('base64url');
  
  // Generate code challenge (SHA256 hash)
  const codeChallenge = crypto
    .createHash('sha256')
    .update(codeVerifier)
    .digest('base64url');
  
  return {
    codeVerifier,
    codeChallenge,
    codeChallengeMethod: 'S256'
  };
}
```

### Step 2: Initiate Authorization

```typescript
// Backend route: GET /api/auth/login
router.get('/login', (req, res) => {
  const { codeVerifier, codeChallenge } = generatePKCE();
  const state = crypto.randomBytes(16).toString('hex');
  
  // Store in session
  req.session.oidc = {
    codeVerifier,
    state
  };
  
  const authUrl = new URL(`${process.env.OIDC_AUTHORIZATION_ENDPOINT}`);
  authUrl.searchParams.set('client_id', process.env.KEYCLOAK_CLIENT_ID!);
  authUrl.searchParams.set('response_type', 'code');
  authUrl.searchParams.set('scope', 'openid profile email');
  authUrl.searchParams.set('redirect_uri', process.env.OIDC_REDIRECT_URI!);
  authUrl.searchParams.set('state', state);
  authUrl.searchParams.set('code_challenge', codeChallenge);
  authUrl.searchParams.set('code_challenge_method', 'S256');
  
  res.redirect(authUrl.toString());
});
```

### Step 3: Handle Callback

```typescript
// Backend route: GET /api/auth/callback
router.get('/callback', async (req, res) => {
  const { code, state } = req.query;
  
  // Verify state
  if (state !== req.session.oidc?.state) {
    return res.status(400).json({ error: 'Invalid state' });
  }
  
  const { codeVerifier } = req.session.oidc;
  delete req.session.oidc;
  
  try {
    // Exchange code for tokens
    const tokenResponse = await axios.post(
      process.env.OIDC_TOKEN_ENDPOINT!,
      new URLSearchParams({
        grant_type: 'authorization_code',
        code: code as string,
        redirect_uri: process.env.OIDC_REDIRECT_URI!,
        client_id: process.env.KEYCLOAK_CLIENT_ID!,
        client_secret: process.env.KEYCLOAK_CLIENT_SECRET!,
        code_verifier: codeVerifier
      }),
      {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
      }
    );
    
    const { access_token, id_token, refresh_token } = tokenResponse.data;
    
    // Decode ID token to get user info
    const idTokenPayload = jwt.decode(id_token) as any;
    
    // Find or create user
    let user = await User.findOne({ keycloakSub: idTokenPayload.sub });
    
    if (!user) {
      user = await User.create({
        keycloakSub: idTokenPayload.sub,
        email: idTokenPayload.email,
        firstName: idTokenPayload.given_name,
        lastName: idTokenPayload.family_name,
        emailVerified: idTokenPayload.email_verified,
        tenantId: 'default', // Assign based on realm or logic
        role: 'user'
      });
    }
    
    // Create local session
    req.session.userId = user._id;
    req.session.keycloakAccessToken = access_token;
    req.session.keycloakRefreshToken = refresh_token;
    
    res.redirect('http://localhost:5173/dashboard');
  } catch (error) {
    console.error('Token exchange failed:', error);
    res.redirect('/login?error=auth_failed');
  }
});
```

### Step 4: Token Validation Middleware

```typescript
import jwt from 'jsonwebtoken';
import jwksClient from 'jwks-rsa';

const jwks = jwksClient({
  jwksUri: process.env.OIDC_JWKS_URI!,
  cache: true,
  cacheMaxAge: 86400000 // 24 hours
});

function getKey(header: any, callback: any) {
  jwks.getSigningKey(header.kid, (err, key) => {
    if (err) {
      callback(err);
    } else {
      const signingKey = key?.getPublicKey();
      callback(null, signingKey);
    }
  });
}

export async function validateKeycloakToken(token: string): Promise<any> {
  return new Promise((resolve, reject) => {
    jwt.verify(
      token,
      getKey,
      {
        issuer: process.env.OIDC_ISSUER,
        audience: process.env.KEYCLOAK_CLIENT_ID,
        algorithms: ['RS256']
      },
      (err, decoded) => {
        if (err) {
          reject(err);
        } else {
          resolve(decoded);
        }
      }
    );
  });
}

// Middleware
export async function requireAuth(req: Request, res: Response, next: NextFunction) {
  const token = req.session.keycloakAccessToken;
  
  if (!token) {
    return res.status(401).json({ error: 'Not authenticated' });
  }
  
  try {
    const payload = await validateKeycloakToken(token);
    
    // Attach user to request
    req.user = await User.findOne({ keycloakSub: payload.sub });
    
    if (!req.user) {
      return res.status(401).json({ error: 'User not found' });
    }
    
    next();
  } catch (error) {
    // Token expired or invalid - try to refresh
    if (req.session.keycloakRefreshToken) {
      try {
        const refreshed = await refreshAccessToken(req.session.keycloakRefreshToken);
        req.session.keycloakAccessToken = refreshed.access_token;
        req.session.keycloakRefreshToken = refreshed.refresh_token;
        
        // Retry validation
        const payload = await validateKeycloakToken(refreshed.access_token);
        req.user = await User.findOne({ keycloakSub: payload.sub });
        next();
      } catch (refreshError) {
        return res.status(401).json({ error: 'Token refresh failed' });
      }
    } else {
      return res.status(401).json({ error: 'Invalid token' });
    }
  }
}
```

## Silent Authentication (prompt=none)

For SSO detection across applications:

```typescript
// Frontend: Check if user is authenticated in Keycloak
async function checkKeycloakSession() {
  const { codeVerifier, codeChallenge } = generatePKCE();
  const state = generateRandomString();
  
  // Store for callback
  sessionStorage.setItem('oidc_state', state);
  sessionStorage.setItem('oidc_code_verifier', codeVerifier);
  
  const authUrl = new URL(`${KEYCLOAK_URL}/realms/${REALM}/protocol/openid-connect/auth`);
  authUrl.searchParams.set('client_id', CLIENT_ID);
  authUrl.searchParams.set('response_type', 'code');
  authUrl.searchParams.set('scope', 'openid');
  authUrl.searchParams.set('redirect_uri', REDIRECT_URI);
  authUrl.searchParams.set('state', state);
  authUrl.searchParams.set('code_challenge', codeChallenge);
  authUrl.searchParams.set('code_challenge_method', 'S256');
  authUrl.searchParams.set('prompt', 'none'); // Silent authentication
  
  // Use iframe to avoid full page redirect
  const iframe = document.createElement('iframe');
  iframe.style.display = 'none';
  iframe.src = authUrl.toString();
  document.body.appendChild(iframe);
  
  // Listen for callback
  window.addEventListener('message', (event) => {
    if (event.data.type === 'keycloak_callback') {
      // Exchange code for tokens
      exchangeCodeForTokens(event.data.code);
    }
  });
}
```

## Logout Flow

### Single Logout (SLO)

```typescript
router.get('/logout', async (req, res) => {
  const postLogoutRedirectUri = 'http://localhost:5173';
  const idToken = req.session.keycloakIdToken; // Store this during login
  
  // Clear local session
  req.session.destroy((err) => {
    if (err) {
      console.error('Session destruction failed:', err);
    }
  });
  
  // Redirect to Keycloak logout
  const logoutUrl = new URL(`${process.env.OIDC_ISSUER}/protocol/openid-connect/logout`);
  logoutUrl.searchParams.set('post_logout_redirect_uri', postLogoutRedirectUri);
  if (idToken) {
    logoutUrl.searchParams.set('id_token_hint', idToken);
  }
  
  res.redirect(logoutUrl.toString());
});
```

## Multi-Tenant Implementation

### Realm Selection Strategy

**Option 1: Subdomain-based**
```
tenant1.yourapp.com → realm: tenant-tenant1
tenant2.yourapp.com → realm: tenant-tenant2
```

**Option 2: Path-based**
```
yourapp.com/tenant1/* → realm: tenant-tenant1
yourapp.com/tenant2/* → realm: tenant-tenant2
```

**Option 3: Database lookup**
```
User enters email → Lookup tenant → Redirect to correct realm
```

### Dynamic Realm Configuration

```typescript
async function getRealmForUser(email: string): Promise<string> {
  // Lookup user's tenant
  const user = await User.findOne({ email });
  
  if (user?.tenantId) {
    return `tenant-${user.tenantId}`;
  }
  
  // Default realm
  return 'tenant-default';
}

router.get('/login', async (req, res) => {
  const email = req.query.email as string;
  const realm = await getRealmForUser(email);
  
  const { codeVerifier, codeChallenge } = generatePKCE();
  const state = crypto.randomBytes(16).toString('hex');
  
  req.session.oidc = { codeVerifier, state, realm };
  
  const authUrl = new URL(`http://localhost:9999/realms/${realm}/protocol/openid-connect/auth`);
  // ... set parameters
  
  res.redirect(authUrl.toString());
});
```

## Security Best Practices

### 1. Token Storage

**✅ DO:**
- Store access tokens in HTTP-only cookies
- Use `SameSite=Strict` or `SameSite=Lax`
- Set `Secure=true` in production (HTTPS only)
- Store refresh tokens server-side only

**❌ DON'T:**
- Store tokens in localStorage (XSS vulnerability)
- Store tokens in sessionStorage
- Expose tokens to JavaScript

### 2. PKCE

**Always use PKCE** even for confidential clients:
- Protects against authorization code interception
- Required for public clients (SPAs, mobile apps)
- Recommended for all OAuth2 flows

### 3. State Parameter

**Always validate state**:
- Prevents CSRF attacks
- Generate cryptographically random state
- Verify state matches on callback

### 4. Token Validation

**Always validate tokens**:
- Verify signature using JWKS
- Check `iss` (issuer) claim
- Check `aud` (audience) claim
- Check `exp` (expiration) claim
- Check `nbf` (not before) claim if present

### 5. HTTPS in Production

**NEVER use HTTP in production**:
- Keycloak: `sslRequired: "external"`
- All redirects: HTTPS only
- Cookies: `Secure=true`

## Testing & Verification

### 1. Keycloak Admin Console

Access: `http://localhost:9999/admin`
- Login: `admin` / `admin`
- Check realm creation
- Verify client configuration
- Test user creation

### 2. OIDC Discovery

```bash
curl http://localhost:9999/realms/tenant-default/.well-known/openid-configuration
```

### 3. JWKS Endpoint

```bash
curl http://localhost:9999/realms/tenant-default/protocol/openid-connect/certs
```

### 4. Authorization Flow

1. Visit `http://localhost:5173`
2. Click "Login"
3. Redirect to Keycloak
4. Enter credentials
5. Redirect back with code
6. Exchange code for tokens
7. Verify user session

### 5. Token Introspection

```bash
curl -X POST http://localhost:9999/realms/tenant-default/protocol/openid-connect/token/introspect \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "token=YOUR_ACCESS_TOKEN" \
  -d "client_id=product-management" \
  -d "client_secret=YOUR_SECRET"
```

## Troubleshooting

### Issue: "Invalid redirect_uri"

**Solution:**
- Verify redirect URI in Keycloak client configuration
- Must match exactly (including trailing slash)
- Add all valid redirect URIs

### Issue: "Invalid code_verifier"

**Solution:**
- Ensure code_verifier is stored correctly in session
- Verify PKCE challenge generation
- Check code_challenge_method is S256

### Issue: "Token signature verification failed"

**Solution:**
- Verify JWKS URI is correct
- Check token `iss` claim matches expected issuer
- Ensure clock sync (token expiration)

### Issue: "CORS error"

**Solution:**
- Add application origin to Keycloak client's "Web Origins"
- Enable CORS in Keycloak realm settings
- Verify credentials: true in CORS config

## Migration from Existing auth-service

### Step 1: User Migration

Export users from existing auth-service and import to Keycloak:

```bash
# Export users from MongoDB
mongoexport --db ai_platform --collection users --out users.json

# Transform to Keycloak format
node scripts/transform-users.js

# Import to Keycloak
./kcadm.sh create users -r tenant-default -f users-keycloak.json
```

### Step 2: Update Applications

1. Update environment variables to use Keycloak
2. Replace custom auth logic with OIDC client
3. Update token validation to use Keycloak JWKS
4. Update user model to use `keycloakSub`

### Step 3: Deprecate auth-service

1. Stop auth-service
2. Remove auth-service routes from applications
3. Update documentation
4. Archive auth-service code

## Next Steps

1. ✅ Configure Keycloak realms
2. ✅ Register OIDC clients
3. ✅ Configure social providers
4. ✅ Update application code
5. ✅ Test authentication flows
6. ✅ Migrate existing users
7. ✅ Deploy to production

---

**Status**: Ready for implementation
**Last Updated**: January 28, 2026
