package com.ai.va.grpc;

import java.util.concurrent.CompletableFuture;

import org.slf4j.Logger;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import com.ai.common.logging.LogFactory;
import com.ai.va.grpc.VoiceServiceGrpc.VoiceServiceImplBase;
import com.ai.va.model.SessionState;
import com.ai.va.service.TranscriptService;
import com.ai.va.service.VoiceSessionService;
import com.ai.va.service.stt.AudioBufferManager;
import com.ai.va.service.stt.SttService;
import com.ai.va.service.stt.SttServiceFactory;
import com.ai.va.service.tts.TtsService;
import com.ai.va.service.tts.TtsServiceFactory;

import io.grpc.Status;
import io.grpc.stub.StreamObserver;

/**
 * gRPC implementation of VoiceService
 * Provides voice conversation capabilities with STT integration
 */
@Service
public class VoiceServiceImpl extends VoiceServiceImplBase {

    private static final Logger logger = LogFactory.getLogger(VoiceServiceImpl.class);

    @Autowired
    private VoiceSessionService voiceSessionService;
    
    @Autowired
    private SttServiceFactory sttServiceFactory;
    
    @Autowired
    private TtsServiceFactory ttsServiceFactory;
    
    @Autowired
    private TranscriptService transcriptService;
    
    @Autowired
    private AudioBufferManager audioBufferManager;
    
    @Autowired
    private org.springframework.data.mongodb.core.MongoTemplate mongoTemplate;

    @Override
    public StreamObserver<com.ai.va.grpc.VoiceRequest> streamVoiceConversation(StreamObserver<com.ai.va.grpc.VoiceResponse> responseObserver) {
        // TODO: Implement bidirectional streaming voice processing
        // This requires integration with STT/TTS services for real-time audio handling
        logger.warn("streamVoiceConversation called but not yet fully implemented");
        
        responseObserver.onError(Status.UNIMPLEMENTED
            .withDescription("Bidirectional voice streaming not yet implemented")
            .asRuntimeException());
        
        return new StreamObserver<com.ai.va.grpc.VoiceRequest>() {
            @Override
            public void onNext(com.ai.va.grpc.VoiceRequest value) {
                // No-op for now
            }

            @Override
            public void onError(Throwable t) {
                logger.error("Error in voice stream", t);
            }

            @Override
            public void onCompleted() {
                // No-op for now
            }
        };
    }

    @Override
    public void processVoice(com.ai.va.grpc.VoiceRequest request, StreamObserver<com.ai.va.grpc.VoiceResponse> responseObserver) {
        try {
            logger.info("gRPC ProcessVoice - sessionId: {}, audioSize: {}", 
                request.getSessionId(), request.getAudioData().size());

            SessionState session = voiceSessionService.getSession(request.getSessionId());
            if (session == null) {
                responseObserver.onError(Status.NOT_FOUND
                    .withDescription("Session not found")
                    .asRuntimeException());
                return;
            }

            // Convert gRPC request to internal model
            com.ai.va.model.VoiceRequest internalRequest = new com.ai.va.model.VoiceRequest();
            internalRequest.setCallId(request.getSessionId());
            
            // Convert audio bytes
            byte[] audioBytes = request.getAudioData().toByteArray();
            String audioBase64 = java.util.Base64.getEncoder().encodeToString(audioBytes);
            internalRequest.setAudioChunk(audioBase64);

            // Process audio using existing service
            com.ai.va.model.VoiceResponse internalResponse = voiceSessionService.processAudioChunk(internalRequest);

            // Convert back to gRPC response
            com.ai.va.grpc.VoiceResponse.Builder builder = com.ai.va.grpc.VoiceResponse.newBuilder()
                .setResponseText(internalResponse.getTranscript() != null ? 
                    internalResponse.getTranscript() : "")
                .setIsInterim(false);

            // Convert TTS audio back to bytes if available
            if (internalResponse.getTtsAudio() != null && !internalResponse.getTtsAudio().isEmpty()) {
                byte[] responseBytes = java.util.Base64.getDecoder().decode(internalResponse.getTtsAudio());
                builder.setResponseAudio(com.google.protobuf.ByteString.copyFrom(responseBytes));
            }

            responseObserver.onNext(builder.build());
            responseObserver.onCompleted();

        } catch (Exception e) {
            logger.error("Error in processVoice gRPC", e);
            responseObserver.onError(Status.INTERNAL
                .withDescription("Failed to process voice: " + e.getMessage())
                .asRuntimeException());
        }
    }
    
