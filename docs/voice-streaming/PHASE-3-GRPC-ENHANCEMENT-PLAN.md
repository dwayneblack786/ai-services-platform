# Phase 3: gRPC Enhancement - Detailed Implementation Plan

**Goal**: Integrate completed STT module into VoiceServiceImpl for real-time voice transcription  
**Status**: 🔄 **PLANNED** (Ready to start)  
**Estimated Duration**: 3-4 days

---

## Overview

Phase 3 will connect the fully implemented STT module (Phase 1) with the gRPC voice service, enabling real-time audio transcription. This phase focuses on the Java backend integration, leaving Node.js and frontend updates for Phase 5 and 7.

### Current State
- ✅ STT Module complete (WhisperSttService, AzureSpeechSttService)
- ✅ MongoDB transcript storage ready (Phase 2)
- ✅ Proto definitions with AudioChunk and TranscriptionResponse
- ⚠️ VoiceServiceImpl is a stub (returns UNIMPLEMENTED)
- ⚠️ VoiceSessionService has STT dependencies but not wired up

### Target State
- ✅ VoiceServiceImpl implements real transcription
- ✅ AudioBufferManager accumulates chunks
- ✅ STT service transcribes audio
- ✅ Transcripts saved to MongoDB
- ✅ Integration tests verify end-to-end flow

---

## Task Breakdown

### **Task 3.1: Update VoiceServiceImpl - TranscribeStream RPC**
**Estimated Time**: 4-6 hours  
**File**: `services-java/va-service/src/main/java/com/ai/va/grpc/VoiceServiceImpl.java`  
**Priority**: HIGH (Core functionality)

**Current Implementation**:
```java
@Override
public StreamObserver<VoiceRequest> streamVoiceConversation(
    StreamObserver<VoiceResponse> responseObserver) {
    // Returns UNIMPLEMENTED
}
```

**Target Implementation**:
1. **Add Dependencies**:
   ```java
   @Autowired
   private SttServiceFactory sttServiceFactory;
   
   @Autowired
   private AudioBufferManager audioBufferManager;
   
   @Autowired
   private TranscriptService transcriptService;
   ```

2. **Implement TranscribeStream (NEW RPC)**:
   ```java
   @Override
   public StreamObserver<AudioChunk> transcribeStream(
       StreamObserver<TranscriptionResponse> responseObserver) {
       
       return new StreamObserver<AudioChunk>() {
           private String sessionId;
           private String format;
           
           @Override
           public void onNext(AudioChunk chunk) {
               try {
                   sessionId = chunk.getSessionId();
                   format = chunk.getFormat();
                   
                   // Initialize session buffer if first chunk
                   if (!audioBufferManager.hasSession(sessionId)) {
                       audioBufferManager.initializeSession(sessionId, format);
                       logger.info("Initialized audio session: {}", sessionId);
                   }
                   
                   // Accumulate audio chunk
                   audioBufferManager.addChunk(sessionId, chunk.getAudioData().toByteArray());
                   
                   // If final chunk, transcribe
                   if (chunk.getIsFinalChunk()) {
                       transcribeAndRespond(sessionId, format, responseObserver);
                   }
                   
               } catch (Exception e) {
                   logger.error("Error processing audio chunk", e);
                   responseObserver.onError(Status.INTERNAL
                       .withDescription("Failed to process audio chunk: " + e.getMessage())
                       .asRuntimeException());
               }
           }
           
           @Override
           public void onError(Throwable t) {
               logger.error("Client error in audio stream", t);
               if (sessionId != null) {
                   audioBufferManager.clearSession(sessionId);
               }
           }
           
           @Override
           public void onCompleted() {
               logger.info("Audio stream completed for session: {}", sessionId);
               responseObserver.onCompleted();
           }
       };
   }
   ```

