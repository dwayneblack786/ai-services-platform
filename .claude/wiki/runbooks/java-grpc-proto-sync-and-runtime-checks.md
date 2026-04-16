# Runbook: Java gRPC Proto Sync and Runtime Checks

Context:

- Use this when a Java service compiles but fails at runtime after gRPC or protobuf changes, or when proto contract drift is suspected.
- Especially useful for services under `services-java/` that depend on shared proto definitions from `product-management/backend-node/proto/`.

Source file/path:

- `services-java/CLAUDE.md`
- `docs/GRPC-SPRING-TROUBLESHOOTING.md`
- `.claude/wiki/services/listing-service.md`
- `.claude/skills/security-audit/audit-api-contracts.md`

Last verified date:

- 2026-04-16

Verified commands:

- `cd services-java/listing-service && ./mvnw -q -DskipTests compile`
- `cd services-java/listing-service && ./mvnw test`
- `cd services-java/va-service && ./mvnw -q -DskipTests compile`

Symptoms:

- `ClassNotFoundException` or `NoClassDefFoundError` for generated protobuf classes
- compile succeeds but Spring bean initialization fails at runtime
- generated classes do not match expected package or message names
- Java service local proto copy appears out of sync with the canonical proto definitions

Actionable notes:

- Start by confirming whether the problem is build-time or runtime. Do not assume a generated-class issue if compile already passes.
- Canonical shared proto definitions live in `product-management/backend-node/proto/`; local Java service copies must stay aligned.
- Verify protobuf options such as `java_multiple_files`, `java_package`, and any outer classname settings before changing Spring wiring.
- If a runtime error mentions a generated class, inspect generated output and classpath before refactoring service beans.

Verification sequence:

1. Re-run compile in the affected Java service.
2. Check the local proto file against the canonical proto definition in `product-management/backend-node/proto/`.
3. Verify generated classes exist in the expected package path under `target/generated-sources/` and `target/classes/`.
4. If compile passes, inspect dependency and runtime wiring before assuming proto generation failed.
5. If the issue persists, review bean wiring, package imports, and dependency tree for protobuf or gRPC mismatches.

Escalate when:

- generated classes exist but runtime still cannot load them
- package names differ between proto options and Java imports
- multiple services appear to have drifted away from the canonical proto source
- authentication, message size, or metadata validation were changed alongside the contract