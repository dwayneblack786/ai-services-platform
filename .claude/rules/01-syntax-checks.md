# Rule 1: Syntax Checks After New or Edited Code

Scope:

- `ai-listing-agent/frontend`
- `ai-listing-agent/backend-node`
- `product-management/frontend`
- `product-management/backend-node`
- `services-java/listing-service`

Mandatory trigger:

- Run syntax checks every time new code is introduced or existing code is edited.
- Run only for the affected tier(s); you do not need to run all tiers for a single-tier change.

Required commands:

- ai-listing-agent frontend (TypeScript):
  - `Set-Location ai-listing-agent/frontend; npx tsc --noEmit -p tsconfig.json`
- ai-listing-agent backend Node (TypeScript):
  - `Set-Location ai-listing-agent/backend-node; npx tsc --noEmit -p tsconfig.json`
- product-management frontend (TypeScript):
  - `Set-Location product-management/frontend; npx tsc --noEmit -p tsconfig.json`
- product-management backend Node (TypeScript):
  - `Set-Location product-management/backend-node; npx tsc --noEmit -p tsconfig.json`
- Java listing service:
  - `Set-Location services-java/listing-service; ./mvnw -q -DskipTests compile`
- Java va-service:
  - `Set-Location services-java/va-service; ./mvnw -q -DskipTests compile`

Pass criteria:

- No TypeScript parse/type syntax errors.
- No Java compilation/syntax errors.

Fail handling:

- Do not continue to compile, test, or merge until syntax failures are resolved.
