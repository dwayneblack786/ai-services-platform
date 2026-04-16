# 🧪 SSO Testing Checklist

## Prerequisites
- ✅ Product Management backend running on port 5000
- ✅ Product Management frontend running on port 5173
- ✅ Prompt Management backend running on port 5001
- ✅ Prompt Management frontend running on port 3002
- ✅ MongoDB running
- ✅ `VITE_SSO_ENABLED=true` in prompt-management/frontend/.env

---

## Test Scenario 1: User logs into Site A → Site B detects it ✅

### Steps:
1. **Clear all browser storage:**
   ```javascript
   // Open DevTools console
   localStorage.clear();
   sessionStorage.clear();
   // Go to Application tab → Cookies → Delete all localhost cookies
   ```

2. **Login to Product Management (Site A):**
   - Navigate to: `http://localhost:5173/login`
   - Login with email/password
   - Should redirect to dashboard

3. **Verify IdP session cookie:**
   - Open DevTools → Application → Cookies → `http://localhost`
   - Should see: `ai_platform.sid` cookie

4. **Visit Prompt Management (Site B):**
   - Navigate to: `http://localhost:3002/login`
   - Watch console logs
   
### ✅ Expected Result:
- Brief "Checking authentication..." message
- Automatic redirect to dashboard
- **NO login form shown**
- Console shows: "SSO redirect", "Silent auth success"
- localStorage on `localhost:3002` now has `auth_token`

### ❌ If Failed:
- Check: Is `VITE_SSO_ENABLED=true`?
- Check: Does `ai_platform.sid` cookie exist?
- Check: Backend logs for errors
- Check: Cookie domain is `localhost` (not `localhost:5000`)

---

## Test Scenario 2: User logs into Site B → Site A detects it ✅

### Steps:
1. **Clear all browser storage:**
   ```javascript
   localStorage.clear();
   sessionStorage.clear();
   // Delete all cookies
   ```

2. **Login to Prompt Management (Site B):**
   - Navigate to: `http://localhost:3002/login`
   - Should see "Checking authentication..."
   - Should receive `login_required` error → show login form
   - Click "🔐 Sign In with Product Management" button
   - Should redirect to Product Management login
   - Login there
   - Should redirect back to Prompt Management
   - Should see Prompt Management dashboard

3. **Verify IdP session cookie:**
   - Cookie `ai_platform.sid` should now exist

4. **Visit Product Management (Site A):**
   - Navigate to: `http://localhost:5173/login`
   - Should check auth status
   
### ✅ Expected Result:
- Product Management detects session via `/api/auth/status`
- Automatic redirect to dashboard
- **NO login form shown**
- localStorage on `localhost:5173` has `auth_token`

### ⚠️ Known Behavior:
- If localStorage was cleared but session cookie exists, Product Management should detect it
- The `checkAuthStatus()` in AuthContext runs on mount

---

## Test Scenario 3: User logs into neither ✅

### Steps:
1. **Clear all browser storage:**
   ```javascript
   localStorage.clear();
   sessionStorage.clear();
   // Delete all cookies
   ```

2. **Visit Product Management (Site A):**
   - Navigate to: `http://localhost:5173/login`
   
### ✅ Expected Result:
- Shows login form immediately
- Can login with email/password or OAuth

### Steps (continued):
3. **Visit Prompt Management (Site B):**
   - Navigate to: `http://localhost:3002/login`
   
### ✅ Expected Result:
- Brief "Checking authentication..." message
- Redirects to IdP with `prompt=none`
- IdP returns `error=login_required` (no session cookie)
- Shows login form with "Use SSO Now" button
- Can click SSO button to redirect to IdP
- Or login locally (creates IdP session too)

---

## Test Scenario 4: Token expiry and refresh

### Steps:
1. Login to Prompt Management
2. Wait 13 minutes (or adjust token expiry for testing)
3. Make an API call (navigate to another page)

### ✅ Expected Result:
- Token auto-refreshes via API interceptor
- No re-login required
- Console shows: "Token refresh successful"