3. **Add Helper Method - transcribeAndRespond**:
   ```java
   private void transcribeAndRespond(
       String sessionId, 
       String format,
       StreamObserver<TranscriptionResponse> responseObserver) {
       
       try {
           // Get concatenated audio
           byte[] audioData = audioBufferManager.getConcatenatedAudio(sessionId);
           logger.info("Transcribing {} bytes for session {}", audioData.length, sessionId);
           
           // Get STT service
           SttService sttService = sttServiceFactory.getSttService();
           
           // Transcribe async
           sttService.transcribeAsync(audioData, format, sessionId)
               .thenAccept(result -> {
                   // Build proto response
                   TranscriptionResponse response = TranscriptionResponse.newBuilder()
                       .setSessionId(sessionId)
                       .setText(result.getText())
                       .setConfidence(result.getConfidence())
                       .setIsFinal(true)
                       .setLanguage(result.getMetadata().getLanguage())
                       .setMetadata(TranscriptionMetadata.newBuilder()
                           .setProvider(result.getMetadata().getProvider())
                           .setModel(result.getMetadata().getModel())
                           .setStreaming(false)
                           .build())
                       .build();
                   
                   // Send response
                   responseObserver.onNext(response);
                   
                   // Save to MongoDB (async, don't block)
                   CompletableFuture.runAsync(() -> {
                       try {
                           transcriptService.addSegment(
                               sessionId, 
                               "user", 
                               result.getText(), 
                               result.getConfidence()
                           );
                       } catch (Exception e) {
                           logger.error("Failed to save transcript", e);
                       }
                   });
                   
                   // Clear buffer
                   audioBufferManager.clearSession(sessionId);
                   
               })
               .exceptionally(error -> {
                   logger.error("Transcription failed", error);
                   responseObserver.onError(Status.INTERNAL
                       .withDescription("Transcription failed: " + error.getMessage())
                       .asRuntimeException());
                   audioBufferManager.clearSession(sessionId);
                   return null;
               });
           
       } catch (Exception e) {
           logger.error("Error in transcribeAndRespond", e);
           responseObserver.onError(Status.INTERNAL
               .withDescription("Error: " + e.getMessage())
               .asRuntimeException());
       }
   }
   ```

**Testing**:
- Unit test with mocked SttService
- Integration test with real Whisper service
- Test error scenarios (empty audio, unsupported format)

**Success Criteria**:
- ✅ Audio chunks accumulate correctly
- ✅ Transcription completes successfully
- ✅ TranscriptionResponse sent to client
- ✅ Transcript saved to MongoDB
- ✅ Buffer cleared after processing

---

### **Task 3.2: Update VoiceServiceImpl - Transcribe RPC (Non-Streaming)**
**Estimated Time**: 2-3 hours  
**File**: `services-java/va-service/src/main/java/com/ai/va/grpc/VoiceServiceImpl.java`  
**Priority**: MEDIUM (Simpler fallback)

**Target Implementation**:
```java
@Override
public void transcribe(AudioChunk request, StreamObserver<TranscriptionResponse> responseObserver) {
    try {
        String sessionId = request.getSessionId();
        String format = request.getFormat();
        byte[] audioData = request.getAudioData().toByteArray();
        
        logger.info("Transcribe request - sessionId: {}, format: {}, size: {} bytes", 
            sessionId, format, audioData.length);
        
        // Get STT service
        SttService sttService = sttServiceFactory.getSttService();
        
        // Transcribe async
        sttService.transcribeAsync(audioData, format, sessionId)
            .thenAccept(result -> {
                // Build proto response
                TranscriptionResponse response = TranscriptionResponse.newBuilder()
                    .setSessionId(sessionId)
                    .setText(result.getText())
                    .setConfidence(result.getConfidence())
                    .setIsFinal(true)
                    .setLanguage(result.getMetadata().getLanguage())
                    .setMetadata(TranscriptionMetadata.newBuilder()
                        .setProvider(result.getMetadata().getProvider())
                        .setModel(result.getMetadata().getModel())
                        .setStreaming(false)
                        .build())
                    .build();
                
                responseObserver.onNext(response);
                responseObserver.onCompleted();
                
                // Save to MongoDB (async)
                CompletableFuture.runAsync(() -> {
                    try {
                        transcriptService.addSegment(
                            sessionId, "user", result.getText(), result.getConfidence()
                        );
                    } catch (Exception e) {
                        logger.error("Failed to save transcript", e);
                    }
                });
            })
            .exceptionally(error -> {
                logger.error("Transcription failed", error);
                responseObserver.onError(Status.INTERNAL
                    .withDescription("Transcription failed: " + error.getMessage())
                    .asRuntimeException());
                return null;
            });
        
    } catch (Exception e) {
        logger.error("Error in transcribe", e);
        responseObserver.onError(Status.INTERNAL
            .withDescription("Error: " + e.getMessage())
            .asRuntimeException());
    }
}
```

