# Rule 7: Coverage Gates For New and Edited Code

Goal:

- Prevent untested code growth.

Coverage policy:

- New code or materially changed code must include test coverage for core logic paths.
- Minimum expectation for changed units:
  - Success path covered
  - At least one failure or edge path covered

Tier-specific enforcement:

- Frontend (`ai-listing-agent/frontend`):
  - Prefer enabling coverage run in Vitest for changed modules.
  - If coverage command is unavailable, provide explicit test-case mapping in change notes.
- Backend (`ai-listing-agent/backend-node`):
  - Required command: `Set-Location ai-listing-agent/backend-node; npm run coverage`
  - New or materially changed backend logic must include success and edge/failure path coverage.
- Java (`services-java/listing-service`):
  - Use `./mvnw test` for now.
  - If JaCoCo is added later, enforce coverage thresholds in Maven build.

Merge gate behavior:

- Reject changes that add logic without tests unless explicitly approved with a tracked follow-up task.
