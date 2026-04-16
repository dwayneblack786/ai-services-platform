# AI Services Platform Rules

This folder defines working rules for day-to-day coding in this monorepo.

Rule files:

1. `01-syntax-checks.md`
2. `02-compile-checks.md`
3. `03-coding-conventions-by-tier.md`
4. `04-security-standards.md`
5. `05-tech-stack-standards.md`
6. `06-testing-standards-by-tier.md`
7. `07-test-coverage-gates.md`
8. `08-plan-output-rules.md`
9. `09-ai-wiki-knowledge-rules.md`
10. `10-repository-boundaries-and-change-scope.md`
11. `11-database-data-layer-standards.md`
12. `12-breaking-change-and-contract-checks.md`
13. `13-dependency-audit.md`
14. `14-infrastructure-change-standards.md`
15. `15-no-secrets-in-git.md`

Execution order after code edits:

1. Syntax checks
2. Compile/build checks
3. Tests
4. Coverage checks (when code changed)
5. Security checklist review

Additional gate triggers by change type:

- Schema / query / index / migration change → apply Rule 11 + `review-database-data-layer.md`
- Proto file, public REST route, or shared type change → apply Rule 12 + `review-contract-and-breaking-change.md`
- `package.json` or `pom.xml` dependency change → apply Rule 13 (`npm audit --audit-level=high`)
- `podman-compose.yml`, startup script, port, or env var change → apply Rule 14 + `senior-devops-infra.md`
- Before every `git commit` → Rule 15 pre-commit hook runs automatically; manual secret checklist required before merge
