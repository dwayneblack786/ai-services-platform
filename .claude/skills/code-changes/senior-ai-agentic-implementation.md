# Skill: Senior AI Agentic Implementation

## Purpose

Implement production-grade AI features across Java and Node with strong support for agentic workflows, tool calling, retrieval, model-provider abstraction, evaluation, and operational safety.

## When to Use

- Building or extending agentic workflows in Java or Node
- Adding LLM-powered features, copilots, assistants, or autonomous task flows
- Integrating Claude, OpenAI, Azure OpenAI, local models, Ollama, LM Studio, Gemini, or other providers
- Adding RAG, embeddings, vector search, tool execution, or structured outputs
- Designing AI orchestration between Node API layers and Java service layers
- Implementing human-in-the-loop approval steps for sensitive or multi-step AI tasks

## Expertise Expectations

- Expert-level understanding of prompt design, tool calling, retrieval, model routing, and structured generation
- Strong production judgment around latency, cost, reliability, security, and evaluation
- Ability to implement agentic flows in both Java Spring services and Node backends without provider lock-in
- Ability to separate deterministic business logic from probabilistic LLM behavior

## Core Design Principles

- Keep deterministic rules outside the model whenever possible.
- Use LLMs for judgment, generation, classification, ranking, extraction, and planning, not for authorization or core invariants.
- Make provider choice configurable via environment or application config, not hardcoded in service logic.
- Use structured outputs for machine-consumed responses.
- Prefer human-in-the-loop approval for high-impact actions.
- Track latency, token usage, fallbacks, tool selections, and failure reasons.
- Design prompts and contracts so they can be tested and versioned.

## Architecture Guidance

### 1. Choose the Right Tier Boundary

Use Node when:
- The AI feature is close to UI/API orchestration, session handling, or lightweight prompt assembly.
- The backend mainly brokers requests and aggregates product-specific context.

Use Java when:
- The feature requires multi-step orchestration, tool execution, durable service logic, or agent loops.
- The service already owns the pipeline and needs strong typing, Spring integration, or shared platform workflows.

Recommended pattern in this repo:
- Node: auth, sessions, request shaping, tenant context, thin orchestration entrypoints
- Java: agent loop, tool execution, pipeline stages, retrieval orchestration, long-running AI workflows

### 2. Provider-Agnostic Model Integration

Requirements:
- Keep provider settings in config only.
- Allow model switching by environment profile or env vars.
- Avoid prompt logic that depends on one vendor-specific quirk unless isolated.

Node example:
```typescript
export interface ChatModel {
  complete(input: {
    system: string;
    messages: Array<{ role: 'user' | 'assistant' | 'system'; content: string }>;
    temperature?: number;
    responseFormat?: 'json' | 'text';
  }): Promise<{ content: string; usage?: { inputTokens: number; outputTokens: number } }>;
}
```

Java example:
```java
public interface AiChatClient {
    AiResult complete(AiRequest request);
}
```

Provider wiring belongs in:
- Spring configuration beans in Java
- adapter modules / service factories in Node

### 3. Agentic Workflow Design

Use agentic workflows only when:
- Multiple valid paths exist
- Tool selection materially improves outcomes
- Iterative reasoning adds value
- Human review or bounded automation is possible

Avoid agent loops for:
- Authentication and authorization
- Billing and payment invariants
- Raw CRUD with deterministic rules
- Schema migrations and destructive operations

Recommended agent loop shape:
```text
Input -> classify intent -> decide next step -> call tool(s) -> validate result -> synthesize response -> optional approval -> persist outcome
```

### 4. Tool Calling Standards

- Tools must have narrow, explicit contracts.
- Tool outputs should be structured and validated.
- Never expose unrestricted filesystem, shell, or broad database access to the model.
- Add allow-lists, timeout limits, and idempotency rules.
- Log tool name, latency, outcome, and failure category.

Node tool shape:
```typescript
type ToolResult<T> = {
  ok: boolean;
  data?: T;
  error?: string;
};
```

Java tool shape:
```java
public record ToolExecutionResult(boolean ok, Object data, String error) {}
```

### 5. RAG and Retrieval Patterns

- Keep embeddings model and retrieval configuration explicit.
- Store chunking and retrieval settings with the feature or prompt version.
- Validate source freshness and tenant scope.
- Prefer citation-capable responses when retrieval is user-facing.
- Re-rank when quality matters more than raw latency.

