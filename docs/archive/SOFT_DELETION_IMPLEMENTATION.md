# Soft Deletion Implementation Guide

## Overview

This document describes the soft deletion feature implemented for the Prompt Management System. Soft deletion allows prompts to be marked as deleted while preserving the data for audit trails, recovery, and compliance purposes.

**Status:** ✅ **COMPLETE**

**Date Implemented:** 2026-02-06

---

## What is Soft Deletion?

Soft deletion is a data management pattern where records are marked as deleted rather than being permanently removed from the database. This approach provides several benefits:

- **Data Recovery:** Deleted prompts can be easily restored
- **Audit Trail:** Complete history of deletions with actor information
- **Compliance:** Meets regulatory requirements for data retention
- **Safety:** Prevents accidental permanent data loss
- **Rollback:** Ability to undo deletions

---

## Implementation Summary

### Backend Changes

**1. Database Schema (PromptVersion Model)**

Added three new fields to the `IPromptVersion` interface and schema:

```typescript
// TypeScript Interface
isDeleted?: boolean;
deletedAt?: Date;
deletedBy?: {
  userId: string;
  name: string;
  email: string;
  role: string;
};

// Mongoose Schema
isDeleted: { type: Boolean, default: false, index: true },
deletedAt: Date,
deletedBy: {
  userId: String,
  name: String,
  email: String,
  role: String
}
```

**Key Features:**
- `isDeleted` is indexed for efficient queries
- `deletedAt` tracks when the deletion occurred
- `deletedBy` captures complete actor information for audit purposes

**2. Service Layer (prompt.service.ts)**

Added three new methods:

```typescript
async softDeletePrompt(promptVersionId: string, actor: IActor): Promise<boolean>
async restorePrompt(promptVersionId: string, actor: IActor): Promise<IPromptVersion>
async hardDeletePrompt(promptVersionId: string, actor: IActor): Promise<boolean>
```

**Soft Delete Logic:**
- Marks prompt as deleted (`isDeleted = true`)
- Records deletion timestamp
- Captures actor information
- Deactivates prompt if it's active in production
- Creates comprehensive audit log

**Restore Logic:**
- Validates prompt is actually deleted
- Clears deletion markers
- Updates `updatedBy` with restore actor
- Creates audit log for restoration

**Hard Delete Logic:**
- Only allows permanent deletion of:
  - Soft-deleted prompts
  - Draft prompts
- Creates audit log before permanent removal
- Permanently removes record from database

**3. Updated List Prompts Method**

Modified `listPrompts()` to exclude deleted prompts by default:

```typescript
// Exclude deleted prompts by default
if (!filters.includeDeleted) {
  query.isDeleted = { $ne: true };
}
```

**4. API Routes (prompt-management-routes.ts)**

Updated and added endpoints:

```typescript
// Updated: Now performs soft delete instead of hard delete
DELETE /api/pms/prompts/:id

// New: Restore a soft-deleted prompt
POST /api/pms/prompts/:id/restore

// New: Permanently delete a prompt
DELETE /api/pms/prompts/:id/hard

// Updated: Added includeDeleted query parameter
GET /api/pms/prompts?includeDeleted=true
```

---

### Frontend Changes

**1. API Service (promptApi.ts)**

Added soft deletion methods and updated interfaces:

```typescript
// Updated interface with soft deletion fields
export interface IPromptVersion {
  // ... existing fields
  isDeleted?: boolean;
  deletedAt?: string;
  deletedBy?: {
    userId: string;
    name: string;
    email: string;
    role: string;
  };
}

// New methods
async softDeletePrompt(id: string): Promise<void>
async restorePrompt(id: string): Promise<IPromptVersion>
async hardDeletePrompt(id: string): Promise<void>

// Updated list params
export interface IListPromptsParams {
  // ... existing fields
  includeDeleted?: boolean;
}
```

**2. Prompt Management Page (PromptManagement.tsx)**

Added filtering UI and restore functionality:

