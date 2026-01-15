# MongoDB Changes Summary - Assistant Channels

## What Changed

### New Collection: `assistant_channels`
Replaces the fragmented approach with a unified multi-channel configuration system.

**Key Benefits:**
- ✅ Clean separation of voice and chat settings
- ✅ Toggle channels independently ON/OFF
- ✅ Extensible for future channels (SMS, WhatsApp, Webhooks)
- ✅ Single source of truth per customer
- ✅ Easy to query and maintain

## Schema Structure

```javascript
{
  "_id": "chan_cust_123",
  "customerId": "cust_123",
  
  // Voice Channel (Telephony)
  "voice": {
    "enabled": true,
    "phoneNumber": "+15551234567",
    "fallbackNumber": "+15550001111",
    "businessHours": { ... },
    "voiceSettings": {
      "language": "en-US",
      "voiceId": "female_1"
    }
  },
  
  // Chat Channel (Web/Mobile UI)
  "chat": {
    "enabled": true,
    "greeting": "Hi, how can I help you today?",
    "typingIndicator": true,
    "maxTurns": 20
  },
  
  // Future: SMS Channel
  "sms": { "enabled": false },
  
  // Future: WhatsApp Channel
  "whatsapp": { "enabled": false }
}
```

## Files Created

### Backend (Node.js)
1. **`backend-node/src/types/assistant-channels.types.ts`**
   - TypeScript interfaces for all channel configurations
   - Default configurations for each channel
   - Enums and type definitions

2. **`backend-node/src/routes/assistant-channels-routes.ts`**
   - GET `/api/assistant-channels` - Get customer's channel config
   - PATCH `/api/assistant-channels` - Update all channels
   - PATCH `/api/assistant-channels/voice` - Update voice only
   - PATCH `/api/assistant-channels/chat` - Update chat only
   - POST `/api/assistant-channels/voice/toggle` - Toggle voice on/off
   - POST `/api/assistant-channels/chat/toggle` - Toggle chat on/off
   - GET `/api/assistant-channels/by-phone/:phoneNumber` - Lookup by phone

3. **`backend-node/scripts/create-assistant-channels.js`**
   - Sample data generator
   - Creates indexes on `customerId` and `voice.phoneNumber`
   - Includes dev_tenant and demo_customer examples

### Frontend (React)
4. **`frontend/src/pages/AssistantChannels.tsx`**
   - Beautiful UI for channel management
   - Toggle switches for each channel
   - Configuration display
   - Status badges
   - Coming soon indicators for SMS/WhatsApp

### Documentation
5. **`docs/ASSISTANT_CHANNELS.md`**
   - Complete architecture documentation
   - API reference
   - Migration guide from `assistant_settings`
   - Testing instructions
   - Future enhancement plans

## Files Modified

### Backend Routes
1. **`backend-node/src/routes/voice-routes.ts`**
   - Changed from `assistant_settings` to `assistant_channels`
   - Lookup by `voice.phoneNumber` and `voice.enabled`
   - Uses `voiceConfig` instead of `settings`

2. **`backend-node/src/routes/chat-routes.ts`**
   - Added channel enablement check
   - Returns `chatConfig` with greeting, typing indicator, etc.
   - Validates `chat.enabled === true` before allowing session

3. **`backend-node/src/index.ts`**
   - Registered `/api/assistant-channels` routes

## How to Use

### 1. Run the Setup Script
```bash
cd backend-node
node scripts/create-assistant-channels.js
```

This creates:
- Sample channel configurations
- MongoDB indexes
- Test data for `dev_tenant`

### 2. API Usage

**Get Channels:**
```bash
curl -H "Authorization: Bearer YOUR_TOKEN" \
  http://localhost:5000/api/assistant-channels
```

**Toggle Voice Channel:**
```bash
curl -X POST \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"enabled": true}' \
  http://localhost:5000/api/assistant-channels/voice/toggle
```

