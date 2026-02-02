# Tenant-First Login Flow with Keycloak

## Overview

This document describes the **tenant-first login flow** where users must identify their organization (tenant) before authentication. The system then routes them to the correct Keycloak realm for their organization.

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                     User Journey                                │
└─────────────────────────────────────────────────────────────────┘

Step 1: User provides tenant identifier
   ↓
   "acme-corp" OR "acmecorp.com" OR "acme" OR "user@acmecorp.com"
   ↓
Step 2: Backend looks up tenant in MongoDB
   ↓
   tenant-service → Tenant Collection → Find by ID/domain/alias
   ↓
Step 3: Determine Keycloak realm
   ↓
   Tenant record → keycloakRealm: "tenant-acme-corp"
   ↓
Step 4: Redirect to Keycloak realm
   ↓
   http://localhost:9999/realms/tenant-acme-corp/protocol/openid-connect/auth
   ↓
Step 5: User authenticates (username/password, Google, Microsoft)
   ↓
Step 6: Keycloak redirects back with authorization code
   ↓
Step 7: Backend exchanges code for tokens (realm-specific)
   ↓
Step 8: User logged in and associated with tenant
```

## MongoDB Tenant Model

### Tenant Schema

```typescript
interface ITenant {
  tenantId: string;           // Unique: 'acme-corp'
  name: string;               // Display: 'Acme Corporation'
  domain?: string;            // Primary: 'acmecorp.com'
  aliases?: string[];         // Alternatives: ['acme', 'acmecorp']
  
  keycloakRealm: string;      // 'tenant-acme-corp'
  keycloakEnabled: boolean;   // true/false
  
  allowedAuthMethods: string[]; // ['password', 'google', 'microsoft']
  status: 'active' | 'suspended' | 'inactive';
}
```

### Indexes

```javascript
// Primary lookups
tenantId (unique)
domain (unique, sparse)
aliases (array)

// Filtering
status
keycloakEnabled

// Compound
{ status: 1, keycloakEnabled: 1 }
```

### Example Tenant Documents

```javascript
{
  "_id": ObjectId("..."),
  "tenantId": "acme-corp",
  "name": "Acme Corporation",
  "domain": "acmecorp.com",
  "aliases": ["acme", "acmecorp"],
  "keycloakRealm": "tenant-acme-corp",
  "keycloakEnabled": true,
  "allowedAuthMethods": ["password", "google", "microsoft"],
  "status": "active",
  "createdAt": ISODate("..."),
  "updatedAt": ISODate("...")
}

{
  "_id": ObjectId("..."),
  "tenantId": "techstart",
  "name": "TechStart Inc.",
  "domain": "techstart.io",
  "aliases": ["techstart"],
  "keycloakRealm": "tenant-techstart",
  "keycloakEnabled": true,
  "allowedAuthMethods": ["password", "google"],
  "status": "active"
}
```

## API Endpoints

### 1. Tenant Lookup

**POST** `/api/auth/tenant/lookup`

Lookup tenant by identifier, domain, or alias.

**Request:**
```json
{
  "identifier": "acme-corp"
}
```

**Response (Success):**
```json
{
  "success": true,
  "tenant": {
    "tenantId": "acme-corp",
    "name": "Acme Corporation",
    "keycloakRealm": "tenant-acme-corp",
    "allowedAuthMethods": ["password", "google", "microsoft"]
  }
}
```

**Response (Not Found):**
```json
{
  "success": false,
  "error": "Tenant not found"
}
```

**Examples:**
```bash
# By tenant ID
curl -X POST http://localhost:5000/api/auth/tenant/lookup \
  -H "Content-Type: application/json" \
  -d '{"identifier": "acme-corp"}'

# By domain
curl -X POST http://localhost:5000/api/auth/tenant/lookup \
  -H "Content-Type: application/json" \
  -d '{"identifier": "acmecorp.com"}'

# By alias
curl -X POST http://localhost:5000/api/auth/tenant/lookup \
  -H "Content-Type: application/json" \
  -d '{"identifier": "acme"}'
