# MongoDB Prompt Configuration Schema

## Collections

| Collection | Purpose | Managed By |
|---|---|---|
| `prompt_versions` | All prompt records — system templates AND tenant-specific prompts | PMS service |
| `tenant_prompt_bindings` | Tracks current draft + active production per tenant+product+channel | PMS service |
| `prompt_audit_log` | Immutable audit trail for every prompt action | PMS service |
| `assistant_channels` | Runtime voice/chat channel config for Java VA service | Java VA service (read-only) |

---

## 1. `prompt_versions`

Single collection holding both system prompts (templates) and tenant prompts.

### Two Record Types

| Field | System Prompt (template) | Tenant Prompt |
|---|---|---|
| `isTemplate` | `true` | `false` |
| `tenantId` | `null` (platform-owned) | set to tenant ID string |
| `productId` | set | set |
| Edit rule | Immutable once `state='production'` | Editable while `state='draft'` |
| Lifecycle | `draft → production` | `draft → testing → production` |
| Created by | Platform admin | Auto-provisioned on signup; or created from template |

### Field Reference

| Field | Type | Required | Notes |
|---|---|---|---|
| `promptId` | ObjectId | Yes | Stable identifier shared across all versions of one logical prompt |
| `version` | Number | Yes | Integer, starts at 1, increments with each `createNewVersion()` call |
| `name` | String | Yes | |
| `description` | String | No | |
| `category` | String | No | |
| `channelType` | String | Yes | `voice \| chat \| sms \| whatsapp \| email` |
| `isTemplate` | Boolean | No | `true` = system prompt, default `false` |
| `templateDescription` | String | No | Description shown to admins |
| `baseTemplateId` | ObjectId | No | Points to the `_id` of the system prompt this was pulled from |
| `icon` | String | No | Emoji/icon for display |
| `tenantId` | String | No | Null for system prompts |
| `productId` | ObjectId | No | |
| `content` | Object | Yes | 6-layer prompt content (see below) |
| `state` | String | Yes | `draft \| testing \| staging \| production \| archived` |
| `environment` | String | Yes | `development \| testing \| staging \| production` |
| `isActive` | Boolean | Yes | `true` only on the currently-serving production version |
| `activatedAt` | Date | No | Set when promoted to production |
| `canRollback` | Boolean | Yes | `true` on any version that has been production before |
| `rollbackFrom` | ObjectId | No | `_id` of the version that was active when this rollback occurred |
| `basedOn` | ObjectId | No | `_id` of the version this was branched from |
| `changes` | Array | No | Field-level diff recorded on each update |
| `createdBy` | Object | Yes | `{ userId, name, email, role }` |
| `updatedBy` | Object | No | `{ userId, name, email, role }` |
| `isDeleted` | Boolean | No | Soft delete flag |
| `deletedAt` | Date | No | |
| `deletedBy` | Object | No | `{ userId, name, email, role }` |
| `metrics` | Object | No | Phase 7: usage stats |

### 6-Layer Content Object

```typescript
content: {
  systemPrompt: string,            // Core instruction text
  persona: {
    tone: string,
    personality: string,
    allowedActions: string[],
    disallowedActions: string[]
  },
  businessContext: {
    servicesOffered: string[],
    pricingInfo?: string,
    locations?: [{ name, address, city, phone, hours }],
    policies?: string,
    faqs?: [{ question, answer }]
  },
  ragConfig?: { enabled, vectorStore, sources, retrieval, ... },
  conversationBehavior: {
    greeting: string,
    fallbackMessage: string,
    intentPrompts?: Map<string, string>,
    askForNameFirst?: boolean,
    conversationMemoryTurns?: number
  },
  constraints: {
    prohibitedTopics: string[],
    complianceRules?: string[],
    requireConsent?: boolean,
    maxConversationTurns?: number
  },
  customVariables?: Map<string, string>
}
```

### Key Indexes

| Index Name | Fields | Notes |
|---|---|---|
| `active_prompt_lookup` | `tenantId, productId, channelType, environment, isActive` | O(1) production lookup |
| `version_history` | `promptId, version: -1` | History sorted newest first |
| `template_lookup` | `isTemplate, productId, channelType` | Partial (isTemplate:true only) |
| `draft_ttl` | `createdAt` | Auto-expire inactive drafts after 90 days |

### Prompt Lifecycle

```
createDraft()            → promptId=NEW, version=1, state='draft', isActive=false
  │
  ├─ updateDraft()       → in-place edit (optimistic lock via __v)
  ├─ createNewVersion()  → version=2, state='draft', basedOn=v1._id
  │
  ├─ promotePrompt('testing')    → state='testing'  [tenant only]
  └─ promotePrompt('production') → state='production', isActive=true
       └─ prior production versions → state='archived', isActive=false
  │
  └─ rollbackPrompt(targetVersionId) → reactivates prior version
```

---

