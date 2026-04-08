# Phase 5: Data Flow & State Management

## Overview
This document outlines the complete data flow and state management architecture for the Prompt Management System, covering frontend state management, API communication patterns, and data synchronization strategies.

---

## Frontend State Management

### State Architecture

The application uses **React's built-in hooks** for state management without external libraries like Redux:

```
┌─────────────────────────────────────────┐
│         Component State Layer           │
│  (useState, useRef, useCallback)        │
├─────────────────────────────────────────┤
│         API Client Layer                │
│  (promptApi, apiClient)                 │
├─────────────────────────────────────────┤
│         Backend Services                │
│  (prompt.service, tenantPrompt.service) │
└─────────────────────────────────────────┘
```

### State Categories

#### 1. **UI State**
Managed locally within components
- Modal visibility
- Loading states
- Error messages
- Form input values
- Tab selections

**Example (PromptEditor.tsx):**
```typescript
const [loading, setLoading] = useState(true);
const [saving, setSaving] = useState(false);
const [error, setError] = useState<string | null>(null);
const [showVersionWarning, setShowVersionWarning] = useState(false);
const [showPromoteModal, setShowPromoteModal] = useState(false);
```

#### 2. **Data State**
Fetched from backend and cached
- Prompt versions
- Tenant bindings
- Analytics/metrics
- Version history

**Example (PromptEditor.tsx):**
```typescript
const [prompt, setPrompt] = useState<IPromptVersion | null>(null);
const savedPromptRef = useRef<IPromptVersion | null>(null);
```

#### 3. **Derived State**
Computed from other state
- isDirty check
- isEditingNonDraft flag
- Button text/state
- Validation status

**Example (PromptEditor.tsx):**
```typescript
const isDirty = () => {
  if (!prompt || !savedPromptRef.current) return !!prompt;
  return JSON.stringify(prompt) !== JSON.stringify(savedPromptRef.current);
};

const [isEditingNonDraft, setIsEditingNonDraft] = useState(false);
```

---

## Data Flow Patterns

### Pattern 1: Fetch-Display-Update

**Flow:**
```
User Action → API Call → Update State → Re-render
```

**Example: Loading a Prompt**
```typescript
// 1. User navigates to edit page
useEffect(() => {
  const loadPrompt = async () => {
    setLoading(true);
    try {
      const data = await promptApi.getPrompt(id);
      setPrompt(data);  // Update state
      savedPromptRef.current = JSON.parse(JSON.stringify(data));  // Save snapshot

      if (data.state !== 'draft') {
        setIsEditingNonDraft(true);  // Set flag
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };
  loadPrompt();
}, [id]);
```

**Data Flow:**
```
[Navigate to /prompts/edit/:id]
           ↓
[useEffect triggers]
           ↓
[API: GET /api/pms/prompts/:id]
           ↓
[setState: prompt, savedPromptRef]
           ↓
[Component re-renders with data]
```

---

### Pattern 2: Optimistic Updates

**Flow:**
```
User Action → Update UI Immediately → API Call → Confirm or Rollback
```

**Example: Auto-Save**
```typescript
const triggerAutoSave = useCallback(() => {
  if (autoSaveTimeout.current) {
    clearTimeout(autoSaveTimeout.current);
  }

  autoSaveTimeout.current = setTimeout(async () => {
    if (prompt && prompt._id && prompt.state === 'draft' && !isEditingNonDraft) {
      try {
        setSaving(true);
        const result = await promptApi.updateDraft(prompt._id, prompt);
        // Update saved snapshot on success
        savedPromptRef.current = JSON.parse(JSON.stringify(result.prompt));
      } catch (err) {
        console.error('Auto-save failed:', err);
        // Could rollback to savedPromptRef.current here
      } finally {
        setSaving(false);
      }
    }
  }, 30000);
}, [prompt, isEditingNonDraft]);
```

