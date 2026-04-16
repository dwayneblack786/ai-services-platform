# AI Services Platform Wiki

Purpose:

- Concise, durable project knowledge for recurring implementation and review work.

Sections:

- [Glossary](glossary.md)
- [Service Notes: ai-listing-agent](services/ai-listing-agent.md)
- [Service Notes: product-management](services/product-management.md)
- [Service Notes: listing-service](services/listing-service.md)
- [Runbooks](runbooks/README.md)
- [Runbook: Repository Boundaries and Change Flow](runbooks/repo-boundaries-and-change-flow.md)
- [Decisions](decisions/README.md)

Security workflow references:

- `.claude/skills/security-audit/README.md` — entry point for tier-specific security audit skills
- `.claude/skills/code-review/review-security-auth-tenant.md` — focused auth, tenant, and secret review
- `.claude/skills/code-review/review-security-scanning-pentesting.md` — OWASP and dependency scanning review

Usage:

- Check this index before opening large source documents.
- Use the security-audit skill set when a change affects auth, secrets, external input, APIs, or data access.
- Update the relevant page after architecture, workflow, or verification commands change.

Last verified date:

- 2026-04-16