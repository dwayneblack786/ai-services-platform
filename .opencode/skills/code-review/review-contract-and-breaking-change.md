# Skill: Review Contracts and Breaking Changes

## Purpose

Detect integration and compatibility risks when interfaces, payloads, or shared contracts change.

## When to use

- API route changes, request/response shape changes, shared type updates, gRPC/proto changes.

## Inputs expected

- Changed contract files, endpoint handlers, DTOs/types, and consumer call sites.

## Must-check items

- Backward compatibility for existing consumers.
- Versioning or migration path for breaking changes.
- Shared auth/tenant type compatibility across services.
- Serialization/deserialization assumptions remain valid.
- Error contract consistency remains intact.

## Should-fix items

- Undocumented contract changes.
- Ambiguous field semantics or nullable behavior changes.

## Output format

- Findings first by severity.
- Include consumer impact summary and migration recommendation.
- Explicitly classify each contract change as:
  - Backward compatible
  - Conditionally compatible
  - Breaking