**Data Flow:**
```
[User types in editor]
           ↓
[updateField() updates local state]
           ↓
[UI reflects change immediately]
           ↓
[30 seconds later...]
           ↓
[API: PUT /api/pms/prompts/:id]
           ↓
[Success: Update savedPromptRef]
[Failure: Log error, keep local state]
```

---

### Pattern 3: Version Creation on Edit

**Flow:**
```
Edit Non-Draft → Show Warning → Create Version → Update State
```

**State Transitions:**
```typescript
// State before edit
{
  prompt: { _id: "prod-123", state: "production", version: 1 },
  isEditingNonDraft: true,
  savedPromptRef: { ...original production prompt }
}

// User makes changes
{
  prompt: { _id: "prod-123", state: "production", version: 1, name: "Updated" },
  isEditingNonDraft: true,
  savedPromptRef: { ...unchanged }
}

// User clicks save → Modal appears
{
  showVersionWarning: true
}

// User confirms → API creates new version
{
  prompt: { _id: "draft-456", state: "draft", version: 2, name: "Updated" },
  isEditingNonDraft: false,  // Now editing the new draft
  savedPromptRef: { ...new draft prompt }
}
```

**Complete Flow:**
```typescript
const handleSaveClick = () => {
  if (!prompt) return;

  if (!prompt._id) {
    handleCreate();  // New prompt
  } else if (isEditingNonDraft) {
    setShowVersionWarning(true);  // Show modal
  } else {
    handleUpdateDraft();  // Update existing draft
  }
};

const handleVersionWarningConfirm = async () => {
  setShowVersionWarning(false);
  await handleUpdateDraft();  // Triggers version creation
};

const handleUpdateDraft = async () => {
  if (!prompt || !prompt._id) return;
  try {
    setSaving(true);
    const result = await promptApi.updateDraft(prompt._id, prompt);

    if (result.isNewVersion) {
      // New version created
      setPrompt(result.prompt);
      savedPromptRef.current = JSON.parse(JSON.stringify(result.prompt));
      setIsEditingNonDraft(false);  // Key state change
    } else {
      // Just updated
      setPrompt(result.prompt);
      savedPromptRef.current = JSON.parse(JSON.stringify(result.prompt));
    }
  } catch (err) {
    setError(err.message);
  } finally {
    setSaving(false);
  }
};
```

---

### Pattern 4: Promotion Workflow

**State Machine:**
```
draft → testing → production
  ↓         ↓          ↓
[Promote] [Promote] [Active]
           [Analyze]
```

**State Transitions:**
```typescript
// Draft state
{
  prompt: { state: "draft" },
  // Shows: "Promote to Testing" button
}

// After promotion to testing
{
  prompt: { state: "testing" },
  // Shows: "Promote to Production" button
  // Can also show: "Run Analysis" button
}

// After promotion to production
{
  prompt: { state: "production", isActive: true },
  // Redirects to list view
  // Old production version: { state: "archived", isActive: false }
}
```

**Complete Flow:**
```typescript
const handlePromote = async (targetState: 'testing' | 'production') => {
  if (!prompt || !prompt._id) return;
  setShowPromoteModal(false);

  try {
    setSaving(true);
    const promoted = await promptApi.promotePrompt(prompt._id, targetState);

    // Update local state
    setPrompt(promoted);
    savedPromptRef.current = JSON.parse(JSON.stringify(promoted));

    // Navigate after production promotion
    if (targetState === 'production') {
      setTimeout(() => navigate('/prompts'), 1000);
    }
  } catch (err) {
    setError(err.message);
  } finally {
    setSaving(false);
  }
};
```

---

## API Response Structures

### 1. Update Draft Response

**Endpoint:** `PUT /api/pms/prompts/:id`

**Response:**
```typescript
{
  prompt: IPromptVersion;  // The updated or newly created prompt
  isNewVersion: boolean;   // true if new version was created
}
```

