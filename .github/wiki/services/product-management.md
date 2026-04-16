# Service: product-management

Context:

- Shared platform UI and API hosting all AI products as integrated modules.
- Frontend (port 5173) serves all product UIs as routes.
- Backend (port 3001) provides shared infrastructure: auth, billing, usage tracking, RAG, and all product API endpoints.
- **Not** a standalone app — all AI product UIs and APIs live here as integrated routes.

Source file/path:

- `product-management/CLAUDE.md`
- `product-management/backend-node/`
- `product-management/frontend/`
- `.ai/skills/code-changes/senior-backend-node-architecture.md`
- `.ai/skills/code-changes/senior-frontend-react-ui-node.md`
- `.ai/skills/code-review/review-backend-express-ts.md`
- `.ai/skills/code-review/review-frontend-react-ts.md`

Last verified date:

- 2026-04-16

Verified commands:

- `cd product-management/backend-node && npx tsc --noEmit -p tsconfig.json`
- `cd product-management/backend-node && npm run build`
- `cd product-management/backend-node && npm test`
- `cd product-management/backend-node && npm run test:coverage`
- `cd product-management/frontend && npx tsc --noEmit -p tsconfig.json`
- `cd product-management/frontend && npm run build`

Repository ownership:

- Git operations for this service belong to the `product-management` repository.
- Workspace root (`.ai/`, `docs/`, `plans/`) is a separate repo — do not mix commits.
- Canonical gRPC proto definitions live in `product-management/backend-node/proto/` and are the shared source for all Java and Python services.

Stack:

- Frontend: React 18 + Vite + TypeScript + Emotion CSS-in-JS (port 5173)
- Backend: Node.js + Express + TypeScript + Mongoose (port 3001)
- Auth: Keycloak + Passport.js + express-session + Redis session store
- Database: MongoDB 7.0, internal port 27017, exposed 27018 via Podman
- Billing: Stripe
- RAG: OpenAI embeddings
- Error tracking: Sentry

Products hosted here:

1. ListingLift — photo staging + listing content generation
2. PropVision — computer vision property classification
3. PropBrief — market intelligence reports
4. ComplianceGuard — Fair Housing compliance
5. DealDesk — commercial RE document processing
6. FieldVoice — agentic voice workflow (planned)
7. TenantLoop — property manager AI assistant

Architecture notes:

- Backend test framework is Jest (not Vitest). Commands are `npm test` and `npm run test:coverage`.
- Auth is Keycloak-backed; session and tenant middleware must remain registered before protected routes.
- Keep `cors` allow-list explicit (`env.CORS_ORIGINS`); no wildcard with credentials.
- Session cookies must stay `httpOnly`; use `secure` in non-local environments.
- ListingLift was migrated from a standalone Next.js app (`ai-realestate/listinglift/`) and is now routes within this platform.

Integration boundaries:

- `ai-listing-agent` delegates orchestration work to `services-java/listing-service` and uses `product-management/backend-node/proto/` for gRPC contracts.
- Proto changes here affect all Java and Python service consumers — treat as a breaking-change risk.
- MongoDB is the primary data store for all platform services; Redis holds session state.

Operational checks:

- Start infra before running backend: `podman-compose up -d` (MongoDB + Redis).
- If auth middleware order changes, re-run security audit: `.ai/skills/security-audit/audit-node-backend.md`.
- If proto contracts change, communicate to all consumer service teams before merging.
- New backend logic requires matching or updated tests; coverage command is `npm run test:coverage`.

Actionable notes:

- Test framework is Jest, not Vitest — do not confuse with `ai-listing-agent` backend which uses Vitest.
- Session and auth middleware order is critical — keep security middleware before protected routes.
- MongoDB port 27018 (Podman-exposed) vs. 27017 (internal) — use 27018 in local dev connection strings.
- gRPC proto source is the canonical reference shared with all downstream services.
- Canonical scripts are in `scripts/` at workspace root; `product-management/scripts/` has been removed.
- Canonical docs are in `docs/` at workspace root; `product-management/docs/` has been consolidated.
