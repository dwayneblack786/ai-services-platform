package com.ai.va.model;

import java.util.List;

/**
 * Chat Response Model
 * Response sent back to React UI containing assistant's message(s)
 * Supports multiple sequential messages for proactive follow-ups
 */
public class ChatResponse {
    
    private String sessionId;
    private String message; // Primary assistant's text response (for backward compatibility)
    private List<String> messages; // Multiple sequential messages (for proactive responses)
    private String intent; // Detected intent
    private SlotValues extractedSlots; // Extracted entities
    private boolean requiresAction; // Whether action is needed
    private String suggestedAction; // Action to take (e.g., "transfer_to_human")

    public ChatResponse() {
    }

    public ChatResponse(String sessionId, String message) {
        this.sessionId = sessionId;
        this.message = message;
    }

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

    public List<String> getMessages() {
        return messages;
    }

    public void setMessages(List<String> messages) {
        this.messages = messages;
    }

    public String getIntent() {
        return intent;
    }

    public void setIntent(String intent) {
        this.intent = intent;
    }

    public SlotValues getExtractedSlots() {
        return extractedSlots;
    }

    public void setExtractedSlots(SlotValues extractedSlots) {
        this.extractedSlots = extractedSlots;
    }

    public boolean isRequiresAction() {
        return requiresAction;
    }

    public void setRequiresAction(boolean requiresAction) {
        this.requiresAction = requiresAction;
    }

    public String getSuggestedAction() {
        return suggestedAction;
    }

    public void setSuggestedAction(String suggestedAction) {
        this.suggestedAction = suggestedAction;
    }

    @Override
    public String toString() {
        return "ChatResponse{" +
                "sessionId='" + sessionId + '\'' +
                ", message='" + message + '\'' +
                ", intent='" + intent + '\'' +
                ", requiresAction=" + requiresAction +
                ", suggestedAction='" + suggestedAction + '\'' +
                '}';
    }
}
