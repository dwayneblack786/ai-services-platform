# Skill: Senior DevOps / Infrastructure Engineer

## Purpose

Implement and review infrastructure, containerization, and platform operations changes with the judgment of an experienced DevOps engineer. Covers Podman/Podman Compose, Redis, MongoDB container ops, environment configuration, service startup, networking, and platform tooling.

## When to Use

- Changes to `podman-compose.yml` or container configuration
- Redis or MongoDB infrastructure changes (ports, volumes, replicas, configuration)
- Service startup scripts (`start-app.ps1`, `start-app.sh`, similar)
- Developer environment setup or onboarding tooling
- Environment variable schema changes across tiers
- Network routing between services (ports, hostnames, proxy config)
- CI/CD or deployment pipeline configuration
- Infra in `infra/` directory

---

## Platform Infrastructure Context

- **Container runtime:** Podman (not Docker) — all container commands use `podman` or `podman-compose`.
- **Compose file:** `podman-compose.yml` at workspace root.
- **MongoDB 7.0:** internal port 27017, exposed on **27018** for local dev. Database name: `ai_platform`.
- **Redis:** session store for `product-management` backend. Check for port conflicts if changing Redis config.
- **Services run locally** (not in containers) in development:
  - Product management backend: port 3001
  - Product management frontend: port 5173
  - ai-listing-agent backend: port 3002
  - ai-listing-agent frontend: port 5174
  - Java listing service: port 8137
  - Python Whisper server: port 8000
  - Python Vision server: port 8001
  - Platform management: port 5000

---

## Podman / Compose Standards

### Container Configuration

- Use named volumes for persistent data (MongoDB, Redis) — never bind-mount data directories without justification.
- Pin image versions; avoid `latest` tags in compose files.
- Keep health checks on stateful containers (MongoDB, Redis) so dependent services wait for readiness.
- Expose only the minimum ports required on the host interface.

### Environment Variables

- Never hardcode secrets, API keys, or passwords in compose files.
- Use `.env` files for local overrides (ensure `.env` is in `.gitignore`).
- Keep environment variable names consistent across tiers: `MONGO_URI`, `REDIS_URL`, `PORT`, etc.
- Document new required environment variables in the relevant `CLAUDE.md` and `.env.example`.

### Networking

- Use Podman's internal DNS names (service names in compose) for inter-container communication.
- Do not expose Redis or MongoDB directly to external interfaces in non-local environments.
- If adding a new service to the compose file, assign an explicit container name and network alias.

---

## Redis Standards

- Redis is used exclusively for session storage; do not repurpose it for other caching without review.
- Default configuration is sufficient for local dev; do not add persistence (AOF/RDB) without ops justification.
- If changing Redis port, update the session store config in `product-management/backend-node` and validate session middleware still functions.
- Key expiry: session TTL is managed by the express-session middleware, not Redis config directly.

---

## MongoDB Infrastructure Standards

- MongoDB data is persisted in a named Podman volume — do not remove the volume without explicit user intent.
- Port 27018 (host) → 27017 (container): always use 27018 in local connection strings.
- When adding new collections or indexes, do so via Mongoose schema definitions in application code, not ad hoc mongo shell commands.
- For maintenance tasks (index rebuilds, backups, collection drops) see runbook: `../wiki/runbooks/mongodb-operations.md`.

---

## Service Startup

- **Correct startup order:** `podman-compose up -d` first (MongoDB + Redis), then backend services, then frontend.
- Scripts `start-app.ps1` and `start-app.sh` codify this order — keep them consistent with each other.
- If a new service is added to the platform, add it to both startup scripts and document the port in the service topology table.

---

## Security Standards for Infra Changes

- No secrets in compose files, startup scripts, or committed `.env` files.
- MongoDB and Redis must not be exposed on `0.0.0.0` unless explicitly required (e.g., test environments).
- Review firewall / host networking impact when adding or changing exposed ports.
- Log infra changes that affect inter-service connectivity in `docs/` or as a wiki decision entry.

---

## Verification Checklist

Before merging any infra change:

- [ ] `podman-compose up -d` starts cleanly without errors
- [ ] All dependent services connect to MongoDB and Redis after startup
- [ ] No new secrets committed to compose or env files
- [ ] Health checks pass on stateful containers
- [ ] Port assignments match the service topology table above
- [ ] Both `start-app.ps1` and `start-app.sh` updated if startup order changed
- [ ] `.env.example` updated if new environment variables were added