**Testing**:
- Test with single audio file (WAV, WebM)
- Verify response format
- Test error handling

**Success Criteria**:
- ✅ Single audio file transcribes correctly
- ✅ Response returned to client
- ✅ Transcript saved to MongoDB

---

### **Task 3.3: Add Health Check RPC**
**Estimated Time**: 1-2 hours  
**File**: `services-java/va-service/src/main/java/com/ai/va/grpc/VoiceServiceImpl.java`  
**Priority**: LOW (Nice to have)

**Target Implementation**:
```java
@Override
public void checkHealth(HealthCheckRequest request, StreamObserver<HealthCheckResponse> responseObserver) {
    try {
        String service = request.getService();
        logger.debug("Health check requested for: {}", service.isEmpty() ? "all" : service);
        
        boolean healthy = true;
        Map<String, String> details = new HashMap<>();
        
        // Check STT service
        if (service.isEmpty() || service.equals("stt")) {
            SttService sttService = sttServiceFactory.getSttService();
            boolean sttHealthy = sttService.isHealthy();
            healthy &= sttHealthy;
            details.put("stt_provider", sttService.getProvider());
            details.put("stt_model", sttService.getModel());
            details.put("stt_status", sttHealthy ? "healthy" : "unhealthy");
        }
        
        // Check MongoDB
        if (service.isEmpty() || service.equals("db")) {
            try {
                long count = transcriptService.countTranscripts();
                details.put("db_status", "healthy");
                details.put("transcript_count", String.valueOf(count));
            } catch (Exception e) {
                healthy = false;
                details.put("db_status", "unhealthy");
                details.put("db_error", e.getMessage());
            }
        }
        
        HealthCheckResponse response = HealthCheckResponse.newBuilder()
            .setStatus(healthy ? 
                HealthCheckResponse.ServingStatus.SERVING : 
                HealthCheckResponse.ServingStatus.NOT_SERVING)
            .setMessage(healthy ? "All services healthy" : "Some services unhealthy")
            .putAllDetails(details)
            .build();
        
        responseObserver.onNext(response);
        responseObserver.onCompleted();
        
    } catch (Exception e) {
        logger.error("Health check failed", e);
        responseObserver.onError(Status.INTERNAL
            .withDescription("Health check failed: " + e.getMessage())
            .asRuntimeException());
    }
}
```

**Success Criteria**:
- ✅ Health check returns service status
- ✅ STT provider status reported
- ✅ MongoDB status reported

---

### **Task 3.4: Update VoiceSessionService Integration**
**Estimated Time**: 3-4 hours  
**File**: `services-java/va-service/src/main/java/com/ai/va/service/VoiceSessionService.java`  
**Priority**: MEDIUM (For existing processAudioChunk flow)

**Changes Needed**:
1. **Update processAudioChunk to use new STT interface**:
   ```java
   public VoiceResponse processAudioChunk(VoiceRequest request) {
       String callId = request.getCallId();
       SessionState session = getSession(callId);
       
       if (session == null) {
           throw new IllegalStateException("Session not found: " + callId);
       }
       
       try {
           // Decode audio from base64
           byte[] audioBytes = Base64.getDecoder().decode(request.getAudioChunk());
           
           // Get STT service via factory
           SttService sttService = sttServiceFactory.getSttService();
           
           // Transcribe audio
           String transcript = sttService.transcribe(audioBytes, "webm", callId).getText();
           logger.info("[STT] Transcript: {}", transcript);
           
           // Rest of existing flow...
           // (Dialog processing, LLM, TTS, usage tracking)
           
       } catch (Exception e) {
           logger.error("[ProcessAudioChunk] Error", e);
           throw new RuntimeException("Failed to process audio", e);
       }
   }
   ```

2. **Add SttServiceFactory dependency**:
   ```java
   @Autowired
   private SttServiceFactory sttServiceFactory;
   ```

3. **Remove direct SttService dependency** (use factory instead):
   ```java
   // OLD: @Autowired private SttService sttService;
   // NEW: Use sttServiceFactory.getSttService()
   ```

**Testing**:
- Test with existing VoiceRequest flow
- Verify STT integration works
- Test error handling

**Success Criteria**:
- ✅ VoiceSessionService uses SttServiceFactory
- ✅ Audio transcribes correctly
- ✅ Existing flow unaffected

