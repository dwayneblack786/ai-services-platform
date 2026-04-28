1. Maven module scaffold
Files: services-java/agent-harness/pom.xml
Done when: `./mvnw -q -DskipTests compile` exits 0 for agent-harness; pom references spring-boot-starter-parent 4.0.1, spring-ai-bom 1.0.0, common-libs 1.0.0, spring-boot-starter-data-jpa, postgresql driver, h2 for tests
Depends on: nothing
Verify: Set-Location services-java/agent-harness; ./mvnw -q -DskipTests compile
Notes: PostgreSQL-first — NO MongoDB or Redis. Port 8138. H2 in PostgreSQL mode for tests. No gRPC in Phase 0.

2. Spring Boot app entry + YAML config
Files: services-java/agent-harness/src/main/java/com/ai/agentharness/AgentHarnessApplication.java, services-java/agent-harness/src/main/resources/application.yml, services-java/agent-harness/src/main/resources/application-cli.yml, services-java/agent-harness/.env.example
Done when: app starts on port 8138 with SPRING_AI_ANTHROPIC_API_KEY and POSTGRES_URL set; cli profile disables web server; GET /actuator/health returns 200
Depends on: 1
Verify: Set-Location services-java/agent-harness; ./mvnw spring-boot:run -Dspring-boot.run.arguments="--spring.ai.anthropic.api-key=test" &
Notes: PostgreSQL connection — localhost:5433, user admin, password secretpassword, db agent_harness. Env vars: POSTGRES_URL, POSTGRES_USER, POSTGRES_PASSWORD.

3. Multi-tenant core — TenantContext and isolation filter
Files: services-java/agent-harness/src/main/java/com/ai/agentharness/tenant/TenantContext.java, services-java/agent-harness/src/main/java/com/ai/agentharness/tenant/TenantIsolationFilter.java
Done when: TenantContext.set/get/clear work in thread-local isolation; filter reads X-Tenant-ID header and clears on response; missing tenant on protected endpoint returns 400
Depends on: 2
Verify: Set-Location services-java/agent-harness; ./mvnw test -Dtest=TenantContextTest

4. AgentSession and AuditEvent JPA entities + repositories
Files: services-java/agent-harness/src/main/java/com/ai/agentharness/core/AgentSession.java, services-java/agent-harness/src/main/java/com/ai/agentharness/core/AgentSessionRepository.java, services-java/agent-harness/src/main/java/com/ai/agentharness/audit/AuditEvent.java, services-java/agent-harness/src/main/java/com/ai/agentharness/audit/AuditRepository.java, services-java/agent-harness/src/main/java/com/ai/agentharness/audit/AuditService.java
Done when: AgentSession and AuditEvent are @Entity with tenant_id indexed; JSONB fields use @JdbcTypeCode(SqlTypes.JSON); AuditService.record() persists an event; @DataJpaTest with H2 saves and retrieves by tenantId
Depends on: 3
Verify: Set-Location services-java/agent-harness; ./mvnw test -Dtest=AuditServiceTest
Notes: Uses PostgreSQL JSONB for Map/List fields. H2 PostgreSQL mode for tests. No columnDefinition="jsonb" — let Hibernate 6 infer.

5. Skill interface, SkillRegistry, and three core skills
Files: services-java/agent-harness/src/main/java/com/ai/agentharness/skills/AgentSkill.java, services-java/agent-harness/src/main/java/com/ai/agentharness/skills/SkillRegistry.java, services-java/agent-harness/src/main/java/com/ai/agentharness/skills/communication/CommunicationSkill.java, services-java/agent-harness/src/main/java/com/ai/agentharness/skills/compliance/ComplianceSkill.java, services-java/agent-harness/src/main/java/com/ai/agentharness/skills/copywriting/CopywritingSkill.java
Done when: SkillRegistry.getAll() returns all three skills; SkillRegistry.get("communication") returns CommunicationSkill; each skill has getId, getName, getSystemPromptFragment; test asserts registry size >= 3
Depends on: 3
Verify: Set-Location services-java/agent-harness; ./mvnw test -Dtest=SkillRegistryTest

6. AgentHarness core service with Spring AI ChatClient and in-memory conversation memory
Files: services-java/agent-harness/src/main/java/com/ai/agentharness/core/AgentRequest.java, services-java/agent-harness/src/main/java/com/ai/agentharness/core/AgentResponse.java, services-java/agent-harness/src/main/java/com/ai/agentharness/core/AgentHarness.java
Done when: AgentHarness.run(AgentRequest) returns non-null AgentResponse with non-blank content; tenant isolation enforced — run() throws if TenantContext is not set; unit test with mocked ChatModel passes; audit event recorded on each run
Depends on: 4, 5
Verify: Set-Location services-java/agent-harness; ./mvnw test -Dtest=AgentHarnessTest

