package com.ai.va.model;

/**
 * Voice Session Request Model
 * Request to initialize a new voice session
 */
public class VoiceSessionRequest {
    
    private String callId;
    private String customerId;
    private String tenantId;
    private String productId;

    public VoiceSessionRequest() {
    }

    public VoiceSessionRequest(String callId, String customerId) {
        this.callId = callId;
        this.customerId = customerId;
    }

    public VoiceSessionRequest(String callId, String customerId, String tenantId, String productId) {
        this.callId = callId;
        this.customerId = customerId;
        this.tenantId = tenantId;
        this.productId = productId;
    }

    public String getCallId() {
        return callId;
    }

    public void setCallId(String callId) {
        this.callId = callId;
    }

    public String getCustomerId() {
        return customerId;
    }

    public void setCustomerId(String customerId) {
        this.customerId = customerId;
    }

    public String getTenantId() {
        return tenantId;
    }

    public void setTenantId(String tenantId) {
        this.tenantId = tenantId;
    }

    public String getProductId() {
        return productId;
    }

    public void setProductId(String productId) {
        this.productId = productId;
    }

    @Override
    public String toString() {
        return "VoiceSessionRequest{" +
                "callId='" + callId + '\'' +
                ", customerId='" + customerId + '\'' +
                ", tenantId='" + tenantId + '\'' +
                ", productId='" + productId + '\'' +
                '}';
    }
}
