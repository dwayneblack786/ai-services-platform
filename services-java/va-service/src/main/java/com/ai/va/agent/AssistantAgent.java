package com.ai.va.agent;

import com.ai.va.client.LlmClient;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Map;

/**
 * AI Agent for Voice and Chat Assistance
 * 
 * This agent orchestrates tools and LLM calls to handle:
 * - Multi-step conversations
 * - Tool selection and execution
 * - Context management
 * - Response generation
 */
@Service
public class AssistantAgent {
    
    private static final Logger logger = LoggerFactory.getLogger(AssistantAgent.class);
    
    @Autowired
    private LlmClient llmClient;
    
    @Autowired
    private AgentMemory memory;
    
    /**
     * Execute a user request using available tools
     * 
     * @param sessionId User session ID
     * @param message User message
     * @param context Additional context (user info, preferences, etc.)
     * @return Agent response with tool usage details
     */
    public AgentResponse execute(String sessionId, String message, Map<String, Object> context) {
        // Retrieve conversation history
        List<String> history = memory.getHistory(sessionId);
        
        // Add user message to history
        memory.addToHistory(sessionId, "User: " + message);
        
        // Build system prompt with context and history
        String systemPrompt = buildSystemPrompt(context);
        String fullPrompt = buildUserPrompt(history, message);
        
        // Log prompts for debugging/comparison with LM Studio
        logger.info("=== AGENT PROMPT DEBUG ===");
        logger.info("Session: {}", sessionId);
        logger.info("System Prompt:\n{}", systemPrompt);
        logger.info("User Prompt:\n{}", fullPrompt);
        logger.info("Model: google/gemma-2-9b | Temperature: 0.8 | MaxTokens: 4000");
        logger.info("========================");
        
        // Call LLM
        String responseContent;
        try {
            // Use higher temperature for more natural, conversational responses
            responseContent = llmClient.getChatCompletion(systemPrompt, fullPrompt, 0.8, "google/gemma-2-9b", 4000);
            logger.info("=== LLM RESPONSE ===\n{}\n===================", responseContent);
        } catch (Exception e) {
            logger.error("Error calling LLM: {}", e.getMessage(), e);
            responseContent = "I apologize, but I'm experiencing technical difficulties. Please try again.";
        }
        
        // Save assistant response to history
        memory.addToHistory(sessionId, "Assistant: " + responseContent);
        
        return AgentResponse.builder()
            .sessionId(sessionId)
            .message(responseContent)
            .toolsUsed(List.of()) // Tool tracking to be added
            .tokensUsed(null) // Token tracking to be added
            .build();
    }
    
    /**
     * Build system prompt with context
     */
    private String buildSystemPrompt(Map<String, Object> context) {
        StringBuilder prompt = new StringBuilder();
        prompt.append("You are a friendly and helpful AI assistant. Your goal is to have natural, engaging conversations.\n\n");
        
        prompt.append("CRITICAL INSTRUCTIONS:\n");
        prompt.append("1. When a user asks multiple questions, you MUST answer EVERY single question thoroughly.\n");
        prompt.append("2. Address each question in the order they were asked.\n");
        prompt.append("3. Use clear numbering (1., 2., 3., etc.) if there are multiple questions.\n");
        prompt.append("4. Never skip or ignore any question - if you can't answer something, explain why.\n");
        prompt.append("5. Be conversational, warm, and personable in your responses.\n\n");
        
        prompt.append("EXAMPLE - If user asks:\n");
        prompt.append("\"1. Hello, how are you?\n");
        prompt.append("2. What can you help with?\n");
        prompt.append("3. Tell me about services\"\n\n");
        prompt.append("You MUST respond with:\n");
        prompt.append("\"Hello! I'm doing great, thank you for asking! I'm here to help you today.\n\n");
        prompt.append("I can help you with many things including:\n");
        prompt.append("- Answering questions and providing information\n");
        prompt.append("- Looking up orders and customer information\n");
        prompt.append("- Scheduling appointments\n");
        prompt.append("- And much more!\n\n");
        prompt.append("As for our services, we offer [describe services]...\"\n\n");
        
        prompt.append("Available capabilities:\n");
        prompt.append("- Looking up information\n");
        prompt.append("- Processing orders\n");
        prompt.append("- Scheduling appointments\n");
        prompt.append("- Answering questions\n\n");
        
        if (context != null && !context.isEmpty()) {
            prompt.append("User context: ").append(context.toString()).append("\n\n");
        }
        
        prompt.append("Remember: Be thorough, conversational, and answer EVERYTHING the user asks!");
        
        return prompt.toString();
    }
    
    /**
     * Build user prompt with history and current message
     */
    private String buildUserPrompt(List<String> history, String currentMessage) {
        StringBuilder prompt = new StringBuilder();
        
        // Add recent history (last 5 messages)
        int historyStart = Math.max(0, history.size() - 5);
        if (historyStart < history.size()) {
            prompt.append("Recent conversation:\n");
            for (int i = historyStart; i < history.size(); i++) {
                prompt.append(history.get(i)).append("\n");
            }
            prompt.append("\n");
        }
        
        // Current message
        prompt.append(currentMessage);
        
        return prompt.toString();
    }
    
    /**
     * Clear session memory
     */
    public void clearSession(String sessionId) {
        memory.clearHistory(sessionId);
    }
    
    /**
     * Get prompt debug information for comparison with LM Studio
     * Returns the exact system prompt and user prompt that would be sent
     */
    public Map<String, Object> getPromptDebugInfo(String sessionId, String message, Map<String, Object> context) {
        List<String> history = memory.getHistory(sessionId);
        String systemPrompt = buildSystemPrompt(context);
        String userPrompt = buildUserPrompt(history, message);
        
        return Map.of(
            "sessionId", sessionId,
            "systemPrompt", systemPrompt,
            "userPrompt", userPrompt,
            "historySize", history.size(),
            "model", "google/gemma-2-9b",
            "temperature", 0.8,
            "maxTokens", 4000,
            "lmStudioEndpoint", "http://localhost:1234/v1/chat/completions"
        );
    }
}
