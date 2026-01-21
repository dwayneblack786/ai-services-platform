package com.ai.va.service.stt.config;

import com.ai.va.service.stt.SttProvider;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.context.annotation.Configuration;

/**
 * Configuration properties for STT service.
 * 
 * Binds to application.yaml properties under "stt" prefix.
 * 
 * Example configuration:
 * <pre>
 * stt:
 *   provider: whisper
 *   whisper:
 *     url: http://localhost:8000
 *     model: base
 *     timeout: 30000
 *   azure:
 *     key: ${AZURE_SPEECH_KEY}
 *     region: eastus
 *     language: en-US
 * </pre>
 * 
 * @author AI Services Platform
 * @version 1.0
 * @since 2026-01-20
 */
@Configuration
@ConfigurationProperties(prefix = "stt")
public class SttConfig {
    
    /**
     * Active STT provider (whisper, azure-speech, etc.)
     */
    private String provider = "whisper";
    
    /**
     * Whisper-specific configuration
     */
    private WhisperConfig whisper = new WhisperConfig();
    
    /**
     * Azure Speech-specific configuration
     */
    private AzureConfig azure = new AzureConfig();
    
    /**
     * Common configuration
     */
    private CommonConfig common = new CommonConfig();
    
    // Getters and setters
    
    public String getProvider() {
        return provider;
    }
    
    public void setProvider(String provider) {
        this.provider = provider;
    }
    
    public SttProvider getProviderEnum() {
        return SttProvider.fromCode(provider);
    }
    
    public WhisperConfig getWhisper() {
        return whisper;
    }
    
    public void setWhisper(WhisperConfig whisper) {
        this.whisper = whisper;
    }
    
    public AzureConfig getAzure() {
        return azure;
    }
    
    public void setAzure(AzureConfig azure) {
        this.azure = azure;
    }
    
    public CommonConfig getCommon() {
        return common;
    }
    
    public void setCommon(CommonConfig common) {
        this.common = common;
    }
    
    /**
     * Whisper configuration
     */
    public static class WhisperConfig {
        private String url = "http://localhost:8000";
        private String model = "base";
        private int timeout = 30000; // 30 seconds
        private boolean enabled = true;
        
        public String getUrl() {
            return url;
        }
        
        public void setUrl(String url) {
            this.url = url;
        }
        
        public String getModel() {
            return model;
        }
        
        public void setModel(String model) {
            this.model = model;
        }
        
        public int getTimeout() {
            return timeout;
        }
        
        public void setTimeout(int timeout) {
            this.timeout = timeout;
        }
        
        public boolean isEnabled() {
            return enabled;
        }
        
        public void setEnabled(boolean enabled) {
            this.enabled = enabled;
        }
    }
    
    /**
     * Azure Speech configuration
     */
    public static class AzureConfig {
        private String key;
        private String region = "eastus";
        private String language = "en-US";
        private int timeout = 30000;
        private boolean enabled = true;
        
        public String getKey() {
            return key;
        }
        
        public void setKey(String key) {
            this.key = key;
        }
        
        public String getRegion() {
            return region;
        }
        
        public void setRegion(String region) {
            this.region = region;
        }
        
        public String getLanguage() {
            return language;
        }
        
        public void setLanguage(String language) {
            this.language = language;
        }
        
        public int getTimeout() {
            return timeout;
        }
        
        public void setTimeout(int timeout) {
            this.timeout = timeout;
        }
        
        public boolean isEnabled() {
            return enabled;
        }
        
        public void setEnabled(boolean enabled) {
            this.enabled = enabled;
        }
    }
    
    /**
     * Common STT configuration
     */
    public static class CommonConfig {
        private long maxAudioSizeBytes = 25 * 1024 * 1024; // 25MB
        private int maxAudioDurationSeconds = 300; // 5 minutes
        private boolean enableWordTimings = true;
        private int retryAttempts = 3;
        private long retryDelayMs = 1000;
        
        public long getMaxAudioSizeBytes() {
            return maxAudioSizeBytes;
        }
        
        public void setMaxAudioSizeBytes(long maxAudioSizeBytes) {
            this.maxAudioSizeBytes = maxAudioSizeBytes;
        }
        
        public int getMaxAudioDurationSeconds() {
            return maxAudioDurationSeconds;
        }
        
        public void setMaxAudioDurationSeconds(int maxAudioDurationSeconds) {
            this.maxAudioDurationSeconds = maxAudioDurationSeconds;
        }
        
        public boolean isEnableWordTimings() {
            return enableWordTimings;
        }
        
        public void setEnableWordTimings(boolean enableWordTimings) {
            this.enableWordTimings = enableWordTimings;
        }
        
        public int getRetryAttempts() {
            return retryAttempts;
        }
        
        public void setRetryAttempts(int retryAttempts) {
            this.retryAttempts = retryAttempts;
        }
        
        public long getRetryDelayMs() {
            return retryDelayMs;
        }
        
        public void setRetryDelayMs(long retryDelayMs) {
            this.retryDelayMs = retryDelayMs;
        }
    }
}
