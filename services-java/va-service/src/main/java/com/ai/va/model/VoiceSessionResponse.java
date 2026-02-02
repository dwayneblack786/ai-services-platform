package com.ai.va.model;

/**
 * Voice Session Response Model
 * Response from session initialization with optional greeting
 */
public class VoiceSessionResponse {
    
    private String sessionId;
    private String status;
    private String message;
    private String greetingText;      // Text greeting for UI display/transcript
    private String greetingAudio;     // Base64 encoded audio greeting

    public VoiceSessionResponse() {
    }

    public VoiceSessionResponse(String sessionId) {
        this.sessionId = sessionId;
        this.status = "initialized";
        this.message = "Session started successfully";
    }

    public VoiceSessionResponse(String sessionId, String greetingText, String greetingAudio) {
        this.sessionId = sessionId;
        this.status = "initialized";
        this.message = "Session started with greeting";
        this.greetingText = greetingText;
        this.greetingAudio = greetingAudio;
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

    public String getGreetingText() {
        return greetingText;
    }

    public void setGreetingText(String greetingText) {
        this.greetingText = greetingText;
    }

    public String getGreetingAudio() {
        return greetingAudio;
    }

    public void setGreetingAudio(String greetingAudio) {
        this.greetingAudio = greetingAudio;
    }

    @Override
    public String toString() {
        return "VoiceSessionResponse{" +
                "sessionId='" + sessionId + '\'' +
                ", status='" + status + '\'' +
                ", message='" + message + '\'' +
                ", greetingText='" + (greetingText != null ? greetingText.substring(0, Math.min(50, greetingText.length())) + "..." : "null") + '\'' +
                ", greetingAudio=" + (greetingAudio != null ? "[" + greetingAudio.length() + " chars]" : "null") +
                '}';
    }
}
