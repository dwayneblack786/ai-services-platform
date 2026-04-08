# Phase 7: Cross-Service Integration - Design Document

**Date:** 2026-02-06
**Status:** 🔄 In Progress
**Goal:** Enable Java/Python services to consume prompts with real-time cache sync and metrics tracking

---

## Overview

Phase 7 connects the PMS Node.js backend with Java and Python services that actually use the prompts. This enables:
1. **Real-time cache invalidation** across all services when prompts change
2. **Usage metrics tracking** (total uses, latency, error rates)
3. **Session prompt snapshots** for debugging and auditing
4. **Cross-service consistency** via Redis Pub/Sub

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                         PMS Node.js Backend                         │
│  - Manages prompt CRUD operations                                   │
│  - Publishes cache invalidation events to Redis                    │
│  - Aggregates metrics from all services                            │
└────────────┬─────────────────────────────────────┬──────────────────┘
             │                                     │
             │ Redis Pub/Sub                       │ REST API
             │ (cache invalidation)                │ (prompt fetch + metrics)
             │                                     │
    ┌────────▼─────────┐              ┌───────────▼──────────┐
    │  Java Services   │              │  Python Services     │
    │  - Voice AI      │              │  - Chat AI           │
    │  - Subscribe to  │              │  - Subscribe to      │
    │    Redis channel │              │    Redis channel     │
    │  - Local cache   │              │  - Local cache       │
    │  - Report metrics│              │  - Report metrics    │
    └──────────────────┘              └──────────────────────┘
```

---

## Components

### 1. Redis Pub/Sub Cache Invalidation

**Channel:** `pms:cache:invalidate`

**Message Format:**
```json
{
  "event": "prompt_updated" | "prompt_promoted" | "prompt_deleted",
  "promptId": "507f1f77bcf86cd799439011",
  "promptVersionId": "507f1f77bcf86cd799439012",
  "tenantId": "tenant123",
  "productId": "product456",
  "channelType": "voice" | "chat",
  "environment": "production",
  "timestamp": "2026-02-06T12:34:56.789Z"
}
```

**Publisher (Node.js):**
- Publishes message when:
  - Prompt promoted to production
  - Production prompt updated
  - Production prompt deleted/archived

**Subscribers (Java/Python):**
- Listen on channel `pms:cache:invalidate`
- Invalidate local cache for matching prompt
- Fetch fresh prompt from PMS API

### 2. Usage Metrics Tracking

**Metrics Schema (in PromptVersion):**
```typescript
metrics: {
  totalUses: number;           // Total invocations
  successCount: number;        // Successful completions
  errorCount: number;          // Failed invocations
  avgLatency: number;          // Average response time (ms)
  p95Latency: number;          // 95th percentile latency
  p99Latency: number;          // 99th percentile latency
  avgTokensUsed: number;       // Average tokens per request
  totalCost: number;           // Total cost in USD
  lastUsedAt: Date;            // Last invocation timestamp
  errorRate: number;           // Calculated: errorCount / totalUses
  successRate: number;         // Calculated: successCount / totalUses
}
```

**Metrics Collection:**
```
Java/Python Service
  ↓
POST /api/pms/metrics/report
  {
    promptVersionId: "...",
    invocations: [
      { success: true, latency: 234, tokens: 150, cost: 0.002 },
      { success: false, latency: 5000, error: "timeout" }
    ]
  }
  ↓
Node.js Backend
  - Aggregates metrics
  - Updates PromptVersion.metrics
  - Updates Redis cache
