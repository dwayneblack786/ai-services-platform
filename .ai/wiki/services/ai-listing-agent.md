# Service: ai-listing-agent

Context:

- Product workspace for ListingLift / PropPulse Studio.
- Frontend runs on port 5174 and backend runs on port 3002.
- Backend is the UI/API layer only — heavy orchestration is delegated to `services-java/listing-service`.
- Active development per April 2026 Modernization Plan: public homepage, pipeline tracking UI, human-in-the-loop UI, bulk upload, metrics dashboard.

Source file/path:

- `ai-listing-agent/CLAUDE.md`
- `ai-listing-agent/MODERNIZATION_PLAN.md`
- `ai-listing-agent/backend-node/`
- `ai-listing-agent/frontend/`
- `.ai/skills/code-changes/senior-backend-node-architecture.md`
- `.ai/skills/code-changes/senior-frontend-react-ui-node.md`
- `.ai/skills/code-review/review-backend-express-ts.md`
- `.ai/skills/code-review/review-frontend-react-ts.md`

Last verified date:

- 2026-04-16

Verified commands:

- `cd ai-listing-agent/backend-node && npx tsc --noEmit -p tsconfig.json`
- `cd ai-listing-agent/backend-node && npm run build`
- `cd ai-listing-agent/backend-node && npm test`
- `cd ai-listing-agent/backend-node && npm run coverage`
- `cd ai-listing-agent/frontend && npx tsc --noEmit -p tsconfig.json`
- `cd ai-listing-agent/frontend && npm run build`
- `cd ai-listing-agent/frontend && npm test`

Repository ownership:

- Git operations for this service belong to the `ai-listing-agent` repository.
- Do not mix workspace root (`.ai/`) changes in an `ai-listing-agent` commit.

Stack:

- Frontend: React 18 + Vite + TypeScript (port 5174)
- Backend: Node.js + Express + TypeScript + MongoDB (port 3002)
- Auth: tenant-aware Keycloak redirect flow via shared platform
- Test framework: **Vitest** (not Jest) — `npm test` and `npm run coverage`

Service topology:

```
Frontend (5174) → Backend (3002) → Platform Management (5000)
                               → Java Listing Service (8137)
```

Listing pipeline:

```
Photos → Ingest → Vision → Auto-Fill → [HUMAN REVIEW] → Copywriter → Compliance → [HUMAN REVIEW] → Accept & Store
```

Architecture notes:

- Product code name: **PropPulse Studio**
- Keep route handlers thin; business logic belongs in `src/services/`.
- Use `src/config/env.ts` for runtime config — never direct `process.env` access in route or service files.
- Circuit breaker behavior has automated tests in `src/services/circuitBreaker.test.ts`.
- Human review gates are required after Auto-Fill and after Compliance — do not bypass in automation.

Integration boundaries:

- This backend is the UI/API delegation layer; orchestration logic lives in `services-java/listing-service`.
- Auth and tenancy are provided by the shared platform (`product-management` backend on port 3001 / platform management on port 5000).
- MongoDB is shared with the platform; use `tenantId` on all tenant-scoped documents.

Operational checks:

- Start platform infra before this service: `podman-compose up -d`.
- After route handler changes, re-run backend syntax and tests before merging.
- Coverage command is `npm run coverage` — required for any changed logic paths.
- If human review gate logic changes, confirm both Auto-Fill and Compliance gate behavior in tests.

Actionable notes:

- Test framework is Vitest — different from `product-management` backend which uses Jest.
- `src/config/env.ts` is the config gateway — centralize all env access there.
- Circuit breaker tests are the safety net for service fault tolerance; keep them green.
- Good retrieval path for new work: repo memory → this service page → one runbook → source code only if still needed.