**New State:**
```typescript
const [includeDeleted, setIncludeDeleted] = useState(false);
```

**New Filter UI:**
```tsx
<FilterGroup>
  <Label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
    <input
      type="checkbox"
      checked={includeDeleted}
      onChange={(e) => {
        setIncludeDeleted(e.target.checked);
        setOffset(0);
      }}
      style={{ cursor: 'pointer', width: '16px', height: '16px' }}
    />
    Include Deleted
  </Label>
</FilterGroup>
```

**Visual Indicators for Deleted Prompts:**
- Reduced opacity (60%)
- Gray background
- "DELETED" badge
- Deletion date display
- Conditional action buttons

**Updated Action Buttons:**
```tsx
{prompt.isDeleted ? (
  <>
    <ActionButton variant="primary" onClick={() => handleRestore(prompt._id, prompt.name)}>
      Restore
    </ActionButton>
    <ActionButton variant="secondary" onClick={() => handleViewVersions(prompt.promptId)}>
      Versions
    </ActionButton>
  </>
) : (
  <>
    <ActionButton variant="primary" onClick={() => handleEdit(prompt._id)}>
      Edit
    </ActionButton>
    <ActionButton variant="secondary" onClick={() => handleViewVersions(prompt.promptId)}>
      Versions
    </ActionButton>
    <ActionButton variant="danger" onClick={() => handleDelete(prompt._id, prompt.name)}>
      Delete
    </ActionButton>
  </>
)}
```

---

## API Documentation

### 1. Soft Delete Prompt

**Endpoint:** `DELETE /api/pms/prompts/:id`

**Description:** Marks a prompt as deleted without permanently removing it.

**Request:**
```bash
curl -X DELETE http://localhost:5000/api/pms/prompts/507f1f77bcf86cd799439011 \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**Response:** `204 No Content`

**Behavior:**
- Sets `isDeleted = true`
- Records `deletedAt` timestamp
- Captures `deletedBy` actor information
- Deactivates prompt if `isActive = true`
- Creates audit log entry with action `soft_deleted`

**Error Responses:**
- `400 Bad Request` - Prompt is already deleted
- `404 Not Found` - Prompt not found

---

### 2. Restore Prompt

**Endpoint:** `POST /api/pms/prompts/:id/restore`

**Description:** Restores a soft-deleted prompt.

**Request:**
```bash
curl -X POST http://localhost:5000/api/pms/prompts/507f1f77bcf86cd799439011/restore \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**Response:**
```json
{
  "_id": "507f1f77bcf86cd799439011",
  "promptId": "507f1f77bcf86cd799439012",
  "version": 2,
  "name": "Customer Support Voice Prompt",
  "state": "draft",
  "isDeleted": false,
  "deletedAt": null,
  "deletedBy": null,
  "updatedBy": {
    "userId": "user123",
    "name": "John Doe",
    "email": "john@example.com",
    "role": "PROJECT_ADMIN"
  },
  "updatedAt": "2026-02-06T12:00:00Z"
}
```

**Behavior:**
- Sets `isDeleted = false`
- Clears `deletedAt` and `deletedBy`
- Updates `updatedBy` with restore actor
- Creates audit log entry with action `restored`

**Error Responses:**
- `400 Bad Request` - Prompt is not deleted
- `404 Not Found` - Prompt not found

---

### 3. Hard Delete Prompt

**Endpoint:** `DELETE /api/pms/prompts/:id/hard`

**Description:** Permanently deletes a prompt from the database.

