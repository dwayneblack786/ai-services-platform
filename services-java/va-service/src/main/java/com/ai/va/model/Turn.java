package com.ai.va.model;

/**
 * Turn Model
 * Represents a single turn in the conversation (caller or assistant)
 */
public class Turn {
    
    private String speaker; // "caller" or "assistant"
    private String text;
    private double timestamp; // Unix timestamp in seconds

    public Turn() {
    }

    public Turn(String speaker, String text, double timestamp) {
        this.speaker = speaker;
        this.text = text;
        this.timestamp = timestamp;
    }

    // Factory methods for convenience
    public static Turn caller(String text) {
        return new Turn("caller", text, System.currentTimeMillis() / 1000.0);
    }

    public static Turn assistant(String text) {
        return new Turn("assistant", text, System.currentTimeMillis() / 1000.0);
    }

    /**
     * Convert turn to prompt line format
     */
    public String toPromptLine() {
        return speaker.substring(0, 1).toUpperCase() + speaker.substring(1) + ": " + text + "\n";
    }

    public String getSpeaker() {
        return speaker;
    }

    public void setSpeaker(String speaker) {
        this.speaker = speaker;
    }

    public String getText() {
        return text;
    }

    public void setText(String text) {
        this.text = text;
    }

    public double getTimestamp() {
        return timestamp;
    }

    public void setTimestamp(double timestamp) {
        this.timestamp = timestamp;
    }

    @Override
    public String toString() {
        return "Turn{" +
                "speaker='" + speaker + '\'' +
                ", text='" + text + '\'' +
                ", timestamp=" + timestamp +
                '}';
    }
}
