# Skill: Obsidian Vault for Development Knowledge

## Purpose

Treat your `.claude/` directory structure as an Obsidian vault to create a persistent, locally-queryable knowledge layer that reduces token consumption, accelerates context assembly, and enables pattern discovery across rules, decisions, and implementation guidance.

## When to Use This Skill

- You need to reference project rules, decisions, or past guidance without re-explaining in chat
- You're starting a new task and want to understand existing patterns without a full context rebuild
- You want to create bidirectional links between rules, services, and implementation decisions
- You need to search across all documentation to find related concepts (e.g., "auth" appears in rules, skills, wiki)
- Building a mental model of cross-tier dependencies (Node → Java → Python service calls)

## Setup: Opening the Vault

### Option A: Single `.claude` Vault (Recommended for this project)

1. Open Obsidian → "Create new vault"
2. Select folder: `c:\Users\Owner\Documents\ai-services-platform\.claude`
3. Name: `ai-services-platform-knowledge`
4. Obsidian will index all markdown files:
   - `rules/` (10 core development standards)
   - `wiki/` (durable facts: services, decisions, runbooks, glossary)
   - `skills/` (implementation, review, security workflows + this file)
   - `plans/` (task breakdowns, feature phases)

### Option B: Multi-Folder Vault (Advanced)

If you want to unify `.claude/` + `docs/` (lighter documentation) + `plans/` (feature roadmap):
1. Create vault at workspace root
2. Exclude folders in Obsidian settings (Files & Links → Excluded files):
   - `node_modules/`, `services-java/target/`, `.venv/`, `.git/`
3. This gives you a full project knowledge graph but may be noisier

**Recommendation: Start with Option A** (`.claude` only) for focused knowledge management.

---

## Vault Structure & Linking Convention

### File Organization (Already in Place)

```
.claude/
├── rules/
│   ├── README.md                          # Index of all 10 rules
│   ├── 01-syntax-checks.md
│   ├── 02-compile-checks.md
│   ├── 03-coding-conventions-by-tier.md
│   ├── 04-security-standards.md
│   ├── 05-tech-stack-standards.md
│   ├── 06-testing-standards-by-tier.md
│   ├── 07-test-coverage-gates.md
│   ├── 08-plan-output-rules.md
│   ├── 09-ai-wiki-knowledge-rules.md
│   └── 10-repository-boundaries-and-change-scope.md
├── wiki/
│   ├── index.md                           # Master entry point
│   ├── glossary.md
│   ├── services/
│   │   ├── listing-service.md
│   │   ├── va-service.md
│   │   └── ...
│   ├── decisions/
│   │   └── (architecture ADRs)
│   └── runbooks/
│       └── (operational procedures)
└── skills/
    ├── README.md                          # Main skill index
    ├── code-changes/
    │   └── *.md (implementation skills)
    ├── code-review/
    │   └── *.md (review checklists)
    ├── security-audit/
    │   └── *.md (tier-specific audits)
    └── knowledge-management/
        └── obsidian-workflow.md (this file)
```

### Linking Convention

**In Obsidian, use wiki-style links to reference notes:**

- **Within same folder**: `[[03-coding-conventions-by-tier]]`
- **Cross-folder with path**: `[[../wiki/index|Master Wiki]]`
- **Link to specific heading**: `[[03-coding-conventions-by-tier#Backend Node conventions]]`
- **In chat messages to agent**: Reference via path for clarity:
  - *"Review against obsidian://note/rules/04-security-standards"* (if Obsidian supports URI scheme)
  - Or paste the direct markdown link: *"See [[04-security-standards#Cross-tier conventions]]"*

**Suggested first link pass** (add these to your notes):
- `wiki/index.md` → links to each `.claude/rules/` rule (reinforces master rules)
- `skills/README.md` → links to core decisions (Rule 9, Rule 10 for context)
- Each security-audit skill → links to related Rule 4 sections
- Each code-changes skill → links to relevant tech stack rule (Rule 5) and testing rule (Rule 6)

---

## Common Search Queries for Discovery

Use Obsidian's search feature (`Ctrl+Shift+F`) to find patterns:

