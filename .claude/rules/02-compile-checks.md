# Rule 2: Compile/Build Checks After Edits

Scope:

- `ai-listing-agent/frontend`
- `ai-listing-agent/backend-node`
- `services-java/listing-service`

Mandatory trigger:

- Run compile/build checks for the affected tier after any code change.

Required commands:

- Frontend build:
  - `Set-Location ai-listing-agent/frontend; npm run build`
- Backend build:
  - `Set-Location ai-listing-agent/backend-node; npm run build`
- Java full compile/package verification:
  - `Set-Location services-java/listing-service; ./mvnw clean install -DskipTests`

Pass criteria:

- Build succeeds with exit code 0.
- No unresolved module/import/class errors.

Fail handling:

- Fix compile errors before writing follow-up features.
- If failure comes from unrelated pre-existing issues, document it clearly in the work summary.
