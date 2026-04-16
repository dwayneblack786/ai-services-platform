# Root Ownership Map

This document defines what stays in the umbrella root and what belongs to domain repositories.

## Strategy

The root repository is an umbrella coordinator. Domain folders are prepared to become independent repositories:
- product-management
- services-java
- services-python
- shared

## Keep At Root

- `.github/` (platform governance, shared contribution standards)
- `.gitignore`
- `.vscode/` (workspace-level launch/task convenience)
- `README.md` (umbrella index only)
- `CLAUDE.md` (platform architecture strategy)
- `podman-compose.yml` (shared local infrastructure)
- `docs/` (platform-wide docs only)
- `plans/` (platform roadmap)
- `examples/` (cross-domain examples)
- `scripts/` (canonical cross-platform utility and operational scripts)
- `package.json`, `package-lock.json` (root-level utilities only)

## Move To Product Management

- Product-management workflow/CI definitions

Canonical locations:
- `docs/` (all platform and product docs consolidated at workspace root)
- `scripts/` (all shared and operational scripts consolidated at workspace root)
- `ai-product-management/.github/workflows/` (move to `.github/workflows/` after split)

## Future Moves

- `services-java/` -> standalone repo
- `services-python/` -> standalone repo
- `shared/` -> standalone repo

Each domain should own:
- Its local CI workflows
- Its own root build/package metadata
- Its own docs and runbooks

## Delete Or Ignore (Local/Generated)

These are local artifacts and should not be tracked:
- `.aider*`
- `.venv/`, `venv/`
- `node_modules/`
- `out-prompt-context/`
- local prompt scratch files and ad-hoc debug outputs

## Transitional Rule

Root compatibility wrappers are allowed only temporarily. Any wrapper added at root must:
1. Delegate to an owning domain path.
2. Include a deprecation note.
3. Have a planned removal phase.

