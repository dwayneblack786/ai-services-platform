package com.ai.va.model;

/**
 * Chat Request Model
 * Incoming request from React UI containing text message
 */
public class ChatRequest {
    
    private String sessionId;
    private String customerId;
    private String message; // User's text message

    public ChatRequest() {
    }

    public ChatRequest(String sessionId, String message) {
        this.sessionId = sessionId;
        this.message = message;
    }

    public String getSessionId() {
        return sessionId;
    }

    public void setSessionId(String sessionId) {
        this.sessionId = sessionId;
    }

    public String getCustomerId() {
        return customerId;
    }

    public void setCustomerId(String customerId) {
        this.customerId = customerId;
    }

    public String getMessage() {
        return message;
    }

    public void setMessage(String message) {
        this.message = message;
    }

    @Override
    public String toString() {
        return "ChatRequest{" +
                "sessionId='" + sessionId + '\'' +
                ", customerId='" + customerId + '\'' +
                ", messageLength=" + (message != null ? message.length() : 0) +
                '}';
    }
}
