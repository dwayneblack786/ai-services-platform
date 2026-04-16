# Rule 12: Breaking-Change and API Contract Checks

Scope:

- `ai-product-management/backend-node/proto/` — canonical gRPC proto definitions
- Any `.proto` file in `services-java/` or `services-python/`
- Public REST API routes in `ai-product-management/backend-node/` and `ai-listing-agent/backend-node/`
- Mongoose schema fields that are consumed by downstream services or serialized in API responses
- Shared TypeScript types in `shared/`

Mandatory trigger:

- Any addition, removal, or rename of a field or message in a `.proto` file.
- Any removal or rename of a public REST route, method, or response field consumed by any client.
- Any removal or rename of a shared TypeScript type in `shared/`.
- Any Mongoose schema field removal or rename where the field appears in an API response or gRPC message.

Required checks:

1. **Proto changes:**
   - Identify all consumers of the changed proto (Java services, Python services, Node.js gRPC clients).
   - Confirm generated classes in all consumer services are regenerated and aligned before merge.
   - Do not remove a proto field without a deprecation period or coordinated multi-repo release.
   - Field numbers in proto messages must never be reused for a different field after removal.
   - Run: `Set-Location services-java/listing-service; ./mvnw -q -DskipTests compile` to verify Java compile after proto sync.

2. **REST API changes:**
   - Removing or renaming a route or response field is a breaking change — require explicit approval or a versioning strategy.
   - New optional fields in responses are non-breaking; new required fields in requests are breaking.
   - Document the change in `docs/openapi.yaml` if the route is covered there.

3. **Shared TypeScript type changes:**
   - Run syntax checks for all tiers that import from `shared/` after a type change.
   - A required field removal or rename is breaking — coordinate across `ai-listing-agent` and `ai-product-management` consumers.

Pass criteria:

- All proto consumers compile after proto change.
- No removed or renamed route/field without a versioning or deprecation strategy.
- `shared/` type changes verified across all TypeScript consumers.

Fail handling:

- Do not merge a proto field removal without confirming all consumers are updated in the same coordinated release.
- Do not silently remove a REST route or rename a response field used by the frontend.
- If the change is cross-repo, document the dependency order and merge sequence in PR notes before merging any side.
- Apply the contract review skill before merging: `.ai/skills/code-review/review-contract-and-breaking-change.md`

