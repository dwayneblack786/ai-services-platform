package com.ai.va.service;

import com.ai.va.client.LlmClient;
import com.ai.va.config.LlmConfig;
import com.ai.va.model.LlmResult;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

/**
 * LLM Service
 * Integrates with language model (e.g., OpenAI GPT, Anthropic Claude, local models)
 */
@Service
public class LlmService {

    private static final Logger logger = LoggerFactory.getLogger(LlmService.class);

    @Autowired
    private LlmClient llmClient;

    @Autowired
    private LlmConfig llmConfig;

    /**
     * Generate response with metadata (tokens, latency)
     * 
     * @param prompt Full prompt including context
     * @return LLM result with text and metadata
     */
    public LlmResult generateWithMetadata(String prompt) {
        logger.debug("[LlmService] generateWithMetadata called");
        logger.debug("[LlmService] Prompt length: {} characters", prompt.length());
        logger.debug("[LlmService] Max tokens: {}", llmConfig.getMaxTokens());
        logger.debug("[LlmService] Temperature: {}", llmConfig.getTemperature());
        logger.debug("[LlmService] Model: {}", llmConfig.getModel());
        
        try {
            long startTime = System.currentTimeMillis();
            logger.debug("[LlmService] Calling llmClient.generate()...");
            
            String responseText = llmClient.generate(prompt, llmConfig.getMaxTokens(), llmConfig.getTemperature());
            
            long endTime = System.currentTimeMillis();
            double latencyMs = endTime - startTime;
            logger.info("[LlmService] LLM response received in {}ms", latencyMs);
            logger.debug("[LlmService] Response length: {} characters", (responseText != null ? responseText.length() : 0));

            // Estimate tokens (rough approximation: 1 token ≈ 4 characters)
            int tokensIn = prompt.length() / 4;
            int tokensOut = responseText.length() / 4;

            LlmResult result = new LlmResult(responseText, tokensIn, tokensOut);
            result.setModel(llmConfig.getModel());
            result.setLatencyMs(latencyMs);

            logger.debug("[LlmService] Result created successfully");
            return result;
        } catch (Exception e) {
            logger.error("[LlmService] ============================================");
            logger.error("[LlmService] ERROR: LLM generation failed!");
            logger.error("[LlmService] Error type: {}", e.getClass().getName());
            logger.error("[LlmService] Error message: {}", e.getMessage());
            if (e.getCause() != null) {
                logger.error("[LlmService] Caused by: {}: {}", e.getCause().getClass().getName(), e.getCause().getMessage());
            }
            logger.error("[LlmService] ============================================", e);
            throw new RuntimeException("LLM generation failed: " + e.getMessage(), e);
        }
    }

    /**
     * Generate response based on context and user input (legacy method)
     * 
     * @param context Conversation history and context
     * @param userInput Current user message
     * @return Assistant's response
     */
    public String generateResponse(String context, String userInput) {
        // TODO: Implement actual LLM integration
        
        try {
            String systemPrompt = buildSystemPrompt();
            String fullPrompt = systemPrompt + "\n\nContext:\n" + context + "\n\nUser: " + userInput + "\n\nAssistant:";
            
            return llmClient.generate(fullPrompt, llmConfig.getMaxTokens(), llmConfig.getTemperature());
        } catch (Exception e) {
            throw new RuntimeException("LLM generation failed", e);
        }
    }

    /**
     * Build system prompt for the assistant
     */
    private String buildSystemPrompt() {
        return """
            You are a helpful AI phone assistant. Provide clear, concise responses.
            Keep answers brief and natural for voice conversation.
            If you don't know something, say so politely.
            """;
    }
}
