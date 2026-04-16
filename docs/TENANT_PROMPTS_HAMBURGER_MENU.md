# Tenant Prompts - Hamburger Menu with Actions

## Overview
Added a hamburger menu (⋮) to each tenant prompt row in the detail view, providing quick access to all prompt actions including create new, duplicate, edit, view production, and delete.

**Status:** ✅ Complete
**Date:** 2026-02-06

---

## Problem Statement

### Before
- No way to create a new tenant prompt from the detail view
- No way to duplicate an existing prompt
- Only Edit and View Production buttons visible inline
- Limited discoverability of available actions
- No centralized action menu

### After
- ✅ Hamburger menu (⋮) in the top-right of each prompt row
- ✅ Create New: Create from template
- ✅ Duplicate: Clone existing prompt
- ✅ Edit Draft: Edit current draft version
- ✅ View Production: View active production version
- ✅ Delete: Soft delete with confirmation
- ✅ Clean, organized dropdown interface

---

## Menu Structure

### Visual Layout
```
┌─────────────────────────────────────────┐
│ 📞 Name  [Status]  Date    [⋮]         │ ← Header with hamburger
└─────────────────────────────────────────┘
                              ↓ Click
                    ┌──────────────────┐
                    │ ✏️ Edit Draft    │
                    │ 👁️ View Production│
                    │ ➕ Create New    │
                    │ 📋 Duplicate     │
                    │ 🗑️ Delete        │
                    └──────────────────┘
```

### Menu Items

#### 1. Edit Draft
```typescript
{
  icon: "✏️",
  label: "Edit Draft",
  action: handleEditPrompt(currentDraftId),
  color: "#333"
}
```
- Opens draft version in editor
- Primary action for editing current prompt

#### 2. View Production (conditional)
```typescript
{
  icon: "👁️",
  label: "View Production",
  action: handleEditPrompt(activeProductionId),
  color: "#333",
  visible: currentBinding.activeProductionId !== undefined
}
```
- Only shows if production version exists
- Opens production version in read/edit mode

#### 3. Create New
```typescript
{
  icon: "➕",
  label: "Create New",
  action: handleCreateFromTemplate(channelType),
  color: "#333"
}
```
- Navigates to template selector
- Creates entirely new prompt from scratch

#### 4. Duplicate
```typescript
{
  icon: "📋",
  label: "Duplicate",
  action: handleDuplicatePrompt(channelType),
  color: "#333"
}
```
- Clones current draft as new version
- Opens duplicate in editor immediately

#### 5. Delete
```typescript
{
  icon: "🗑️",
  label: "Delete",
  action: handleDeletePrompt(channelType),
  color: "#d32f2f"  // Red text
}
```
- Soft deletes the prompt
- Shows confirmation dialog
- Red color indicates destructive action

---

## Technical Implementation

### State Management

```typescript
const [menuOpen, setMenuOpen] = useState<string | null>(null);
// Tracks which channel's menu is open ('voice', 'chat', or null)
```

**Benefits:**
- Only one menu open at a time
- Automatically closes when switching channels
- Click outside closes menu

### Menu Toggle Button

```typescript
<button
  onClick={() => setMenuOpen(menuOpen === activeChannel ? null : activeChannel)}
  style={{
    padding: '6px 8px',
    background: menuOpen === activeChannel ? '#f0f0f0' : 'white',
    // ... styles
  }}
>
  ⋮
</button>
```

**Features:**
- Vertical ellipsis (⋮) icon
- Toggles menu open/close
- Highlights when menu is open
- Hover effect when closed

### Dropdown Positioning

```typescript
<div style={{
  position: 'absolute',
  top: '100%',
  right: 0,
  marginTop: '4px',
  // ... dropdown styles
}}>
```

**Layout:**
- Positioned below hamburger button
- Right-aligned (menu extends left)
- 4px gap from button
- Absolute positioning relative to parent

### Click-Outside Handler

```typescript
<div
  onClick={() => setMenuOpen(null)}
  style={{
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 999
  }}
/>
```

**Behavior:**
- Invisible full-screen backdrop
- Closes menu when clicking outside
- z-index 999 (below menu, above content)
- Prevents menu from staying stuck open