    /**
     * Transcribe single audio chunk (non-streaming)
     * Implements Task 3.2 from Phase 3 plan
     */
    @Override
    public void transcribe(AudioChunk request, StreamObserver<TranscriptionResponse> responseObserver) {
        try {
            String sessionId = request.getSessionId();
            String format = request.getFormat();
            byte[] audioData = request.getAudioData().toByteArray();
            String customerId = request.getCustomerId();
            
            logger.info("[Transcribe] sessionId: {}, format: {}, size: {} bytes", 
                sessionId, format, audioData.length);
            
            // Validate input
            if (audioData.length == 0) {
                responseObserver.onError(Status.INVALID_ARGUMENT
                    .withDescription("Audio data is empty")
                    .asRuntimeException());
                return;
            }
            
            // Get STT service from factory
            SttService sttService = sttServiceFactory.getSttService();
            
            // Transcribe async
            sttService.transcribeAsync(audioData, format, sessionId)
                .thenAccept(result -> {
                    logger.info("[Transcribe] Success - text: '{}', confidence: {}", 
                        result.getText(), result.getConfidence());
                    
                    // Build proto response
                    TranscriptionResponse.Builder responseBuilder = TranscriptionResponse.newBuilder()
                        .setSessionId(sessionId)
                        .setText(result.getText())
                        .setConfidence(result.getConfidence())
                        .setIsFinal(true)
                        .setLanguage(result.getMetadata().getLanguage());
                    
                    // Add metadata
                    TranscriptionMetadata.Builder metadataBuilder = TranscriptionMetadata.newBuilder()
                        .setProvider(result.getMetadata().getProvider())
                        .setModel(result.getMetadata().getModel())
                        .setStreaming(false);
                    
                    responseBuilder.setMetadata(metadataBuilder.build());
                    
                    // Send response
                    responseObserver.onNext(responseBuilder.build());
                    responseObserver.onCompleted();
                    
                    // Save to MongoDB (async, don't block)
                    CompletableFuture.runAsync(() -> {
                        try {
                            transcriptService.addSegment(
                                sessionId, 
                                "user", 
                                result.getText(), 
                                result.getConfidence()
                            );
                            logger.debug("[Transcribe] Saved transcript to MongoDB");
                        } catch (Exception e) {
                            logger.error("[Transcribe] Failed to save transcript to MongoDB", e);
                        }
                    });
                })
                .exceptionally(error -> {
                    logger.error("[Transcribe] Failed", error);
                    responseObserver.onError(Status.INTERNAL
                        .withDescription("Transcription failed: " + error.getMessage())
                        .asRuntimeException());
                    return null;
                });
            
        } catch (Exception e) {
            logger.error("[Transcribe] Error", e);
            responseObserver.onError(Status.INTERNAL
                .withDescription("Error: " + e.getMessage())
                .asRuntimeException());
        }
    }
    
