# Phase 2 Testing Guide - Auth & Session State Migration

## Testing Checklist

### Prerequisites
- Backend running: `cd backend-node && npm run dev`
- Frontend running: `cd frontend && npm run dev`
- Redis running (or test fallback by stopping Redis)

---

## Test 1: Login Flow with Cache

### Steps:
1. Navigate to http://localhost:5173/login
2. Enter a tenant ID (e.g., `test-tenant`)
3. Open browser DevTools → Application → Local Storage
4. **Verify**: No `tenantId` in localStorage (migrated to cache)
5. Complete login flow
6. Open DevTools → Console
7. Run:
   ```javascript
   import('../src/services/cacheClient.ts').then(async ({sessionCache}) => {
     const tenantId = await sessionCache.get('tenantId');
     console.log('tenantId from cache:', tenantId);
   });
   ```
8. **Expected**: Should see the tenant ID retrieved from cache

### Fallback Test:
1. Stop Redis: `redis-cli shutdown` (or stop Docker container)
2. Repeat steps 1-5
3. **Expected**: Login should still work using localStorage fallback
4. Check DevTools → Application → Local Storage
5. **Verify**: `session:tenantId` key exists with metadata (value, expiry, timestamp)

---

## Test 2: Registration Flow with Cache

### Steps:
1. Navigate to http://localhost:5173/register/initiate
2. Fill in registration form:
   - Email: test@example.com
   - Phone: +1234567890
   - Agree to terms
3. Submit form
4. Open DevTools → Console
5. Run:
   ```javascript
   import('../src/services/cacheClient.ts').then(async ({tempCache}) => {
     const sessionId = await tempCache.get('registrationSessionId');
     console.log('registrationSessionId from cache:', sessionId);
   });
   ```
6. **Verify**: Registration session ID is in cache, NOT in sessionStorage
7. Complete phone verification → setup account → setup company → review/submit
8. After final submission, verify cache is cleared:
   ```javascript
   import('../src/services/cacheClient.ts').then(async ({tempCache}) => {
     const sessionId = await tempCache.get('registrationSessionId');
     console.log('registrationSessionId after submit:', sessionId); // Should be null
   });
   ```

### Session State Persistence:
1. Start registration flow (step 1-3 above)
2. Refresh the page
3. **Expected**: Should be redirected back to `/register/initiate` (cache cleared on refresh in current implementation)
4. With Redis backend: Session should persist across page refreshes

---

## Test 3: OAuth Callback Flow

### Steps:
1. Navigate to http://localhost:5173/register/initiate
2. Click "Continue with Google" or "Continue with Microsoft"
3. Before OAuth redirect, set pendingTenantId:
   ```javascript
   import('../src/services/cacheClient.ts').then(async ({tempCache}) => {
     await tempCache.set('pendingTenantId', 'test-tenant', 1800);
   });
   ```
4. Complete OAuth flow
5. **Expected**: Callback page should retrieve pendingTenantId from cache
6. **Verify**: After successful login, pendingTenantId is cleared from cache

---

## Test 4: Analytics Token Retrieval

### Steps:
1. Ensure you're logged in
2. Navigate to http://localhost:5173/analytics
3. Open DevTools → Network tab
4. **Verify**: API request to `/api/analytics` includes Authorization header
5. Check Console for any cache-related errors
6. Test token retrieval:
   ```javascript
   import('../src/services/cacheClient.ts').then(async ({sessionCache}) => {
     const token = await sessionCache.get('token');
     console.log('token from cache:', token);
   });
   ```

---

## Test 5: Cache TTL Expiration

### Test Session Cache (30 min TTL):
1. Login and get tenantId cached
2. In DevTools Console:
   ```javascript
   import('../src/services/cacheClient.ts').then(async ({sessionCache}) => {
     await sessionCache.set('test-key', 'test-value', 5); // 5 seconds TTL
     console.log('Set test-key with 5s TTL');
     
     setTimeout(async () => {
       const value = await sessionCache.get('test-key');
       console.log('test-key after 6s:', value); // Should be null
     }, 6000);
   });
   ```
3. **Expected**: Key expires after 5 seconds

