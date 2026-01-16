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

### Architecture & Design
- [Repository Structure](RepositoryStrucutre.md) - Complete folder structure and organization
- [Chat Message Architecture](CHAT_MESSAGE_ARCHITECTURE.md) - Session-based MongoDB schema
- [Circuit Breaker Implementation](../backend-node/CIRCUIT_BREAKER_IMPLEMENTATION.md) - Fault tolerance guide
- [Redis Implementation Guide](REDIS_IMPLEMENTATION_GUIDE.md) - Session storage and caching

### Product & Requirements
- [Optimized Technical Requirements](Optimized%20Technical%20Requirements.docx)
- [Phased Product Rollout Strategy](Phased%20Product%20Rollout%20Strategy.docx)
- [Technical Requirements Document](Technical%20requirements%20document.docx)
- [AI Services Product Roadmap Timeline](📅%20AI%20Services%20Product%20Roadmap%20Timeline.docx)
- [AI Product Roadmap](ai%20product%20roadman.docx)