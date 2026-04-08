# Dynamic Session Menu System

**Status:** Implemented ✅
**Created:** 2026-02-09

---

## Overview

The session menu system presents users with available prompt options at chat/voice session start, loaded **dynamically from the tenant's production prompts** in the database.

**Key Change from Original Plan:**
- ❌ **NOT** using static `menuConfig` in `assistant_channels` collection
- ✅ **Dynamically loading** from `tenant_prompt_bindings` + `prompt_versions` collections

---

## How It Works

### Data Flow

```
1. User opens chat → POST /api/chat/session
2. Backend calls MenuService.getSessionMenu(tenantId, productId, channelType)
3. MenuService queries:
   a. tenant_prompt_bindings (where tenantId + productId + channelType match)
   b. Collects activeProductionId from each binding
   c. Fetches prompt_versions where _id in activeProductionIds
4. MenuService builds options array from prompt names/icons
5. Backend returns { sessionId, greeting, options[], promptText }
6. Frontend displays option bubbles in chat context
7. User clicks option → promptId sent to backend
8. Backend validates selection and includes promptId in assistant context
```

### Database Schema

**tenant_prompt_bindings:**
```javascript
{
  tenantId: "tenant-default",
  productId: "va-service", // String, not ObjectId
  channelType: "chat",
  activeProductionId: ObjectId("..."), // Points to production prompt
  currentDraftId: ObjectId("..."), // Optional
  pulledTemplateIds: [],
  scoreThreshold: 90
}
```

**prompt_versions:**
```javascript
{
  _id: ObjectId("..."),
  name: "Sales Inquiry",
  icon: "💰",
  state: "production",
  isActive: true,
  channelType: "chat",
  tenantId: "tenant-default",
  productId: "va-service",
  content: { ... },
  // ... other fields
}
```

---

## Backend Implementation

### 1. MenuService (`menu.service.ts`)

**Methods:**
- `getSessionMenu(tenantId, productId, channelType)` → Returns MenuConfig | null
- `validateSelection(optionId, tenantId, productId, channelType)` → Validates prompt selection
- `mapDTMFToOption(dtmfKey, tenantId, productId)` → Maps voice DTMF keys (future)

**Logic:**
```typescript
async getSessionMenu(tenantId, productId, channelType) {
  // 1. Find all bindings for this tenant+product+channel
  const bindings = await db.collection('tenant_prompt_bindings')
    .find({ tenantId, productId, channelType })
    .toArray();

  // 2. Extract production prompt IDs
  const productionPromptIds = bindings
    .filter(b => b.activeProductionId)
    .map(b => b.activeProductionId);

  // 3. Fetch actual prompt versions
  const prompts = await db.collection('prompt_versions')
    .find({
      _id: { $in: productionPromptIds },
      state: 'production',
      isActive: true,
      isDeleted: { $ne: true }
    })
    .toArray();

  // 4. Build menu options
  const options = prompts.map((prompt, index) => ({
    id: prompt._id.toString(), // This is the promptId
    text: prompt.name,
    value: prompt.name,
    icon: prompt.icon || '💬',
    dtmfKey: (index + 1).toString()
  }));

  // 5. Return menu config
  return {
    enabled: true,
    promptText: 'Select a service:',
    options,
    allowFreeText: false
  };
}
```

### 2. Chat Routes (`chat-routes.ts`)

**Session Init:**
```typescript
const menuConfig = await menuService.getSessionMenu(customerId, actualProductId, 'chat');

const response = {
  ...javaResponse.data,
  chatConfig: { ... },
  // Add menu options if configured
  ...(menuConfig && {
    options: menuConfig.options,
    promptText: menuConfig.promptText
  }),
  status: 'initialized'
};
```

### 3. Chat Socket (`chat-socket.ts`)

