# Governance Sync By Change

Purpose:

- Select and run the correct governance sync command based on what changed under `.ai/`.
- Reduce manual decision-making and avoid drift between `.ai`, `.claude`, `.agent`, and `.github`.

When to use:

- Any time files under `.ai/` are added, updated, deleted, or renamed.
- Before committing governance updates.

Decision table:

| Change scope | Command | Expected targets |
|---|---|---|
| `.ai/skills/**` changed | `npm run ai:sync:auto` | `.claude/**`, `.agent/skills/**`, `.github/skills/**` |
| `.ai/agents/**`, `.ai/commands/**`, `.ai/hooks/**`, `.ai/rules/**`, `.ai/wiki/**` changed | `npm run ai:sync:auto` | `.claude/**` |
| No `.ai/**` changes | none | no sync required |

Implementation notes:

- `scripts/sync-ai-governance-auto.ps1` detects changed `.ai` files and dispatches to the right sync mode.
- `scripts/sync-ai-governance.ps1 -SyncSkillsToAllTargets` performs full `.ai -> .claude` sync and mirrors skills to `.agent` and `.github`.
- `.ai/hooks/pre-commit` calls the auto sync script when staged files include `.ai/*` and auto-stages generated sync outputs.

Verification:

1. Run `npm run ai:sync:auto`.
2. Run `npm run ai:validate`.
3. Run `git status --short` and confirm expected sync targets changed.

Failure handling:

- If auto sync fails in pre-commit, stop commit and run `npm run ai:sync:auto` directly to view errors.
- If `pwsh` is unavailable, install PowerShell 7 and retry.
- If parity validation fails, run `npm run ai:sync` and then `npm run ai:validate`.
