# API Testing Guide - Prompt Management Improvements

## Overview
This guide provides comprehensive testing instructions for the new version management and promotion APIs implemented in Phase 1 and Phase 2.

---

## Prerequisites

### Start the Servers
```bash
# Terminal 1 - Backend
cd ai-product-management/backend-node
npm run dev

# Terminal 2 - Frontend
cd ai-product-management/frontend
npm run dev
```

### Environment Variables
Ensure these are set in `ai-product-management/backend-node/.env`:
```env
MONGODB_URI=mongodb://localhost:27017/ai-services
PORT=5000
NODE_ENV=development
```

---

## Phase 1: Project Admin API Tests

### 1. Update Draft API (Modified Behavior)

**Endpoint:** `PUT /api/pms/prompts/:id`

**Test Case 1: Update Existing Draft**
```bash
curl -X PUT http://localhost:5000/api/pms/prompts/{draft-prompt-id} \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Updated Draft Name",
    "description": "Updated description"
  }'
```

**Expected Response:**
```json
{
  "prompt": {
    "_id": "...",
    "promptId": "...",
    "version": 1,
    "name": "Updated Draft Name",
    "state": "draft",
    ...
  },
  "isNewVersion": false
}
```

**Test Case 2: Edit Production Prompt (Creates New Version)**
```bash
curl -X PUT http://localhost:5000/api/pms/prompts/{production-prompt-id} \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Edited Production Prompt",
    "description": "This will create a new version"
  }'
```

**Expected Response:**
```json
{
  "prompt": {
    "_id": "NEW_ID",
    "promptId": "SAME_AS_ORIGINAL",
    "version": 2,
    "name": "Edited Production Prompt",
    "state": "draft",
    "basedOn": "ORIGINAL_ID",
    ...
  },
  "isNewVersion": true
}
```

**Validation:**
- ✅ `isNewVersion` is `true`
- ✅ New `_id` generated
- ✅ `version` incremented
- ✅ `promptId` same as original
- ✅ `state` is `draft`
- ✅ `basedOn` points to original prompt

---

### 2. Promote Prompt API (New)

**Endpoint:** `POST /api/pms/prompts/:id/promote`

**Test Case 1: Promote Draft to Testing**
```bash
curl -X POST http://localhost:5000/api/pms/prompts/{draft-id}/promote \
  -H "Content-Type: application/json" \
  -d '{
    "targetState": "testing"
  }'
```

**Expected Response:**
```json
{
  "_id": "...",
  "promptId": "...",
  "version": 2,
  "state": "testing",
  "isActive": false,
  "updatedBy": {
    "userId": "...",
    "name": "...",
    ...
  },
  "updatedAt": "2026-02-06T..."
}
```

**Validation:**
- ✅ `state` changed from `draft` to `testing`
- ✅ `updatedBy` populated with actor info
- ✅ `updatedAt` timestamp updated

**Test Case 2: Promote Testing to Production**
```bash
curl -X POST http://localhost:5000/api/pms/prompts/{testing-id}/promote \
  -H "Content-Type: application/json" \
  -d '{
    "targetState": "production"
  }'
```

**Expected Response:**
```json
{
  "_id": "...",
  "promptId": "...",
  "version": 2,
  "state": "production",
  "isActive": true,
  "updatedBy": {...},
  "updatedAt": "..."
}
```

**Database Validation:**
```javascript
// Check that old production version was archived
db.promptversions.findOne({
  promptId: ObjectId("..."),
  version: 1,
  state: "archived"
})

// Check new version is active
db.promptversions.findOne({
  promptId: ObjectId("..."),
  version: 2,
  state: "production",
  isActive: true
})
```

**Validation:**
- ✅ `state` changed to `production`
- ✅ `isActive` set to `true`
- ✅ Old production version `state` changed to `archived`
- ✅ Old production version `isActive` set to `false`

---

### 3. Error Cases

**Test Case 1: Invalid State Transition**
```bash
# Try to promote draft directly to production (should fail)
curl -X POST http://localhost:5000/api/pms/prompts/{draft-id}/promote \
  -H "Content-Type: application/json" \
  -d '{
    "targetState": "production"
  }'
```

**Expected Response:**
```json
{
  "error": "Can only promote testing prompts to production"
}
```

**Test Case 2: Invalid Target State**
```bash
curl -X POST http://localhost:5000/api/pms/prompts/{id}/promote \
  -H "Content-Type: application/json" \
  -d '{
    "targetState": "invalid"
  }'
```

**Expected Response:**
```json
{
  "error": "Invalid targetState. Must be \"testing\" or \"production\""
}
```

---

## Phase 2: Tenant Admin API Tests

### 4. Promote Tenant Prompt API (New)

**Endpoint:** `POST /api/pms/tenant-prompts/:productId/:channelType/promote`

**Test Case 1: Promote Draft to Testing**
```bash
curl -X POST http://localhost:5000/api/pms/tenant-prompts/{product-id}/voice/promote \
  -H "Content-Type: application/json" \
  -d '{
    "promptVersionId": "{draft-version-id}",
    "targetState": "testing"
  }'
```

