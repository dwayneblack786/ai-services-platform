# Rules

15 numbered rule files in this folder. Quality gate order: syntax → compile → tests → coverage → security.

Additional gate triggers by change type:

- Schema / query / index / migration change → apply Rule 11 + `review-database-data-layer.md`
- Proto file, public REST route, or shared type change → apply Rule 12 + `review-contract-and-breaking-change.md`
- `package.json` or `pom.xml` dependency change → apply Rule 13 (`npm audit --audit-level=high`)
- `podman-compose.yml`, startup script, port, or env var change → apply Rule 14 + `senior-devops-infra.md`
- Before every `git commit` → Rule 15 pre-commit hook runs automatically; manual secret checklist required before merge
