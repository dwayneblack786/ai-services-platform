package com.ai.va.service.stt;

/**
 * Represents a word-level timestamp from speech recognition.
 * Useful for precise synchronization and analysis.
 */
public class WordTimestamp {
    private final String word;
    private final long startMs;
    private final long endMs;
    private final float confidence;

    public WordTimestamp(String word, long startMs, long endMs, float confidence) {
        this.word = word;
        this.startMs = startMs;
        this.endMs = endMs;
        this.confidence = confidence;
    }

    public String getWord() {
        return word;
    }

    public long getStartMs() {
        return startMs;
    }

    public long getEndMs() {
        return endMs;
    }

    public float getConfidence() {
        return confidence;
    }

    @Override
    public String toString() {
        return "WordTimestamp{" +
                "word='" + word + '\'' +
                ", startMs=" + startMs +
                ", endMs=" + endMs +
                ", confidence=" + confidence +
                '}';
    }
}
