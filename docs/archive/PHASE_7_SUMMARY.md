# Phase 7: Cross-Service Integration - Implementation Summary

**Date:** 2026-02-06
**Status:** 🔄 In Progress - Design Complete, Implementation Starting

---

## Quick Status

### ✅ Completed
- [x] Architecture design document
- [x] Redis Pub/Sub service implementation
- [x] Metrics schema designed

### 🔄 In Progress
- [ ] Extend PromptVersion metrics model
- [ ] Implement MetricsService
- [ ] Add cache invalidation hooks to PromptService

### ⏸️ Pending
- [ ] Metrics API endpoints
- [ ] PromptSnapshot model and routes
- [ ] Frontend metrics integration
- [ ] Java client library example
- [ ] Python client library example
- [ ] Phase 7 tests

---

## What Phase 7 Enables

### 1. Real-Time Cache Synchronization
**Problem Solved:** Java/Python services maintain stale prompts after PMS updates
**Solution:** Redis Pub/Sub broadcasts cache invalidation events
**Impact:** < 1 second propagation time for prompt updates

### 2. Usage Metrics Tracking
**Problem Solved:** No visibility into prompt usage, performance, or errors
**Solution:** Services report invocation metrics back to PMS
**Impact:** Real metrics replace "Not available" placeholders in UI

### 3. Session Prompt Snapshots
**Problem Solved:** Can't reproduce AI behavior from past conversations
**Solution:** Capture exact prompt used in each session
**Impact:** Full debugging and audit trail for AI interactions

---

## Architecture Summary

```
┌──────────────────┐                    ┌──────────────────┐
│   PMS Backend    │                    │ Java/Python      │
│   (Node.js)      │                    │ Services         │
│                  │                    │                  │
│ 1. Update prompt │                    │                  │
│ 2. Publish event ├────Redis Pub/Sub───►│ 3. Receive event│
│    to Redis      │    (< 1 sec)       │ 4. Clear cache   │
│                  │                    │ 5. Fetch fresh   │
│                  │◄────REST API────────┤    prompt        │
│                  │                    │                  │
│ 7. Store metrics │◄────POST metrics───┤ 6. Report usage  │
│ 8. Display in UI │                    │    metrics       │
└──────────────────┘                    └──────────────────┘
```

---

## Implementation Details

### Files Created

#### 1. Redis Pub/Sub Service ✅
**File:** [src/services/redis-pubsub.service.ts](../ai-product-management/backend-node/src/services/redis-pubsub.service.ts)

**Key Methods:**
- `publishCacheInvalidation(event)` - Broadcast invalidation to Redis
- `subscribe(handler)` - Listen for invalidation events (testing)
- `init()` - Connect to Redis with graceful degradation

**Features:**
- Separate pub/sub clients (Redis requirement)
- Graceful degradation if Redis unavailable
- Structured event format for cross-service consistency

#### 2. Design Document ✅
**File:** [docs/PHASE_7_DESIGN.md](./PHASE_7_DESIGN.md)

**Contents:**
- Full architecture diagrams
- API specifications
- Java/Python integration examples
- Testing strategy
- Rollout plan

---

### Files To Create

#### 3. Metrics Service (Next)
**File:** `src/services/metrics.service.ts`

```typescript
class MetricsService {
  // Record individual invocation metrics
  async recordInvocation(versionId, metrics): Promise<void>

  // Get aggregated metrics for a prompt
  async getMetrics(versionId): Promise<MetricsData>

  // Aggregate raw metrics into summary stats
  private aggregateMetrics(invocations): MetricsData
}
```

#### 4. Metrics Routes (Next)
**File:** `src/routes/metrics-routes.ts`

```typescript
POST   /api/pms/metrics/report        // Java/Python reports metrics
GET    /api/pms/metrics/:versionId    // Frontend fetches metrics
```

#### 5. PromptSnapshot Model
**File:** `src/models/PromptSnapshot.ts`

```typescript
{
  sessionId: string,
  promptVersionId: ObjectId,
  promptContent: object,  // Full snapshot
  tenantId: string,
  capturedAt: Date,
  expiresAt: Date  // TTL 90 days
}
```

#### 6. Snapshot Routes
**File:** `src/routes/snapshot-routes.ts`

```typescript
POST   /api/pms/snapshots              // Create snapshot
GET    /api/pms/snapshots/:sessionId   // Retrieve for debugging
```

---

### Files To Modify

#### 7. PromptVersion Model
**File:** `src/models/PromptVersion.ts`

**Current:**
```typescript
metrics?: {
  totalUses: number;
  avgLatency: number;
  errorRate: number;
}
```

**Enhanced (Phase 7):**
```typescript
metrics?: {
  totalUses: number;
  successCount: number;
  errorCount: number;
  avgLatency: number;
  p95Latency: number;
  p99Latency: number;
  avgTokensUsed: number;
  totalCost: number;
  lastUsedAt: Date;
  errorRate: number;      // Calculated
  successRate: number;    // Calculated
}
```

