# Skills Index

This index helps select the right skill quickly.

## Structure

- `code-review/`: Skills for evaluating existing changes.
- `code-changes/`: Skills for implementing senior-level changes.

## Task Type -> Skill

- General pre-merge quality gates:
  - `code-review/review-gate-enforcer.md`
- Frontend React/TypeScript review:
  - `code-review/review-frontend-react-ts.md`
- Backend Express/TypeScript review:
  - `code-review/review-backend-express-ts.md`
- Java services review (all services under `services-java/`):
  - `code-review/review-java-listing-service.md`
- Security/auth/tenant review:
  - `code-review/review-security-auth-tenant.md`
- Tests and coverage review:
  - `code-review/review-tests-and-coverage.md`
- Contract and breaking-change review:
  - `code-review/review-contract-and-breaking-change.md`
- Observability and error-handling review:
  - `code-review/review-observability-and-errors.md`

- Implementing senior frontend UI + React + Node integration changes:
  - `code-changes/senior-frontend-react-ui-node.md`
- Implementing senior backend Node architecture changes:
  - `code-changes/senior-backend-node-architecture.md`
- Implementing senior Java Spring standards changes:
  - `code-changes/senior-java-spring-standards.md`

## Repository Scope Rules

- Treat `services-java`, `product-management`, `ai-listing-agent`, and `shared` as separate git repositories.
- Run `git status`, `git diff`, staging, commits, and pushes from the owning repository path.
- Keep commits repository-local; do not combine file changes from multiple repositories in one commit.
- Run quality gates in the owning repository for changed tiers only.

## Recommended Usage Flow

1. Identify the repository that owns the target files.
2. Pick one implementation skill from `code-changes/` based on the tier.
3. Run one or more focused review skills from `code-review/`.
4. Always finish with `code-review/review-gate-enforcer.md`.