```

### 2. Tenant Suggestion from Email

**POST** `/api/auth/tenant/suggest`

Extract domain from email and suggest tenant.

**Request:**
```json
{
  "email": "user@acmecorp.com"
}
```

**Response:**
```json
{
  "success": true,
  "tenant": {
    "tenantId": "acme-corp",
    "name": "Acme Corporation",
    "keycloakRealm": "tenant-acme-corp",
    "allowedAuthMethods": ["password", "google", "microsoft"]
  }
}
```

### 3. Initiate Login with Tenant Context

**GET** `/api/auth/tenant/login`

Redirects to Keycloak realm for the selected tenant.

**Prerequisites:**
- Must have tenant context in session (from `/tenant/lookup`)

**Flow:**
1. User selects tenant → `/tenant/lookup` stores in session
2. User clicks "Login" → Redirects to `/tenant/login`
3. Backend reads realm from session → Redirects to Keycloak

### 4. OAuth Callback

**GET** `/api/auth/tenant/callback`

Handles OAuth callback from any Keycloak realm.

**Flow:**
1. Keycloak redirects here with `code` and `state`
2. Backend retrieves realm from session
3. Exchanges code for tokens (realm-specific)
4. Creates/updates user in MongoDB
5. Links user to tenant
6. Creates local session
7. Redirects to application

### 5. Get Tenant Context

**GET** `/api/auth/tenant/context`

Check if tenant has been selected.

**Response:**
```json
{
  "hasTenant": true,
  "tenantId": "acme-corp",
  "keycloakRealm": "tenant-acme-corp"
}
```

### 6. Clear Tenant Context

**POST** `/api/auth/tenant/clear`

Clear tenant selection (start over).

## Frontend Implementation

### Step 1: Tenant Selection UI

```typescript
// LoginPage.tsx
import React, { useState } from 'react';
import axios from 'axios';

