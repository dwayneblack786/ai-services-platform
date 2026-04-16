# Glossary

## ListingLift

- Listing content and staging product implemented in `ai-listing-agent`.

## Listing Service

- Java Spring Boot orchestration service under `services-java/listing-service`.

## Quality Gates

- Post-edit order: syntax, build, tests, coverage when applicable, security review.

## Repository Scope

- The workspace root (`ai-services-platform/`) is a workspace-scoped development repository. It owns `.ai/`, `docs/`, `plans/`, `podman-compose.yml`, root `CLAUDE.md`, and shared scripts. It is not a product repository.
- `services-java`, `ai-product-management`, `ai-listing-agent`, and `shared` are independent product repositories.
- Changes, commits, and PRs must be handled per the repository that owns the changed files.
- Workspace root commits must not contain source files from a nested product repository.

Last verified date:

- 2026-04-16