**Frontend Handling:**
```typescript
const result = await promptApi.updateDraft(id, updates);

if (result.isNewVersion) {
  // New version was created
  console.log(`Created version ${result.prompt.version}`);
  // Update UI to show draft state
  setIsEditingNonDraft(false);
} else {
  // Existing draft was updated
  console.log('Draft updated in place');
}
```

---

### 2. Promote Response

**Endpoint:** `POST /api/pms/prompts/:id/promote`

**Request:**
```typescript
{
  targetState: 'testing' | 'production'
}
```

**Response:**
```typescript
IPromptVersion  // Promoted prompt with updated state
```

**Frontend Handling:**
```typescript
const promoted = await promptApi.promotePrompt(id, 'testing');

// State changed
console.log(`State: ${promoted.state}`);  // "testing"

// Update UI
setPrompt(promoted);
```

---

### 3. Tenant Promotion Response

**Endpoint:** `POST /api/pms/tenant-prompts/:productId/:channelType/promote`

**Request:**
```typescript
{
  promptVersionId: string;
  targetState: 'testing' | 'production';
}
```

**Response:**
```typescript
{
  prompt: IPromptVersion;           // Promoted prompt
  binding: ITenantPromptBinding;    // Updated binding
}
```

**Frontend Handling:**
```typescript
const result = await apiClient.post(
  `/api/pms/tenant-prompts/${productId}/voice/promote`,
  { promptVersionId, targetState: 'production' }
);

// Binding updated
console.log(`Active Production: ${result.data.binding.activeProductionId}`);
console.log(`Current Draft: ${result.data.binding.currentDraftId}`);  // null after production

// Refresh UI
await fetchBindings();
```

---

## State Synchronization Strategies

### Strategy 1: Snapshot Pattern

**Purpose:** Detect changes and enable rollback

**Implementation:**
```typescript
// Save snapshot after successful save
const savedPromptRef = useRef<IPromptVersion | null>(null);

// After load or save
savedPromptRef.current = JSON.parse(JSON.stringify(prompt));

// Check for changes
const isDirty = () => {
  if (!prompt || !savedPromptRef.current) return !!prompt;
  return JSON.stringify(prompt) !== JSON.stringify(savedPromptRef.current);
};

// Rollback
const handleDiscardConfirmed = async () => {
  if (savedPromptRef.current) {
    setPrompt(JSON.parse(JSON.stringify(savedPromptRef.current)));
  }
};
```

**Benefits:**
- Enables "unsaved changes" warnings
- Allows discard/rollback
- Cheap dirty checking (JSON compare)

---

### Strategy 2: Debounced Auto-Save

**Purpose:** Save user work without overwhelming API

**Implementation:**
```typescript
const autoSaveTimeout = useRef<NodeJS.Timeout | null>(null);

const triggerAutoSave = useCallback(() => {
  // Clear existing timeout
  if (autoSaveTimeout.current) {
    clearTimeout(autoSaveTimeout.current);
  }

  // Set new timeout
  autoSaveTimeout.current = setTimeout(async () => {
    // Only auto-save drafts
    if (prompt && prompt._id && prompt.state === 'draft' && !isEditingNonDraft) {
      try {
        setSaving(true);
        const result = await promptApi.updateDraft(prompt._id, prompt);
        savedPromptRef.current = JSON.parse(JSON.stringify(result.prompt));
      } catch (err) {
        console.error('Auto-save failed:', err);
      } finally {
        setSaving(false);
      }
    }
  }, 30000);  // 30 seconds
}, [prompt, isEditingNonDraft]);

// Trigger on every field update
const updateField = (path: string, value: any) => {
  // ... update logic
  triggerAutoSave();
};
```

**Benefits:**
- Saves user work automatically
- Reduces API calls (debounced)
- Only saves drafts (safe)

---

### Strategy 3: Conditional Rendering

**Purpose:** Show/hide UI elements based on state

