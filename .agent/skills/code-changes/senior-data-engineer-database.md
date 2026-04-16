# Skill: Senior Data Engineer — Database Design and Operations

## Purpose

Implement and review database-related changes with the judgment of an experienced data engineer. Covers schema design, query optimization, indexing, migrations, tenant isolation, and interoperability between MongoDB (primary) and relational databases (PostgreSQL / MySQL) where applicable to the platform.

## When to Use

- New or changed Mongoose schemas in `ai-listing-agent/backend-node` or `product-management/backend-node`
- New MongoDB collections, indexes, or aggregation pipelines
- Data migration or backfill scripts under `scripts/mongo/`
- Query optimization or slow-query investigation
- Multi-tenant data isolation design
- Relational database integrations (new or external service contracts)
- Schema evolution, versioning, or compatibility changes
- Data pipeline, ETL, or reporting query design

---

## Platform Data Context

- **Primary store:** MongoDB 7.0, internal port 27017, exposed on 27018 via Podman (`podman-compose up -d`).
- **Database name:** `ai_platform`
- **ORM/ODM:** Mongoose (Node.js tiers)
- **Spring Data MongoDB** used in `services-java/` tiers
- **Relational** databases are not currently provisioned in Podman but may be used by external integrations or future tiers

---

## MongoDB Schema Design Standards

### Document Shape

- Design documents around **access patterns, not normalization**. Embed related data that is always read together; reference data that can grow unboundedly or is accessed independently.
- Add `tenantId` to every document that is tenant-scoped; index it.
- Use ISO 8601 strings or JavaScript `Date` objects consistently — never plain Unix epoch numbers unless forced by external contracts.
- Keep schema migration additive: add fields with defaults rather than renaming/removing live fields without a two-phase migration.

### Mongoose-specific

- Define explicit Mongoose schemas; avoid `strict: false` except for well-justified dynamic payloads.
- Add `{ timestamps: true }` to all collections unless there is a concrete reason not to.
- Prefer `lean()` on read-heavy queries that do not need Mongoose document methods.
- Always use the Mongoose model for writes; do not fall back to raw driver calls on a collection the model manages.

### Index Standards

- Index all fields used in `find()` filters, `sort()`, or `lookup` stages in aggregations.
- Use compound indexes to match the `{ filter, sort }` order of frequent queries.
- Use sparse indexes for optional fields that are queried only when present.
- Use unique indexes for business-key fields (e.g., `email`, `tenantId + externalId`).
- Audit unused indexes periodically — they have write overhead.

**Review checklist:**
- [ ] Every `find()` / `findOne()` has a covering index
- [ ] `tenantId` is indexed on multi-tenant collections
- [ ] No missing index on fields used in `$match` stages of aggregation pipelines
- [ ] Sparse / partial indexes used where field is not always present

---

## Query Design Standards

### Anti-patterns to reject

```typescript
// ❌ FAIL: Unbounded query — will full-scan large collections
await Listing.find({});

// ❌ FAIL: Regex without index on high-cardinality field
await Listing.find({ title: /downtown/i });

// ❌ FAIL: NoSQL injection — trusting user objects directly in query
await User.findOne({ email: req.body.email }); // if email = { $ne: null }

// ❌ FAIL: Sorting on un-indexed field over large dataset
await Listing.find({ tenantId }).sort({ someUnsupportedField: -1 }).limit(20);
```

### Accepted patterns

```typescript
// ✅ PASS: Bounded query with index-covered filter and projection
await Listing.find({ tenantId, status: 'active' })
  .select('title price status createdAt')
  .sort({ createdAt: -1 })
  .limit(50)
  .lean();

// ✅ PASS: Sanitized string search — validate shape before use
const sanitized = String(req.query.q).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
await Listing.find({ tenantId, title: { $regex: sanitized, $options: 'i' } });

// ✅ PASS: Aggregation pipeline with early $match on indexed fields
await Order.aggregate([
  { $match: { tenantId, status: 'completed', createdAt: { $gte: from } } },
  { $group: { _id: '$productId', total: { $sum: '$amount' } } },
  { $sort: { total: -1 } },
  { $limit: 10 }
]);
```

**Query review checklist:**
- [ ] No unbounded `find({})` on large collections
- [ ] All user-supplied values cast/validated before use in query predicates
- [ ] `$where` and server-side JS operators (`$function`) avoided unless no alternative
- [ ] Aggregation pipelines open with `$match` on indexed fields before expensive stages
- [ ] Projections used on large documents to avoid returning unused fields

