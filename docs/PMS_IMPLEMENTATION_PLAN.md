# Prompt Management System (PMS) - Implementation Plan

## 📋 Executive Summary

Enterprise-grade Prompt Management System with version control, approval workflows, automated testing, and per-prompt RAG capabilities.

**Timeline:** 14 weeks (5 phases + optional Phase 2.5)
**Test Coverage:** 138 automated tests
**Compliance:** HIPAA, SOC2, GDPR

---

## 🎯 Current Status

### ✅ Completed
- [x] Database schema designed (4 PMS collections)
- [x] Collections created with indexes
- [x] Master setup script created
- [x] Architecture documentation complete

### 🔄 In Progress
- [ ] Phase 1: Foundation (Weeks 1-3)

### ⏳ Pending
- [ ] Phase 2: Versioning & Automated Testing (Weeks 4-5)
- [ ] Phase 2.5: RAG Configuration (Weeks 5.5-6.5)
- [ ] Phase 3: Workflow & Approvals (Weeks 7-9)
- [ ] Phase 4: Deployment & A/B Testing (Weeks 9-11)
- [ ] Phase 5: Integration & Compliance (Weeks 12-14)

---

## 🗄️ MongoDB Collections

### Database: `ai_platform`

#### PMS Collections (4 New Collections)

| Collection | Purpose | Indexes | Retention |
|------------|---------|---------|-----------|
| **prompt_versions** | Versioned prompts with RAG config | 6 | 90 days TTL (drafts) |
| **prompt_audit_log** | HIPAA/SOC2/GDPR audit trail | 7 | 7 years |
| **prompt_test_results** | Automated test results | 6 | 1 year |
| **rag_documents** | RAG knowledge base | 5 | Manual |

**Total:** 24 indexes, 3 TTL policies

---

## 📐 Architecture Overview

### 5-Layer Prompt Structure

```javascript
{
  // Layer 1: System Prompt
  systemPrompt: String,

  // Layer 2: Persona
  persona: {
    tone: String,
    personality: String,
    allowedActions: [String],
    disallowedActions: [String]
  },

  // Layer 3: Business Context
  businessContext: {
    servicesOffered: [String],
    pricingInfo: String,
    locations: [{ name, address, city, phone, hours }],
    policies: String,
    faqs: [{ question, answer }]
  },

  // Layer 4: RAG Configuration (Phase 2.5)
  ragConfig: {
    enabled: Boolean,
    vectorStore: { provider, indexName, embedding, autoSync },
    sources: [{ type: "website", config: {...}, chunkSize, chunkOverlap }],
    retrieval: { maxResults, minScore, hybridSearch },
    contextInjection: { position, template, maxTokens }
  },

  // Layer 5: Conversation Behavior
  conversationBehavior: {
    greeting: String,
    fallbackMessage: String,
    intentPrompts: Map<String, String>
  },

  // Layer 6: Constraints
  constraints: {
    prohibitedTopics: [String],
    complianceRules: [String],
    requireConsent: Boolean
  }
}
```

### Workflow State Machine

```
DRAFT → TESTING → STAGING → PRODUCTION → ARCHIVED
  ↑                                ↓
  └────────── ROLLBACK ────────────┘
```

**Approval Requirements:**
- Draft → Testing: 1 TENANT_ADMIN
- Testing → Staging: 1 PROJECT_ADMIN
- Staging → Production: 2 ADMINs (SOC2 compliance)

---

## 🚀 Phase Breakdown

### Phase 1: Foundation (Weeks 1-3)

**Goal:** Core CRUD, basic UI, complete migration

**Deliverables:**
- 4 core collections with indexes ✅
- Node.js `PromptService` (CRUD operations)
- REST API endpoints (5 routes)
- React `PromptEditor` (6-layer form)
- Migration script (old → new schema)
- Auto-save functionality (30s debounce)
- Encryption at rest (MongoDB field-level)

**Gate Tests:** 30 tests
- Database: 9 tests (collections + indexes)
- Service: 5 tests (CRUD + versioning)
- API: 5 tests (endpoints + auth)
- UI: 4 tests (editor + auto-save)
- Integration: 2 tests
- Performance: 2 tests
- Compliance: 3 tests

---

### Phase 2: Versioning & Automated Testing (Weeks 4-5)

**Goal:** Version control + AI-powered prompt testing

**New Features:**
- Version creation logic
- Diff comparison engine
- Side-by-side diff UI
- **Automated Prompt Testing:**
  - Quality tests (clarity, completeness, tone)
  - Safety tests (toxicity, bias, PII detection)
  - Performance tests (token count, cost estimation)
  - AI improvement suggestions (Claude API)

**Testing Tools:**
- OpenAI Moderation API (FREE - toxicity detection)
- Claude API ($0.015/prompt - quality evaluation)
- tiktoken (FREE - token counting)
- Hugging Face models (FREE - bias detection)

**Cost:** ~$30/month for 1000 prompts tested