7. REST API — AgentController and SkillController
Files: services-java/agent-harness/src/main/java/com/ai/agentharness/api/AgentController.java, services-java/agent-harness/src/main/java/com/ai/agentharness/api/SkillController.java
Done when: POST /api/v1/agent/run with X-Tenant-ID header returns 200 and AgentResponse JSON; GET /api/v1/agent/skills returns skill list; POST without X-Tenant-ID returns 400; MockMvc test covers all three cases
Depends on: 6
Verify: Set-Location services-java/agent-harness; ./mvnw test -Dtest=AgentControllerTest

8. CLI runner — profile-based Spring ApplicationRunner
Files: services-java/agent-harness/src/main/java/com/ai/agentharness/cli/AgentCliRunner.java
Done when: running with --spring.profiles.active=cli --tenant=test --skill=communication --input="hello" invokes AgentHarness and prints response to stdout; web server does NOT start in cli profile; unit test for arg parsing passes
Depends on: 6
Verify: Set-Location services-java/agent-harness; ./mvnw spring-boot:run "-Dspring-boot.run.jvmArguments=-Dspring.profiles.active=cli" "-Dspring-boot.run.arguments=--tenant=test --skill=communication --input=hello"

9. Unit test suite — full coverage of tenant isolation, skill registry, harness
Files: services-java/agent-harness/src/test/java/com/ai/agentharness/tenant/TenantContextTest.java, services-java/agent-harness/src/test/java/com/ai/agentharness/skills/SkillRegistryTest.java, services-java/agent-harness/src/test/java/com/ai/agentharness/core/AgentHarnessTest.java, services-java/agent-harness/src/test/java/com/ai/agentharness/audit/AuditServiceTest.java, services-java/agent-harness/src/test/java/com/ai/agentharness/api/AgentControllerTest.java
Done when: `./mvnw test` exits 0; all five test classes pass; success path and at least one failure path covered per class
Depends on: 7, 8
Verify: Set-Location services-java/agent-harness; ./mvnw test

10. Update services-java CLAUDE.md and Rule 14 port table for agent-harness
Files: services-java/CLAUDE.md, .claude/rules/14-infrastructure-change-standards.md
Done when: CLAUDE.md services table includes agent-harness on port 8138; Rule 14 port table lists agent-harness port 8138
Depends on: 9
Verify: grep -n "agent-harness" services-java/CLAUDE.md

11. Phase 1 skill stubs — remaining 14 skills with system prompt fragments and tool stubs
Files: services-java/agent-harness/src/main/java/com/ai/agentharness/skills/negotiation/NegotiationSkill.java, services-java/agent-harness/src/main/java/com/ai/agentharness/skills/market/MarketKnowledgeSkill.java, services-java/agent-harness/src/main/java/com/ai/agentharness/skills/problemsolving/ProblemSolvingSkill.java, services-java/agent-harness/src/main/java/com/ai/agentharness/skills/listening/ActiveListeningSkill.java, services-java/agent-harness/src/main/java/com/ai/agentharness/skills/marketing/SmartMarketingSkill.java, services-java/agent-harness/src/main/java/com/ai/agentharness/skills/teaching/TeachingSkill.java, services-java/agent-harness/src/main/java/com/ai/agentharness/skills/ethics/EthicsSkill.java, services-java/agent-harness/src/main/java/com/ai/agentharness/skills/networking/NetworkingSkill.java, services-java/agent-harness/src/main/java/com/ai/agentharness/skills/socialmonitoring/SocialMonitoringSkill.java, services-java/agent-harness/src/main/java/com/ai/agentharness/skills/crisis/CrisisResolutionSkill.java, services-java/agent-harness/src/main/java/com/ai/agentharness/skills/video/ShortFormVideoSkill.java, services-java/agent-harness/src/main/java/com/ai/agentharness/skills/timemanagement/TimeManagementSkill.java, services-java/agent-harness/src/main/java/com/ai/agentharness/skills/dataprivacy/DataPrivacySkill.java, services-java/agent-harness/src/main/java/com/ai/agentharness/skills/resilience/ResilienceSkill.java
Done when: SkillRegistry.getAll() returns 17 skills; each has getId, getName, getSystemPromptFragment; all compile; `./mvnw test` still exits 0
Depends on: 9
Verify: Set-Location services-java/agent-harness; ./mvnw test -Dtest=SkillRegistryTest

12. Persistent PostgreSQL conversation memory — replace InMemoryChatMemory
Files: services-java/agent-harness/src/main/java/com/ai/agentharness/memory/MemoryEntry.java, services-java/agent-harness/src/main/java/com/ai/agentharness/memory/MemoryRepository.java, services-java/agent-harness/src/main/java/com/ai/agentharness/memory/PostgresChatMemory.java, services-java/agent-harness/src/test/java/com/ai/agentharness/memory/PostgresChatMemoryTest.java
Done when: PostgresChatMemory implements Spring AI ChatMemory; conversation_memory table stores messages as JSONB; history persists across JVM restarts (@DataJpaTest confirms); AgentHarness wired to PostgresChatMemory; tenantId:sessionId used as conversationId key; all prior tests pass
Depends on: 9
Verify: Set-Location services-java/agent-harness; ./mvnw test -Dtest=PostgresChatMemoryTest
Notes: conversation_memory table: id, tenant_id, conversation_id, role, content (text), metadata (jsonb), created_at. Scoped by tenantId — no cross-tenant memory leakage.

