# MongoDB Prompt Configuration Schema

## Collection: `assistant_channels`

This collection stores comprehensive prompt configuration for virtual assistants, supporting voice, chat, SMS, and WhatsApp channels.

## Document Structure

```typescript
{
  _id: ObjectId,
  customerId: string,              // Unique customer identifier
  productId: string | ObjectId,    // Link to subscribed product
  tenantId: string,                // Tenant/customer reference
  
  voice: VoiceChannelConfig,
  chat: ChatChannelConfig,
  sms: SmsChannelConfig,
  whatsapp: WhatsAppChannelConfig,
  
  createdAt: Date,
  updatedAt: Date
}
```

## Channel Configurations

### Voice Channel Config

```typescript
{
  enabled: boolean,
  phoneNumber: string,
  fallbackNumber?: string,
  
  voiceSettings: {
    language: string,              // e.g., "en-US"
    voiceId: string,              // Voice provider ID
    speechRate: number,           // 0.5 - 2.0
    pitch: number                 // -20 to 20
  },
  
  businessHours: {
    timezone: string,
    monday?: { open: string, close: string },
    tuesday?: { open: string, close: string },
    // ... other days
  },
  
  customPrompts: CustomPrompts,
  ragConfig: RagConfiguration,
  promptContext: PromptContext
}
```

### Chat Channel Config

```typescript
{
  enabled: boolean,
  greeting?: string,
  typingIndicator?: boolean,
  maxTurns?: number,
  showIntent?: boolean,
  allowFileUpload?: boolean,
  
  customPrompts: CustomPrompts,
  ragConfig: RagConfiguration,
  promptContext: PromptContext
}
```

## Core Interfaces

### PromptContext (Business Configuration)

```typescript
{
  // Business Identity
  tenantName?: string,
  tenantIndustry?: string,
  businessContext?: string,
  
  // Role/Persona
  tone?: string,
  personality?: string,
  allowedActions?: string[],
  disallowedActions?: string[],
  
  // Static Business Knowledge
  servicesOffered?: string[],
  pricingInfo?: string,
  locations?: Array<{
    address: string,
    city: string,
    state: string
  }>,
  businessHours?: string,
  policies?: string,
  faqs?: Array<{
    question: string,
    answer: string
  }>,
  productCatalog?: string,
  
  // Conversation Behavior
  maxResponseLength?: number,
  escalationTriggers?: string[],
  askForNameFirst?: boolean,
  confirmBeforeActions?: boolean,
  defaultLanguage?: string,
  conversationMemoryTurns?: number,
  
  // Custom Variables
  customVariables?: { [key: string]: string }
}
```

### CustomPrompts (Safety & Compliance)

```typescript
{
  systemPrompt?: string,
  greeting?: string,
  intentPrompts?: { [key: string]: string },
  fallbackMessage?: string,
  closingMessage?: string,
  
  // Safety & Compliance
  prohibitedTopics?: string[],
  complianceRules?: string[],
  privacyPolicy?: string,
  requireConsent?: boolean,
  escalationPolicy?: string,
  sensitiveDataHandling?: string,
  maxConversationTurns?: number,
  logConversations?: boolean
}
```

### RagConfiguration (Knowledge Sources)

```typescript
{
  enabled: boolean,
  sources: Array<{
    url: string,
    type: 'website' | 'api' | 'documentation',
    description?: string,
    refreshInterval?: number
  }>,
  maxResults?: number,
  confidenceThreshold?: number
}
```

## API Endpoints

### GET `/api/assistant-channels`
Get configuration for current authenticated customer.

**Response:**
```json
{
  "_id": "...",
  "customerId": "ten-splendor-florida-33064",
  "productId": "prod-va-basic",
  "voice": { ... },
  "chat": { ... }
}
```

### GET `/api/assistant-channels/:productId`
Get configuration by product ID.

**Parameters:**
- `productId`: Product identifier

**Response:** Same as above

### PATCH `/api/assistant-channels`
Update full channel configuration.

**Request Body:**
```json
{
  "voice": { ... },
  "chat": { ... }
}
```

### PATCH `/api/assistant-channels/voice`
Update only voice channel.

**Request Body:**
```json
{
  "enabled": true,
  "phoneNumber": "+1-555-123-4567",
  "customPrompts": { ... },
  "promptContext": { ... }
}
```

### PATCH `/api/assistant-channels/chat`
Update only chat channel.

**Request Body:**
```json
{
  "enabled": true,
  "greeting": "Hi! How can I help?",
  "promptContext": { ... }
}
```

## Seeding Test Data

Run the seed script to populate test data for tenant `ten-splendor-florida-33064`:

```bash
npm run seed:prompts
```

This creates a comprehensive configuration with:
- ✅ Business identity (Acme Healthcare)
- ✅ Full persona configuration
- ✅ 6 services offered
- ✅ 2 office locations
- ✅ 4 FAQs
- ✅ RAG sources configured
- ✅ Safety & compliance rules
- ✅ Conversation behavior settings

## Example Query

```javascript
const db = getDB();
const config = await db.collection('assistant_channels')
  .findOne({ 
    customerId: 'ten-splendor-florida-33064',
    productId: 'prod-va-basic'
  });

console.log(config.voice.promptContext.servicesOffered);
// ['Primary Care', 'Urgent Care', 'Telehealth', ...]
```

## Frontend Integration

The React PromptConfiguration component maps directly to this schema:

```typescript
// Business Identity Section → promptContext
businessName → promptContext.tenantName
industry → promptContext.tenantIndustry
tone → promptContext.tone
personality → promptContext.personality

// Static Knowledge Section → promptContext
servicesOffered → promptContext.servicesOffered
locations → promptContext.locations
faqs → promptContext.faqs

// Safety Section → customPrompts
prohibitedTopics → customPrompts.prohibitedTopics
complianceRules → customPrompts.complianceRules

// RAG Section → ragConfig
ragEnabled → ragConfig.enabled
ragUrls → ragConfig.sources
```

## Java Service Integration

The Java PromptBuilder uses this data:

```java
PromptAssembler assembler = new PromptAssembler();
String prompt = assembler.assemblePrompt(config, sessionState, ragResults);

// This extracts:
// - config.promptContext.tenantName → withBusinessName()
// - config.promptContext.servicesOffered → withStaticContext()
// - config.customPrompts.prohibitedTopics → withConstraints()
```

## Migration Notes

### From Old Schema
If you have existing configurations without the new fields, they will automatically receive defaults when accessed through the API.

### Adding New Fields
To add new fields:
1. Update TypeScript interfaces in `assistant-channels.types.ts`
2. Update seed script if needed
3. Frontend will automatically handle undefined fields as empty strings/arrays
4. Java PromptBuilder uses `safe()` method to handle null values

## Best Practices

1. **Always use upsert** when updating configurations to handle new customers
2. **Validate required fields** before saving (businessName, industry)
3. **Sanitize user input** especially in customPrompts to prevent prompt injection
4. **Log configuration changes** for audit trail
5. **Version configurations** if you need to track changes over time
6. **Cache frequently accessed configs** to reduce database load

## Security Considerations

- ✅ Sensitive data (API keys, tokens) should NOT be stored in promptContext
- ✅ Use `sensitiveDataHandling` field to document data handling policies
- ✅ Enable `requireConsent` for HIPAA/GDPR compliance
- ✅ Set `logConversations` carefully based on privacy requirements
- ✅ Validate `prohibitedTopics` to prevent abuse
- ✅ Rate limit configuration updates to prevent spam