### Test Temp Cache (1 hour TTL):
1. Start registration and verify registrationSessionId is cached
2. Check expiry in localStorage (if using fallback):
   - Application → Local Storage
   - Find `temp:registrationSessionId` key
   - Parse JSON and check `expiry` timestamp (should be ~1 hour from now)

---

## Test 6: Backend Cache API

### Direct API Testing:
```bash
# Health check
curl http://localhost:5000/api/cache/health

# Set a value
curl -X POST http://localhost:5000/api/cache \
  -H "Content-Type: application/json" \
  -d '{"key":"test-auth","value":"test-token","ttl":300}'

# Get a value
curl http://localhost:5000/api/cache/test-auth

# Delete a value
curl -X DELETE http://localhost:5000/api/cache/test-auth

# Check if exists
curl -I http://localhost:5000/api/cache/test-auth
```

---

## Test 7: Redis Connection Failover

### Scenario 1: Redis → In-Memory Failover (Backend)
1. Start backend with Redis running
2. Stop Redis: `redis-cli shutdown`
3. Make a cache request via API (step 6 above)
4. **Expected**: Backend should automatically use in-memory cache
5. Check logs for "Cache: Using in-memory fallback" messages

### Scenario 2: Backend API → localStorage Failover (Frontend)
1. Start frontend with backend cache API available
2. Stop backend server
3. Try to login (triggers cache.set)
4. **Expected**: Frontend should use localStorage fallback
5. Check Console for "Cache: Backend unavailable, using localStorage fallback"
6. Verify data in localStorage: Application → Local Storage → `session:tenantId`

---

## Test 8: Cache Status Monitoring

### Frontend:
```javascript
import('../src/services/cacheClient.ts').then(async ({sessionCache}) => {
  const status = sessionCache.getStatus();
  console.log('Cache status:', status);
  // Expected: { using: 'backend' | 'localStorage', available: true }
});
```

### Backend:
```javascript
// In backend console or via API
curl http://localhost:5000/api/cache/health
// Expected: { status: 'ok', backend: 'redis' | 'memory', ready: true }
```

---

## Common Issues & Solutions

### Issue 1: "Cannot find name 'tempCache'" or similar TypeScript errors
**Solution**: Run `npm install` in frontend directory to ensure all dependencies are installed

### Issue 2: Cache not persisting across page refreshes
**Solution**: 
- Check if Redis is running: `redis-cli ping` (should return "PONG")
- Check backend logs for Redis connection errors
- Verify localStorage fallback has data: DevTools → Application → Local Storage

### Issue 3: "Cache: Backend unavailable" in console
**Solution**: 
- Ensure backend is running on port 5000
- Check CORS configuration allows requests from frontend
- Verify `/api/cache/health` endpoint is accessible

### Issue 4: TTL not expiring
**Solution**:
- **Redis**: TTL is handled by Redis automatically
- **In-memory**: Cleanup runs every 60 seconds, or on next access
- **localStorage**: Expiry checked on each `get()` call

---

## Success Criteria

✅ All tests pass without errors
✅ No direct localStorage/sessionStorage calls in auth flow
✅ Cache persists with Redis, falls back to localStorage/memory
✅ TTL expiration works correctly
✅ No TypeScript compilation errors
✅ No console errors during normal operation

---

## Performance Benchmarks

### Expected Response Times:
- Cache GET (Redis): < 10ms
- Cache GET (in-memory): < 1ms
- Cache GET (localStorage): < 5ms
- Cache SET (Redis): < 15ms
- Cache SET (in-memory): < 2ms
- Cache SET (localStorage): < 10ms

### Monitor in DevTools:
1. Network tab: Check `/api/cache/*` request times
2. Performance tab: Record and analyze cache operations
3. Console: Look for timing logs if logging is enabled

---

## Next Steps After Testing

1. If all tests pass → Proceed to Phase 3 (User Preferences migration)
2. If issues found → Document in GitHub Issues and fix before proceeding
3. Update REDIS_CACHE_MIGRATION_PLAN.md with any lessons learned

---

**Document Version**: 1.0
**Last Updated**: February 2, 2026
**Phase**: 2 - Auth & Session State Migration
