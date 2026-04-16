1. Add gRPC + Thumbnailator + jimagehash dependencies
   Files: services-java/listing-service/pom.xml
   Done when: `./mvnw -q -DskipTests compile` succeeds with grpc-netty, protobuf-java, Thumbnailator, and jimagehash on classpath
   Depends on: nothing
   Verify: Set-Location services-java/listing-service; ./mvnw -q -DskipTests compile
   Notes: Pin all versions explicitly; run `./mvnw dependency:check` if OWASP plugin is configured

2. Define listing_pipeline.proto
   Files: services-java/listing-service/src/main/proto/listing_pipeline.proto
   Done when: proto compiles cleanly; generated stubs present in target/generated-sources for StartPipeline, GetStatus, SubmitReview, WatchPipeline (server-streaming)
   Depends on: 1
   Verify: Set-Location services-java/listing-service; ./mvnw -q -DskipTests compile

3. Add custom exception types
   Files: services-java/listing-service/src/main/java/com/ai/listing/exception/AgentRetryableException.java, services-java/listing-service/src/main/java/com/ai/listing/exception/AgentFatalException.java
   Done when: both classes extend RuntimeException; AgentRetryableException used for transient failures, AgentFatalException for data/config errors
   Depends on: 1
   Verify: Set-Location services-java/listing-service; ./mvnw -q -DskipTests compile

4. Implement ServiceKeyInterceptor (gRPC auth)
   Files: services-java/listing-service/src/main/java/com/ai/listing/grpc/ServiceKeyInterceptor.java
   Done when: interceptor reads `x-service-key` gRPC metadata header; rejects with UNAUTHENTICATED if key does not match `SERVICE_KEY` env var; registered as Spring bean in gRPC server config
   Depends on: 2
   Verify: Set-Location services-java/listing-service; ./mvnw -q -DskipTests compile
   Notes: Key must be read from environment only — never hardcoded; no secrets in code per Rule 15

5. Implement ListingPipelineGrpcService
   Files: services-java/listing-service/src/main/java/com/ai/listing/grpc/ListingPipelineGrpcService.java
   Done when: extends generated ImplBase; WatchPipeline registers StreamObserver in ConcurrentHashMap keyed by runId; WatchPipeline verifies tenantId matches PipelineRun.tenantId before registering — cross-tenant watch returns PERMISSION_DENIED; emit() method looks up observer and sends PipelineEvent; StartPipeline/GetStatus/SubmitReview delegate to orchestrator
   Depends on: 2, 3, 4
   Verify: Set-Location services-java/listing-service; ./mvnw -q -DskipTests compile

6. Implement AuditLog model and repository
   Files: services-java/listing-service/src/main/java/com/ai/listing/model/AuditLog.java, services-java/listing-service/src/main/java/com/ai/listing/repository/AuditLogRepository.java
   Done when: AuditLog document has tenantId, runId, listingId, action, actorId, timestamp, ipAddress, payload_summary fields; tenantId indexed; repository extends MongoRepository; timestamps enabled on schema
   Depends on: 1
   Verify: Set-Location services-java/listing-service; ./mvnw -q -DskipTests compile
   Notes: This collection is never deleted — it is the Fair Housing compliance audit trail

7. Implement TenantEncryptionService
   Files: services-java/listing-service/src/main/java/com/ai/listing/security/TenantEncryptionService.java
   Done when: encrypt/decrypt methods use AES-256; key derived via PBKDF2 from tenantId + master secret read from env var ENCRYPTION_MASTER_SECRET; no key material logged or returned in exceptions
   Depends on: 1
   Verify: Set-Location services-java/listing-service; ./mvnw -q -DskipTests compile
   Notes: Master secret must come from environment only; encrypt before MongoDB write, decrypt after read — transparent to agents

8. Implement SkillLibrary and PromptBuilder
   Files: services-java/listing-service/src/main/java/com/ai/listing/skills/SkillLibrary.java, services-java/listing-service/src/main/java/com/ai/listing/skills/PromptBuilder.java
   Done when: SkillLibrary defines all 13 named skill constants plus copywriterSkills(), complianceSkills(), autoFillSkills() composites; PromptBuilder.build(baseInstruction, skills) returns formatted system prompt with expertise block prepended
   Depends on: 1
   Verify: Set-Location services-java/listing-service; ./mvnw test -Dtest=PromptBuilderTest

