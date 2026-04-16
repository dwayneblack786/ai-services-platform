# Skill: Review Frontend React + TypeScript

## Purpose

Review UI and client-side logic changes in `ai-listing-agent/frontend` for correctness, maintainability, and regression risk.

## When to use

- Changes in `ai-listing-agent/frontend/src`.
- Route, page, component, state, API client, or auth-flow updates.

## Inputs expected

- Changed frontend files.
- Screens or behavior notes if UI changed.

## Must-check items

- TypeScript strictness preserved; no `any` added without justification.
- Hooks used correctly (stable deps, no side-effect loops).
- Service/API calls remain in service layer where possible.
- Error/loading/empty states handled for async UI flows.
- Tenant/auth behavior remains correct after route or API changes.
- Existing tests updated for behavior changes.

## Validation commands

- Syntax: `cd ai-listing-agent/frontend && npx tsc --noEmit -p tsconfig.json`
- Build: `cd ai-listing-agent/frontend && npm run build`
- Tests: `cd ai-listing-agent/frontend && npm test`

## Should-fix items

- Large component logic that should be extracted.
- Inconsistent naming or prop contracts.
- Missing accessibility attributes for interactive controls.

## Output format

- Severity-ordered findings with file references.
- Include explicit regression risk note for routing/auth changes.
- If no issues: state "No findings" and list residual test gaps.