const TenantSelectionPage = () => {
  const [identifier, setIdentifier] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [tenant, setTenant] = useState(null);

  const handleLookup = async () => {
    setLoading(true);
    setError('');

    try {
      const response = await axios.post('/api/auth/tenant/lookup', {
        identifier
      });

      if (response.data.success) {
        setTenant(response.data.tenant);
      } else {
        setError(response.data.error || 'Tenant not found');
      }
    } catch (err: any) {
      setError(err.response?.data?.error || 'Lookup failed');
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = () => {
    // Redirect to tenant-aware login
    window.location.href = '/api/auth/tenant/login';
  };

  return (
    <div className="tenant-selection">
      <h1>Sign In</h1>
      <p>Enter your organization identifier</p>

      {!tenant ? (
        <div>
          <input
            type="text"
            placeholder="Organization ID or domain"
            value={identifier}
            onChange={(e) => setIdentifier(e.target.value)}
          />
          <button onClick={handleLookup} disabled={loading}>
            {loading ? 'Looking up...' : 'Continue'}
          </button>
          {error && <div className="error">{error}</div>}
          
          <div className="help-text">
            <p>Examples:</p>
            <ul>
              <li>acme-corp</li>
              <li>acmecorp.com</li>
              <li>acme</li>
            </ul>
          </div>
        </div>
      ) : (
        <div>
          <h2>{tenant.name}</h2>
          <p>Tenant ID: {tenant.tenantId}</p>
          
          <div className="auth-methods">
            <h3>Choose sign-in method:</h3>
            
            {tenant.allowedAuthMethods.includes('password') && (
              <button onClick={handleLogin}>
                Sign in with Email/Password
              </button>
            )}
            
            {tenant.allowedAuthMethods.includes('google') && (
              <button onClick={handleLogin}>
                Sign in with Google
              </button>
            )}
            
            {tenant.allowedAuthMethods.includes('microsoft') && (
              <button onClick={handleLogin}>
                Sign in with Microsoft
              </button>
            )}
          </div>
          
          <button onClick={() => setTenant(null)}>
            Change Organization
          </button>
        </div>
      )}
    </div>
  );
};
```

### Step 2: Email-Based Tenant Suggestion

```typescript
const EmailBasedTenantLookup = () => {
  const [email, setEmail] = useState('');
  
  const handleEmailSubmit = async () => {
    try {
      const response = await axios.post('/api/auth/tenant/suggest', {
        email
      });
      
      if (response.data.success) {
        // Tenant found, proceed to login
        setTenant(response.data.tenant);
      } else {
        // Tenant not found, ask for manual entry
        setShowManualEntry(true);
      }
    } catch (error) {
      console.error('Tenant suggestion failed:', error);
    }
  };
  
  return (
    <div>
      <input
        type="email"
        placeholder="Enter your work email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
      />
      <button onClick={handleEmailSubmit}>Continue</button>
      
      <p>We'll find your organization automatically</p>
    </div>
  );
};
```

## Tenant Lookup Service

### Lookup Logic

```typescript
// tenant.service.ts

/**
 * Multi-strategy tenant lookup:
 * 1. Exact match on tenantId
 * 2. Exact match on domain
 * 3. Match in aliases array
 */
async function lookupTenant(identifier: string): Promise<TenantLookupResult> {
  const normalized = identifier.toLowerCase().trim();
  
  const tenant = await Tenant.findOne({
    $or: [
      { tenantId: normalized },
      { domain: normalized },
      { aliases: normalized }
    ],
    status: 'active',
    keycloakEnabled: true
  });
  
  if (!tenant) {
    return { success: false, error: 'Tenant not found' };
  }
  
  return {
    success: true,
    tenant: {
      tenantId: tenant.tenantId,
      name: tenant.name,
      keycloakRealm: tenant.keycloakRealm,
      allowedAuthMethods: tenant.allowedAuthMethods
    }
  };
}
```

### Domain Extraction from Email

```typescript
function extractDomainFromEmail(email: string): string | null {
  const match = email.match(/@([a-z0-9.-]+\.[a-z]{2,})$/i);
  return match ? match[1].toLowerCase() : null;
}

async function suggestTenantFromEmail(email: string) {
  const domain = extractDomainFromEmail(email);
  
  if (!domain) {
    return { success: false, error: 'Invalid email format' };
  }
  
  return await lookupTenant(domain);
}
```

## Realm Routing Logic

### Dynamic Keycloak Client Creation

```typescript
// tenant-auth.ts

const keycloak = new KeycloakOIDCClient({
  url: process.env.KEYCLOAK_URL,
  realm: tenantContext.keycloakRealm,  // From session
  clientId: process.env.KEYCLOAK_CLIENT_ID,
  clientSecret: process.env.KEYCLOAK_CLIENT_SECRET,
  redirectUri: process.env.KEYCLOAK_REDIRECT_URI
});
```

### Session Management

**Tenant Context in Session:**

```typescript
req.session.tenantContext = {
  tenantId: 'acme-corp',
  keycloakRealm: 'tenant-acme-corp',
  timestamp: Date.now()
};
```

**Auth Context in Session:**

```typescript
req.session.keycloakAuth = {
  codeVerifier: '...',
  state: '...',
  realm: 'tenant-acme-corp',  // Which realm to use
  tenantId: 'acme-corp',
  returnTo: '/'
};
```

## User-Tenant Association

### User Model Update

```typescript
interface IUser {
  keycloakSub: string;   // Keycloak subject (unique)
  email: string;
  tenantId: string;      // Associated tenant
  // ... other fields
}
```

### Just-in-Time Provisioning with Tenant

```typescript
// During callback
const user = new User({
  keycloakSub: userInfo.sub,
  email: userInfo.email,
  firstName: userInfo.given_name,
  lastName: userInfo.family_name,
  tenantId: tenantId,  // From session
  role: 'user',
  isActive: true
});
await user.save();
```

## Seeding Tenants

### Run Seed Script

```bash
cd product-management/backend-node
npx ts-node ../../scripts/keycloak/seed-tenants.ts
```

### Manual Creation

```javascript
// MongoDB shell or script
db.tenants.insertOne({
  tenantId: "acme-corp",
  name: "Acme Corporation",
  domain: "acmecorp.com",
  aliases: ["acme", "acmecorp"],
  keycloakRealm: "tenant-acme-corp",
  keycloakEnabled: true,
  allowedAuthMethods: ["password", "google", "microsoft"],
  status: "active",
  createdAt: new Date(),
  updatedAt: new Date()
});
```

## Testing

### 1. Seed Tenants

```bash
npx ts-node scripts/keycloak/seed-tenants.ts
```

### 2. Test Tenant Lookup

```bash
# By tenant ID
curl -X POST http://localhost:5000/api/auth/tenant/lookup \
  -H "Content-Type: application/json" \
  -d '{"identifier": "acme-corp"}'

# By domain
curl -X POST http://localhost:5000/api/auth/tenant/lookup \
  -H "Content-Type: application/json" \
  -d '{"identifier": "acmecorp.com"}'

# By alias
curl -X POST http://localhost:5000/api/auth/tenant/lookup \
  -H "Content-Type: application/json" \
  -d '{"identifier": "acme"}'
```

### 3. Test Email Suggestion

```bash
curl -X POST http://localhost:5000/api/auth/tenant/suggest \
  -H "Content-Type: application/json" \
  -d '{"email": "user@acmecorp.com"}'
```

### 4. Test Login Flow

1. Visit frontend login page
2. Enter "acme-corp" or "acmecorp.com"
3. Click Continue
4. Should show "Acme Corporation" with auth methods
5. Click "Sign in with Email/Password" (or Google/Microsoft)
6. Redirects to Keycloak realm `tenant-acme-corp`
7. Authenticate
8. Redirects back to application
9. User logged in and associated with tenant

## Troubleshooting

### Issue: "Tenant not found"

**Cause:** Tenant doesn't exist in database

**Solution:**
```bash
# Check tenants
mongo ai_platform
db.tenants.find()

# Seed tenants
npx ts-node scripts/keycloak/seed-tenants.ts
```

### Issue: "Tenant context missing"

**Cause:** Session expired or tenant lookup not performed

**Solution:**
- Ensure `/tenant/lookup` is called before `/tenant/login`
- Check session middleware is configured
- Verify session cookie is set

### Issue: "Realm not found in Keycloak"

**Cause:** Keycloak realm doesn't exist

**Solution:**
```bash
# Create realm in Keycloak
.\scripts\keycloak\setup-keycloak.ps1 -RealmName "tenant-acme-corp"
```

### Issue: Wrong realm redirect

**Cause:** Session contains incorrect realm

**Solution:**
```bash
# Clear session
curl -X POST http://localhost:5000/api/auth/tenant/clear

# Start over from tenant lookup
```

## Security Considerations

### 1. Tenant Enumeration Prevention

**Don't reveal which tenants exist:**

```typescript
// ❌ Bad - reveals tenant existence
if (!tenant) {
  return res.status(404).json({ error: 'Tenant not found' });
}

// ✅ Better - generic message
if (!tenant) {
  return res.status(404).json({ 
    error: 'Organization not found. Please check your identifier.' 
  });
}
```

### 2. Rate Limiting

Prevent brute-force tenant discovery:

```typescript
import rateLimit from 'express-rate-limit';

const tenantLookupLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // 10 requests per window
  message: 'Too many lookup attempts, please try again later'
});

router.post('/tenant/lookup', tenantLookupLimiter, lookupHandler);
```

### 3. Session Security

- Store tenant context in server-side session
- Set short expiration (5 minutes)
- Validate state parameter (CSRF protection)
- Use HTTPS in production

### 4. Input Validation

```typescript
function validateTenantIdentifier(identifier: string): boolean {
  // 2-50 characters, alphanumeric with hyphens
  const regex = /^[a-z0-9][a-z0-9-]{1,48}[a-z0-9]$/;
  return regex.test(identifier.toLowerCase());
}
```

## Production Checklist

- [ ] Seed all production tenants in MongoDB
- [ ] Create corresponding Keycloak realms for each tenant
- [ ] Configure social login per realm (Google, Microsoft)
- [ ] Enable rate limiting on tenant lookup endpoints
- [ ] Set up monitoring for failed lookups
- [ ] Configure session storage (Redis for distributed)
- [ ] Use HTTPS for all endpoints
- [ ] Set secure cookie flags
- [ ] Implement tenant enumeration protection
- [ ] Test all tenant lookup strategies
- [ ] Document tenant onboarding process

---

**Status:** Production-ready
**Last Updated:** January 28, 2026
