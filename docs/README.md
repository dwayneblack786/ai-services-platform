# Documentation Index

**Canonical location for all platform documentation.** Docs from all repos are consolidated here.

> All docs now live in this `docs/` folder (workspace root). The former `product-management/docs/` has been merged here. Do not create doc files in tier repos.

---

## Structure

| Folder | Purpose |
|--------|---------|
| `docs/platform/` | Stable, platform-wide architecture standards and implementation patterns |
| `docs/archive/` | Historical phase/status/completion reports — reference only, not current runbooks |
| `docs/*.md` | Active domain/topic docs (auth, voice, WebSocket, deployment, etc.) |

---

## Platform Standards (start here)

| Doc | Purpose |
|-----|---------|
| [API Design Standards](./platform/API_DESIGN_STANDARDS.md) | REST conventions, versioning, error shapes |
| [API Testing Guide](./platform/API_TESTING_GUIDE.md) | Integration and contract testing approach |
| [Backend Architecture](./platform/BACKEND_ARCHITECTURE.md) | Express/Node.js tier structure |
| [Backend Debugging Strategies](./platform/BACKEND_DEBUGGING_STRATEGIES.md) | Debugging runbook for Node/Java tiers |
| [Batch Processing](./platform/BATCH_PROCESSING.md) | Long-running job patterns |
| [Caching Strategies](./platform/CACHING_STRATEGIES.md) | Redis cache usage and TTL policy |
| [Database Patterns](./platform/DATABASE_PATTERNS.md) | Mongoose patterns, index strategy, aggregations |
| [Error Handling Patterns](./platform/ERROR_HANDLING_PATTERNS.md) | Cross-tier error normalization |
| [External APIs](./platform/EXTERNAL_APIS.md) | Claude, OpenAI, Replicate, Stripe integration patterns |
| [Frontend Architecture](./platform/FRONTEND_ARCHITECTURE.md) | React + Vite + Router structure |
| [gRPC Implementation](./platform/GRPC_IMPLEMENTATION.md) | Proto contracts, stub generation, service wiring |
| [Hooks Conventions](./platform/HOOKS_CONVENTIONS.md) | React hooks naming and pattern conventions |
| [Middleware Guide](./platform/MIDDLEWARE_GUIDE.md) | Express middleware order and responsibilities |
| [Multi-Channel Tenant Isolation](./platform/MULTI_CHANNEL_TENANT_ISOLATION.md) | Tenant boundary enforcement patterns |
| [Routing Patterns](./platform/ROUTING_PATTERNS.md) | React Router conventions |
| [Security Architecture](./platform/SECURITY_ARCHITECTURE.md) | Auth, session, tenant, CORS, secrets |
| [Service Patterns](./platform/SERVICE_PATTERNS.md) | Service layer conventions (thin controllers, business logic in services) |
| [State Management](./platform/STATE_MANAGEMENT.md) | React state and context patterns |
| [Testing Guide](./platform/TESTING_GUIDE.md) | Vitest / JUnit test writing conventions |
| [Testing Strategy](./platform/TESTING_STRATEGY.md) | Coverage philosophy, test pyramid, gate expectations |
| [Troubleshooting](./platform/TROUBLESHOOTING.md) | Common cross-tier issues and quick fixes |

---

## Auth / Identity / SSO

- [SSO Implementation Guide](./SSO_IMPLEMENTATION_GUIDE.md)
- [SSO Architecture Verification](./SSO_ARCHITECTURE_VERIFICATION.md)
- [SSO Setup Guide](./SSO_SETUP_GUIDE.md)
- [SSO Quick Reference](./SSO_QUICK_REFERENCE.md)
- [Keycloak Implementation Guide](./KEYCLOAK_IMPLEMENTATION_GUIDE.md)
- [Keycloak Migration Checklist](./KEYCLOAK_MIGRATION_CHECKLIST.md)
- [Keycloak Quickstart](./KEYCLOAK_QUICKSTART.md)
- [Keycloak README](./KEYCLOAK_README.md)
- [Authentication Architecture](./AUTHENTICATION_ARCHITECTURE.md)
- [Secure Authentication](./SECURE_AUTHENTICATION.md)
- [Tenant Access Control](./TENANT_ACCESS_CONTROL.md)
- [Tenant First Login Flow](./TENANT_FIRST_LOGIN_FLOW.md)
- [Local Testing and OAuth](./LOCAL_TESTING_AND_OAUTH.md)

---

## Voice / Streaming / WebSocket

- [Voice Endpoints Architecture](./VOICE_ENDPOINTS_ARCHITECTURE.md)
- [Voice Greeting Implementation](./VOICE_GREETING_IMPLEMENTATION.md)
- [Voice Dev Setup](./VOICE-DEV-SETUP.md)
- [Voice Configuration](./VOICE-CONFIGURATION.md)
- [Voice Streaming](./VOICE-STREAMING.md)
- [WebSocket Configuration](./WEBSOCKET_CONFIGURATION.md)
- [WebSocket Implementation](./WEBSOCKET_IMPLEMENTATION.md)
- [WebSocket Detailed Flow](./WEBSOCKET_DETAILED_FLOW.md)
- [WebSocket Quick Start](./WEBSOCKET_QUICK_START.md)
- [VoIP Integration Architecture](./VOIP_INTEGRATION_ARCHITECTURE.md)
- [STT-TTS Implementation Plan](./STT-TTS-IMPLEMENTATION-PLAN.md)
- [Assistant Channels](./ASSISTANT_CHANNELS.md)

---

## MongoDB / Data Layer

- [MongoDB Changes Summary](./MONGODB_CHANGES_SUMMARY.md)
- [Schema Consolidation](./SCHEMA_CONSOLIDATION.md)
- [Session Management](./SESSION_MANAGEMENT.md)
- [mongo.md](./mongo.md)

---

## Deployment / Infrastructure

- [Deployment Checklist](./DEPLOYMENT_CHECKLIST.md)
- [Azure Deployment Guide](./AZURE_DEPLOYMENT_GUIDE.md)
- [Developer Setup](./DEVELOPER_SETUP.md)
- [Workspace Bootstrap Checklist](./WORKSPACE_BOOTSTRAP_CHECKLIST.md)
- [Scripts Reference](./SCRIPTS_REFERENCE.md)

---

## Project Overview and Architecture

- [Project Overview](./PROJECT_OVERVIEW.md)
- [Root Ownership Map](./ROOT_OWNERSHIP_MAP.md)
- [Repository Structure](./RepositoryStrucutre.md)
- [Agentic Flows](./AGENTIC_FLOWS.md)
- [RAG Architecture](./RAG_ARCHITECTURE.md)
- [Spring AI Agent Implementation](./SPRING_AI_AGENT_IMPLEMENTATION.md)
- [High-Level Assistant Architecture](./high-level-assistant-arch.md)

---

## Archive

Historical phase completion snapshots — do not use as current runbooks:

- `docs/archive/`

