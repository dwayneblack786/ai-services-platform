# Code Intelligence Skill Set

This folder provides a practical skill set for long-running, multi-session code work:

- build a code knowledge graph before changes
- use the graph as a research reference for dependency impact
- run syntax and test validation after changes

The goal is to reduce accidental regressions when working across many repositories and services.

## 1) Build A Knowledge Graph

Script:

- `build-knowledge-graph.ps1`

What it does:

- scans key repositories for import/use relationships
- aggregates dependencies into module-level edges
- outputs a Mermaid graph plus JSON edge data and summary notes

Default scan targets:

- `ai-listing-agent`
- `ai-product-starter-template`
- `product-management`
- `shared`
- `services-java`
- `services-python`

Run:

```powershell
./scripts/code-intel/build-knowledge-graph.ps1
```

Optional examples:

```powershell
# Scan only selected repos
./scripts/code-intel/build-knowledge-graph.ps1 -IncludeRepos @('product-management','shared')

# Increase graph edge cap
./scripts/code-intel/build-knowledge-graph.ps1 -MaxEdges 1200

# Custom output folder
./scripts/code-intel/build-knowledge-graph.ps1 -OutputDir "out-prompt-context/custom-graph"
```

Output files:

- `out-prompt-context/knowledge-graph/knowledge-graph.mmd`
- `out-prompt-context/knowledge-graph/edges.json`
- `out-prompt-context/knowledge-graph/summary.md`

## 2) Validate Changes (Syntax + Tests)

Script:

- `validate-workspace-changes.ps1`

What it does:

- runs syntax-level checks (build/lint/compile)
- runs tests where test scripts are available
- includes optional Python syntax checks and Java compile/test checks when present

Run full validation:

```powershell
./scripts/code-intel/validate-workspace-changes.ps1
```

Run only repos with pending git changes:

```powershell
./scripts/code-intel/validate-workspace-changes.ps1 -ChangedOnly
```

Run syntax-only (skip tests):

```powershell
./scripts/code-intel/validate-workspace-changes.ps1 -SkipTests
```

Fail immediately on first error:

```powershell
./scripts/code-intel/validate-workspace-changes.ps1 -FailFast
```

## Recommended Workflow

1. Generate the graph before a significant change set.
2. Inspect likely impact paths in `summary.md` and `knowledge-graph.mmd`.
3. Make code changes.
4. Run validation.
5. If validation fails, fix before commit.
6. Regenerate graph after major refactors to keep references current.

## Notes

- This is a safety accelerator, not a substitute for product-level domain review.
- The graph is intentionally dependency-oriented and may not capture runtime-only behavior.
- Keep repository names and validation commands updated when project structure changes.
