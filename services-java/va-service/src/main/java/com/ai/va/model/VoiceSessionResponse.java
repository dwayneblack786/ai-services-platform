package com.ai.va.model;

/**
 * Voice Session Response Model
 * Response from session initialization
 */
public class VoiceSessionResponse {
    
    private String sessionId;
    private String status;
    private String message;

    public VoiceSessionResponse() {
    }

    public VoiceSessionResponse(String sessionId) {
        this.sessionId = sessionId;
        this.status = "initialized";
        this.message = "Session started successfully";
    }

    public String getSessionId() {
        return sessionId;
    }

    public void setSessionId(String sessionId) {
        this.sessionId = sessionId;
    }

    public String getStatus() {
        return status;
    }

    public void setStatus(String status) {
        this.status = status;
    }

    public String getMessage() {
        return message;
    }

    public void setMessage(String message) {
        this.message = message;
    }

    @Override
    public String toString() {
        return "VoiceSessionResponse{" +
                "sessionId='" + sessionId + '\'' +
                ", status='" + status + '\'' +
                ", message='" + message + '\'' +
                '}';
    }
}
