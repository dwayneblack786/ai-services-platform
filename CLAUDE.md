# AI Services Platform

Multi-tenant SaaS platform for AI-powered real estate products. See `.github/copilot-instructions.md` for full architecture, tech stack, governance structure, quality gates, and security standards.

## Products
1. ListingLift — photo staging + listing content generation
2. PropVision — computer vision property classification
3. PropBrief — market intelligence reports
4. ComplianceGuard — Fair Housing compliance
5. DealDesk — commercial RE document processing
6. FieldVoice — agentic voice workflow (planned)
7. TenantLoop — property manager AI assistant

## External Services
- **Claude API** — LLM (Sonnet for quality, Haiku for speed)
- **OpenAI API** — embeddings for RAG
- **Replicate API** — Flux 1.1 Pro virtual staging
- **Stripe** — payments
- **Keycloak** — SSO/identity
- **Sentry** — error tracking

## Run
```bash
podman-compose up -d                                        # MongoDB + Redis
cd product-management/backend-node && npm run dev          # API (3001)
cd product-management/frontend && npm run dev              # UI (5173)
cd services-java/va-service && ./mvnw spring-boot:run      # VA Service (8136)
cd services-python/whisper-server && python server.py      # Whisper (8000)
cd services-python/vision-server && python server.py       # Vision (8001)
```

## Scripts

All platform utility and dev scripts are in `scripts/` (workspace root). See `scripts/README.md` for the full inventory.

**Rule:** Before creating any new script, check `scripts/README.md`. If a matching script exists, use or extend it.

Services-python helper scripts remain co-located in `services-python/` and are documented in `scripts/README.md`.

## Hooks And Settings

Claude settings in `.claude/settings.local.json` define tool permissions and local policy hints.

Commit-time secret enforcement is implemented via Git pre-commit hooks:

- Canonical hook source: `.claude/hooks/pre-commit`
- Installed target per repo: `.git/hooks/pre-commit`
- Install/update command: `./scripts/install-hooks.ps1`

Model-agnostic governance workflow:

- Canonical shared governance content: `.ai/`
- Claude runtime adapter content: `.claude/`
- Sync command: `./scripts/sync-ai-governance.ps1`
- Auto sync by change: `npm run ai:sync:auto`
- Validation command: `./scripts/validate-ai-governance-sync.ps1`

## Plans

All plans use the conductor init format defined in `.ai/rules/08-plan-output-rules.md`.

- Master plan: `plans/curried-bouncing-dolphin.md`
- **Active:** `plans/phase-a-java-grpc-agents-v2.md` — Java gRPC server + live agent wiring (listing-service)
- `plans/phase-1-dinov2-training-pipeline.md` — PropVision DINOv2 training (on hold)
- `plans/phase-b-node-grpc-socketio.md` — Node gRPC client + Socket.io (next after Phase A)
- `plans/phase-c-ui-realtime.md` — UI real-time pipeline view (after Phase B)
