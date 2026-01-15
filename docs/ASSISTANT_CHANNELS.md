# Assistant Channels Architecture

📑 **Table of Contents**
- [Overview](#overview)
- [MongoDB Schema](#mongodb-schema)
- [API Endpoints](#api-endpoints)
  - [GET /api/assistant-channels](#get-apiassistant-channels)
  - [PATCH /api/assistant-channels](#patch-apiassistant-channels)
  - [PATCH /api/assistant-channels/voice](#patch-apiassistant-channelsvoice)
  - [PATCH /api/assistant-channels/chat](#patch-apiassistant-channelschat)
  - [POST /api/assistant-channels/voice/toggle](#post-apiassistant-channelsvoicetoggle)
  - [POST /api/assistant-channels/chat/toggle](#post-apiassistant-channelschattoggle)
  - [GET /api/assistant-channels/by-phone/:phoneNumber](#get-apiassistant-channelsby-phonephonenumber)
- [Channel Flow](#channel-flow)
  - [Voice Channel](#voice-channel)
  - [Chat Channel](#chat-channel)
- [Benefits](#benefits)
  - [1. Clean Separation](#1-clean-separation)
  - [2. Independent Control](#2-independent-control)
  - [3. Extensibility](#3-extensibility)
  - [4. Single Source of Truth](#4-single-source-of-truth)
- [Implementation Notes](#implementation-notes)
  - [Migration from assistant_settings](#migration-from-assistant_settings)
  - [Indexes](#indexes)
  - [Default Configuration](#default-configuration)
- [Future Enhancements](#future-enhancements)
  - [SMS Channel](#sms-channel)
  - [WhatsApp Channel](#whatsapp-channel)
  - [Webhook Channel](#webhook-channel)
- [Testing](#testing)
- [UI Component](#ui-component)

---

## Overview

The `assistant_channels` collection provides a unified configuration system for multi-channel AI assistant communication. Each customer can enable/disable channels independently while sharing the same backend intelligence.

## MongoDB Schema

```javascript
{
  "_id": "chan_cust_123",
  "customerId": "cust_123",
  
  "voice": {
    "enabled": true,
    "phoneNumber": "+15551234567",
    "fallbackNumber": "+15550001111",
    "businessHours": {
      "timezone": "America/New_York",
      "monday": { "open": "09:00", "close": "17:00" },
      "tuesday": { "open": "09:00", "close": "17:00" },
      "wednesday": { "open": "09:00", "close": "17:00" },
      "thursday": { "open": "09:00", "close": "17:00" },
      "friday": { "open": "09:00", "close": "17:00" },
      "saturday": null,
      "sunday": null
    },
    "voiceSettings": {
      "language": "en-US",
      "voiceId": "en-US-Neural2-F",
      "speechRate": 1.0,
      "pitch": 0.0
    }
  },
  
  "chat": {
    "enabled": true,
    "greeting": "Hi, how can I help you today?",
    "typingIndicator": true,
    "maxTurns": 20,
    "showIntent": false,
    "allowFileUpload": false
  },
  
  "sms": {
    "enabled": false,
    "phoneNumber": "+15551234567",
    "autoReply": true
  },
  
  "whatsapp": {
    "enabled": false,
    "businessAccountId": "123456789",
    "phoneNumberId": "987654321"
  },
  
  "createdAt": ISODate("2026-01-13T..."),
  "updatedAt": ISODate("2026-01-13T...")
}
```

## API Endpoints

### GET /api/assistant-channels
Get channel configuration for authenticated customer.
- **Auth**: Required (JWT)
- **Response**: Complete channel configuration or creates default if none exists

### PATCH /api/assistant-channels
Update entire channel configuration.
- **Auth**: Required (JWT)
- **Body**: `{ voice?, chat?, sms?, whatsapp? }`

### PATCH /api/assistant-channels/voice
Update voice channel only.
- **Auth**: Required (JWT)
- **Body**: Complete voice configuration object

### PATCH /api/assistant-channels/chat
Update chat channel only.
- **Auth**: Required (JWT)
- **Body**: Complete chat configuration object

### POST /api/assistant-channels/voice/toggle
Toggle voice channel on/off.
- **Auth**: Required (JWT)
- **Body**: `{ enabled: boolean }`

### POST /api/assistant-channels/chat/toggle
Toggle chat channel on/off.
- **Auth**: Required (JWT)
- **Body**: `{ enabled: boolean }`

### GET /api/assistant-channels/by-phone/:phoneNumber
Lookup channel by phone number (for incoming calls).
- **Auth**: Not required (used by Twilio webhooks)
- **Response**: Channel configuration if voice.enabled === true

## Channel Flow

### Voice Channel
```
Twilio Incoming Call
  → POST /voice/incoming
    → Lookup assistant_channels by phoneNumber
    → Check voice.enabled === true
    → Check business hours
    → Create assistant_calls log
    → Forward to Java VA service
```

### Chat Channel
```
React UI
  → POST /api/chat/session (authenticated)
    → Lookup assistant_channels by customerId
    → Check chat.enabled === true
    → Forward to Java VA service
    → Return sessionId + chatConfig
```

## Benefits

### 1. Clean Separation
- Each channel has its own configuration namespace
- No mixing of voice/chat settings
- Easy to understand what each channel needs

### 2. Independent Control
- Toggle channels on/off without affecting others
- Different business hours per channel (if needed)
- Channel-specific settings (e.g., typing indicators for chat, voice selection for voice)

### 3. Extensibility
- Add new channels (SMS, WhatsApp, Webhooks) easily
- No schema migration needed - just add new channel object
- Each channel can have unique configuration fields

### 4. Single Source of Truth
- One document per customer
- Atomic updates with MongoDB transactions
- Easy to query and index

## Implementation Notes

### Migration from `assistant_settings`
If you have existing `assistant_settings` documents, migrate them:

```javascript
// Migration script
const settings = await db.collection('assistant_settings').findOne({ customerId });

const channels = {
  customerId: settings.customerId,
  voice: {
    enabled: settings.phoneEnabled,
    phoneNumber: settings.phoneNumber,
    fallbackNumber: settings.fallbackNumber,
    businessHours: settings.businessHours,
    voiceSettings: settings.voice
  },
  chat: {
    enabled: true,
    greeting: "Hi! How can I help you today?",
    typingIndicator: true,
    maxTurns: 20
  },
  createdAt: new Date(),
  updatedAt: new Date()
};

await db.collection('assistant_channels').insertOne(channels);
```

### Indexes
```javascript
// Unique index on customerId
db.assistant_channels.createIndex({ customerId: 1 }, { unique: true });

// Index for phone lookup (sparse because not all customers have voice)
db.assistant_channels.createIndex({ 'voice.phoneNumber': 1 }, { sparse: true });
```

### Default Configuration
When a customer first accesses channels, create default configuration:
- Voice: disabled by default (requires phone number setup)
- Chat: enabled by default (no setup required)
- SMS/WhatsApp: disabled (future features)

## Future Enhancements

### SMS Channel
```javascript
"sms": {
  "enabled": true,
  "phoneNumber": "+15551234567",
  "autoReply": true,
  "maxMessageLength": 160,
  "rateLimit": {
    "messagesPerHour": 100
  }
}
```

### WhatsApp Channel
```javascript
"whatsapp": {
  "enabled": true,
  "businessAccountId": "123456789",
  "phoneNumberId": "987654321",
  "templateMessages": ["welcome", "support", "order_update"],
  "richMedia": true
}
```

### Webhook Channel
```javascript
"webhook": {
  "enabled": true,
  "url": "https://customer.com/webhook",
  "secret": "...",
  "events": ["message", "session_start", "session_end"]
}
```

## Testing

Run the sample data script:
```bash
node scripts/create-assistant-channels.js
```

Test the API:
```bash
# Get channels (requires auth token)
curl -H "Authorization: Bearer YOUR_TOKEN" \
  http://localhost:5000/api/assistant-channels

# Toggle voice channel
curl -X POST \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"enabled": true}' \
  http://localhost:5000/api/assistant-channels/voice/toggle

# Lookup by phone (no auth)
curl http://localhost:5000/api/assistant-channels/by-phone/+15551234567
```

## UI Component

The React component `AssistantChannels.tsx` provides:
- Visual toggle switches for each channel
- Status badges (enabled/disabled)
- Configuration display
- Real-time updates
- Error handling
- Coming soon indicators for future channels
