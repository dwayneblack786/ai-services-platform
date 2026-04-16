# AI Services Platform Wiki

Purpose:

- Concise, durable project knowledge for recurring implementation and review work.

Sections:

- [Glossary](glossary.md)
- [Service Notes: ai-listing-agent](services/ai-listing-agent.md)
- [Service Notes: product-management](services/product-management.md)
- [Service Notes: listing-service](services/listing-service.md)
- [Service Notes: va-service](services/va-service.md)
- [Runbooks](runbooks/README.md)
- [Runbook: Repository Boundaries and Change Flow](runbooks/repo-boundaries-and-change-flow.md)
- [Runbook: Listing Service Change Verification](runbooks/listing-service-change-verification.md)
- [Runbook: Java gRPC Proto Sync and Runtime Checks](runbooks/java-grpc-proto-sync-and-runtime-checks.md)
- [Runbook: MongoDB Operations — Connection Failures, Slow Queries, Index Maintenance](runbooks/mongodb-operations.md)
- [Decisions](decisions/README.md)

Scripts:

- All platform scripts live in `scripts/` (workspace root). See `scripts/README.md` for the full inventory before creating any new script.

Docs:

- All platform docs now live in `docs/` (workspace root). `product-management/docs/` was consolidated here.

High-value rules to check from here:

- `../rules/04-security-standards.md` — auth, secrets, tenant boundaries, input validation
- `../rules/05-tech-stack-standards.md` — approved frameworks and stack constraints
- `../rules/06-testing-standards-by-tier.md` — required test expectations by tier
- `../rules/09-ai-wiki-knowledge-rules.md` — knowledge ingestion and retrieval workflow
- `../rules/10-repository-boundaries-and-change-scope.md` — repository ownership and git scope
- `../rules/11-database-data-layer-standards.md` — MongoDB schema, index, migration, and tenant isolation standards
- `../rules/12-breaking-change-and-contract-checks.md` — proto, REST route, and shared type breaking-change gate
- `../rules/13-dependency-audit.md` — npm audit and pom.xml dependency security gate
- `../rules/14-infrastructure-change-standards.md` — Podman, ports, env vars, and startup script standards
- `../rules/15-no-secrets-in-git.md` — Claude pre-commit hook, secret patterns, rotation procedure

Session startup path:

1. Check the most relevant `/memories/repo/` note first
2. Open this index
3. Open one relevant service page or runbook
4. Open the matching skill or rule if needed
5. Read deeper docs only when the above still leaves a gap

Security workflow references:

- `.ai/skills/security-audit/README.md` — entry point for tier-specific security audit skills
- `.ai/skills/code-review/review-security-auth-tenant.md` — focused auth, tenant, and secret review
- `.ai/skills/code-review/review-security-scanning-pentesting.md` — OWASP and dependency scanning review

Usage:

- Check this index before opening large source documents.
- Prefer targeted retrieval over broad reading. Pull one repo memory note, one service page, and one skill or rule before opening deeper documentation.
- Use the security-audit skill set when a change affects auth, secrets, external input, APIs, or data access.
- Promote durable findings from session work into repo memory, runbooks, decisions, or service notes.
- Update the relevant page after architecture, workflow, or verification commands change.

Last verified date:

- 2026-04-16