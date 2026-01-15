# Assistant Channels - Visual Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                      CUSTOMER CONFIGURATION                          │
│                    (assistant_channels collection)                   │
└─────────────────────────────────────────────────────────────────────┘
                                  │
                    ┌─────────────┴─────────────┐
                    │                           │
         ┌──────────▼──────────┐    ┌──────────▼──────────┐
         │   VOICE CHANNEL     │    │   CHAT CHANNEL      │
         │   enabled: true     │    │   enabled: true     │
         │   phoneNumber       │    │   greeting          │
         │   businessHours     │    │   typingIndicator   │
         │   voiceSettings     │    │   maxTurns          │
         └──────────┬──────────┘    └──────────┬──────────┘
                    │                           │
         ┌──────────▼──────────┐    ┌──────────▼──────────┐
         │  VOICE FLOW         │    │  CHAT FLOW          │
         │                     │    │                     │
         │  Twilio Webhook     │    │  React UI           │
         │       ↓             │    │       ↓             │
         │  Node.js Voice      │    │  Node.js Chat       │
         │  Routes             │    │  Routes (Auth)      │
         │       ↓             │    │       ↓             │
         │  /voice/incoming    │    │  /chat/session      │
         │  /voice/stream      │    │  /chat/message      │
         │  /voice/end         │    │  /chat/end          │
         └──────────┬──────────┘    └──────────┬──────────┘
                    │                           │
                    └─────────────┬─────────────┘
                                  │
                    ┌─────────────▼─────────────┐
                    │   JAVA VA SERVICE         │
                    │   (Shared Intelligence)   │
                    │                           │
                    │  • VoiceSessionService    │
                    │  • ChatSessionService     │
                    │                           │
                    │  Shared Components:       │
                    │  • DialogManager          │
                    │  • LlmService             │
                    │  • SessionState           │
                    │  • UsageService           │
                    └───────────────────────────┘
                                  │
                    ┌─────────────┴─────────────┐
                    │                           │
         ┌──────────▼──────────┐    ┌──────────▼──────────┐
         │   VOICE PIPELINE    │    │   CHAT PIPELINE     │
         │                     │    │                     │
         │   Audio (base64)    │    │   Text              │
         │       ↓             │    │       ↓             │
         │   STT Service       │    │   (skip STT)        │
         │       ↓             │    │                     │
         │   Dialog Manager    │    │   Dialog Manager    │
         │   (intent + slots)  │    │   (intent + slots)  │
         │       ↓             │    │       ↓             │
         │   LLM Service       │    │   LLM Service       │
         │       ↓             │    │       ↓             │
         │   TTS Service       │    │   (skip TTS)        │
         │       ↓             │    │       ↓             │
         │   Audio (base64)    │    │   Text              │
         └─────────────────────┘    └─────────────────────┘


┌─────────────────────────────────────────────────────────────────────┐
│                      FUTURE CHANNELS                                 │
│                                                                      │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐             │
│  │ SMS CHANNEL  │  │   WHATSAPP   │  │   WEBHOOKS   │             │
│  │ enabled: TBD │  │ enabled: TBD │  │ enabled: TBD │             │
│  └──────────────┘  └──────────────┘  └──────────────┘             │
│                                                                      │
│  All share the same DialogManager, LLM, SessionState                │
└─────────────────────────────────────────────────────────────────────┘


KEY FEATURES:

✅ Independent Channel Control
   • Toggle voice/chat separately
   • Different business hours per channel
   • Channel-specific settings

✅ Shared Intelligence
   • Same intent detection across all channels
   • Same slot extraction logic
   • Same LLM prompts and responses
   • Consistent assistant personality

✅ Optimized Resource Usage
   • Voice: STT + LLM + TTS costs tracked
   • Chat: Only LLM costs tracked (no audio processing)
   • Usage metrics tailored per channel

✅ Scalable Architecture
   • Add new channels without schema migration
   • Single MongoDB document per customer
   • Easy to query and maintain


CHANNEL TOGGLE EXAMPLES:

Scenario 1: Chat Only (Common for Web Apps)
{
  "voice": { "enabled": false },
  "chat": { "enabled": true }
}
→ Only web chat works, no phone number needed

Scenario 2: Voice Only (Call Centers)
{
  "voice": { "enabled": true, "phoneNumber": "+15551234567" },
  "chat": { "enabled": false }
}
→ Only phone calls work, no web chat

Scenario 3: Full Multi-Channel (Enterprise)
{
  "voice": { "enabled": true },
  "chat": { "enabled": true },
  "sms": { "enabled": true },
  "whatsapp": { "enabled": true }
}
→ All channels active, customers choose preferred method
```

## API Flow Diagram

```
VOICE CHANNEL:
┌─────────┐    ┌──────────┐    ┌──────────┐    ┌──────────┐
│ Twilio  │───▶│ Node.js  │───▶│  Check   │───▶│  Java    │
│ Webhook │    │ /voice/  │    │ voice.   │    │    VA    │
│         │    │ incoming │    │ enabled  │    │ Service  │
└─────────┘    └──────────┘    └──────────┘    └──────────┘
                     │                                │
                     ▼                                ▼
              MongoDB Lookup:                  STT → LLM → TTS
              assistant_channels               Record usage
              by phoneNumber                   Return audio


CHAT CHANNEL:
┌─────────┐    ┌──────────┐    ┌──────────┐    ┌──────────┐
│ React   │───▶│ Node.js  │───▶│  Check   │───▶│  Java    │
│   UI    │    │ /chat/   │    │ chat.    │    │    VA    │
│ (Auth)  │    │ session  │    │ enabled  │    │ Service  │
└─────────┘    └──────────┘    └──────────┘    └──────────┘
                     │                                │
                     ▼                                ▼
              MongoDB Lookup:                  Text → LLM
              assistant_channels               Record usage
              by customerId                    Return text
              + Return chatConfig
```

## Database Structure

```javascript
assistant_channels (Collection)
├─ Index: customerId (unique)
├─ Index: voice.phoneNumber (sparse)
│
└─ Document Structure:
   {
     "_id": "chan_cust_123",
     "customerId": "cust_123",          // Link to customer
     
     "voice": {                          // Voice channel config
       "enabled": boolean,
       "phoneNumber": string,
       "fallbackNumber": string,
       "businessHours": object,
       "voiceSettings": {
         "language": string,
         "voiceId": string,
         "speechRate": number
       }
     },
     
     "chat": {                           // Chat channel config
       "enabled": boolean,
       "greeting": string,
       "typingIndicator": boolean,
       "maxTurns": number,
       "showIntent": boolean
     },
     
     "sms": { ... },                     // Future
     "whatsapp": { ... },                // Future
     
     "createdAt": ISODate,
     "updatedAt": ISODate
   }
```
