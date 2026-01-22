# VoIP Provider Configuration

> 📘 **See Also:** [Voice Endpoints Architecture](VOICE_ENDPOINTS_ARCHITECTURE.md) - Complete comparison of UI voice vs VoIP voice workflows with webhook examples for all providers.

## Supported Providers

Your platform now supports multiple VoIP providers through the adapter pattern:

### ✅ Twilio
**Webhook URL:** `https://your-domain.com/api/voice/incoming`

> 💡 **Provider parameter is optional** - the system auto-detects Twilio from webhook format. See [Voice Endpoints Architecture](VOICE_ENDPOINTS_ARCHITECTURE.md#twilio-configuration) for complete webhook examples and response formats.

**Environment Variables:**
```env
TWILIO_ACCOUNT_SID=your_account_sid
TWILIO_AUTH_TOKEN=your_auth_token
TWILIO_PHONE_NUMBER=+15551234567
```

**Configuration Steps:**
1. Log in to Twilio Console
2. Navigate to Phone Numbers → Active Numbers
3. Select your number
4. Set "A Call Comes In" webhook to your URL
5. Method: HTTP POST
6. Format: TwiML

---

### ✅ Vonage (Nexmo)
**Webhook URL:** `https://your-domain.com/api/voice/incoming`

> 💡 **Provider parameter is optional** - the system auto-detects Vonage from webhook format. See [Voice Endpoints Architecture](VOICE_ENDPOINTS_ARCHITECTURE.md#vonage-configuration) for complete webhook examples and response formats.

**Environment Variables:**
```env
VONAGE_API_KEY=your_api_key
VONAGE_API_SECRET=your_api_secret
VONAGE_APPLICATION_ID=your_app_id
VONAGE_PRIVATE_KEY_PATH=/path/to/private.key
```

**Configuration Steps:**
1. Log in to Vonage Dashboard
2. Create a Voice Application
3. Set Answer URL to your webhook
4. Set Event URL for call status updates
5. Link phone number to application
6. Format: JSON (NCCO)

---

### ✅ Bandwidth
**Webhook URL:** `https://your-domain.com/api/voice/incoming`

> 💡 **Provider parameter is optional** - the system auto-detects Bandwidth from webhook format. See [Voice Endpoints Architecture](VOICE_ENDPOINTS_ARCHITECTURE.md#bandwidth-configuration) for complete webhook examples and response formats.

**Environment Variables:**
```env
BANDWIDTH_ACCOUNT_ID=your_account_id
BANDWIDTH_API_USER=your_api_user
BANDWIDTH_API_PASSWORD=your_api_password
BANDWIDTH_APPLICATION_ID=your_app_id
```

**Configuration Steps:**
1. Log in to Bandwidth Dashboard
2. Create a Voice Application
3. Set Inbound Callback URL to your webhook
4. Associate phone number with application
5. Format: BXML (XML)

---

## Auto-Detection

The platform can **auto-detect** the provider from webhook signatures:

```bash
# No need to specify provider - auto-detected
curl -X POST https://your-domain.com/api/voice/incoming \
  -H "Content-Type: application/json" \
  -d '{"CallSid": "CA123...", "From": "+1555...", "To": "+1555..."}'
```

Detection logic:
- **Twilio:** Looks for `CallSid`, `AccountSid`, or `x-twilio-signature` header
- **Vonage:** Looks for `uuid`, `conversation_uuid`, or `Authorization: Bearer` header
- **Bandwidth:** Looks for `callId` + `applicationId` fields

---

## Security

### Webhook Signature Validation

Each adapter validates incoming webhooks:

**Twilio:** SHA1 HMAC signature
```typescript
validateWebhook(requestBody, headers, process.env.TWILIO_AUTH_TOKEN)
```

**Vonage:** JWT token verification
```typescript
validateWebhook(requestBody, headers, process.env.VONAGE_SIGNATURE_SECRET)
```

**Bandwidth:** User-Agent validation + IP whitelist
```typescript
validateWebhook(requestBody, headers, null)
```

### Recommended: Enable Signature Validation

Update `voice-routes.ts` to add validation:

```typescript
// Validate webhook before processing
if (process.env.VALIDATE_WEBHOOKS === 'true') {
  const secret = process.env[`${adapter.getProviderName().toUpperCase()}_SECRET`];
  const isValid = adapter.validateWebhook(req.body, req.headers, secret);
  
  if (!isValid) {
    console.error('[Voice] Invalid webhook signature');
    return res.status(403).send('Forbidden');
  }
}
```

---

## Testing

### Test with cURL

**Twilio format:**
```bash
curl -X POST http://localhost:5000/api/voice/incoming \
  -d "CallSid=CA1234567890abcdef" \
  -d "From=+15551234567" \
  -d "To=+15559876543" \
  -d "CallStatus=ringing"
```

**Vonage format:**
```bash
curl -X POST http://localhost:5000/api/voice/incoming \
  -H "Content-Type: application/json" \
  -d '{
    "uuid": "63f61863-4a51-4f6b-86e1-46edebio0391",
    "from": "15551234567",
    "to": "15559876543",
    "conversation_uuid": "CON-123",
    "timestamp": "2026-01-22T10:00:00.000Z"
  }'
```

**Bandwidth format:**
```bash
curl -X POST http://localhost:5000/api/voice/incoming \
  -H "Content-Type: application/json" \
  -d '{
    "callId": "c-d45a41f7-1234-5678-90ab-cdef01234567",
    "from": "+15551234567",
    "to": "+15559876543",
    "applicationId": "a-12345",
    "accountId": "5555555"
  }'
```

---

## Migration from Twilio-Only

### Before (Twilio-specific):
```typescript
const callSid = req.body.CallSid;
const from = req.body.From;
const to = req.body.To;
return res.send(generateTwiML('say', 'Hello'));
```

### After (Provider-agnostic):
```typescript
const adapter = VoipAdapterFactory.detectProvider(req.body, req.headers);
const callData = adapter.parseIncomingCall(req.body, req.headers);
const response = adapter.generateCallResponse({ action: 'answer', message: 'Hello' });
return res.send(response);
```

---

## Adding New Providers

To add support for a new provider (e.g., Plivo, Telnyx):

1. **Create adapter:** `backend-node/src/adapters/voip/plivo-adapter.ts`
2. **Extend BaseVoipAdapter:**
```typescript
export class PlivoAdapter extends BaseVoipAdapter {
  constructor() {
    super('plivo');
  }
  
  parseIncomingCall(requestBody: any, headers: any): IncomingCallData {
    // Implement Plivo-specific parsing
  }
  
  generateCallResponse(response: CallControlResponse): string {
    // Generate Plivo XML
  }
  
  parseAudioChunk(requestBody: any): AudioChunkData | null {
    // Parse Plivo audio format
  }
  
  validateWebhook(requestBody: any, headers: any, secret: string): boolean {
    // Validate Plivo signature
  }
}
```

3. **Register in factory:**
```typescript
// adapter-factory.ts
import { PlivoAdapter } from './plivo-adapter';

private static adapters: Map<string, BaseVoipAdapter> = new Map([
  ['twilio', new TwilioAdapter()],
  ['vonage', new VonageAdapter()],
  ['bandwidth', new BandwidthAdapter()],
  ['plivo', new PlivoAdapter()] // Add new provider
]);
```

4. **Update auto-detection:**
```typescript
// Add Plivo detection logic
if (requestBody.MessageUUID) {
  return this.getAdapter('plivo');
}
```

---

## Provider Comparison

| Feature | Twilio | Vonage | Bandwidth |
|---------|--------|--------|-----------|
| **Format** | TwiML (XML) | NCCO (JSON) | BXML (XML) |
| **Audio Codec** | μ-law (8kHz) | PCM (16kHz) | μ-law (8kHz) |
| **Streaming** | WebSocket | WebSocket | WebSocket |
| **Pricing** | $0.0085/min | $0.0040/min | $0.0049/min |
| **Global Coverage** | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐ |
| **Reliability** | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐⭐ |
| **Docs Quality** | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐ |

---

## Next Steps

1. ✅ **Choose Provider** - Select based on pricing, coverage, features
2. ✅ **Configure Webhooks** - Point to your `/api/voice/incoming` endpoint
3. ✅ **Set Environment Variables** - Add credentials to `.env`
4. ✅ **Test Integration** - Make test calls to verify
5. ✅ **Enable Signature Validation** - Add security layer
6. ✅ **Monitor Logs** - Check adapter detection and responses

Your platform is now **truly provider-agnostic**! 🎉
