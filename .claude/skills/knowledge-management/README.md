# Knowledge Management Skills

Skills in this folder help organize, discover, and preserve project knowledge across sessions to reduce token consumption and accelerate development context assembly.

## Skills

1. **obsidian-workflow.md** — Set up and maintain an Obsidian vault for the `.claude/` directory to create a persistent, locally-queryable knowledge layer. Covers vault setup, linking conventions, integration with Copilot Chat, search queries for pattern discovery, and token efficiency gains.

## When to Use

- Starting a new coding session and you want to reference past decisions, patterns, or rules without re-explaining
- Building a mental model of cross-tier dependencies and architectural patterns
- Searching across all documentation to find related concepts (e.g., "auth" in rules, skills, wiki, and services)
- Creating bidirectional links between implementation guidance, security audits, and project decisions
- Optimizing token usage by building a local knowledge index instead of re-pasting docs every session

## Recommended Ordering

1. **First session or starting a large feature:**
   - Read `obsidian-workflow.md` completely (10–15 min)
   - Open Obsidian vault in your `.claude/` folder
   - Explore the graph view and run a few test searches
   - Bookmark common queries (e.g., `auth`, `security`, `tenant`)

2. **Subsequent sessions:**
   - Reference Obsidian vault when you need rules, decisions, or patterns
   - Link to vault notes in chat: e.g., `[[rules/04-security-standards]]`
   - Add session notes to `.claude/../memories/session/` and promote durable knowledge to `wiki/` after task completion

## Integration with Other Skills

- **Knowledge-first approach:** Before picking an implementation skill (code-changes/), use vault search to understand existing patterns (token savings)
- **After implementation:** Promote key learnings from session memory to `wiki/decisions/` or `wiki/runbooks/`
- **Before security audit:** Use vault to find relevant audit checklist and cross-reference with implementation guidance
- **Final review:** Use vault as reference during code review as reminder of rules and conventions

## Quick Commands

| Action | Command |
|--------|---------|
| Open vault | Obsidian → Create vault → select `.claude` folder |
| Search across notes | `Ctrl+Shift+F` in Obsidian |
| Find backlinks | `Ctrl+Shift+G` on a note (shows what references it) |
| Rebuild index | Vault stats (`Ctrl+Shift+S`) → Force re-index |
| Create Obsidian link | `[[path/to/note]]` or `[[path/to/note#Heading]]` |

## References

- **Obsidian official docs:** https://help.obsidian.md/
- **Rule 9 (AI Wiki Knowledge Organization):** `.claude/rules/09-ai-wiki-knowledge-rules.md` (describes the vault structure this skill helps you navigate)
- **Main skills index:** `../README.md` for the complete skill directory and recommended workflow
