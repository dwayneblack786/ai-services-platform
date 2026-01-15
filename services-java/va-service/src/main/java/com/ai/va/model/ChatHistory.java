package com.ai.va.model;

import java.util.ArrayList;
import java.util.Date;
import java.util.List;

import org.bson.types.ObjectId;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;

/**
 * Represents a complete chat conversation history stored in MongoDB
 */
@JsonIgnoreProperties(ignoreUnknown = true)
public class ChatHistory {
    private ObjectId _id;
    private String sessionId;
    private String customerId;
    private String productId;
    private List<ChatMessage> messages;
    private Date startedAt;
    private Date lastUpdatedAt;
    private Date endedAt;
    private boolean isActive;
    
    public ChatHistory() {
        this.messages = new ArrayList<>();
        this.startedAt = new Date();
        this.lastUpdatedAt = new Date();
        this.isActive = true;
    }
    
    public ChatHistory(String sessionId, String customerId, String productId) {
        this.sessionId = sessionId;
        this.customerId = customerId;
        this.productId = productId;
        this.messages = new ArrayList<>();
        this.startedAt = new Date();
        this.lastUpdatedAt = new Date();
        this.isActive = true;
    }
    
    public void addMessage(ChatMessage message) {
        this.messages.add(message);
        this.lastUpdatedAt = new Date();
    }
    
    // Getters and Setters
    public ObjectId get_id() {
        return _id;
    }
    
    public void set_id(ObjectId _id) {
        this._id = _id;
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
    
    public String getProductId() {
        return productId;
    }
    
    public void setProductId(String productId) {
        this.productId = productId;
    }
    
    public List<ChatMessage> getMessages() {
        return messages;
    }
    
    public void setMessages(List<ChatMessage> messages) {
        this.messages = messages;
    }
    
    public Date getStartedAt() {
        return startedAt;
    }
    
    public void setStartedAt(Date startedAt) {
        this.startedAt = startedAt;
    }
    
    public Date getLastUpdatedAt() {
        return lastUpdatedAt;
    }
    
    public void setLastUpdatedAt(Date lastUpdatedAt) {
        this.lastUpdatedAt = lastUpdatedAt;
    }
    
    public Date getEndedAt() {
        return endedAt;
    }
    
    public void setEndedAt(Date endedAt) {
        this.endedAt = endedAt;
    }
    
    public boolean isActive() {
        return isActive;
    }
    
    public void setActive(boolean active) {
        isActive = active;
    }
}
