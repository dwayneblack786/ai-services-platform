# Runbook: Repository Boundaries and Change Flow

Context:

- This workspace contains one workspace repository at the root plus multiple independent product repositories under the same folder tree.
- Correct change handling requires knowing which repository owns the changed files before staging or committing.

Source file/path:

- `CLAUDE.md`
- `.ai/rules/10-repository-boundaries-and-change-scope.md`

Last verified date:

- 2026-04-16

Verified commands:

- `Set-Location "C:/Users/Owner/Documents/ai-services-platform"; git status --short` (workspace root)
- `Set-Location ai-listing-agent; git status --short`
- `Set-Location ai-product-management; git status --short`
- `Set-Location services-java; git status --short`
- `Set-Location shared; git status --short`

Actionable notes:

- The workspace root (`ai-services-platform/`) is its own git repository used during development. It owns `.ai/`, `docs/`, `plans/`, `podman-compose.yml`, root `CLAUDE.md`, and shared scripts.
- Treat `services-java`, `ai-product-management`, `ai-listing-agent`, and `shared` as separate product repositories; each has its own history, branches, and PR lifecycle.
- Workspace root commits must not contain source files owned by a nested product repo.
- Stage and commit only files owned by the active repository.
- Run syntax/build/tests/coverage in the owning repository for changed tiers.
- For cross-repo features, create one commit/PR per repository and document merge order.
