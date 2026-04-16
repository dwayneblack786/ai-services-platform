# Rule 15: No Secrets in Git

Scope:

- All repositories in this workspace: `ai-services-platform` (root), `services-java`, `product-management`, `ai-listing-agent`, `shared`

Mandatory trigger:

- Before every `git commit` and every `git push`.
- During any code review that touches config files, `.env` files, startup scripts, or backend service code.
- When adding new environment variables, credentials, or API keys to any tier.

## What is a Secret?

Do not commit any of the following:

- API keys (Anthropic, OpenAI, Replicate, Stripe, Twilio, Azure, Google, etc.)
- Passwords or database URIs containing credentials (`mongodb+srv://user:pass@...`)
- Private keys, certificates, or PEM files
- OAuth client secrets
- JWT signing secrets
- Session store secrets
- Webhook signing secrets
- Keycloak realm admin credentials
- `.env` files of any kind

## Allowed Config Patterns

- `.env.example` files with **placeholder values only** — never real values
- Environment variable **names** in code (e.g. `process.env.ANTHROPIC_API_KEY`)
- Docker/Podman compose files referencing env vars via `${VAR_NAME}` — never inline values
- Spring `application.yml` using `${VAR:default}` — default must not be a real credential

## Claude Hook (Pre-commit)

Canonical hook source is `.claude/hooks/pre-commit`.

Installed hook target in each repo is `.git/hooks/pre-commit`. It runs automatically on `git commit` and blocks commits containing secret patterns.

To install the hook into all repos in this workspace:

```powershell
Set-Location "C:\Users\Owner\Documents\ai-services-platform"
.\scripts\install-hooks.ps1
```

To install manually for a single repo, run from workspace root:

```powershell
# Windows (PowerShell)
Copy-Item ".claude/hooks/pre-commit" ".git/hooks/pre-commit"
# Or for Git Bash / WSL
# cp .claude/hooks/pre-commit .git/hooks/pre-commit && chmod +x .git/hooks/pre-commit
```

## Pre-commit Scan Patterns

The hook scans staged files for:

| Pattern | Description |
|---------|-------------|
| `sk-[a-zA-Z0-9]{20,}` | OpenAI / Anthropic key prefix |
| `AKIA[0-9A-Z]{16}` | AWS access key |
| `[a-z0-9]{32,}` in `.env` | Generic long token in env file |
| `mongodb\+srv://[^$\{].*:.*@` | MongoDB URI with embedded credentials |
| `-----BEGIN.*PRIVATE KEY-----` | PEM private key |
| `client_secret\s*=\s*[^\$\{]` | OAuth client secret literal |
| `password\s*[:=]\s*[^\$\{<]` | Inline password assignment |
| `secret\s*[:=]\s*[^\$\{<]` | Inline secret assignment (non-variable) |

## Manual Checklist (before merge)

1. `git diff --cached` — review all staged content for inline secrets.
2. Confirm all sensitive values are read from `process.env.*` / `${ENV_VAR}` / `@Value("${...}")`.
3. Confirm no `.env` file is staged (`git status` must not show `.env` or `.env.*` other than `.env.example`).
4. Confirm `.gitignore` in each repo includes: `.env`, `.env.*`, `!.env.example`, `*.pem`, `*.key`, `secrets/`.

## Fail Handling

- If the pre-commit hook blocks a commit, remove the secret and use an environment variable instead.
- If a secret was already committed, **rotate it immediately** — assume it is compromised.
- Use `git filter-repo` or BFG Repo Cleaner to purge from history — do not just delete in a new commit.
- Notify the team that the secret was exposed and verify no unauthorized use occurred.

## .gitignore Minimum Requirements

Every repo must have these entries in `.gitignore`:

```
.env
.env.*
!.env.example
*.pem
*.key
secrets/
*.p12
*.pfx
```
