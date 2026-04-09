# Workspace Bootstrap Checklist

Use this checklist when preparing a fresh local environment for AI Services Platform.

## Repository Setup

- [ ] Confirm root folder is `ai-services-platform`
- [ ] Run `scripts/install-workspace.ps1` on Windows or `scripts/install-workspace.sh` on macOS/Linux
- [ ] Verify repositories are present under root:
  - [ ] `ai-listing-agent`
  - [ ] `services-java`
  - [ ] `services-python`
  - [ ] `product-management`
  - [ ] `shared`

## Environment Configuration

- [ ] Confirm these env example files exist:
  - [ ] `ai-listing-agent/.env.example`
  - [ ] `ai-listing-agent/frontend/.env.example`
  - [ ] `services-java/.env.example`
  - [ ] `services-java/va-service/.env.example`
  - [ ] `services-python/.env.example`
  - [ ] `product-management/.env.example`
  - [ ] `product-management/frontend/.env.example`
  - [ ] `shared/.env.example`
- [ ] Create real `.env` files from examples where missing
- [ ] Replace all dummy secrets and API keys

## Dependency Installation

- [ ] `services-java` dependencies installed
- [ ] `product-management` backend/frontend dependencies installed
- [ ] `shared` dependencies installed
- [ ] `ai-listing-agent` backend/frontend dependencies installed

## Infrastructure (Compose)

- [ ] Review compose files before startup:
  - [ ] `infra/docker-compose.dev.yml`
  - [ ] `infra/podman-compose.dev.yml`
- [ ] Confirm required services are defined:
  - [ ] `keycloak`
  - [ ] `keycloak-db`
  - [ ] `mongodb` (MongoDB 7)
  - [ ] `redis`
- [ ] Start infrastructure with one runtime:
  - [ ] Docker: `docker compose -f infra/docker-compose.dev.yml up -d`
  - [ ] Podman: `podman-compose -f infra/podman-compose.dev.yml up -d`

## MongoDB Desktop Tools

- [ ] Run `scripts/install_mongodb_tools.py`
- [ ] Install MongoDB Community Server
- [ ] Install MongoDB Compass
- [ ] Validate local connection in Compass

## Validation

- [ ] Start application services using startup scripts
- [ ] Verify key health endpoints return success
- [ ] Verify login flow against Keycloak
- [ ] Confirm no missing env vars at runtime
