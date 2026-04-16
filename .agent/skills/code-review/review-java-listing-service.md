# Skill: Review Java Services (Spring Boot)

## Purpose

Review any `services-java/` service changes for Spring Boot correctness, service design safety, and test quality. Applies to all current and future services: `listing-service`, `cv-service`, `fieldvoice-service`, `idp-service`, and any new services added under `services-java/`.

## When to use

- Java source, config, or proto changes in any service under `services-java/`.

## Inputs expected

- Changed Java files, application config changes, and any API/pipeline/gRPC behavior notes.
- Service name so validation commands can be scoped correctly.

## Must-check items

- Constructor injection preferred over hidden/static state.
- Controllers/interceptors remain thin; orchestration in service/pipeline classes.
- Config remains environment-driven in `application.yml` style.
- External call handling includes timeout/error boundaries.
- New or changed logic has matching unit tests in `src/test/java`.

## Validation commands

Replace `<service>` with the service being reviewed (e.g. `listing-service`, `cv-service`):

- Compile: `cd services-java/<service> && ./mvnw -q -DskipTests compile`
- Build: `cd services-java/<service> && ./mvnw clean install -DskipTests`
- Tests: `cd services-java/<service> && ./mvnw test`

## Should-fix items

- Overly broad exception handling.
- Logging sensitive payloads/prompts.
- Hard-to-read pipelines without clear step contracts.

## Output format

- Severity-ordered findings with class and method context.
- Mention risk to pipeline correctness, data safety, or API compatibility.
