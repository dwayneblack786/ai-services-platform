package com.ai.va.config;

import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.context.annotation.Configuration;

/**
 * Text-to-Speech Configuration
 * 
 * Supports multiple TTS providers with provider-specific nested configuration:
 * - Azure Speech Services (azure)
 * - Google Cloud TTS (google)
 * - AWS Polly (aws)
 * - ElevenLabs (elevenlabs)
 * - Mock TTS (mock)
 * 
 * Configuration example:
 * <pre>
 * tts:
 *   provider: azure
 *   azure:
 *     subscription-key: ${AZURE_SPEECH_KEY}
 *     region: eastus
 *     voice: en-US-JennyNeural
 *     format: audio-24khz-48kbitrate-mono-mp3
 * </pre>
 */
@Configuration
@ConfigurationProperties(prefix = "tts")
public class TtsConfig {
    
    private String provider = "mock"; // azure, google, aws, elevenlabs, mock
    private Azure azure = new Azure();
    private Google google = new Google();
    private Mock mock = new Mock();
    
    // General TTS settings
    private String language = "en-US";
    private double speechRate = 1.0;
    private double pitch = 0.0;

    // ============================================================================
    // Provider-specific nested configuration classes
    // ============================================================================
    
    /**
     * Azure Speech Services Configuration
     */
    public static class Azure {
        private String subscriptionKey;
        private String region = "eastus";
        private String voice = "en-US-JennyNeural";
        private String format = "audio-24khz-48kbitrate-mono-mp3";
        private int timeoutSeconds = 30;
        private boolean enabled = true;
        
        public String getSubscriptionKey() {
            return subscriptionKey;
        }
        
        public void setSubscriptionKey(String subscriptionKey) {
            this.subscriptionKey = subscriptionKey;
        }
        
        public String getRegion() {
            return region;
        }
        
        public void setRegion(String region) {
            this.region = region;
        }
        
        public String getVoice() {
            return voice;
        }
        
        public void setVoice(String voice) {
            this.voice = voice;
        }
        
        public String getFormat() {
            return format;
        }
        
        public void setFormat(String format) {
            this.format = format;
        }
        
        public int getTimeoutSeconds() {
            return timeoutSeconds;
        }
        
        public void setTimeoutSeconds(int timeoutSeconds) {
            this.timeoutSeconds = timeoutSeconds;
        }
        
        public boolean isEnabled() {
            return enabled;
        }
        
        public void setEnabled(boolean enabled) {
            this.enabled = enabled;
        }
    }
    
    /**
     * Google Cloud TTS Configuration
     */
    public static class Google {
        private String apiKey;
        private String voiceId = "en-US-Neural2-A";
        private String audioEncoding = "MP3";
        private boolean enabled = false;
        
        public String getApiKey() {
            return apiKey;
        }
        
        public void setApiKey(String apiKey) {
            this.apiKey = apiKey;
        }
        
        public String getVoiceId() {
            return voiceId;
        }
        
        public void setVoiceId(String voiceId) {
            this.voiceId = voiceId;
        }
        
        public String getAudioEncoding() {
            return audioEncoding;
        }
        
        public void setAudioEncoding(String audioEncoding) {
            this.audioEncoding = audioEncoding;
        }
        
        public boolean isEnabled() {
            return enabled;
        }
        
        public void setEnabled(boolean enabled) {
            this.enabled = enabled;
        }
    }
    
    /**
     * Mock TTS Configuration (for testing)
     */
    public static class Mock {
        private boolean enabled = true;
        private int delayMs = 100;
        
        public boolean isEnabled() {
            return enabled;
        }
        
        public void setEnabled(boolean enabled) {
            this.enabled = enabled;
        }
        
        public int getDelayMs() {
            return delayMs;
        }
        
        public void setDelayMs(int delayMs) {
            this.delayMs = delayMs;
        }
    }
    
    // ============================================================================
    // Getters and Setters
    // ============================================================================

    public String getProvider() {
        return provider;
    }

    public void setProvider(String provider) {
        this.provider = provider;
    }

    public Azure getAzure() {
        return azure;
    }

    public void setAzure(Azure azure) {
        this.azure = azure;
    }

    public Google getGoogle() {
        return google;
    }

    public void setGoogle(Google google) {
        this.google = google;
    }

    public Mock getMock() {
        return mock;
    }

    public void setMock(Mock mock) {
        this.mock = mock;
    }

    public String getLanguage() {
        return language;
    }

    public void setLanguage(String language) {
        this.language = language;
    }

    public double getSpeechRate() {
        return speechRate;
    }

    public void setSpeechRate(double speechRate) {
        this.speechRate = speechRate;
    }

    public double getPitch() {
        return pitch;
    }

    public void setPitch(double pitch) {
        this.pitch = pitch;
    }
}
