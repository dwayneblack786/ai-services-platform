package com.ai.va.service.stt.dto;

import java.util.Objects;

/**
 * Word-level timing and confidence information.
 * 
 * Provides detailed timing data for each word in the transcription,
 * useful for:
 * - Subtitle generation
 * - Speech analytics
 * - Word highlighting during playback
 * - Confidence analysis
 * 
 * @author AI Services Platform
 * @version 1.0
 * @since 2026-01-20
 */
public class WordTimingInfo {
    
    private final String word;
    private final float startTimeSeconds;
    private final float endTimeSeconds;
    private final float confidence;
    
    public WordTimingInfo(String word, float startTimeSeconds, float endTimeSeconds, float confidence) {
        this.word = Objects.requireNonNull(word, "word cannot be null");
        this.startTimeSeconds = startTimeSeconds;
        this.endTimeSeconds = endTimeSeconds;
        this.confidence = confidence;
        
        if (endTimeSeconds < startTimeSeconds) {
            throw new IllegalArgumentException("endTime cannot be before startTime");
        }
        if (confidence < 0.0f || confidence > 1.0f) {
            throw new IllegalArgumentException("confidence must be between 0.0 and 1.0");
        }
    }
    
    // Getters
    
    public String getWord() {
        return word;
    }
    
    public float getStartTimeSeconds() {
        return startTimeSeconds;
    }
    
    public float getEndTimeSeconds() {
        return endTimeSeconds;
    }
    
    public float getConfidence() {
        return confidence;
    }
    
    // Helper methods
    
    public float getDurationSeconds() {
        return endTimeSeconds - startTimeSeconds;
    }
    
    public boolean isHighConfidence() {
        return confidence >= 0.9f;
    }
    
    public boolean isLowConfidence() {
        return confidence < 0.7f;
    }
    
    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (o == null || getClass() != o.getClass()) return false;
        WordTimingInfo that = (WordTimingInfo) o;
        return Float.compare(that.startTimeSeconds, startTimeSeconds) == 0 &&
               Float.compare(that.endTimeSeconds, endTimeSeconds) == 0 &&
               Float.compare(that.confidence, confidence) == 0 &&
               Objects.equals(word, that.word);
    }
    
    @Override
    public int hashCode() {
        return Objects.hash(word, startTimeSeconds, endTimeSeconds, confidence);
    }
    
    @Override
    public String toString() {
        return "WordTimingInfo{" +
               "word='" + word + '\'' +
               ", start=" + "%.2f".formatted(startTimeSeconds) + "s" +
               ", end=" + "%.2f".formatted(endTimeSeconds) + "s" +
               ", duration=" + "%.2f".formatted(getDurationSeconds()) + "s" +
               ", confidence=" + "%.2f".formatted(confidence) +
               '}';
    }
}
