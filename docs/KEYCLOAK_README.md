# Keycloak Identity Layer Implementation

## Overview

This directory contains the complete implementation of **Keycloak as the ONLY Identity Provider (IdP)** for the AI Services Platform. Keycloak handles all authentication, SSO, social login, and token issuance using **Authorization Code + PKCE** flow.

## 📁 File Structure

```
ai-services-platform/
│
├── docs/
│   ├── KEYCLOAK_QUICKSTART.md              ⭐ START HERE - 5-minute setup
│   ├── KEYCLOAK_IMPLEMENTATION_GUIDE.md    📘 Complete implementation guide
│   └── KEYCLOAK_MIGRATION_CHECKLIST.md     ✅ Step-by-step migration checklist
│
├── scripts/
│   └── keycloak/
│       └── setup-keycloak.ps1               🔧 Automated setup script
│
├── shared/
│   ├── keycloak-client.ts                   📦 OIDC client library
│   └── keycloak-middleware.ts               🛡️ Express authentication middleware
│
├── product-management/
│   └── backend-node/
│       ├── .env.keycloak.example            📝 Environment template
│       └── src/
│           └── routes/
│               └── keycloak-auth.ts         🔐 Authentication routes
│
└── keycloak-secrets.txt                     🔑 Generated secrets (DO NOT COMMIT)
```

## 🚀 Quick Start

**Total Time:** 5 minutes

1. **Ensure Keycloak is running:**
   ```
   http://localhost:9999
   Username: admin
   Password: admin
   ```

2. **Run the setup script:**
   ```powershell
   cd ai-services-platform
   .\scripts\keycloak\setup-keycloak.ps1
   ```

3. **Follow the Quick Start Guide:**
   → **[KEYCLOAK_QUICKSTART.md](./KEYCLOAK_QUICKSTART.md)**

## 📚 Documentation

### For First-Time Setup

→ **[KEYCLOAK_QUICKSTART.md](./KEYCLOAK_QUICKSTART.md)**
- 5-minute automated setup
- Test credentials
- Basic testing steps

### For Deep Understanding

→ **[KEYCLOAK_IMPLEMENTATION_GUIDE.md](./KEYCLOAK_IMPLEMENTATION_GUIDE.md)**
- Complete architecture explanation
- OIDC flow details
- Token validation
- Multi-tenant setup
- Security best practices
- Production deployment

### For Migration from Existing Auth

→ **[KEYCLOAK_MIGRATION_CHECKLIST.md](./KEYCLOAK_MIGRATION_CHECKLIST.md)**
- Pre-migration checklist
- Database migration
- User data migration
- Testing checklist
- Rollback plan

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                    Keycloak IdP (Port 9999)                      │
│                    http://localhost:9999/                       │
│                                                                   │
│  ✅ Multi-Realm (one per tenant)                                │
│  ✅ Social Login (Google, Microsoft, etc.)                      │
│  ✅ Authorization Code + PKCE                                   │
│  ✅ JWT Token Issuance                                          │
│  ✅ SSO Across Applications                                     │
│  ✅ User Management                                             │
│  ❌ NO Application Roles                                        │
│  ❌ NO Business Logic                                           │
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
│ • Application Roles ✅    │ │ • Application Roles ✅    │
│ • Subscription Logic ✅   │ │ • Subscription Logic ✅   │
└───────────────────────────┘ └───────────────────────────┘
```

## 🔑 Key Principles

1. **Keycloak is the ONLY IdP** - No custom authentication logic in applications
2. **Authorization Code + PKCE** - Most secure OAuth2 flow
3. **Token Validation via JWKS** - Public key verification, no shared secrets
4. **Multi-Tenant via Realms** - Each tenant has its own Keycloak realm
5. **Just-in-Time Provisioning** - Users created automatically on first login
6. **SSO Everywhere** - Login once, access all applications
7. **No Business Logic in Keycloak** - Application roles and subscriptions stay in applications

## 🔧 Components

### 1. Setup Script (`setup-keycloak.ps1`)

Automated PowerShell script that:
- ✅ Authenticates with Keycloak admin API
- ✅ Creates realm `tenant-default`
- ✅ Registers OIDC clients (product-management, prompt-management)
- ✅ Configures Authorization Code + PKCE flow
- ✅ Creates test user
- ✅ Generates and saves client secrets
- ✅ Provides complete configuration summary

### 2. OIDC Client Library (`keycloak-client.ts`)

TypeScript client for Keycloak integration:
- ✅ PKCE challenge generation
- ✅ Authorization URL builder
- ✅ Token exchange
- ✅ Token refresh
- ✅ Token validation via JWKS
- ✅ User info retrieval
- ✅ Logout URL generation
- ✅ OIDC discovery
- ✅ Token introspection

### 3. Authentication Middleware (`keycloak-middleware.ts`)

Express middleware for protecting routes:
- ✅ Token validation from header/session/cookie
- ✅ Automatic token refresh
- ✅ User attachment to request
- ✅ Role-based access control (realm & client roles)
- ✅ Email verification checks
- ✅ Optional authentication support

### 4. Authentication Routes (`keycloak-auth.ts`)

Express routes for OIDC flows:
- ✅ `GET /api/auth/keycloak/login` - Initiate login
- ✅ `GET /api/auth/keycloak/callback` - OAuth callback
- ✅ `GET /api/auth/keycloak/me` - Get current user
- ✅ `POST /api/auth/keycloak/refresh` - Refresh token
- ✅ `POST /api/auth/keycloak/logout` - Logout
- ✅ `GET /api/auth/keycloak/status` - Check auth status
- ✅ `GET /api/auth/keycloak/silent-check` - SSO detection

## 🧪 Testing

### Test Credentials

```
Username: testuser@example.com
Password: Test123!
```

### Keycloak Admin Console

```
URL: http://localhost:9999/admin
Username: admin
Password: admin
```

### OIDC Discovery

```bash
curl http://localhost:9999/realms/tenant-default/.well-known/openid-configuration | jq
```

### JWKS Endpoint

```bash
curl http://localhost:9999/realms/tenant-default/protocol/openid-connect/certs | jq
```

### Test Login Flow

1. Visit `http://localhost:5173`
2. Click "Sign in with Keycloak"
3. Login with test credentials
4. Verify redirect and session

