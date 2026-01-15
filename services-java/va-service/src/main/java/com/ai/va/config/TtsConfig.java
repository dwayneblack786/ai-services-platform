package com.ai.va.config;

import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.context.annotation.Configuration;

/**
 * Text-to-Speech Configuration
 */
@Configuration
@ConfigurationProperties(prefix = "tts")
public class TtsConfig {
    
    private String provider = "google"; // google, aws, azure, elevenlabs
    private String apiKey;
    private String voiceId = "en-US-Neural2-A";
    private String language = "en-US";
    private double speechRate = 1.0;
    private double pitch = 0.0;
    private String audioEncoding = "MP3";

    public String getProvider() {
        return provider;
    }

    public void setProvider(String provider) {
        this.provider = provider;
    }

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

    public String getAudioEncoding() {
        return audioEncoding;
    }

    public void setAudioEncoding(String audioEncoding) {
        this.audioEncoding = audioEncoding;
    }
}
