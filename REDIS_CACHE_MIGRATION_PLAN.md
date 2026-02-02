# Redis Cache Migration - Progress Tracking

## Overview
Migrating all session and cache storage to use Redis as primary with localStorage as fallback. This provides a unified cache layer that automatically handles failover when Redis is unavailable.

---

## Phase 1: Backend Cache Infrastructure ✅ COMPLETE

### Completed Tasks

#### 1. Backend Cache Service ✅
- **File**: `backend-node/src/services/cache.service.ts`
- **Features**:
  - Redis as primary cache with automatic failover to in-memory
  - Namespace support (`app`, `session`, `tenant`, `user`, `temp`)
  - TTL (Time-To-Live) support for cache entries
  - Operations: `get`, `set`, `getJSON`, `setJSON`, `delete`, `deletePattern`, `exists`, `clear`
  - Automatic cleanup of expired in-memory entries
  - Connection monitoring and error handling
  - Status reporting: `getStatus()`

#### 2. Frontend Cache Client ✅
- **File**: `frontend/src/services/cacheClient.ts`
- **Features**:
  - Backend Redis cache as primary via API
  - localStorage as fallback when backend is unavailable
  - Automatic backend availability checking (every 30 seconds)
  - Same interface as backend: `get`, `set`, `getJSON`, `setJSON`, `delete`, `exists`, `clear`
  - TTL support with metadata in localStorage
  - Automatic cleanup of expired localStorage entries
  - Quota exceeded handling

#### 3. Backend Cache API ✅
- **File**: `backend-node/src/routes/cache.routes.ts`
- **Endpoints**:
  - `GET /api/cache/health` - Health check
  - `GET /api/cache/:key` - Get cache value
  - `POST /api/cache` - Set cache value (body: `{ key, value, ttl? }`)
  - `DELETE /api/cache/:key` - Delete cache value
  - `POST /api/cache/clear` - Clear namespace (body: `{ namespace? }`)
  - `HEAD /api/cache/:key` - Check if key exists

#### 4. Integration ✅
- Cache routes imported and registered in `backend-node/src/index.ts`
- Routes mounted at `/api/cache`
- Uses existing Redis client from `backend-node/src/config/redis.ts`

---

## Usage Examples

### Backend Usage

```typescript
import { cacheService, userCache, sessionCache } from '../services/cache.service';

// Basic usage
await cacheService.set('user-prefs', { theme: 'dark' }, 3600); // TTL: 1 hour
const prefs = await cacheService.getJSON('user-prefs');

// Namespaced usage
await userCache.set('123:profile', { name: 'John' });
await sessionCache.set('abc123', { userId: '123' }, 1800); // 30 min

// Pattern deletion
await userCache.deletePattern('123:*'); // Delete all keys for user 123

// Check status
const status = cacheService.getStatus();
console.log(`Using: ${status.using}, Ready: ${status.ready}`);
```

### Frontend Usage

```typescript
import { cacheClient, userCache, sessionCache } from './services/cacheClient';

// Basic usage
await cacheClient.set('user-prefs', { theme: 'dark' }, 3600);
const prefs = await cacheClient.getJSON('user-prefs');

// Namespaced usage
await userCache.set('profile', { name: 'John' });
await sessionCache.set('token', 'abc123', 1800);

// Check what backend is being used
const status = cacheClient.getStatus();
console.log(`Using: ${status.using}`); // 'backend' or 'localStorage'
```

---

## Phase 2: Migrate Login/Auth State ✅ COMPLETE

### Completed Tasks

#### 1. Login.tsx - tenantId storage ✅
- **File**: `frontend/src/pages/Login.tsx`
- **Changes**:
  - Imported `sessionCache` from cacheClient
  - Replaced `localStorage.setItem('tenantId', ...)` with `await sessionCache.set('tenantId', ..., 1800)` (30 min TTL)
  - Added async handling for cache operations

#### 2. Analytics.tsx - token storage ✅
- **File**: `frontend/src/pages/Analytics.tsx`
- **Changes**:
  - Dynamic import of `sessionCache` in fetchAnalytics function
  - Replaced `localStorage.getItem('token')` with `await sessionCache.get('token')`
  - Added async handling for cache operations

#### 3. Registration Flow - sessionStorage migration ✅
- **Files**: 
  - `frontend/src/pages/InitiateRegistration.tsx`
  - `frontend/src/pages/VerifyPhone.tsx`
  - `frontend/src/pages/SetupAccount.tsx`
  - `frontend/src/pages/SetupCompany.tsx`
  - `frontend/src/pages/ReviewSubmit.tsx`
- **Changes**:
  - Imported `tempCache` from cacheClient
  - Converted synchronous sessionStorage to async state management
  - Replaced `sessionStorage.setItem/getItem/removeItem` with cache operations
  - Added TTL of 1 hour (3600s) for registration session IDs
  - Updated component state to handle async cache loading

