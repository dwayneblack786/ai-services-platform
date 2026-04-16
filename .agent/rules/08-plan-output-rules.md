# Rule 8: Plan Output Format Rules

Scope:

- Every implementation plan produced in this workspace, regardless of tier or tool.

Mandatory trigger:

- Any time a plan, task breakdown, or phased implementation document is created or updated.
- Applies to plans stored in `plans/` (workspace root) and any plan produced on request in chat.

Canonical plan location:

- All durable plans must be saved to `plans/` at the workspace root.
- Name files descriptively: `phase-a-java-grpc-agents-v2.md`, `phase-b-node-grpc-socketio.md`, etc.
- Do not store plans in product repo subdirectories or `.claude/plans/` (that path is legacy).
- Reference active plans from `CLAUDE.md` and `curried-bouncing-dolphin.md`.

Required format:

- Output must be a numbered markdown task list only.
- Number every task as `1. Title`, `2. Title`, and so on.
- One task must represent one logical, committable unit of work.

Each task must include labeled fields on separate lines:

- `Files: path1, path2`
- `Done when: verifiable outcome 1; verifiable outcome 2`
- `Depends on: nothing` or `Depends on: 1, 2`
- `Verify: single shell command` (omit only if genuinely not applicable)
- `Notes: constraints/gotchas/context` (omit if none)

Field rules:

- `Files` are repo-relative paths, comma-separated, no leading slash.
- `Done when` must be objectively testable and specific.
- `Depends on` references task numbers or `nothing`.
- `Verify` is exactly one shell command.
- Do not add intros, summaries, or text outside the numbered task list.

Enforcement:

- Reject any plan that uses prose paragraphs, narrative descriptions, or unstructured bullet lists as the primary format.
- Reject any plan missing `Files`, `Done when`, or `Depends on` fields on any task.
- Reject any plan stored outside `plans/` without explicit justification.
- When rewriting an existing plan, save the new version as `<name>-v2.md` (or increment version) and update all references in `CLAUDE.md` and `curried-bouncing-dolphin.md`.
