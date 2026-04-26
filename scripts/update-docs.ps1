Set-Location "C:\Users\Owner\Documents\ai-services-platform"

# Ensure target folders exist
New-Item -ItemType Directory -Force -Path ".ai/wiki/decisions" | Out-Null
New-Item -ItemType Directory -Force -Path ".ai/wiki/runbooks" | Out-Null
New-Item -ItemType Directory -Force -Path "plans" | Out-Null

# Move plan-like docs into plans/
$moveMap = @{
  "docs/PMS_IMPLEMENTATION_PLAN.md"                               = "plans/pms-implementation-plan.md"
  "docs/RAG_DOCUMENT_UPLOAD_PLAN.md"                              = "plans/rag-document-upload-plan.md"
  "docs/REDIS_CACHE_MIGRATION_PLAN.md"                            = "plans/redis-cache-migration-plan.md"
  "docs/SSO_ANALYSIS_AND_IMPROVEMENT_PLAN.md"                     = "plans/sso-analysis-and-improvement-plan.md"
  "docs/STT-TTS-IMPLEMENTATION-PLAN.md"                           = "plans/stt-tts-implementation-plan.md"
  "docs/VOICE_GREETING_ACTION_PLAN.md"                            = "plans/voice-greeting-action-plan.md"
  "docs/VOICE_INITIAL_GREETING_IMPLEMENTATION_PLAN.md"            = "plans/voice-initial-greeting-implementation-plan.md"
  "docs/voice-streaming/PHASE-3-GRPC-ENHANCEMENT-PLAN.md"        = "plans/phase-3-grpc-enhancement-plan.md"
}

foreach ($src in $moveMap.Keys) {
  if (Test-Path $src) {
    Move-Item -Force $src $moveMap[$src]
    Write-Host "Moved: $src -> $($moveMap[$src])"
  } else {
    Write-Host "Skipped (missing): $src"
  }
}

# Create decision doc
$decisionPath = ".ai/wiki/decisions/postgresql-first-datastore-strategy.md"
@"
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
"@ | Set-Content -NoNewline -Encoding UTF8 $decisionPath

# Create runbook doc
$runbookPath = ".ai/wiki/runbooks/postgresql-migration-blueprint.md"
@"
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
"@ | Set-Content -NoNewline -Encoding UTF8 $runbookPath

# Append index links if not present
function Add-LineIfMissing($file, $line) {
if (-not (Select-String -Path $file -SimpleMatch -Pattern $line -Quiet)) {
Add-Content -Path $file -Value "`r`n$line"
}
}

Add-LineIfMissing ".ai/wiki/index.md" "- [Runbook: PostgreSQL Migration Blueprint](runbooks/postgresql-migration-blueprint.md)"
Add-LineIfMissing ".ai/wiki/index.md" "- [Decision: PostgreSQL-First Datastore Strategy](decisions/postgresql-first-datastore-strategy.md)"
Add-LineIfMissing ".ai/wiki/runbooks/README.md" "- [PostgreSQL Migration Blueprint](postgresql-migration-blueprint.md)"
Add-LineIfMissing ".ai/wiki/decisions/README.md" "- [PostgreSQL-First Datastore Strategy](postgresql-first-datastore-strategy.md)"

# Add a short service-note delta if missing
$svcFile = ".ai/wiki/services/product-management.md"
$marker = "PostgreSQL-first initiative note:"

if (-not (Select-String -Path $svcFile -SimpleMatch -Pattern $marker -Quiet)) {
# if (-not (Select-String -Path $svcFile -Pattern [regex]::Escape($marker) -SimpleMatch -Quiet)) {
  Add-Content -Path $svcFile -Value "`r`nPostgreSQL-first initiative note:`r`n- The AI cost optimization and compliance product is designated as the first PostgreSQL-first implementation.`r`n- Runtime dependency intent for this product excludes MongoDB and Redis.`r`n- Outputs of this rollout define migration patterns for subsequent platform products."
}

Write-Host "Done. Plans moved and wiki updated."