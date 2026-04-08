# Product Management Scripts

Operational scripts for product-management are now maintained here.

## Folders

- `keycloak/`: realm/client setup and tenant seeding
- `mongo/`: database setup, verification, and migration helpers

## Notes

- Prefer these script paths over root-level `scripts/` paths.
- Root-level script copies may remain temporarily during migration for compatibility.
- Validate script behavior in non-production environments before running on shared databases.