**Message Handler:**
```typescript
socket.on('chat:send-message', async (data) => {
  const { sessionId, message, isMenuSelection, selectedPromptId } = data;

  // Validate menu selection
  let promptId = selectedPromptId;
  if (isMenuSelection && !promptId) {
    const validation = await menuService.validateSelection(
      message,
      user.tenantId,
      'va-service',
      'chat'
    );

    if (validation.valid && validation.promptId) {
      promptId = validation.promptId;
    } else {
      socket.emit('chat:error', {
        error: 'Invalid menu selection'
      });
      return;
    }
  }

  // Include promptId in context
  await assistantService.processMessage({
    sessionId,
    message,
    userId: user.id,
    tenantId: user.tenantId,
    source: 'text',
    context: {
      productId: 'va-service',
      promptId // Pass selected prompt to Java VA service
    }
  });
});
```

### 4. Assistant Service (`assistant-service.ts`)

**Updated Context:**
```typescript
export interface AssistantMessageParams {
  sessionId: string;
  message: string;
  userId: string;
  tenantId?: string;
  source: 'text' | 'voice';
  context?: {
    productId?: string;
    promptId?: string; // NEW: Selected prompt from menu
    userRole?: string;
    userName?: string;
  };
}

// Sent to Java VA service
{
  sessionId,
  message,
  context: {
    userId,
    customerId: tenantId,
    productId: 'va-service',
    promptId, // Java can use this to load specific prompt
    source: 'text'
  }
}
```

---

## Frontend Implementation

### 1. AssistantChat Component (`AssistantChat.tsx`)

**State Variables:**
```typescript
const [menuOptions, setMenuOptions] = useState<MenuOption[] | null>(null);
const [promptText, setPromptText] = useState<string | null>(null);
const [optionSelected, setOptionSelected] = useState(false);
const [selectedPromptId, setSelectedPromptId] = useState<string | null>(null);
```

**Session Init:**
```typescript
const response = await apiClient.post('/api/chat/session', {
  productId: productId || 'va-service',
  forceNew: true
});

if (response.data.options && response.data.options.length > 0) {
  setMenuOptions(response.data.options);
  setPromptText(response.data.promptText || 'Please select an option:');
  setOptionSelected(false);
} else {
  setMenuOptions(null);
  setOptionSelected(true);
}
```

**Handle Option Click:**
```typescript
const handleOptionSelect = (option: MenuOption) => {
  // Load text into input (user can modify before sending)
  setInputMessage(option.text);

  // Store promptId
  setSelectedPromptId(option.id);

  // Hide options
  setOptionSelected(true);

  // Focus input
  setTimeout(() => inputRef.current?.focus(), 100);
};
```

**Send Message:**
```typescript
socket.emit('chat:send-message', {
  sessionId,
  message: messageToSend,
  isMenuSelection: !!selectedPromptId,
  selectedPromptId: selectedPromptId || undefined
});

// Clear after sending
setSelectedPromptId(null);
```

**UI Rendering:**
```tsx
{menuOptions && !optionSelected && messages.length > 0 && (
  <div style={{ marginBottom: '16px' }}>
    {promptText && (
      <div style={{ /* blue banner */ }}>
        {promptText}
      </div>
    )}
    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
      {menuOptions.map((option) => (
        <button
          key={option.id}
          onClick={() => handleOptionSelect(option)}
          style={{ /* pill-shaped bubble */ }}
        >
          {option.icon && <span>{option.icon}</span>}
          <span>{option.text}</span>
        </button>
      ))}
    </div>
  </div>
)}
```

---

## Testing

### 1. Seed Test Data

```bash
node product-management/scripts/mongo/seed-session-menu-test-data.js
```

Creates:
- 3 production prompts (Sales, Support, Billing)
- 3 tenant_prompt_bindings linking them
- For tenant: `tenant-default`, product: `va-service`

### 2. Verify Data

```bash
node product-management/scripts/mongo/inspect-collections.js
```

Should show:
- 3 tenant_prompt_bindings
- 3 prompt_versions in production state

### 3. Test in UI

1. Start backend: `npm start`
2. Open chat UI
3. Click "New Chat"
4. You should see:
   - Greeting message
   - Blue banner: "Select a service:"
   - 3 option bubbles with icons
   - Disabled input field with placeholder "Please select an option above..."
5. Click an option (e.g., "💰 Sales Inquiry")
6. Text loads into input field
7. Input becomes enabled
8. Press Ctrl+Enter to send
9. Message sent with `promptId` in context

### 4. Backend Logs

