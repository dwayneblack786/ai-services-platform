# Rule 1: Syntax Checks After New or Edited Code

Scope:

- `ai-listing-agent/frontend`
- `ai-listing-agent/backend-node`
- `services-java/listing-service`

Mandatory trigger:

- Run syntax checks every time new code is introduced or existing code is edited.

Required commands:

- Frontend (TypeScript):
  - `Set-Location ai-listing-agent/frontend; npx tsc --noEmit -p tsconfig.json`
- Backend Node (TypeScript):
  - `Set-Location ai-listing-agent/backend-node; npx tsc --noEmit -p tsconfig.json`
- Java listing service:
  - `Set-Location services-java/listing-service; ./mvnw -q -DskipTests compile`

Pass criteria:

- No TypeScript parse/type syntax errors.
- No Java compilation/syntax errors.

Fail handling:

- Do not continue to compile, test, or merge until syntax failures are resolved.
