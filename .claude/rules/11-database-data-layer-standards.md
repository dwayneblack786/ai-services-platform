# Rule 11: Database and Data Layer Standards

Scope:

- `ai-listing-agent/backend-node` — Mongoose schemas, models, queries, migrations
- `product-management/backend-node` — Mongoose schemas, models, queries, migrations
- `services-java/listing-service` — Spring Data MongoDB repositories and queries
- `scripts/mongo/` — migration and backfill scripts

Mandatory trigger:

- Any new or changed Mongoose schema, model, index declaration, aggregation pipeline, or query in Node.js tiers.
- Any new or changed Spring Data MongoDB repository method or `@Query` annotation.
- Any migration or backfill script under `scripts/mongo/`.
- Any change to multi-tenant data access patterns.

Required standards:

**Schema design:**

- Add `tenantId` to every document that is tenant-scoped; index it.
- Set `{ timestamps: true }` on all Mongoose schemas unless there is a concrete reason not to — document the reason in a code comment.
- Do not use `strict: false` without a justified comment explaining why.
- Use ISO 8601 strings or JavaScript `Date` objects for date fields; never plain Unix epoch integers unless forced by an external contract.
- Keep schema changes additive: add fields with defaults rather than renaming or removing live fields. Rename/removal requires a two-phase migration.

**Query and index standards:**

- Index all fields used in `find()` filters, `sort()`, or aggregation `$match`/`$lookup` stages.
- Compound index field order must match the `{ filter, sort }` signature of the frequent query.
- Use `lean()` on read-heavy Mongoose queries that do not need document methods.
- All writes must go through the Mongoose model — do not fall back to raw driver `collection` calls on a managed model.
- Include a `tenantId` filter on every query against tenant-scoped collections; no full-collection scans without explicit justification.

**Migration standards:**

- Migrations must be idempotent (safe to re-run).
- Migrations must operate in bounded batches, not a single unbounded bulk operation.
- Rollback path must be documented, or the migration must be non-destructive by design.
- A migration must not drop or rename a field still being read by active application code.

**Security:**

- Do not store PII or sensitive values in plaintext without encryption justification.
- Query outputs that reach API responses must not leak cross-tenant data.
- Logging in the data layer must not include field values containing PII or credentials.

Pass criteria:

- `tenantId` present and indexed on all new tenant-scoped documents.
- All queried fields indexed; no full-collection scans on hot-path queries.
- Migrations idempotent and batched.
- No cross-tenant data leakage paths in new or changed queries.

Fail handling:

- Do not merge schema changes that drop or rename fields without a two-phase migration plan.
- Do not merge queries lacking `tenantId` scoping on tenant collections.
- Do not merge incomplete migrations (no idempotency, no batch logic).
- Apply the review skill before merging: `.ai/skills/code-review/review-database-data-layer.md`
