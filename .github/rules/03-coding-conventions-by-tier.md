# Rule 3: Coding Conventions By Tier

Scope targets:

- Java: `services-java/listing-service`
- Frontend and Backend Node: `ai-listing-agent`

## Frontend conventions (React + TypeScript + Vite)

- Keep TypeScript strict (`strict: true`) and do not relax strictness for new work.
- Prefer function components and React hooks.
- Keep UI logic in pages/components and API calls in service modules.
- Preserve tenant-aware/auth-aware flows in routing and API interactions.
- Keep tests near changed behavior (`*.test.tsx` where practical).

## Backend Node conventions (Express + TypeScript)

- Use async/await and explicit error handling.
- Keep route handlers thin; business logic belongs in services.
- Use typed request/response shapes from shared types when available.
- Centralize config access via `src/config` modules, not ad hoc environment access.
- Preserve middleware order in startup path (security/session/logging before protected routes).

## Java conventions (Spring Boot + LangChain4j)

- Java 21 features are allowed, but keep code readable and team-maintainable.
- Use constructor injection and avoid hidden global state.
- Keep orchestration logic in service/pipeline classes, controllers thin.
- Keep application config in `application.yml` with environment overrides.
- New behavior requires matching or updated unit tests under `src/test/java`.

Cross-tier conventions:

- No silent catch blocks.
- No hardcoded secrets, tokens, or tenant identifiers.
- Keep log statements structured and avoid sensitive data.