    /**
     * Transcribe streaming audio chunks
     * Implements Task 3.1 from Phase 3 plan
     * Client streams audio chunks, server returns transcription when complete
     */
    @Override
    public StreamObserver<AudioChunk> transcribeStream(StreamObserver<TranscriptionResponse> responseObserver) {
        return new StreamObserver<AudioChunk>() {
            private String sessionId = null;
            private String format = null;
            private String customerId = null;
            private int chunkCount = 0;
            
            @Override
            public void onNext(AudioChunk chunk) {
                try {
                    // Initialize session on first chunk
                    if (sessionId == null) {
                        sessionId = chunk.getSessionId();
                        format = chunk.getFormat();
                        customerId = chunk.getCustomerId();
                        
                        // Initialize audio buffer for this session
                        audioBufferManager.initializeSession(sessionId, format);
                        
                        logger.info("[TranscribeStream] Started session: {}, format: {}", sessionId, format);
                    }
                    
                    // Validate session consistency
                    if (!sessionId.equals(chunk.getSessionId())) {
                        responseObserver.onError(Status.INVALID_ARGUMENT
                            .withDescription("Session ID mismatch: expected " + sessionId + ", got " + chunk.getSessionId())
                            .asRuntimeException());
                        return;
                    }
                    
                    // Add chunk to buffer
                    byte[] audioData = chunk.getAudioData().toByteArray();
                    if (audioData.length > 0) {
                        audioBufferManager.addChunk(sessionId, audioData);
                        chunkCount++;
                        logger.debug("[TranscribeStream] Received chunk {} for session {}: {} bytes", 
                            chunkCount, sessionId, audioData.length);
                    }
                    
                    // If this is the final chunk, process transcription
                    if (chunk.getIsFinalChunk()) {
                        logger.info("[TranscribeStream] Final chunk received for session {}, processing {} chunks", 
                            sessionId, chunkCount);
                        processStreamedAudio(sessionId, format, customerId, responseObserver);
                    }
                    
                } catch (IllegalStateException e) {
                    logger.error("[TranscribeStream] Buffer overflow for session: {}", sessionId, e);
                    responseObserver.onError(Status.RESOURCE_EXHAUSTED
                        .withDescription("Audio buffer exceeded maximum size: " + e.getMessage())
                        .asRuntimeException());
                    cleanupSession(sessionId);
                } catch (Exception e) {
                    logger.error("[TranscribeStream] Error processing chunk for session: {}", sessionId, e);
                    responseObserver.onError(Status.INTERNAL
                        .withDescription("Error processing audio chunk: " + e.getMessage())
                        .asRuntimeException());
                    cleanupSession(sessionId);
                }
            }
            
            @Override
            public void onError(Throwable t) {
                logger.error("[TranscribeStream] Stream error for session: {}", sessionId, t);
                cleanupSession(sessionId);
            }
            
            @Override
            public void onCompleted() {
                // If we reach here without final chunk, treat accumulated audio as complete
                if (sessionId != null && audioBufferManager.hasSession(sessionId)) {
                    logger.info("[TranscribeStream] Stream completed without final chunk flag, processing session: {}", sessionId);
                    processStreamedAudio(sessionId, format, customerId, responseObserver);
                } else {
                    logger.debug("[TranscribeStream] Stream completed for session: {}", sessionId);
                }
            }
            
            private void processStreamedAudio(String sessionId, String format, String customerId, 
                                            StreamObserver<TranscriptionResponse> responseObserver) {
                try {
                    // Get concatenated audio from buffer
                    byte[] fullAudio = audioBufferManager.getConcatenatedAudio(sessionId);
                    long bufferSize = audioBufferManager.getBufferSize(sessionId);
                    
                    logger.info("[TranscribeStream] Processing {} bytes for session {}", bufferSize, sessionId);
                    
                    if (fullAudio.length == 0) {
                        responseObserver.onError(Status.INVALID_ARGUMENT
                            .withDescription("No audio data received")
                            .asRuntimeException());
                        cleanupSession(sessionId);
                        return;
                    }
                    
                    // Get STT service and transcribe
                    SttService sttService = sttServiceFactory.getSttService();
                    
                    sttService.transcribeAsync(fullAudio, format, sessionId)
                        .thenAccept(result -> {
                            logger.info("[TranscribeStream] Success - text: '{}', confidence: {}", 
                                result.getText(), result.getConfidence());
                            
                            // Build response
                            TranscriptionResponse.Builder responseBuilder = TranscriptionResponse.newBuilder()
                                .setSessionId(sessionId)
                                .setText(result.getText())
                                .setConfidence(result.getConfidence())
                                .setIsFinal(true)
                                .setLanguage(result.getMetadata().getLanguage());
                            
                            // Add metadata
                            TranscriptionMetadata.Builder metadataBuilder = TranscriptionMetadata.newBuilder()
                                .setProvider(result.getMetadata().getProvider())
                                .setModel(result.getMetadata().getModel())
                                .setStreaming(true);
                            
                            responseBuilder.setMetadata(metadataBuilder.build());
                            
                            // Send response
                            responseObserver.onNext(responseBuilder.build());
                            responseObserver.onCompleted();
                            
                            // Save to MongoDB (async)
                            CompletableFuture.runAsync(() -> {
                                try {
                                    transcriptService.addSegment(
                                        sessionId, 
                                        "user", 
                                        result.getText(), 
                                        result.getConfidence()
                                    );
                                    logger.debug("[TranscribeStream] Saved transcript to MongoDB");
                                } catch (Exception e) {
                                    logger.error("[TranscribeStream] Failed to save transcript", e);
                                }
                            });
                            
                            // Cleanup
                            cleanupSession(sessionId);
                        })
                        .exceptionally(error -> {
                            logger.error("[TranscribeStream] Transcription failed for session: {}", sessionId, error);
                            responseObserver.onError(Status.INTERNAL
                                .withDescription("Transcription failed: " + error.getMessage())
                                .asRuntimeException());
                            cleanupSession(sessionId);
                            return null;
                        });
                    
                } catch (Exception e) {
                    logger.error("[TranscribeStream] Error processing streamed audio", e);
                    responseObserver.onError(Status.INTERNAL
                        .withDescription("Error processing audio: " + e.getMessage())
                        .asRuntimeException());
                    cleanupSession(sessionId);
                }
            }
            
            private void cleanupSession(String sessionId) {
                if (sessionId != null && audioBufferManager.hasSession(sessionId)) {
                    audioBufferManager.clearSession(sessionId);
                    logger.debug("[TranscribeStream] Cleaned up session: {}", sessionId);
                }
            }
        };
    }
    