## 🔐 Security Features

### OAuth2 Best Practices

- ✅ **PKCE (Proof Key for Code Exchange)** - Prevents authorization code interception
- ✅ **State Parameter** - CSRF protection
- ✅ **HTTPS in Production** - All communication encrypted
- ✅ **HTTP-Only Cookies** - Tokens not accessible via JavaScript
- ✅ **Short Token Lifespans** - 15 minutes for access tokens
- ✅ **Refresh Token Rotation** - Security enhancement

### Token Validation

- ✅ **Signature Verification** - Using Keycloak public keys (RSA256)
- ✅ **Issuer Validation** - Ensures token from correct Keycloak instance
- ✅ **Audience Validation** - Ensures token for correct application
- ✅ **Expiration Validation** - Prevents use of expired tokens
- ✅ **JWKS Caching** - Performance optimization with 24-hour cache

### Additional Security

- ✅ **Brute Force Protection** - Built into Keycloak
- ✅ **Password Policy** - 8+ chars, uppercase, lowercase, digit
- ✅ **Email Verification** - Optional requirement
- ✅ **Two-Factor Authentication** - TOTP support
- ✅ **Session Management** - Idle timeout, max lifespan

## 🌍 Multi-Tenant Support

### Realm Strategy

Each tenant gets its own Keycloak realm:

```
tenant-default      → Default tenant
tenant-acmecorp     → Acme Corporation
tenant-techstart    → Tech Startup
```

### Benefits

- ✅ **Isolated User Base** - No cross-tenant data leakage
- ✅ **Independent Configuration** - Per-tenant settings
- ✅ **Custom Branding** - Per-tenant login themes
- ✅ **Separate Social Providers** - Different OAuth apps per tenant

### Dynamic Realm Selection

```typescript
// Example: Determine realm from user email
async function getRealmForUser(email: string): Promise<string> {
  const user = await User.findOne({ email });
  return user?.tenantId ? `tenant-${user.tenantId}` : 'tenant-default';
}
```

## 🚀 Production Deployment

### Checklist

- [ ] Change Keycloak admin password
- [ ] Enable HTTPS (SSL required)
- [ ] Use strong client secrets (64+ characters)
- [ ] Configure CORS properly
- [ ] Set secure cookies (`secure: true`, `SameSite=Strict`)
- [ ] Enable rate limiting
- [ ] Configure password policy
- [ ] Set up Keycloak cluster for high availability
- [ ] Configure Redis for session storage
- [ ] Enable audit logging
- [ ] Set up monitoring and alerts
- [ ] Configure email server for password reset

