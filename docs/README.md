# Documentation Index

## 📚 Project Documentation

### Prompt Management System (PMS)

#### 🎯 **[PMS Implementation Plan](./PMS_IMPLEMENTATION_PLAN.md)** ⭐
**Main project documentation** - Start here!
- 5-phase implementation plan (14 weeks)
- Database schema and architecture
- 138 automated tests (includes RAG + automated testing)
- Setup instructions for new developers
- Compliance features (HIPAA, SOC2, GDPR)
- Phase 2.5: Per-prompt RAG with URL scraping

#### 📖 Additional Resources

**Detailed Architecture Docs:**
- [RAG Architecture](./RAG_ARCHITECTURE.md) - Per-prompt RAG with URL scraping (PRIMARY)
- [Agentic Flows](./AGENTIC_FLOWS.md) - Optional AI agent enhancements

**Planning Files** (in .claude/plans):
- [Complete Implementation Plan](../.claude/plans/luminous-dancing-kazoo.md) - 3000+ lines, all phases in detail

---

## 🔧 Quick Start

### New Developer Setup

1. **Read the plan:**
   ```bash
   cat docs/PMS_IMPLEMENTATION_PLAN.md
   ```

2. **Setup database:**
   ```bash
   node scripts/mongo/setup-database.js --seed
   ```

3. **Verify collections:**
   ```bash
   node scripts/mongo/verify-collections.js
   ```

4. **Start development:**
   - Backend: `cd backend-node && npm run dev`
   - Frontend: `cd frontend && npm run dev`

---

## 📊 Project Status

**Current Phase:** Phase 0 - Database Setup ✅

**Completed:**
- ✅ Database schema designed
- ✅ 4 PMS collections created
- ✅ 24 indexes configured
- ✅ Master setup script

**Next Steps:**
- 🔄 Phase 1: Foundation (Weeks 1-3)
  - Node.js PromptService
  - REST API routes
  - React PromptEditor
  - Migration from old system

---

## 🗂️ Document Organization

```
docs/
├── README.md (this file)
├── PMS_IMPLEMENTATION_PLAN.md ⭐ Start here
│
../.claude/plans/ (Detailed plans)
├── luminous-dancing-kazoo.md (Full plan - 3000+ lines)
├── rag-architecture.md (RAG configuration details)
└── agentic-flows-supplement.md (Optional AI agents)
```

---

## 🎯 Key Features

### Phase 1: Foundation
- Version control for prompts
- 6-layer prompt structure
- Migration from old system
- Encryption at rest

### Phase 2: Automated Testing
- AI-powered quality evaluation
- Safety tests (toxicity, bias, PII)
- Performance analysis
- Improvement suggestions

### Phase 2.5: RAG Configuration ⭐
- **URL/Website scraping** (PRIMARY)
- Document upload (secondary)
- Vector stores (Pinecone, MongoDB Atlas, Qdrant)
- Auto-sync scheduling

### Phase 3: Workflow
- Approval system
- State machine (Draft → Testing → Staging → Production)
- SOC2 compliance (2-admin approval)

### Phase 4: Deployment
- Health monitoring
- A/B testing
- Auto-rollback
- Gradual rollout

### Phase 5: Integration
- Cross-service cache invalidation
- GDPR compliance
- Security monitoring

---

## 📞 Support

**For detailed implementation questions:**
- See [PMS_IMPLEMENTATION_PLAN.md](./PMS_IMPLEMENTATION_PLAN.md)
- Review phase-specific sections in [luminous-dancing-kazoo.md](../.claude/plans/luminous-dancing-kazoo.md)

**For RAG/URL scraping questions:**
- See [RAG Architecture](./RAG_ARCHITECTURE.md)

**For agentic AI enhancements:**
- See [Agentic Flows](./AGENTIC_FLOWS.md)

---

**Last Updated:** 2026-02-02
