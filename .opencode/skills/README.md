# Skills Index

This index helps select the right skill quickly.

## Structure

- `knowledge-management/`: Skills for project knowledge organization, discovery, and context preservation.
- `code-review/`: Skills for evaluating existing changes.
- `code-changes/`: Skills for implementing senior-level changes.
- `security-audit/`: Tier-specific security audit playbooks and checklists.

## Task Type -> Skill

- Setting up persistent development knowledge (optional but recommended):
  - `knowledge-management/obsidian-workflow.md`
- General pre-merge quality gates:
  - `code-review/review-gate-enforcer.md`
- Frontend React/TypeScript review:
  - `code-review/review-frontend-react-ts.md`
- Backend Express/TypeScript review:
  - `code-review/review-backend-express-ts.md`
- Java services review (all services under `services-java/`):
  - `code-review/review-java-listing-service.md`
- AI and agentic systems review:
  - `code-review/review-ai-agentic-systems.md`
- Security/auth/tenant review:
  - `code-review/review-security-auth-tenant.md`
- OWASP, penetration testing, and dependency scanning:
  - `code-review/review-security-scanning-pentesting.md`
- Tier-specific security audit entry point:
  - `security-audit/README.md`
- Node/Express backend security audit:
  - `security-audit/audit-node-backend.md`
- React frontend security audit:
  - `security-audit/audit-react-frontend.md`
- Java/Spring service security audit:
  - `security-audit/audit-java-spring.md`
- API/gRPC contract and endpoint security audit:
  - `security-audit/audit-api-contracts.md`
- Data protection and database security audit:
  - `security-audit/audit-data-protection.md`
- AI, LLM, RAG, and agentic workflow security audit:
  - `security-audit/audit-ai-llm-systems.md`
- Tests and coverage review:
  - `code-review/review-tests-and-coverage.md`
- Contract and breaking-change review:
  - `code-review/review-contract-and-breaking-change.md`
- Observability and error-handling review:
  - `code-review/review-observability-and-errors.md`
- Web quality audits (Core Web Vitals, accessibility, SEO):
  - `code-review/review-web-quality-audits.md`
- MongoDB/Mongoose schema, query, index, migration, and multi-tenant data layer review:
  - `code-review/review-database-data-layer.md`

- Implementing senior frontend UI + React + Node integration changes:
  - `code-changes/senior-frontend-react-ui-node.md`
- Implementing senior backend Node architecture changes:
  - `code-changes/senior-backend-node-architecture.md`
- Implementing senior Java Spring standards changes:
  - `code-changes/senior-java-spring-standards.md`
- Implementing AI integrations, agent loops, RAG, and multi-provider LLM workflows:
  - `code-changes/senior-ai-agentic-implementation.md`
- MongoDB schema design, query optimization, indexing, migrations, multi-tenant isolation, and relational database interoperability:
  - `code-changes/senior-data-engineer-database.md`
- Podman, Redis, MongoDB infra, service startup, port config, environment variables, and platform tooling:
  - `code-changes/senior-devops-infra.md`
- Test-Driven Development (Red-Green-Refactor cycle):
  - `code-changes/senior-tdd-test-first.md`

## Repository Scope Rules

- Treat `services-java`, `ai-product-management`, `ai-listing-agent`, and `shared` as separate git repositories.
- Run `git status`, `git diff`, staging, commits, and pushes from the owning repository path.
- Keep commits repository-local; do not combine file changes from multiple repositories in one commit.
- Run quality gates in the owning repository for changed tiers only.

## Recommended Usage Flow

0. **Knowledge baseline (Optional but recommended):** If this is your first session or you're starting fresh on a large feature, spend 10 min on `knowledge-management/obsidian-workflow.md` to set up Obsidian vault. Reduces token consumption and accelerates context discovery in subsequent sessions.
1. Identify the repository that owns the target files.
2. Pull targeted context first: one `/memories/repo/` note, `wiki/index.md`, and one service page or runbook.
3. Pick one implementation skill from `code-changes/` based on the tier.
4. For any schema, query, index, migration, or data-pipeline change in any tier, also use `code-changes/senior-data-engineer-database.md`. Pair with `code-review/review-database-data-layer.md` for review.
5. For infra changes (Podman, Redis, MongoDB container ops, ports, envs), use `code-changes/senior-devops-infra.md`.
6. If the change is AI-heavy, agentic, retrieval-based, or involves model/provider integration, use `code-changes/senior-ai-agentic-implementation.md`.
5. If the change touches auth, input handling, secrets, data access, APIs, external calls, or AI/LLM behavior, run the matching skill from `security-audit/`.
6. Run one or more focused review skills from `code-review/`, including `code-review/review-ai-agentic-systems.md` for AI features.
7. Promote durable findings to repo memory or wiki pages before ending the task.
8. Always finish with `code-review/review-gate-enforcer.md`.
