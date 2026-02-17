# Prompt Configuration Architecture

## Overview

The Prompt Management System (PMS) uses a single `prompt_versions` collection with two distinct record types: **system prompts** (managed by platform admins) and **tenant prompts** (provisioned per-tenant). The `tenant_prompt_bindings` collection tracks which version is active for each tenant+product+channel.

---

## Two Prompt Domains

```
┌──────────────────────────────────────────────────────────────────────────┐
│  ADMIN LAYER — System Prompts (isTemplate: true, tenantId: null)         │
│  Managed via: Settings → Prompt Management                               │
│  Lifecycle:   draft → production                                         │
│  Rule:        Immutable once published — use "New Version" to iterate    │
└──────────────────────────────────────────────────────────────────────────┘
                         ↓  Pull (delta only)
                POST /api/pms/tenant-prompts/:productId/pull
                         ↓  copies with baseTemplateId reference
┌──────────────────────────────────────────────────────────────────────────┐
│  TENANT LAYER — Tenant Prompts (isTemplate: false, tenantId: set)        │
│  Managed via: Product → Assistant Channels → Configure [Voice|Chat]      │
│  Lifecycle:   draft → testing → production                               │
│  Rule:        Editable while draft; immutable once testing/production    │
└──────────────────────────────────────────────────────────────────────────┘
                         ↓  Active production version
                         ↓  read by Java VA service at session start
┌──────────────────────────────────────────────────────────────────────────┐
│  RUNTIME LAYER — assistant_channels                                      │
│  Used by:     Java PromptAssembler to build final session prompt         │
│  Not versioned through PMS — static voice/chat channel config            │
└──────────────────────────────────────────────────────────────────────────┘
```

---

## On Subscription: Auto-Provisioning

```
User subscribes to product
         ↓
POST /api/product-signup/session/:sessionId/complete
         ↓
tenantPromptService.pullTemplates(tenantId, productId, actor)
         ↓
For each production template (isTemplate:true, state:'production'):
  ├─ Skip if baseTemplateId already in pulledTemplateIds  ← idempotent
  ├─ Skip if tenant already has prompt_version with that baseTemplateId
  └─ promptService.createFromTemplate() → tenant draft (version 1)
         ↓
tenant_prompt_bindings created/updated:
  { currentDraftId, pulledTemplateIds: [templateId, ...] }
         ↓
Tenant can now edit and promote their own copy
```

---

## Delta Pull Flow

When a new system prompt is published by an admin:

```
Admin creates draft (isTemplate:true) → promotes to production
         ↓
Tenant opens "Pull Prompts" on TenantPrompts page
         ↓
POST /api/pms/tenant-prompts/:productId/pull
         ↓
pullTemplates() checks:
  1. pulledTemplateIds in tenant_prompt_bindings
  2. existing prompt_versions with baseTemplateId (handles seeded data)
         ↓
Only NEW templates (not in either set) are provisioned
         ↓
tenant_prompt_bindings updated: new templateIds added to pulledTemplateIds
```

---

## Versioning Lifecycle

```
createDraft()
  promptId=NEW, version=1, state='draft', isActive=false
       │
       ├─ updateDraft()
       │    → in-place edit
       │    → optimistic lock: __v must match
       │    → system prompts (isTemplate:true, state≠'draft') → 403 blocked
       │
       ├─ createNewVersion()
       │    → new doc: promptId=SAME, version=N+1, basedOn=source._id
       │
       ├─ promotePrompt('testing')    [tenant only]
       │    → state='testing', environment='testing'
       │
       └─ promotePrompt('production')
            → prior production: state='archived', isActive=false
            → this version: state='production', isActive=true, canRollback=true
            → tenant_prompt_bindings.activeProductionId updated
       │
       └─ rollbackPrompt(targetVersionId)
            → current production: state='archived', isActive=false
            → target: state='production', isActive=true
            → tenant_prompt_bindings.activeProductionId updated
```

---

## Database Layer

```
prompt_versions               tenant_prompt_bindings
┌─────────────────────┐      ┌───────────────────────────┐
│ isTemplate: true    │      │ tenantId                  │
│ tenantId: null      │      │ productId                 │
│ state: production   │      │ channelType               │
│ (system prompt)     │      │ currentDraftId  ──────────┼─→ prompt_versions._id
└─────────────────────┘      │ activeProductionId ───────┼─→ prompt_versions._id
                             │ pulledTemplateIds ─────────┼─→ [prompt_versions._id, ...]
prompt_versions               └───────────────────────────┘
┌─────────────────────┐
│ isTemplate: false   │      prompt_audit_log
│ tenantId: set       │      ┌───────────────────────────┐
│ state: draft        │      │ promptVersionId ───────────┼─→ prompt_versions._id
│ (tenant prompt)     │      │ action                    │
└─────────────────────┘      │ actor                     │
                             │ changes[]                 │
                             │ context                   │
assistant_channels           │ compliance (7yr TTL)      │
┌─────────────────────┐      └───────────────────────────┘
│ voice config        │
│ chat config         │
│ promptContext       │ ← Java VA PromptAssembler reads here
│ businessHours       │
└─────────────────────┘
```

---

## API Endpoint Map

### Admin — System Prompts (`/api/pms/prompts`)

| Method | Path | Description |
|---|---|---|
| `GET` | `/api/pms/prompts` | List (filter by `isTemplate=true&productId=X`) |
| `POST` | `/api/pms/prompts/drafts` | Create system prompt draft (`isTemplate:true`) |
| `GET` | `/api/pms/prompts/templates/product/:productId` | Templates for a product |
| `GET` | `/api/pms/prompts/templates/:id` | Single template |
| `PUT` | `/api/pms/prompts/:id` | Update (blocked if published system prompt) |
| `POST` | `/api/pms/prompts/:id/versions` | New version / duplicate |
| `POST` | `/api/pms/prompts/:id/promote` | `{ targetState: 'production' }` |
| `GET` | `/api/pms/prompts/:id/versions` | Version history |
| `POST` | `/api/pms/prompts/:id/rollback` | `{ targetVersionId }` |
| `DELETE` | `/api/pms/prompts/:id` | Soft delete |
| `POST` | `/api/pms/prompts/:id/restore` | Restore |

### Tenant — Tenant Prompts (`/api/pms/tenant-prompts`)

| Method | Path | Description |
|---|---|---|
| `GET` | `/api/pms/tenant-prompts/:productId` | List tenant prompts + bindings |
| `POST` | `/api/pms/tenant-prompts/:productId/pull` | Pull delta templates |
| `POST` | `/api/pms/tenant-prompts/:productId/:channel/promote` | Promote draft to production |

All `/api/pms/prompts` endpoints also accessible at `/api/prompts` (same router).

---

## Legacy Collections Removed

| Collection | Status | Reason |
|---|---|---|
| `prompts` | Dropped | Superseded by `prompt_versions` |
| `prompt_templates` | Dropped | Superseded by `prompt_versions` (isTemplate:true) |
| `assistant_channels` | Retained | Java VA service reads at session start |
