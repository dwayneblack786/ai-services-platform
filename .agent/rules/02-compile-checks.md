# Rule 2: Compile/Build Checks After Edits

Scope:

- `ai-listing-agent/frontend`
- `ai-listing-agent/backend-node`
- `product-management/frontend`
- `product-management/backend-node`
- `services-java/listing-service`

Mandatory trigger:

- Run compile/build checks for the affected tier after any code change.
- Run only for the affected tier(s); you do not need to run all tiers for a single-tier change.

Required commands:

- ai-listing-agent frontend build:
  - `Set-Location ai-listing-agent/frontend; npm run build`
- ai-listing-agent backend build:
  - `Set-Location ai-listing-agent/backend-node; npm run build`
- product-management frontend build:
  - `Set-Location product-management/frontend; npm run build`
- product-management backend build:
  - `Set-Location product-management/backend-node; npm run build`
- Java listing service compile/package verification:
  - `Set-Location services-java/listing-service; ./mvnw clean install -DskipTests`
- Java va-service compile/package verification:
  - `Set-Location services-java/va-service; ./mvnw clean install -DskipTests`

Pass criteria:

- Build succeeds with exit code 0.
- No unresolved module/import/class errors.

Fail handling:

- Fix compile errors before writing follow-up features.
- If failure comes from unrelated pre-existing issues, document it clearly in the work summary.