**Expected Response:**
```json
{
  "prompt": {
    "_id": "...",
    "state": "testing",
    "version": 2,
    ...
  },
  "binding": {
    "_id": "...",
    "tenantId": "...",
    "productId": "...",
    "channelType": "voice",
    "currentDraftId": "{draft-version-id}",
    "activeProductionId": null,
    ...
  }
}
```

**Validation:**
- ✅ Prompt state changed to `testing`
- ✅ Binding returned with current state
- ✅ `currentDraftId` still set (not cleared until production)

**Test Case 2: Promote Testing to Production**
```bash
curl -X POST http://localhost:5000/api/pms/tenant-prompts/{product-id}/voice/promote \
  -H "Content-Type: application/json" \
  -d '{
    "promptVersionId": "{testing-version-id}",
    "targetState": "production"
  }'
```

**Expected Response:**
```json
{
  "prompt": {
    "_id": "{testing-version-id}",
    "state": "production",
    "isActive": true,
    ...
  },
  "binding": {
    "_id": "...",
    "tenantId": "...",
    "productId": "...",
    "channelType": "voice",
    "currentDraftId": null,
    "activeProductionId": "{testing-version-id}",
    "lastScore": 85,
    ...
  }
}
```

**Validation:**
- ✅ Prompt state changed to `production`
- ✅ Prompt `isActive` set to `true`
- ✅ Binding `activeProductionId` updated
- ✅ Binding `currentDraftId` cleared
- ✅ Old production version archived (if existed)

---

## Audit Log Validation

### Check Audit Logs

**Query MongoDB:**
```javascript
// Find all audit logs for a prompt
db.promptauditlogs.find({
  promptVersionId: ObjectId("{prompt-version-id}")
}).sort({ timestamp: -1 })
```

**Expected Audit Log Entries:**

1. **Version Creation from Edit:**
```json
{
  "promptVersionId": ObjectId("..."),
  "action": "version_created_from_edit",
  "actor": {
    "userId": "...",
    "name": "...",
    "email": "...",
    "role": "PROJECT_ADMIN",
    "ipAddress": "...",
    "sessionId": "..."
  },
  "timestamp": "2026-02-06T...",
  "context": {
    "tenantId": "...",
    "productId": ObjectId("..."),
    "environment": "development",
    "requestId": "req-..."
  }
}
```

2. **Promotion:**
```json
{
  "promptVersionId": ObjectId("..."),
  "action": "promoted",
  "actor": {...},
  "changes": [{
    "field": "state",
    "oldValue": "draft",
    "newValue": "testing",
    "description": "Promoted from draft to testing"
  }],
  "timestamp": "...",
  "context": {...}
}
```

3. **Archival (when promoting to production):**
```json
{
  "promptVersionId": ObjectId("OLD_VERSION_ID"),
  "action": "archived",
  "actor": {...},
  "changes": [{
    "field": "state",
    "oldValue": "production",
    "newValue": "archived",
    "description": "Archived by promotion of v2"
  }],
  "timestamp": "...",
  "context": {...}
}
```

**Validation:**
- ✅ All actions logged
- ✅ Actor information captured
- ✅ Changes tracked with old/new values
- ✅ Timestamps accurate
- ✅ Context includes tenant, product, environment

---

## Frontend Integration Testing

### Test in Browser

#### 1. Project Admin - Prompt Management

**URL:** `http://localhost:5173/prompts`

**Test Workflow:**
1. Navigate to Settings Dropdown → Prompt Management
2. Switch to Dashboard view
3. **Verify:**
   - ✅ Cards show professional design
   - ✅ VersionStatus badges display correctly
   - ✅ AnalyticsCard shows metrics or "pending"
   - ✅ Click on card navigates to editor

4. Click "Edit" on a production prompt
5. **Verify:**
   - ✅ Warning shows: "⚠️ First save will create a new draft version"
   - ✅ Button shows "Save (Create Version)"

6. Make changes and click save
7. **Verify:**
   - ✅ Modal appears: "Create New Version"
   - ✅ Shows version number to be created
   - ✅ After confirm, button changes to "Update Draft"

