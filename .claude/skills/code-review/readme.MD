# Code Review Skills

Use these skills when evaluating changes, not implementing them.

## Skills

1. `review-gate-enforcer.md` — mandatory post-edit quality gate runner
2. `review-frontend-react-ts.md` — React + TypeScript UI changes
3. `review-backend-express-ts.md` — Express + TypeScript API changes
4. `review-java-listing-service.md` — Spring Boot services under `services-java/` (all current and future)
5. `review-security-auth-tenant.md` — auth, tenant boundaries, secrets
6. `review-security-scanning-pentesting.md` — OWASP Top 10, penetration testing, dependency scanning
7. `review-tests-and-coverage.md` — test quality and coverage gaps
8. `review-contract-and-breaking-change.md` — API/gRPC/type contract changes
9. `review-observability-and-errors.md` — logging, tracing, error handling
10. `review-web-quality-audits.md` — Core Web Vitals, accessibility (WCAG), SEO

## Quick Selector

| Tier / concern | Skill |
|---|---|
| Pre-merge gate (always run last) | `review-gate-enforcer.md` |
| Frontend React/TypeScript | `review-frontend-react-ts.md` |
| Backend Express/TypeScript | `review-backend-express-ts.md` |
| Java services (`services-java/`) | `review-java-listing-service.md` |
| Auth, tenant, secrets | `review-security-auth-tenant.md` |
| OWASP Top 10, pentesting, dependencies | `review-security-scanning-pentesting.md` |
| Tests and coverage | `review-tests-and-coverage.md` |
| Contracts and breaking changes | `review-contract-and-breaking-change.md` |
| Observability and errors | `review-observability-and-errors.md` |
| Core Web Vitals, accessibility, SEO | `review-web-quality-audits.md` |

## Recommended Flow

1. Pick the tier-specific skill(s) matching changed files.
2. Run security and/or observability review if the change touches auth, secrets, or error paths.
3. Always finish with `review-gate-enforcer.md`.