13. Spring AI tool callbacks for web search — Tavily free tier integration
Files: services-java/agent-harness/src/main/java/com/ai/agentharness/tools/WebSearchTool.java, services-java/agent-harness/src/main/java/com/ai/agentharness/tools/ToolRegistry.java, services-java/agent-harness/.env.example (update TAVILY_API_KEY)
Done when: WebSearchTool is a Spring AI @Tool-annotated method; ToolRegistry wires it into AgentHarness; ProblemSolvingSkill and SocialMonitoringSkill register it; unit test mocks Tavily HTTP call; Tavily key read from TAVILY_API_KEY env var
Depends on: 11
Verify: Set-Location services-java/agent-harness; ./mvnw test -Dtest=WebSearchToolTest
Notes: Tavily free tier: 1000 req/month. Sign up at tavily.com. If key not set, tool is disabled gracefully.

14. Document parsing tool — Apache Tika integration for PDF/DOCX analysis
Files: services-java/agent-harness/src/main/java/com/ai/agentharness/tools/DocumentParseTool.java
Done when: DocumentParseTool extracts text from PDF and DOCX byte arrays; NegotiationSkill and ComplianceSkill register it; unit test parses a sample PDF; Tika added to pom.xml
Depends on: 11
Verify: Set-Location services-java/agent-harness; ./mvnw test -Dtest=DocumentParseToolTest

15. Comprehensive integration test — full API round trip with embedded Mongo
Files: services-java/agent-harness/src/test/java/com/ai/agentharness/integration/AgentHarnessIntegrationTest.java
Done when: Integration test starts full Spring context with embedded Mongo and mocked Claude; POST /api/v1/agent/run returns 200; audit event recorded; memory entry persisted; cross-tenant isolation verified (tenant A cannot read tenant B session)
Depends on: 12, 13, 14
Verify: Set-Location services-java/agent-harness; ./mvnw test -Dtest=AgentHarnessIntegrationTest

16. OpenAPI documentation
Files: services-java/agent-harness/src/main/java/com/ai/agentharness/config/OpenApiConfig.java, services-java/agent-harness/pom.xml (add springdoc-openapi-starter-webmvc-ui)
Done when: GET /api-docs returns valid OpenAPI JSON; GET /swagger-ui/index.html renders UI; all endpoints documented with request/response schemas
Depends on: 15
Verify: curl http://localhost:8138/api-docs | python -m json.tool

17. CLI usage documentation and .env.example finalized
Files: services-java/agent-harness/AGENT_HARNESS.md
Done when: doc covers server start, CLI mode usage, all required env vars, curl examples for each API endpoint, skill list table; .env.example has all required vars with placeholder values
Depends on: 16
Verify: grep -c "SPRING_AI_ANTHROPIC_API_KEY" services-java/agent-harness/AGENT_HARNESS.md

18. va-service — remove agent package, add AgentHarnessClient
Files: services-java/va-service/src/main/java/com/ai/va/client/AgentHarnessClient.java, services-java/va-service/src/main/java/com/ai/va/service/ChatSessionService.java, services-java/va-service/src/main/java/com/ai/va/service/VoiceSessionService.java
Done when: com.ai.va.agent package deleted (AssistantAgent, AgentMemory, AgentController, AgentResponse, tools/ToolsConfiguration removed); AgentHarnessClient posts to http://agent-harness:8138/api/v1/agent/run with X-Tenant-ID header; ChatSessionService and VoiceSessionService use AgentHarnessClient instead of AssistantAgent; va-service compiles and existing tests pass
Depends on: 17
Verify: Set-Location services-java/va-service; ./mvnw -q -DskipTests compile
Notes: LlmService and LlmClient stay in va-service for now but are deprecated — mark with @Deprecated. Remove in follow-up once all callers migrated. AssistantAgent tools (order lookup, appointment, knowledge search) are re-implemented as agent-harness skills in task 11.

19. va-service — remove LlmService and LlmClient (complete decoupling)
Files: services-java/va-service/src/main/java/com/ai/va/service/LlmService.java, services-java/va-service/src/main/java/com/ai/va/client/LlmClient.java, services-java/va-service/src/main/java/com/ai/va/config/LlmConfig.java, services-java/va-service/src/main/java/com/ai/va/service/ExternalLlmService.java
Done when: LlmService, LlmClient, LlmConfig, ExternalLlmService deleted; no remaining callers reference them; va-service compiles and all tests pass; va-service has no direct LLM dependency — all AI routed through agent-harness
Depends on: 18
Verify: Set-Location services-java/va-service; ./mvnw test
Notes: After this task va-service is a pure voice pipeline: STT → AgentHarnessClient → TTS. Zero direct LLM calls.