---

## Test Scenario 5: Logout from one site

### Steps:
1. Login to both sites
2. Logout from Product Management (Site A)
3. Navigate around Product Management
4. Visit Prompt Management (Site B)

### ✅ Expected Result:
- Product Management: Logged out ✅
- Prompt Management: Still logged in (has valid token)
- IdP session cookie cleared

### Steps (continued):
5. Clear Prompt Management localStorage
6. Refresh Prompt Management
7. Should redirect to IdP with `prompt=none`

### ✅ Expected Result:
- IdP has no session → returns `login_required`
- Shows login form

---

## Debugging Commands

### Check running services:
```powershell
# Check if services are running
Get-NetTCPConnection -LocalPort 5000,5001,5173,3002 -ErrorAction SilentlyContinue | 
  Select-Object LocalPort,State

# Check Node processes
Get-Process -Name node -ErrorAction SilentlyContinue | 
  Select-Object Id,ProcessName,@{Name='Port';Expression={
    (Get-NetTCPConnection -OwningProcess $_.Id -ErrorAction SilentlyContinue | 
     Where-Object State -eq Listen).LocalPort -join ','
  }}
```

### Check session cookie in browser console:
```javascript
// List all cookies
document.cookie

// Check specific cookie
document.cookie.split(';').find(c => c.trim().startsWith('ai_platform.sid'))
```

### Check localStorage tokens:
```javascript
// Check token
console.log('Token:', localStorage.getItem('auth_token'));

// Decode JWT (without verification)
const token = localStorage.getItem('auth_token');
if (token) {
  const payload = JSON.parse(atob(token.split('.')[1]));
  console.log('Token payload:', payload);
  console.log('Expires:', new Date(payload.exp * 1000));
}
```

### Backend health checks:
```powershell
# Product Management backend
curl http://localhost:5000/health

# Prompt Management backend  
curl http://localhost:5001/health
```

### Check IdP session status:
```powershell
# This should return user info if logged in
curl http://localhost:5000/api/auth/status -H "Cookie: ai_platform.sid=your-session-id"
```

---

## Common Issues & Solutions

### Issue: Infinite redirect loop
**Cause**: `ssoAttempted` flag not working  
**Solution**: Clear sessionStorage and check LoginPage.tsx logic

### Issue: "Invalid client" error
**Cause**: Client ID mismatch  
**Solution**: Check `SSO_CLIENT_ID` in both .env files matches

### Issue: "Invalid redirect_uri" error
**Cause**: Redirect URI not whitelisted  
**Solution**: Check `SSO_REDIRECT_URI` and IdP OIDC config

### Issue: Token not stored
**Cause**: LoginCallbackPage not executing properly  
**Solution**: Check URL hash has `#token=...`, check console logs

### Issue: Session cookie not set
**Cause**: Cookie domain wrong  
**Solution**: Check session config in ai-product-management/backend-node/src/index.ts  
Should be `domain: undefined` or omitted (defaults to hostname)

### Issue: Site B can't detect Site A login
**Cause**: prompt=none not working  
**Solution**: Check IdP authorize endpoint handles `prompt` parameter  
Check backend logs for `/api/oidc/authorize` requests

### Issue: Site A can't detect Site B login
**Cause**: AuthContext not calling checkAuthStatus  
**Solution**: Check Login.tsx useEffect runs checkAuthStatus  
Check /api/auth/status endpoint returns user

---

## Success Criteria

✅ **Scenario 1 passes**: User logs into A → automatically logs into B  
✅ **Scenario 2 passes**: User logs into B → A detects session  
✅ **Scenario 3 passes**: No login → both show forms appropriately  
✅ **No infinite loops**: Login page doesn't redirect infinitely  
✅ **Tokens persist**: Page refresh doesn't log out user  
✅ **Auto-refresh works**: Token refreshes without re-login  
✅ **Logout works**: Clearing session/tokens logs out properly  
✅ **Cookie shared**: `ai_platform.sid` visible on all localhost ports  

---

**Status**: Ready for testing! 🎉

