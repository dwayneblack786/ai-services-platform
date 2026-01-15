package com.ai.va.controller;

import com.ai.va.model.VoiceRequest;
import com.ai.va.model.VoiceResponse;
import com.ai.va.model.VoiceSessionRequest;
import com.ai.va.model.VoiceSessionResponse;
import com.ai.va.model.SessionState;
import com.ai.va.service.VoiceSessionService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

/**
 * Voice Session Controller
 * Handles incoming audio streaming requests from the Node.js backend
 */
@RestController
@RequestMapping("/voice")
public class VoiceSessionController {

    @Autowired
    private VoiceSessionService voiceSessionService;

    /**
     * Initialize a voice session
     * Called once at call start from Node.js backend
     * Loads tenant and product-specific configuration including RAG and context
     * 
     * @param request Contains callId, customerId, tenantId, and productId
     * @return Session initialization response with sessionId
     */
    @PostMapping("/session")
    public ResponseEntity<VoiceSessionResponse> startSession(@RequestBody VoiceSessionRequest request) {
        SessionState state = voiceSessionService.startSession(
            request.getCallId(), 
            request.getCustomerId(),
            request.getTenantId(),
            request.getProductId()
        );
        return ResponseEntity.ok(new VoiceSessionResponse(state.getCallId()));
    }

    /**
     * Process audio chunk from caller
     * Called repeatedly with audio chunks from Node's /voice/stream handler
     * Performs: STT → Dialog → LLM → TTS → Usage tracking
     * 
     * @param request Contains callId and audioChunk (base64 encoded)
     * @return TTS audio response to play back to caller
     */
    @PostMapping("/process")
    public ResponseEntity<VoiceResponse> processAudio(@RequestBody VoiceRequest request) {
        VoiceResponse response = voiceSessionService.processAudioChunk(request);
        return ResponseEntity.ok(response);
    }

    /**
     * End voice session and cleanup
     * Used to clean up in-memory state and flush any final metrics
     * 
     * @param callId The unique call identifier
     * @return Success response
     */
    @PostMapping("/end")
    public ResponseEntity<Void> endSession(@RequestParam String callId) {
        voiceSessionService.endSession(callId);
        return ResponseEntity.ok().build();
    }
}
