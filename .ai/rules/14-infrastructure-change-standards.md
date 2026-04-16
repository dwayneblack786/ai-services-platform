# Rule 14: Infrastructure Change Standards

Scope:

- `podman-compose.yml`
- `start-app.ps1`, `start-app.sh`
- `scripts/` directory (`*.ps1`, `*.sh`)
- `infra/` directory
- `.env.example` or any template environment file
- Any change to service port assignments, container image versions, or volume configuration

Mandatory trigger:

- Any edit to `podman-compose.yml`.
- Any edit to startup scripts (`start-app.ps1`, `start-app.sh`).
- Any new or edited script in `scripts/`.
- Any new or changed required environment variable across any tier.
- Any change to a service's listen port (frontend, backend, Java, Python services).
- Any change to MongoDB or Redis container configuration.

Required checks:

1. **Secrets:**
   - Confirm no secrets, API keys, passwords, or tokens committed to compose files, startup scripts, or `.env.example`.
   - `.env` files must remain in `.gitignore` — never committed.

2. **Startup order:**
   - `podman-compose up -d` must come before any application service start.
   - If startup order changes, update both `start-app.ps1` and `start-app.sh` in the same change.

3. **Container image versions:**
   - Pin image versions explicitly; do not use `latest`.
   - If upgrading a pinned version (e.g., `mongo:7.0` → `mongo:8.0`), verify the application tier is compatible before merging.

4. **Ports:**
   - No two services may share the same host port.
   - Standard port assignments:
     - MongoDB: 27018 (host) → 27017 (container)
     - Redis: 6379
     - product-management backend: 3001
     - product-management frontend: 5173
     - ai-listing-agent backend: 3002
     - ai-listing-agent frontend: 5174
     - Java listing service: 8137
     - Java va-service: 8136
     - Python Whisper server: 8000
     - Python Vision server: 8001
     - Platform management: 5000
   - Document any deviation from the above in the PR notes and update this rule.

5. **Environment variables:**
   - If a new required environment variable is introduced in any tier, add it to the relevant `.env.example` and to the service `CLAUDE.md`.
   - Variable names must be consistent across tiers using the same service (e.g., `MONGO_URI` not sometimes `MONGODB_URL`).

6. **Network exposure:**
   - MongoDB and Redis must not be exposed on `0.0.0.0` in default configuration.
   - Only expose ports that are required for local development or integration.

7. **Cross-platform script parity:**
   - Any new operational script must have both a Windows PowerShell path (`.ps1`) and a Linux/macOS shell path (`.sh`) unless the script is truly platform-specific.
   - If platform-specific behavior is required, document the reason at the top of the script and provide a fallback command path in `scripts/README.md`.
   - When editing an existing paired script, update both variants in the same change to keep behavior aligned.
   - Keep command semantics equivalent across platforms (same inputs, same outputs, same side effects).

Verification:

- After any compose change: `podman-compose up -d` starts cleanly with no errors.
- After any startup script change: run the script end-to-end and confirm all services reach their expected ports.
- After any cross-platform script change: run both the `.ps1` and `.sh` variants (or provide documented rationale if one variant is intentionally not applicable).

Pass criteria:

- No secrets in committed infra files.
- Port table above is accurate and conflict-free.
- Both startup scripts are consistent with each other.
- New or edited operational scripts have Windows and Linux/macOS parity (or explicit documented exception).
- `.env.example` updated for any new required variable.

Fail handling:

- Do not merge compose changes that introduce secrets.
- Do not merge port changes that create conflicts without updating the port table in this rule.
- Do not merge startup script changes that break the startup order.
- Do not merge new operational scripts that are missing a cross-platform counterpart without documented exception and fallback.
- Apply the infra skill before merging: `.ai/skills/code-changes/senior-devops-infra.md`