## 2. `tenant_prompt_bindings`

One record per `(tenantId, productId, channelType)`. Tracks which version is the current draft and which is production.

### Fields

| Field | Type | Notes |
|---|---|---|
| `tenantId` | String | |
| `productId` | ObjectId | |
| `channelType` | String | `voice \| chat` |
| `currentDraftId` | ObjectId | `_id` of the active draft PromptVersion (cleared on promote to production) |
| `activeProductionId` | ObjectId | `_id` of the serving production PromptVersion |
| `pulledTemplateIds` | ObjectId[] | Template `_id`s already provisioned — Pull is idempotent against this list |
| `scoreThreshold` | Number | Phase 2: auto-promotion gate (default 90) |
| `lastScore` | Number | Phase 2: last test score |

### Unique index
```
{ tenantId: 1, productId: 1, channelType: 1 }  — unique
```

### Delta Pull Logic

On `POST /api/pms/tenant-prompts/:productId/pull`:
1. Load all production templates for the product (`isTemplate:true, state:'production'`)
2. Collect template `_id`s already in `pulledTemplateIds` across all bindings
3. Also check existing tenant `prompt_versions` by `baseTemplateId` (handles seeded/legacy data)
4. Only provision templates NOT in either set — idempotent pulls

---

## 3. `prompt_audit_log`

Immutable audit trail. One entry per action on any prompt version.

| Field | Type | Required | Notes |
|---|---|---|---|
| `promptVersionId` | ObjectId | Yes | |
| `action` | String | Yes | `created \| updated \| approved \| deployed \| rolled_back \| deleted \| accessed \| created_from_template` |
| `actor.userId` | String | Yes | |
| `actor.name` | String | Yes | |
| `actor.email` | String | Yes | |
| `actor.role` | String | Yes | |
| `actor.ipAddress` | String | Yes | |
| `actor.sessionId` | String | Yes | |
| `timestamp` | Date | Yes | |
| `changes` | Array | No | `[{ field, path, oldValue, newValue }]` |
| `context.tenantId` | String | No | |
| `context.productId` | ObjectId | No | |
| `context.environment` | String | Yes | |
| `context.requestId` | String | Yes | |
| `compliance.dataClassification` | String | Yes | `PHI \| PII \| PUBLIC` |
| `compliance.retentionPolicy` | String | Yes | `7_YEARS \| INDEFINITE` |

TTL index: `timestamp` expires after 7 years (HIPAA/SOC2 requirement).

---

## 4. `assistant_channels`

**Retained for the Java VA service.** The Java PromptAssembler reads this collection at session start to get runtime voice/chat channel configuration.

This collection is **NOT part of the versioned PMS system**. It is not managed through `/api/pms/` routes. It stores voice/chat settings like phone numbers, business hours, and `promptContext` that the Java VA uses to assemble the final prompt at runtime.

See `PROMPT_ARCHITECTURE.md` for how `assistant_channels` fits into the session flow.

---

## API Endpoints

### System Prompts (admin)

| Method | Path | Description |
|---|---|---|
| `GET` | `/api/pms/prompts?isTemplate=true&productId=X` | List templates for a product |
| `GET` | `/api/pms/prompts/templates/:id` | Get a single template |
| `POST` | `/api/pms/prompts/drafts` | Create new draft (set `isTemplate:true` for system prompt) |
| `PUT` | `/api/pms/prompts/:id` | Update draft (blocked if system prompt is published) |
| `POST` | `/api/pms/prompts/:id/versions` | Create new version (duplicate) |
| `POST` | `/api/pms/prompts/:id/promote` | Promote to production |

### Tenant Prompts

| Method | Path | Description |
|---|---|---|
| `GET` | `/api/pms/tenant-prompts/:productId` | Get tenant's prompts and bindings |
| `POST` | `/api/pms/tenant-prompts/:productId/pull` | Pull delta templates for tenant |
| `POST` | `/api/pms/tenant-prompts/:productId/:channel/promote` | Promote tenant draft to production |
| `GET` | `/api/pms/prompts/:id/versions` | Get version history |
| `POST` | `/api/pms/prompts/:id/rollback` | Rollback to a prior version |
| `DELETE` | `/api/pms/prompts/:id` | Soft delete |
| `POST` | `/api/pms/prompts/:id/restore` | Restore soft-deleted |

---

## On Subscription — Auto-Provisioning

When a tenant subscribes to a product (`POST /api/product-signup/session/:sessionId/complete`):
1. The signup handler calls `tenantPromptService.pullTemplates(tenantId, productId, actor)`
2. All production templates for the product are copied as tenant drafts with `baseTemplateId` set
3. `tenant_prompt_bindings` records are created/updated with `currentDraftId` and `pulledTemplateIds`
4. The tenant can then edit and promote their copy — the system template is untouched

When admins publish a new template version, tenants see a badge on their Pull button and can pull the delta.