| Query | Purpose |
|-------|---------|
| `auth` | Find all auth-related rules, conventions, and checks |
| `security` | Locate all security standards and audit checklists |
| `tenant` | Understand multi-tenancy boundaries and data scoping |
| `Node\|Express\" | Backend Node tier conventions and Node-specific audits |
| `Java\|Spring` | Spring Boot patterns, Java conventions, service isolation |
| `gRPC` | Find gRPC service definitions, proto contracts, streaming guidance |
| `RAG` | Locate retrieval-augmented generation patterns and provider info |
| `LLM\|Anthropic\|OpenAI` | AI/LLM integrations, multi-provider design, prompt patterns |
| `test\|coverage` | Testing standards, coverage gates, Vitest/JUnit conventions |
| `git\|repository` | Understand repository boundaries, commit scope, PR workflow |

---

## When to Write Where

### Obsidian Vault (`.claude/`)
**Use for durable, discoverable knowledge:**
- Architecture decisions and rationale (`decisions/`)
- Service contracts, API boundaries, gRPC protos
- Runbooks for operational procedures
- Rules and coding conventions (already in place)
- Verified commands and shell recipes
- Cross-tier patterns and design lessons
- Problem solutions that span multiple projects

**Example:** *"Spring Boot + LangChain4j agent orchestration pattern"* → create `wiki/decisions/agentic-orchestration-pattern.md`, link it from `wiki/services/listing-service.md` and `skills/code-changes/senior-ai-agentic-implementation.md`.

### Session Memory (`.claude/../memories/session/`)
**Use for temporary, task-specific notes:**
- Work-in-progress plans and task breakdowns
- Temporary context for current conversation
- Ad-hoc notes on this specific feature/bug
- Thoughts not yet distilled into durable knowledge
- Current blocker notes (cleared when task completes)

**Example:** *"Debugging why Keycloak token validation failing on tenant boundary check"* → session note while investigating, then promote to `wiki/runbooks/` if it becomes a repeatable pattern.

### User Memory (`.claude/../memories/`)
**Use for agent-persistent preferences:**
- Your preferred command sequences
- Common gotchas you want flagged
- Project-wide assumptions or constraints
- Vendor/tool preferences

---

## Recommended Plugins for Enhanced Workflow

### Must-Have

1. **Dataview** — Query notes as databases
   ```
   TABLE tier, components
   FROM "wiki/services"
   WHERE tier = "Java"
   ```
   Use to: quickly list all Java services, find all Node tier implementations, show all gRPC contracts.

2. **Breadcrumbs** — Visualize hierarchical relationships
   - Shows parent-child links between rules, services, skills
   - Helps understand decision dependencies

### Nice-to-Have

3. **Graph Analysis** — Identify orphaned docs and over-linked concepts
4. **Canvas** — Visualize multi-tier flows (e.g., user request → Node API → Java service → Python inference)
5. **Local Backlinks** — See what other notes reference current note (reverse lookup)

### Setup Command (if using Obsidian Sync):
```bash
# In Obsidian community plugins, search and install:
# - Dataview
# - Breadcrumbs
# - Graph Analysis
```

---

## Obsidian Workflow: Step-by-Step Example

### Scenario: You're implementing a security-critical feature (e.g., adding a new AI endpoint)

**Step 1: Search for existing patterns**
```
Search: "tenant" + Filter: "security-audit"
→ Find audit-java-spring.md, audit-node-backend.md
→ Review tenant boundary checks already in place
```

**Step 2: Understand the tech stack context**
```
Open: wiki/services/listing-service.md
→ Note: Spring Boot 4.0.1, LangChain4j, gRPC proto definitions
→ Check related: rules/05-tech-stack-standards.md (Spring Boot approved)
```

**Step 3: Link implementation guidance**
```
Open: skills/code-changes/senior-ai-agentic-implementation.md
→ Review: "Tool calling standards" section
→ Cross-check: audit-ai-llm-systems.md for security review points
```

**Step 4: Capture decision in session memory**
```
Create: /memories/session/ai-endpoint-implementation-plan.md
→ Link to: [[../../../.claude/skills/code-changes/senior-ai-agentic-implementation#Tool Calling Standards]]
→ Link to: [[../../../.claude/skills/security-audit/audit-ai-llm-systems#Tool Calling and Action Safety]]
→ When complete, promote key lessons to wiki/decisions/
```

**Step 5: In chat, reference directly**
```
"I've implemented the new endpoint per [[skills/code-changes/senior-ai-agentic-implementation#Tool Calling Standards|tool calling standards]]. 
Review for compliance with [[skills/security-audit/audit-ai-llm-systems#Tool Calling and Action Safety|tool safety audit]]."
```

---

## Token Efficiency Gains

### Without Obsidian Workflow

**Each session:**
- Re-explain project structure (200 tokens)
- Paste security checklist sections (300 tokens)
- List which rules apply (100 tokens)
- Re-describe tier boundaries (150 tokens)

**Per 10-session month:** ~7,500 tokens spent on context rebuilding

### With Obsidian Workflow

**Each session:**
- Link to `.claude/rules/10-repository-boundaries` (5 tokens)
- Reference `skills/security-audit/audit-java-spring#Java Spring Boot config` (3 tokens)
- Mention `wiki/services/listing-service` for context (2 tokens)

**Per 10-session month:** ~10 tokens spent on context retrieval from vault

**Savings:** ~7,500 tokens/month → Can redirect to deeper analysis, more implementation coverage

---

## Integration with Copilot Chat

### When to Reference Obsidian in Chat

**✅ Do this:**
- *"Review this against [[skills/security-audit/audit-java-spring]]"*
- *"Implement per [[skills/code-changes/senior-ai-agentic-implementation#RAG Patterns]]"*
- *"Check tenant boundaries per [[rules/10-repository-boundaries-and-change-scope]]"*

**Problem:** Copilot Chat may not auto-resolve Obsidian links. **Workaround:**
1. Keep Obsidian sidebar visible during chat sessions
2. Copy-paste markdown link text when needed
3. Or paste the relevant section directly into chat when Copilot needs specifics

### Proposed Future Feature

If working with VS Code Copilot Chat that has workspace file access:
- Ask: *"Check my Obsidian vault (.claude/ folder) for security audit checklist matching this tier"*
- Agent could read vault structure and reference directly
- Would eliminate manual copy-paste

---

## Maintenance & Keeping Vault Fresh

### After Each Completed Task

1. Review session memory notes (`.claude/../memories/session/`)
2. If a pattern emerged that will apply to future work, promote to `wiki/decisions/` or `wiki/runbooks/`
3. Update `wiki/index.md` with link to new knowledge
4. If a rule or skill was clarified by real implementation, update it in `.claude/rules/` or `.claude/skills/`

### Monthly Obsidian Maintenance

```bash
# In Obsidian, use Graph view to identify:
# - Orphaned notes (no backlinks, rarely referenced)
# - Over-linked concepts (suggest consolidation)
# - Isolated decision documents (may need linking to rules/wiki)

# Search for stale timestamps or TODO markers
Search: "TODO\|FIXME\|@deprecated"
```

### Sync with Git

```bash
# Your Obsidian vault lives in git; no special sync needed
# Vault changes auto-save to disk → git status/commit as normal
git add .claude/
git commit -m "docs: update wiki with [pattern/decision]"
```

---

## Quick Reference: Obsidian + Project Rules

| Rule | Obsidian Benefit | Search Query |
|------|------------------|--------------|
| Rule 9: AI Wiki Knowledge | **Primary consumer** — vault IS the knowledge base structure | `decision\|runbook` |
| Rule 10: Repository Boundaries | Vault can show which repo owns which service | `services/ -shared` |
| Rule 6: Testing Standards | Quick reference for tier-specific test commands | `test\|coverage` |
| Rule 4: Security Standards | Link security checklist to code changes as you implement | `security-audit` |
| Rule 5: Tech Stack | Find approved frameworks and versions per tier | `Java 21\|React 18\|Node.js` |

---

## Troubleshooting

### Obsidian Vault Not Indexing Files

**Problem:** You've added notes, but they don't appear in search.

**Solution:**
1. Files → Vault settings → Files & Links → Confirm scan folders includes `.claude/`
2. Do: **Vault stats** (Ctrl+Shift+S) to force re-index
3. Restart Obsidian if needed

### Links to Chat Agent Not Working

**Problem:** You reference `[[skills/code-review/review-ai-agentic-systems]]` in chat, but agent doesn't understand.

**Solution:**
- Copilot Chat doesn't auto-parse Obsidian links
- Paste the full markdown path or file content into chat when you need agent reference
- Or keep both Obsidian window and VS Code Chat side-by-side for manual lookup

### Too Many Notes, Search is Noisy

**Problem:** You've added lots of session notes to vault; search results are cluttered.

**Solution:**
- Move completed session notes to `.claude/../memories/session/archive/` (not indexed if in `.obscidian/`)
- Or exclude `session/` from Obsidian vault (Files & Links → Excluded files)
- Keep only durable wiki, rules, and skills in main vault

---

## Next Steps

1. **Open vault:** File → Open vault → select `.claude` folder
2. **Explore graph:** Click graph icon → zoom out to see all interconnections
3. **Test search:** Try `auth` or `security` queries
4. **Add first links:** Edit `wiki/index.md` to link each rule file:
   ```markdown
   - [[../rules/01-syntax-checks]] — TypeScript, Express, Spring Boot syntax validation
   - [[../rules/02-compile-checks]] — Build verification for each tier
   ...
   ```
5. **Bookmark common searches:** Create a "Quick Searches" note with saved query shortcuts
6. **Start documenting:** When you solve a tricky problem, add to `wiki/runbooks/`

---

## References

- **Rule 9:** `.claude/rules/09-ai-wiki-knowledge-rules.md` (knowledge organization principles)
- **Rule 10:** `.claude/rules/10-repository-boundaries-and-change-scope.md` (repo structure and git scope)
- **Obsidian Official Docs:** https://help.obsidian.md/
- **Dataview Plugin:** https://blacksmithgu.github.io/obsidian-dataview/
