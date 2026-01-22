package com.ai.va.service.tts;

/**
 * Result object containing synthesized audio and metadata
 * 
 * Wraps the audio data along with information about the synthesis
 * including format, duration, voice used, and provider details.
 */
public class TtsResult {
    
    private final byte[] audioData;
    private final String format;
    private final String voiceName;
    private final String language;
    private final long durationMs;
    private final int sampleRate;
    private final int bitrate;
    private final String provider;
    private final boolean success;
    private final String errorMessage;
    
    private TtsResult(Builder builder) {
        this.audioData = builder.audioData;
        this.format = builder.format;
        this.voiceName = builder.voiceName;
        this.language = builder.language;
        this.durationMs = builder.durationMs;
        this.sampleRate = builder.sampleRate;
        this.bitrate = builder.bitrate;
        this.provider = builder.provider;
        this.success = builder.success;
        this.errorMessage = builder.errorMessage;
    }
    
    public byte[] getAudioData() {
        return audioData;
    }
    
    public String getFormat() {
        return format;
    }
    
    public String getVoiceName() {
        return voiceName;
    }
    
    public String getLanguage() {
        return language;
    }
    
    public long getDurationMs() {
        return durationMs;
    }
    
    public int getSampleRate() {
        return sampleRate;
    }
    
    public int getBitrate() {
        return bitrate;
    }
    
    public String getProvider() {
        return provider;
    }
    
    public boolean isSuccess() {
        return success;
    }
    
    public String getErrorMessage() {
        return errorMessage;
    }
    
    public int getAudioSizeBytes() {
        return audioData != null ? audioData.length : 0;
    }
    
    @Override
    public String toString() {
        return "TtsResult{format='%s', voice='%s', language='%s', duration=%dms, size=%d bytes, provider='%s', success=%s}".formatted(
                format, voiceName, language, durationMs, getAudioSizeBytes(), provider, success);
    }
    
    public static Builder builder() {
        return new Builder();
    }
    
    public static class Builder {
        private byte[] audioData;
        private String format = "mp3";
        private String voiceName;
        private String language;
        private long durationMs = 0;
        private int sampleRate = 16000;
        private int bitrate = 32000;
        private String provider = "Unknown";
        private boolean success = true;
        private String errorMessage;
        
        public Builder audioData(byte[] audioData) {
            this.audioData = audioData;
            return this;
        }
        
        public Builder format(String format) {
            this.format = format;
            return this;
        }
        
        public Builder voiceName(String voiceName) {
            this.voiceName = voiceName;
            return this;
        }
        
        public Builder language(String language) {
            this.language = language;
            return this;
        }
        
        public Builder durationMs(long durationMs) {
            this.durationMs = durationMs;
            return this;
        }
        
        public Builder sampleRate(int sampleRate) {
            this.sampleRate = sampleRate;
            return this;
        }
        
        public Builder bitrate(int bitrate) {
            this.bitrate = bitrate;
            return this;
        }
        
        public Builder provider(String provider) {
            this.provider = provider;
            return this;
        }
        
        public Builder success(boolean success) {
            this.success = success;
            return this;
        }
        
        public Builder errorMessage(String errorMessage) {
            this.errorMessage = errorMessage;
            this.success = false;
            return this;
        }
        
        public TtsResult build() {
            if (success && (audioData == null || audioData.length == 0)) {
                throw new IllegalStateException("Audio data is required for successful result");
            }
            return new TtsResult(this);
        }
    }
    
    /**
     * Create a failure result with error message
     */
    public static TtsResult failure(String errorMessage, String provider) {
        return TtsResult.builder()
                .audioData(new byte[0])
                .errorMessage(errorMessage)
                .provider(provider)
                .build();
    }
}
