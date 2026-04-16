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

Treat the following directories as independent git repositories with their own history, branches, remotes, and PR lifecycle:

- `services-java`
- `product-management`
- `ai-listing-agent`
- `shared`

Change handling requirements:

1. Scope git operations (`status`, `diff`, `add`, `commit`, `push`) to the repository that owns the changed files.
2. Do not mix changes from different repositories in one commit.
3. Run syntax/build/test/coverage gates only for affected tiers inside the affected repository.
4. Open and track PRs per repository, even when one feature spans multiple repositories.
5. Document cross-repo dependencies and merge order in PR notes.

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
	- Frontend: `cd ai-listing-agent/frontend && npx tsc --noEmit -p tsconfig.json`
	- Backend: `cd ai-listing-agent/backend-node && npx tsc --noEmit -p tsconfig.json`
	- Java: `cd services-java/listing-service && ./mvnw -q -DskipTests compile`
- [ ] Compile/build checks passed for affected tiers
	- Frontend: `cd ai-listing-agent/frontend && npm run build`
	- Backend: `cd ai-listing-agent/backend-node && npm run build`
	- Java: `cd services-java/listing-service && ./mvnw clean install -DskipTests`
- [ ] Tests run and passed for affected tiers
	- Frontend: `cd ai-listing-agent/frontend && npm test`
	- Backend: `cd ai-listing-agent/backend-node && npm test`
	- Java: `cd services-java/listing-service && ./mvnw test`
- [ ] Coverage requirement satisfied for changed logic paths
	- Backend coverage: `cd ai-listing-agent/backend-node && npm run coverage`
- [ ] Security checklist reviewed (auth, tenant boundaries, input validation, sensitive logging)
	- Security audit skills: `.claude/skills/security-audit/README.md`
- [ ] Tech stack and conventions followed for touched tier(s)
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
cd services-python/whisper-server && python server.py      # Whisper (8000)
cd services-python/vision-server && python server.py       # Vision (8001)
```

## Plans
- `plans/phase-1-dinov2-training-pipeline.md`
- Master plan: `.claude/plans/curried-bouncing-dolphin.md`
