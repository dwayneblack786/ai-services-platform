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
             