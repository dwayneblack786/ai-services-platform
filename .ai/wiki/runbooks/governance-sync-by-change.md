# Runbook: Governance Sync By Change

Context:

- `.ai/` is canonical governance content.
- `.claude/` consumes full governance sync.
- `.agent/` and `.github/` only need skills mirroring from `.ai/skills`.

Source file/path:

- `scripts/sync-ai-governance.ps1`
- `scripts/sync-ai-governance-auto.ps1`
- `.ai/hooks/pre-commit`
- `.ai/rules/09-ai-wiki-knowledge-rules.md`

Last verified date:

- 2026-04-16

Verified commands:

- `Set-Location "C:/Users/Owner/Documents/ai-services-platform"; npm run ai:sync:auto`
- `Set-Location "C:/Users/Owner/Documents/ai-services-platform"; npm run ai:validate`

Actionable notes:

- Use `npm run ai:sync:auto` after `.ai/**` changes to avoid manually choosing sync mode.
- If `.ai/skills/**` changed, the auto flow mirrors skills to `.agent/skills` and `.github/skills` and also syncs `.claude`.
- If `.ai/skills/**` did not change, the auto flow syncs `.claude` only.
- The canonical pre-commit hook auto-runs this flow when staged files include `.ai/*` and auto-stages generated sync outputs.
- If pre-commit blocks due to sync failure, run `npm run ai:sync:auto` directly to inspect the failure.
