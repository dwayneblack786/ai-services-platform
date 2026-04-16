# Rule 9: AI Wiki and Knowledge Organization Rules

Purpose:

- Keep agent knowledge concise and retrievable so every task does not require rereading all docs.

Knowledge location convention:

- Use `.claude/wiki` as the knowledge base root.
- Suggested structure:
  - `.claude/wiki/index.md`
  - `.claude/wiki/decisions/`
  - `.claude/wiki/runbooks/`
  - `.claude/wiki/glossary.md`
  - `.claude/wiki/services/` (one file per service)

Ingestion rule for new information:

1. Read only docs relevant to the active task.
2. Extract durable facts (architecture, commands, contracts, limits, gotchas).
3. Write concise summaries in wiki pages, each with:
   - Context
   - Source file/path
   - Last verified date
   - Actionable notes
4. Link related entries from `index.md`.

Summarization standards:

- Prefer bullet points and short sections.
- Capture commands that are verified to work.
- Mark unknowns and assumptions explicitly.
- Avoid duplicating full documentation text.

Retrieval workflow before coding:

1. Check wiki index and relevant service page first.
2. Read original docs only when wiki lacks required detail.
3. After completing work, update wiki entries affected by the change.

Quality rule:

- Knowledge entries must be maintained as code evolves; stale entries should be corrected or removed.
