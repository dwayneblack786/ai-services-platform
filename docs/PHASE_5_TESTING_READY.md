# Phase 5: Redis Cache Migration - Testing & Validation Guide

**Status:** ✅ Ready for Testing  
**Date:** February 6, 2026  
**Branch:** `appmod/java-upgrade-20260122145015`  
**Commits:** `5f0f678`, `9b84713` (pushed to remote)

---

## Overview

Phases 1-4 are complete with all localStorage/sessionStorage usage migrated to a unified cache layer. The system is now ready for comprehensive testing and validation.

---

## What's Been Implemented ✅

### Backend Infrastructure
- ✅ **Redis Cache Service** (`backend-node/src/services/cache.service.ts`)
  - Redis as primary with automatic in-memory failover
  - Namespace support: `app`, `session`, `tenant`, `user`, `temp`
  - TTL support, pattern deletion, automatic cleanup
  - Operations: `get`, `set`, `getJSON`, `setJSON`, `delete`, `exists`, `clear`

- ✅ **Cache API** (`backend-node/src/routes/cache.routes.ts`)
  - `GET /api/cache/health` - Health check
  - `GET /api/cache/:key` - Get value
  - `POST /api/cache` - Set value (with TTL)
  - `DELETE /api/cache/:key` - Delete value
  - `POST /api/cache/clear` - Clear namespace
  - `HEAD /api/cache/:key` - Check existence

### Frontend Infrastructure
- ✅ **Cache Client** (`frontend/src/services/cacheClient.ts`)
  - Backend API as primary
  - localStorage as fallback
  - Automatic backend availability checking (30s intervals)
  - Same API as backend for consistency
  - TTL support with metadata
  - Quota exceeded handling

- ✅ **Namespace Helpers**
  - `sessionCache` - Auth tokens, session state
  - `userCache` - User preferences
  - `tempCache` - Registration/temporary data

### Migrated Components
- ✅ **Authentication & Sessions**
  - Login.tsx - tenantId storage
  - Analytics.tsx - token retrieval
  - OAuthCallback.tsx - pendingTenantId

- ✅ **Registration Flow**
  - InitiateRegistration.tsx
  - VerifyPhone.tsx
  - SetupAccount.tsx
  - SetupCompany.tsx
  - ReviewSubmit.tsx

- ✅ **Data Access**
  - AssistantChat.tsx - chat session management
  - CallLogs.tsx - token retrieval
  - Transcripts.tsx - token retrieval

### Exceptions (Justified)
- ✅ **cacheClient.ts** - Intentional fallback layer
- ✅ **sentry.ts** - Synchronous error tracking

---

## Phase 5: Testing Checklist

### 1. Redis Availability Testing 🔄

#### Test 1.1: Normal Operation (Redis Running)
**Prerequisites:**
- Redis running on `localhost:6379`
- Backend running on port 5000
- Frontend running on port 5173

**Test Steps:**
```bash
# 1. Start Redis
docker run -d -p 6379:6379 redis:latest
# OR on Windows with Chocolatey
redis-server

# 2. Start backend
cd product-management/backend-node
npm run dev

# 3. Start frontend
cd product-management/frontend
npm run dev
```

**Expected Results:**
- ✅ Backend cache service reports `using: redis`
- ✅ Frontend cache client reports `using: backend`
- ✅ Login and navigation work smoothly
- ✅ Session persists across page refreshes
- ✅ No localStorage fallback warnings in console

**How to Verify:**
1. Open DevTools Console
2. Check backend logs: `Using Redis cache`
3. Check frontend: Cache client should use backend API
4. Login and verify token persists

---

#### Test 1.2: Redis Unavailable (Fallback)
**Test Steps:**
```bash
# 1. Stop Redis
docker stop $(docker ps -q --filter ancestor=redis)
# OR
taskkill /F /IM redis-server.exe

# 2. Restart backend (should auto-failover)
cd product-management/backend-node
npm run dev
```

