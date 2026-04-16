# Prompt Persistence Fix

## Issue

After a user selected a prompt from the menu, the `selectedPromptId` was being cleared after the first message. This meant that subsequent user inputs in the same session would not use the selected prompt's configuration.

## Root Cause

**File**: [AssistantChat.tsx](../ai-product-management/frontend/src/components/AssistantChat.tsx)

**Line 494** (before fix):
```typescript
// Clear the selected prompt ID after sending
setSelectedPromptId(null);
```

This cleared the prompt ID after every message, so only the first message used the selected prompt.

## Solution

The `selectedPromptId` should **persist throughout the entire session** after being selected, so that all subsequent user messages use the same prompt configuration.

### Changes Made

1. **Keep `selectedPromptId` for the entire session**:
   - Removed the line that cleared `selectedPromptId` after sending
   - Now `selectedPromptId` persists until a new session is started

2. **Clear `optionSelected` flag instead**:
   - The `optionSelected` flag is used to hide menu options after selection
   - This flag is cleared after the first message
   - But `selectedPromptId` remains set for subsequent messages

3. **Add `promptId` to REST API context**:
   - Updated `/api/agent/execute` call to include `promptId` in context
   - Ensures REST fallback also uses the selected prompt

### Code Changes

**Before**:
```typescript
socket.emit('chat:send-message', {
  sessionId,
  message: messageToSend,
  isMenuSelection: !!selectedPromptId,
  selectedPromptId: selectedPromptId || undefined
});

// Clear the selected prompt ID after sending
setSelectedPromptId(null);
```

**After**:
```typescript
socket.emit('chat:send-message', {
  sessionId,
  message: messageToSend,
  isMenuSelection: optionSelected && !!selectedPromptId, // Only flag first message
  selectedPromptId: selectedPromptId || undefined
});

// Clear the optionSelected flag after first message, but keep selectedPromptId
if (optionSelected) {
  setOptionSelected(false);
}
```

**REST API Context**:
```typescript
context: {
  productId: productId || 'va-service',
  promptId: selectedPromptId || undefined  // ← Added
}
```

## Data Flow

```
User selects prompt → selectedPromptId set
                   ↓
User types message 1 → Send with selectedPromptId ✅
                   ↓
optionSelected cleared (hides menu options)
selectedPromptId KEPT ✅
                   ↓
User types message 2 → Send with SAME selectedPromptId ✅
                   ↓
User types message 3 → Send with SAME selectedPromptId ✅
                   ↓
... continues for entire session ...
```

## Backend Flow (Already Working)

The backend already correctly handles `promptId`:

1. **WebSocket** (`chat-socket.ts` line 133):
   ```typescript
   context: {
     promptId // Pass to assistant service
   }
   ```

2. **AssistantService** (`assistant-service.ts` line 85):
   ```typescript
   context: {
     promptId: params.context?.promptId // Pass to Java
   }
   ```

3. **Java Service** (`AssistantAgent.java`):
   - Receives `promptId` in context
   - Loads full prompt configuration from database
   - Uses custom system prompt for LLM

## Verification

To test this fix:

1. Start a chat session
2. Select a prompt from the menu (e.g., "Customer Support Chat")
3. **First message**: "Hello" → Should use selected prompt ✅
4. **Second message**: "I need help" → Should STILL use selected prompt ✅
5. **Third message**: "What are your hours?" → Should STILL use selected prompt ✅

All messages in the session should use the same prompt configuration.

## Files Modified

- [ai-product-management/frontend/src/components/AssistantChat.tsx](../ai-product-management/frontend/src/components/AssistantChat.tsx)
  - Line ~494: Changed from clearing `selectedPromptId` to clearing `optionSelected`
  - Line ~508: Added `promptId` to REST API context