**Request:**
```bash
curl -X DELETE http://localhost:5000/api/pms/prompts/507f1f77bcf86cd799439011/hard \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**Response:** `204 No Content`

**Restrictions:**
- Only works for soft-deleted prompts OR drafts
- Cannot hard delete active production prompts
- Cannot hard delete non-deleted testing/staging/archived prompts

**Behavior:**
- Creates audit log entry BEFORE deletion
- Permanently removes prompt from database
- Cannot be undone

**Error Responses:**
- `400 Bad Request` - Cannot hard delete non-deleted prompt (unless draft)
- `404 Not Found` - Prompt not found

---

### 4. List Prompts with Deleted Filter

**Endpoint:** `GET /api/pms/prompts?includeDeleted=true`

**Description:** List prompts with option to include deleted ones.

**Query Parameters:**
- `tenantId` (string, optional) - Filter by tenant
- `productId` (string, optional) - Filter by product
- `state` (string, optional) - Filter by state
- `channelType` (string, optional) - Filter by channel
- `environment` (string, optional) - Filter by environment
- **`includeDeleted` (boolean, optional)** - Include soft-deleted prompts (default: false)
- `limit` (number, optional) - Results per page (default: 50)
- `offset` (number, optional) - Pagination offset (default: 0)

**Request:**
```bash
# Exclude deleted (default)
curl http://localhost:5000/api/pms/prompts

# Include deleted
curl http://localhost:5000/api/pms/prompts?includeDeleted=true

# Filter deleted drafts only
curl "http://localhost:5000/api/pms/prompts?state=draft&includeDeleted=true"
```

**Response:**
```json
{
  "prompts": [
    {
      "_id": "...",
      "name": "Active Prompt",
      "isDeleted": false
    },
    {
      "_id": "...",
      "name": "Deleted Prompt",
      "isDeleted": true,
      "deletedAt": "2026-02-06T10:00:00Z",
      "deletedBy": {
        "userId": "user123",
        "name": "John Doe",
        "email": "john@example.com",
        "role": "PROJECT_ADMIN"
      }
    }
  ],
  "total": 2
}
```

---

## Audit Logging

All soft deletion operations create comprehensive audit logs:

### Soft Delete Audit Log

```javascript
{
  promptVersionId: ObjectId("..."),
  action: "soft_deleted",
  actor: {
    userId: "user123",
    name: "John Doe",
    email: "john@example.com",
    role: "PROJECT_ADMIN",
    ipAddress: "192.168.1.1",
    sessionId: "session-abc123"
  },
  changes: [{
    field: "isDeleted",
    oldValue: false,
    newValue: true,
    description: "Prompt soft deleted"
  }],
  timestamp: "2026-02-06T10:00:00Z",
  context: {
    tenantId: "tenant-123",
    productId: ObjectId("..."),
    environment: "development",
    requestId: "req-1234567890"
  }
}
```

### Restore Audit Log

```javascript
{
  promptVersionId: ObjectId("..."),
  action: "restored",
  actor: { /* ... */ },
  changes: [{
    field: "isDeleted",
    oldValue: true,
    newValue: false,
    description: "Prompt restored from soft delete"
  }],
  timestamp: "2026-02-06T11:00:00Z",
  context: { /* ... */ }
}
```

### Hard Delete Audit Log

```javascript
{
  promptVersionId: ObjectId("..."),
  action: "hard_deleted",
  actor: { /* ... */ },
  timestamp: "2026-02-06T12:00:00Z",
  context: { /* ... */ }
}
```

**Query Audit Logs:**
```javascript
// MongoDB query
db.promptauditlogs.find({
  action: { $in: ['soft_deleted', 'restored', 'hard_deleted'] }
}).sort({ timestamp: -1 })
```

---

## Usage Examples

### Project Admin Workflow

**1. Delete a Draft Prompt:**
```typescript
// Frontend
await promptApi.softDeletePrompt(promptId);

// Result: Prompt marked as deleted, disappears from default view
```

**2. View Deleted Prompts:**
```typescript
// Frontend - enable "Include Deleted" checkbox
setIncludeDeleted(true);

// Backend receives
GET /api/pms/prompts?includeDeleted=true
```

**3. Restore a Deleted Prompt:**
```typescript
// Frontend
const restored = await promptApi.restorePrompt(promptId);

