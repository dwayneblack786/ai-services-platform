package com.ai.va.grpc;

import com.ai.common.logging.LogFactory;
import com.ai.va.grpc.VoiceServiceGrpc.VoiceServiceImplBase;
import com.ai.va.model.SessionState;
import com.ai.va.service.VoiceSessionService;

import io.grpc.Status;
import io.grpc.stub.StreamObserver;
import org.slf4j.Logger;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

/**
 * gRPC implementation of VoiceService
 * Provides voice conversation capabilities
 * Note: Full bidirectional streaming implementation pending - requires STT/TTS integration
 */
@Service
public class VoiceServiceImpl extends VoiceServiceImplBase {

    private static final Logger logger = LogFactory.getLogger(VoiceServiceImpl.class);

    @Autowired
    private VoiceSessionService voiceSessionService;

    @Override
    public StreamObserver<VoiceRequest> streamVoiceConversation(StreamObserver<VoiceResponse> responseObserver) {
        // TODO: Implement bidirectional streaming voice processing
        // This requires integration with STT/TTS services for real-time audio handling
        logger.warn("streamVoiceConversation called but not yet fully implemented");
        
        responseObserver.onError(Status.UNIMPLEMENTED
            .withDescription("Bidirectional voice streaming not yet implemented")
            .asRuntimeException());
        
        return new StreamObserver<VoiceRequest>() {
            @Override
            public void onNext(VoiceRequest value) {
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
    public void processVoice(VoiceRequest request, StreamObserver<VoiceResponse> responseObserver) {
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
            VoiceResponse.Builder builder = VoiceResponse.newBuilder()
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
}
