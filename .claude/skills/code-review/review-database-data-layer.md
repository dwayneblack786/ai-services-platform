# Review Skill: Database and Data Layer Review

## Purpose

Review database schemas, queries, indexes, migrations, and data access patterns across all tiers of the platform. Pairs with `code-changes/senior-data-engineer-database.md`.

## When to Use

- Reviewing Mongoose schema definitions, model changes, or index declarations
- Reviewing MongoDB aggregation pipelines or complex query chains
- Reviewing data migration or backfill scripts under `scripts/mongo/`
- Reviewing Spring Data MongoDB repository methods in `services-java/`
- Reviewing any change that touches multi-tenant data isolation
- Reviewing query performance implications of new features
- Reviewing schema changes for forward/backward compatibility
- Reviewing data access from the security or compliance angle (PII, tenant leakage)

---

## Review Criteria

### Schema Design

- [ ] Documents designed around access patterns, not normalization
- [ ] Embedded vs. referenced decisions are justified (embed: always read together; reference: unbounded growth or independent access)
- [ ] `tenantId` present on all tenant-scoped documents
- [ ] `{ timestamps: true }` set unless explicitly justified otherwise
- [ ] No `strict: false` unless justified with a comment
- [ ] ISO 8601 or JavaScript `Date` for all date fields; no raw epoch integers without justification
- [ ] Schema migration is additive (new fields with defaults) not destructive (rename/removal without two-phase migration)

### Mongoose Usage (Node.js tiers)

- [ ] Explicit Mongoose schema defined; field types match intent
- [ ] `lean()` used on read-heavy queries that do not need Mongoose document methods
- [ ] All writes go through the Mongoose model, not raw driver calls
- [ ] Virtual fields or computed properties are justified and not hiding query complexity
- [ ] Pre/post hooks are documented and do not introduce silent side effects

### Indexes

- [ ] All fields in `find()` filters, `sort()`, or aggregation `$match`/`$lookup` stages are indexed
- [ ] Compound index field order matches the `{ filter, sort }` signature of frequent queries
- [ ] Sparse indexes used for optional fields queried only when present
- [ ] No redundant indexes (covered by a wider compound index already)
- [ ] Index adds are backward-compatible; background builds used on large collections

### Query and Aggregation Quality

- [ ] Queries select only required fields (projection) on large documents
- [ ] Aggregation pipelines have `$match` as early as possible to limit documents processed
- [ ] No full-collection scans on tenant-scoped collections in hot paths
- [ ] Query cursor or pagination used instead of unbounded `.find()` returning all results
- [ ] Aggregations tested with representative data volumes, not just single-document mocks

### Multi-Tenant Isolation

- [ ] `tenantId` filter present on every query against tenant-scoped collections
- [ ] No path where a request from tenant A can read or mutate tenant B's data
- [ ] Middleware or service layer enforces tenant scoping before reaching the model layer
- [ ] Migration scripts scoped by `tenantId` and do not operate on all tenants simultaneously without a safety gate

### Migration and Backfill Safety

- [ ] Migration is idempotent (safe to re-run)
- [ ] Rollback path documented or the migration is designed to be non-destructive
- [ ] Large migrations run in bounded batches, not a single bulk operation
- [ ] No migration drops a field actively read by existing application code
- [ ] Migration tested on a copy of production data before merge

### Security and Compliance

- [ ] PII fields identified; storage and access justified
- [ ] No sensitive data (tokens, keys, personal identifiers) stored in plaintext without encryption justification
- [ ] Query outputs that reach API responses do not leak cross-tenant data
- [ ] Logging in data layer does not include field values containing PII or credentials

### Spring Data MongoDB (Java tier)

- [ ] Repository methods use named queries or `@Query` annotations, not string-concatenated queries
- [ ] `tenantId` filtering enforced at the repository or service layer
- [ ] Large result sets use `Slice`/`Page` or reactive streams, not blocking unbounded lists
- [ ] Connection error handling is explicit; no silent swallowing of `DataAccessException`

---

## Common Red Flags

- `Model.find({})` in a service method without a tenant or scope filter
- Schema field added without a default value in an existing collection (breaks old documents)
- Aggregation pipeline `$unwind` without a preceding `$match` stage
- `strict: false` schema with no comment explaining why
- Migration that renames a field in a single atomic step (breaks concurrent application reads)
- Raw `db.collection(name)` calls bypassing the Mongoose model
- Index defined in application code but never verified to exist in the actual database

---

## Output Format

List findings as:

```
[BLOCKER] Description of issue and why it must be fixed before merge
[CONCERN] Description of risk or quality issue worth addressing
[NOTE] Observation or suggestion that does not block merge
```

Blockers must be resolved. Concerns should be resolved or explicitly accepted with a tracked follow-up.
