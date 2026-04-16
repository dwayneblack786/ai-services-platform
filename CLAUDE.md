# AI Services Platform

Multi-tenant SaaS platform for AI-powered real estate products. Shared infrastructure (auth, billing, usage tracking, RAG) hosts multiple AI products as integrated modules.

## Monorepo Layout
```
ai-services-platform/
├── product-management/    # React frontend (5173) + Express/MongoDB backend (3001)
├── services-java/         # Spring Boot 4.0.1 agentic services (LangChain4j)
├── services-python/       # Flask ML inference services
├── plans/                 # Implementation plans by phase
└── podman-compose.yml     # MongoDB 7.0 (port 27018), Redis
```

Each tier has its own `CLAUDE.md` with stack-specific details.

## Repository Boundaries

The workspace root (`ai-services-platform/`) is a workspace-scoped repository used during development. It hosts shared tooling, platform-level docs, `.claude/` rules/skills/wiki, `podman-compose.yml`, and cross-cutting configuration that does not belong to any single product repo. Commits here are development-context changes, not product-feature changes.

Treat the following directories as independent product repositories with their own history, branches, remotes, and PR lifecycle:

- `services-java`
- `product-management`
- `ai-listing-agent`
- `shared`

Change handling requirements:

1. Scope git operations (`status`, `diff`, `add`, `commit`, `push`) to the repository that owns the changed files.
2. Workspace root commits cover: `.claude/`, `docs/`, `plans/`, `podman-compose.yml`, root `CLAUDE.md`, and shared scripts. They must not include source files owned by a nested product repo.
3. Do not mix changes from different repositories in one commit.
4. Run syntax/build/test/coverage gates only for affected tiers inside the affected repository.
5. Open and track PRs per repository, even when one feature spans multiple repositories.
6. Document cross-repo dependencies and merge order in PR notes.

## Rules

Repository-wide development and quality rules are defined in:

- `.claude/rules/README.md`

Post-edit quality gate order:

1. Syntax checks
2. Compile/build checks
3. Tests
4. Coverage checks (when code changed)
5. Security checklist review

Tier-specific and operational rule files:

- `.claude/rules/01-syntax-checks.md`
- `.claude/rules/02-compile-checks.md`
- `.claude/rules/03-coding-conventions-by-tier.md`
- `.claude/rules/04-security-standards.md`
- `.claude/rules/05-tech-stack-standards.md`
- `.claude/rules/06-testing-standards-by-tier.md`
- `.claude/rules/07-test-coverage-gates.md`
- `.claude/rules/08-plan-output-rules.md`
- `.claude/rules/09-ai-wiki-knowledge-rules.md`
- `.claude/rules/11-database-data-layer-standards.md`
- `.claude/rules/12-breaking-change-and-contract-checks.md`
- `.claude/rules/13-dependency-audit.md`
- `.claude/rules/14-infrastructure-change-standards.md`

## Skills

Skill definitions for implementation and review workflows are organized in:

- `.claude/skills/README.md`

Skill categories:

- `.claude/skills/code-changes/` (senior implementation skills)
- `.claude/skills/code-review/` (review and quality gate skills)
- `.claude/skills/security-audit/` (tier-specific security audit checklists)

Recommended skill workflow:

1. Pick the implementation skill that matches the tier being changed.
2. If the change touches auth, secrets, external input, APIs, data access, or external calls, run the matching skill from `.claude/skills/security-audit/`.
3. Run one or more focused review skills from `.claude/skills/code-review/`.
4. Finish with `.claude/skills/code-review/review-gate-enforcer.md`.

## Rule Compliance Checklist (PR Template)

Copy this into PRs when code is added or changed:

```md
### Rule Compliance Checklist

- [ ] Syntax checks passed for affected tiers
	- ai-listing-agent frontend: `cd ai-listing-agent/frontend && npx tsc --noEmit -p tsconfig.json`
	- ai-listing-agent backend: `cd ai-listing-agent/backend-node && npx tsc --noEmit -p tsconfig.json`
	- product-management frontend: `cd product-management/frontend && npx tsc --noEmit -p tsconfig.json`
	- product-management backend: `cd product-management/backend-node && npx tsc --noEmit -p tsconfig.json`
	- Java: `cd services-java/listing-service && ./mvnw -q -DskipTests compile`
	- Java va-service: `cd services-java/va-service && ./mvnw -q -DskipTests compile`
- [ ] Compile/build checks passed for affected tiers
	- ai-listing-agent frontend: `cd ai-listing-agent/frontend && npm run build`
	- ai-listing-agent backend: `cd ai-listing-agent/backend-node && npm run build`
	- product-management frontend: `cd product-management/frontend && npm run build`
	- product-management backend: `cd product-management/backend-node && npm run build`
	- Java: `cd services-java/listing-service && ./mvnw clean install -DskipTests`
	- Java va-service: `cd services-java/va-service && ./mvnw clean install -DskipTests`
- [ ] Tests run and passed for affected tiers
	- ai-listing-agent frontend: `cd ai-listing-agent/frontend && npm test`
	- ai-listing-agent backend: `cd ai-listing-agent/backend-node && npm test`
	- product-management backend: `cd product-management/backend-node && npm test`
	- Java: `cd services-java/listing-service && ./mvnw test`
	- Java va-service: `cd services-java/va-service && ./mvnw test`
- [ ] Coverage requirement satisfied for changed logic paths
	- ai-listing-agent backend: `cd ai-listing-agent/backend-node && npm run coverage`
	- product-management backend: `cd product-management/backend-node && npm run test:coverage`
- [ ] Security checklist reviewed (auth, tenant boundaries, input validation, sensitive logging)
	- Security audit skills: `.claude/skills/security-audit/README.md`
- [ ] Tech stack and conventions followed for touched tier(s)
- [ ] If schema/query/index/migration changed: Rule 11 + `review-database-data-layer.md` applied
- [ ] If proto/.proto/shared type/public route changed: Rule 12 + `review-contract-and-breaking-change.md` applied
- [ ] If package.json/pom.xml dependency changed: `npm audit --audit-level=high` passed (Rule 13)
- [ ] If podman-compose/startup script/port/env var changed: Rule 14 + `senior-devops-infra.md` applied
- [ ] If podman-compose/startup script/port/env var changed: Rule 14 + `senior-devops-infra.md` applied
- [ ] No secrets in staged files; pre-commit hook passed; `.env` not committed (Rule 15)
- [ ] Plan output format followed (if plan was requested)
- [ ] AI wiki/knowledge docs updated if behavior or architecture changed
```

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
- Validation command: `./scripts/validate-ai-governance-sync.ps1`

## Plans
- `plans/phase-1-dinov2-training-pipeline.md`
- Master plan: `.claude/plans/curried-bouncing-dolphin.md`
