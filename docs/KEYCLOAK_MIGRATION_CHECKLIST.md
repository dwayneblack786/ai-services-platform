# Keycloak Migration Checklist

## Pre-Migration

- [x] **Keycloak Server Running** - `http://localhost:9999`
- [ ] **Realm Configuration Script Executed** - Run `.\scripts\keycloak\setup-keycloak.ps1`
- [ ] **Client Secrets Saved** - Copy secrets from `keycloak-secrets.txt`
- [ ] **Backup Existing User Data** - Export from current auth-service MongoDB

## Configuration Steps

### 1. Update User Model

Add Keycloak sub field to User model:

**File:** `product-management/backend-node/src/models/User.ts`

```typescript
export interface IUser extends Document {
  // Existing fields...
  keycloakSub?: string;  // Maps to Keycloak sub claim
  
  // Keep existing fields for backward compatibility
  oidcSub?: string;  // Old field - can migrate data to keycloakSub
}

// Add index
UserSchema.index({ keycloakSub: 1 }, { sparse: true, unique: true });
```

### 2. Run Database Migration

```javascript
// migration-script.js
db.users.updateMany(
  { keycloakSub: { $exists: false } },
  { $set: { keycloakSub: null } }
);

db.users.createIndex({ keycloakSub: 1 }, { sparse: true, unique: true });

// Optional: Migrate oidcSub to keycloakSub if you have existing SSO users
db.users.updateMany(
  { oidcSub: { $exists: true }, keycloakSub: null },
  [{ $set: { keycloakSub: "$oidcSub" } }]
);
```

### 3. Install Dependencies

**product-management/backend-node:**

```bash
npm install jwks-rsa
```

**prompt-management/backend:**

```bash
npm install jwks-rsa
```

### 4. Copy Shared Files

Copy these files to your applications:

- `shared/keycloak-client.ts` → Import in your backend
- `shared/keycloak-middleware.ts` → Use in Express routes

### 5. Update Environment Variables

**Product Management:**
```bash
cp .env.keycloak.example .env
# Edit .env and add your client secret from keycloak-secrets.txt
```

**Prompt Management:**
```bash
# Create similar .env with:
# KEYCLOAK_CLIENT_ID=prompt-management
# KEYCLOAK_CLIENT_SECRET=<your-secret>
# KEYCLOAK_REDIRECT_URI=http://localhost:5001/api/auth/keycloak/callback
```

### 6. Update Backend Routes

**File:** `product-management/backend-node/src/index.ts`

```typescript
import keycloakAuthRoutes from './routes/keycloak-auth';

// Add routes
app.use('/api/auth', keycloakAuthRoutes);
```

### 7. Update Frontend Login Flow

**File:** `product-management/frontend/src/pages/LoginPage.tsx`

```typescript
const handleKeycloakLogin = () => {
  // Redirect to backend which initiates Keycloak flow
  window.location.href = 'http://localhost:5000/api/auth/keycloak/login';
};

return (
  <div>
    <button onClick={handleKeycloakLogin}>
      Sign in with Keycloak
    </button>
  </div>
);
```

### 8. Add Protected Route Middleware

Replace your existing auth middleware:

```typescript
import { requireKeycloakAuth } from '../../shared/keycloak-middleware';

// Protect routes
router.get('/api/protected', requireKeycloakAuth, (req, res) => {
  res.json({ user: req.keycloakUser });
});
```

### 9. Update Session Management

The session now stores:
- `keycloakAccessToken` - Keycloak access token
- `keycloakIdToken` - Keycloak ID token  
- `keycloakRefreshToken` - Refresh token
- `userId` - Local user database ID

## Testing Checklist

### Keycloak Server
- [ ] Admin console accessible: `http://localhost:9999/admin` (admin/admin)
- [ ] Realm `tenant-default` exists
- [ ] Clients `product-management` and `prompt-management` configured
- [ ] Test user exists: `testuser@example.com` / `Test123!`

### OIDC Discovery
- [ ] Discovery document: `http://localhost:9999/realms/tenant-default/.well-known/openid-configuration`
- [ ] JWKS endpoint: `http://localhost:9999/realms/tenant-default/protocol/openid-connect/certs`

### Login Flow
- [ ] Visit `http://localhost:5173`
- [ ] Click "Sign in with Keycloak"
- [ ] Redirect to Keycloak login page
- [ ] Enter test credentials
- [ ] Redirect back to application
- [ ] User logged in successfully

### Token Validation
- [ ] Access token in session
- [ ] Token validation works
- [ ] Protected routes accessible
- [ ] User info endpoint returns data

### Token Refresh
- [ ] Wait for token to expire (or manually expire)
- [ ] Access protected route
- [ ] Token automatically refreshed
- [ ] Request succeeds

### Logout
- [ ] Click logout in application
- [ ] Session cleared locally
- [ ] Redirect to Keycloak logout
- [ ] Logged out from all applications (SSO)