8. Make more changes and save
9. **Verify:**
   - ✅ No modal appears
   - ✅ Updates in place (check version doesn't increment)

10. Click "Promote to Testing"
11. **Verify:**
    - ✅ Confirmation modal appears
    - ✅ After confirm, state badge changes to "Testing"
    - ✅ Button changes to "Promote to Production"

12. Click "Promote to Production"
13. **Verify:**
    - ✅ Confirmation modal appears
    - ✅ After confirm, redirects to prompt list
    - ✅ In list, prompt shows "Production" state

#### 2. Tenant Admin - Tenant Prompts

**URL:** `http://localhost:5173/tenant-prompts?productId={id}`

**Test Workflow:**
1. Navigate to Tenant Prompts page
2. **Verify:**
   - ✅ Gradient purple header displays
   - ✅ VersionStatus badge integrated
   - ✅ AnalyticsCard shows score or pending
   - ✅ Action buttons have hover effects

3. Click "Edit Prompt"
4. **Verify:**
   - ✅ Opens same PromptEditor as project admin
   - ✅ Same version workflow applies

5. Test promotion workflow
6. **Verify:**
   - ✅ Same behavior as project admin
   - ✅ After production promotion, binding updated
   - ✅ "View Production" button appears

---

## Performance Testing

### Response Time Benchmarks

**Update Draft (No Version):**
- Target: < 200ms
- Test: `time curl -X PUT ...`

**Update Draft (Create Version):**
- Target: < 500ms (includes version creation)
- Test: `time curl -X PUT ...`

**Promote to Testing:**
- Target: < 300ms
- Test: `time curl -X POST ...`

**Promote to Production:**
- Target: < 500ms (includes archiving old version)
- Test: `time curl -X POST ...`

### Load Testing

Use `ab` (Apache Bench) or `wrk`:
```bash
# Test promote endpoint
ab -n 100 -c 10 -p promote.json -T application/json \
  http://localhost:5000/api/pms/prompts/{id}/promote

# promote.json:
# {"targetState": "testing"}
```

**Targets:**
- Throughput: > 50 req/s
- 95th percentile: < 500ms
- Error rate: < 1%

---

## Security Testing

### 1. Authentication

**Test: No Auth Token**
```bash
curl -X POST http://localhost:5000/api/pms/prompts/{id}/promote \
  -H "Content-Type: application/json" \
  -d '{"targetState": "testing"}'
```

**Expected:** 401 Unauthorized (if auth middleware active)

### 2. Tenant Isolation

**Test: Access Other Tenant's Prompt**
```bash
# As Tenant A, try to promote Tenant B's prompt
curl -X POST http://localhost:5000/api/pms/tenant-prompts/{product}/voice/promote \
  -H "Content-Type: application/json" \
  -H "X-Tenant-ID: tenant-a" \
  -d '{
    "promptVersionId": "{tenant-b-prompt-id}",
    "targetState": "testing"
  }'
```

**Expected:** 403 Forbidden or prompt not found

### 3. Role-Based Access

**Test: Tenant Admin Accessing Project Route**
```bash
# Tenant admin trying to use project admin endpoint
curl -X POST http://localhost:5000/api/pms/prompts/{id}/promote \
  -H "X-Role: TENANT_ADMIN" \
  -d '{"targetState": "testing"}'
```

**Expected:** 403 Forbidden (if role validation active)

---

## Regression Testing

### Ensure Old Functionality Still Works

1. **Create Draft:** `POST /api/pms/prompts/drafts`
   - ✅ Still creates version 1

2. **Get Prompt:** `GET /api/pms/prompts/:id`
   - ✅ Returns prompt as before

3. **List Prompts:** `GET /api/pms/prompts`
   - ✅ Filters work correctly

4. **Delete Draft:** `DELETE /api/pms/prompts/:id`
   - ✅ Only deletes drafts

5. **Version History:** `GET /api/pms/prompts/:promptId/versions`
   - ✅ Returns all versions sorted

---

## Troubleshooting

### Common Issues

**Issue: Port already in use**
```bash
# Windows
Get-Process -Id (Get-NetTCPConnection -LocalPort 5000).OwningProcess | Stop-Process -Force

# Linux/Mac
lsof -ti:5000 | xargs kill -9
```

**Issue: MongoDB connection failed**
```bash
# Check MongoDB is running
mongosh --eval "db.adminCommand('ping')"

# Start MongoDB (Windows)
net start MongoDB

# Start MongoDB (Linux/Mac)
brew services start mongodb-community
```

**Issue: TypeScript errors**
```bash
cd ai-product-management/backend-node
npm run build

# Check for errors
```

**Issue: Frontend not showing changes**
```bash
# Clear cache
cd ai-product-management/frontend
rm -rf node_modules/.vite
npm run dev
```

---

## Success Criteria

### All Tests Pass When:

✅ **Backend Compilation:**
- No TypeScript errors
- Server starts successfully
- All routes registered

✅ **API Functionality:**
- Update draft returns `isNewVersion` flag correctly
- Promote endpoint validates state transitions
- Old versions archived on production promotion
- Tenant promotion updates bindings

✅ **Audit Logging:**
- All actions logged
- Actor info captured
- Changes tracked

✅ **Frontend Integration:**
- Version workflow works end-to-end
- UI reflects state changes
- Modals appear at correct times
- Buttons change based on state

✅ **Data Integrity:**
- No orphaned versions
- Version numbers sequential
- promptId consistent across versions
- Bindings updated correctly

---

## Next Steps After Testing

1. **Gather Metrics:**
   - Response times
   - Error rates
   - User feedback

2. **Optimize:**
   - Database indexes
   - Query performance
   - Frontend bundle size

3. **Monitor:**
   - Set up application monitoring
   - Track promotion success rates
   - Monitor version creation patterns

4. **Document:**
   - User guides
   - Admin documentation
   - API changelog

