# Skill: Senior Java Changes (Spring Boot + Listing Service Standards)

## Purpose

Implement production-grade Java changes in `services-java/listing-service` while adhering to project coding standards.

## When to use

- New service logic, orchestration pipeline updates, gRPC/API updates, configuration changes, or integration work.

## Expertise expectations

- Senior Spring Boot and Java 21 design practices.
- Clean service boundaries and maintainable orchestration code.
- Defensive integration patterns for LLM/vision/external dependencies.

## Coding standards

- Use constructor injection and explicit dependencies.
- Keep controllers/interceptors thin; business logic in services/pipeline classes.
- Keep config environment-driven via `application.yml` conventions.
- Prefer specific exceptions and meaningful error contexts.
- Keep methods cohesive; extract helper classes when complexity grows.
- Avoid logging sensitive data (keys, raw secrets, personal information).

## Reliability standards

- Guard external calls with timeout/retry/failure boundaries as appropriate.
- Ensure deterministic behavior for core pipeline transitions.
- Preserve backward compatibility for existing API/gRPC consumers unless explicitly versioned.

## Validation commands

- Compile: `cd services-java/listing-service && ./mvnw -q -DskipTests compile`
- Build: `cd services-java/listing-service && ./mvnw clean install -DskipTests`
- Tests: `cd services-java/listing-service && ./mvnw test`

## Testing expectations

- New or changed logic requires unit tests in `src/test/java`.
- Include at least one edge/failure-path test for non-trivial behavior.

## Output format

- Summarize changed components and standards compliance.
- List any compatibility risk, performance risk, and follow-up tasks.