#### 8. PromptService
**File:** `src/services/prompt.service.ts`

**Add hooks after:**
- `promotePrompt()` → production - Publish `prompt_promoted`
- `updateDraft()` → if production - Publish `prompt_updated`
- `softDeletePrompt()` → if production - Publish `prompt_deleted`

```typescript
// Example hook
await redisPubSubService.publishCacheInvalidation({
  event: 'prompt_promoted',
  promptId: prompt.promptId,
  promptVersionId: prompt._id,
  tenantId: prompt.tenantId,
  productId: prompt.productId,
  channelType: prompt.channelType,
  environment: prompt.environment,
  timestamp: new Date().toISOString()
});
```

#### 9. Frontend API Client
**File:** `src/services/promptApi.ts`

Add:
```typescript
async getMetrics(versionId: string): Promise<MetricsData>
```

#### 10. Frontend Pages
**Files:**
- `src/pages/TenantPrompts.tsx` (lines 222-225, 523-586)
- `src/pages/PromptManagement.tsx` (line 463)

Replace TODO placeholders with real metrics API calls.

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
    }
  ]
}
```

**Response:**
```json
{
  "recorded": 1,
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

## Integration Examples

### Java Service
```java
// Subscribe to cache invalidation
redis.subscribe("pms:cache:invalidate", message -> {
    CacheInvalidationEvent event = parseEvent(message);
    cache.remove(getCacheKey(event));
});

// Report metrics after each invocation
pmsApiClient.reportMetrics(versionId, new InvocationMetrics(
    success, latency, tokens, cost
));
```

### Python Service
```python
# Subscribe to cache invalidation
pubsub = redis.pubsub()
pubsub.subscribe("pms:cache:invalidate")
for message in pubsub.listen():
    event = json.loads(message['data'])
    del cache[get_cache_key(event)]

# Report metrics
pms_api.report_metrics(version_id, {
    'success': True,
    'latency': 234,
    'tokens': 150,
    'cost': 0.002
})
```

---

## Testing Strategy

### Unit Tests (tests/phase7/)
- `redis-pubsub.test.ts` - Pub/sub functionality
- `metrics.test.ts` - Metrics aggregation logic
- `snapshots.test.ts` - Snapshot CRUD

### Integration Tests
- Publish event → Subscribe receives
- Report metrics → Database updated
- Create snapshot → Retrieve snapshot

### E2E Tests
- Full workflow: Update prompt → Java receives invalidation → Fetches fresh → Reports metrics

---

## Rollout Phases

### Phase 7.1: Redis Pub/Sub ✅ (Completed)
- [x] RedisPubSubService created
- [ ] Add hooks to PromptService
- [ ] Add tests

### Phase 7.2: Metrics Tracking (Next)
- [ ] Extend PromptVersion model
- [ ] Implement MetricsService
- [ ] Add metrics API endpoints
- [ ] Update frontend

### Phase 7.3: Session Snapshots
- [ ] Create PromptSnapshot model
- [ ] Add snapshot routes
- [ ] Add tests

### Phase 7.4: Java Integration
- [ ] Create Java client example
- [ ] Integration testing

### Phase 7.5: Python Integration
- [ ] Create Python client example
- [ ] Integration testing

---

## Dependencies

### Required
- Redis server running (cache + pub/sub)
- MongoDB (metrics storage)

### Optional
- Java service for integration testing
- Python service for integration testing

---

## Success Criteria

- [ ] Redis Pub/Sub working between services
- [ ] Cache invalidation < 1 second latency
- [ ] Metrics tracked and displayed in UI
- [ ] Java service can fetch and cache prompts
- [ ] Python service can fetch and cache prompts
- [ ] Session snapshots stored and retrievable
- [ ] All Phase 7 tests passing (target: 15+ tests)

---

## Next Steps

1. ✅ Complete Redis Pub/Sub service
2. 🔄 Extend PromptVersion metrics model
3. ⏭️ Implement MetricsService
4. ⏭️ Add metrics API endpoints
5. ⏭️ Update frontend to fetch/display metrics
6. ⏭️ Add Phase 7 tests

---

## Documentation

- [PHASE_7_DESIGN.md](./PHASE_7_DESIGN.md) - Full design document
- [PHASE_7_SUMMARY.md](./PHASE_7_SUMMARY.md) - This file
- Java/Python client guides - To be created

---

## Timeline Estimate

**Total:** 2-3 days (Week 13-14)

- ✅ Day 1 (Morning): Design + Redis Pub/Sub - **COMPLETE**
- 🔄 Day 1 (Afternoon): Metrics model + service - **IN PROGRESS**
- ⏭️ Day 2 (Morning): Metrics API + frontend
- ⏭️ Day 2 (Afternoon): Snapshots
- ⏭️ Day 3: Java/Python examples + testing