    // ============================================================================
    // TTS (Text-to-Speech) RPC Methods
    // ============================================================================
    
    /**
     * Synthesize text to speech (single request)
     * Converts text to audio using the configured TTS provider
     */
    @Override
    public void synthesize(com.ai.va.grpc.SynthesisRequest request, io.grpc.stub.StreamObserver<com.ai.va.grpc.AudioResponse> responseObserver) {
        String sessionId = request.getSessionId();
        String text = request.getText();
        String language = request.getLanguage();
        String voiceName = request.getVoiceName();
        String format = request.getFormat();
        
        logger.info("[Synthesize] Session: {}, Text length: {}, Language: {}, Voice: {}, Format: {}", 
            sessionId, text.length(), language, voiceName, format);
        
        try {
            // Get TTS service
            TtsService ttsService = ttsServiceFactory.getTtsService();
            
            // Perform synthesis
            ttsService.synthesizeWithMetadata(text, language, voiceName)
                .thenAccept(result -> {
                    if (result.isSuccess()) {
                        // Build AudioResponse
                        com.ai.va.grpc.AudioMetadata metadata = com.ai.va.grpc.AudioMetadata.newBuilder()
                            .setVoiceName(result.getVoiceName())
                            .setLanguage(result.getLanguage())
                            .setDurationMs(result.getDurationMs())
                            .setSampleRate(result.getSampleRate())
                            .setBitrate(result.getBitrate())
                            .setProvider(result.getProvider())
                            .setProcessingTimeMs(result.getDurationMs())
                            .setSuccess(true)
                            .build();
                        
                        com.ai.va.grpc.AudioResponse response = com.ai.va.grpc.AudioResponse.newBuilder()
                            .setSessionId(sessionId)
                            .setAudioData(com.google.protobuf.ByteString.copyFrom(result.getAudioData()))
                            .setFormat(result.getFormat())
                            .setMetadata(metadata)
                            .build();
                        
                        logger.info("[Synthesize] Success: {} bytes, voice: {}, duration: {}ms", 
                            result.getAudioData().length, result.getVoiceName(), result.getDurationMs());
                        
                        responseObserver.onNext(response);
                        responseObserver.onCompleted();
                        
                    } else {
                        logger.error("[Synthesize] TTS failed: {}", result.getErrorMessage());
                        responseObserver.onError(Status.INTERNAL
                            .withDescription("TTS synthesis failed: " + result.getErrorMessage())
                            .asRuntimeException());
                    }
                })
                .exceptionally(error -> {
                    logger.error("[Synthesize] TTS error for session: {}", sessionId, error);
                    responseObserver.onError(Status.INTERNAL
                        .withDescription("TTS error: " + error.getMessage())
                        .asRuntimeException());
                    return null;
                });
                
        } catch (Exception e) {
            logger.error("[Synthesize] Error processing TTS request", e);
            responseObserver.onError(Status.INTERNAL
                .withDescription("Error processing TTS request: " + e.getMessage())
                .asRuntimeException());
        }
    }
    