// Result: Prompt restored, visible in normal view
```

**4. Permanently Delete:**
```typescript
// Frontend (admin only)
await promptApi.hardDeletePrompt(promptId);

// Result: Prompt permanently removed from database
```

---

### Tenant Admin Workflow

Tenant admins work through the binding system, which uses the main prompt service. Soft deletion is automatically inherited:

**1. Delete Tenant Prompt:**
```typescript
// When tenant deletes their custom prompt
await promptApi.softDeletePrompt(tenantPromptId);

// The binding's currentDraftId still points to the deleted prompt
// But the prompt itself is marked as deleted
```

**2. Restore Tenant Prompt:**
```typescript
await promptApi.restorePrompt(tenantPromptId);
```

---

## Database Queries

### Find All Deleted Prompts

```javascript
db.prompt_versions.find({
  isDeleted: true
}).sort({ deletedAt: -1 })
```

### Find Deleted Prompts by Tenant

```javascript
db.prompt_versions.find({
  tenantId: "tenant-123",
  isDeleted: true
})
```

### Find Recently Deleted (Last 7 Days)

```javascript
const sevenDaysAgo = new Date();
sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

db.prompt_versions.find({
  isDeleted: true,
  deletedAt: { $gte: sevenDaysAgo }
})
```

### Find Prompts Deleted by Specific User

```javascript
db.prompt_versions.find({
  "deletedBy.userId": "user123"
})
```

---

## Testing Guide

### Manual Testing Checklist

**Backend API Tests:**
- [ ] Soft delete a draft prompt - should succeed
- [ ] Soft delete a production prompt - should succeed and deactivate
- [ ] Try to soft delete already deleted prompt - should fail with 400
- [ ] Restore a soft-deleted prompt - should succeed
- [ ] Try to restore non-deleted prompt - should fail with 400
- [ ] Hard delete a soft-deleted prompt - should succeed
- [ ] Try to hard delete active production prompt - should fail with 400
- [ ] List prompts without includeDeleted - should exclude deleted
- [ ] List prompts with includeDeleted=true - should include deleted
- [ ] Verify audit logs created for all operations

**Frontend UI Tests:**
- [ ] Delete prompt from list view - should disappear
- [ ] Enable "Include Deleted" - deleted prompts should appear
- [ ] Deleted prompts should have gray background and DELETED badge
- [ ] Deleted prompts should show deletion date
- [ ] Deleted prompts should have "Restore" button instead of "Edit"
- [ ] Click "Restore" - prompt should be restored
- [ ] Restored prompt should appear in normal view
- [ ] Filter should persist in URL params

**Integration Tests:**
- [ ] Delete → List (without filter) → Should not appear
- [ ] Delete → List (with filter) → Should appear
- [ ] Delete → Restore → List → Should appear normally
- [ ] Delete production → Verify isActive set to false
- [ ] Delete → Hard delete → Cannot restore

---

## Migration Notes

### Existing Data

**No migration required!** All changes are backward compatible:

- Existing prompts without soft deletion fields work normally
- `isDeleted` defaults to `false` via schema default
- Queries automatically exclude deleted prompts unless explicitly included

### Backward Compatibility

- Old `deleteDraft()` method aliased to `softDeletePrompt()`
- Existing API calls continue to work
- No breaking changes to existing code

---

## Performance Considerations

### Database Indexes

Added index on `isDeleted` field for efficient filtering:

```javascript
isDeleted: { type: Boolean, default: false, index: true }
```

**Query Performance:**
```javascript
// Fast - uses index
db.prompt_versions.find({ isDeleted: { $ne: true } })

// Fast - uses index
db.prompt_versions.find({ isDeleted: true })
```

### Cleanup Strategy

Consider implementing a cleanup job to permanently delete old soft-deleted prompts:

```javascript
// Example: Delete soft-deleted prompts older than 90 days
const ninetyDaysAgo = new Date();
ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

const oldDeleted = await PromptVersion.find({
  isDeleted: true,
  deletedAt: { $lt: ninetyDaysAgo }
});

