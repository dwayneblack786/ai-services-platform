# Rule 8: Plan Output Format Rules

When producing implementation plans, follow this exact structure derived from:

- `C:/Users/Owner/Documents/project-work-cli/out-prompt-context/output-context.txt`

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
