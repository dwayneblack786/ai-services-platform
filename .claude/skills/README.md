# Skills Index

This index helps select the right skill quickly.

## Structure

- `code-review/`: Skills for evaluating existing changes.
- `code-changes/`: Skills for implementing senior-level changes.
- `security-audit/`: Tier-specific security audit playbooks and checklists.

## Task Type -> Skill

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

- Implementing senior frontend UI + React + Node integration changes:
  - `code-changes/senior-frontend-react-ui-node.md`
- Implementing senior backend Node architecture changes:
  - `code-changes/senior-backend-node-architecture.md`
- Implementing senior Java Spring standards changes:
  - `code-changes/senior-java-spring-standards.md`
- Implementing AI integrations, agent loops, RAG, and multi-provider LLM workflows:
  - `code-changes/senior-ai-agentic-implementation.md`
- Test-Driven Development (Red-Green-Refactor cycle):
  - `code-changes/senior-tdd-test-first.md`

## Repository Scope Rules

- Treat `services-java`, `product-management`, `ai-listing-agent`, and `shared` as separate git repositories.
- Run `git status`, `git diff`, staging, commits, and pushes from the owning repository path.
- Keep commits repository-local; do not combine file changes from multiple repositories in one commit.
- Run quality gates in the owning repository for changed tiers only.

## Recommended Usage Flow

1. Identify the repository that owns the target files.
2. Pick one implementation skill from `code-changes/` based on the tier.
3. If the change is AI-heavy, agentic, retrieval-based, or involves model/provider integration, use `code-changes/senior-ai-agentic-implementation.md`.
4. If the change touches auth, input handling, secrets, data access, APIs, external calls, or AI/LLM behavior, run the matching skill from `security-audit/`.
5. Run one or more focused review skills from `code-review/`, including `code-review/review-ai-agentic-systems.md` for AI features.
6. Always finish with `code-review/review-gate-enforcer.md`.