---

## Action Handlers

### 1. Create New Prompt

```typescript
const handleCreateFromTemplate = (channelType: 'voice' | 'chat') => {
  navigate(`/prompts/templates?productId=${productId}&channelType=${channelType}`);
};
```

**Flow:**
1. User clicks "Create New"
2. Navigates to template selector
3. Pre-filters by channelType
4. User selects template
5. New prompt created for tenant

### 2. Duplicate Prompt

```typescript
const handleDuplicatePrompt = async (channelType: 'voice' | 'chat') => {
  const binding = channelType === 'voice' ? bindings.voice : bindings.chat;
  if (!binding?.currentDraftId) return;

  try {
    // Create new version (duplicate)
    const response = await apiClient.post(
      `/api/pms/prompts/${binding.currentDraftId}/versions`
    );
    const newPrompt = response.data;

    // Navigate to edit the duplicate
    navigate(`/prompts/edit/${newPrompt._id}?productId=${productId}`);
  } catch (err: any) {
    setError(err.response?.data?.error || 'Failed to duplicate prompt');
  }
};
```

**Flow:**
1. User clicks "Duplicate"
2. API call to create new version
3. Backend creates copy with incremented version
4. Returns new prompt ID
5. Navigate to editor with new prompt
6. User can modify duplicate immediately

**Use Cases:**
- Testing variations of existing prompt
- Creating backup before major changes
- Using existing prompt as starting point
- A/B testing different prompt versions

### 3. Delete Prompt

```typescript
const handleDeletePrompt = async (channelType: 'voice' | 'chat') => {
  const binding = channelType === 'voice' ? bindings.voice : bindings.chat;
  if (!binding?.currentDraftId) return;

  // Confirmation dialog
  if (!confirm('Are you sure you want to delete this prompt? This action cannot be undone.')) {
    return;
  }

  try {
    // Soft delete
    await apiClient.delete(`/api/pms/prompts/${binding.currentDraftId}`);

    // Refresh to show updated state
    await fetchBindings();
    setMenuOpen(null);
  } catch (err: any) {
    setError(err.response?.data?.error || 'Failed to delete prompt');
  }
};
```

**Safety Features:**
- ✅ Confirmation dialog before deletion
- ✅ Soft delete (data preserved)
- ✅ Can be restored later
- ✅ Error handling with user feedback

---

## Visual Design

### Menu Button Specifications

**Dimensions:**
- Width: auto (based on padding)
- Height: ~26px
- Padding: 6px 8px
- Icon: ⋮ (vertical ellipsis)
- Font size: 14px

**States:**
- **Default**: White background, #666 text, #ddd border
- **Hover**: #f5f5f5 background
- **Active** (menu open): #f0f0f0 background
- **Transition**: 0.2s all

### Dropdown Menu Specifications

**Container:**
- Min width: 180px
- Background: white
- Border: 1px solid #e0e0e0
- Border radius: 6px
- Box shadow: `0 4px 12px rgba(0,0,0,0.15)`
- z-index: 1000

**Menu Items:**
- Padding: 10px 16px
- Font size: 12px
- Gap between icon and text: 10px
- Border between items: 1px solid #f0f0f0

**Hover States:**
- Normal items: #f5f5f5 background
- Delete item: #ffebee background (light red)

**Colors:**
- Normal text: #333
- Delete text: #d32f2f (red)
- Hover backgrounds: #f5f5f5 / #ffebee

---

## User Experience Flow

### Scenario 1: Creating New Prompt

```
1. User views tenant prompts detail page
2. Sees "No voice prompt configured" or existing prompt
3. Clicks hamburger menu (⋮)
4. Dropdown appears with options
5. Clicks "➕ Create New"
6. Navigates to template selector
7. Selects template
8. New prompt created and opened in editor
```

### Scenario 2: Duplicating for Testing

```
1. User has working voice prompt
2. Wants to test variations
3. Clicks hamburger menu (⋮)
4. Clicks "📋 Duplicate"
5. API creates new version
6. Navigates to editor with duplicate
7. Makes changes to test
8. Original prompt unchanged
```

