# Menu System Testing & Verification

**Product ID:** `69728bdb0959e1a2da517684`
**Status:** ✅ Database Configured
**Date:** 2026-02-12

---

## Summary

The session menu system has been fully configured for product `69728bdb0959e1a2da517684` with:
- ✅ 2 chat prompts (Customer Support Chat, Sales Inquiry Chat)
- ✅ 1 voice prompt (Customer Support Voice)
- ✅ All prompts in production state
- ✅ All tenant prompt bindings created with activeProductionId set

---

## Database Verification

### ✅ Test Results

**Script:** `ai-product-management/scripts/mongo/test-menu-service.js`

**Output:**
```json
{
  "enabled": true,
  "promptText": "Select a service:",
  "options": [
    {
      "id": "698df6a2bb0ebaa18ee99b09",
      "text": "Customer Support Chat",
      "value": "Customer Support Chat",
      "icon": "💬",
      "dtmfKey": "1"
    },
    {
      "id": "698df6a2bb0ebaa18ee99b0a",
      "text": "Sales Inquiry Chat",
      "value": "Sales Inquiry Chat",
      "icon": "💰",
      "dtmfKey": "2"
    }
  ],
  "allowFreeText": false
}
```

### Collections Status

| Collection | Records | Status |
|------------|---------|--------|
| **products** | 1 | ✅ Product exists with _id: `69728bdb0959e1a2da517684` |
| **prompt_versions** | 3 | ✅ 2 chat + 1 voice, all in production |
| **tenant_prompt_bindings** | 3 | ✅ 2 chat + 1 voice, all with activeProductionId set |

---

## Frontend Testing Instructions

### Step 1: Start the Backend

```bash
cd ai-product-management/backend-node
npm start
```

**Expected:** Backend starts on port 3001

### Step 2: Open Chat UI

Navigate to:
```
http://localhost:5173/products/69728bdb0959e1a2da517684/configure/assistant-chat
```

Or from the UI:
1. Go to Products page
2. Find product with ID `69728bdb0959e1a2da517684`
3. Click "Configure"
4. Click "Assistant Chat" tab

### Step 3: Initialize Chat Session

**Expected Behavior:**

1. **Session Initialization Request:**
   ```
   POST /api/chat/session
   {
     "productId": "69728bdb0959e1a2da517684",
     "forceNew": true
   }
   ```

2. **Backend Logs (Expected):**
   ```
   [MenuService] Loading dynamic menu for: {
     tenantId: 'tenant-default',
     productId: '69728bdb0959e1a2da517684',
     channelType: 'chat'
   }
   [MenuService] Using ObjectId for productId: 69728bdb0959e1a2da517684
   [MenuService] Found 2 prompt bindings
   [MenuService] Found 2 production prompts
   ```

3. **Response (Expected):**
   ```json
   {
     "sessionId": "...",
     "greeting": "...",
     "chatConfig": { ... },
     "options": [
       {
         "id": "698df6a2bb0ebaa18ee99b09",
         "text": "Customer Support Chat",
         "icon": "💬",
         "dtmfKey": "1"
       },
       {
         "id": "698df6a2bb0ebaa18ee99b0a",
         "text": "Sales Inquiry Chat",
         "icon": "💰",
         "dtmfKey": "2"
       }
     ],
     "promptText": "Select a service:"
   }
   ```

### Step 4: Verify UI Rendering

**Expected Visual Elements:**

```
┌─────────────────────────────────────┐
│ [Assistant Message]                 │
│ Hello! How can I assist you today?  │
└─────────────────────────────────────┘

┌─────────────────────────────────────┐
│ Select a service:                   │  ← Blue banner
├─────────────────────────────────────┤
│ [💬 Customer Support Chat        ] │  ← Pill-shaped button
│ [💰 Sales Inquiry Chat           ] │  ← Pill-shaped button
└─────────────────────────────────────┘

┌─────────────────────────────────────┐
│ Please select an option above...    │  ← Disabled input
└─────────────────────────────────────┘
```

**CSS Characteristics:**
- Banner: Blue background (`#f0f9ff`), rounded corners
- Bubbles: White background, blue border (`#e0e7ff`), pill shape (`borderRadius: 20px`)
- Hover: Light purple background (`#eef2ff`), slight elevation
- Icon + text layout with gap

### Step 5: Test Option Selection

**User Action:** Click "💬 Customer Support Chat"

**Expected Behavior:**

1. **Input Field Updates:**
   - Text appears: "Customer Support Chat"
   - Input becomes enabled
   - Cursor focuses in input field

2. **State Changes:**
   ```javascript
   inputMessage = "Customer Support Chat"
   selectedPromptId = "698df6a2bb0ebaa18ee99b09"
   optionSelected = true
   ```

3. **UI Changes:**
   - Option bubbles disappear
   - Blue banner disappears
   - Input field shows the selected text
   - User can now edit or press Ctrl+Enter to submit

### Step 6: Test Message Submission

**User Action:** Press Ctrl+Enter (or click Send)

**Expected Socket Emission:**
```javascript
socket.emit('chat:send-message', {
  sessionId: "session-xxx",
  message: "Customer Support Chat",
  isMenuSelection: true,
  selectedPromptId: "698df6a2bb0ebaa18ee99b09"
})
```

**Backend Processing:**

1. **Chat Socket Handler:**
   ```javascript
   // Validates menu selection
   const validation = await menuService.validateSelection(
     "698df6a2bb0ebaa18ee99b09",
     "tenant-default",
     "69728bdb0959e1a2da517684",
     "chat"
   )
   // Returns: { valid: true, promptId: "698df6a2bb0ebaa18ee99b09", ... }
   ```

