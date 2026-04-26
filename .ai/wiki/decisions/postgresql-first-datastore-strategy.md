# Decision: PostgreSQL-First Datastore Strategy

Context:
- This new AI cost optimization and compliance initiative is the first PostgreSQL-first product in the platform.
- It replaces MongoDB and Redis for this project runtime design.
- The implementation serves as the migration reference for future platform products.

Source file/path:
- plans/
- .ai/wiki/index.md
- .ai/wiki/services/product-management.md

Last verified date:
- 2026-04-22

Actionable notes:
- Use PostgreSQL as the single primary datastore for tenant, usage, policy, recommendation, and audit domains.
- Avoid MongoDB and Redis runtime dependencies in this product.
- Model multi-tenant isolation with app-level tenant scoping first; evaluate row-level security in hardening.
- Use immutable audit event patterns and retention/legal-hold strategy in SQL.
- Capture migration blueprint in runbook for reuse by later projects.