package com.ai.va.service.stt;

import java.util.List;

/**
 * Represents the result of a speech-to-text transcription operation.
 * Includes the transcribed text, confidence score, and optional metadata.
 */
public class TranscriptionResult {
    private final String text;
    private final float confidence;
    private final boolean isFinal;
    private final long durationMs;
    private final String language;
    private final String provider;
    private final long processingTimeMs;
    private final List<WordTimestamp> wordTimestamps;

    private TranscriptionResult(Builder builder) {
        this.text = builder.text;
        this.confidence = builder.confidence;
        this.isFinal = builder.isFinal;
        this.durationMs = builder.durationMs;
        this.language = builder.language;
        this.provider = builder.provider;
        this.processingTimeMs = builder.processingTimeMs;
        this.wordTimestamps = builder.wordTimestamps;
    }

    // Getters
    public String getText() {
        return text;
    }

    public float getConfidence() {
        return confidence;
    }

    public boolean isFinal() {
        return isFinal;
    }

    public long getDurationMs() {
        return durationMs;
    }

    public String getLanguage() {
        return language;
    }

    public String getProvider() {
        return provider;
    }

    public long getProcessingTimeMs() {
        return processingTimeMs;
    }

    public List<WordTimestamp> getWordTimestamps() {
        return wordTimestamps;
    }

    public static Builder builder() {
        return new Builder();
    }

    public static class Builder {
        private String text;
        private float confidence = 1.0f;
        private boolean isFinal = true;
        private long durationMs;
        private String language = "en-US";
        private String provider;
        private long processingTimeMs;
        private List<WordTimestamp> wordTimestamps;

        public Builder text(String text) {
            this.text = text;
            return this;
        }

        public Builder confidence(float confidence) {
            this.confidence = confidence;
            return this;
        }

        public Builder isFinal(boolean isFinal) {
            this.isFinal = isFinal;
            return this;
        }

        public Builder durationMs(long durationMs) {
            this.durationMs = durationMs;
            return this;
        }

        public Builder language(String language) {
            this.language = language;
            return this;
        }

        public Builder provider(String provider) {
            this.provider = provider;
            return this;
        }

        public Builder processingTimeMs(long processingTimeMs) {
            this.processingTimeMs = processingTimeMs;
            return this;
        }

        public Builder wordTimestamps(List<WordTimestamp> wordTimestamps) {
            this.wordTimestamps = wordTimestamps;
            return this;
        }

        public TranscriptionResult build() {
            if (text == null || text.trim().isEmpty()) {
                throw new IllegalArgumentException("Transcription text cannot be null or empty");
            }
            if (provider == null || provider.trim().isEmpty()) {
                throw new IllegalArgumentException("Provider must be specified");
            }
            return new TranscriptionResult(this);
        }
    }

    @Override
    public String toString() {
        return "TranscriptionResult{" +
                "text='" + text + '\'' +
                ", confidence=" + confidence +
                ", isFinal=" + isFinal +
                ", durationMs=" + durationMs +
                ", language='" + language + '\'' +
                ", provider='" + provider + '\'' +
                ", processingTimeMs=" + processingTimeMs +
                ", wordTimestamps=" + (wordTimestamps != null ? wordTimestamps.size() : 0) + " words" +
                '}';
    }
}
