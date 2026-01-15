package com.ai.va.model;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;

/**
 * Channel Configuration
 * Holds configuration for voice or chat channel including RAG and context
 */
@JsonIgnoreProperties(ignoreUnknown = true)
public class ChannelConfiguration {
    
    private boolean enabled;
    private String greeting;
    private CustomPrompts customPrompts;
    private String promptTemplateId;
    private RagConfiguration ragConfig;
    private PromptContext promptContext;
    private VoiceSettings voiceSettings; // Only for voice channel

    public ChannelConfiguration() {
        this.enabled = false;
    }

    // Getters and Setters
    
    public boolean isEnabled() {
        return enabled;
    }

    public void setEnabled(boolean enabled) {
        this.enabled = enabled;
    }

    public String getGreeting() {
        return greeting;
    }

    public void setGreeting(String greeting) {
        this.greeting = greeting;
    }

    public CustomPrompts getCustomPrompts() {
        return customPrompts;
    }

    public void setCustomPrompts(CustomPrompts customPrompts) {
        this.customPrompts = customPrompts;
    }

    public String getPromptTemplateId() {
        return promptTemplateId;
    }

    public void setPromptTemplateId(String promptTemplateId) {
        this.promptTemplateId = promptTemplateId;
    }

    public RagConfiguration getRagConfig() {
        return ragConfig;
    }

    public void setRagConfig(RagConfiguration ragConfig) {
        this.ragConfig = ragConfig;
    }

    public PromptContext getPromptContext() {
        return promptContext;
    }

    public void setPromptContext(PromptContext promptContext) {
        this.promptContext = promptContext;
    }

    public VoiceSettings getVoiceSettings() {
        return voiceSettings;
    }

    public void setVoiceSettings(VoiceSettings voiceSettings) {
        this.voiceSettings = voiceSettings;
    }

    @Override
    public String toString() {
        return "ChannelConfiguration{" +
                "enabled=" + enabled +
                ", hasCustomPrompts=" + (customPrompts != null) +
                ", hasRagConfig=" + (ragConfig != null) +
                ", hasPromptContext=" + (promptContext != null) +
                '}';
    }
}
