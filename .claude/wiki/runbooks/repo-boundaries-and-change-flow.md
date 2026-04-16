# Runbook: Repository Boundaries and Change Flow

Context:

- This workspace contains multiple independent repositories under one folder tree.
- Correct change handling requires repository-scoped git actions and quality gates.

Source file/path:

- `CLAUDE.md`
- `.claude/rules/10-repository-boundaries-and-change-scope.md`

Last verified date:

- 2026-04-16

Verified commands:

- `Set-Location ai-listing-agent; git status --short`
- `Set-Location product-management; git status --short`
- `Set-Location services-java; git status --short`
- `Set-Location shared; git status --short`

Actionable notes:

- Treat `services-java`, `product-management`, `ai-listing-agent`, and `shared` as separate git repositories.
- Stage and commit only files owned by the active repository.
- Run syntax/build/tests/coverage in the owning repository for changed tiers.
- For cross-repo features, create one commit/PR per repository and document merge order.