```

### 3. Session Prompt Snapshots

**Use Case:** Capture exact prompt used in each AI conversation for debugging

**Schema (new collection: `prompt_snapshots`):**
```typescript
{
  _id: ObjectId,
  sessionId: string;           // From Java/Python service
  promptVersionId: ObjectId;   // Reference to PromptVersion
  promptContent: object;       // Full snapshot of content at use time
  tenantId: string,
  productId: string,
  channelType: string,
  capturedAt: Date,
  expiresAt: Date              // TTL index - expire after 90 days
}
```

**API:**
- `POST /api/pms/snapshots` - Create snapshot
- `GET /api/pms/snapshots/:sessionId` - Retrieve snapshot for debugging

---

## Implementation Plan

### Backend Changes

#### 1. Add Redis Pub/Sub Service
**File:** `src/services/redis-pubsub.service.ts`

```typescript
export class RedisPubSubService {
  async publishCacheInvalidation(event: CacheInvalidationEvent): Promise<void>
  async subscribe(channel: string, handler: Function): Promise<void>
}
```

#### 2. Update PromptService
**File:** `src/services/prompt.service.ts`

Add hooks to publish cache invalidation:
- After `promotePrompt()` to production
- After `updateDraft()` if state is production
- After `softDeletePrompt()` if state is production

#### 3. Add Metrics Service
**File:** `src/services/metrics.service.ts`

```typescript
export class MetricsService {
  async recordInvocation(promptVersionId, metrics): Promise<void>
  async getMetrics(promptVersionId): Promise<MetricsData>
  async aggregateMetrics(promptVersionId): Promise<void>
}
```

#### 4. Add Metrics Routes
**File:** `src/routes/metrics-routes.ts`

```typescript
POST   /api/pms/metrics/report        // Record invocation metrics
GET    /api/pms/metrics/:versionId    // Get aggregated metrics
```

#### 5. Add Snapshots Routes
**File:** `src/routes/snapshot-routes.ts`

```typescript
POST   /api/pms/snapshots              // Create snapshot
GET    /api/pms/snapshots/:sessionId   // Get snapshot
```

#### 6. Update Models
**File:** `src/models/PromptVersion.ts`

Add `metrics` field:
```typescript
metrics: {
  totalUses: { type: Number, default: 0 },
  successCount: { type: Number, default: 0 },
  errorCount: { type: Number, default: 0 },
  avgLatency: { type: Number },
  p95Latency: { type: Number },
  p99Latency: { type: Number },
  avgTokensUsed: { type: Number },
  totalCost: { type: Number, default: 0 },
  lastUsedAt: { type: Date },
  errorRate: { type: Number },
  successRate: { type: Number }
}
```

**File:** `src/models/PromptSnapshot.ts` (NEW)

Create new model for session snapshots.

### Frontend Changes

#### 1. Update API Client
**File:** `src/services/promptApi.ts`

```typescript
async getMetrics(versionId: string): Promise<MetricsData>
```

#### 2. Update Components
**Files:**
- `src/pages/TenantPrompts.tsx` - Display real metrics (remove TODO)
- `src/pages/PromptManagement.tsx` - Display lastScore from API

---

## API Specifications

### POST /api/pms/metrics/report

**Request:**
```json
{
  "promptVersionId": "507f1f77bcf86cd799439011",
  "invocations": [
    {
      "success": true,
      "latency": 234,
      "tokens": 150,
      "cost": 0.002,
      "timestamp": "2026-02-06T12:34:56.789Z"
    },
    {
      "success": false,
      "latency": 5000,
      "error": "timeout",
      "timestamp": "2026-02-06T12:35:01.123Z"
    }
  ]
}
```

**Response:**
```json
{
  "recorded": 2,
  "metrics": {
    "totalUses": 142,
    "avgLatency": 287.5,
    "errorRate": 0.014
  }
}
```

### GET /api/pms/metrics/:versionId

**Response:**
```json
{
  "promptVersionId": "507f1f77bcf86cd799439011",
  "metrics": {
    "totalUses": 1423,
    "successCount": 1401,
    "errorCount": 22,
    "avgLatency": 287.5,
    "p95Latency": 450,
    "p99Latency": 890,
    "avgTokensUsed": 142,
    "totalCost": 2.85,
    "lastUsedAt": "2026-02-06T12:35:01.123Z",
    "errorRate": 0.015,
    "successRate": 0.985
  }
}
```

---

## Java Service Integration Example

```java
public class PromptCacheManager {
    private RedisClient redis;
    private Map<String, Prompt> cache = new ConcurrentHashMap<>();

    public void subscribeToInvalidation() {
        redis.subscribe("pms:cache:invalidate", message -> {
            CacheInvalidationEvent event = parseEvent(message);
            String cacheKey = getCacheKey(event);
            cache.remove(cacheKey);
            log.info("Cache invalidated for: {}", cacheKey);
        });
    }

    public Prompt getPrompt(String tenantId, String productId, String channelType) {
        String key = getCacheKey(tenantId, productId, channelType);

        if (!cache.containsKey(key)) {
            // Fetch from PMS API
            Prompt prompt = pmsApiClient.getActivePrompt(tenantId, productId, channelType, "production");
            cache.put(key, prompt);
        }

        return cache.get(key);
    }