2. **Assistant Service Call:**
   ```javascript
   await assistantService.processMessage({
     sessionId,
     message: "Customer Support Chat",
     userId: user.id,
     tenantId: "tenant-default",
     source: "text",
     context: {
       productId: "69728bdb0959e1a2da517684",
       promptId: "698df6a2bb0ebaa18ee99b09" // ← Passed to Java
     }
   })
   ```

3. **Java Service Request:**
   ```
   POST http://localhost:8136/agent/execute
   {
     "sessionId": "...",
     "message": "Customer Support Chat",
     "context": {
       "userId": "...",
       "customerId": "tenant-default",
       "productId": "69728bdb0959e1a2da517684",
       "promptId": "698df6a2bb0ebaa18ee99b09"
     }
   }
   ```

---

## Troubleshooting

### Issue: No Menu Options Appear

**Possible Causes:**

1. **Backend not using ObjectId for productId**
   - Check backend logs for MenuService query
   - Should see: "Using ObjectId for productId"
   - Should NOT see: "No prompt bindings found"

2. **Frontend passing wrong productId format**
   - Check Network tab: POST `/api/chat/session` request body
   - Verify: `productId: "69728bdb0959e1a2da517684"`

3. **Database bindings missing**
   - Run: `node ai-product-management/scripts/mongo/check-product-prompts.js`
   - Verify: 2 chat bindings with activeProductionId set

**Fix:**
```bash
# Re-run seeding script
node ai-product-management/scripts/mongo/seed-product-prompts.js

# Verify configuration
node ai-product-management/scripts/mongo/test-menu-service.js
```

### Issue: Options Appear but Click Doesn't Work

**Check:**
- Browser console for JavaScript errors
- React state updates in DevTools
- `handleOptionSelect` function execution

**Debug:**
```javascript
// Add to AssistantChat.tsx handleOptionSelect
console.log('Option clicked:', option);
console.log('Setting promptId:', option.id);
```

### Issue: PromptId Not Reaching Java Service

**Check:**
1. Backend logs for socket message handler
2. AssistantService request body
3. Java service logs for incoming context

**Verify:**
```bash
# Check backend logs
grep "promptId" ai-product-management/backend-node/logs/*.log

# Check if Java is receiving context
# (Look in Java service logs)
```

---

## Testing Checklist

- [ ] Backend starts without errors
- [ ] Frontend loads chat UI
- [ ] Session initializes successfully
- [ ] Greeting message appears
- [ ] Blue banner "Select a service:" appears
- [ ] 2 option bubbles appear with correct icons and text
- [ ] Input field is disabled with placeholder
- [ ] Clicking option populates input field
- [ ] Input field becomes enabled after selection
- [ ] Option bubbles disappear after selection
- [ ] Ctrl+Enter sends message
- [ ] Backend validates selection
- [ ] PromptId included in socket emission
- [ ] PromptId passed to Java service
- [ ] Assistant responds appropriately

---

## Quick Verification Scripts

### Check Database Configuration
```bash
node ai-product-management/scripts/mongo/check-product-prompts.js
```

### Test Menu Service Logic
```bash
node ai-product-management/scripts/mongo/test-menu-service.js
```

### Reseed Data (if needed)
```bash
node ai-product-management/scripts/mongo/seed-product-prompts.js
```

---

## API Endpoints Reference

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/chat/session` | POST | Initialize chat session, returns menu options |
| `/api/agent/execute` | POST | Process message with promptId context |

---

## Expected Data Flow

```
User Loads Chat
    ↓
POST /api/chat/session { productId: "69728bdb..." }
    ↓
MenuService.getSessionMenu(tenantId, productId, "chat")
    ↓
Query tenant_prompt_bindings WHERE productId = ObjectId("69728bdb...")
    ↓
Fetch prompt_versions WHERE _id IN [activeProductionIds]
    ↓
Build MenuConfig with 2 options
    ↓
Return to Frontend
    ↓
Frontend Renders:
  - Greeting
  - Blue banner
  - 2 option bubbles
  - Disabled input
    ↓
User Clicks Option
    ↓
selectedPromptId = "698df6a2bb0ebaa18ee99b09"
inputMessage = "Customer Support Chat"
optionSelected = true
    ↓
User Presses Ctrl+Enter
    ↓
socket.emit('chat:send-message', {
  isMenuSelection: true,
  selectedPromptId: "698df6a2bb0ebaa18ee99b09"
})
    ↓
Backend validates selection
    ↓
assistantService.processMessage({ context: { promptId } })
    ↓
POST to Java: /agent/execute with context.promptId
    ↓
Java processes with correct prompt configuration
    ↓
Response returns to user
```

---

## Success Criteria

✅ **Database Test:** `test-menu-service.js` returns valid MenuConfig
✅ **Frontend Render:** 2 option bubbles appear in chat UI
✅ **User Interaction:** Clicking option populates input correctly
✅ **Backend Validation:** MenuService validates selection successfully
✅ **Java Integration:** PromptId passed in context to Java service

---

## Notes

- Product uses **ObjectId format** (not string)
- MenuService handles both ObjectId and string formats automatically
- All prompts are in **production state** (ready to use)
- Test data uses tenant: `tenant-default`
- Frontend gets productId from URL: `/products/:productId/configure/assistant-chat`

---

**Last Updated:** 2026-02-12
**Status:** Ready for Testing ✅

