# Service: product-management

Context:

- Shared platform UI and API hosting all AI products as integrated modules.
- Frontend (port 5173) serves all product UIs as routes.
- Backend (port 3001) provides shared infrastructure: auth, billing, usage tracking, RAG, and all product API endpoints.

Source file/path:

- `product-management/CLAUDE.md`
- `product-management/backend-node/package.json`

Last verified date:

- 2026-04-16

Verified commands:

- `cd product-management/backend-node && npx tsc --noEmit -p tsconfig.json`
- `cd product-management/backend-node && npm run build`
- `cd product-management/backend-node && npm test`
- `cd product-management/frontend && npx tsc --noEmit -p tsconfig.json`
- `cd product-management/frontend && npm run build`

Actionable notes:

- Canonical gRPC proto definitions live in `product-management/backend-node/proto/` and are shared with Java and Python services.
- MongoDB runs on port 27018 via Podman (`podman-compose up -d`).
- Backend uses Jest (not Vitest) — test commands are `npm test`, `npm run test:coverage`.
- Auth is Keycloak-backed; session and tenant middleware must remain registered before protected routes.
- ListingLift features are integrated here as routes, not as a standalone app.
