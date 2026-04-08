# Scripts Migration Notes

Operational scripts for product-management are being moved under `product-management/scripts`.

Current local script homes:
- `product-management/scripts/keycloak`
- `product-management/scripts/mongo`

Compatibility wrappers remain in select root script paths during migration.

## Workspace Bootstrap

- install-workspace.ps1: Windows bootstrap for cloning standalone repos, creating missing env files from examples, and installing Java/Node dependencies.
- install-workspace.sh: macOS/Linux bootstrap with the same workflow.
- install_mongodb_tools.py: interactive MongoDB Community Server and MongoDB Compass installer.