### SSO Between Applications
- [ ] Login to product-management
- [ ] Visit prompt-management
- [ ] Should auto-login via SSO

## Migration of Existing Users

### Option 1: Manual User Creation in Keycloak

For each existing user:
1. Admin Console → Users → Add User
2. Set username, email, first/last name
3. Credentials tab → Set password
4. Link to application user by `sub` claim

### Option 2: Bulk Import

```bash
# Export from current auth-service
mongoexport --db ai_platform --collection users --out users.json

# Transform to Keycloak format (create script)
node scripts/transform-users-to-keycloak.js

# Import to Keycloak
./kcadm.sh create users -r tenant-default -f users-keycloak.json
```

### Option 3: Account Linking on First Login

Users login with Keycloak (social login or email/password).
Application checks if email exists → links `keycloakSub` to existing user record.

This is already implemented in the callback handler!

## Social Login Setup (Optional)

### Google OAuth

1. **Keycloak Admin Console** → tenant-default → Identity Providers → Add Provider → Google
2. **Google Cloud Console**:
   - Create OAuth 2.0 credentials
   - Authorized redirect URIs: `http://localhost:9999/realms/tenant-default/broker/google/endpoint`
3. **Keycloak Configuration**:
   - Client ID: From Google Console
   - Client Secret: From Google Console
   - Default Scopes: `openid profile email`

### Microsoft Azure AD

1. **Keycloak** → Identity Providers → Add Provider → Microsoft
2. **Azure Portal** → App registrations:
   - Redirect URI: `http://localhost:9999/realms/tenant-default/broker/microsoft/endpoint`
3. **Keycloak**:
   - Application ID: From Azure
   - Client Secret: From Azure

## Rollback Plan

If issues occur:

1. **Keep Old auth-service Running** on different port
2. **Switch `.env` back** to old configuration
3. **Update frontend** to use old login endpoint
4. **Restart applications**

Data is preserved because:
- User table still has all fields
- Keycloak mapping is additive (keycloakSub field)
- No data is deleted

## Production Deployment

### Security Checklist

- [ ] Change Keycloak admin password
- [ ] Use HTTPS for all endpoints
- [ ] Set `sslRequired: "external"` in realm settings
- [ ] Use strong client secrets (64+ characters)
- [ ] Enable CORS properly
- [ ] Set `secure: true` for cookies
- [ ] Set `SameSite=Strict` for cookies
- [ ] Enable rate limiting
- [ ] Configure realm password policy
- [ ] Enable brute force protection
- [ ] Set token lifespans appropriately
- [ ] Enable audit logging
- [ ] Configure email server for password reset

### Performance

- [ ] Enable JWKS caching (default 24 hours)
- [ ] Use connection pooling for database
- [ ] Configure session storage (Redis recommended)
- [ ] Set up Keycloak cluster for HA
- [ ] Use CDN for static assets

### Monitoring

- [ ] Enable Keycloak event logging
- [ ] Monitor authentication success/failure rates
- [ ] Track token refresh patterns
- [ ] Alert on unusual login activity
- [ ] Monitor Keycloak server health

## Multi-Tenant Setup

### Per-Tenant Realms

Create realm for each tenant:

```powershell
# Modify setup script to accept tenant parameter
.\scripts\keycloak\setup-keycloak.ps1 -RealmName "tenant-acmecorp"
```

### Dynamic Realm Selection

```typescript
// Determine realm based on user email or subdomain
async function getRealmForUser(email: string): Promise<string> {
  // Lookup in database
  const user = await User.findOne({ email });
  return user?.tenantId ? `tenant-${user.tenantId}` : 'tenant-default';
}

// Use in login route
router.get('/login', async (req, res) => {
  const email = req.query.email as string;
  const realm = await getRealmForUser(email);
  
  // Create Keycloak client for specific realm
  const keycloak = new KeycloakOIDCClient({
    url: process.env.KEYCLOAK_URL!,
    realm: realm,  // Dynamic realm
    clientId: process.env.KEYCLOAK_CLIENT_ID!,
    clientSecret: process.env.KEYCLOAK_CLIENT_SECRET!,
    redirectUri: process.env.KEYCLOAK_REDIRECT_URI!
  });
  
  // Continue with PKCE flow...
});
```

## Troubleshooting

### "Invalid redirect_uri"
→ Check Keycloak client configuration, must match exactly

### "Invalid code_verifier"
→ Ensure PKCE verifier stored correctly in session

### "Token signature verification failed"
→ Check JWKS URI is correct and accessible

### "CORS error"
→ Add your origin to Keycloak client "Web Origins"

### Session lost after login
→ Check session middleware configured before Keycloak routes

### Token expires immediately
→ Check system clock sync between Keycloak and application

---

**Status:** Ready to execute step-by-step
**Estimated Time:** 2-3 hours for full migration
**Risk Level:** Low (backward compatible, can rollback)
