# Rule 9: AI Wiki and Knowledge Organization Rules

Purpose:

- Keep agent knowledge concise and retrievable so every task does not require rereading all docs.

Knowledge location convention:

- Use `.ai/wiki` as the knowledge base root.
- Suggested structure:
  - `.ai/wiki/index.md`
  - `.ai/wiki/decisions/`
  - `.ai/wiki/runbooks/`
  - `.ai/wiki/glossary.md`
  - `.ai/wiki/services/` (one file per service)

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
- Avoid storing full chat transcripts as durable memory.
- Prefer distilled conclusions over chronological notes.

Retrieval workflow before coding:

1. Check the smallest relevant memory source first:
   - `/memories/repo/` for compact reusable facts
   - `.ai/wiki/index.md` and the relevant service or runbook page
2. Open the matching skill or rule only if the task requires implementation, review, or security guidance.
3. Read original docs or source files only when the targeted memory and wiki notes lack required detail.
4. After completing work, update wiki entries affected by the change.

Promotion workflow after coding:

1. Review current session notes and extracted facts.
2. Promote reusable facts to the smallest durable destination:
   - `/memories/repo/` for compact agent-facing facts and recurring gotchas
   - `.ai/wiki/runbooks/` for repeatable troubleshooting steps and verified commands
   - `.ai/wiki/decisions/` for architecture decisions and tradeoffs
   - `.ai/wiki/services/` for stable service-specific facts and contracts
3. Do not promote raw transcripts, speculative notes, or one-off dead ends.
4. Link new high-value wiki entries from `.ai/wiki/index.md`.

Governance sync automation (mandatory):

- Any change under `.ai/` must trigger governance synchronization before commit.
- Preferred command: `npm run ai:sync:auto` (auto-detects changed `.ai` areas and runs the correct sync flow + validation).
- If `.ai/skills/` changed, sync must include skills mirror targets: `.agent/skills` and `.github/skills` in addition to `.claude`.
- Pre-commit automation in `.ai/hooks/pre-commit` should handle this when staged files include `.ai/*`; if pre-commit is unavailable, run `npm run ai:sync:auto` manually.

Quality rule:

- Knowledge entries must be maintained as code evolves; stale entries should be corrected or removed.
- Long-term memory should improve retrieval, not increase default context size.
