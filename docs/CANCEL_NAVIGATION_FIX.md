# Cancel Navigation Fix - Context-Aware Return Paths

## Overview
Implemented smart cancel navigation in the PromptEditor component to ensure users are returned to the correct page based on their context (tenant prompts vs. project admin prompt management).

**Status:** ✅ Complete
**Date:** 2026-02-06

---

## Problem Statement

### Before
- Cancel button in PromptEditor always navigated to `/prompts` (Prompt Management page)
- Users editing tenant-specific prompts were incorrectly routed to Project Admin page
- No context awareness for navigation flow

### After
- Cancel button intelligently determines the correct return path
- Tenant prompt edits return to `/tenant-prompts` with correct productId
- Project admin prompt edits return to `/prompts`
- Explicit `returnTo` parameter support for future flexibility

---

## Implementation Details

### 1. PromptEditor.tsx - Smart Navigation Logic

**File:** `product-management/frontend/src/pages/PromptEditor.tsx`

#### Added `getReturnPath()` Function
```typescript
const getReturnPath = () => {
  // Priority 1: Check for explicit returnTo param
  const returnTo = searchParams.get('returnTo');
  if (returnTo) return returnTo;

  // Priority 2: Check for productId param (indicates tenant prompts)
  const productId = searchParams.get('productId');
  if (productId) return `/tenant-prompts?productId=${productId}`;

  // Priority 3: Check if prompt has tenantId (loaded prompt context)
  if (prompt?.tenantId && prompt?.productId) {
    return `/tenant-prompts?productId=${prompt.productId}`;
  }

  // Priority 4: Default to prompt management
  return '/prompts';
};
```

**Logic Priority:**
1. Explicit `returnTo` parameter (highest priority)
2. `productId` in URL parameters (indicates tenant context)
3. Prompt's `tenantId` and `productId` properties (fallback)
4. Default to `/prompts` (Project Admin)

#### Updated Cancel Handlers
```typescript
const handleCancelClick = () => {
  if (isDirty()) {
    setShowCancelModal(true);
  } else {
    navigate(getReturnPath()); // ✅ Smart navigation
  }
};

const handleDiscardConfirmed = () => {
  setShowCancelModal(false);
  navigate(getReturnPath()); // ✅ Smart navigation
};
```

---

### 2. TenantPrompts.tsx - Pass Context Parameter

**File:** `product-management/frontend/src/pages/TenantPrompts.tsx`

**Before:**
```typescript
const handleEditPrompt = (draftId: string) => {
  navigate(`/prompts/edit/${draftId}`);
};
```

**After:**
```typescript
const handleEditPrompt = (draftId: string) => {
  navigate(`/prompts/edit/${draftId}?productId=${productId}`);
};
```

**Why:** Passes `productId` to PromptEditor so it knows to return to tenant prompts

---

### 3. PromptManagement.tsx - Explicit Return Path

**File:** `product-management/frontend/src/pages/PromptManagement.tsx`

**Before:**
```typescript
const handleEdit = (id: string) => {
  navigate(`/prompts/edit/${id}`);
};
```

**After:**
```typescript
const handleEdit = (id: string) => {
  navigate(`/prompts/edit/${id}?returnTo=/prompts`);
};
```

**Why:** Explicitly tells PromptEditor to return to `/prompts` for project admin context

---

## Navigation Flows

### Tenant Admin Flow
```
/tenant-prompts?productId=123
  ↓ (Click Edit)
/prompts/edit/abc?productId=123
  ↓ (Click Cancel)
/tenant-prompts?productId=123 ✅
```

### Project Admin Flow
```
/prompts
  ↓ (Click Edit)
/prompts/edit/xyz?returnTo=/prompts
  ↓ (Click Cancel)
/prompts ✅
```

### Direct URL Access (Fallback)
```
/prompts/edit/xyz (no params)
  ↓ (Load prompt with tenantId + productId)
  ↓ (Click Cancel)
/tenant-prompts?productId=123 ✅ (detected from prompt data)
```

---

## Edge Cases Handled

### 1. No Context Parameters
- **Scenario:** User directly navigates to `/prompts/edit/abc` with no URL params
- **Solution:** Falls back to checking prompt's `tenantId` and `productId` properties
- **Result:** Still routes to correct page based on prompt ownership

### 2. Explicit returnTo Parameter
- **Scenario:** Future feature needs custom return path
- **Solution:** Highest priority given to `returnTo` parameter
- **Result:** Flexibility for future use cases

### 3. Dirty State with Cancel
- **Scenario:** User has unsaved changes and clicks cancel
- **Solution:** Shows confirmation modal first
- **Result:** After discard confirmation, uses same smart navigation

---

## Testing Checklist

### Manual Tests

- [x] **Tenant Prompts → Edit → Cancel**
  - Navigate to `/tenant-prompts?productId=123`
  - Click "Edit" on a prompt
  - Click "Cancel" in PromptEditor
  - **Expected:** Returns to `/tenant-prompts?productId=123`

- [x] **Prompt Management → Edit → Cancel**
  - Navigate to `/prompts`
  - Click "Edit" on a prompt
  - Click "Cancel" in PromptEditor
  - **Expected:** Returns to `/prompts`

- [x] **Direct URL Access → Cancel**
  - Navigate directly to `/prompts/edit/abc` (tenant-owned prompt)
  - Wait for prompt to load
  - Click "Cancel"
  - **Expected:** Returns to `/tenant-prompts?productId=123` (detected from prompt)

- [x] **Dirty State → Discard → Cancel**
  - Edit a prompt and make changes
  - Click "Cancel"
  - See confirmation modal
  - Click "Discard Changes"
  - **Expected:** Returns to correct page based on context

---

## Files Modified

1. **product-management/frontend/src/pages/PromptEditor.tsx**
   - Lines 558-595: Added `getReturnPath()` function
   - Updated `handleCancelClick()` and `handleDiscardConfirmed()`

2. **product-management/frontend/src/pages/TenantPrompts.tsx**
   - Lines 121-123: Updated `handleEditPrompt()` to pass `productId`

3. **product-management/frontend/src/pages/PromptManagement.tsx**
   - Lines 351-353: Updated `handleEdit()` to pass `returnTo`

---

## Benefits

### 1. Improved User Experience
- Users stay in their intended workflow (tenant vs. project admin)
- No more unexpected navigation to wrong page
- Intuitive back navigation behavior

### 2. Context Preservation
- ProductId preserved across navigation
- Tenant-specific workflows remain isolated
- Project admin workflows remain distinct

### 3. Future Flexibility
- Explicit `returnTo` parameter for custom flows
- Fallback detection from prompt properties
- Easy to extend for new use cases

---

## Future Enhancements

### 1. Breadcrumb Navigation
- Add breadcrumb trail showing: Home → Tenant Prompts → Edit
- Click breadcrumbs for quick navigation
- Visual indicator of current location

### 2. Navigation History
- Track user's navigation path
- "Back" button that respects full history
- Multiple levels of undo navigation

### 3. Session Persistence
- Remember last viewed page per tenant/product
- Restore user's position after session timeout
- Smart return to last edited prompt

---

## Related Documentation

- [Phase 1 Implementation](PHASE_1_FRONTEND_COMPLETE.md)
- [Soft Deletion Implementation](SOFT_DELETION_IMPLEMENTATION.md)
- [Dashboard Improvements](DASHBOARD_IMPROVEMENTS.md)

---

## Summary

✅ **Context-aware cancel navigation implemented**
- Tenant prompts return to tenant prompts page
- Project admin prompts return to prompt management page
- Fallback detection from prompt properties
- Explicit returnTo parameter support for flexibility
