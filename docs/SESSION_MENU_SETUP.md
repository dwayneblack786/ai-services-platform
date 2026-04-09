# Session Menu Setup Guide

## Overview
This guide shows how to configure session option menus for chat and voice assistants.

---

## Database Configuration

### Add menuConfig to assistant_channels

To enable option bubbles in the chat UI, add a `menuConfig` field to your `assistant_channels` document:

```javascript
// MongoDB Shell or Compass
db.assistant_channels.updateOne(
  {
    customerId: "tenant-default",  // Your tenant ID
    productId: "va-service"         // Your product ID
  },
  {
    $set: {
      menuConfig: {
        enabled: true,
        promptText: "How can we help you today?",
        allowFreeText: false,  // Set to true to allow typing after seeing options
        options: [
          {
            id: "sales",
            text: "Sales Inquiry",
            value: "sales",
            icon: "💰",
            dtmfKey: "1"
          },
          {
            id: "support",
            text: "Technical Support",
            value: "support",
            icon: "🛠️",
            dtmfKey: "2"
          },
          {
            id: "billing",
            text: "Billing Question",
            value: "billing",
            icon: "💳",
            dtmfKey: "3"
          },
          {
            id: "general",
            text: "General Question",
            value: "general",
            icon: "💬",
            dtmfKey: "9"
          }
        ]
      }
    }
  }
);
```

---

## Field Descriptions

### menuConfig Object

| Field | Type | Description |
|-------|------|-------------|
| `enabled` | Boolean | Whether menu is active |
| `promptText` | String | Text shown above options ("How can we help you today?") |
| `allowFreeText` | Boolean | If false, user must select option. If true, can type freely |
| `options` | Array | List of menu options |

### Option Object

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `id` | String | Yes | Unique identifier |
| `text` | String | Yes | Display text shown to user |
| `value` | String | Yes | Intent value sent to backend |
| `icon` | String | No | Emoji or icon (e.g., "💰", "🛠️") |
| `dtmfKey` | String | No | Phone keypad number for voice ("1", "2", "3") |
| `requiresInput` | Boolean | No | If true, prompts for additional input after selection |

---

## Testing

### 1. Insert menuConfig

Run the MongoDB command above with your actual `customerId` and `productId`.

### 2. Reload Chat

1. Navigate to Assistant Chat page
2. Click "New Chat" to start fresh session
3. You should see:
   - Greeting message
   - Blue banner: "How can we help you today?"
   - Option bubbles (Sales, Support, Billing, General)
   - Disabled input field

### 3. Click an Option

1. Click "Technical Support" bubble
2. Text loads into input: "Technical Support"
3. Bubbles disappear
4. Input becomes enabled
5. Press Ctrl+Enter or click Send

---

## Example Configuration for Different Business Types

### Healthcare
```javascript
menuConfig: {
  enabled: true,
  promptText: "What brings you here today?",
  allowFreeText: false,
  options: [
    { id: "appointment", text: "Schedule Appointment", value: "appointment", icon: "📅", dtmfKey: "1" },
    { id: "prescription", text: "Prescription Refill", value: "prescription", icon: "💊", dtmfKey: "2" },
    { id: "results", text: "Test Results", value: "results", icon: "🔬", dtmfKey: "3" },
    { id: "billing", text: "Billing Question", value: "billing", icon: "💳", dtmfKey: "4" }
  ]
}
```

### E-Commerce
```javascript
menuConfig: {
  enabled: true,
  promptText: "How can we assist you?",
  allowFreeText: false,
  options: [
    { id: "order", text: "Track My Order", value: "order_status", icon: "📦", dtmfKey: "1" },
    { id: "return", text: "Return/Exchange", value: "returns", icon: "↩️", dtmfKey: "2" },
    { id: "product", text: "Product Question", value: "product_inquiry", icon: "❓", dtmfKey: "3" },
    { id: "support", text: "Customer Support", value: "support", icon: "💬", dtmfKey: "9" }
  ]
}
```

### Financial Services
```javascript
menuConfig: {
  enabled: true,
  promptText: "Select a service:",
  allowFreeText: false,
  options: [
    { id: "balance", text: "Check Balance", value: "account_balance", icon: "💵", dtmfKey: "1" },
    { id: "transfer", text: "Transfer Funds", value: "transfer", icon: "💸", dtmfKey: "2" },
    { id: "loan", text: "Loan Information", value: "loan_inquiry", icon: "🏦", dtmfKey: "3" },
    { id: "fraud", text: "Report Fraud", value: "fraud_report", icon: "🚨", dtmfKey: "0" }
  ]
}
```

---

## Troubleshooting

### Options Not Showing

1. **Check Database**: Verify `menuConfig` exists and `enabled: true`
   ```javascript
   db.assistant_channels.findOne({ customerId: "your-tenant-id" })
   ```

2. **Check Console**: Open browser DevTools → Console tab
   - Look for `[Chat Session]` logs
   - Should see: "Created session: xxx"

3. **Check Network**: DevTools → Network tab
   - Find `POST /api/chat/session`
   - Response should include `options` array

### Input Still Enabled

- This means `menuConfig` was not returned
- Check that `customerId` and `productId` match exactly
- MenuService queries: `{ customerId, productId, 'chat.enabled': true }`

### Options Show But Don't Work

- Check browser console for JavaScript errors
- Verify `handleOptionSelect` function is defined
- Check that `optionSelected` state updates

---

## API Response Example

When configured correctly, `/api/chat/session` returns:

```json
{
  "sessionId": "3818da5d-...",
  "chatConfig": {
    "greeting": "Hello! I'm ready to assist you...",
    "typingIndicator": true,
    "maxTurns": 20,
    "showIntent": false
  },
  "options": [
    {
      "id": "sales",
      "text": "Sales Inquiry",
      "value": "sales",
      "icon": "💰",
      "dtmfKey": "1"
    }
  ],
  "promptText": "How can we help you today?",
  "status": "initialized"
}
```

---

## Next Steps

1. Configure `menuConfig` in MongoDB
2. Test in chat UI
3. Configure voice session init (Phase 3)
4. Add DTMF support for phone calls (Phase 4)
5. Create admin UI to manage options (Phase 5)