    /**
     * Synthesize text to speech (streaming)
     * Client sends text chunks, server returns audio chunks as they become available
     */
    @Override
    public io.grpc.stub.StreamObserver<com.ai.va.grpc.TextChunk> synthesizeStream(io.grpc.stub.StreamObserver<com.ai.va.grpc.AudioResponse> responseObserver) {
        logger.info("[SynthesizeStream] Starting streaming TTS");
        
        return new io.grpc.stub.StreamObserver<com.ai.va.grpc.TextChunk>() {
            private String sessionId;
            private StringBuilder textBuffer = new StringBuilder();
            private String language = "en-US";
            private String voiceName = null;
            private int chunkCount = 0;
            
            @Override
            public void onNext(com.ai.va.grpc.TextChunk chunk) {
                try {
                    if (sessionId == null) {
                        sessionId = chunk.getSessionId();
                        logger.info("[SynthesizeStream] Started session: {}", sessionId);
                    }
                    
                    // Update parameters from chunk
                    if (!chunk.getLanguage().isEmpty()) {
                        language = chunk.getLanguage();
                    }
                    if (!chunk.getVoiceName().isEmpty()) {
                        voiceName = chunk.getVoiceName();
                    }
                    
                    // Accumulate text
                    textBuffer.append(chunk.getText());
                    chunkCount++;
                    
                    logger.debug("[SynthesizeStream] Chunk {}: {} chars (total: {})", 
                        chunk.getSequenceNumber(), chunk.getText().length(), textBuffer.length());
                    
                    // If final chunk, synthesize all accumulated text
                    if (chunk.getIsFinalChunk()) {
                        String fullText = textBuffer.toString();
                        logger.info("[SynthesizeStream] Final chunk received, synthesizing {} chars", fullText.length());
                        
                        synthesizeAndStream(fullText, language, voiceName, responseObserver);
                    }
                    
                } catch (Exception e) {
                    logger.error("[SynthesizeStream] Error processing text chunk", e);
                    responseObserver.onError(Status.INTERNAL
                        .withDescription("Error processing text chunk: " + e.getMessage())
                        .asRuntimeException());
                }
            }
            
            @Override
            public void onError(Throwable t) {
                logger.error("[SynthesizeStream] Client error: {}", t.getMessage(), t);
                textBuffer.setLength(0); // Clear buffer
            }
            
            @Override
            public void onCompleted() {
                logger.info("[SynthesizeStream] Stream completed, {} chunks processed", chunkCount);
                textBuffer.setLength(0); // Clear buffer
            }
            
            private void synthesizeAndStream(String text, String lang, String voice, 
                                            io.grpc.stub.StreamObserver<com.ai.va.grpc.AudioResponse> observer) {
                try {
                    TtsService ttsService = ttsServiceFactory.getTtsService();
                    
                    ttsService.synthesizeWithMetadata(text, lang, voice)
                        .thenAccept(result -> {
                            if (result.isSuccess()) {
                                com.ai.va.grpc.AudioMetadata metadata = com.ai.va.grpc.AudioMetadata.newBuilder()
                                    .setVoiceName(result.getVoiceName())
                                    .setLanguage(result.getLanguage())
                                    .setDurationMs(result.getDurationMs())
                                    .setSampleRate(result.getSampleRate())
                                    .setBitrate(result.getBitrate())
                                    .setProvider(result.getProvider())
                                    .setProcessingTimeMs(result.getDurationMs())
                                    .setSuccess(true)
                                    .build();
                                
                                com.ai.va.grpc.AudioResponse response = com.ai.va.grpc.AudioResponse.newBuilder()
                                    .setSessionId(sessionId)
                                    .setAudioData(com.google.protobuf.ByteString.copyFrom(result.getAudioData()))
                                    .setFormat(result.getFormat())
                                    .setMetadata(metadata)
                                    .build();
                                
                                logger.info("[SynthesizeStream] Synthesis complete: {} bytes", 
                                    result.getAudioData().length);
                                
                                observer.onNext(response);
                                observer.onCompleted();
                                
                            } else {
                                logger.error("[SynthesizeStream] TTS failed: {}", result.getErrorMessage());
                                observer.onError(Status.INTERNAL
                                    .withDescription("TTS synthesis failed: " + result.getErrorMessage())
                                    .asRuntimeException());
                            }
                        })
                        .exceptionally(error -> {
                            logger.error("[SynthesizeStream] TTS error: {}", error.getMessage(), error);
                            observer.onError(Status.INTERNAL
                                .withDescription("TTS error: " + error.getMessage())
                                .asRuntimeException());
                            return null;
                        });
                        
                } catch (Exception e) {
                    logger.error("[SynthesizeStream] Error during synthesis", e);
                    observer.onError(Status.INTERNAL
                        .withDescription("Error during synthesis: " + e.getMessage())
                        .asRuntimeException());
                }
            }
        };
    }
}
