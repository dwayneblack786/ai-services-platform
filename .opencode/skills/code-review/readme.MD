# Code Review Skills

Use these skills when evaluating changes, not implementing them.

## Skills

1. `review-gate-enforcer.md` — mandatory post-edit quality gate runner
2. `review-frontend-react-ts.md` — React + TypeScript UI changes
3. `review-backend-express-ts.md` — Express + TypeScript API changes
4. `review-java-listing-service.md` — Spring Boot services under `services-java/` (all current and future)
5. `review-ai-agentic-systems.md` — LLM integrations, agentic workflows, RAG, provider abstraction, evals
6. `review-security-auth-tenant.md` — auth, tenant boundaries, secrets
7. `review-security-scanning-pentesting.md` — OWASP Top 10, penetration testing, dependency scanning
8. `review-tests-and-coverage.md` — test quality and coverage gaps
9. `review-contract-and-breaking-change.md` — API/gRPC/type contract changes
10. `review-observability-and-errors.md` — logging, tracing, error handling
11. `review-web-quality-audits.md` — Core Web Vitals, accessibility (WCAG), SEO

## Quick Selector

| Tier / concern | Skill |
|---|---|
| Pre-merge gate (always run last) | `review-gate-enforcer.md` |
| Frontend React/TypeScript | `review-frontend-react-ts.md` |
| Backend Express/TypeScript | `review-backend-express-ts.md` |
| Java services (`services-java/`) | `review-java-listing-service.md` |
| AI integrations, agent loops, RAG, evals | `review-ai-agentic-systems.md` |
| Auth, tenant, secrets | `review-security-auth-tenant.md` |
| OWASP Top 10, pentesting, dependencies | `review-security-scanning-pentesting.md` |
| Tests and coverage | `review-tests-and-coverage.md` |
| Contracts and breaking changes | `review-contract-and-breaking-change.md` |
| Observability and errors | `review-observability-and-errors.md` |
| Core Web Vitals, accessibility, SEO | `review-web-quality-audits.md` |

## Security Audit Skills

For deeper security review, use the dedicated `../security-audit/` skill set:

- `../security-audit/README.md` — selector for security audit workflows
- `../security-audit/audit-node-backend.md` — backend auth, validation, secrets, rate limiting, tenant checks
- `../security-audit/audit-react-frontend.md` — XSS, auth state, cookies, CSP, frontend secrets
- `../security-audit/audit-java-spring.md` — Spring Security, JWT, authorization, validation, secure external calls
- `../security-audit/audit-api-contracts.md` — REST/gRPC auth, validation, versioning, rate limiting, safe errors
- `../security-audit/audit-data-protection.md` — SQL/NoSQL injection, encryption, retention, backup, audit trails
- `../security-audit/audit-ai-llm-systems.md` — prompt injection, tool safety, tenant-safe retrieval, AI output protection

Use these when a change affects security posture directly, not just general code quality.

## Recommended Flow

1. Pick the tier-specific skill(s) matching changed files.
2. Run `review-ai-agentic-systems.md` when the change includes LLM integration, agent loops, RAG, prompt contracts, or model/provider routing.
3. Run a matching `../security-audit/` skill when the change touches auth, secrets, external input, APIs, data access, or AI/LLM behavior.
4. Run security and/or observability review if the change touches auth, secrets, or error paths.
5. Always finish with `review-gate-enforcer.md`.
