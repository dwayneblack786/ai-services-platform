package com.ai.va.agent;

import java.util.List;

/**
 * Response from the AI Agent
 */
public class AgentResponse {
    private String sessionId;
    private String message;
    private List<String> toolsUsed;
    private Integer tokensUsed;
    private Long executionTimeMs;
    
    public static Builder builder() {
        return new Builder();
    }
    
    public static class Builder {
        private String sessionId;
        private String message;
        private List<String> toolsUsed;
        private Integer tokensUsed;
        private Long executionTimeMs;
        
        public Builder sessionId(String sessionId) {
            this.sessionId = sessionId;
            return this;
        }
        
        public Builder message(String message) {
            this.message = message;
            return this;
        }
        
        public Builder toolsUsed(List<String> toolsUsed) {
            this.toolsUsed = toolsUsed;
            return this;
        }
        
        public Builder tokensUsed(Integer tokensUsed) {
            this.tokensUsed = tokensUsed;
            return this;
        }
        
        public Builder executionTimeMs(Long executionTimeMs) {
            this.executionTimeMs = executionTimeMs;
            return this;
        }
        
        public AgentResponse build() {
            AgentResponse response = new AgentResponse();
            response.sessionId = this.sessionId;
            response.message = this.message;
            response.toolsUsed = this.toolsUsed;
            response.tokensUsed = this.tokensUsed;
            response.executionTimeMs = this.executionTimeMs;
            return response;
        }
    }
    
    // Getters and Setters
    public String getSessionId() { return sessionId; }
    public void setSessionId(String sessionId) { this.sessionId = sessionId; }
    
    public String getMessage() { return message; }
    public void setMessage(String message) { this.message = message; }
    
    public List<String> getToolsUsed() { return toolsUsed; }
    public void setToolsUsed(List<String> toolsUsed) { this.toolsUsed = toolsUsed; }
    
    public Integer getTokensUsed() { return tokensUsed; }
    public void setTokensUsed(Integer tokensUsed) { this.tokensUsed = tokensUsed; }
    
    public Long getExecutionTimeMs() { return executionTimeMs; }
    public void setExecutionTimeMs(Long executionTimeMs) { this.executionTimeMs = executionTimeMs; }
}
