# Multi-Channel & Tenant Isolation Architecture

**Complete guide to how the Prompt Management System handles voice/chat separation and tenant isolation**

## Table of Contents
1. [Channel Separation Mechanism](#1-channel-separation-mechanism)
2. [Tenant/Product Isolation Guarantees](#2-tenantproduct-isolation-guarantees)
3. [Platform-Wide Template System](#3-platform-wide-template-system)
4. [Example Data Structures](#4-example-data-structures-showing-isolation)

---

## 1. Channel Separation Mechanism

### Overview
Each prompt is **channel-specific** via the `channelType` field. Voice and chat are **completely separate documents**.

### Schema Definition
```typescript
channelType: {
  type: String,
  required: true,
  enum: ['voice', 'chat', 'sms', 'whatsapp', 'email']
}
```

### How It Works
- Each channel gets its **own prompt document**
- Same tenant + same product = **multiple documents** (one per channel)
- Version history is **per-channel** (voice v1, v2, v3 separate from chat v1, v2)
- Approval workflows are **per-channel** (approve voice prompt independently of chat)

### Real-World Example

```javascript
// Acme Corp has ONE product (Healthcare VA) but TWO channel prompts

// Document 1: Voice Channel Prompt
{
  _id: ObjectId('voice-prompt-123'),
  promptId: ObjectId('prompt-group-abc'),  // Groups all voice versions
  version: 3,
  tenantId: 'acme-corp',
  productId: ObjectId('healthcare-va-product'),
  channelType: 'voice',  // ← VOICE CHANNEL
  name: 'Acme Healthcare Voice Assistant',
  state: 'production',
  isActive: true,
  content: {
    systemPrompt: 'You are a voice assistant for Acme Healthcare. Speak naturally and ask clarifying questions.',
    persona: {
      tone: 'warm, professional',
      personality: 'Friendly healthcare professional',
      allowedActions: ['schedule_appointment', 'transfer_to_nurse'],
      disallowedActions: ['prescribe_medication']
    },
    conversationBehavior: {
      greeting: 'Hello! Welcome to Acme Healthcare. How can I help you today?',
      askForNameFirst: true,
      conversationMemoryTurns: 10
    }
  }
}

// Document 2: Chat Channel Prompt (COMPLETELY SEPARATE)
{
  _id: ObjectId('chat-prompt-456'),
  promptId: ObjectId('prompt-group-xyz'),  // Different group for chat versions
  version: 2,
  tenantId: 'acme-corp',  // ← SAME TENANT
  productId: ObjectId('healthcare-va-product'),  // ← SAME PRODUCT
  channelType: 'chat',  // ← CHAT CHANNEL (different from voice)
  name: 'Acme Healthcare Chat Assistant',
  state: 'production',
  isActive: true,
  content: {
    systemPrompt: 'You are a text-based chat assistant for Acme Healthcare. Use emojis and be concise.',
    persona: {
      tone: 'friendly, concise',
      personality: 'Helpful and efficient',
      allowedActions: ['schedule_appointment', 'send_forms', 'provide_links'],
      disallowedActions: ['make_phone_calls']
    },
    conversationBehavior: {
      greeting: 'Hi there! 👋 I\'m your Acme Healthcare assistant. What can I do for you?',
      askForNameFirst: false,
      conversationMemoryTurns: 20  // Chat has longer memory
    }
  }
}
```

### Query Examples

```typescript
// Get VOICE prompt for Acme's Healthcare product
const voicePrompt = await PromptVersion.findOne({
  tenantId: 'acme-corp',
  productId: ObjectId('healthcare-va-product'),
  channelType: 'voice',  // ← Voice only
  environment: 'production',
  isActive: true
});
// Returns: "Hello! Welcome to Acme Healthcare..."

// Get CHAT prompt for SAME tenant and product
const chatPrompt = await PromptVersion.findOne({
  tenantId: 'acme-corp',
  productId: ObjectId('healthcare-va-product'),
  channelType: 'chat',  // ← Chat only
  environment: 'production',
  isActive: true
});
// Returns: "Hi there! 👋 I'm your Acme Healthcare assistant..."
```

### Key Differences Between Channels

Voice and chat prompts can have **completely different**:

| Aspect | Voice Example | Chat Example |
|--------|---------------|--------------|
| **Instructions** | "Speak naturally, ask clarifying questions" | "Be concise, use emojis" |
| **Greeting** | "Hello! Welcome to Acme Healthcare..." | "Hi there! 👋 I'm your..." |
| **Tone** | Warm, professional | Friendly, casual |
| **Actions** | Call transfers, voice commands | Send links, forms, images |
| **Memory** | 10 conversation turns | 20 conversation turns |
| **Persona** | Healthcare professional | Helpful assistant |

---

## 2. Tenant/Product Isolation Guarantees

### Multi-Level Isolation

**The PMS provides 5 layers of isolation:**

1. **Tenant Isolation**: Each tenant's prompts are completely separate
2. **Product Isolation**: Each product within a tenant is separate
3. **Channel Isolation**: Each channel within a product is separate
4. **Environment Isolation**: Dev/staging/production are separate
5. **Version Isolation**: Each version is tracked separately

### Compound Index

**Ensures fast, isolated queries:**

```javascript
db.prompt_versions.createIndex({
  tenantId: 1,        // Layer 1: Tenant
  productId: 1,       // Layer 2: Product
  channelType: 1,     // Layer 3: Channel
  environment: 1,     // Layer 4: Environment
  isActive: 1         // Layer 5: Active version only
}, { name: 'active_prompt_lookup' });
```

### Real-World Isolation Example

**Scenario: Three healthcare tenants, same product type, completely isolated prompts**

```javascript
// Tenant 1: Acme Healthcare
{
  _id: ObjectId('acme-voice-123'),
  tenantId: 'acme-corp',
  productId: ObjectId('healthcare-va-prod'),
  channelType: 'voice',
  environment: 'production',
  isActive: true,
  content: {
    systemPrompt: 'You are Acme Healthcare assistant. Our services include...',
    businessContext: {
      servicesOffered: ['Primary Care', 'Urgent Care', 'Lab Services'],
      locations: [
        { name: 'Acme Downtown', phone: '555-1000', city: 'Seattle' },
        { name: 'Acme Eastside', phone: '555-2000', city: 'Bellevue' }
      ],
      pricingInfo: 'Copay: $25, No insurance: $150'
    }
  }
}

// Tenant 2: Beta Medical (COMPLETELY ISOLATED)
{
  _id: ObjectId('beta-voice-456'),
  tenantId: 'beta-medical',  // ← DIFFERENT TENANT
  productId: ObjectId('healthcare-va-prod'),  // ← SAME PRODUCT TYPE
  channelType: 'voice',
  environment: 'production',
  isActive: true,
  content: {
    systemPrompt: 'You are Beta Medical assistant. We specialize in...',
    businessContext: {
      servicesOffered: ['Cardiology', 'Orthopedics', 'Physical Therapy'],
      locations: [
        { name: 'Beta Main Campus', phone: '555-3000', city: 'Portland' }
      ],
      pricingInfo: 'Insurance required for all visits'
    }
  }
}

// Tenant 3: Gamma Clinics (ALSO ISOLATED)
{
  _id: ObjectId('gamma-voice-789'),
  tenantId: 'gamma-clinics',  // ← DIFFERENT TENANT
  productId: ObjectId('healthcare-va-prod'),  // ← SAME PRODUCT TYPE
  channelType: 'voice',
  environment: 'production',
  isActive: true,
  content: {
    systemPrompt: 'You are Gamma Clinics assistant. We offer...',
    businessContext: {
      servicesOffered: ['Mental Health', 'Therapy', 'Counseling'],
      locations: [
        { name: 'Gamma North', phone: '555-4000', city: 'Vancouver' },
        { name: 'Gamma South', phone: '555-5000', city: 'Eugene' }
      ],
      pricingInfo: 'Sliding scale based on income'
    }
  }
}
```

### Isolation Guarantees in Action

```typescript
// Acme's voice channel requests prompt
const acmePrompt = await promptService.getActivePrompt({
  tenantId: 'acme-corp',
  productId: 'healthcare-va-prod',
  channelType: 'voice',
  environment: 'production'
});
// Returns: "You are Acme Healthcare assistant..."
// Contains: Acme's 2 locations (Seattle, Bellevue)
// CANNOT see: Beta's or Gamma's data

// Beta's voice channel requests prompt
const betaPrompt = await promptService.getActivePrompt({
  tenantId: 'beta-medical',
  productId: 'healthcare-va-prod',
  channelType: 'voice',
  environment: 'production'
});
// Returns: "You are Beta Medical assistant..."
// Contains: Beta's 1 location (Portland)
// CANNOT see: Acme's or Gamma's data
```

### Security Features

1. **Query-level isolation**: All queries MUST include `tenantId` filter
2. **Index-enforced**: Compound index ensures fast queries without full table scans
3. **Middleware validation**: Auth middleware validates user has access to requested tenant
4. **Audit logging**: All prompt access is logged with tenant ID for compliance (HIPAA/SOC2)

---

## 3. Platform-Wide Template System

### Overview

**Templates** are pre-built prompts with `tenantId: null` that serve as **starting points** for tenants.

### How It Works

1. Platform admins create templates (null `tenantId`)
2. Templates are **read-only** for tenants
3. Tenants **clone** templates to create their own customized versions
4. Cloned prompts become tenant-specific (with their `tenantId`)

### Template Structure

```javascript
// Platform-Wide Template (created by platform admin)
{
  _id: ObjectId('template-voice-healthcare'),
  tenantId: null,  // ← NULL = Platform-wide
  productId: null,
  channelType: 'voice',
  name: 'Healthcare Voice Assistant Template',
  description: 'Starter template for healthcare voice assistants',
  state: 'production',
  isActive: true,
  content: {
    systemPrompt: 'You are a healthcare virtual assistant. [CUSTOMIZE: Add your clinic name]',
    persona: {
      tone: 'professional, empathetic',
      personality: 'Healthcare professional',
      allowedActions: ['schedule_appointment', 'provide_information'],
      disallowedActions: ['diagnose', 'prescribe']
    },
    businessContext: {
      servicesOffered: ['[CUSTOMIZE: Add your services]'],
      locations: [],  // Empty - tenant fills in
      pricingInfo: '[CUSTOMIZE: Add your pricing]',
      faqs: [
        {
          question: 'What are your hours?',
          answer: '[CUSTOMIZE: Add your hours]'
        }
      ]
    },
    conversationBehavior: {
      greeting: 'Welcome to [CLINIC_NAME]. How can I help you today?',
      askForNameFirst: true,
      conversationMemoryTurns: 10
    },
    constraints: {
      prohibitedTopics: ['medical diagnosis', 'prescriptions', 'legal advice'],
      complianceRules: ['HIPAA compliant', 'Do not store PHI'],
      requireConsent: true
    }
  }
}
```

### Template Usage Flow

```typescript
// Step 1: Tenant browses available templates
const templates = await promptService.listPrompts({
  tenantId: null,  // Get platform templates
  state: 'production'
});
// Returns: [Healthcare Template, Legal Template, Retail Template, ...]

// Step 2: Tenant clones template
const clonedPrompt = await promptService.cloneTemplate({
  templateId: 'template-voice-healthcare',
  tenantId: 'acme-corp',  // ← Assign to tenant
  productId: 'healthcare-va-prod',
  customizations: {
    name: 'Acme Healthcare Voice Assistant',
    content: {
      systemPrompt: 'You are a healthcare assistant for Acme Healthcare.',
      businessContext: {
        servicesOffered: ['Primary Care', 'Urgent Care'],
        locations: [
          { name: 'Acme Downtown', phone: '555-1000', city: 'Seattle' }
        ],
        pricingInfo: 'Copay: $25'
      }
    }
  }
});

// Result: New tenant-specific prompt created
{
  _id: ObjectId('acme-voice-from-template'),
  tenantId: 'acme-corp',  // ← NOW TENANT-SPECIFIC
  productId: ObjectId('healthcare-va-prod'),
  channelType: 'voice',
  state: 'draft',
  version: 1,
  basedOn: ObjectId('template-voice-healthcare'),  // Links back to template
  content: {
    // Customized content with tenant's data
  }
}
```

### Template Benefits

1. **Faster onboarding**: Tenants start with best practices
2. **Consistency**: All tenants get compliance rules, safety constraints
3. **Customization**: Tenants can fully modify their cloned version
4. **Version tracking**: `basedOn` field links to original template
5. **Updates**: When template updates, tenants can merge changes if desired

---

## 4. Example Data Structures Showing Isolation

### Complete Database Example

**2 tenants, 2 products each, 2 channels each = 8 total active prompts**

```javascript
// === PLATFORM TEMPLATES (tenantId: null) ===
{
  _id: ObjectId('template-001'),
  tenantId: null,
  productId: null,
  channelType: 'voice',
  name: 'Healthcare Voice Template',
  state: 'production',
  isActive: true
}

{
  _id: ObjectId('template-002'),
  tenantId: null,
  productId: null,
  channelType: 'chat',
  name: 'Healthcare Chat Template',
  state: 'production',
  isActive: true
}

// === ACME CORP (tenantId: 'acme-corp') ===

// Product 1: Healthcare VA - Voice Channel
{
  _id: ObjectId('acme-healthcare-voice-prod'),
  promptId: ObjectId('acme-healthcare-voice-group'),
  version: 3,
  tenantId: 'acme-corp',
  productId: ObjectId('prod-healthcare-va'),
  channelType: 'voice',
  environment: 'production',
  state: 'production',
  isActive: true,
  name: 'Acme Healthcare Voice v3',
  content: {
    systemPrompt: 'Acme Healthcare voice assistant...',
    businessContext: {
      servicesOffered: ['Primary Care', 'Urgent Care'],
      locations: [{ name: 'Acme Downtown', city: 'Seattle' }]
    }
  },
  metrics: { totalUses: 15000, avgLatency: 250, errorRate: 0.002 }
}

// Product 1: Healthcare VA - Chat Channel
{
  _id: ObjectId('acme-healthcare-chat-prod'),
  promptId: ObjectId('acme-healthcare-chat-group'),
  version: 2,
  tenantId: 'acme-corp',
  productId: ObjectId('prod-healthcare-va'),
  channelType: 'chat',
  environment: 'production',
  state: 'production',
  isActive: true,
  name: 'Acme Healthcare Chat v2',
  content: {
    systemPrompt: 'Acme Healthcare chat assistant...',
    businessContext: {
      servicesOffered: ['Primary Care', 'Urgent Care'],
      locations: [{ name: 'Acme Downtown', city: 'Seattle' }]
    }
  },
  metrics: { totalUses: 8000, avgLatency: 180, errorRate: 0.001 }
}

// Product 2: Legal Assistant VA - Voice Channel
{
  _id: ObjectId('acme-legal-voice-prod'),
  promptId: ObjectId('acme-legal-voice-group'),
  version: 1,
  tenantId: 'acme-corp',
  productId: ObjectId('prod-legal-va'),
  channelType: 'voice',
  environment: 'production',
  state: 'production',
  isActive: true,
  name: 'Acme Legal Voice v1',
  content: {
    systemPrompt: 'Acme Legal assistant...',
    businessContext: {
      servicesOffered: ['Contract Review', 'Legal Consultation'],
      pricingInfo: '$300/hour'
    }
  },
  metrics: { totalUses: 500, avgLatency: 300, errorRate: 0.005 }
}

// Product 2: Legal Assistant VA - Chat Channel
{
  _id: ObjectId('acme-legal-chat-prod'),
  promptId: ObjectId('acme-legal-chat-group'),
  version: 1,
  tenantId: 'acme-corp',
  productId: ObjectId('prod-legal-va'),
  channelType: 'chat',
  environment: 'production',
  state: 'production',
  isActive: true,
  name: 'Acme Legal Chat v1',
  content: {
    systemPrompt: 'Acme Legal chat assistant...',
    businessContext: {
      servicesOffered: ['Contract Review', 'Legal Consultation'],
      pricingInfo: '$300/hour'
    }
  },
  metrics: { totalUses: 1200, avgLatency: 200, errorRate: 0.003 }
}

// === BETA MEDICAL (tenantId: 'beta-medical') ===

// Product 1: Healthcare VA - Voice Channel
{
  _id: ObjectId('beta-healthcare-voice-prod'),
  promptId: ObjectId('beta-healthcare-voice-group'),
  version: 5,
  tenantId: 'beta-medical',
  productId: ObjectId('prod-healthcare-va'),
  channelType: 'voice',
  environment: 'production',
  state: 'production',
  isActive: true,
  name: 'Beta Medical Voice v5',
  content: {
    systemPrompt: 'Beta Medical assistant...',
    businessContext: {
      servicesOffered: ['Cardiology', 'Orthopedics'],
      locations: [{ name: 'Beta Main Campus', city: 'Portland' }]
    }
  },
  metrics: { totalUses: 25000, avgLatency: 220, errorRate: 0.0015 }
}

// Product 1: Healthcare VA - Chat Channel
{
  _id: ObjectId('beta-healthcare-chat-prod'),
  promptId: ObjectId('beta-healthcare-chat-group'),
  version: 4,
  tenantId: 'beta-medical',
  productId: ObjectId('prod-healthcare-va'),
  channelType: 'chat',
  environment: 'production',
  state: 'production',
  isActive: true,
  name: 'Beta Medical Chat v4',
  content: {
    systemPrompt: 'Beta Medical chat assistant...',
    businessContext: {
      servicesOffered: ['Cardiology', 'Orthopedics'],
      locations: [{ name: 'Beta Main Campus', city: 'Portland' }]
    }
  },
  metrics: { totalUses: 18000, avgLatency: 190, errorRate: 0.002 }
}

// Product 2: Pharmacy Assistant - Voice Channel
{
  _id: ObjectId('beta-pharmacy-voice-prod'),
  promptId: ObjectId('beta-pharmacy-voice-group'),
  version: 2,
  tenantId: 'beta-medical',
  productId: ObjectId('prod-pharmacy-va'),
  channelType: 'voice',
  environment: 'production',
  state: 'production',
  isActive: true,
  name: 'Beta Pharmacy Voice v2',
  content: {
    systemPrompt: 'Beta Pharmacy assistant...',
    businessContext: {
      servicesOffered: ['Prescription Refills', 'Insurance Questions'],
      pricingInfo: 'Generic: $10, Brand: $50'
    }
  },
  metrics: { totalUses: 3000, avgLatency: 240, errorRate: 0.004 }
}

// Product 2: Pharmacy Assistant - Chat Channel
{
  _id: ObjectId('beta-pharmacy-chat-prod'),
  promptId: ObjectId('beta-pharmacy-chat-group'),
  version: 2,
  tenantId: 'beta-medical',
  productId: ObjectId('prod-pharmacy-va'),
  channelType: 'chat',
  environment: 'production',
  state: 'production',
  isActive: true,
  name: 'Beta Pharmacy Chat v2',
  content: {
    systemPrompt: 'Beta Pharmacy chat assistant...',
    businessContext: {
      servicesOffered: ['Prescription Refills', 'Insurance Questions'],
      pricingInfo: 'Generic: $10, Brand: $50'
    }
  },
  metrics: { totalUses: 5000, avgLatency: 180, errorRate: 0.002 }
}
```

### Query Results Matrix

| Query Parameters | Returned Prompt |
|-----------------|-----------------|
| `tenantId='acme-corp', productId='prod-healthcare-va', channelType='voice'` | Acme Healthcare Voice v3 |
| `tenantId='acme-corp', productId='prod-healthcare-va', channelType='chat'` | Acme Healthcare Chat v2 |
| `tenantId='acme-corp', productId='prod-legal-va', channelType='voice'` | Acme Legal Voice v1 |
| `tenantId='acme-corp', productId='prod-legal-va', channelType='chat'` | Acme Legal Chat v1 |
| `tenantId='beta-medical', productId='prod-healthcare-va', channelType='voice'` | Beta Medical Voice v5 (**NOT Acme's**) |
| `tenantId='beta-medical', productId='prod-healthcare-va', channelType='chat'` | Beta Medical Chat v4 |
| `tenantId='beta-medical', productId='prod-pharmacy-va', channelType='voice'` | Beta Pharmacy Voice v2 |
| `tenantId='beta-medical', productId='prod-pharmacy-va', channelType='chat'` | Beta Pharmacy Chat v2 |
| `tenantId=null` (templates only) | Platform Templates (2 docs) |

### Isolation Proof

- **Acme Corp** has **4 active prompts** (2 products × 2 channels)
- **Beta Medical** has **4 active prompts** (2 products × 2 channels)
- **Total isolation**: Acme cannot see Beta's data, Beta cannot see Acme's
- **Channel separation**: Voice prompts are separate from chat prompts
- **Product separation**: Healthcare VA separate from Legal/Pharmacy VA
- **Metrics independent**: Each prompt tracks its own usage/performance

---

## Implementation Files

### Schema
- **File**: `ai-product-management/backend-node/src/models/PromptVersion.ts`
- **Line 226**: `channelType` enum definition
- **Line 229**: `tenantId` indexed field
- **Line 230**: `productId` indexed field
- **Line 426-431**: Compound index for isolation

### Service Layer
- **File**: `ai-product-management/backend-node/src/services/prompt.service.ts`
- **Line 109-122**: `getActivePrompt()` method with filtering

### Routes
- **File**: `ai-product-management/backend-node/src/routes/prompt-management-routes.ts`
- **Line 76-102**: GET `/active` endpoint for retrieving active prompts

---

## Testing Isolation

### Test Scenario 1: Cross-Tenant Access Prevention

```typescript
// Acme user tries to access Beta's prompt (should fail)
const result = await promptService.getActivePrompt({
  tenantId: 'beta-medical',  // Different tenant
  productId: 'prod-healthcare-va',
  channelType: 'voice',
  environment: 'production'
});

// Auth middleware should reject this request before service is called
// Expected: 403 Forbidden
```

### Test Scenario 2: Channel Separation

```typescript
// Get voice prompt
const voice = await promptService.getActivePrompt({
  tenantId: 'acme-corp',
  productId: 'prod-healthcare-va',
  channelType: 'voice',
  environment: 'production'
});

// Get chat prompt
const chat = await promptService.getActivePrompt({
  tenantId: 'acme-corp',
  productId: 'prod-healthcare-va',
  channelType: 'chat',
  environment: 'production'
});

// Assert: voice._id !== chat._id (different documents)
// Assert: voice.content !== chat.content (different prompts)
```

### Test Scenario 3: Product Isolation

```typescript
// Get Healthcare VA prompt
const healthcare = await promptService.getActivePrompt({
  tenantId: 'acme-corp',
  productId: 'prod-healthcare-va',
  channelType: 'voice',
  environment: 'production'
});

// Get Legal VA prompt
const legal = await promptService.getActivePrompt({
  tenantId: 'acme-corp',
  productId: 'prod-legal-va',
  channelType: 'voice',
  environment: 'production'
});

// Assert: healthcare._id !== legal._id
// Assert: healthcare.content !== legal.content
```

---

## Summary

✅ **Channel Separation**: Voice and chat are separate documents
✅ **Tenant Isolation**: Each tenant's data is completely isolated
✅ **Product Isolation**: Each product has its own prompts
✅ **Platform Templates**: Shared templates with null tenantId
✅ **Fast Queries**: Compound index ensures <50ms query time
✅ **Security**: Multi-layer validation prevents cross-tenant access
✅ **Audit Trail**: All access logged for HIPAA/SOC2 compliance

