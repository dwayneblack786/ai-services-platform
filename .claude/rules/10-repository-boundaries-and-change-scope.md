# Rule 10: Repository Boundaries and Change Scope

Purpose:

- Enforce correct git and quality-gate behavior in this workspace where key directories are independent repositories.

Repository boundaries:

**Workspace root** (`ai-services-platform/` itself):
- A development workspace repository. Owns: `.ai/`, `docs/`, `plans/`, `podman-compose.yml`, root-level `CLAUDE.md`, and shared scripts.
- Use for: cross-cutting platform docs, rules, skills, wiki updates, and dev tooling changes.
- Do not include product source files from nested repos in workspace-root commits.
- Verify: `Set-Location "C:/Users/Owner/Documents/ai-services-platform"; git status --short`

**Product repositories** (each is independent with its own history, branches, and PR lifecycle):

- `services-java`
- `product-management`
- `ai-listing-agent`
- `shared`

Mandatory behavior:

1. Run git operations in the owning repository path.
   - Required for: `status`, `diff`, `add`, `commit`, `push`, branch operations, and PR preparation.
2. Keep commits repository-local.
   - A single commit must not include files from more than one repository.
   - Workspace root commits must not contain source files owned by a nested product repo.
3. Run quality gates in the owning repository only.
   - Apply syntax/build/tests/coverage for changed tiers in that repository.
4. Track multi-repo features as coordinated, separate commits and PRs.
   - Document dependency order and rollout notes across repositories.

Verification examples:

- `Set-Location "C:/Users/Owner/Documents/ai-services-platform"; git status --short` (workspace root)
- `Set-Location ai-listing-agent; git status --short`
- `Set-Location product-management; git status --short`
- `Set-Location services-java; git status --short`
- `Set-Location shared; git status --short`

Fail handling:

- If changed files span repositories, split work by repository before merge.
- If git status is checked in the wrong path, rerun in the correct repository and revalidate.
- If a workspace-root commit accidentally contains product source files, split the commit before pushing.