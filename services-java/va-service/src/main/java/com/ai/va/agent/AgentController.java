package com.ai.va.agent;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

/**
 * REST Controller for the AI Assistant Agent
 * 
 * Exposes endpoints for executing the agent and managing sessions.
 */
@RestController
@RequestMapping("/agent")
public class AgentController {
    
    @Autowired
    private AssistantAgent agent;
    
    /**
     * Execute the agent with a user message
     * 
     * @param request Agent execution request
     * @return Agent response with message, tools used, and metrics
     */
    @PostMapping("/execute")
    public ResponseEntity<AgentResponse> execute(@RequestBody AgentRequest request) {
        long startTime = System.currentTimeMillis();
        
        try {
            AgentResponse response = agent.execute(
                request.getSessionId(),
                request.getMessage(),
                request.getContext()
            );
            
            // Add execution time
            long executionTime = System.currentTimeMillis() - startTime;
            response.setExecutionTimeMs(executionTime);
            
            return ResponseEntity.ok(response);
            
        } catch (Exception e) {
            return ResponseEntity.status(500).body(
                AgentResponse.builder()
                    .sessionId(request.getSessionId())
                    .message("I apologize, but I encountered an error processing your request. Please try again.")
                    .executionTimeMs(System.currentTimeMillis() - startTime)
                    .build()
            );
        }
    }
    
    /**
     * Clear conversation history for a session
     * 
     * @param sessionId Session identifier
     * @return Success response
     */
    @DeleteMapping("/session/{sessionId}")
    public ResponseEntity<Void> clearSession(@PathVariable String sessionId) {
        agent.clearSession(sessionId);
        return ResponseEntity.ok().build();
    }
    
    /**
     * Health check for agent service
     * 
     * @return Status response
     */
    @GetMapping("/health")
    public ResponseEntity<Map<String, String>> health() {
        return ResponseEntity.ok(Map.of(
            "status", "healthy",
            "service", "ai-assistant-agent"
        ));
    }
    
    /**
     * Debug endpoint: Preview prompts that would be sent to LLM
     * 
     * @param request Agent execution request
     * @return Prompt configuration for comparison with LM Studio
     */
    @PostMapping("/debug/prompt")
    public ResponseEntity<Map<String, Object>> debugPrompt(@RequestBody AgentRequest request) {
        try {
            Map<String, Object> promptInfo = agent.getPromptDebugInfo(
                request.getSessionId(),
                request.getMessage(),
                request.getContext()
            );
            
            return ResponseEntity.ok(promptInfo);
            
        } catch (Exception e) {
            return ResponseEntity.status(500).body(Map.of(
                "error", e.getMessage()
            ));
        }
    }
}

/**
 * Request model for agent execution
 */
class AgentRequest {
    private String sessionId;
    private String message;
    private Map<String, Object> context;
    
    // Getters and Setters
    public String getSessionId() {
        return sessionId;
    }
    
    public void setSessionId(String sessionId) {
        this.sessionId = sessionId;
    }
    
    public String getMessage() {
        return message;
    }
    
    public void setMessage(String message) {
        this.message = message;
    }
    
    public Map<String, Object> getContext() {
        return context;
    }
    
    public void setContext(Map<String, Object> context) {
        this.context = context;
    }
}
