# Runbooks

Purpose:

- Capture verified operational commands and short troubleshooting notes.
- Preserve repeatable fixes that should survive across sessions.

Runbooks:

- [Repository Boundaries and Change Flow](repo-boundaries-and-change-flow.md)
- [Governance Sync By Change](governance-sync-by-change.md)
- [Listing Service Change Verification](listing-service-change-verification.md)
- [Java gRPC Proto Sync and Runtime Checks](java-grpc-proto-sync-and-runtime-checks.md)
- [MongoDB Operations — Connection Failures, Slow Queries, Index Maintenance](mongodb-operations.md)

Canonical locations:

- Docs: `docs/` (workspace root)
- Scripts: `scripts/` (workspace root)

Entry template:

- Context
- Source file/path
- Last verified date
- Verified commands
- Actionable notes

When to create or update a runbook:

- You resolved a failure mode that is likely to recur
- You verified a troubleshooting sequence or recovery command
- A service has environment or startup behavior that is easy to forget
- A fix required multiple steps that are worth preserving across sessions

Do not use runbooks for:

- Full conversation logs
- Unverified guesses or partial debugging notes
- One-off task plans that belong in session memory

- [PostgreSQL Migration Blueprint](postgresql-migration-blueprint.md)
