# Skill: Review Tests and Coverage

## Purpose

Ensure behavior changes are protected by meaningful tests and that coverage expectations are met.

## When to use

- Any logic change, bug fix, or API behavior adjustment.

## Inputs expected

- Changed files and related test files.

## Must-check items

- Tests verify outcomes, not just code execution.
- Changed logic includes both success and edge/failure path coverage.
- Tests are deterministic and avoid flaky network/time dependencies.
- Assertions are specific enough to catch regressions.

## Validation commands

- Frontend tests: `cd ai-listing-agent/frontend && npm test`
- Backend tests: `cd ai-listing-agent/backend-node && npm test`
- Backend coverage: `cd ai-listing-agent/backend-node && npm run coverage`
- Java tests: `cd services-java/listing-service && ./mvnw test`

## Backend gap handling

- Backend logic changes should include deterministic unit coverage plus manual verification where integration behavior cannot be isolated.

## Output format

- Findings by severity with explicit "missing test" flags.
- Conclude with coverage confidence level:
  - High
  - Medium
  - Low
