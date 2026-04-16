# AI Services Platform — Copilot Instructions

Multi-tenant SaaS platform for AI-powered real estate products. Multiple AI product modules share a common auth, billing, usage tracking, and RAG infrastructure.

## Repository Layout

This workspace contains several **independent product repositories** plus a workspace-root repo for shared tooling:

| Path | Type | Port |
|---|---|---|
| `product-management/` | React frontend + Express/MongoDB backend | 5173 / 3001 |
| `ai-listing-agent/` | React frontend + Express/MongoDB backend | 5174 / 3002 |
| `services-java/listing-service` | Spring Boot 4 agentic service (LangChain4j) | 8137 |
| `services-java/va-service` | Spring Boot 4 voice-assistant service | 8136 |
| `services-python/` | Flask ML inference (Whisper / Vision) | 8000 / 8001 |
| `shared/` | Shared TypeScript types | — |
| `docs/` | All platform documentation (canonical) | — |
| `scripts/` | All platform utility scripts (canonical) | — |

**Never mix commits from different repositories.** Each repo has its own history, branches, and PR lifecycle.

## Tech Stack

- **Frontend:** React 18, TypeScript, Vite, React Router, Axios, WebSockets
- **Backend Node:** Node.js, Express, TypeScript, Passport.js, OAuth2, gRPC, Redis sessions, MongoDB (Mongoose)
- **Backend Java:** Spring Boot 4.0.1, Java 21, LangChain4j, Spring Data MongoDB, gRPC
- **Database:** MongoDB 7.0 (port 27018 host → 27017 container), Redis
- **Auth:** Google OAuth2, express-session, Keycloak (SSO), JWT
- **Infra:** Podman Compose (`podman-compose.yml` at workspace root)

## Governance Structure

All durable governance lives under **`.ai/`** (model-agnostic canonical source):

```
.ai/
  rules/      ← quality gate rules (15 rules, numbered)
  skills/     ← implementation + review + security-audit skills
  wiki/       ← concise project knowledge (services, runbooks, decisions)
  hooks/      ← pre-commit secret-scan hook (canonical source)
  agents/     ← agent definitions
  commands/   ← reusable commands
```

`.claude/` is the **Claude runtime adapter** — kept in sync with `.ai/` via:
```powershell
npm run ai:sync      # sync .ai → .claude
npm run ai:sync:auto # auto-detect .ai changes; sync .claude and skills mirrors as needed
npm run ai:validate  # verify zero drift
```

**Edit `.ai/` first. Never edit `.claude/` directly.**

## Session Startup Path (Knowledge Retrieval)

Before writing code, check in this order (stop when you have enough context):

1. Relevant `/memories/repo/` note
2. `.ai/wiki/index.md`
3. Matching service page: `.ai/wiki/services/<service>.md`
4. Matching runbook or rule
5. Source files only if the above leaves a gap

## Development Guidelines

- TypeScript strict mode everywhere (`strict: true`)
- Function components and React hooks for all frontend work
- Route handlers thin; business logic in services
- Constructor injection in Java; no hidden global state
- `async/await` with explicit error handling — no silent catch blocks
- All sensitive values from environment variables only — never hardcoded
- `tenantId` required and indexed on every tenant-scoped MongoDB document
- Run quality gates after every change: syntax → compile → tests → coverage → security checklist

## Quality Gates (run only for affected tier)

```powershell
# TypeScript syntax
Set-Location ai-listing-agent/frontend; npx tsc --noEmit -p tsconfig.json
Set-Location ai-listing-agent/backend-node; npx tsc --noEmit -p tsconfig.json
Set-Location product-management/frontend; npx tsc --noEmit -p tsconfig.json
Set-Location product-management/backend-node; npx tsc --noEmit -p tsconfig.json

# Java compile
Set-Location services-java/listing-service; ./mvnw -q -DskipTests compile
Set-Location services-java/va-service; ./mvnw -q -DskipTests compile

# Build
Set-Location ai-listing-agent/frontend; npm run build
Set-Location ai-listing-agent/backend-node; npm run build

# Tests
Set-Location ai-listing-agent/frontend; npm test
Set-Location ai-listing-agent/backend-node; npm test
Set-Location services-java/listing-service; ./mvnw test
Set-Location services-java/va-service; ./mvnw test
```

## Security

- No secrets, tokens, or credentials in committed files
- Pre-commit hook enforces secret scanning: canonical source at `.ai/hooks/pre-commit`
- Install hooks: `./scripts/install-hooks.ps1`
- CORS allow-list explicit; never wildcard with credentials
- Auth/session middleware registered before all protected routes
- Input validation on all external-facing request payloads
- Tenant boundary checks required on every data access operation

## Key Rules (always active)

Full rules in `.ai/rules/`. High-priority ones:

- `04-security-standards.md` — auth, secrets, tenant boundaries, input validation
- `10-repository-boundaries-and-change-scope.md` — git scope per repo
- `11-database-data-layer-standards.md` — MongoDB schema, indexes, migrations
- `15-no-secrets-in-git.md` — secret scan patterns and hook procedure