```
[MenuService] Loading dynamic menu for: { tenantId: 'tenant-default', productId: 'va-service', channelType: 'chat' }
[MenuService] Found 3 prompt bindings
[MenuService] Found 3 production prompts
[Chat Socket] Message received { isMenuSelection: true, selectedPromptId: '698a377c3636fcd584fb94fd' }
[MenuService] Menu option validated { promptId: '698a377c3636fcd584fb94fd', promptName: 'Sales Inquiry' }
[AssistantService] Processing text message with promptId: 698a377c3636fcd584fb94fd
```

---

## Files Modified

### Backend
- ✅ `src/services/menu.service.ts` (NEW) - Dynamic menu loading
- ✅ `src/routes/chat-routes.ts` - Fetch and return menu options
- ✅ `src/sockets/chat-socket.ts` - Validate selection, pass promptId
- ✅ `src/services/assistant-service.ts` - Include promptId in context

### Frontend
- ✅ `src/components/AssistantChat.tsx` - Option bubbles UI, selection handling

### Scripts
- ✅ `product-management/scripts/mongo/seed-session-menu-test-data.js` (NEW)
- ✅ `product-management/scripts/mongo/inspect-collections.js` (NEW)
- ✅ `product-management/scripts/mongo/test-session-menu.js` (NEW)

---

## Key Differences from Original Plan

| Original Plan | Actual Implementation |
|---------------|----------------------|
| Static `menuConfig` in `assistant_channels` | Dynamic loading from `prompt_versions` |
| Options defined manually in DB | Options generated from tenant's production prompts |
| Menu config per channel | Menu built from active prompt bindings |
| Fixed option list | Changes automatically when prompts promoted/archived |

---

## Benefits of Dynamic Approach

1. **Automatic Updates:** Menu reflects current production prompts without manual config
2. **PMS Integration:** Leverages existing Prompt Management System
3. **Version Control:** Only shows prompts in production state
4. **Multi-Tenant:** Each tenant sees only their active prompts
5. **Consistency:** Prompt names/icons managed in one place (PMS)
6. **Scalability:** Supports unlimited prompts per tenant
7. **Workflow Integration:** Prompts automatically appear when promoted to production

---

## Future Enhancements

### Phase 2: Voice DTMF Support
- Add DTMF parsing in VoIP adapters
- Map DTMF keys (1, 2, 3) to prompt IDs
- Speak options via TTS after greeting

### Phase 3: Multi-Level Menus
- Support sub-menus (e.g., Sales → New vs Existing Customer)
- Store hierarchy in prompt metadata

### Phase 4: Context-Aware Menus
- Filter options based on user history
- Show recently used prompts first
- A/B test different menu layouts

### Phase 5: Admin UI
- Configure menu display options in PMS
- Set custom promptText per tenant
- Enable/disable menu per channel

---

## Troubleshooting

### Options Not Showing

**Check:**
1. Are there production prompts? `db.prompt_versions.find({ state: 'production', isActive: true })`
2. Are bindings created? `db.tenant_prompt_bindings.find({ tenantId: 'tenant-default' })`
3. Do bindings have `activeProductionId` set?
4. Check browser console for session init response

**Fix:**
```bash
# Reseed test data
node product-management/scripts/mongo/seed-session-menu-test-data.js

# Verify
node product-management/scripts/mongo/inspect-collections.js
```

### Invalid Menu Selection Error

- Check that `option.id` matches a valid ObjectId in `prompt_versions`
- Verify `validateSelection` returns `{ valid: true, promptId: ... }`
- Check socket logs for validation errors

### PromptId Not Reaching Java VA Service

- Verify `context.promptId` is passed in `assistantService.processMessage()`
- Check network tab: POST `/agent/execute` includes `promptId` in context
- Java VA service must handle `promptId` field in request context

---

## Summary

The session menu system successfully loads available prompts **dynamically from the database**, presenting them as clickable option bubbles in the chat UI. When a user selects an option, the `promptId` is passed to the backend and included in the assistant context, allowing the Java VA service to use the specific prompt configuration.

This implementation is **fully integrated with the PMS (Prompt Management System)** and automatically reflects changes when prompts are promoted to production or archived.
