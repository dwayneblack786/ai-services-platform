# Service: services-java/listing-service

Context:

- Spring Boot 4.0.1 agentic service orchestrating the ListingLift pipeline using LangChain4j.
- Two human-in-the-loop review gates: after Auto-Fill and after Compliance.
- Data store is configurable per tenant: MongoDB, PostgreSQL, or S3.

Source file/path:

- `services-java/CLAUDE.md`
- `services-java/listing-service/`

Last verified date:

- 2026-04-16

Verified commands:

- `cd services-java/listing-service && ./mvnw -q -DskipTests compile`
- `cd services-java/listing-service && ./mvnw clean install -DskipTests`
- `cd services-java/listing-service && ./mvnw test`

Pipeline:

```
Photos → Ingest → Vision → Auto-Fill → [HUMAN REVIEW] → Copywriter → Compliance → [HUMAN REVIEW] → Accept & Store
```

Actionable notes:

- Uses LangChain4j for orchestration — `services-python/listing-agents/` is a reference stub only.
- Claude Sonnet for quality tasks (copywriting, compliance); Claude Haiku for speed tasks (classification, routing).
- All API keys and service URLs must be environment-driven; never hardcoded.
- gRPC proto source is in `product-management/backend-node/proto/`; each service has its own local copy.
- New or changed pipeline/service logic requires unit tests under `src/test/java`.