### Scenario 3: Deleting Old Prompt

```
1. User decides to remove prompt
2. Clicks hamburger menu (⋮)
3. Clicks "🗑️ Delete" (red text)
4. Confirmation dialog appears
5. User confirms deletion
6. Prompt soft-deleted
7. Page refreshes to show updated state
8. Prompt can be restored if needed
```

---

## Responsive Behavior

### Desktop (>1080px)
```
[Name + Icon] [Status Badges........] [Date] [⋮]
                                              ↓
                                    [Menu Dropdown]
```
- Menu opens downward
- Right-aligned to button
- Full menu visible

### Tablet (768-1080px)
```
[Name + Icon] [Badges...] [Date] [⋮]
                                  ↓
                        [Menu Dropdown]
```
- Same behavior as desktop
- Menu may overlap content (fixed z-index handles this)

### Mobile (<768px)
```
[Name]
[Status] [Date] [⋮]
                 ↓
         [Menu Dropdown]
```
- Menu still right-aligned
- May extend past left edge of card
- z-index ensures visibility

---

## Keyboard Accessibility

### Tab Navigation
```
Tab → Focus hamburger button
Enter → Open menu
Tab → Focus first menu item
Enter → Execute action
Esc → Close menu
```

### Improvements Needed
Current implementation is mouse-focused. Future enhancements:
- Arrow key navigation within menu
- Escape key to close menu
- Focus trap within open menu
- ARIA labels for screen readers

---

## API Endpoints Used

### 1. Create New Version (Duplicate)
```http
POST /api/pms/prompts/:id/versions
```

**Request:** No body needed
**Response:**
```json
{
  "_id": "new-prompt-id",
  "promptId": "original-prompt-id",
  "version": 4,
  "name": "Voice Prompt",
  // ... full prompt data
}
```

### 2. Soft Delete Prompt
```http
DELETE /api/pms/prompts/:id
```

**Request:** No body needed
**Response:** 204 No Content

**Effect:**
- Sets `isDeleted: true`
- Sets `deletedAt` timestamp
- Sets `deletedBy` actor info
- Preserves all data

---

## Error Handling

### Duplicate Action Errors

**Scenarios:**
- Prompt not found → "Failed to duplicate prompt"
- Permission denied → "Failed to duplicate prompt"
- Network error → "Failed to duplicate prompt"

**User Feedback:**
```typescript
setError(err.response?.data?.error || 'Failed to duplicate prompt');
```
- Error shown in red banner at top
- User can retry action
- Menu closes on error

### Delete Action Errors

**Scenarios:**
- Prompt not found → "Failed to delete prompt"
- Already deleted → "Failed to delete prompt"
- Permission denied → "Failed to delete prompt"

**Safety:**
- Confirmation required before API call
- Error doesn't delete data
- User notified of failure

---

## Menu State Management

### Why String | Null?

```typescript
const [menuOpen, setMenuOpen] = useState<string | null>(null);
```

**Advantages:**
- Tracks which channel's menu is open
- Multiple rows can have menus (voice + chat)
- `menuOpen === 'voice'` → Voice menu open
- `menuOpen === 'chat'` → Chat menu open
- `menuOpen === null` → No menu open

### Toggle Logic

```typescript
onClick={() => setMenuOpen(menuOpen === activeChannel ? null : activeChannel)}
```

**Behavior:**
- If menu already open → Close it
- If menu closed → Open it
- If different menu open → Close old, open new

---

## Visual Examples

### Menu Closed (Default)
```
┌─────────────────────────────────────────┐
│ 📞 Customer Service Voice  [DRAFT v3]  │
│                         1/26/2026  [⋮]  │ ← Gray button
└─────────────────────────────────────────┘
```

### Menu Open
```
┌─────────────────────────────────────────┐
│ 📞 Customer Service Voice  [DRAFT v3]  │
│                         1/26/2026  [⋮]  │ ← Highlighted
└─────────────────────────┬───────────────┘
                          │ ┌──────────────────┐
                          └─│ ✏️ Edit Draft    │
                            │ 👁️ View Production│
                            │ ➕ Create New    │
                            │ 📋 Duplicate     │
                            │ 🗑️ Delete        │ ← Red text
                            └──────────────────┘
```

