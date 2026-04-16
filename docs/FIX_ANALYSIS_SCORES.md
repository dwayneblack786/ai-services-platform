# Fix: Analysis Scores Not Showing

**Issue:** Analysis scores not displaying in PromptManagement and TenantPrompts dashboards

---

## Root Cause

`lastScore` field exists in the database models but wasn't being populated with test result scores.

---

## Fixes Applied

### 1. Update TenantPromptBinding.lastScore After Tests ✅
**File:** [src/services/prompt-testing.service.ts](../ai-product-management/backend-node/src/services/prompt-testing.service.ts)

**Change:** After saving test result, update the tenant binding:

```typescript
// Line 232: After result.save()
if (prompt.tenantId && prompt.productId) {
  await TenantPromptBinding.updateOne(
    {
      tenantId: prompt.tenantId,
      productId: prompt.productId,
      channelType: prompt.channelType
    },
    { lastScore: overallScore }
  );
}
```

**Impact:** TenantPrompts dashboard will now show analysis scores

---

### 2. Add lastScore to Prompts List API ✅
**File:** [src/routes/prompt-management-routes.ts](../ai-product-management/backend-node/src/routes/prompt-management-routes.ts)

**Change:** Fetch latest test result for each prompt:

```typescript
// Line 268: Before res.json(result)
const PromptTestResult = (await import('../models/PromptTestResult')).default;
const promptsWithScores = await Promise.all(
  result.prompts.map(async (prompt: any) => {
    const latestTest = await PromptTestResult.findOne({ promptVersionId: prompt._id })
      .sort({ executedAt: -1 })
      .select('overallScore')
      .limit(1);
    return {
      ...prompt.toObject(),
      lastScore: latestTest?.overallScore
    };
  })
);

res.json({ prompts: promptsWithScores, total: result.total });
```

**Impact:** PromptManagement dashboard will now show analysis scores

---

## Testing

### 1. Restart Backend
```bash
# Backend needs restart to load changes
cd ai-product-management/backend-node
npm run dev
```

### 2. Run Analysis on a Prompt
```bash
curl -X POST http://localhost:5000/api/pms/prompt-testing/698361132d59c6b650f2fa1b/test
```

### 3. Check TenantPrompts Dashboard
Navigate to: `http://localhost:5173/tenant-prompts?productId=69728bdb0959e1a2da517684`

**Expected:** Score ring showing 91% (or latest score)

### 4. Check PromptManagement Dashboard
Navigate to: `http://localhost:5173/prompts?view=dashboard`

**Expected:** Each card shows lastScore

---

## Verification

### TenantPrompts API
```bash
# Should now include lastScore
curl http://localhost:5000/api/pms/tenant-prompts/YOUR_PRODUCT_ID \
  -H "Cookie: YOUR_SESSION_COOKIE"

# Response should include:
{
  "voice": {
    "lastScore": 91,
    "scoreThreshold": 70,
    ...
  }
}
```

### PromptManagement API
```bash
# Should now include lastScore in each prompt
curl http://localhost:5000/api/pms/prompts?limit=5

# Response should include:
{
  "prompts": [
    {
      "_id": "...",
      "name": "...",
      "lastScore": 91
    }
  ]
}
```

---

## Files Modified

1. `src/services/prompt-testing.service.ts` - Update binding after test
2. `src/routes/prompt-management-routes.ts` - Add lastScore to list response

---

## Notes

- **TenantPrompts:** Score updates automatically when test runs
- **PromptManagement:** Score fetched on page load
- **Performance:** List endpoint now does N+1 queries (one per prompt) - could optimize with aggregation if needed