---

### **Task 3.5: Add gRPC Integration Tests**
**Estimated Time**: 4-5 hours  
**File**: `services-java/va-service/src/test/java/com/ai/va/grpc/VoiceServiceImplIntegrationTest.java`  
**Priority**: HIGH (Validation)

**Test Cases**:
1. **Test TranscribeStream with Whisper**:
   ```java
   @Test
   @EnabledIfEnvironmentVariable(named = "WHISPER_ENABLED", matches = "true")
   public void testTranscribeStream_withWhisper() {
       // Send multiple audio chunks
       // Verify transcription response
       // Check MongoDB storage
   }
   ```

2. **Test Transcribe (single request)**:
   ```java
   @Test
   public void testTranscribe_singleAudio() {
       // Send complete audio file
       // Verify transcription response
   }
   ```

3. **Test Error Handling**:
   ```java
   @Test
   public void testTranscribe_unsupportedFormat() {
       // Send invalid audio format
       // Expect gRPC error
   }
   
   @Test
   public void testTranscribe_emptyAudio() {
       // Send empty audio
       // Expect gRPC error
   }
   ```

4. **Test Health Check**:
   ```java
   @Test
   public void testHealthCheck() {
       // Call health check RPC
       // Verify SERVING status
       // Check STT provider in details
   }
   ```

**Test Setup**:
```java
@SpringBootTest
@TestPropertySource(properties = {
    "stt.provider=whisper",
    "stt.whisper.url=http://localhost:8000"
})
public class VoiceServiceImplIntegrationTest {
    
    @Autowired
    private VoiceServiceImpl voiceService;
    
    @Autowired
    private TranscriptService transcriptService;
    
    // Test helper: create test audio bytes
    private byte[] createTestAudio() { ... }
}
```

**Success Criteria**:
- ✅ All integration tests pass
- ✅ Whisper integration verified
- ✅ MongoDB storage verified
- ✅ Error handling verified

---

### **Task 3.6: Update Configuration & Documentation**
**Estimated Time**: 2-3 hours  
**Files**: Configuration and documentation updates  
**Priority**: MEDIUM

**Configuration Updates**:

1. **application.yml** - Add gRPC server config:
   ```yaml
   grpc:
     server:
       port: 50051
       
   stt:
     provider: whisper
     whisper:
       url: http://localhost:8000
       model: base
   ```

2. **VoiceServiceImpl Profile**:
   - Remove `@Profile("voice")` - make always active
   - STT services already use `@ConditionalOnProperty`

**Documentation Updates**:

1. **Create PHASE-3-COMPLETE.md** (after completion):
   - Implementation summary
   - RPC methods added
   - Test coverage
   - Usage examples

2. **Update STT-TTS-IMPLEMENTATION-PLAN.md**:
   - Mark Phase 3 tasks as complete
   - Update progress percentage

3. **Add gRPC Usage Guide**:
   - How to call TranscribeStream
   - How to call Transcribe
   - Example gRPC client code

**Success Criteria**:
- ✅ Configuration documented
- ✅ Phase 3 marked complete
- ✅ Usage examples provided

---

## Implementation Order (Recommended)

### Day 1 (6-8 hours)
1. ✅ Task 3.2: Transcribe RPC (simpler, non-streaming) - **2-3 hours**
2. ✅ Task 3.4: Update VoiceSessionService - **3-4 hours**
3. ✅ Manual testing with sample audio - **1 hour**

**End of Day 1**: Basic transcription working with Whisper

### Day 2 (6-8 hours)
1. ✅ Task 3.1: TranscribeStream RPC (streaming) - **4-6 hours**
2. ✅ Task 3.3: Health Check RPC - **1-2 hours**
3. ✅ Manual testing with audio chunks - **1 hour**

**End of Day 2**: Streaming transcription working

### Day 3 (6-8 hours)
1. ✅ Task 3.5: Integration tests - **4-5 hours**
2. ✅ Task 3.6: Documentation - **2-3 hours**

**End of Day 3**: Phase 3 complete with tests and docs

---

## Dependencies & Prerequisites

### Required Services Running
- ✅ MongoDB (for transcript storage)
- ✅ Python Whisper server on http://localhost:8000
- ✅ va-service compiled and running

