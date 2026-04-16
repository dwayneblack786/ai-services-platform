# Runbook: Listing Service Change Verification

Context:

- Use this when `services-java/listing-service` pipeline logic, config, gRPC contracts, or integration behavior changes.
- Goal is to verify the service at the repo boundary before deeper debugging.

Source file/path:

- `services-java/CLAUDE.md`
- `.ai/wiki/services/listing-service.md`
- `.ai/skills/code-review/review-java-listing-service.md`
- `.ai/rules/01-syntax-checks.md`
- `.ai/rules/02-compile-checks.md`
- `.ai/rules/06-testing-standards-by-tier.md`

Last verified date:

- 2026-04-16

Verified commands:

- `cd services-java/listing-service && ./mvnw -q -DskipTests compile`
- `cd services-java/listing-service && ./mvnw clean install -DskipTests`
- `cd services-java/listing-service && ./mvnw test`

Actionable notes:

- Run commands from `services-java/listing-service`, but keep git actions scoped to the `services-java` repository root.
- Use this runbook first when a listing-service change touched pipeline logic, prompts, gRPC contracts, or environment-driven config.
- If compile succeeds but runtime wiring fails after gRPC or proto changes, continue with `java-grpc-proto-sync-and-runtime-checks.md`.
- Re-check the two human review gates after Auto-Fill and Compliance whenever automation behavior changes.
- New or changed service logic requires matching unit tests under `src/test/java`.

Review checklist:

- Confirm the change still respects environment-driven configuration.
- Confirm tenant-specific storage assumptions remain valid.
- Confirm controller/transport layers remain thin and orchestration stays in service or pipeline classes.
- Confirm no sensitive prompts, outputs, or listing/customer data were added to logs.

Escalate when:

- compile passes but runtime startup fails
- gRPC contract changes appear out of sync with generated classes
- model/provider changes bypass human review boundaries
- pipeline logic changed without unit tests