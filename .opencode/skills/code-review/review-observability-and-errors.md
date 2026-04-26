# Skill: Review Observability and Error Handling

## Purpose

Ensure changes remain diagnosable and production-safe through strong logging, tracing context, and error behavior.

## When to use

- Any backend or Java service change, and frontend error/reporting path updates.

## Inputs expected

- Changed files touching logging, middleware, exception paths, monitoring integrations.

## Must-check items

- Errors are logged with enough context to debug.
- Correlation/request IDs are preserved in request lifecycle.
- Client-facing errors are safe and non-sensitive.
- Sentry/monitoring context is useful and does not leak secrets.
- Retry/fallback paths do not hide persistent failures.

## Validation guidance

- Verify error paths, not only success paths.
- Prefer structured logs over free-form strings.

## Output format

- Severity-ordered findings.
- Include "operational impact" note (debuggability, alert noise, MTTR impact).
- If clean, state residual observability gaps if any.