### Required Implementations (Already Complete)
- ✅ WhisperSttService (Task 1.3)
- ✅ AzureSpeechSttService (Task 1.4)
- ✅ SttServiceFactory (Task 1.5)
- ✅ AudioBufferManager (Task 1.7)
- ✅ TranscriptService (Phase 2)

### gRPC Proto Files
- ✅ voice.proto with AudioChunk, TranscriptionResponse messages
- ✅ Proto compilation in pom.xml

---

## Testing Strategy

### Unit Tests (Mocked)
- Mock SttService responses
- Mock AudioBufferManager
- Test gRPC request/response conversion
- Test error handling

### Integration Tests (Real Services)
- Real Whisper server integration
- Real MongoDB storage
- End-to-end transcription flow
- Health check validation

### Manual Testing
1. Start Whisper server: `cd services-python/whisper-server && python server.py`
2. Start va-service: `./mvnw spring-boot:run -Dspring-boot.run.profiles=dev`
3. Use gRPC client (grpcurl or custom test client)
4. Send audio chunks
5. Verify transcription responses
6. Check MongoDB for stored transcripts

---

## Success Metrics

### Functionality
- ✅ TranscribeStream RPC implemented and working
- ✅ Transcribe RPC implemented and working
- ✅ Audio chunks accumulate correctly
- ✅ STT transcribes audio successfully
- ✅ Transcripts saved to MongoDB
- ✅ Health check reports service status

### Performance
- ⏱️ Transcription latency < 3 seconds (Whisper base model)
- ⏱️ End-to-end latency < 5 seconds (including MongoDB save)
- 📊 Memory usage < 100MB per session

### Quality
- ✅ 80%+ test coverage for new code
- ✅ Zero critical bugs
- ✅ Documentation complete
- ✅ Code reviewed and approved

---

## Risks & Mitigations

| Risk | Impact | Probability | Mitigation |
|------|--------|-------------|------------|
| Whisper server unavailable | High | Medium | Health check, fallback to Azure |
| gRPC connection issues | High | Low | Retry logic, connection pooling |
| Memory leak in buffer | High | Low | Clear buffers after processing |
| MongoDB connection failure | Medium | Low | Graceful degradation (log only) |
| Audio format incompatibility | Medium | Medium | Format validation, error messages |

---

## Phase 3 Deliverables Checklist

### Code Implementation
- [ ] VoiceServiceImpl.transcribeStream() implemented
- [ ] VoiceServiceImpl.transcribe() implemented
- [ ] VoiceServiceImpl.checkHealth() implemented
- [ ] VoiceSessionService updated to use SttServiceFactory
- [ ] AudioBufferManager integrated into gRPC flow
- [ ] Error handling for all edge cases

### Testing
- [ ] Unit tests for VoiceServiceImpl (mocked)
- [ ] Integration tests with real Whisper server
- [ ] Health check tests
- [ ] Error scenario tests
- [ ] Manual end-to-end testing

### Documentation
- [ ] PHASE-3-GRPC-ENHANCEMENT-PLAN.md (this file)
- [ ] PHASE-3-COMPLETE.md (after completion)
- [ ] gRPC usage guide
- [ ] Update STT-TTS-IMPLEMENTATION-PLAN.md progress

### Configuration
- [ ] gRPC server configured
- [ ] STT provider configuration verified
- [ ] Profile settings updated

---

## Next Phase Preview

**Phase 4: TTS Module** will add text-to-speech capabilities:
- TTS service interface
- Azure TTS implementation
- Audio generation for assistant responses
- Integration with VoiceServiceImpl

This allows full voice conversation:
1. User speaks → STT → Text
2. Text → LLM → Response text
3. Response text → TTS → Audio
4. Audio → User hears assistant

---

**Phase 3 Status**: 🔄 **READY TO START**  
**Blocked By**: None (all dependencies complete)  
**Estimated Completion**: 3 days after approval

---

## Questions Before Starting

1. **Whisper Server**: Do you have the Python Whisper server running on localhost:8000?
2. **MongoDB**: Is MongoDB running and accessible for transcript storage?
3. **Testing Approach**: Should we start with Transcribe (simpler) or TranscribeStream first?
4. **Azure Speech**: Do you want to test Azure Speech integration or stick with Whisper for now?
5. **Profile**: Should VoiceServiceImpl always be active or keep behind "voice" profile?

Please confirm these before I begin implementation! 🚀

