# Skill: Review Backend Express + TypeScript

## Purpose

Review API/backend changes in `ai-listing-agent/backend-node` for correctness, security, and service boundaries.

## When to use

- Changes under backend `src/routes`, `src/services`, `src/middleware`, `src/config`, `src/models`.

## Inputs expected

- Changed backend files and endpoint behavior notes.

## Must-check items

- Route handlers remain thin; business logic belongs in services.
- Async errors are handled and surfaced safely.
- Config is read through `src/config` modules, not ad hoc `process.env` usage.
- Auth/session/tenant checks are present on protected endpoints.
- Middleware order remains safe in startup bootstrap.
- File upload and parsing logic enforce size/type/path protections.

## Validation commands

- Syntax: `cd ai-listing-agent/backend-node && npx tsc --noEmit -p tsconfig.json`
- Build: `cd ai-listing-agent/backend-node && npm run build`
- Tests: `cd ai-listing-agent/backend-node && npm test`
- Coverage: `cd ai-listing-agent/backend-node && npm run coverage`

## Current testing note

- Require automated tests for changed backend logic.
- If endpoint behavior still needs manual validation, include sample request/response evidence alongside unit coverage.

## Output format

- Findings first by severity.
- Include endpoint-level impact and exploit/regression risk.
- Explicitly call out missing tests as Medium or High when behavior changed.