**Implementation:**
```typescript
// Save button visibility
{(!prompt._id || prompt.state === 'draft' || isEditingNonDraft) && (
  <Button onClick={handleSaveClick}>
    {saving ? 'Saving...' :
      (!prompt._id ? 'Create Prompt' :
        isEditingNonDraft ? 'Save (Create Version)' :
        'Update Draft')}
  </Button>
)}

// Promote to Testing button
{prompt._id && prompt.state === 'draft' && !isEditingNonDraft && (
  <Button onClick={() => {
    setPromoteTarget('testing');
    setShowPromoteModal(true);
  }}>
    Promote to Testing
  </Button>
)}

// Promote to Production button
{prompt._id && prompt.state === 'testing' && (
  <Button onClick={() => {
    setPromoteTarget('production');
    setShowPromoteModal(true);
  }}>
    Promote to Production
  </Button>
)}
```

---

## Error Handling Flows

### Error Categories

#### 1. **Network Errors**
- API unreachable
- Timeout
- Connection lost

**Handling:**
```typescript
try {
  const result = await promptApi.updateDraft(id, updates);
} catch (err: any) {
  if (err.code === 'ECONNREFUSED') {
    setError('Cannot connect to server. Please check your connection.');
  } else if (err.code === 'ETIMEDOUT') {
    setError('Request timed out. Please try again.');
  } else {
    setError(err.message || 'An error occurred');
  }
}
```

#### 2. **Validation Errors**
- Invalid state transition
- Missing required fields
- Business rule violations

**Handling:**
```typescript
try {
  await promptApi.promotePrompt(id, 'production');
} catch (err: any) {
  if (err.response?.status === 400) {
    // Validation error
    setError(err.response.data.error);
    // Example: "Can only promote testing prompts to production"
  } else {
    setError('Failed to promote prompt');
  }
}
```

#### 3. **Authorization Errors**
- Insufficient permissions
- Tenant isolation violation

**Handling:**
```typescript
try {
  await promptApi.promotePrompt(id, 'production');
} catch (err: any) {
  if (err.response?.status === 403) {
    setError('You do not have permission to perform this action');
    // Could redirect to login or show access denied page
  }
}
```

---

## State Transition Diagrams

### Prompt State Machine

```
┌─────────┐
│  draft  │◄────────────┐
└────┬────┘             │
     │ promote          │ edit creates
     │ to testing       │ new version
     ▼                  │
┌─────────┐             │
│ testing │             │
└────┬────┘             │
     │ promote          │
     │ to production    │
     ▼                  │
┌──────────┐            │
│production├────────────┘
└────┬─────┘
     │ new version
     │ promoted
     ▼
┌─────────┐
│archived │
└─────────┘
```

### Button State Logic

```
Initial Load
     ↓
Is there a prompt ID?
     ├─ No → Show "Create Prompt"
     └─ Yes → What is the state?
              ├─ draft → Show "Update Draft"
              │          + "Promote to Testing"
              ├─ testing → Show "Promote to Production"
              │            + "Run Analysis"
              └─ production/archived → Show "Save (Create Version)"
```

### Version Creation Decision Tree

```
User clicks Save
     ↓
Is there a prompt._id?
     ├─ No → Create new prompt (version 1)
     └─ Yes → What is prompt.state?
              ├─ draft → Update in place
              │          isNewVersion = false
              └─ non-draft → Show warning modal
                            ↓
                       User confirms?
                            ├─ Yes → Create new version
                            │        isNewVersion = true
                            │        New state = draft
                            └─ No → Cancel
```

---

## Best Practices

### 1. **Immutable State Updates**

```typescript
// ❌ Bad - Mutates state
prompt.name = 'New Name';
setPrompt(prompt);

// ✅ Good - Creates new object
setPrompt({ ...prompt, name: 'New Name' });
```

### 2. **Deep Cloning for Snapshots**

