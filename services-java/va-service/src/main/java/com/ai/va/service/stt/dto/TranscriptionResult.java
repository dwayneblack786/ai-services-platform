package com.ai.va.service.stt.dto;

import java.time.Instant;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.Objects;

/**
 * Data Transfer Object for Speech-to-Text transcription results.
 * 
 * Contains the transcribed text, confidence score, metadata, and optional
 * word-level timing information.
 * 
 * Immutable by design - use Builder for construction.
 * 
 * @author AI Services Platform
 * @version 1.0
 * @since 2026-01-20
 */
public class TranscriptionResult {
    
    private final String sessionId;
    private final String text;
    private final double confidence;
    private final boolean isFinal;
    private final TranscriptionMetadata metadata;
    private final List<WordTimingInfo> words;
    private final Instant timestamp;
    
    private TranscriptionResult(Builder builder) {
        this.sessionId = Objects.requireNonNull(builder.sessionId, "sessionId cannot be null");
        this.text = Objects.requireNonNull(builder.text, "text cannot be null");
        this.confidence = builder.confidence;
        this.isFinal = builder.isFinal;
        this.metadata = builder.metadata;
        this.words = builder.words != null ? 
            Collections.unmodifiableList(new ArrayList<>(builder.words)) : 
            Collections.emptyList();
        this.timestamp = builder.timestamp != null ? builder.timestamp : Instant.now();
    }
    
    // Getters
    
    public String getSessionId() {
        return sessionId;
    }
    
    public String getText() {
        return text;
    }
    
    public double getConfidence() {
        return confidence;
    }
    
    public boolean isFinal() {
        return isFinal;
    }
    
    public TranscriptionMetadata getMetadata() {
        return metadata;
    }
    
    public List<WordTimingInfo> getWords() {
        return words;
    }
    
    public Instant getTimestamp() {
        return timestamp;
    }
    
    // Helper methods
    
    public boolean hasWords() {
        return words != null && !words.isEmpty();
    }
    
    public int getWordCount() {
        return words != null ? words.size() : 0;
    }
    
    public boolean isHighConfidence() {
        return confidence >= 0.9;
    }
    
    public boolean isLowConfidence() {
        return confidence < 0.7;
    }
    
    // Builder
    
    public static Builder builder() {
        return new Builder();
    }
    
    public static Builder builder(String sessionId, String text) {
        return new Builder().sessionId(sessionId).text(text);
    }
    
    public static class Builder {
        private String sessionId;
        private String text;
        private double confidence = 1.0;
        private boolean isFinal = true;
        private TranscriptionMetadata metadata;
        private List<WordTimingInfo> words;
        private Instant timestamp;
        
        public Builder sessionId(String sessionId) {
            this.sessionId = sessionId;
            return this;
        }
        
        public Builder text(String text) {
            this.text = text;
            return this;
        }
        
        public Builder confidence(double confidence) {
            if (confidence < 0.0 || confidence > 1.0) {
                throw new IllegalArgumentException("Confidence must be between 0.0 and 1.0");
            }
            this.confidence = confidence;
            return this;
        }
        
        public Builder isFinal(boolean isFinal) {
            this.isFinal = isFinal;
            return this;
        }
        
        public Builder metadata(TranscriptionMetadata metadata) {
            this.metadata = metadata;
            return this;
        }
        
        public Builder words(List<WordTimingInfo> words) {
            this.words = words;
            return this;
        }
        
        public Builder addWord(WordTimingInfo word) {
            if (this.words == null) {
                this.words = new ArrayList<>();
            }
            this.words.add(word);
            return this;
        }
        
        public Builder timestamp(Instant timestamp) {
            this.timestamp = timestamp;
            return this;
        }
        
        public TranscriptionResult build() {
            return new TranscriptionResult(this);
        }
    }
    
    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (o == null || getClass() != o.getClass()) return false;
        TranscriptionResult that = (TranscriptionResult) o;
        return Double.compare(that.confidence, confidence) == 0 &&
               isFinal == that.isFinal &&
               Objects.equals(sessionId, that.sessionId) &&
               Objects.equals(text, that.text) &&
               Objects.equals(metadata, that.metadata) &&
               Objects.equals(words, that.words);
    }
    
    @Override
    public int hashCode() {
        return Objects.hash(sessionId, text, confidence, isFinal, metadata, words);
    }
    
    @Override
    public String toString() {
        return "TranscriptionResult{" +
               "sessionId='" + sessionId + '\'' +
               ", text='" + text + '\'' +
               ", confidence=" + confidence +
               ", isFinal=" + isFinal +
               ", wordCount=" + getWordCount() +
               ", timestamp=" + timestamp +
               '}';
    }
}
