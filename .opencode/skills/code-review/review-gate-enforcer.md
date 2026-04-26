# Skill: Review Gate Enforcer

## Purpose

Run the required post-edit quality gates in order and report exactly where a change fails.

## When to use

- Any PR or branch review before approval.
- Any change touching application logic, API, or configuration.

## Inputs expected

- Changed file list or git diff.
- Tiers affected: frontend, backend-node, java listing-service.

## Mandatory gate order

1. Syntax checks
2. Compile/build checks
3. Tests
4. Coverage checks (when code changed)
5. Security checklist review

## Validation commands

- Frontend syntax: `cd ai-listing-agent/frontend && npx tsc --noEmit -p tsconfig.json`
- Backend syntax: `cd ai-listing-agent/backend-node && npx tsc --noEmit -p tsconfig.json`
- Java syntax/compile: `cd services-java/listing-service && ./mvnw -q -DskipTests compile`
- Frontend build: `cd ai-listing-agent/frontend && npm run build`
- Backend build: `cd ai-listing-agent/backend-node && npm run build`
- Java build: `cd services-java/listing-service && ./mvnw clean install -DskipTests`
- Frontend tests: `cd ai-listing-agent/frontend && npm test`
- Backend tests: `cd ai-listing-agent/backend-node && npm test`
- Backend coverage: `cd ai-listing-agent/backend-node && npm run coverage`
- Java tests: `cd services-java/listing-service && ./mvnw test`

## Must-fail conditions

- Any required gate fails for a touched tier.
- Changed logic without tests or without documented exception.
- Security review reveals credential leak, missing auth/tenant checks, or unsafe logging.

## Output format

- Findings first, ordered by severity: Critical, High, Medium, Low.
- Each finding includes file path, impact, and recommended fix.
- Conclude with gate matrix:
  - Syntax: pass/fail
  - Build: pass/fail
  - Tests: pass/fail
  - Coverage: pass/fail/not-applicable
  - Security: pass/fail