---

## Multi-Tenant Data Isolation

- Every collection that stores tenant-specific data must include `tenantId` in every document.
- **Every query** into a tenant-scoped collection must include `{ tenantId }` in the filter — no exceptions.
- Middleware or service-layer helpers must inject `tenantId` so route handlers cannot accidentally omit it.
- No cross-tenant query should be possible from a user-facing path without explicit admin-scope escalation.

**Isolation review checklist:**
- [ ] New collection has `tenantId` field and index
- [ ] Service method signature requires `tenantId` as a parameter — not derived from request body
- [ ] No path exists that returns documents from more than one tenant without admin authorization
- [ ] Admin queries explicitly logged and flagged in monitoring

---

## Migration and Schema Evolution

- Migrations are additive by default: add fields with safe defaults, do not remove live-used fields in the same deploy.
- For field renames or removals: two-phase approach — (1) write to both old + new, read from old; (2) backfill; (3) switch reads to new; (4) drop old.
- Migration scripts live in `scripts/mongo/`; they must be idempotent (safe to run more than once).
- Always test migration scripts against a copy of production data shape before applying to production.
- Version your schema changes in a changelog comment at the top of the migration script.

**Migration checklist:**
- [ ] Script is idempotent
- [ ] Tested against representative data volume
- [ ] Rollback steps documented in script header
- [ ] No destructive operation in first phase of two-phase migration

---

## Relational Database Interoperability

When integrating with external relational data sources (PostgreSQL / MySQL) or designing a relational schema for a future tier:

- Use parameterized queries — no string interpolation in SQL.
- Define explicit column types; avoid `VARCHAR(MAX)` / `TEXT` for indexed columns.
- Every table must have a surrogate primary key (`BIGINT` or `UUID`).
- Apply `tenantId` foreign key or column on all tenant-scoped tables; enforce at DB level with partial indexes and row-level security where the DB supports it.
- Prefer explicit JOINs over subqueries in the SELECT list for query planner predictability.
- Keep migration files named with sequential timestamps; use a migration tool (Flyway, Liquibase, or equivalent) — no ad hoc schema changes.

---

## Performance Investigation Workflow

When investigating slow queries or high-CPU MongoDB operations:

1. Enable `db.setProfilingLevel(1, { slowms: 100 })` in a non-production environment.
2. Run `db.system.profile.find().sort({ ts: -1 }).limit(20)` to surface slow ops.
3. Use `explain('executionStats')` on the suspect query to confirm index use.
4. Check `winningPlan.stage`; a `COLLSCAN` on a large collection indicates a missing index.
5. Add the index and re-run `explain()` to confirm `IXSCAN`.
6. Drop the profiling level after investigation.

---

## Security Standards (Database Layer)

- Never interpolate user input directly into query objects — validate type and shape first.
- Use Mongoose schema validators (`required`, `enum`, `match`) as a second defense layer after request validation.
- Store connection strings and credentials only in environment variables; never in source code.
- Use read replicas for reporting workloads; do not run analytics aggregations against the primary in production.
- Limit MongoDB user permissions to the minimum: application user should not have `dbAdmin` or `clusterAdmin` roles.
- Sanitize all `$where`, `mapReduce`, or `$function` operator usage — prefer structured aggregation pipeline operators.

---

## Validation Commands

No compilation gate applies directly to Mongoose schema files, but run the tier's full quality gate after any schema/query change:

- Backend Node syntax: `Set-Location ai-listing-agent/backend-node; npx tsc --noEmit -p tsconfig.json`
- Backend Node build: `Set-Location ai-listing-agent/backend-node; npm run build`
- Backend Node tests: `Set-Location ai-listing-agent/backend-node; npm test`
- Backend Node coverage: `Set-Location ai-listing-agent/backend-node; npm run coverage`
- Java listing service (Spring Data Mongo): `Set-Location services-java/listing-service; ./mvnw -q -DskipTests compile`

---

## Output Format

- Describe schema design decisions and the access patterns they serve.
- List indexes created and justify each one.
- Document migration steps and rollback plan.
- Flag cross-tenant query risks and confirm isolation is preserved.
- Include `explain()` output or estimated query plan when optimizing existing queries.
