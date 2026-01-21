package com.ai.va.service.stt.dto;

import java.util.Objects;

/**
 * Metadata for transcription results.
 * 
 * Contains information about the transcription process including:
 * - Language detected/used
 * - Audio duration
 * - Provider and model information
 * - Streaming vs batch mode
 * 
 * @author AI Services Platform
 * @version 1.0
 * @since 2026-01-20
 */
public class TranscriptionMetadata {
    
    private final String language;
    private final float durationSeconds;
    private final int wordCount;
    private final String provider;
    private final String model;
    private final boolean streaming;
    private final String audioFormat;
    private final Integer sampleRate;
    private final Integer channels;
    
    private TranscriptionMetadata(Builder builder) {
        this.language = builder.language;
        this.durationSeconds = builder.durationSeconds;
        this.wordCount = builder.wordCount;
        this.provider = builder.provider;
        this.model = builder.model;
        this.streaming = builder.streaming;
        this.audioFormat = builder.audioFormat;
        this.sampleRate = builder.sampleRate;
        this.channels = builder.channels;
    }
    
    // Getters
    
    public String getLanguage() {
        return language;
    }
    
    public float getDurationSeconds() {
        return durationSeconds;
    }
    
    public int getWordCount() {
        return wordCount;
    }
    
    public String getProvider() {
        return provider;
    }
    
    public String getModel() {
        return model;
    }
    
    public boolean isStreaming() {
        return streaming;
    }
    
    public String getAudioFormat() {
        return audioFormat;
    }
    
    public Integer getSampleRate() {
        return sampleRate;
    }
    
    public Integer getChannels() {
        return channels;
    }
    
    // Builder
    
    public static Builder builder() {
        return new Builder();
    }
    
    public static class Builder {
        private String language = "en-US";
        private float durationSeconds = 0.0f;
        private int wordCount = 0;
        private String provider;
        private String model;
        private boolean streaming = false;
        private String audioFormat;
        private Integer sampleRate;
        private Integer channels;
        
        public Builder language(String language) {
            this.language = language;
            return this;
        }
        
        public Builder durationSeconds(float durationSeconds) {
            this.durationSeconds = durationSeconds;
            return this;
        }
        
        public Builder wordCount(int wordCount) {
            this.wordCount = wordCount;
            return this;
        }
        
        public Builder provider(String provider) {
            this.provider = provider;
            return this;
        }
        
        public Builder model(String model) {
            this.model = model;
            return this;
        }
        
        public Builder streaming(boolean streaming) {
            this.streaming = streaming;
            return this;
        }
        
        public Builder audioFormat(String audioFormat) {
            this.audioFormat = audioFormat;
            return this;
        }
        
        public Builder sampleRate(Integer sampleRate) {
            this.sampleRate = sampleRate;
            return this;
        }
        
        public Builder channels(Integer channels) {
            this.channels = channels;
            return this;
        }
        
        public TranscriptionMetadata build() {
            return new TranscriptionMetadata(this);
        }
    }
    
    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (o == null || getClass() != o.getClass()) return false;
        TranscriptionMetadata that = (TranscriptionMetadata) o;
        return Float.compare(that.durationSeconds, durationSeconds) == 0 &&
               wordCount == that.wordCount &&
               streaming == that.streaming &&
               Objects.equals(language, that.language) &&
               Objects.equals(provider, that.provider) &&
               Objects.equals(model, that.model);
    }
    
    @Override
    public int hashCode() {
        return Objects.hash(language, durationSeconds, wordCount, provider, model, streaming);
    }
    
    @Override
    public String toString() {
        return "TranscriptionMetadata{" +
               "language='" + language + '\'' +
               ", duration=" + durationSeconds + "s" +
               ", wordCount=" + wordCount +
               ", provider='" + provider + '\'' +
               ", model='" + model + '\'' +
               ", streaming=" + streaming +
               ", format='" + audioFormat + '\'' +
               ", sampleRate=" + sampleRate +
               ", channels=" + channels +
               '}';
    }
}
