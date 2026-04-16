# Model-Agnostic AI Governance Root

This folder is the model-agnostic copy of governance assets from `.claude/`.

Included directories:

- `.obsidian/`
- `agents/`
- `commands/`
- `hooks/`
- `rules/`
- `skills/`
- `wiki/`

Scope:

- Keep guidance, runbooks, rules, and skills model-agnostic.
- Preserve provider-specific adapters in provider folders (for example, `.claude/`), and copy only shared logic here.

Sync notes:

- Canonical pre-commit hook in this folder: `.ai/hooks/pre-commit`
- If content is updated under `.claude/`, copy only model-agnostic updates into `.ai/`.
- Do not rewrite product behavior or service-specific contracts during sync.