Minimum retrieval contract:
- query
- topK
- minScore
- tenantId
- source filters
- citation metadata

### 6. Structured Output and Prompt Contracts

Use JSON or schema-constrained outputs for:
- classification
- extraction
- routing
- tool selection
- evaluation
- workflow state updates

Example:
```json
{
  "decision": "call_tool",
  "toolName": "searchKnowledge",
  "reason": "Need tenant-specific policy context",
  "confidence": 0.89
}
```

Do not parse free-form prose when the result is consumed by code.

### 7. Reliability and Fallbacks

Every AI feature should define:
- primary model
- fallback model or fallback behavior
- timeout budget
- retry policy
- degraded-mode behavior
- user-visible failure response

Examples:
- If provider times out, return a partial response or queue retry.
- If structured output validation fails, retry once with corrective instructions.
- If tool output is missing required fields, treat it as a failure, not a success.

### 8. Evaluation and Quality Control

Implement evaluation for:
- correctness
- hallucination rate
- tool usage quality
- latency
- token cost
- user acceptance / task completion

Minimum eval set expectations:
- happy path examples
- adversarial / ambiguous prompts
- malformed tool output cases
- tenant-specific context cases
- safety / compliance-sensitive examples

### 9. Security and Safety

- Never put secrets in prompts.
- Never log raw secrets, full prompts containing sensitive user data, or full model outputs by default.
- Validate all model-produced actions before execution.
- Enforce tenant scoping before retrieval, tool use, and persistence.
- Use security-audit skills for auth, secrets, input validation, and external calls.

### 10. Human-in-the-Loop Standards

Require approval when:
- an agent edits customer-visible copy at scale
- compliance or legal content is changed
- cost or side effects exceed defined thresholds
- the action mutates durable state beyond a safe threshold

Use auto-execution only for low-risk, reversible steps.

## Java Implementation Guidance

Preferred stack in this repo:
- Spring Boot services
- Spring AI or LangChain4j where appropriate
- Constructor injection and config-driven provider wiring
- Tool beans / service classes with explicit contracts

Patterns:
- Keep controllers thin.
- Put agent loops in service/orchestration classes.
- Use config profiles for provider switching.
- Use strongly typed request/response records for agent state.
- Bound retries and timeouts on every external AI or retrieval call.

Good fit for Java here:
- multi-step agents
- compliance chains
- pipeline orchestration
- retrieval and decision loops
- shared AI services across channels

## Node Implementation Guidance

Preferred usage in this repo:
- thin API orchestration
- tenant/session-aware prompt assembly
- provider adapters
- evaluation harnesses and lightweight AI services where Java is not the right owner

Patterns:
- Keep route handlers thin and push AI logic into services.
- Use typed request/response contracts.
- Isolate provider SDK calls behind a small adapter interface.
- Add schema validation for all AI-produced JSON.
- Keep prompt templates versioned and testable.

Good fit for Node here:
- session-aware assistants
- UI-driven prompt iteration
- product-specific orchestration entrypoints
- edge-friendly lightweight AI features

## Multi-Provider Integration Standards

Supported mental model:
- Claude for quality-heavy reasoning and writing
- OpenAI / Azure OpenAI for embeddings, broad ecosystem support, or selected chat use cases
- Local models for development, cheap testing, or private workflows
- Vision models where image classification / extraction is needed

Implementation rules:
- No single-provider assumptions in domain logic.
- Provider-specific prompt tuning belongs in adapter/config layers.
- Feature flags may route traffic by tenant, environment, or task type.
- Compare providers using evals, not intuition.

## Validation Checklist

Before marking AI implementation work complete:

- [ ] The owner tier is correct: Node for thin orchestration, Java for durable agent workflows
- [ ] Model/provider selection is config-driven
- [ ] Prompts are versionable and not hardcoded across multiple files
- [ ] Structured outputs are validated before use
- [ ] Tool contracts are narrow and typed
- [ ] Timeouts, retries, and fallbacks are defined
- [ ] Tenant boundaries are enforced for retrieval and tool execution
- [ ] Sensitive data is not logged or embedded carelessly in prompts
- [ ] Success and edge-path tests or evals are added
- [ ] Relevant security-audit skill has been applied

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
- `.ai/wiki/services/listing-service.md`
