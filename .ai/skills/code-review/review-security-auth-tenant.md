# Skill: Review Security, Auth, and Tenant Isolation

## Purpose

Perform a focused security pass across changed files, especially auth and tenant boundaries.

## When to use

- Any endpoint/auth/session/tenant/data-access change.
- Any logging, upload, or external integration change.

## Inputs expected

- Changed files and threat-sensitive surfaces (auth routes, middleware, models, external calls).

## Must-check items

- No hardcoded secrets, tokens, API keys, or credentials.
- Tenant boundary checks exist where data is queried or mutated.
- CORS/session cookie settings are safe for environment.
- Request inputs are validated/sanitized before use.
- Sensitive values are not exposed in logs or error responses.
- File upload flows enforce content type/size/path safeguards.

## Validation notes

- Security is checklist-driven plus targeted code inspection.
- Mark any unresolved security uncertainty as at least Medium severity.

## Output format

- Start with exploitable issues first.
- Provide concrete attack path and exact remediation.
- End with checklist status:
  - Secrets safe
  - Auth/tenant checks present
  - Input validation present
  - Logging safe
