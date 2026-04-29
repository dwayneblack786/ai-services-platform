# Agent Harness — Generic Step Types Handoff

**Status:** Implementation in progress (2026-04-29)
**Repo:** `services-java` → `agent-harness`

---

## What Was Done (completed and pushed)

### Workflow topology decoupled from Java (DONE)
- `WorkflowSource` scans `SAMPLEWORKFLOWS/*.yml` at startup / on `POST /api/v1/workflow/reload`
- `SkillSource` scans `SAMPLESKILLS/*.md` at startup / on `POST /api/v1/agent/skills/reload`
- Both configured via env vars `AGENT_WORKFLOWS_PATH` / `AGENT_SKILLS_PATH`
- Old hardcoded Java skill classes (Communication/Compliance/Copywriting) deleted
- Old Java-only workflow topology replaced by YAML

### Step implementations still in Java (BEING REPLACED by this task)
Located in: `agent-harness/src/main/java/com/ai/agentharness/workflow/listinglift/`
- `IngestStep.java` — validates required fields, normalizes numeric fields to String
- `VisionAnalysisStep.java` — HTTP POST to vision service
- `AutoFillStep.java` — calls AgentHarness with skillId=copywriting
- `CopywriterStep.java` — calls AgentHarness with skillId=copywriting
- `ComplianceReviewStep.java` — calls AgentHarness with skillId=compliance
- `AcceptStoreStep.java` — sets listingStatus + acceptedAt timestamp

---

## What Needs to Be Done (this task — Option B)

### Goal
Replace all 6 product-specific step classes with 4 generic step types.
New workflows (DealDesk, TenantLoop, etc.) need zero Java — just YAML.

### New files to create
Package: `com.ai.agentharness.workflow.steps`

**`ValidateStep.java`**
- Constructor: `(String name, Map<String, Object> cfg)`
- cfg keys: `required` (List<String>) — throws `FatalStepException` if any missing
- Always normalizes numeric fields (bedrooms, bathrooms, sqft, price) to String
- No Spring deps — pure Java

**`LlmStep.java`**
- Constructor: `(String name, Map<String, Object> cfg, AgentHarness agentHarness)`
- cfg keys: `skillId` (required), `outputKey` (required), `requiredInput` (optional — throws FatalStepException if key missing from context)
- Builds prompt by serializing context as `key: value` lines
- Calls `agentHarness.run()`, stores `resp.content()` at `outputKey`
- Needs TenantContext set (set by HTTP filter upstream)

**`HttpStep.java`**
- Constructor: `(String name, Map<String, Object> cfg)` and `(String name, Map<String, Object> cfg, RestTemplate restTemplate)` (2nd for tests)
- cfg keys: `url` (optional), `outputKey` (required), `optional` (boolean, default false)
- If `url` blank + optional=true → skip (return state unchanged)
- If `outputKey` already in context → skip (idempotency)
- On failure: if optional → warn+skip; else throw `RetryableStepException`

**`StoreStep.java`**
- Constructor: `(String name, Map<String, Object> cfg)`
- cfg keys: `statusValue` (default "completed")
- Sets `listingStatus` = statusValue, `acceptedAt` = Instant.now().toString()

### WorkflowSource changes
File: `agent-harness/src/main/java/com/ai/agentharness/workflow/WorkflowSource.java`
- Add `@Autowired(required = false) private AgentHarness agentHarness;`
- Add import `com.ai.agentharness.core.AgentHarness`
- Add imports for all 4 step types
- In `resolveStep()`: before bean lookup, check `cfg.get("type")`; if present call `createTypedStep()`
- Add `createTypedStep(String id, String type, Map<String,Object> cfg, String workflowId, String sourceFile)`:
  ```java
  return switch (type) {
      case "validate" -> new ValidateStep(id, cfg);
      case "llm"      -> new LlmStep(id, cfg, agentHarness);  // throw if agentHarness null
      case "http"     -> new HttpStep(id, cfg);
      case "store"    -> new StoreStep(id, cfg);
      default -> throw new IllegalStateException("Unknown step type: '" + type + "'");
  };
  ```
