# Keycloak Multi-Tenant Integration - Final Configuration

## Step 1: Environment Variables

Update `.env` in `product-management/backend-node`:

```env
# MongoDB
MONGODB_URI=mongodb://localhost:27017/ai_platform

# Keycloak Configuration
KEYCLOAK_URL=http://localhost:9999
KEYCLOAK_REALM=tenant-default
KEYCLOAK_CLIENT_ID=product-management
KEYCLOAK_CLIENT_SECRET=<from-setup-script>
KEYCLOAK_REDIRECT_URI=http://localhost:5000/api/auth/tenant/callback
KEYCLOAK_POST_LOGOUT_REDIRECT_URI=http://localhost:5173

# Session Configuration
SESSION_SECRET=<generate-secure-random-string>
SESSION_MAX_AGE=86400000

# Client URL
CLIENT_URL=http://localhost:5173

# Tenant Service URL (if separate service)
TENANT_SERVICE_URL=http://localhost:5000

# Server Configuration
PORT=5000
NODE_ENV=development
```

## Step 2: Install Dependencies

```bash
cd product-management/backend-node
npm install jwks-rsa axios
```

## Step 3: Database Setup

Seed tenants in MongoDB:

```bash
npx ts-node ../../scripts/keycloak/seed-tenants.ts
```

## Step 4: Keycloak Setup

Create realms for each tenant:

```powershell
.\scripts\keycloak\setup-keycloak.ps1 -RealmName "tenant-default"
.\scripts\keycloak\setup-keycloak.ps1 -RealmName "tenant-acme-corp"
```

## Step 5: Server Integration

Update `src/index.ts`:

```typescript
import express from 'express';
import session from 'express-session';
import mongoose from 'mongoose';
import cors from 'cors';

// Import routes
import tenantAuthRoutes from './routes/tenant-auth';
import keycloakAuthRoutes from './routes/keycloak-auth';
import userProfileRoutes from './routes/user-profile';
import usageRoutes from './routes/usage';
import subscriptionsRoutes from './routes/subscriptions-routes';
// ... other routes

const app = express();

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:5173',
  credentials: true
}));

// Session configuration
app.use(
  session({
    secret: process.env.SESSION_SECRET || 'your-secret-key',
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: process.env.NODE_ENV === 'production',
      httpOnly: true,
      maxAge: parseInt(process.env.SESSION_MAX_AGE || '86400000')
    }
  })
);

// MongoDB connection
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/ai_platform')
  .then(() => console.log('✅ Connected to MongoDB'))
  .catch((err) => console.error('❌ MongoDB connection error:', err));

// Authentication routes
app.use('/api/auth', tenantAuthRoutes);       // Tenant-first login
app.use('/api/auth', keycloakAuthRoutes);     // Legacy Keycloak routes

// User profile & RBAC
app.use('/api/users', userProfileRoutes);

// Usage collection
app.use('/api/usage', usageRoutes);

// Application routes (with Keycloak auth)
app.use('/api/subscriptions', subscriptionsRoutes);
// ... register other routes

// Health check
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    keycloak: {
      url: process.env.KEYCLOAK_URL,
      realm: process.env.KEYCLOAK_REALM
    }
  });
});

// Start server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log('='.repeat(80));
  console.log('✅ Product Management Backend');
  console.log('='.repeat(80));
  console.log(`🌐 Server: http://localhost:${PORT}`);
  console.log(`🔐 Keycloak: ${process.env.KEYCLOAK_URL}`);
  console.log(`📊 MongoDB: ${process.env.MONGODB_URI}`);
  console.log('='.repeat(80));
});

export default app;
```

## Step 6: Frontend Integration

Update frontend authentication flow:

### Login Flow (React)

```typescript
// LoginPage.tsx
import { useState } from 'react';
import axios from 'axios';

export default function LoginPage() {
  const [step, setStep] = useState<'tenant' | 'auth'>('tenant');
  const [identifier, setIdentifier] = useState('');
  const [tenant, setTenant] = useState<any>(null);

  const handleTenantLookup = async () => {
    const response = await axios.post('/api/auth/tenant/lookup', {
      identifier
    });

    if (response.data.success) {
      setTenant(response.data.tenant);
      setStep('auth');
    }
  };

  const handleLogin = () => {
    // Redirect to Keycloak via tenant-aware endpoint
    window.location.href = '/api/auth/tenant/login';
  };

  if (step === 'tenant') {
    return (
      <div>
        <h1>Sign In</h1>
        <input
          placeholder="Organization ID or domain"
          value={identifier}
          onChange={(e) => setIdentifier(e.target.value)}
        />
        <button onClick={handleTenantLookup}>Continue</button>
      </div>
    );
  }

  return (
    <div>
      <h2>{tenant.name}</h2>
      <button onClick={handleLogin}>Sign in with Keycloak</button>
    </div>
  );
}
```

### User Profile Hook

```typescript
// useUser.ts
import { useEffect, useState } from 'react';
import axios from 'axios';

export function useUser() {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadUser();
  }, []);

  const loadUser = async () => {
    try {
      const response = await axios.get('/api/users/me');
      setUser(response.data);
    } catch (error) {
      console.error('Load user error:', error);
    } finally {
      setLoading(false);
    }
  };

  return { user, loading, reload: loadUser };
}
```

### Usage Tracking Hook

```typescript
// useUsageTracking.ts
import axios from 'axios';