**Expected Results:**
- ✅ Backend falls back to in-memory cache
- ✅ Backend logs: `Redis unavailable, using in-memory fallback`
- ✅ Frontend continues to work (uses localStorage)
- ✅ Login/session management still functional
- ✅ No frontend errors

**How to Verify:**
1. Check backend logs for fallback message
2. Try login - should work normally
3. Check DevTools: `cacheClient` uses localStorage
4. Verify data persists in localStorage

---

#### Test 1.3: Redis Reconnection
**Test Steps:**
```bash
# 1. Start with Redis running
redis-server

# 2. Stop Redis while app is running
docker stop $(docker ps -q --filter ancestor=redis)

# 3. Wait 10 seconds

# 4. Restart Redis
redis-server

# 5. Wait 30 seconds for backend to reconnect
```

**Expected Results:**
- ✅ Backend detects Redis is back
- ✅ Backend switches from in-memory to Redis
- ✅ Frontend detects backend is healthy
- ✅ Frontend switches from localStorage to backend
- ✅ Data consistency maintained

**How to Verify:**
1. Monitor backend logs for reconnection
2. Check `cacheClient.getStatus()` in console
3. Test login/logout cycle
4. Verify no data loss

---

### 2. Failover Testing 🔄

#### Test 2.1: Backend Failover (Redis → In-Memory)
**Test API Directly:**
```bash
# With Redis running
curl http://localhost:5000/api/cache/health
# Response: {"status":"healthy","backend":"redis"}

# Stop Redis
docker stop $(docker ps -q --filter ancestor=redis)

# Wait 5 seconds, test again
curl http://localhost:5000/api/cache/health
# Response: {"status":"healthy","backend":"in-memory"}

# Store and retrieve data
curl -X POST http://localhost:5000/api/cache \
  -H "Content-Type: application/json" \
  -d '{"key":"test-key","value":"test-value","ttl":60}'

curl http://localhost:5000/api/cache/test-key
# Response: {"success":true,"value":"test-value"}
```

**Expected Results:**
- ✅ Cache health endpoint reports correct backend
- ✅ Set/get operations work in both modes
- ✅ No errors during transition

---

#### Test 2.2: Frontend Failover (Backend → localStorage)
**Test Steps:**
```bash
# 1. Start frontend with backend running
npm run dev

# 2. Open DevTools Console, run:
console.log(cacheClient.getStatus());
# Should show: {using: 'backend', ready: true}

# 3. Stop backend
# (Close backend terminal or Ctrl+C)

# 4. Wait 30 seconds for frontend to detect

# 5. Check status again:
console.log(cacheClient.getStatus());
# Should show: {using: 'localStorage', ready: false}

# 6. Try to login - should still work using localStorage
```

**Expected Results:**
- ✅ Frontend detects backend unavailability
- ✅ Switches to localStorage automatically
- ✅ Login/session management continues to work
- ✅ No user-facing errors

---

#### Test 2.3: Data Consistency Across Failovers
**Test Steps:**
1. Store token with backend available
2. Stop backend
3. Retrieve token (should get from localStorage)
4. Start backend
5. Store new token
6. Verify new token in both backend and localStorage

**Expected Results:**
- ✅ Data accessible during failover
- ✅ New writes go to active storage
- ✅ No data corruption or conflicts

---

### 3. Performance Testing 🔄

#### Test 3.1: Cache Hit/Miss Rates
**Add Instrumentation:**
```typescript
// Temporarily add to cacheClient.ts
let hits = 0, misses = 0;

// In get() method:
if (value) hits++; else misses++;

console.log(`Cache stats: ${hits} hits, ${misses} misses, ${(hits/(hits+misses)*100).toFixed(1)}% hit rate`);
```

**Test Scenario:**
1. Login (should cache token)
2. Navigate to multiple pages (should reuse token)
3. Logout and login again
4. Check hit rate

**Expected Results:**
- ✅ Hit rate > 80% for session tokens
- ✅ Token retrieved from cache, not localStorage

