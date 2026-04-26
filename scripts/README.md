# Scripts

**Canonical location for all platform utility and dev scripts.**

> **Agent rule:** Check this file before creating any new script. If a script for the task already exists, use or extend it rather than creating a duplicate.

All scripts live under `scripts/` (workspace root). The former `ai-product-management/scripts/` has been consolidated here. Python service helper scripts remain co-located with their service in `services-python/` (see section below).

---

## Workspace Bootstrap

| Script | Purpose |
|--------|---------|
| `install-workspace.ps1` | Windows: clone repos, create env files from examples, install Java/Node deps |
| `install-workspace.sh` | macOS/Linux: same as above |
| `install_mongodb_tools.py` | Interactive MongoDB Community Server + Compass installer |
| `install-hooks.ps1` | Install the pre-commit secrets-check hook into all repos |
| `.claude/hooks/pre-commit` | Canonical Claude pre-commit hook (bash) — blocks commits containing secrets (Rule 15) |

---

## Developer Utilities

| Script | Purpose |
|--------|---------|
| `kill-dev-ports.ps1` | Kill processes occupying dev ports (3001, 3002, 5173, 5174, 8136, 8137) |
| `extract-ai-product-management-repo.ps1` | Extract ai-product-management repo files for standalone use |
| `cleanup-localstorage.html` | Browser tool to clear localStorage for dev/test sessions |
| `check-user.js` | Check a MongoDB user document by email or ID |

## MCP / Local LLM

| Script | Purpose |
|--------|---------|
| `mcp/local-llm-mcp-server.py` | Canonical local MCP stdio server for the workspace; forwards `local_llm_chat` tool calls to the local OpenAI-compatible endpoint configured in `.vscode/mcp.json` |
| `mcp/local-llm-mcp-server.js` | Older Node.js prototype kept as reference; the active workspace MCP configuration uses the Python server instead |

---

## Auth / SSO / Keycloak

| Script | Purpose |
|--------|---------|
| `keycloak/setup-keycloak.ps1` | Bootstrap Keycloak realms and clients for local dev |
| `keycloak/seed-tenants.ts` | Seed tenant users and roles into Keycloak |
| `start-sso-system.ps1` | Start the full SSO stack (Keycloak + dependent services) |
| `test-keycloak-migration.ps1` | Verify Keycloak migration: realm config, client setup, token flow |
| `test-sso-flow.ps1` | End-to-end SSO login + token test |

---

## MongoDB

| Script | Purpose |
|--------|---------|
| `mongo/setup-database.js` | Create collections, indexes, and defaults for `ai_platform` DB |
| `mongo/create-pms-collections.js` | Create ai-product-management-specific collections |
| `mongo/seed-product-prompts.js` | Seed default product prompt configurations |
| `mongo/seed-session-menu-test-data.js` | Seed session and menu test data |
| `mongo/consolidate-ai-services.js` | Consolidate AI service config documents |
| `mongo/inspect-collections.js` | Print collection counts and sample docs |
| `mongo/verify-collections.js` | Assert expected collections exist and are non-empty |
| `mongo/check-product-prompts.js` | Verify prompt documents are present and well-formed |
| `mongo/drop-ai-services.js` | Drop AI service config collection (destructive — use with care) |
| `mongo/remove-old-prompt-collections.js` | Remove legacy prompt collections after migration |
| `mongo/test-mongo.js` | Basic MongoDB connectivity test |
| `mongo/test-menu-service.js` | Menu service data integrity test |
| `mongo/test-session-menu.js` | Session + menu integration test |
| `mongo/backups/` | Manual JSON exports — keep as reference, do not auto-run |

---

## Prompt / Config Export

| Script | Purpose |
|--------|---------|
| `export-prompt-config.ps1` | Export current prompt configuration from MongoDB to JSON |

---

## Voice / Whisper / Streaming

| Script | Purpose |
|--------|---------|
| `test-voice-streaming.ps1` | Test WebSocket voice streaming end-to-end |
| `test-whisper-integration.ps1` | Test Whisper STT integration via HTTP |

---

## Code Intelligence

| Script | Purpose |
|--------|---------|
| `code-intel/build-knowledge-graph.ps1` | Generate cross-repo dependency knowledge graph |
| `code-intel/validate-workspace-changes.ps1` | Run syntax and test validation across workspace modules |

---

## AI Governance Sync

| Script | Purpose |
|--------|---------|
| `sync-ai-governance.ps1` | Sync shared governance content from `.ai/` (canonical) to `.claude/` (Claude runtime adapter) |
| `sync-ai-governance-auto.ps1` | Detect `.ai/` changes and auto-run the right sync flow (`.claude` always; `.agent/.github` skills only when `.ai/skills` changed) |
| `validate-ai-governance-sync.ps1` | Validate parity between `.ai/` and `.claude/` using SHA256 hashes |

---

## services-python Helper Scripts (co-located with service)

These scripts live with their service and are not moved here because they are tightly coupled to the service runtime.

| Script | Location | Purpose |
|--------|----------|---------|
| `start-vision.ps1` | `services-python/vision-server/` | Start the vision (PropVision) inference server |
| `quick_start_validation.ps1` | `services-python/vision-server/` | Quick validation of vision server setup |
| `test_*.py` | `services-python/vision-server/` | Vision server unit and integration tests |

---

## Conventions

- Run MongoDB scripts against the local dev database: `mongosh ai_platform < script.js`
- Run PowerShell scripts from workspace root unless the script header says otherwise.
- For new operational scripts, provide both `.ps1` (Windows) and `.sh` (Linux/macOS) variants unless the script is truly platform-specific.
- If a script is platform-specific, document why in the script header and list a fallback command path in this README.
- Do not create a new script without first checking this index.
- After adding a new script, update this README immediately.
- For model-agnostic governance updates:
	- `npm run ai:sync:auto` to auto-detect changed `.ai` areas and run the correct sync + validation.
	- `npm run ai:sync` for full `.ai -> .claude` sync only.
	- `npm run ai:sync:skills-all` when you explicitly need skills mirrored to `.agent` and `.github`.

Automation:

- The canonical hook `.ai/hooks/pre-commit` auto-runs governance sync when staged files include `.ai/*` (if `pwsh` is available), then stages generated sync outputs before secret scanning.
