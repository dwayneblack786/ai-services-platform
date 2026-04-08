# Product Management

Control plane for tenant onboarding, product configuration, subscriptions, and shared authentication orchestration.

## Local Development

### 1. Start local dependencies

From this folder:

```bash
docker compose up -d
```

If you use Podman Compose:

```bash
podman-compose up -d
```

This starts:
- MongoDB on `localhost:27017`
- Redis on `localhost:6379`

### 2. Start backend

```bash
cd backend-node
npm install
npm run dev
```

Expected backend URL: `http://localhost:5000`

### 3. Start frontend

```bash
cd frontend
npm install
npm run dev
```

Expected frontend URL: `http://localhost:5173`

## Required Backend Environment

Use `backend-node/.env.integrated.example` as a base for `.env`.

Minimum values to verify:
- `MONGODB_URI=mongodb://localhost:27017/ai_platform`
- `REDIS_URL=redis://localhost:6379`
- Keycloak values (`KEYCLOAK_URL`, `KEYCLOAK_CLIENT_ID`, `KEYCLOAK_REDIRECT_URI`)

## Migration Note

This folder is being made self-contained. Runtime imports from repo-root shared runtime files are being removed in phases.

## Local Auth Tooling

Keycloak setup and tenant seed scripts are available under:
- `product-management/scripts/keycloak/setup-keycloak.ps1`
- `product-management/scripts/keycloak/seed-tenants.ts`

## Migration Guardrail

To verify product-management backend source/tests do not import root shared runtime files:

```bash
cd backend-node
npm run validate:no-root-imports
```