---

#### Test 3.2: Redis Memory Usage
**Monitor Redis:**
```bash
# Connect to Redis
redis-cli

# Check memory usage
INFO memory

# Monitor keys
KEYS *

# Check TTL on session keys
TTL session:token
TTL temp:registrationSessionId
```

**Expected Results:**
- ✅ Memory usage reasonable (< 100MB for typical use)
- ✅ TTLs set correctly (1800s for sessions, 3600s for temp)
- ✅ Expired keys cleaned up automatically

---

#### Test 3.3: Large Dataset Performance
**Stress Test:**
```typescript
// Run in DevTools Console
const testLargeDataset = async () => {
  const start = Date.now();
  
  // Store 1000 items
  for (let i = 0; i < 1000; i++) {
    await sessionCache.set(`test-${i}`, { data: 'x'.repeat(100) }, 300);
  }
  
  // Retrieve 1000 items
  for (let i = 0; i < 1000; i++) {
    await sessionCache.get(`test-${i}`);
  }
  
  const elapsed = Date.now() - start;
  console.log(`1000 writes + 1000 reads: ${elapsed}ms`);
};

testLargeDataset();
```

**Expected Results:**
- ✅ Operations complete in < 10 seconds
- ✅ No memory leaks
- ✅ No quota exceeded errors

---

### 4. Edge Cases Testing 🔄

#### Test 4.1: localStorage Quota Exceeded
**Simulate Quota:**
```typescript
// Fill localStorage to near capacity
const fillStorage = () => {
  try {
    for (let i = 0; i < 1000; i++) {
      localStorage.setItem(`filler-${i}`, 'x'.repeat(10000));
    }
  } catch (e) {
    console.log('Quota reached:', e);
  }
};

fillStorage();

// Now try to use cache
await sessionCache.set('test-key', 'test-value');
```

**Expected Results:**
- ✅ Cache client catches quota exceeded error
- ✅ Graceful degradation (console warning, but no crash)
- ✅ Application continues to function

---

#### Test 4.2: Redis Connection Timeout
**Simulate Slow Redis:**
```bash
# Use network delay tool or
# Configure Redis with timeout

# Test with timeout
curl -X POST http://localhost:5000/api/cache \
  -H "Content-Type: application/json" \
  -d '{"key":"test-key","value":"test-value"}' \
  --max-time 5
```

**Expected Results:**
- ✅ Backend handles timeout gracefully
- ✅ Falls back to in-memory cache
- ✅ No 500 errors returned to frontend

---

#### Test 4.3: Expired Cache Entries
**Test TTL Expiration:**
```typescript
// Store with short TTL
await sessionCache.set('short-lived', 'value', 5); // 5 seconds

// Retrieve immediately
const value1 = await sessionCache.get('short-lived');
console.log('Before expiry:', value1); // Should be 'value'

// Wait 6 seconds
await new Promise(resolve => setTimeout(resolve, 6000));

// Retrieve again
const value2 = await sessionCache.get('short-lived');
console.log('After expiry:', value2); // Should be null
```

**Expected Results:**
- ✅ Values expire after TTL
- ✅ Expired entries return null
- ✅ No stale data served

---

#### Test 4.4: Namespace Collisions
**Test Namespace Isolation:**
```typescript
// Store in different namespaces
await sessionCache.set('key', 'session-value');
await userCache.set('key', 'user-value');
await tempCache.set('key', 'temp-value');

// Retrieve from each
const session = await sessionCache.get('key');
const user = await userCache.get('key');
const temp = await tempCache.get('key');

console.log({ session, user, temp });
// Should be: { session: 'session-value', user: 'user-value', temp: 'temp-value' }
```

**Expected Results:**
- ✅ No namespace collisions
- ✅ Each namespace isolated
- ✅ Clear operations respect namespaces

---

## User Flow Testing

### Critical User Journeys