**Gate Tests:** 25 tests (11 new prompt testing tests)

---

### Phase 2.5: Per-Prompt RAG Configuration (Weeks 5.5-6.5)

**Goal:** Enable custom knowledge sources via RAG

**PRIMARY: Website/URL Scraping**
- Automatically scrape help centers, docs, blogs
- Tools: Cheerio (static), Puppeteer (JS-heavy), Firecrawl (managed)
- Auto-sync: daily/weekly/on-demand
- Crawl depth, domain filtering, rate limiting
- CSS selectors for content extraction

**SECONDARY: Document Upload**
- PDF, DOCX, TXT, HTML, Markdown
- Drag-and-drop interface
- Duplicate detection via checksum

**Vector Stores:**
- Pinecone (recommended - $70/month)
- MongoDB Atlas Vector Search (free tier)
- Qdrant (open source, self-hosted)

**Processing Flow:**
```
URL → Scrape → Clean HTML → Markdown → Chunk → Embed → Vector Store
                                                            ↓
                               User Query → Retrieve → Inject → LLM
```

**Cost:** $22-120/month per prompt (includes scraping + vector store)

**Gate Tests:** 13 tests (RAG-specific)

---

### Phase 3: Workflow & Approvals (Weeks 7-9)

**Goal:** State machine, approval system, notifications

**Features:**
- State transition validation
- Role-based approval logic (SOC2: separation of duties)
- Approval queue UI
- Email/in-app notifications
- Isolated testing environment
- Approval audit trail

**SOC2 Compliance:**
- Mandatory 2-admin approval for production
- Creator cannot approve own changes
- All approvals logged with timestamp, IP, session

**Gate Tests:** 19 tests

---

### Phase 4: Deployment & A/B Testing (Weeks 9-11)

**Goal:** Deployment system with health monitoring

**Features:**
- Deployment service with health checks
- Gradual rollout (traffic percentage)
- A/B test configuration UI
- Statistical significance calculation
- Auto-rollback on error threshold (>5%)
- One-click rollback

**Gate Tests:** 18 tests

---

### Phase 5: Integration & Advanced Features (Weeks 12-14)

**Goal:** Cross-service integration, compliance

**Features:**
- Java va-service integration
- Redis Pub/Sub cache invalidation
- Prompt snapshots in sessions
- GDPR: Data export, right to be forgotten
- HIPAA: Field-level encryption verification
- SOC2: Security monitoring dashboard
- Compliance audit report generation

**Gate Tests:** 21 tests + 15 integration/compliance tests

**FINAL GATE:** All 138 tests must pass

---

## 🔧 Setup Instructions

### New Developer Setup

#### 1. Database Setup
```bash
# Install dependencies
npm install

# Quick setup (creates all collections)
node scripts/mongo/setup-database.js

# OR: Full setup with seed data
node scripts/mongo/setup-database.js --seed
```

#### 2. Verify Collections
```bash
node scripts/mongo/verify-collections.js
```

Expected output:
```
✅ [PMS] prompt_versions        (6 indexes)
✅ [PMS] prompt_audit_log       (7 indexes, 7-year retention)
✅ [PMS] prompt_test_results    (6 indexes, 1-year retention)
✅ [PMS] rag_documents          (5 indexes)
```

#### 3. Start Development

**Backend:**
```bash
cd backend-node
npm install
npm run dev
```

**Frontend:**
```bash
cd frontend
npm install
npm run dev
```

---

## 📚 Documentation Files

| File | Description |
|------|-------------|
| **[RAG_ARCHITECTURE.md](./RAG_ARCHITECTURE.md)** | RAG configuration architecture (per-prompt RAG with URL scraping) |
| **[AGENTIC_FLOWS.md](./AGENTIC_FLOWS.md)** | Optional AI agent enhancements |
| **[luminous-dancing-kazoo.md](../.claude/plans/luminous-dancing-kazoo.md)** | Complete implementation plan (3000+ lines) - original planning file |

---

## 🧪 Testing Strategy

### Phase-Gated Testing

Each phase must pass **ALL** automated tests before proceeding:

```bash
# Phase 1 gate
npm run test:gate:phase1    # 30 tests

# Phase 2 gate
npm run test:gate:phase2    # 25 tests

# Phase 2.5 gate
npm run test:gate:phase2.5  # 13 tests

# Phase 3 gate
npm run test:gate:phase3    # 19 tests

# Phase 4 gate
npm run test:gate:phase4    # 18 tests

# Final gate (all phases)
npm run test:gate:final     # 138 tests
```

### Test Layers

1. **Database Layer** - Collections, indexes, TTL policies
2. **Service Layer** - Business logic, CRUD operations
3. **API Layer** - REST endpoints, authentication, RBAC
4. **UI Layer** - Components, forms, workflows
5. **Integration Layer** - Cross-service communication
6. **Performance Layer** - Latency, throughput benchmarks
7. **Compliance Layer** - HIPAA, SOC2, GDPR requirements

