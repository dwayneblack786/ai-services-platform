package com.ai.va.model;

/**
 * Voice Settings Model
 * Configuration for TTS voice synthesis
 */
public class VoiceSettings {
    
    private String voiceId;
    private String language;
    private double speechRate;
    private double pitch;
    private String audioEncoding;

    public VoiceSettings() {
        // Defaults
        this.voiceId = "en-US-Neural2-A";
        this.language = "en-US";
        this.speechRate = 1.0;
        this.pitch = 0.0;
        this.audioEncoding = "MP3";
    }

    public VoiceSettings(String voiceId, String language) {
        this();
        this.voiceId = voiceId;
        this.language = language;
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

    @Override
    public String toString() {
        return "VoiceSettings{" +
                "voiceId='" + voiceId + '\'' +
                ", language='" + language + '\'' +
                ", speechRate=" + speechRate +
                ", pitch=" + pitch +
                ", audioEncoding='" + audioEncoding + '\'' +
                '}';
    }
}