    public void reportMetrics(String versionId, InvocationMetrics metrics) {
        pmsApiClient.reportMetrics(versionId, List.of(metrics));
    }
}
```

---

## Python Service Integration Example

```python
class PromptCacheManager:
    def __init__(self, redis_client, pms_api_client):
        self.redis = redis_client
        self.pms_api = pms_api_client
        self.cache = {}

    def subscribe_to_invalidation(self):
        pubsub = self.redis.pubsub()
        pubsub.subscribe("pms:cache:invalidate")

        for message in pubsub.listen():
            if message['type'] == 'message':
                event = json.loads(message['data'])
                cache_key = self._get_cache_key(event)
                if cache_key in self.cache:
                    del self.cache[cache_key]
                    logger.info(f"Cache invalidated for: {cache_key}")

    def get_prompt(self, tenant_id, product_id, channel_type):
        key = self._get_cache_key({"tenantId": tenant_id, "productId": product_id, "channelType": channel_type})

        if key not in self.cache:
            prompt = self.pms_api.get_active_prompt(tenant_id, product_id, channel_type, "production")
            self.cache[key] = prompt

        return self.cache[key]

    def report_metrics(self, version_id, metrics):
        self.pms_api.report_metrics(version_id, [metrics])
```

---

## Testing Strategy

### Unit Tests
- Redis Pub/Sub service
- Metrics aggregation logic
- Snapshot creation/retrieval

### Integration Tests
- Publish invalidation → Subscribe receives message
- Report metrics → Metrics updated in database
- Create snapshot → Retrieve snapshot

### E2E Tests
- Java service receives cache invalidation
- Python service reports metrics correctly
- Metrics displayed in frontend

---

## Rollout Plan

### Phase 7.1: Redis Pub/Sub (Week 13, Days 1-2)
1. Implement RedisPubSubService
2. Add hooks to PromptService
3. Add tests for pub/sub

### Phase 7.2: Metrics Tracking (Week 13, Days 3-4)
1. Update PromptVersion model
2. Implement MetricsService
3. Add metrics API endpoints
4. Update frontend to display metrics

### Phase 7.3: Session Snapshots (Week 13, Day 5)
1. Create PromptSnapshot model
2. Add snapshot routes
3. Add tests

### Phase 7.4: Java Integration (Week 14, Days 1-2)
1. Create Java client library
2. Add cache manager example
3. Integration testing

### Phase 7.5: Python Integration (Week 14, Days 3-4)
1. Create Python client library
2. Add cache manager example
3. Integration testing

---

## Success Criteria

- ✅ Redis Pub/Sub working between services
- ✅ Cache invalidation < 1 second latency
- ✅ Metrics tracked and displayed in UI
- ✅ Java service can fetch and cache prompts
- ✅ Python service can fetch and cache prompts
- ✅ Session snapshots stored and retrievable
- ✅ All Phase 7 tests passing

---

## Files to Create/Modify

### Backend (New)
- `src/services/redis-pubsub.service.ts`
- `src/services/metrics.service.ts`
- `src/routes/metrics-routes.ts`
- `src/routes/snapshot-routes.ts`
- `src/models/PromptSnapshot.ts`

### Backend (Modify)
- `src/services/prompt.service.ts` - Add cache invalidation hooks
- `src/models/PromptVersion.ts` - Add metrics field
- `src/index.ts` - Register new routes

### Frontend (Modify)
- `src/services/promptApi.ts` - Add getMetrics method
- `src/pages/TenantPrompts.tsx` - Remove TODO, fetch real metrics
- `src/pages/PromptManagement.tsx` - Fetch and display lastScore

### Tests (New)
- `tests/phase7/redis-pubsub.test.ts`
- `tests/phase7/metrics.test.ts`
- `tests/phase7/snapshots.test.ts`

### Documentation (New)
- `docs/PHASE_7_COMPLETE.md` - Implementation summary
- `docs/JAVA_CLIENT_GUIDE.md` - Java integration guide
- `docs/PYTHON_CLIENT_GUIDE.md` - Python integration guide

---

## Next Steps

1. Review this design document
2. Start implementation with Phase 7.1 (Redis Pub/Sub)
3. Proceed sequentially through phases
4. Update documentation as we go