// Hard delete each one with audit log
for (const prompt of oldDeleted) {
  await promptService.hardDeletePrompt(prompt._id.toString(), adminActor);
}
```

---

## Security Considerations

### Access Control

**Soft Delete:**
- Available to all authenticated users for their own prompts
- Tenant admins can delete tenant prompts
- Project admins can delete any prompt

**Restore:**
- Same permissions as soft delete
- Audit log tracks who restored

**Hard Delete:**
- Recommended to restrict to PROJECT_ADMIN role only
- Implement additional confirmation for hard deletes
- Consider requiring reason/justification

### Data Retention Compliance

Soft deletion helps meet regulatory requirements:

- **GDPR:** Right to erasure (use hard delete for final removal)
- **SOC 2:** Audit trail of all deletions
- **HIPAA:** Retention policies (soft delete for retention period, then hard delete)

### Audit Trail

All deletion operations are logged with:
- Actor information (who deleted)
- Timestamp (when deleted)
- Context (tenant, product, environment)
- Changes (what changed)

---

## Troubleshooting

### Issue: Deleted Prompts Still Appear

**Cause:** Frontend not passing `includeDeleted=false` or backend not filtering

**Solution:**
```typescript
// Verify backend query
if (!filters.includeDeleted) {
  query.isDeleted = { $ne: true };
}

// Verify frontend doesn't pass includeDeleted when not needed
```

### Issue: Cannot Restore Prompt

**Cause:** Prompt not actually deleted or hard deleted

**Solution:**
```javascript
// Check prompt status
db.prompt_versions.findOne({ _id: ObjectId("...") })

// If isDeleted is false, prompt is not deleted
// If prompt doesn't exist, it was hard deleted (cannot restore)
```

### Issue: Hard Delete Fails

**Cause:** Trying to hard delete non-deleted active prompt

**Solution:**
```typescript
// Hard delete only works for:
// 1. Soft-deleted prompts
// 2. Draft prompts

// For other prompts, soft delete first, then hard delete
await promptService.softDeletePrompt(id, actor);
await promptService.hardDeletePrompt(id, actor);
```

---

## Future Enhancements

### Short Term
1. **Bulk Operations:**
   - Bulk soft delete
   - Bulk restore
   - Bulk hard delete

2. **Auto-Cleanup Job:**
   - Scheduled task to hard delete old soft-deleted prompts
   - Configurable retention period
   - Admin notifications before cleanup

3. **Deletion Reasons:**
   - Optional reason field for deletions
   - Required for hard deletes
   - Stored in audit log

### Long Term
1. **Recycle Bin UI:**
   - Dedicated page for viewing deleted prompts
   - Batch restore functionality
   - Filter by deletion date, actor, tenant

2. **Deletion Workflow:**
   - Approval required for production prompt deletions
   - Multi-step confirmation for hard deletes
   - Email notifications on deletions

3. **Advanced Audit:**
   - Deletion analytics dashboard
   - Trend analysis
   - Anomaly detection (unusual deletion patterns)

---

## Summary

Soft deletion has been successfully implemented across the entire Prompt Management System:

✅ **Backend:**
- Database schema updated with soft deletion fields
- Service layer methods for soft delete, restore, hard delete
- API endpoints updated and added
- Comprehensive audit logging
- Default filtering excludes deleted prompts

✅ **Frontend:**
- API client updated with soft deletion methods
- UI filters for including deleted prompts
- Visual indicators for deleted state
- Restore functionality in UI
- Backward compatible with existing code

✅ **Documentation:**
- Complete API documentation
- Usage examples
- Testing guide
- Troubleshooting guide

**Next Steps:**
1. Test all functionality end-to-end
2. Deploy to staging environment
3. User acceptance testing
4. Monitor audit logs
5. Plan auto-cleanup strategy

---

**Document Version:** 1.0
**Last Updated:** 2026-02-06
**Author:** AI Assistant (Claude Sonnet 4.5)