#### 4. OAuth Callback - pendingTenantId ✅
- **File**: `frontend/src/pages/OAuthCallback.tsx`
- **Changes**:
  - Imported `tempCache` from cacheClient
  - Converted sessionStorage to async cache operations
  - Updated component to load pendingTenantId from cache before processing
  - Properly handled async flow in useEffect

### Migration Summary

All frontend localStorage and sessionStorage usage for auth and session management has been migrated to the unified cache client with proper:
- Async/await handling
- TTL configuration (30 min for auth, 1 hour for registration)
- Automatic backend/localStorage fallback
- State management updates for async loading

---

---

## Phase 3: Migrate User Preferences (NEXT)

### Tasks to Complete

1. Identify all user preference localStorage keys
2. Migrate to `userCache` namespace
3. Set appropriate TTL for preferences
4. Test preference persistence and expiry

### Estimated Effort: 1-2 hours

---

## Phase 4: Migrate Temporary/Form Data (TODO)

### Tasks to Complete

1. Identify temporary data/form state in localStorage
2. Migrate to `tempCache` namespace
3. Use shorter TTL for temporary data
4. Add cleanup on successful form submission

### Estimated Effort: 1-2 hours

---

## Phase 5: Testing & Validation (TODO)

### Tasks to Complete

1. **Redis availability testing**
   - Test with Redis running
   - Test with Redis unavailable (fallback scenarios)
   - Test Redis reconnection

2. **Failover testing**
   - Backend: Redis to in-memory failover
   - Frontend: Backend API to localStorage failover
   - Verify data consistency

3. **Performance testing**
   - Measure cache hit/miss rates
   - Monitor Redis memory usage
   - Test with large cache datasets

4. **Edge cases**
   - localStorage quota exceeded
   - Redis connection timeout
   - Expired cache entries
   - Namespace collisions

### Estimated Effort: 2-3 hours

---

## Phase 6: Cleanup & Documentation (TODO)

### Tasks to Complete

1. Remove old direct localStorage calls
2. Update documentation
3. Add migration guide for developers
4. Update API documentation
5. Add monitoring/metrics for cache usage

### Estimated Effort: 1-2 hours

---

## Testing Phase 1

To test the new cache infrastructure:

### Backend Test
```bash
# Start backend
cd backend-node
npm run dev

# Test cache API
curl http://localhost:5000/api/cache/health
curl -X POST http://localhost:5000/api/cache -H "Content-Type: application/json" -d '{"key":"test","value":"hello","ttl":60}'
curl http://localhost:5000/api/cache/test
```

### Frontend Test
```typescript
// Add to any component for testing
import { cacheClient } from './services/cacheClient';

useEffect(() => {
  const testCache = async () => {
    await cacheClient.set('test-key', 'test-value', 60);
    const value = await cacheClient.get('test-key');
    console.log('Cache test:', value);
    console.log('Status:', cacheClient.getStatus());
  };
  testCache();
}, []);
```

---

## Configuration

### Environment Variables

Ensure these are set in your `.env` files:

```bash
# Backend (.env)
REDIS_URL=redis://localhost:6379

# Frontend (.env)
VITE_API_URL=http://localhost:5000
```

### Redis Setup

If Redis is not already running:

```bash
# Windows (using Chocolatey)
choco install redis-64

# Or use Docker
docker run -d -p 6379:6379 redis:latest

# Or use WSL
sudo apt-get install redis-server
redis-server
```

---

## Notes

- All cache operations are async (use `await`)
- Frontend cache client automatically handles backend availability
- TTL is optional; omit for no expiration
- Namespaces help organize cache keys
- In-memory fallback has automatic cleanup every 60 seconds
- localStorage fallback handles quota exceeded gracefully

---

## Next Steps

1. ✅ Complete Phase 1 - Backend cache infrastructure
2. ✅ Complete Phase 2 - Migrate Login/Auth state
3. 🔄 Start Phase 3 - Migrate User Preferences (identify and migrate user preferences)
4. Continue through remaining phases systematically
5. Update this document as each task is completed

---

**Last Updated**: February 2, 2026
**Current Phase**: Phase 2 Complete ✅ → Starting Phase 3 🔄

### Phase 1 & 2 Summary

**Phase 1** implemented the complete cache infrastructure:
- Backend cache service with Redis primary and in-memory fallback
- Frontend cache client with backend API and localStorage fallback
- Cache API endpoints at `/api/cache/*`
- Test suite: `npm run test:cache`

**Phase 2** migrated all auth and session state:
- **Login**: tenantId → sessionCache (30 min TTL)
- **Analytics**: token → sessionCache
- **Registration Flow**: registrationSessionId → tempCache (1 hour TTL)
- **OAuth**: pendingTenantId → tempCache
- Converted 9 files from synchronous localStorage/sessionStorage to async cache client

### Next Phase

Phase 3 will identify and migrate user preferences (theme, settings, etc.) to use the unified cache with appropriate TTL and namespace separation.
