package com.ai.va.prompt;

/**
 * USAGE EXAMPLES for PromptBuilder and PromptAssembler
 * 
 * This file demonstrates how to use the new prompt building infrastructure
 * in your VA service endpoints.
 */

public class PromptBuilderExamples {

    /**
     * Example 1: Simple manual prompt building
     * Use this when you have all values readily available
     */
    public void example1_ManualBuilding() {
        String prompt = new PromptBuilder()
                .withBusinessName("Acme Health")
                .withIndustry("Healthcare")
                .withPersona("You are a friendly, professional medical support assistant.")
                .withStaticContext("Acme Health provides primary care, urgent care, and telehealth services...")
                .withRagContext("Walk-in appointments available 9am–5pm. Insurance accepted: Aetna, Cigna, BCBS")
                .withConstraints("Do not provide medical diagnosis. Always ask for patient name and DOB before booking.")
                .withChannel("chat")
                // .withSessionState(sessionState) // Add if you have conversation history
                .build();
        
        // Send to LLM
        // String response = llmService.generate(prompt);
    }

    /**
     * Example 2: Using PromptAssembler with existing configuration models
     * Use this in your actual ChatSessionService
     */
    public void example2_WithConfiguration() {
        // In your ChatSessionService or DialogManager:
        
        // 1. Get configuration from MongoDB
        // ChannelConfiguration config = configurationService.getChatConfiguration(customerId, productId);
        
        // 2. Get current session state
        // SessionState sessionState = sessionManager.getSession(sessionId);
        
        // 3. Optional: Get RAG results
        // String ragResults = ragService.retrieveRelevantChunks(userInput);
        
        // 4. Assemble prompt using PromptAssembler
        // PromptAssembler assembler = new PromptAssembler();
        // String prompt = assembler.assemblePrompt(config, sessionState, ragResults);
        
        // 5. Send to LLM
        // String response = llmClient.getChatCompletion(prompt, userInput);
    }

    /**
     * Example 3: Integration in ChatSessionService.startSession()
     * Shows how to use PromptBuilder when initializing a chat session
     */
    public void example3_InStartSession() {
        /*
        public String startSession(String customerId, String productId, String sessionId) {
            
            // Load configuration from MongoDB
            ChannelConfiguration config = configurationService.getChatConfiguration(customerId, productId);
            
            // Create new session state
            SessionState session = new SessionState();
            session.setSessionId(sessionId);
            session.setPromptContext(config.getPromptContext());
            session.setCustomPrompts(config.getCustomPrompts());
            session.setRagConfiguration(config.getRagConfiguration());
            
            // Build initial system prompt using PromptAssembler
            PromptAssembler assembler = new PromptAssembler();
            String systemPrompt = assembler.assemblePrompt(config, session);
            
            // Test LLM connection with system prompt
            try {
                llmClient.testConnection();
                logger.info("LLM connection successful for session {}", sessionId);
            } catch (Exception e) {
                logger.error("LLM connection failed", e);
            }
            
            // Store session
            sessionManager.storeSession(sessionId, session);
            
            // Return greeting
            return config.getGreeting() != null 
                ? config.getGreeting() 
                : "Hello! How can I help you today?";
        }
        */
    }

    /**
     * Example 4: Integration in DialogManager.processUserMessage()
     * Shows how to use PromptBuilder when processing each user message
     */
    public void example4_InDialogManager() {
        /*
        public String processUserMessage(String sessionId, String userMessage) {
            
            // Get session
            SessionState sessionState = sessionManager.getSession(sessionId);
            ChannelConfiguration config = getConfigurationForSession(sessionState);
            
            // Add user turn to session
            sessionState.addTurn(new Turn("USER", userMessage));
            
            // Optional: Get RAG results for user message
            String ragResults = null;
            if (sessionState.getRagConfiguration() != null && sessionState.getRagConfiguration().isEnabled()) {
                ragResults = ragService.retrieveRelevantChunks(userMessage);
            }
            
            // Build complete prompt with conversation history
            PromptAssembler assembler = new PromptAssembler();
            String systemPrompt = assembler.assemblePrompt(config, sessionState, ragResults);
            
            // Send to LLM
            String assistantResponse = llmClient.getChatCompletion(systemPrompt, userMessage);
            
            // Add assistant turn to session
            sessionState.addTurn(new Turn("ASSISTANT", assistantResponse));
            
            // Update session
            sessionManager.storeSession(sessionId, sessionState);
            
            return assistantResponse;
        }
        */
    }

    /**
     * Example 5: Channel-specific prompt building
     * Shows how to adjust prompts for voice vs chat channels
     */
    public void example5_ChannelSpecific() {
        String voicePrompt = new PromptBuilder()
                .withBusinessName("Acme Health")
                .withIndustry("Healthcare")
                .withPersona("You are a friendly, concise voice assistant.")
                .withStaticContext("Acme Health provides telehealth services...")
                .withConstraints("Keep responses under 50 words for voice. Speak naturally.")
                .withChannel("voice") // Voice-specific
                .build();

        String chatPrompt = new PromptBuilder()
                .withBusinessName("Acme Health")
                .withIndustry("Healthcare")
                .withPersona("You are a professional chat support assistant.")
                .withStaticContext("Acme Health provides telehealth services...")
                .withConstraints("Provide detailed, formatted responses with bullet points.")
                .withChannel("chat") // Chat-specific
                .build();
    }
}
