package com.ai.va.model;

import java.util.Date;

/**
 * Represents a single chat message in a conversation
 */
public class ChatMessage {
    private String role;  // "user" or "assistant"
    private String content;
    private Date timestamp;
    private String intent;  // Only for assistant messages
    
    public ChatMessage() {
        this.timestamp = new Date();
    }
    
    public ChatMessage(String role, String content) {
        this.role = role;
        this.content = content;
        this.timestamp = new Date();
    }
    
    public ChatMessage(String role, String content, String intent) {
        this.role = role;
        this.content = content;
        this.intent = intent;
        this.timestamp = new Date();
    }
    
    // Getters and Setters
    public String getRole() {
        return role;
    }
    
    public void setRole(String role) {
        this.role = role;
    }
    
    public String getContent() {
        return content;
    }
    
    public void setContent(String content) {
        this.content = content;
    }
    
    public Date getTimestamp() {
        return timestamp;
    }
    
    public void setTimestamp(Date timestamp) {
        this.timestamp = timestamp;
    }
    
    public String getIntent() {
        return intent;
    }
    
    public void setIntent(String intent) {
        this.intent = intent;
    }
}