---

## 🔐 Compliance Features

### HIPAA (Healthcare)
- ✅ Encryption at rest (MongoDB field-level)
- ✅ 7-year audit retention
- ✅ Access tracking (IP, session, user)
- ✅ PHI handling in prompts

### SOC2 (Security/Trust)
- ✅ Change management procedures
- ✅ Separation of duties (2-admin approval)
- ✅ Security monitoring dashboard
- ✅ Incident response (rollback)

### GDPR (Privacy)
- ✅ Right to be forgotten (data deletion)
- ✅ Data export API
- ✅ Consent tracking
- ✅ Data classification

---

## 💰 Cost Analysis

### Infrastructure Costs

| Component | Cost | Notes |
|-----------|------|-------|
| MongoDB Atlas | $0-57/month | Free tier or M10 |
| Redis Cache | $0-15/month | Self-hosted or cloud |
| **Phase 2: Testing** | ~$30/month | 1000 prompts tested |
| **Phase 2.5: RAG** | $22-120/prompt/month | Vector store + scraping |
| Total (without RAG) | ~$45/month | Base system |
| Total (with RAG, 10 prompts) | ~$500/month | Includes scraping |

### Per-Operation Costs

- Prompt test: $0.03 (hybrid approach)
- RAG query: $0.002 (embedding + search)
- Document scraping: Free (Cheerio) or $0.003/page (Firecrawl)

---

## 🎯 Success Metrics

| Metric | Target |
|--------|--------|
| Prompt retrieval (cached) | < 5ms |
| Prompt retrieval (uncached) | < 50ms |
| Version creation | < 100ms |
| Cache invalidation propagation | < 1 sec |
| Test coverage | > 80% |
| Deployment success rate | > 99% |
| Rollback time (MTTR) | < 5 min |

---

## 🚦 Implementation Checklist

### Phase 1: Foundation
- [ ] Create Node.js `PromptService`
- [ ] Implement REST API routes
- [ ] Build React `PromptEditor` (6 layers)
- [ ] Add auto-save functionality
- [ ] Implement encryption at rest
- [ ] Create migration script
- [ ] Pass 30 gate tests ✅

### Phase 2: Versioning & Testing
- [ ] Version creation logic
- [ ] Diff comparison engine
- [ ] Automated testing service
- [ ] AI improvement suggestions
- [ ] Test results UI
- [ ] Pass 25 gate tests ✅

### Phase 2.5: RAG Configuration
- [ ] Website scraping service (Cheerio/Puppeteer)
- [ ] Document upload service
- [ ] Vector store integration (Pinecone)
- [ ] RAG configuration UI
- [ ] Sync scheduler (cron jobs)
- [ ] Pass 13 gate tests ✅

### Phase 3: Workflow
- [ ] State machine implementation
- [ ] Approval system
- [ ] Notification service
- [ ] Approval queue UI
- [ ] Pass 19 gate tests ✅

### Phase 4: Deployment
- [ ] Deployment service
- [ ] Health monitoring
- [ ] A/B testing framework
- [ ] Rollback system
- [ ] Pass 18 gate tests ✅

### Phase 5: Integration
- [ ] Java service integration
- [ ] Redis Pub/Sub
- [ ] GDPR compliance
- [ ] SOC2 monitoring
- [ ] Pass 36 final tests ✅

---

## 🆘 Troubleshooting

### Database Issues

**Collections not found:**
```bash
node scripts/mongo/setup-database.js
```

**Indexes missing:**
```bash
node scripts/mongo/create-pms-collections.js
```

**Verify setup:**
```bash
node scripts/mongo/verify-collections.js
```

### Migration Issues

**Old collections still exist:**
1. Verify new collections have data
2. Run migration verification
3. Manually drop old collections (caution!)

---

## 📞 Support

**Documentation:**
- Main plan: [PMS_IMPLEMENTATION_PLAN.md](./PMS_IMPLEMENTATION_PLAN.md) (this file)
- RAG architecture: [RAG_ARCHITECTURE.md](./RAG_ARCHITECTURE.md)
- Agentic flows: [AGENTIC_FLOWS.md](./AGENTIC_FLOWS.md)

**Scripts:**
- Setup: `scripts/mongo/setup-database.js`
- Verify: `scripts/mongo/verify-collections.js`
- Create: `scripts/mongo/create-pms-collections.js`

---

## 📝 Notes

- **Migration:** Old `prompt_templates` and `assistant_channels` will be fully migrated to `prompt_versions` in Phase 1
- **Zero Downtime:** Migration runs offline, verified before deletion
- **No Backward Compatibility:** New PMS is the only system going forward
- **Optional Features:** Agentic flows (3 AI agents) can be added post-launch

---

**Last Updated:** 2026-02-02
**Version:** 1.0.0
**Status:** Phase 0 Complete (Database Setup) ✅
