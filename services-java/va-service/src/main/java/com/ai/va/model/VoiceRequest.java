package com.ai.va.model;

/**
 * Voice Request Model
 * Incoming request from Node.js backend containing audio chunk
 */
public class VoiceRequest {
    
    private String callId;
    private String audioChunk; // Base64 encoded audio data

    public VoiceRequest() {
    }

    public VoiceRequest(String callId, String audioChunk) {
        this.callId = callId;
        this.audioChunk = audioChunk;
    }

    public String getCallId() {
        return callId;
    }

    public void setCallId(String callId) {
        this.callId = callId;
    }

    public String getAudioChunk() {
        return audioChunk;
    }

    public void setAudioChunk(String audioChunk) {
        this.audioChunk = audioChunk;
    }

    @Override
    public String toString() {
        return "VoiceRequest{" +
                "callId='" + callId + '\'' +
                ", audioChunkLength=" + (audioChunk != null ? audioChunk.length() : 0) +
                '}';
    }
}
