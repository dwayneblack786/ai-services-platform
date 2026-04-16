# Rule 6: Testing Standards By Tier

Mandatory trigger:

- Every behavior change must include tests or an explicit documented reason why test automation is not feasible.

Frontend (`ai-listing-agent/frontend`):

- Test framework: Vitest + Testing Library.
- Required command for relevant changes:
  - `Set-Location ai-listing-agent/frontend; npm test`
- UI behavior changes must include/adjust component/page tests.

Backend (`ai-listing-agent/backend-node`):

- Test framework: Vitest.
- Required command for relevant changes:
  - `Set-Location ai-listing-agent/backend-node; npm test`
- Backend logic changes must include at least one deterministic automated test in the same change.
- If an endpoint cannot be covered directly, document manual verification steps in addition to automated unit coverage.

Java (`services-java/listing-service`):

- Test framework: JUnit via Spring Boot test stack.
- Required command:
  - `Set-Location services-java/listing-service; ./mvnw test`
- New or changed service/pipeline logic must have unit tests under `src/test/java`.

General testing standards:

- Tests must assert outcomes, not only execute code paths.
- Prefer deterministic tests (no random/clock/network flakiness).
- Keep test names behavior-focused.
