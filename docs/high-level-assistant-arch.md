                   ┌─────────────────────────────────────────┐
                   │            Customer & Operators         │
                   │  - Admins / Analysts / Developers       │
                   └─────────────────┬───────────────────────┘
                                     │  (HTTPS, browser)
                                     │
                          React Frontend (Admin Portal)
                                     │
                                     ▼
                   ┌─────────────────────────────────────────┐
                   │           Node.js Backend API           │
                   │  - Auth & Tenant Resolution             │
                   │  - Assistant Settings API               │
                   │  - Call Logs & Usage API                │
                   └─────────────────┬───────────────────────┘
                                     │
                                     │ (CRUD assistant config)
                                     ▼
                            MongoDB (Core Data)
                                     │
      ───────────────────────────────┼────────────────────────────────────
                                     │
                          Assistant Settings Example
                          {
                            customerId: "cust_123",
                            assistant: {
                              phoneEnabled: true,
                              phoneNumber: "+15551234567",
                              fallbackNumber: "+15550001111",
                              businessHours: { ... },
                              language: "en-US"
                            }
                          }
      ───────────────────────────────┼────────────────────────────────────
                                     │
                                     │
                 ┌───────────────────┴───────────────────┐
                 │                                       │
       Admin Control & UX                       Voice Call Flow
                 │                                       │
                 ▼                                       ▼
   (Turn ON/OFF, configure)                 Incoming Call from Caller
                                                  │
                                                  ▼
                               ┌─────────────────────────────────┐
                               │       Telephony Provider        │
                               │   (Twilio / Plivo / SIP PBX)    │
                               └───────────────┬─────────────────┘
                                               │  (Webhook to Node)
                                               ▼
                               ┌─────────────────────────────────┐
                               │     Node.js Voice Webhook       │
                               │ - Identify customer by number   │
                               │ - Check phoneEnabled flag       │
                               │ - Decide: Assistant vs Fallback │
                               └───────────────┬─────────────────┘
                                               │
                     Assistant ON              │         Assistant OFF
                      (phoneEnabled=true)      │         or outside hours
                                               │
                             ┌─────────────────┴───────────────┐
                             │                                 │
                             ▼                                 ▼
          ┌─────────────────────────────────┐        ┌───────────────────────┐
          │  Java Voice/VA Service          │        │ Telephony Provider    │
          │  - STT + LLM + TTS Orchestration│        │ - Forward to fallback │
          │  - Dialog & intent handling     │        │   phoneNumber         │
          │  - Billing usage events         │        │ - Or play message     │
          └─────────────────┬───────────────┘        └───────────────────────┘
                            │
                            │ (Text/audio payloads)
                            ▼
          ┌────────────────────────────────────────────────────────┐
          │   External AI / Speech Services (managed APIs)         │
          │  - Speech-to-Text (STT)                                │
          │  - Large Language Model (LLM)                          │
          │  - Text-to-Speech (TTS)                                │
          └─────────────────┬──────────────────────────────────────┘
                            │
                            │ (Responses, transcripts, usage data)
                            ▼
          ┌────────────────────────────────────────────────────────┐
          │          Node + MongoDB (Logging & Billing)           │
          │  - Store call logs & transcripts                      │
          │  - Update subscriptions.usage                         │
          │  - Emit usage_events (optional)                       │
          └────────────────────────────────────────────────────────┘



          Key components and responsibilities
1. React frontend (Admin Portal)
- Controls:
- Toggle: Phone Assistant ON/OFF
- Configure: phone number, fallback number, business hours
- View: call logs, transcripts, usage metrics
- APIs used:
- GET /assistant/settings
- PATCH /assistant/settings
- GET /assistant/calls
- GET /assistant/usage
2. Node.js backend
- Voice webhook handler:
- Receives telephony webhooks (incoming call, speech events)
- Resolves customerId by dialed number
- Loads assistant.phoneEnabled, businessHours, fallbackNumber from MongoDB
- Routes:
- If ON and in-hours → Java VA service
- Else → return instructions to provider (e.g., forward to fallback or play message)
- Control & configuration API:
- CRUD for assistant configuration
- Exposes call logs & usage to frontend
- Billing/usage logic:
- On each call/interaction, update:
- subscriptions.usage.conversations
- Optional write to usage_events
3. Java voice/VA service
- Call orchestration:
- Receives events (utterances) from Node
- Calls STT to convert audio → text
- Calls LLM with conversation context
- Calls TTS to convert text → audio
- Returns response payload(s) to Node
- Dialog management:
- Tracks session state (intent, slots, progress)
- Implements domain logic (appointment handling, FAQ, routing)
- Usage signals:
- Emits usage metrics per turn or per call (e.g., tokens, duration)
4. Telephony provider
- Responsibilities:
- Receive incoming PSTN/mobile calls
- Call your Node webhook (per IVR step/stream)
- Play TTS audio or stream audio between caller and your service
- Optionally forward calls to fallback destinations
This is where Twilio/Plivo/SIP lives; Node is the logic brain.
5. MongoDB
- Collections:
- customers → includes assistant settings
- subscriptions → tracks usage and billing linkage
- assistant_calls → logs per call (customerId, number, duration, outcome)
- usage_events (optional) → fine-grained events

How ON/OFF control appears in the architecture
- Setting location:
- Stored under customers.assistant.phoneEnabled (or a dedicated assistant_settings collection).
- Flow:
- Admin toggles ON/OFF in React.
- React calls Node (PATCH /assistant/settings).
- Node updates MongoDB.
- On next call, telephony → Node webhook:
- Node checks the flag and either:
- Sends call to Java VA service, or
- Returns XML/JSON to telephony to forward to fallback or play a message.
The toggle doesn’t require any telephony reconfiguration—only your logic changes.

If you’d like next, I can:
- Extract this into a Word-ready architecture section for your business plan.
- Design the MongoDB schema specifically for assistant_settings and assistant_calls.
- Draft the Node webhook handler pseudo-code and endpoints.
