1. Foundation and Scope Lock
Files: plans/phase-0-ai-cost-optimization-tool-postgresql-v1.md, CLAUDE.md
Done when: Initiative scope states the starting project is ai-cost-optimization-tool frontend + backend-node; plan declares PostgreSQL-first runtime for this product
Depends on: nothing
Verify: Select-String -Path plans/phase-0-ai-cost-optimization-tool-postgresql-v1.md -Pattern "starting project is ai-cost-optimization-tool frontend \+ backend-node|PostgreSQL-first"
Notes: This initiative is the canonical starting point for cost optimization + compliance delivery.

2. Runtime Datastore Decision and Guardrails
Files: plans/phase-0-ai-cost-optimization-tool-postgresql-v1.md, .ai/wiki/decisions/postgresql-first-datastore-strategy.md
Done when: Plan and decision note explicitly state MongoDB and Redis are replaced for this product runtime; decision describes tenant and audit guardrails
Depends on: 1
Verify: Select-String -Path plans/phase-0-ai-cost-optimization-tool-postgresql-v1.md,.ai/wiki/decisions/postgresql-first-datastore-strategy.md -Pattern "MongoDB|Redis|replaced|runtime"
Notes: PostgreSQL is the single runtime datastore for this product.

3. Implementation Baseline and Environment Contract
Files: ai-cost-optimization-tool/backend-node/src/config/env.ts, ai-cost-optimization-tool/backend-node/.env.example
Done when: Backend env contract includes PostgreSQL connection fields and pool settings; .env.example placeholders align one-to-one with typed env entries
Depends on: 1
Verify: Select-String -Path ai-cost-optimization-tool/backend-node/src/config/env.ts,ai-cost-optimization-tool/backend-node/.env.example -Pattern "DATABASE_URL|POSTGRES_HOST|POSTGRES_PORT|POSTGRES_DB|POSTGRES_USER|POSTGRES_PASSWORD|POSTGRES_SSL_MODE|POSTGRES_POOL_MAX|POSTGRES_POOL_MIN|POSTGRES_POOL_IDLE_TIMEOUT_MS|POSTGRES_POOL_CONNECTION_TIMEOUT_MS"
Notes: Support both DATABASE_URL and discrete host/port credentials for local and hosted deployments.

4. Wiki and Indexing Alignment
Files: .ai/wiki/index.md, .ai/wiki/runbooks/README.md, .ai/wiki/decisions/README.md, .ai/wiki/services/product-management.md
Done when: PostgreSQL decision and runbook are discoverable from wiki index and both README indexes; service note reflects PostgreSQL-first rollout intent
Depends on: 2
Verify: Select-String -Path .ai/wiki/index.md,.ai/wiki/runbooks/README.md,.ai/wiki/decisions/README.md,.ai/wiki/services/product-management.md -Pattern "PostgreSQL"
Notes: Keep entries concise and durable for future retrieval.

5. Validation and Repository-Scope Handoff
Files: scripts/update-docs.ps1, plans/phase-0-ai-cost-optimization-tool-postgresql-v1.md
Done when: update-docs append helper writes proper CRLF-prefixed lines; handoff checklist verifies plan location, wiki links, and env alignment
Depends on: 3, 4
Verify: Select-String -Path scripts/update-docs.ps1 -SimpleMatch -Pattern 'Add-Content -Path $file -Value "`r`n$line"'
Notes: Commit workspace-root and ai-cost-optimization-tool repo changes separately.