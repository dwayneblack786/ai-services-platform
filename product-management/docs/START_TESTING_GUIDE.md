# Quick Start Guide for Keycloak Migration Testing

## Current Status

✅ **Keycloak:** Running on port 9999
✅ **Product Management:** Running on port 5000
❌ **Prompt Management:** NOT running (needs to start)

---

## Step 1: Start Prompt Management Backend

Open a new terminal and run:

```powershell
cd prompt-management\backend
npm run dev
```

**Expected Output:**
```
✓ MongoDB connected successfully
✓ Prompt Management Service running on port 5001
✓ Environment: development
✓ SSO Enabled: true
```

---

## Step 2: Verify Routes Are Working

### Test Prompt Management Health:
```powershell
curl http://localhost:5001/health
```

**Expected Response:**
```json
{
  "status": "healthy",
  "timestamp": "...",
  "service": "prompt-management"
}
```

### Test Keycloak Auth Status:
```powershell
curl http://localhost:5001/api/auth/keycloak/status
```

**Expected Response:**
```json
{
  "authenticated": false
}
```

---

## Step 3: Test Tenant Lookup (Product Management)

```powershell
$body = @{ identifier = "default" } | ConvertTo-Json
Invoke-RestMethod -Uri "http://localhost:5000/api/auth/tenant/lookup" `
  -Method Post `
  -ContentType "application/json" `
  -Body $body
```

**Expected Response:**
```json
{
  "success": true,
  "tenant": {
    "tenantId": "default",
    "name": "Default Tenant",
    "keycloakRealm": "tenant-default",
    "allowedAuthMethods": ["password", "google"]
  }
}
```

If this FAILS, you need to seed tenants:
```powershell
cd product-management\backend-node
npx ts-node scripts\seed-tenants.ts
```

---

## Step 4: Register Keycloak Client (ONE-TIME SETUP)

Before testing authentication, register `prompt-management` as a Keycloak client:

### Steps:

1. **Open Keycloak Admin Console:**
   - URL: http://localhost:9999/admin
   - Username: `admin`
   - Password: `admin`

2. **Select the `tenant-default` realm** (top-left dropdown)

3. **Go to Clients → Create client:**
   - Client ID: `prompt-management`
   - Client type: `OpenID Connect`
   - Click "Next"

4. **Capability config:**
   - Standard flow: ✅ ON
   - Direct access grants: ✅ ON
   - Click "Next"

5. **Login settings:**
   - Root URL: `http://localhost:3001`
   - Valid redirect URIs: `http://localhost:5001/api/auth/keycloak/callback`
   - Web origins: `http://localhost:3001`
   - Click "Save"

6. **Get Client Secret:**
   - Go to **Credentials** tab
   - Copy the **Client Secret**

7. **Update `.env`:**
   ```powershell
   # Edit: prompt-management\backend\.env
   KEYCLOAK_CLIENT_SECRET=<paste-secret-here>
   ```

8. **Restart Prompt Management backend:**
   ```powershell
   # In terminal running backend, press Ctrl+C
   npm run dev
   ```

---

## Step 5: Test Authentication Flow (Manual)

### Option A: Direct Keycloak Login

1. Open browser: `http://localhost:3001`

2. Navigate to login page

3. **Test URL (direct):**
   ```
   http://localhost:5001/api/auth/keycloak/login?tenantId=default&returnTo=/dashboard
   ```

4. **Expected Flow:**
   - Redirects to: `http://localhost:9999/realms/tenant-default/protocol/openid-connect/auth`
   - Shows Keycloak login page
   - Enter credentials (you may need to create a user in Keycloak first)
   - Redirects back to: `http://localhost:3001/dashboard`
   - User authenticated ✅

### Option B: Cross-Service SSO Test

1. **Login to Product Management:**
   - Open: `http://localhost:5173`
   - Login with Keycloak

2. **Open Prompt Management in new tab:**
   - URL: `http://localhost:3001`
   - Should automatically detect Keycloak session
   - **Auto-login without credentials!** 🎉

---

## Step 6: Create Test User in Keycloak (If Needed)

If you don't have a test user in Keycloak:

1. Open Keycloak Admin: `http://localhost:9999/admin`
2. Select `tenant-default` realm
3. Go to **Users** → **Add user**
4. Fill in:
   - Username: `testuser`
   - Email: `test@example.com`
   - First name: `Test`
   - Last name: `User`
   - Email verified: ✅ ON
   - Click "Create"

5. **Set Password:**
   - Go to **Credentials** tab
   - Click "Set password"
   - Password: `Test123!`
   - Temporary: OFF
   - Click "Save"

Now you can login with:
- Username: `testuser`
- Password: `Test123!`

---

## Troubleshooting

### Issue: "tenant not found"
**Fix:** Run tenant seed script:
```powershell
cd product-management\backend-node
npx ts-node scripts\seed-tenants.ts
```

### Issue: "Invalid client"
**Fix:** Complete Step 4 (Register Keycloak client)

### Issue: "Redirect URI mismatch"
**Fix:** Check Keycloak client settings match:
```
Valid redirect URIs: http://localhost:5001/api/auth/keycloak/callback
```

### Issue: Session not persisting
**Fix:** Check SESSION_SECRET in `.env`:
```
SESSION_SECRET=prompt-mgmt-session-secret-key-minimum-32-chars-change-in-production
```

---

## Success Criteria

✅ Prompt Management backend starts without errors
✅ Health endpoint returns 200
✅ Keycloak status endpoint returns 200
✅ Tenant lookup finds "default" tenant
✅ Keycloak client registered
✅ Can login via Keycloak
✅ Cross-service SSO works (auto-login)

---

**Next:** Once all tests pass, we'll move to Phase 1 security enhancements!
