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

## Code Intelligence And Validation Skills

- `code-intel/build-knowledge-graph.ps1`: generate cross-repo dependency knowledge graph artifacts for research and impact analysis.
- `code-intel/validate-workspace-changes.ps1`: run syntax and test validation across workspace modules.
- `code-intel/README.md`: usage guide and recommended change-safety workflow.