package com.ai.va.service;

import com.ai.va.model.*;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.Base64;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

/**
 * Voice Session Service
 * Orchestrates the voice assistant pipeline per callId
 * Flow: STT → Dialog → LLM → TTS → Usage tracking
 */
@Service
public class VoiceSessionService {

    private static final Logger logger = LoggerFactory.getLogger(VoiceSessionService.class);

    @Autowired
    private SttService sttService;

    @Autowired
    private LlmService llmService;

    @Autowired
    private TtsService ttsService;

    @Autowired
    private DialogManager dialogManager;

    @Autowired
    private UsageService usageService;

    @Autowired
    private ConfigurationService configurationService;

    // In-memory session storage (consider Redis for production)
    private final Map<String, SessionState> activeSessions = new ConcurrentHashMap<>();

    /**
     * Start a new voice session
     * Called once at call start from Node.js backend
     * Loads RAG configuration and prompt context from database based on tenant ID
     * 
     * @param callId Unique call identifier
     * @param customerId Customer ID for context
     * @param tenantId Tenant ID for fetching configuration
     * @param productId Product ID for fetching configuration
     * @return Initialized session state
     */
    public SessionState startSession(String callId, String customerId, String tenantId, String productId) {
        SessionState session = new SessionState(callId);
        session.setCustomerId(customerId);
        session.setTenantId(tenantId);
        session.setProductId(productId);
        
        // Load configuration from backend based on tenant and product
        try {
            ChannelConfiguration voiceConfig = configurationService.getVoiceConfiguration(tenantId, productId);
            
            if (voiceConfig != null) {
                // Load voice settings
                if (voiceConfig.getVoiceSettings() != null) {
                    session.setVoiceSettings(voiceConfig.getVoiceSettings());
                }
                
                // Load RAG configuration
                if (voiceConfig.getRagConfig() != null) {
                    session.setRagConfiguration(voiceConfig.getRagConfig());
                    logger.info("[Session] RAG enabled: {}", voiceConfig.getRagConfig().isEnabled());
                    if (voiceConfig.getRagConfig().isEnabled() && voiceConfig.getRagConfig().getSources() != null) {
                        logger.info("[Session] RAG sources count: {}", voiceConfig.getRagConfig().getSources().size());
                    }
                }
                
                // Load prompt context
                if (voiceConfig.getPromptContext() != null) {
                    session.setPromptContext(voiceConfig.getPromptContext());
                    logger.info("[Session] Prompt context loaded: {}", voiceConfig.getPromptContext());
                }
                
                // Load custom prompts to system instructions
                if (voiceConfig.getCustomPrompts() != null) {
                    CustomPrompts prompts = voiceConfig.getCustomPrompts();
                    SystemInstructions instructions = new SystemInstructions();
                    
                    if (prompts.getSystemPrompt() != null) {
                        instructions.setBaseInstruction(prompts.getSystemPrompt());
                    }
                    if (prompts.getGreeting() != null) {
                        instructions.setGreeting(prompts.getGreeting());
                    }
                    
                    session.setSystemInstructions(instructions);
                }
            }
            
            // Set industry from context if available
            if (session.getPromptContext() != null && session.getPromptContext().getTenantIndustry() != null) {
                session.setCustomerIndustry(session.getPromptContext().getTenantIndustry());
            } else {
                session.setCustomerIndustry("General Business");
            }
            
        } catch (Exception e) {
            logger.error("[Session] Error loading configuration: {}", e.getMessage(), e);
            // Continue with defaults
            session.setCustomerIndustry("General Business");
        }
        
        activeSessions.put(callId, session);
        
        logger.info("Started voice session: {} for tenant: {} product: {}", callId, tenantId, productId);
        return session;
    }

    /**
     * Backward compatibility - start session without tenant/product IDs
     */
    public SessionState startSession(String callId, String customerId) {
        return startSession(callId, customerId, customerId, null);
    }

    /**
     * Process audio chunk through the full pipeline
     * Called repeatedly with audio chunks from Node's /voice/stream handler
     * 
     * Steps:
     * 1. STT: audio → text
     * 2. Dialog: update context, build prompt
     * 3. LLM: prompt → reply text
     * 4. TTS: reply text → audio
     * 5. Record usage (seconds, tokens, chars)
     * 6. Return audio to Node
     */
    public VoiceResponse processAudioChunk(VoiceRequest request) {
        String callId = request.getCallId();
        String audioChunkBase64 = request.getAudioChunk();

        SessionState state = activeSessions.get(callId);
        if (state == null) {
            throw new IllegalStateException("Session not found for callId: " + callId);
        }

        try {
            // Decode audio from base64
            byte[] audio = Base64.getDecoder().decode(audioChunkBase64);

            // 1. STT: Speech-to-Text
            String userText = sttService.transcribe(audioChunkBase64);
            
            if (userText == null || userText.trim().isEmpty()) {
                // No speech detected, return empty response
                return new VoiceResponse();
            }

            // 2. Load and update session state
            state.addTurn(Turn.caller(userText));

            // Process user input: detect intent and extract slots
            dialogManager.processUserInput(state, userText);

            // 3. Dialog + LLM
            String prompt = dialogManager.buildPrompt(state);
            LlmResult llmResult = llmService.generateWithMetadata(prompt);
            String assistantText = llmResult.getText();

            state.addTurn(Turn.assistant(assistantText));
            saveState(callId, state);

            // 4. TTS: Text-to-Speech
            String ttsAudio = ttsService.synthesize(assistantText, state.getVoiceSettings());

            // 5. Usage metrics
            usageService.recordUsage(callId, llmResult, audio.length, ttsAudio.length());
            
            // Set customer ID for final billing
            usageService.setCustomerId(callId, state.getCustomerId());

            // 6. Build response
            VoiceResponse response = new VoiceResponse();
            response.setCallId(callId);
            response.setTtsAudio(ttsAudio);
            response.setTranscript(userText);
            response.setAssistantResponse(assistantText);

            return response;

        } catch (Exception e) {
            throw new RuntimeException("Error processing audio chunk for callId: " + callId, e);
        }
    }

    /**
     * Get active session state
     */
    public SessionState getState(String callId) {
        SessionState state = activeSessions.get(callId);
        if (state == null) {
            throw new IllegalStateException("Session not found: " + callId);
        }
        return state;
    }

    /**
     * Save session state
     */
    public void saveState(String callId, SessionState state) {
        activeSessions.put(callId, state);
    }

    /**
     * End session and cleanup
     * Clean up in-memory state and flush any final metrics
     */
    public void endSession(String callId) {
        SessionState session = activeSessions.remove(callId);
        if (session != null) {
            // Perform cleanup
            dialogManager.clearContext(callId);
            usageService.finalizeMetrics(callId);
            logger.info("Ended voice session: {}", callId);
        }
    }

    /**
     * Get active session (nullable)
     */
    public SessionState getSession(String callId) {
        return activeSessions.get(callId);
    }
}
