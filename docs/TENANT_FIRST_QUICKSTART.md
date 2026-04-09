# Tenant-First Login - Quick Start

## 1. Seed Tenants

```bash
cd product-management/backend-node
npx ts-node ../../scripts/keycloak/seed-tenants.ts
```

This creates 4 sample tenants:
- **default** (domain: default.local, aliases: demo, test)
- **acme-corp** (domain: acmecorp.com, aliases: acme, acmecorp)
- **techstart** (domain: techstart.io)
- **global-industries** (domain: globalind.com, aliases: global, globalind)

## 2. Configure Environment

```bash
cp .env.tenant.example .env
```

Update `.env`:
```env
MONGODB_URI=mongodb://localhost:27017/ai_platform
KEYCLOAK_URL=http://localhost:9999
KEYCLOAK_CLIENT_ID=product-management
KEYCLOAK_CLIENT_SECRET=<from setup script>
KEYCLOAK_REDIRECT_URI=http://localhost:5000/api/auth/tenant/callback
CLIENT_URL=http://localhost:5173
SESSION_SECRET=<generate secure random string>
```

## 3. Create Keycloak Realms

For each tenant, create a Keycloak realm:

```bash
.\scripts\keycloak\setup-keycloak.ps1 -RealmName "tenant-default"
.\scripts\keycloak\setup-keycloak.ps1 -RealmName "tenant-acme-corp"
.\scripts\keycloak\setup-keycloak.ps1 -RealmName "tenant-techstart"
.\scripts\keycloak\setup-keycloak.ps1 -RealmName "tenant-global-industries"
```

## 4. Register Routes

In your Express app:

```typescript
import tenantAuthRoutes from './routes/tenant-auth';

app.use('/api/auth', tenantAuthRoutes);
```

## 5. Test Tenant Lookup

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

# Email suggestion
curl -X POST http://localhost:5000/api/auth/tenant/suggest \
  -H "Content-Type: application/json" \
  -d '{"email": "user@acmecorp.com"}'
```

## 6. Test Login Flow

1. Open browser: `http://localhost:5173/login`
2. Enter tenant identifier: `acme-corp`
3. Click "Continue"
4. Should show "Acme Corporation"
5. Choose auth method (Username/Password, Google, Microsoft)
6. Redirects to Keycloak realm `tenant-acme-corp`
7. Authenticate
8. Redirects back to application
9. User logged in and associated with tenant

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/tenant/lookup` | Look up tenant by ID/domain/alias |
| POST | `/api/auth/tenant/suggest` | Suggest tenant from email |
| GET | `/api/auth/tenant/login` | Initiate OAuth flow (requires tenant context) |
| GET | `/api/auth/tenant/callback` | OAuth callback handler |
| GET | `/api/auth/tenant/context` | Get current tenant context |
| POST | `/api/auth/tenant/clear` | Clear tenant context |

## Frontend Flow

```typescript
// Step 1: Lookup tenant
const response = await axios.post('/api/auth/tenant/lookup', {
  identifier: 'acme-corp'
});

if (response.data.success) {
  // Step 2: Show tenant info and auth methods
  const tenant = response.data.tenant;
  
  // Step 3: Redirect to login
  window.location.href = '/api/auth/tenant/login';
}
```

## Troubleshooting

### "Tenant not found"
```bash
# Check MongoDB
mongo ai_platform
db.keycloaktenants.find()

# Re-seed if needed
npx ts-node product-management/scripts/keycloak/seed-tenants.ts
```

### "Realm not found in Keycloak"
```bash
# Create missing realm
.\scripts\keycloak\setup-keycloak.ps1 -RealmName "tenant-acme-corp"
```

### "Tenant context missing"
- Ensure `/tenant/lookup` is called before `/tenant/login`
- Check session middleware is configured
- Verify cookie is set (check browser dev tools)

## Next Steps

- Customize frontend tenant selection UI
- Add rate limiting to prevent tenant enumeration
- Configure social login per realm (Google, Microsoft)
- Set up production MongoDB with proper indexes
- Configure Redis for distributed sessions
- Enable HTTPS in production

See [TENANT_FIRST_LOGIN_FLOW.md](./TENANT_FIRST_LOGIN_FLOW.md) for complete documentation.
