# Runbook: PostgreSQL Migration Blueprint (MongoDB + Redis -> PostgreSQL)

Context:
- Repeatable migration playbook for moving product data/state from MongoDB and Redis to PostgreSQL.
- Designed from the first PostgreSQL-first product rollout.

Source file/path:
- plans/
- .ai/wiki/decisions/postgresql-first-datastore-strategy.md

Last verified date:
- 2026-04-22

Verified commands:
- pwsh -File ./scripts/sync-ai-governance-auto.ps1 -Validate

Actionable notes:
- Define entity map before migration:
  - Mongo collections -> SQL tables
  - Redis session/state keys -> SQL session/state tables
- Introduce tenant-safe schema and index strategy before data copy.
- Use batched backfill and idempotent migration jobs.
- Validate parity with row counts, checksum sampling, and tenant-scoped query checks.
- Cutover sequence:
  1. Dual-write optional warmup
  2. Read switch per feature flag
  3. Freeze old writes
  4. Final sync
  5. Full read switch
- Rollback checkpoints:
  - Keep old read path behind feature flag until parity acceptance is complete.
- Post-cutover:
  - Monitor latency, error rates, and tenant isolation checks.