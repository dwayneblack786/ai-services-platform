# Rule 4: Security Standards

Applies to all tiers, with special focus on API and auth boundaries.

Core standards:

- Never commit secrets, API keys, passwords, or tokens.
- Read sensitive values only from environment variables or approved secret stores.
- Validate and sanitize all external input (request body, params, query, headers, files).
- Enforce tenant boundary checks for data access and operations.
- Return safe error messages to clients; keep details in server logs only.

Node backend standards (`ai-listing-agent/backend-node`):

- Keep `cors` allow-list explicit (`env.CORS_ORIGINS`); no wildcard with credentials.
- Session cookies must stay `httpOnly`; use `secure` in non-local environments.
- Keep auth/session middleware registered before protected routes.
- Review file upload endpoints for size/type restrictions and path safety.
- Ensure Sentry/logging does not leak credentials or PII.

Java standards (`services-java/listing-service`):

- Keep all API keys and service URLs environment-driven.
- Guard external calls (vision/LLM) with timeouts and controlled error handling.
- Avoid logging raw prompts, full model outputs, or personal data by default.
- Maintain rate-limit controls where available.

Frontend standards (`ai-listing-agent/frontend`):

- Do not store tokens in insecure locations when avoidable.
- Do not expose secrets in client code or build-time constants.
- Escape/untrusted content before rendering.

Security verification checklist before merge:

1. Secret scan on changed files (manual review minimum).
2. Auth and tenant checks present for new endpoints.
3. Input validation added for new request payloads.
4. Sensitive logging review completed.