9. Add PromptBuilder unit tests
   Files: services-java/listing-service/src/test/java/com/ai/listing/skills/PromptBuilderTest.java
   Done when: tests assert non-empty skills list produces "## Your Expertise" block; empty skills list produces only task block; output contains all injected skill strings
   Depends on: 8
   Verify: Set-Location services-java/listing-service; ./mvnw test -Dtest=PromptBuilderTest

10. Implement IngestAgent
    Files: services-java/listing-service/src/main/java/com/ai/listing/agent/IngestAgent.java
    Done when: validates JPEG/PNG/WebP by magic bytes (not extension); rejects files >20MB; performs pHash deduplication (distance <10 = duplicate, excluded); performs path traversal check — rejects paths resolving outside uploads base dir; resizes to 2048px max; sets state status to "vision"
    Depends on: 3
    Verify: Set-Location services-java/listing-service; ./mvnw test -Dtest=IngestAgentTest
    Notes: Use Thumbnailator for resize; jimagehash for pHash; path traversal uses Path.normalize().startsWith(uploadsBase)

11. Add IngestAgent unit tests
    Files: services-java/listing-service/src/test/java/com/ai/listing/unit/agent/IngestAgentTest.java
    Done when: tests cover: 1 valid photo passes; duplicate photo excluded with reason; oversized photo rejected with reason; path traversal attempt throws AgentFatalException; state status set to "vision" after success
    Depends on: 10
    Verify: Set-Location services-java/listing-service; ./mvnw test -Dtest=IngestAgentTest

12. Implement VisionAgent
    Files: services-java/listing-service/src/main/java/com/ai/listing/agent/VisionAgent.java
    Done when: POSTs each validated photo (base64) to ${VISION_SERVER_URL}/analyze; maps response to PropertyAttributes; aggregates room_type by mode; flooring/fixtures/materials/design_style by deduplicated union; sets needs_review=true on tied room_type; sets state status to "autofill"
    Depends on: 3, 10
    Verify: Set-Location services-java/listing-service; ./mvnw test -Dtest=VisionAgentTest
    Notes: No LLM call — pure HTTP; VISION_SERVER_URL from env; default http://localhost:8001

13. Add VisionAgent unit tests
    Files: services-java/listing-service/src/test/java/com/ai/listing/unit/agent/VisionAgentTest.java
    Done when: mock HTTP server returns 3 responses (2 kitchen, 1 living_room) → room_type = "kitchen"; tied result sets needs_review=true; HTTP failure throws AgentRetryableException
    Depends on: 12
    Verify: Set-Location services-java/listing-service; ./mvnw test -Dtest=VisionAgentTest

14. Implement AutoFillAgent
    Files: services-java/listing-service/src/main/java/com/ai/listing/agent/AutoFillAgent.java
    Done when: deterministic fields (bedrooms, bathrooms) computed directly from PropertyAttributes without LLM; LLM call via Claude Haiku triggered only when attrs contain conflicts; SkillLibrary.autoFillSkills() injected via PromptBuilder; state status set to "paused_review_1"
    Depends on: 3, 8, 12
    Verify: Set-Location services-java/listing-service; ./mvnw test -Dtest=AutoFillAgentTest

15. Add AutoFillAgent unit tests
    Files: services-java/listing-service/src/test/java/com/ai/listing/unit/agent/AutoFillAgentTest.java
    Done when: clean attrs → deterministic fields correct, no LLM call; conflicting attrs → LLM called exactly once; AgentRetryableException on LLM JSON parse failure
    Depends on: 14
    Verify: Set-Location services-java/listing-service; ./mvnw test -Dtest=AutoFillAgentTest

16. Implement CopywriterAgent
    Files: services-java/listing-service/src/main/java/com/ai/listing/agent/CopywriterAgent.java
    Done when: all null TODOs removed; SkillLibrary.copywriterSkills() injected via PromptBuilder; Claude Sonnet called with system + user prompt; response parsed via ObjectMapper into 6 fields (mlsDescription, headline, tagline, socialInstagram, socialFacebook, socialLinkedin); JSON parse failure throws AgentRetryableException; state status set to "compliance"
    Depends on: 3, 8, 14
    Verify: Set-Location services-java/listing-service; ./mvnw test -Dtest=CopywriterAgentTest