#### Journey 1: New User Registration
1. Navigate to registration
2. Fill form (data stored in tempCache with 1h TTL)
3. Verify phone
4. Complete registration
5. ✅ **Verify**: Registration session ID cleaned up after success

#### Journey 2: Login & Session Management
1. Login with credentials
2. ✅ **Verify**: Token stored in sessionCache (30 min TTL)
3. Navigate between pages
4. ✅ **Verify**: Token reused from cache
5. Refresh page
6. ✅ **Verify**: Session persists
7. Wait 31 minutes, try to access protected page
8. ✅ **Verify**: Redirected to login (expired)

#### Journey 3: Chat Session
1. Open AssistantChat
2. Start conversation
3. ✅ **Verify**: chatSessionId stored in sessionCache
4. Refresh page
5. ✅ **Verify**: Session ID persists
6. End chat
7. ✅ **Verify**: Session ID cleaned up

---

## Monitoring & Debugging

### Backend Logs to Monitor
```
✅ "Using Redis cache" - Normal operation
⚠️ "Redis unavailable, using in-memory fallback" - Failover
✅ "Redis connection established" - Reconnection
```

### Frontend Console Checks
```javascript
// Check cache status
cacheClient.getStatus();
// {using: 'backend' | 'localStorage', ready: true | false}

// Inspect localStorage
Object.keys(localStorage).filter(k => k.includes('app:') || k.includes('session:'));

// Check session cache
await sessionCache.get('token');
```

### Redis Monitoring
```bash
# Monitor all commands
redis-cli MONITOR

# Check keys by namespace
redis-cli KEYS "session:*"
redis-cli KEYS "temp:*"
redis-cli KEYS "user:*"

# Check memory
redis-cli INFO memory

# Check connected clients
redis-cli CLIENT LIST
```

---

## Known Issues & Workarounds

### Issue 1: localStorage Not Clearing on Logout
**Status:** To be verified  
**Workaround:** Manual clear: `localStorage.clear()`

### Issue 2: Backend Doesn't Detect Redis Reconnection
**Status:** To be tested  
**Workaround:** Restart backend after Redis comes back

---

## Success Criteria

Phase 5 is complete when:

- ✅ All 4 test categories pass (Availability, Failover, Performance, Edge Cases)
- ✅ All 3 user journeys work correctly
- ✅ No console errors during normal operation
- ✅ Failover is transparent to users
- ✅ Data persists correctly across refreshes
- ✅ TTLs work as expected
- ✅ Memory usage is reasonable
- ✅ Performance meets targets (< 100ms per operation)

---

## Next Steps After Phase 5

1. **Phase 6: Cleanup & Documentation**
   - Remove any remaining direct localStorage/sessionStorage calls
   - Update developer documentation
   - Add migration guide
   - Add monitoring/metrics dashboard

2. **Production Readiness**
   - Configure Redis for production (persistence, clustering)
   - Set up Redis monitoring (memory, connections, latency)
   - Configure cache TTLs based on usage patterns
   - Add cache invalidation strategies

---

## Quick Start Testing

### Minimal Test (5 minutes)
```bash
# 1. Ensure Redis running
redis-server

# 2. Start backend
cd product-management/backend-node && npm run dev

# 3. Start frontend
cd product-management/frontend && npm run dev

# 4. Test login
# Navigate to http://localhost:5173
# Login with test credentials
# Check DevTools console for cache status

# 5. Test failover
# Stop Redis: docker stop $(docker ps -q --filter ancestor=redis)
# Refresh page - should still work
# Check console: should show localStorage fallback
```

### Full Test (2-3 hours)
Follow all test sections above systematically.

---

## Questions or Issues?

- Check [REDIS_CACHE_MIGRATION_PLAN.md](REDIS_CACHE_MIGRATION_PLAN.md) for architecture details
- Review backend logs in `backend-node/` terminal
- Inspect frontend cache client in DevTools
- Check Redis directly with `redis-cli`

---

**Ready to begin testing!** 🚀