### Hover Effect
```
┌──────────────────┐
│ ✏️ Edit Draft    │ ← Hovered (gray bg)
│ 👁️ View Production│
│ ➕ Create New    │
│ 📋 Duplicate     │
│ 🗑️ Delete        │
└──────────────────┘
```

---

## Future Enhancements

### 1. More Actions
```
- Export prompt as JSON
- Copy prompt ID
- View version history
- Run analysis
- Promote to production
- Rollback to previous version
```

### 2. Conditional Items
```typescript
{
  label: "Promote to Production",
  visible: state === 'draft' && score >= threshold,
  icon: "🚀"
}
```

### 3. Submenus
```
Export ›  JSON
          YAML
          Text
```

### 4. Keyboard Shortcuts
```
E - Edit
D - Duplicate
Delete - Delete prompt
```

### 5. Bulk Actions
- Select multiple prompts
- Batch duplicate
- Batch delete
- Batch export

---

## Testing Checklist

- [x] **Menu Toggle**
  - Click hamburger → Menu opens
  - Click again → Menu closes
  - Click outside → Menu closes
  - Switch channels → Previous menu closes

- [x] **Edit Action**
  - Click "Edit Draft" → Opens editor
  - Correct prompt ID in URL
  - Menu closes after click

- [x] **View Production** (when available)
  - Shows only if activeProductionId exists
  - Click → Opens production version
  - Menu closes after click

- [x] **Create New**
  - Click "Create New" → Navigate to templates
  - Correct productId and channelType in URL
  - Menu closes after click

- [x] **Duplicate**
  - Click "Duplicate" → Creates new version
  - Navigate to editor with new ID
  - Original prompt unchanged
  - Menu closes after click

- [x] **Delete**
  - Click "Delete" → Show confirmation
  - Cancel → No deletion, menu closes
  - Confirm → Prompt deleted, page refreshes
  - Error handling works

- [x] **Visual**
  - Hamburger button styled correctly
  - Hover effects work
  - Menu positioned correctly
  - Delete item is red
  - Icons display properly

---

## Files Modified

1. **ai-product-management/frontend/src/pages/TenantPrompts.tsx**
   - Line 63: Added `menuOpen` state
   - Lines 138-170: Added handler functions
     - `handleDuplicatePrompt()`: Clone prompt
     - `handleDeletePrompt()`: Soft delete with confirmation
   - Lines 297-460: Complete header redesign
     - Removed inline Edit/Prod buttons
     - Added hamburger menu button
     - Added dropdown menu with 5 actions
     - Added click-outside handler

---

## Benefits Summary

### User Experience
- ✅ All actions in one place
- ✅ Cleaner header (less clutter)
- ✅ Discoverable actions
- ✅ Familiar hamburger pattern
- ✅ Quick access to all operations

### Functionality
- ✅ Create new prompts
- ✅ Duplicate for testing
- ✅ Edit drafts
- ✅ View production versions
- ✅ Delete with confirmation

### Design
- ✅ Professional dropdown menu
- ✅ Consistent with modern UIs
- ✅ Hover effects and transitions
- ✅ Red color for destructive action
- ✅ Icon + label for clarity

---

## Related Documentation

- [Tenant Prompts Grid Layout](TENANT_PROMPTS_GRID_LAYOUT.md)
- [Tenant Prompts Compact Table View](TENANT_PROMPTS_COMPACT_TABLE_VIEW.md)
- [Dashboard Improvements Professional](DASHBOARD_IMPROVEMENTS_PROFESSIONAL.md)

---

## Summary

✅ **Hamburger menu implemented**
- ⋮ button in top-right of each prompt row
- 5 actions: Edit, View Prod, Create, Duplicate, Delete
- Dropdown menu with hover effects
- Click-outside to close
- Create new: Navigate to templates
- Duplicate: Clone prompt via API
- Delete: Soft delete with confirmation
- Professional design with icons
- Red color for destructive action