- Update error message for unknown steps to mention `type:` option

### SAMPLEWORKFLOWS/listinglift.yml — full rewrite
```yaml
product: listinglift

workflows:
  - id: listinglift-pipeline
    steps:
      - id: ingest
        type: validate
        required: [address]
      - id: vision-analysis
        type: http
        url: http://localhost:8001/analyze
        outputKey: visionSummary
        optional: true
      - id: auto-fill
        type: llm
        skillId: copywriting
        outputKey: autoFilledFields
      - id: fields-review
        humanGate: true
      - id: copywriter
        type: llm
        skillId: copywriting
        outputKey: listingCopy
        requiredInput: autoFilledFields
      - id: compliance-review
        type: llm
        skillId: compliance
        outputKey: complianceResult
        requiredInput: listingCopy
      - id: final-review
        humanGate: true
      - id: accept-store
        type: store
        statusValue: accepted

  - id: listinglift-quick
    steps:
      - id: ingest
        type: validate
        required: [address]
      - id: auto-fill
        type: llm
        skillId: copywriting
        outputKey: autoFilledFields
      - id: copywriter
        type: llm
        skillId: copywriting
        outputKey: listingCopy
        requiredInput: autoFilledFields
      - id: accept-store
        type: store
        statusValue: accepted
```

### Tests to update/create
- **`ListingLiftPipelineTest.java`** — rewrite setup to use generic steps instead of concrete classes
  - `IngestStep` → `ValidateStep("ingest", Map.of("required", List.of("address")))`
  - `VisionAnalysisStep` → `HttpStep("vision-analysis", Map.of("outputKey", "visionSummary", "optional", true))`
  - `AutoFillStep` → `LlmStep("auto-fill", Map.of("skillId","copywriting","outputKey","autoFilledFields"), agentHarness)`
  - `CopywriterStep` → `LlmStep("copywriter", Map.of("skillId","copywriting","outputKey","listingCopy","requiredInput","autoFilledFields"), agentHarness)`
  - `ComplianceReviewStep` → `LlmStep("compliance-review", Map.of("skillId","compliance","outputKey","complianceResult","requiredInput","listingCopy"), agentHarness)`
  - `AcceptStoreStep` → `StoreStep("accept-store", Map.of("statusValue","accepted"))`
  - Remove `autoFillComplete` assertion (use `completedSteps` list instead)
  - Remove `ReflectionTestUtils.setField` calls for agentHarness injection

- **`workflow/steps/GenericStepTypesTest.java`** — unit tests per step type
- **`WorkflowSourceTest.java`** — add test for YAML with `type:` fields loading correctly

### Files to delete after tests pass
- `workflow/listinglift/IngestStep.java`
- `workflow/listinglift/VisionAnalysisStep.java`
- `workflow/listinglift/AutoFillStep.java`
- `workflow/listinglift/CopywriterStep.java`
- `workflow/listinglift/ComplianceReviewStep.java`
- `workflow/listinglift/AcceptStoreStep.java`

The `listinglift/` test directory keeps `ListingLiftPipelineTest.java` (pipeline behavior is still listinglift-specific).

### Verify
```powershell
Set-Location services-java/agent-harness; ./mvnw test
# Target: 69+ tests, BUILD SUCCESS
```

---

## Key Architecture Facts
- `WorkflowSource` field-injects `List<WorkflowStep> registeredSteps` — these are Spring beans used as fallback for steps with no `type:` field
- `HumanReviewGate` is resolved via `humanGate: true` flag — not a bean, instantiated fresh per YAML entry
- Typed steps are instantiated fresh per YAML entry — not Spring beans, not singletons
- `AgentHarness.run()` requires `TenantContext` set (ThreadLocal, set by `TenantIsolationFilter`)
- All repos: `services-java` owns step code; `ai-services-platform` owns `SAMPLEWORKFLOWS/` and `SAMPLESKILLS/`