```typescript
// ❌ Bad - Shallow copy
savedPromptRef.current = { ...prompt };

// ✅ Good - Deep clone
savedPromptRef.current = JSON.parse(JSON.stringify(prompt));
```

### 3. **Cleanup Timers**

```typescript
useEffect(() => {
  // Setup auto-save
  const timeoutId = setTimeout(() => {
    // ... save logic
  }, 30000);

  // Cleanup on unmount
  return () => {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
  };
}, [dependencies]);
```

### 4. **Optimistic UI Updates**

```typescript
// Update UI immediately
setPrompt({ ...prompt, state: 'testing' });

// Then make API call
try {
  await promptApi.promotePrompt(id, 'testing');
  // Success - no action needed
} catch (err) {
  // Rollback on error
  setPrompt(savedPromptRef.current);
  setError(err.message);
}
```

---

## Performance Considerations

### 1. **Memoization**

```typescript
// Expensive calculation
const isDirty = useMemo(() => {
  if (!prompt || !savedPromptRef.current) return !!prompt;
  return JSON.stringify(prompt) !== JSON.stringify(savedPromptRef.current);
}, [prompt, savedPromptRef.current]);
```

### 2. **Callback Memoization**

```typescript
const triggerAutoSave = useCallback(() => {
  // ... auto-save logic
}, [prompt, isEditingNonDraft]);
```

### 3. **Component Memoization**

```typescript
const PromptCard = memo(({ prompt }: { prompt: IPromptVersion }) => {
  return (
    <div>
      <VersionStatus state={prompt.state} version={prompt.version} />
      <AnalyticsCard metrics={prompt.metrics} />
    </div>
  );
});
```

---

## Debugging State Issues

### Common Issues & Solutions

**Issue 1: State not updating**
```typescript
// Problem: State updates are batched
setPrompt(newPrompt);
console.log(prompt);  // Still old value!

// Solution: Use the updated value directly
const newPrompt = { ...prompt, name: 'Updated' };
setPrompt(newPrompt);
console.log(newPrompt);  // New value
```

**Issue 2: Stale closure**
```typescript
// Problem: useCallback captures old state
const handleClick = useCallback(() => {
  console.log(prompt);  // Stale!
}, []);  // Empty deps - prompt never updates

// Solution: Include dependencies
const handleClick = useCallback(() => {
  console.log(prompt);  // Fresh!
}, [prompt]);
```

**Issue 3: Infinite re-render**
```typescript
// Problem: Object created in render
<Component onChange={() => {}} />  // New function every render

// Solution: Memoize callback
const handleChange = useCallback(() => {}, []);
<Component onChange={handleChange} />
```

---

## Testing State Management

### Unit Tests

```typescript
describe('PromptEditor State Management', () => {
  it('sets isEditingNonDraft when loading production prompt', async () => {
    const { result } = renderHook(() => usePromptEditor('production-id'));

    await waitFor(() => {
      expect(result.current.isEditingNonDraft).toBe(true);
    });
  });

  it('creates new version on first save of non-draft', async () => {
    const { result } = renderHook(() => usePromptEditor('production-id'));

    await result.current.handleSave();

    expect(mockApi.updateDraft).toHaveBeenCalled();
    await waitFor(() => {
      expect(result.current.prompt.version).toBe(2);
      expect(result.current.isEditingNonDraft).toBe(false);
    });
  });
});
```

---

## Summary

The state management architecture provides:

✅ **Clear Data Flow:** Unidirectional data flow from API to state to UI
✅ **Optimistic Updates:** Immediate feedback with error rollback
✅ **Smart Caching:** Snapshot pattern for dirty checking and rollback
✅ **Auto-Save:** Debounced updates to prevent data loss
✅ **State Machines:** Clear state transitions with validation
✅ **Error Handling:** Comprehensive error recovery
✅ **Performance:** Memoization and optimization strategies

All patterns are production-tested and ready for scale.
