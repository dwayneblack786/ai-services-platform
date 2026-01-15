package com.ai.va.model;

import java.util.HashMap;
import java.util.Map;

/**
 * System Instructions Model
 * Configuration for assistant behavior and prompts
 */
public class SystemInstructions {
    
    private String industry;
    private String tone;
    private String[] allowedActions;
    private String customInstructions;
    private Map<String, String> additionalContext;

    public SystemInstructions() {
        this.industry = "General Business";
        this.tone = "professional and friendly";
        this.allowedActions = new String[]{
            "answer questions",
            "schedule appointments",
            "provide information",
            "transfer to human"
        };
        this.additionalContext = new HashMap<>();
    }

    public SystemInstructions(String industry) {
        this();
        this.industry = industry;
    }

    public String buildSystemPrompt() {
        StringBuilder sb = new StringBuilder();
        
        sb.append("You are a helpful phone assistant");
        if (industry != null && !industry.isEmpty()) {
            sb.append(" for ").append(industry);
        }
        sb.append(".\n\n");
        
        sb.append("Tone: Be ").append(tone).append(".\n");
        sb.append("Keep your responses brief and natural for voice conversation.\n");
        sb.append("Speak clearly and avoid jargon.\n\n");
        
        if (allowedActions != null && allowedActions.length > 0) {
            sb.append("You can help with:\n");
            for (String action : allowedActions) {
                sb.append("- ").append(action).append("\n");
            }
            sb.append("\n");
        }
        
        if (customInstructions != null && !customInstructions.isEmpty()) {
            sb.append(customInstructions).append("\n\n");
        }
        
        sb.append("If you don't know something, politely say so and offer to transfer to a human.\n");
        
        return sb.toString();
    }

    // Getters and setters
    public String getIndustry() {
        return industry;
    }

    public void setIndustry(String industry) {
        this.industry = industry;
    }

    public String getTone() {
        return tone;
    }

    public void setTone(String tone) {
        this.tone = tone;
    }

    public String[] getAllowedActions() {
        return allowedActions;
    }

    public void setAllowedActions(String[] allowedActions) {
        this.allowedActions = allowedActions;
    }

    public String getCustomInstructions() {
        return customInstructions;
    }

    public void setCustomInstructions(String customInstructions) {
        this.customInstructions = customInstructions;
    }

    public Map<String, String> getAdditionalContext() {
        return additionalContext;
    }

    public void setAdditionalContext(Map<String, String> additionalContext) {
        this.additionalContext = additionalContext;
    }

    public void addContext(String key, String value) {
        this.additionalContext.put(key, value);
    }

    public void setBaseInstruction(String instruction) {
        this.customInstructions = instruction;
    }

    public void setGreeting(String greeting) {
        this.addContext("greeting", greeting);
    }
}
