# Service: services-java/va-service

Context:

- Voice and chat assistant backend service.
- Handles STT (speech-to-text), TTS (text-to-speech), LLM routing, agent execution, prompt assembly, session state management, and transcript persistence.
- Serves as the backend for voice-enabled product features across the platform (FieldVoice, TenantLoop, and similar voice/chat channels).

Source file/path:

- `services-java/va-service/CLAUDE.md`
- `services-java/va-service/src/main/java/com/ai/va/`
- `.ai/skills/code-changes/senior-java-spring-standards.md`
- `.ai/skills/code-changes/senior-ai-agentic-implementation.md`
- `.ai/skills/code-review/review-java-listing-service.md`

Last verified date:

- 2026-04-16

Verified commands:

- `Set-Location services-java/va-service; ./mvnw -q -DskipTests compile`
- `Set-Location services-java/va-service; ./mvnw clean install -DskipTests`
- `Set-Location services-java/va-service; ./mvnw test`

Repository ownership:

- Git operations for this service belong to the `services-java` repository.
- Run `git status`, `git add`, `git commit` from `services-java/`, not from `va-service/` directly.

Stack:

- Spring Boot 4.0.1, Java 21
- Log4j2 (Logback excluded)
- Spring Data MongoDB + raw MongoDB driver
- REST (HTTP port **8136**) + gRPC server
- STT: Azure Speech + Whisper (factory pattern via `SttServiceFactory`)
- TTS: Azure TTS + local provider (factory pattern via `TtsServiceFactory`)
- LLM: external LLM integration via `ExternalLlmService` / `LlmClient`

Architecture:

- `agent/` — `AssistantAgent` executes tool-augmented LLM calls; `ToolsConfiguration` wires agent tools
- `service/stt/` — factory-pattern STT dispatch: Azure Speech or Whisper (port 8000)
- `service/tts/` — factory-pattern TTS dispatch: Azure or local
- `prompt/` — `PromptAssembler` builds prompts from `ChannelConfiguration`, `CustomPrompts`, `RagConfiguration`
- `grpc/` — `ChatServiceImpl`, `VoiceServiceImpl`, `HealthServiceImpl` exposed via gRPC
- `repository/` — `TranscriptRepository` for MongoDB transcript persistence
- `config/` — all config classes; all keys and URLs must be environment-driven

Integration boundaries:

- `services-python/whisper-server` (port 8000) — STT fallback provider
- MongoDB (port 27018 local) — transcript and session state storage
- External LLM (Claude API) via `LlmClient`
- Platform auth and tenant context expected from upstream caller (Node.js backend or gRPC client)

Operational checks:

- Start MongoDB before va-service: `podman-compose up -d`
- After agent or prompt logic changes, compile and run tests before merging
- After gRPC contract changes, verify all consumers regenerate their stubs
- Do not log raw voice transcripts, prompts, or model outputs in production logging configuration

Actionable notes:

- Port 8136 for HTTP REST; gRPC port configured in `GrpcServerConfig.java` — verify before port conflict checks
- STT and TTS providers are factory-selected at runtime — test both paths when changing provider logic
- Prompt assembly is multi-source: channel config + custom prompts + RAG config — check all three when debugging prompt behavior
- New service or pipeline logic requires unit tests under `src/test/java`
- Use VS Code tasks "VA Service: Maven Run" / "VA Service: Maven Test" for quick local runs
