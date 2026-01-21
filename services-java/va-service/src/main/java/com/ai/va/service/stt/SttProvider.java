package com.ai.va.service.stt;

/**
 * Enumeration of supported STT providers.
 * 
 * @author AI Services Platform
 * @version 1.0
 * @since 2026-01-20
 */
public enum SttProvider {
    
    /**
     * OpenAI Whisper - Local development
     * Self-hosted Python server for cost-effective local testing
     */
    WHISPER("whisper", "Whisper (Local)", true),
    
    /**
     * Azure Cognitive Services Speech-to-Text - Production
     * Cloud-based STT with high accuracy and scalability
     */
    AZURE_SPEECH("azure-speech", "Azure Speech", false),
    
    /**
     * Google Cloud Speech-to-Text - Alternative
     * Cloud-based STT with multilingual support
     */
    GOOGLE_SPEECH("google-speech", "Google Speech", false),
    
    /**
     * Amazon Transcribe - Alternative
     * Cloud-based STT from AWS
     */
    AWS_TRANSCRIBE("aws-transcribe", "AWS Transcribe", false);
    
    private final String code;
    private final String displayName;
    private final boolean selfHosted;
    
    SttProvider(String code, String displayName, boolean selfHosted) {
        this.code = code;
        this.displayName = displayName;
        this.selfHosted = selfHosted;
    }
    
    public String getCode() {
        return code;
    }
    
    public String getDisplayName() {
        return displayName;
    }
    
    public boolean isSelfHosted() {
        return selfHosted;
    }
    
    public boolean isCloudBased() {
        return !selfHosted;
    }
    
    /**
     * Get provider by code.
     * 
     * @param code Provider code (e.g., "whisper", "azure-speech")
     * @return SttProvider or null if not found
     */
    public static SttProvider fromCode(String code) {
        if (code == null) {
            return null;
        }
        for (SttProvider provider : values()) {
            if (provider.code.equalsIgnoreCase(code)) {
                return provider;
            }
        }
        return null;
    }
    
    @Override
    public String toString() {
        return displayName;
    }
}
