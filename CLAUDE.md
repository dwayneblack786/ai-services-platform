# AI Services Platform

## What This Is
A multi-tenant SaaS platform for AI-powered products targeting real estate SMBs. The platform provides shared infrastructure (auth, billing, usage tracking, RAG) and hosts multiple AI products as integrated modules.

## Architecture

### Monorepo Layout
```
ai-services-platform/
├── product-management/
│   ├── frontend/          # React + Vite + TypeScript (port 5173)
│   └── backend-node/      # Express + MongoDB + TypeScript (port 3001)
├── services-java/
│   ├── listing-service/   # ListingLift agent pipeline — Spring Boot + LangChain4j
│   ├── cv-service/        # Computer Vision gateway — Spring Boot
│   ├── fieldvoice-service/ # FieldVoice agentic workflow — Spring Boot (planned)
│   ├── idp-service/       # Identity Provider — Spring Boot
│   └── common-libs/       # Shared Java utilities
├── services-python/
│   ├── whisper-server/    # Speech-to-text — Flask + Whisper (port 8000)
│   ├── vision-server/     # PropVision DINOv2 — Flask + PyTorch (port 8001)
│   └── listing-agents/    # LangGraph multi-agent pipeline (port 8002)
├── plans/                 # Implementation plans by phase
└── podman-compose.yml     # MongoDB 7.0 (port 27018), Redis
```

### Key Decisions
- **Standalone product architecture** — Each product follows a consistent stack: React + Vite + TypeScript frontend, Express + MongoDB + TypeScript backend, linked to a Java Spring Boot service for agentic workflow fulfillment. Products are hosted as integrated modules sharing platform infrastructure (auth, billing, usage tracking, RAG).
- **ListingLift is NOT a standalone app.** It was originally in `ai-realestate/listinglift/` (Next.js) but is being integrated into this platform as a product. All ListingLift features become routes/services within the platform backend + frontend.
- **LangChain4j (Java)** for agent orchestration within Java services. The `services-python/listing-agents/` directory is a reference stub only.
- **Chat VA removed.** The `va-service` (chat-based virtual assistant) is being removed from `product-management`. The voice virtual assistant is converted into **FieldVoice** — a dedicated agentic AI workflow product following the standard product stack pattern. Details TBD at implementation time.
- **DINOv2 ViT-B/14** for property photo classification (PropVision). Trained locally on RTX 3090 Ti (24GB VRAM).
- **MongoDB** is the default data store. The listing pipeline supports configurable data stores (MongoDB, PostgreSQL, S3) per tenant.
- **Human-in-the-loop** review gates in the listing agent pipeline (after auto-fill and after compliance).

### Product Suite (Real Estate AI)
1. **ListingLift** — Photo staging + listing content generation
2. **PropVision** — Computer vision property attribute classification (also standalone API)
3. **PropBrief** — Market intelligence reports
4. **ComplianceGuard** — Fair Housing compliance
5. **DealDesk** — Commercial real estate document processing
6. **FieldVoice** — Agentic AI voice workflow for inbound call handling, lead qualification, and appointment scheduling (voice VA converted to agentic pipeline)
7. **TenantLoop** — Property manager AI assistant

### Listing Pipeline (Sequential Multi-Agent)
```
Photos → Ingest → Vision → Auto-Fill → [HUMAN REVIEW] → Copywriter → Compliance → [HUMAN REVIEW] → Accept & Store
```

### External Services
- **Claude API** (Anthropic) — LLM backbone (Sonnet for quality, Haiku for speed)
- **OpenAI API** — Embeddings for RAG
- **Replicate API** — Flux 1.1 Pro for virtual staging
- **Stripe** — Payments
- **Keycloak** — SSO/identity
- **Sentry** — Error tracking

## Conventions
- Python services follow the `whisper-server` pattern: Flask + base64 I/O + `/health` endpoint
- gRPC protos go in `product-management/backend-node/proto/` and each Python service's `proto/` dir
- Java services use Spring Boot 4.0.1
- Node.js backend uses Express + Mongoose + TypeScript
- Frontend uses React + Vite + TypeScript + Emotion CSS-in-JS
- Container orchestration via Podman Compose

## Running Locally
```bash
# MongoDB
podman-compose up -d

# Node.js backend
cd product-management/backend-node && npm run dev

# React frontend
cd product-management/frontend && npm run dev

# Whisper server
cd services-python/whisper-server && python server.py

# Vision server (once trained)
cd services-python/vision-server && python server.py
```

## Plans
Implementation plans are stored in `plans/` directory, broken down by phase:
- `plans/phase-1-dinov2-training-pipeline.md` — DINOv2 model training
- Master plan: `.claude/plans/curried-bouncing-dolphin.md`