**Toggle Chat Channel:**
```bash
curl -X POST \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"enabled": false}' \
  http://localhost:5000/api/assistant-channels/chat/toggle
```

**Lookup by Phone (for Twilio webhooks):**
```bash
curl http://localhost:5000/api/assistant-channels/by-phone/+15551234567
```

### 3. Frontend Integration

Add route to your React app:
```typescript
import AssistantChannels from './pages/AssistantChannels';

// In your router
<Route path="/assistant-channels" element={<AssistantChannels />} />
```

## Migration from `assistant_settings`

If you have existing `assistant_settings` documents:

```javascript
const { MongoClient } = require('mongodb');

async function migrate() {
  const client = new MongoClient('mongodb://localhost:27017');
  await client.connect();
  const db = client.db('ai-services');
  
  const settings = await db.collection('assistant_settings').find().toArray();
  
  for (const setting of settings) {
    const channels = {
      customerId: setting.customerId,
      voice: {
        enabled: setting.phoneEnabled || false,
        phoneNumber: setting.phoneNumber,
        fallbackNumber: setting.fallbackNumber,
        businessHours: setting.businessHours,
        voiceSettings: setting.voice
      },
      chat: {
        enabled: true,
        greeting: "Hi! How can I help you today?",
        typingIndicator: true,
        maxTurns: 20,
        showIntent: false
      },
      sms: { enabled: false },
      whatsapp: { enabled: false },
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    await db.collection('assistant_channels').insertOne(channels);
  }
  
  console.log(`Migrated ${settings.length} customers`);
  await client.close();
}

migrate();
```

## Database Indexes

The script automatically creates these indexes:

```javascript
// Unique index on customerId (one config per customer)
db.assistant_channels.createIndex({ customerId: 1 }, { unique: true });

// Sparse index on voice.phoneNumber (for incoming call lookup)
db.assistant_channels.createIndex({ 'voice.phoneNumber': 1 }, { sparse: true });
```

## Architecture Highlights

### Channel Independence
Each channel operates independently:
- **Voice disabled, Chat enabled** → Only web chat works
- **Voice enabled, Chat disabled** → Only phone calls work
- **Both enabled** → Full multi-channel assistant

### Shared Backend Logic
Both channels use the same:
- DialogManager (intent detection, slot extraction)
- LlmService (response generation)
- SessionState (conversation history)
- UsageService (metrics tracking)

Only difference: Voice uses STT/TTS, Chat is text-only.

### Future Extensibility
Adding new channels is trivial:

```javascript
// Add SMS channel
"sms": {
  "enabled": true,
  "phoneNumber": "+15551234567",
  "autoReply": true,
  "maxMessageLength": 160
}

// Add WhatsApp channel
"whatsapp": {
  "enabled": true,
  "businessAccountId": "123456789",
  "phoneNumberId": "987654321",
  "richMedia": true
}

// Add Webhook channel
"webhook": {
  "enabled": true,
  "url": "https://customer.com/webhook",
  "secret": "webhook_secret_key",
  "events": ["message", "session_start", "session_end"]
}
```

## Testing Checklist

- [ ] Run `create-assistant-channels.js` script
- [ ] Verify indexes created in MongoDB
- [ ] GET `/api/assistant-channels` (with auth)
- [ ] POST voice/chat toggle endpoints
- [ ] Test voice channel: Incoming call → Check `voice.enabled`
- [ ] Test chat channel: Session start → Check `chat.enabled`
- [ ] View AssistantChannels UI in React
- [ ] Toggle switches in UI
- [ ] Verify status badges update

## Summary

This minimal but powerful change provides:
- 🎯 **Single collection** for all channel configs
- 🔄 **Independent toggles** for each channel
- 📈 **Extensibility** for future channels
- 🛡️ **Type safety** with TypeScript interfaces
- 🎨 **Beautiful UI** for channel management
- 📚 **Complete documentation**

The architecture is production-ready and scalable to support SMS, WhatsApp, webhooks, and any future communication channels!
