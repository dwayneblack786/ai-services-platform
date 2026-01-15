package com.ai.va.model;

/**
 * Usage Update Request
 * Payload for updating usage metrics in Node.js backend
 */
public class UsageUpdate {
    
    private String callId;
    private String customerId;
    private int sttSeconds;
    private int ttsCharacters;
    private int llmTokensIn;
    private int llmTokensOut;
    private String provider;
    private double costEstimate;

    public UsageUpdate() {
    }

    public UsageUpdate(String callId) {
        this.callId = callId;
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

    public int getSttSeconds() {
        return sttSeconds;
    }

    public void setSttSeconds(int sttSeconds) {
        this.sttSeconds = sttSeconds;
    }

    public int getTtsCharacters() {
        return ttsCharacters;
    }

    public void setTtsCharacters(int ttsCharacters) {
        this.ttsCharacters = ttsCharacters;
    }

    public int getLlmTokensIn() {
        return llmTokensIn;
    }

    public void setLlmTokensIn(int llmTokensIn) {
        this.llmTokensIn = llmTokensIn;
    }

    public int getLlmTokensOut() {
        return llmTokensOut;
    }

    public void setLlmTokensOut(int llmTokensOut) {
        this.llmTokensOut = llmTokensOut;
    }

    public String getProvider() {
        return provider;
    }

    public void setProvider(String provider) {
        this.provider = provider;
    }

    public double getCostEstimate() {
        return costEstimate;
    }

    public void setCostEstimate(double costEstimate) {
        this.costEstimate = costEstimate;
    }

    @Override
    public String toString() {
        return "UsageUpdate{" +
                "callId='" + callId + '\'' +
                ", customerId='" + customerId + '\'' +
                ", sttSeconds=" + sttSeconds +
                ", ttsCharacters=" + ttsCharacters +
                ", llmTokensIn=" + llmTokensIn +
                ", llmTokensOut=" + llmTokensOut +
                ", provider='" + provider + '\'' +
                ", costEstimate=" + costEstimate +
                '}';
    }
}
