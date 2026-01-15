package com.ai.va.model;

import java.util.ArrayList;
import java.util.List;

/**
 * Session State Model
 * Maintains the state of an active voice session
 */
public class SessionState {
    
    private String callId;
    private String customerId;
    private String customerIndustry;
    private String tenantId;
    private String productId;
    private ChannelType channel; // VOICE or CHAT
    private long startTime;
    private List<Turn> transcript;
    private String currentIntent;
    private VoiceSettings voiceSettings;
    private SystemInstructions systemInstructions;
    private SlotValues slotValues;
    private RagConfiguration ragConfiguration;
    private PromptContext promptContext;
    private ChannelConfiguration channelConfiguration;
    private String businessContext;

    public SessionState() {
        this.transcript = new ArrayList<>();
        this.startTime = System.currentTimeMillis();
        this.slotValues = new SlotValues();
    }

    public SessionState(String callId) {
        this();
        this.callId = callId;
        this.voiceSettings = new VoiceSettings(); // Default voice settings
        this.systemInstructions = new SystemInstructions(); // Default instructions
        this.channel = ChannelType.VOICE; // Default to voice
    }

    public SessionState(String callId, ChannelType channel) {
        this();
        this.callId = callId;
        this.channel = channel;
        this.systemInstructions = new SystemInstructions();
        if (channel == ChannelType.VOICE) {
            this.voiceSettings = new VoiceSettings();
        }
    }

    public void addTurn(Turn turn) {
        this.transcript.add(turn);
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

    public long getStartTime() {
        return startTime;
    }

    public void setStartTime(long startTime) {
        this.startTime = startTime;
    }

    public List<Turn> getTranscript() {
        return transcript;
    }

    public void setTranscript(List<Turn> transcript) {
        this.transcript = transcript;
    }

    public String getCurrentIntent() {
        return currentIntent;
    }

    public void setCurrentIntent(String currentIntent) {
        this.currentIntent = currentIntent;
    }

    public String getCustomerIndustry() {
        return customerIndustry;
    }

    public void setCustomerIndustry(String customerIndustry) {
        this.customerIndustry = customerIndustry;
    }

    public ChannelType getChannel() {
        return channel;
    }

    public void setChannel(ChannelType channel) {
        this.channel = channel;
    }

    /**
     * Get recent turns for context (last N turns)
     */
    public List<Turn> getRecentTurns(int count) {
        if (transcript == null || transcript.isEmpty()) {
            return new ArrayList<>();
        }
        int startIdx = Math.max(0, transcript.size() - count);
        return new ArrayList<>(transcript.subList(startIdx, transcript.size()));
    }

    public VoiceSettings getVoiceSettings() {
        return voiceSettings;
    }

    public void setVoiceSettings(VoiceSettings voiceSettings) {
        this.voiceSettings = voiceSettings;
    }

    public SystemInstructions getSystemInstructions() {
        return systemInstructions;
    }

    public void setSystemInstructions(SystemInstructions systemInstructions) {
        this.systemInstructions = systemInstructions;
    }

    public SlotValues getSlotValues() {
        return slotValues;
    }

    public void setSlotValues(SlotValues slotValues) {
        this.slotValues = slotValues;
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

    public RagConfiguration getRagConfiguration() {
        return ragConfiguration;
    }

    public void setRagConfiguration(RagConfiguration ragConfiguration) {
        this.ragConfiguration = ragConfiguration;
    }

    public PromptContext getPromptContext() {
        return promptContext;
    }

    public void setPromptContext(PromptContext promptContext) {
        this.promptContext = promptContext;
    }

    public ChannelConfiguration getChannelConfiguration() {
        return channelConfiguration;
    }

    public void setChannelConfiguration(ChannelConfiguration channelConfiguration) {
        this.channelConfiguration = channelConfiguration;
        
        // Auto-populate RAG and prompt context from channel config
        if (channelConfiguration != null) {
            if (channelConfiguration.getRagConfig() != null) {
                this.ragConfiguration = channelConfiguration.getRagConfig();
            }
            if (channelConfiguration.getPromptContext() != null) {
                this.promptContext = channelConfiguration.getPromptContext();
            }
        }
    }

    public String getBusinessContext() {
        return businessContext;
    }

    public void setBusinessContext(String businessContext) {
        this.businessContext = businessContext;
    }

    public int getTurnCount() {
        return transcript != null ? transcript.size() : 0;
    }

    @Override
    public String toString() {
        return "SessionState{" +
                "callId='" + callId + '\'' +
                ", customerId='" + customerId + '\'' +
                ", channel=" + channel +
                ", startTime=" + startTime +
                ", turnCount=" + getTurnCount() +
                ", currentIntent='" + currentIntent + '\'' +
                ", slotCount=" + (slotValues != null ? slotValues.size() : 0) +
                '}';
    }
}
