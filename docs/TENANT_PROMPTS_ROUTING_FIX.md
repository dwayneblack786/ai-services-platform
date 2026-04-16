# Tenant Prompts Routing Fix - Remove Redundant Tab

## Overview
Fixed routing issue where clicking "Configure Prompts" in Assistant Channels was navigating to a tab within the product configuration instead of a full-page view. Removed the redundant "Prompts" tab from VirtualAssistantConfig and made TenantPrompts accessible as a standalone full-page route.

**Status:** ✅ Complete
**Date:** 2026-02-06

---

## Problem Statement

### Before
1. **Assistant Channels page**: `http://localhost:5173/products/id:/configure/assistant-channels`
2. **Click "Configure Prompts"** → Navigated to: `http://localhost:5173/products/id:/configure/prompts`
3. This showed TenantPrompts as a **tab** within VirtualAssistantConfig
4. User wanted TenantPrompts as a **full-page standalone view**
5. The "Prompts" tab was redundant and confusing

### After
1. **Assistant Channels page**: `http://localhost:5173/products/id:/configure/assistant-channels`
2. **Click "Configure Prompts"** → Navigates to: `http://localhost:5173/tenant-prompts?productId=xxx&channel=voice`
3. Shows TenantPrompts as a **full-page view** with Layout
4. No more "Prompts" tab in product configuration
5. Clean, dedicated page for tenant prompt management

---

## Changes Made

### 1. Added Standalone Route for TenantPrompts

**File:** `ai-product-management/frontend/src/App.tsx`

#### Added Import
```typescript
import TenantPrompts from './pages/TenantPrompts';
```

#### Added Route
```typescript
{/* Tenant Prompts - Standalone full-page route */}
<Route
  path="/tenant-prompts"
  element={
    <ProtectedRoute>
      <Layout>
        <TenantPrompts />
      </Layout>
    </ProtectedRoute>
  }
/>
```

**Why:**
- Creates dedicated full-page route for tenant prompts
- Uses Layout component for consistent navigation
- Protected route ensures authentication
- Query parameters: `productId` and `channel`

---

### 2. Updated AssistantChannels Navigation

**File:** `ai-product-management/frontend/src/pages/AssistantChannels.tsx`

#### Before (Line 142-144)
```typescript
// Navigate to the tenant prompts page within the product configure context,
// filtered to the specified channel via URL query param.
const navigateToPromptConfig = (channelType: 'voice' | 'chat') => {
  navigate(`/products/${productId}/configure/prompts?channel=${channelType}`);
};
```

#### After
```typescript
// Navigate to the standalone tenant prompts page,
// filtered to the specified channel and product via URL query params.
const navigateToPromptConfig = (channelType: 'voice' | 'chat') => {
  navigate(`/tenant-prompts?productId=${productId}&channel=${channelType}`);
};
```

**Why:**
- Routes to standalone `/tenant-prompts` instead of nested tab
- Passes `productId` via query parameter
- Passes `channel` for filtering voice/chat
- Full-page experience instead of embedded tab

---

### 3. Removed "Prompts" Tab from VirtualAssistantConfig

**File:** `ai-product-management/frontend/src/pages/VirtualAssistantConfig.tsx`

#### Removed Import
```typescript
import TenantPrompts from './TenantPrompts'; // ❌ Removed
```

#### Updated TabType
```typescript
// Before
type TabType = 'configuration' | 'assistant-channels' | 'prompts' | 'assistant-chat' | 'call-logs' | 'transcripts' | 'analytics';

// After
type TabType = 'configuration' | 'assistant-channels' | 'assistant-chat' | 'call-logs' | 'transcripts' | 'analytics';
```

#### Removed from Tabs Array (Line 108-116)
```typescript
const tabs = [
  { id: 'configuration' as TabType, label: 'Configuration', icon: '⚙️', adminOnly: false },
  { id: 'assistant-channels' as TabType, label: 'Assistant Channels', icon: '🤖', adminOnly: true },
  // ❌ REMOVED: { id: 'prompts' as TabType, label: 'Prompts', icon: '📝', adminOnly: true },
  { id: 'assistant-chat' as TabType, label: 'Assistant Chat', icon: '💬', adminOnly: false },
  { id: 'call-logs' as TabType, label: 'Call Logs', icon: '📞', adminOnly: false },
  { id: 'transcripts' as TabType, label: 'Transcripts', icon: '📝', adminOnly: false },
  { id: 'analytics' as TabType, label: 'Analytics', icon: '📈', adminOnly: false },
];
```

