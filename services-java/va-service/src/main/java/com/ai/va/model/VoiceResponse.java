package com.ai.va.model;

/**
 * Voice Response Model
 * Response sent back to Node.js backend containing TTS audio
 */
public class VoiceResponse {
    
    private String callId;
    private String ttsAudio; // Base64 encoded audio to play to caller
    private String transcript; // What the caller said
    private String assistantResponse; // What the assistant responded (text)
    private String message; // Optional status message

    public VoiceResponse() {
    }

    public VoiceResponse(String callId, String ttsAudio) {
        this.callId = callId;
        this.ttsAudio = ttsAudio;
    }

    public String getCallId() {
        return callId;
    }

    public void setCallId(String callId) {
        this.callId = callId;
    }

    public String getTtsAudio() {
        return ttsAudio;
    }

    public void setTtsAudio(String ttsAudio) {
        this.ttsAudio = ttsAudio;
    }

    public String getTranscript() {
        return transcript;
    }

    public void setTranscript(String transcript) {
        this.transcript = transcript;
    }

    public String getAssistantResponse() {
        return assistantResponse;
    }

    public void setAssistantResponse(String assistantResponse) {
        this.assistantResponse = assistantResponse;
    }

    public String getMessage() {
        return message;
    }

    public void setMessage(String message) {
        this.message = message;
    }

    @Override
    public String toString() {
        return "VoiceResponse{" +
                "callId='" + callId + '\'' +
                ", ttsAudioLength=" + (ttsAudio != null ? ttsAudio.length() : 0) +
                ", transcript='" + transcript + '\'' +
                ", assistantResponse='" + assistantResponse + '\'' +
                ", message='" + message + '\'' +
                '}';
    }
}
