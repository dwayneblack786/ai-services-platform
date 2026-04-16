# Skill: Senior Backend Changes (Node.js + Express + TypeScript)

## Purpose

Implement senior-level backend changes with strong architecture, reliability, and security in `ai-listing-agent/backend-node`.

## When to use

- New endpoints, service-layer changes, auth/session updates, data-model changes, or integration logic.

## Expertise expectations

- Senior Node.js system design and Express service layering.
- Strong data consistency and failure-mode handling.
- Security-first thinking for auth, tenant boundaries, and input trust.

## Build standards

- Keep route handlers thin; orchestration and business rules live in services.
- Use typed request/response contracts and consistent error shapes.
- Avoid duplicated logic; extract reusable utilities/services.
- Ensure idempotency for retry-prone endpoints when applicable.
- Use centralized config modules (`src/config`) for all runtime settings.
- Keep logs structured and correlate requests where possible.

## Security and multi-tenant standards

- Enforce auth and tenant isolation before data access.
- Validate/sanitize body, params, query, and headers.
- Do not leak secrets or sensitive payloads in logs/errors.
- Review upload and file-system interactions for path/type/size safety.

## Validation commands

- Syntax: `cd ai-listing-agent/backend-node && npx tsc --noEmit -p tsconfig.json`
- Build: `cd ai-listing-agent/backend-node && npm run build`
- Tests: `cd ai-listing-agent/backend-node && npm test`
- Coverage: `cd ai-listing-agent/backend-node && npm run coverage`

## Testing expectations

- Add deterministic automated tests for changed logic and run backend coverage for materially changed code.
- For behavior changes, include sample request/response cases and edge-case checks.

## Output format

- Describe architecture decisions and tradeoffs.
- Document risk areas, rollback considerations, and verification evidence.