#### Removed from Switch Statement (Line 241-242)
```typescript
case 'assistant-channels':
  return <AssistantChannels productId={productId} onNavigate={(tab) => {
    navigateToTab(tab as TabType);
  }} />;
// ❌ REMOVED: case 'prompts':
// ❌ REMOVED:   return <TenantPrompts productId={productId} />;
case 'assistant-chat':
  return <AssistantChat productId={productId} />;
```

**Why:**
- Eliminates redundant tab
- TenantPrompts now only accessible via standalone route
- Cleaner product configuration page
- Reduces confusion about where to manage prompts

---

### 4. Updated TenantPrompts to Support Both Use Cases

**File:** `ai-product-management/frontend/src/pages/TenantPrompts.tsx`

#### Before (Line 41-44)
```typescript
const TenantPrompts: React.FC<TenantPromptsProps> = ({ productId }) => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const activeChannel = (searchParams.get('channel') as 'voice' | 'chat') || 'voice';
```

#### After
```typescript
const TenantPrompts: React.FC<TenantPromptsProps> = ({ productId: propProductId }) => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  // Get productId from props (when used as embedded component) or URL query (when standalone route)
  const productId = propProductId || searchParams.get('productId') || undefined;
  const activeChannel = (searchParams.get('channel') as 'voice' | 'chat') || 'voice';
```

**Why:**
- Supports both embedded use (via prop) and standalone use (via query param)
- Backward compatible if needed for future features
- Flexible component design
- Falls back to query parameter when prop not provided

---

## Navigation Flows

### Voice Channel Configuration Flow
```
/products/abc123/configure/assistant-channels
  ↓ (Click "Configure Prompts" on Voice card)
/tenant-prompts?productId=abc123&channel=voice ✅ Full page
```

### Chat Channel Configuration Flow
```
/products/abc123/configure/assistant-channels
  ↓ (Click "Configure Prompts" on Chat card)
/tenant-prompts?productId=abc123&channel=chat ✅ Full page
```

### Direct Access Flow
```
Direct URL: /tenant-prompts?productId=abc123&channel=voice
  ↓
Full-page TenantPrompts view with Layout ✅
```

---

## URL Structure

### New Standalone Route
```
/tenant-prompts?productId={productId}&channel={channelType}
```

**Query Parameters:**
- `productId` (required): The product/subscription ID
- `channel` (optional): Filter by 'voice' or 'chat', defaults to 'voice'

**Example URLs:**
- `/tenant-prompts?productId=abc123&channel=voice`
- `/tenant-prompts?productId=abc123&channel=chat`
- `/tenant-prompts?productId=abc123` (defaults to voice)

### Old Route (Removed)
```
/products/{productId}/configure/prompts?channel={channelType}
```

This route is no longer valid and will show the default configuration tab instead.

---

## User Experience Improvements

### Before
1. Navigate to Assistant Channels
2. Click "Configure Prompts"
3. See **tab change** within same page layout
4. Limited screen space due to tab navigation
5. Confusing whether you're still in product config

### After
1. Navigate to Assistant Channels
2. Click "Configure Prompts"
3. Navigate to **new dedicated page**
4. Full-screen view for prompt management
5. Clear page title and context
6. Dedicated back navigation via cancel button

---

## Technical Benefits

### 1. Cleaner Architecture
- Separation of concerns
- Tenant prompts have dedicated route
- Product configuration remains focused on settings

### 2. Better URL Structure
- Bookmarkable tenant prompts page
- Clear query parameters
- RESTful naming convention

### 3. Improved Navigation
- Consistent with other pages (Settings → Prompts)
- Full-page layout with sidebar
- Better breadcrumb potential

