──────────────────────────────────────────────────────────────
                 AI SERVICES PLATFORM ARCHITECTURE
──────────────────────────────────────────────────────────────

                    ┌───────────────────────────┐
                    │     Client Applications    │
                    │  - Web Portal              │
                    │  - Mobile App              │
                    │  - CRM/ERP Integrations    │
                    └──────────────┬────────────┘
                                   │
                    ┌──────────────┴────────────┐
                    │     API Gateway Layer      │
                    │  - Authentication (OAuth)  │
                    │  - Rate Limiting           │
                    │  - Routing & Load Balancing│
                    └──────────────┬────────────┘
                                   │
     ┌─────────────────────────────┼─────────────────────────────┐
     │                             │                             │
┌────┴─────┐                ┌─────┴─────┐                ┌─────┴─────┐
│ Virtual   │                │ Document   │                │ Image       │
│ Assistant │                │ Processing │                │ Processing  │
│ Services  │                │ (IDP)      │                │ (CV)        │
│ - NLP/NLU │                │ - OCR      │                │ - Vision AI │
│ - Dialog  │                │ - NLP      │                │ - Detection │
└────┬──────┘                └─────┬──────┘                └─────┬──────┘
     │                             │                             │
     └───────────────┬─────────────┴───────────────┬────────────┘
                     │                             │
             ┌───────┴────────┐           ┌────────┴────────┐
             │  Shared AI/ML   │           │ Workflow Engine  │
             │  - Model Store  │           │  - Orchestration │
             │  - Fine‑Tuning  │           │  - Automation    │
             │  - Vector DB    │           │  - Triggers      │
             └───────┬────────┘           └────────┬────────┘
                     │                             │
             ┌───────┴────────┐           ┌────────┴────────┐
             │ Data Layer      │           │ Analytics Layer  │
             │ - SQL/NoSQL DB  │           │ - Dashboards     │
             │ - Object Store  │           │ - KPIs/Insights  │
             │ - Logs/Events   │           │ - Forecasting    │
             └───────┬────────┘           └────────┬────────┘
                     │                             │
             ┌───────┴────────┐           ┌────────┴────────┐
             │ Infrastructure   │           │ Security Layer   │
             │ - Kubernetes     │           │ - IAM            │
             │ - Serverless     │           │ - Encryption     │
             │ - CDN            │           │ - Compliance     │
             └──────────────────┘           └──────────────────┘
             

## Documentation

### 🗺️ Documentation Guide
- **[Documentation Map](DOCUMENTATION_MAP.md) - Visual guide to all Spring AI Agent documentation**

### Architecture & Design
- [Repository Structure](RepositoryStrucutre.md) - Complete folder structure and organization
- [Chat Message Architecture](CHAT_MESSAGE_ARCHITECTURE.md) - Session-based MongoDB schema
- [Circuit Breaker Implementation](../backend-node/CIRCUIT_BREAKER_IMPLEMENTATION.md) - Fault tolerance guide
- [Redis Implementation Guide](REDIS_IMPLEMENTATION_GUIDE.md) - Session storage and caching

### Spring AI Agent (NEW)
- **[Spring AI Agent Implementation](SPRING_AI_AGENT_IMPLEMENTATION.md) - ⭐ Start here - Complete overview**
- **[Provider-Agnostic Design](PROVIDER_AGNOSTIC_DESIGN.md) - Why LM Studio + Azure is perfect**
- **[Azure Deployment Guide](AZURE_DEPLOYMENT_GUIDE.md) - Production deployment instructions**
- **[Quick Start Guide](../services-java/va-service/QUICKSTART.md) - Get started in 5 minutes**

### Product & Requirements
- [Optimized Technical Requirements](Optimized%20Technical%20Requirements.docx)
- [Phased Product Rollout Strategy](Phased%20Product%20Rollout%20Strategy.docx)
- [Technical Requirements Document](Technical%20requirements%20document.docx)
- [AI Services Product Roadmap Timeline](📅%20AI%20Services%20Product%20Roadmap%20Timeline.docx)
- [AI Product Roadmap](ai%20product%20roadman.docx)