# Service: services-java/listing-service

Context:

- Spring Boot 4.0.1 agentic service orchestrating the ListingLift pipeline using LangChain4j.
- Two human-in-the-loop review gates: after Auto-Fill and after Compliance.
- Data store is configurable per tenant: MongoDB, PostgreSQL, or S3.
- This service is the durable Java orchestration layer behind ListingLift flows surfaced in `ai-listing-agent` and platform-hosted ListingLift routes.

Source file/path:

- `services-java/CLAUDE.md`
- `services-java/listing-service/`
- `.claude/skills/code-changes/senior-ai-agentic-implementation.md`
- `.claude/skills/code-review/review-java-listing-service.md`

Last verified date:

- 2026-04-16

Verified commands:

- `cd services-java/listing-service && ./mvnw -q -DskipTests compile`
- `cd services-java/listing-service && ./mvnw clean install -DskipTests`
- `cd services-java/listing-service && ./mvnw test`

Repository ownership:

- Git operations for this service belong to the `services-java` repository.
- Do not combine `.claude/` docs with `services-java` source changes in one repository-local commit.
- Canonical gRPC protos are shared from `product-management/backend-node/proto/`; each Java service keeps its own local copy.

Pipeline:

```
Photos → Ingest → Vision → Auto-Fill → [HUMAN REVIEW] → Copywriter → Compliance → [HUMAN REVIEW] → Accept & Store
```

Architecture notes:

- Preferred Java stack is Spring Boot 4.0.1 + Java 21 with environment-driven configuration.
- LangChain4j is the active orchestration runtime; `services-python/listing-agents/` remains a reference stub, not production runtime.
- Human review is required at policy and risk boundaries, especially after Auto-Fill and Compliance stages.
- The service should keep orchestration logic in service or pipeline classes and leave transport/controller layers thin.

Integration boundaries:

- `ai-listing-agent` acts as the UI/API layer and delegates heavy orchestration to this service.
- `product-management/backend-node/proto/` is the canonical source for shared gRPC contract definitions.
- External models follow a role split: Claude Sonnet for higher-quality generation and compliance tasks, Claude Haiku for faster classification and routing work.

Operational checks:

- If pipeline logic changes, run compile, build, and tests before merging.
- If proto contracts change, verify local generated classes and package alignment before investigating Spring wiring issues.
- Keep all keys, model settings, and service URLs environment-driven.
- Avoid logging raw prompts, model outputs, or sensitive listing/customer content by default.

Related runbooks:

- `../runbooks/listing-service-change-verification.md`
- `../runbooks/java-grpc-proto-sync-and-runtime-checks.md`

Actionable notes:

- Uses LangChain4j for orchestration — `services-python/listing-agents/` is a reference stub only.
- Claude Sonnet for quality tasks (copywriting, compliance); Claude Haiku for speed tasks (classification, routing).
- All API keys and service URLs must be environment-driven; never hardcoded.
- gRPC proto source is in `product-management/backend-node/proto/`; each service has its own local copy.
- New or changed pipeline/service logic requires unit tests under `src/test/java`.
- Good retrieval path for new work: repo memory note → this service page → one related runbook → source code or deeper docs only if still needed.