### 4. Easier Testing
- Standalone route easier to test
- No nested component dependencies
- Direct URL access for QA

---

## Backward Compatibility

### Breaking Changes
- ❌ `/products/{id}/configure/prompts` no longer shows TenantPrompts
- ❌ "Prompts" tab removed from product configuration

### Migration Path
If users have bookmarked old URLs:
- Old: `/products/abc123/configure/prompts?channel=voice`
- New: `/tenant-prompts?productId=abc123&channel=voice`

**Recommendation:** Add redirect or 404 handling if needed.

---

## Files Modified

1. **ai-product-management/frontend/src/App.tsx**
   - Added TenantPrompts import
   - Added `/tenant-prompts` route with ProtectedRoute and Layout

2. **ai-product-management/frontend/src/pages/AssistantChannels.tsx**
   - Lines 140-144: Updated `navigateToPromptConfig()` to use `/tenant-prompts`

3. **ai-product-management/frontend/src/pages/VirtualAssistantConfig.tsx**
   - Line 8: Removed TenantPrompts import
   - Line 14: Updated TabType to remove 'prompts'
   - Lines 108-116: Removed prompts from tabs array
   - Lines 241-242: Removed prompts case from switch statement

4. **ai-product-management/frontend/src/pages/TenantPrompts.tsx**
   - Lines 41-46: Updated to support productId from both props and query params

---

## Testing Checklist

### Manual Tests

- [x] **Navigate from Assistant Channels → Voice Prompts**
  - Click "Configure Prompts" on Voice channel card
  - Verify navigates to `/tenant-prompts?productId=xxx&channel=voice`
  - Verify full-page view with Layout
  - Verify voice prompts are displayed

- [x] **Navigate from Assistant Channels → Chat Prompts**
  - Click "Configure Prompts" on Chat channel card
  - Verify navigates to `/tenant-prompts?productId=xxx&channel=chat`
  - Verify chat prompts are displayed

- [x] **Direct URL Access**
  - Navigate to `/tenant-prompts?productId=abc123&channel=voice`
  - Verify page loads correctly
  - Verify Layout is present (sidebar, header)
  - Verify authentication required

- [x] **Cancel Navigation**
  - From tenant prompts, edit a prompt
  - Click cancel in PromptEditor
  - Verify returns to `/tenant-prompts?productId=xxx`

- [x] **Verify Prompts Tab Removed**
  - Navigate to `/products/abc123/configure`
  - Verify no "Prompts" tab in navigation
  - Only see: Configuration, Assistant Channels, Assistant Chat, Call Logs, Transcripts, Analytics

- [x] **Old URL Behavior**
  - Navigate to `/products/abc123/configure/prompts`
  - Verify shows default configuration tab (not prompts)

---

## Future Enhancements

### 1. Breadcrumb Navigation
Add breadcrumbs to show navigation path:
```
Products > Virtual Assistant > Tenant Prompts (Voice)
```

### 2. URL Redirects
Add redirect from old URL to new URL:
```typescript
<Route
  path="/products/:productId/configure/prompts"
  element={<Navigate to="/tenant-prompts" replace />}
/>
```

### 3. Product Context in Title
Update page title to include product name:
```typescript
<title>Prompts - {productName} | Platform</title>
```

### 4. Quick Access from Sidebar
Add "Tenant Prompts" link to sidebar navigation when viewing product context.

---

## Related Documentation

- [Cancel Navigation Fix](CANCEL_NAVIGATION_FIX.md)
- [Soft Deletion Implementation](SOFT_DELETION_IMPLEMENTATION.md)
- [Dashboard Improvements](DASHBOARD_IMPROVEMENTS.md)
- [Phase 1 Implementation](PHASE_1_FRONTEND_COMPLETE.md)

---

## Summary

✅ **Tenant Prompts routing fixed**
- Removed redundant "Prompts" tab from product configuration
- Added standalone `/tenant-prompts` route for full-page view
- Updated AssistantChannels navigation to use new route
- Made TenantPrompts component flexible for both embedded and standalone use
- Improved user experience with dedicated full-page layout
- Cleaner architecture and better URL structure