### Performance Optimizations

- ✅ **JWKS Caching** - 24-hour cache (configurable)
- ✅ **Connection Pooling** - Database connections
- ✅ **Session Storage** - Redis for distributed sessions
- ✅ **Token Caching** - Avoid repeated JWKS lookups
- ✅ **CDN for Static Assets** - Faster page loads

## 📊 Monitoring

### Metrics to Track

- Authentication success/failure rates
- Token refresh frequency
- Login latency
- SSO usage patterns
- Unusual login activity
- Keycloak server health

### Keycloak Events

Enable event logging in Keycloak:
- Login events
- Registration events
- Token refresh events
- Logout events
- Admin actions

## 🆘 Support & Troubleshooting

### Common Issues

| Issue | Solution |
|-------|----------|
| "Invalid redirect_uri" | Check Keycloak client configuration |
| "Token signature failed" | Verify JWKS endpoint accessibility |
| "CORS error" | Add origin to Keycloak Web Origins |
| Session lost | Check session middleware order |

### Debug Mode

Enable detailed logging:

```typescript
// In keycloak-client.ts
console.log('🔐 Authorization URL:', authUrl);
console.log('🎫 Token response:', tokens);
console.log('✅ Token validated:', decoded);
```

### Keycloak Logs

```bash
# View Keycloak logs
cd <keycloak-installation>
cat data/log/keycloak.log
```

## 📝 Environment Variables

### Required Variables

```env
KEYCLOAK_URL=http://localhost:9999
KEYCLOAK_REALM=tenant-default
KEYCLOAK_CLIENT_ID=product-management
KEYCLOAK_CLIENT_SECRET=<generated-secret>
KEYCLOAK_REDIRECT_URI=http://localhost:5000/api/auth/keycloak/callback
```

### Optional Variables

```env
KEYCLOAK_POST_LOGOUT_REDIRECT_URI=http://localhost:5173
DEFAULT_TENANT_ID=default
```

## 🔄 Migration Path

### From Existing auth-service

1. **Keep old system running** (backward compatibility)
2. **Run Keycloak setup script**
3. **Update User model** (add `keycloakSub` field)
4. **Install dependencies** (`jwks-rsa`)
5. **Add Keycloak routes** alongside existing routes
6. **Test thoroughly**
7. **Gradually migrate users**
8. **Deprecate old auth-service**

### Data Migration

- User records preserved (additive changes only)
- Account linking on first Keycloak login
- Bulk import option available
- Zero downtime migration possible

## 📦 Dependencies

### Backend

```json
{
  "jwks-rsa": "^3.1.0",
  "jsonwebtoken": "^9.0.2",
  "axios": "^1.6.0",
  "express-session": "^1.17.3"
}
```

### Keycloak

- **Version:** 23.0.0+ recommended
- **Java:** 17+ required
- **Database:** PostgreSQL recommended (H2 for dev)

## 🎯 Next Steps

1. **Run Setup Script** → [Quick Start Guide](./KEYCLOAK_QUICKSTART.md)
2. **Configure Social Login** → [Implementation Guide](./KEYCLOAK_IMPLEMENTATION_GUIDE.md#social-identity-providers)
3. **Set Up Additional Realms** → [Multi-Tenant Setup](./KEYCLOAK_IMPLEMENTATION_GUIDE.md#multi-tenant-implementation)
4. **Migrate Users** → [Migration Checklist](./KEYCLOAK_MIGRATION_CHECKLIST.md#migration-of-existing-users)
5. **Production Deployment** → [Implementation Guide](./KEYCLOAK_IMPLEMENTATION_GUIDE.md#production-deployment)

## 📞 Getting Help

- 📘 [Implementation Guide](./KEYCLOAK_IMPLEMENTATION_GUIDE.md)
- ✅ [Migration Checklist](./KEYCLOAK_MIGRATION_CHECKLIST.md)
- 🚀 [Quick Start](./KEYCLOAK_QUICKSTART.md)
- 🌐 [Keycloak Documentation](https://www.keycloak.org/docs/latest/)
- 💬 [Keycloak Discussions](https://github.com/keycloak/keycloak/discussions)

---

**Status:** Production-ready
**Last Updated:** January 28, 2026
**Version:** 1.0.0