17. Add CopywriterAgent unit tests
    Files: services-java/listing-service/src/test/java/com/ai/listing/unit/agent/CopywriterAgentTest.java
    Done when: mock ChatModel returning valid JSON → all 6 copy fields populated in state; malformed JSON → AgentRetryableException thrown; state status set to "compliance" on success
    Depends on: 16
    Verify: Set-Location services-java/listing-service; ./mvnw test -Dtest=CopywriterAgentTest

18. Implement ComplianceAgent
    Files: services-java/listing-service/src/main/java/com/ai/listing/agent/ComplianceAgent.java
    Done when: uses Claude Haiku (fastChatModel); SkillLibrary.complianceSkills() injected via PromptBuilder; response parsed into {passed, flags[], cleanedCopy}; passed=false + cleanedCopy present → cleanedCopy auto-applied to state.generatedCopy before pausing; state status set to "paused_review_2"
    Depends on: 3, 8, 16
    Verify: Set-Location services-java/listing-service; ./mvnw test -Dtest=ComplianceAgentTest

19. Add ComplianceAgent unit tests
    Files: services-java/listing-service/src/test/java/com/ai/listing/unit/agent/ComplianceAgentTest.java
    Done when: "perfect for young families" input → flag returned with suggestion; passed=false + cleanedCopy → cleanedCopy auto-applied to state; passed=true → generatedCopy unchanged
    Depends on: 18
    Verify: Set-Location services-java/listing-service; ./mvnw test -Dtest=ComplianceAgentTest

20. Update ListingPipelineOrchestrator — gRPC emit, retry, failState, tenant isolation
    Files: services-java/listing-service/src/main/java/com/ai/listing/pipeline/ListingPipelineOrchestrator.java
    Done when: runAgent() wraps each agent call with emit("started"), emit("complete"), AgentRetryableException retry-once after 2s, failState on unrecoverable error; pauseAtReview1/2 persists state to MongoDB and emits "paused"; every state read/write verifies tenantId matches PipelineRun.tenantId — mismatch throws SecurityException; AuditLog written for pipeline start, each agent complete, each review submit, and final accept
    Depends on: 3, 5, 6, 10, 12, 14, 16, 18
    Verify: Set-Location services-java/listing-service; ./mvnw -q -DskipTests compile

21. Add tenant isolation unit tests
    Files: services-java/listing-service/src/test/java/com/ai/listing/security/TenantIsolationTest.java
    Done when: correct tenantId → operation proceeds; mismatched tenantId on GetStatus → SecurityException; mismatched tenantId on SubmitReview → SecurityException; WatchPipeline with wrong tenantId → PERMISSION_DENIED gRPC status
    Depends on: 20
    Verify: Set-Location services-java/listing-service; ./mvnw test -Dtest=TenantIsolationTest

22. Add pipeline integration test
    Files: services-java/listing-service/src/test/java/com/ai/listing/integration/PipelineIntegrationTest.java
    Done when: full pipeline runs with mocked ChatModel and mocked VisionServer HTTP; state transitions through ingest→vision→autofill→paused_review_1→copywriter→compliance→paused_review_2→accepted in order; all 5 gRPC events emitted in correct sequence; audit log has one entry per pipeline action
    Depends on: 20, 21
    Verify: Set-Location services-java/listing-service; ./mvnw test -Dtest=PipelineIntegrationTest

23. Manual end-to-end review gate
    Files: services-java/listing-service/src/main/resources/application.yml
    Done when: `./mvnw spring-boot:run` starts cleanly; POST /api/pipeline/start with 2 test photos and X-Tenant-Id:tenant-001 returns run_id; grpcurl confirms gRPC server on port 9090; status polling shows ingest→vision→autofill→paused_review_1; POST /review/1 with wrong tenant returns 403; correct review 1 resumes pipeline to paused_review_2; review 2 accepted; MongoDB contains accepted listing under tenant-001; audit_log collection has entries for all actions; full pipeline uses real Claude API calls
    Depends on: 22
    Notes: Requires ANTHROPIC_API_KEY, SERVICE_KEY, VISION_SERVER_URL, ENCRYPTION_MASTER_SECRET in env; vision-server must be running on port 8001