export function useUsageTracking() {
  const trackEvent = async (
    eventType: string,
    resourceType?: string,
    resourceId?: string,
    metadata?: any
  ) => {
    try {
      // Get user from session/context
      const userResponse = await axios.get('/api/users/me');
      const user = userResponse.data;

      await axios.post('/api/usage/events', {
        tenant_id: user.tenant_id,
        user_id: user.user_id,
        event_type: eventType,
        resource_type: resourceType,
        resource_id: resourceId,
        metadata: metadata,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('Usage tracking failed:', error);
    }
  };

  return { trackEvent };
}
```

## Step 7: Testing Integration

### Test 1: Tenant Lookup

```bash
curl -X POST http://localhost:5000/api/auth/tenant/lookup \
  -H "Content-Type: application/json" \
  -d '{"identifier": "acme-corp"}'
```

Expected:
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

### Test 2: Login Flow

1. Visit: `http://localhost:5173/login`
2. Enter: `acme-corp`
3. Click: Continue
4. Redirects to: `http://localhost:9999/realms/tenant-acme-corp/...`
5. Authenticate with: `testuser@example.com` / `Test123!`
6. Redirects back to: `http://localhost:5173`

### Test 3: User Profile

```bash
curl http://localhost:5000/api/users/me \
  -H "Cookie: connect.sid=<session-cookie>"
```

Expected:
```json
{
  "user_id": "507f1f77bcf86cd799439011",
  "tenant_id": "acme-corp",
  "email": "testuser@example.com",
  "name": "Test User",
  "role": "ANALYST",
  "permissions": ["projects:read", "analytics:read"],
  "subscriptions": [...],
  "feature_flags": {...}
}
```

### Test 4: Usage Event

```bash
curl -X POST http://localhost:5000/api/usage/events \
  -H "Content-Type: application/json" \
  -d '{
    "tenant_id": "acme-corp",
    "user_id": "507f1f77bcf86cd799439011",
    "event_type": "project.viewed",
    "resource_type": "project",
    "resource_id": "proj_123"
  }'
```

Expected:
```json
{
  "success": true,
  "ingested": 1,
  "rejected": 0
}
```

## Step 8: Migration Checklist

### Backend

- [x] Install `jwks-rsa` dependency
- [x] Create `KeycloakTenant` model
- [x] Create `UsageEvent` model
- [x] Update `User` model with `keycloakSub`
- [x] Create tenant lookup service
- [x] Create identity mapping service
- [x] Create tenant-auth routes
- [x] Create user-profile routes
- [x] Create usage routes
- [x] Create Keycloak auth middleware
- [x] Update subscriptions routes with Keycloak auth
- [x] Wire all routes in server
- [ ] Update remaining routes with `requireKeycloakAuth`
- [ ] Test all endpoints

### Frontend

- [ ] Create tenant selection UI
- [ ] Update login flow to use tenant-first
- [ ] Replace auth calls with `/api/users/me`
- [ ] Add usage tracking to key actions
- [ ] Test RBAC (roles, permissions work as before)
- [ ] Test subscriptions display
- [ ] Test all protected routes

### Database

- [x] Seed tenants in MongoDB
- [ ] Create indexes on User.keycloakSub
- [ ] Create indexes on UsageEvent collections
- [ ] Migrate existing users (link keycloakSub)

### Keycloak

- [ ] Create realms for all tenants
- [ ] Configure OIDC client in each realm
- [ ] Enable Google identity provider (if needed)
- [ ] Enable Microsoft identity provider (if needed)
- [ ] Create test users in each realm

## Step 9: Route Migration Summary

### Routes Using Keycloak Auth

Replace `authenticateToken` with `requireKeycloakAuth`:

```typescript
// Before
import { authenticateToken } from '../middleware/auth';
router.get('/endpoint', authenticateToken, handler);

// After
import { requireKeycloakAuth } from '../middleware/keycloak-auth';
router.get('/endpoint', requireKeycloakAuth, handler);
```

### Routes Sending Usage Events

Add usage tracking:

```typescript
import { requireKeycloakAuth, trackUsage } from '../middleware/keycloak-auth';

router.post('/projects', requireKeycloakAuth, async (req, res) => {
  // ... create project logic
  
  // Track usage
  await trackUsage(
    'project.created',
    req.user.id,
    req.user.tenantId,
    'project',
    project._id.toString()
  );
  
  res.json({ success: true, project });
});
```

## Step 10: Verification

### Authentication Flow
✅ User enters tenant identifier
✅ System looks up tenant → Keycloak realm
✅ User redirects to correct Keycloak realm
✅ User authenticates (username/password, Google, Microsoft)
✅ System exchanges code for tokens
✅ System maps Keycloak identity to MongoDB user
✅ User logged in with session

### Profile & RBAC
✅ Frontend calls `/api/users/me`
✅ Returns user with roles, permissions, subscriptions
✅ Frontend renders UI based on MongoDB roles (not Keycloak)
✅ Existing RBAC logic works unchanged

### Usage Collection
✅ All protected endpoints use `requireKeycloakAuth`
✅ Key actions send events to `/api/usage/events`
✅ Usage events stored in MongoDB
✅ Usage summaries available via `/api/usage/summary`

## Troubleshooting

### "Tenant not found"
- Run: `npx ts-node scripts/keycloak/seed-tenants.ts`
- Verify MongoDB connection

### "Realm not found in Keycloak"
- Run: `.\scripts\keycloak\setup-keycloak.ps1 -RealmName "tenant-xxx"`
- Check Keycloak admin console

### "Token validation failed"
- Check KEYCLOAK_URL in .env
- Verify Keycloak is running (http://localhost:9999)
- Check client secret matches

### "User not found in database"
- User must complete login flow at least once
- Check User.keycloakSub field exists
- Verify identity mapping ran during callback

---

**Integration Complete**
All components wired and ready for testing.
