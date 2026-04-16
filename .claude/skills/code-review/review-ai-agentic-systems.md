# Skill: Review AI and Agentic Systems

## Purpose

Review AI-powered features, LLM integrations, agentic workflows, retrieval systems, and tool-calling implementations for correctness, safety, reliability, provider abstraction, and production readiness.

## When to Use

- Reviewing any new LLM integration in Java or Node
- Reviewing agentic workflows, tool use, multi-step planners, or copilots
- Reviewing RAG, embeddings, vector retrieval, or citation systems
- Reviewing provider abstraction or multi-model routing
- Reviewing prompt contracts, structured outputs, evals, and fallback behavior

## Critical Review Areas

### 1. Correct Tier Ownership

Check that:
- Node owns thin request orchestration, auth/session-aware assembly, and product-layer adaptation
- Java owns durable orchestration, tool loops, retrieval pipelines, and shared AI services where appropriate
- The change does not mix heavy agent logic into controllers or route handlers

Flag if:
- route handlers contain prompt logic, tool loops, or retry logic directly
- Java controllers own orchestration rather than services
- AI behavior is duplicated across Node and Java without a clear boundary

### 2. Deterministic vs Probabilistic Boundaries

Check that:
- authorization, billing, tenant enforcement, and destructive mutations remain deterministic
- the model is used for judgment/generation, not core access control
- model outputs are treated as proposals unless explicitly safe to auto-execute

Flag if:
- the model decides permissions
- the model writes directly to durable state without validation
- business invariants depend on prompt wording alone

### 3. Provider Abstraction

Check that:
- provider selection is configuration-driven
- domain logic does not depend on a single vendor SDK directly
- adapters/interfaces isolate provider-specific behavior
- environment switching is possible without code edits in core logic

Flag if:
- Claude/OpenAI/Azure assumptions leak into domain services
- prompts or parsing rely on one vendor's undocumented behavior
- provider credentials are referenced outside config layers

### 4. Prompt and Contract Quality

Check that:
- prompts are versionable and centralized enough to maintain
- structured outputs are used when results feed code paths
- system, user, and tool context are clearly separated
- prompt inputs are sanitized and bounded

Flag if:
- free-form text is parsed for business-critical decisions
- prompt strings are duplicated across multiple files
- prompts include secrets or excessive sensitive context
- no schema validation exists for AI-produced JSON

### 5. Tool Calling and Agent Loops

Check that:
- tools have narrow, explicit contracts
- tool inputs and outputs are validated
- timeouts, retries, and loop limits are defined
- tool failures produce safe degradation
- tools do not expose broad shell/db/file access unnecessarily

Flag if:
- the agent loop can run unbounded
- tool results are trusted blindly
- tool permissions are too broad
- the system lacks idempotency or duplicate-action protections

### 6. Retrieval and RAG Quality

Check that:
- retrieval scope is tenant-aware
- chunking, topK, and minScore are explicit
- source/citation metadata is preserved where user-facing
- embeddings and vector store choices are intentional
- stale or cross-tenant knowledge cannot leak into responses

Flag if:
- tenant filtering is missing
- retrieval settings are hidden or inconsistent
- context injection is unbounded and risks prompt overflow
- citations are missing where factual grounding is expected

### 7. Reliability and Fallbacks

Check that:
- primary and fallback behaviors are defined
- timeouts exist for LLM and retrieval calls
- retries are bounded
- invalid structured output is handled safely
- user-facing degradation is explicit

Flag if:
- timeouts are missing
- a single model/provider outage breaks the whole flow
- structured output parse failures crash the request
- partial failure behavior is undefined

### 8. Evaluation and Test Coverage

Check that:
- tests or evals exist for success and failure paths
- ambiguous or adversarial examples are covered
- structured output validation paths are tested
- provider fallback or timeout scenarios are covered where important
- metrics for latency, token usage, or quality can be observed

Flag if:
- only happy-path demos exist
- prompts changed materially with no eval coverage
- retrieval or agent routing has no test harness
- regression protection for AI behavior is absent

### 9. Security and Safety

Check that:
- secrets are not embedded in prompts or logs
- raw model outputs are not logged carelessly
- external inputs are validated before prompt use
- tool actions are validated before execution
- tenant boundaries exist across retrieval, tools, and storage
- relevant security-audit skill has been used

Flag if:
- prompt injection vectors are unaddressed
- user-supplied text can steer unrestricted tools
- secrets or PII appear in logs
- external AI calls have no timeout or safe error handling

### 10. Human-in-the-Loop and Operational Safety

Check that:
- sensitive or high-impact actions require approval
- auto-executed flows are bounded and reversible
- auditability exists for agent decisions and tool use
- cost and latency tradeoffs are explicit

Flag if:
- the agent can take high-impact actions without approval
- no audit trail exists for tool use and decisions
- no token/cost visibility exists for expensive flows

## Review Output Expectations

When reviewing, report findings in this order:
1. security and tenant-boundary risks
2. correctness and durability risks
3. provider abstraction and maintainability risks
4. evaluation, observability, and testing gaps

## Verification Commands

### Node
- `cd ai-listing-agent/backend-node && npx tsc --noEmit -p tsconfig.json`
- `cd ai-listing-agent/backend-node && npm run build`
- `cd ai-listing-agent/backend-node && npm test`
- `cd ai-listing-agent/backend-node && npm run coverage`

### Java listing service
- `cd services-java/listing-service && ./mvnw -q -DskipTests compile`
- `cd services-java/listing-service && ./mvnw clean install -DskipTests`
- `cd services-java/listing-service && ./mvnw test`

## References

- `docs/AGENTIC_FLOWS.md`
- `docs/SPRING_AI_AGENT_IMPLEMENTATION.md`
- `docs/PROVIDER_AGNOSTIC_DESIGN.md`
- `docs/RAG_ARCHITECTURE.md`
- `.ai/rules/04-security-standards.md`
- `.ai/skills/security-audit/README.md`
