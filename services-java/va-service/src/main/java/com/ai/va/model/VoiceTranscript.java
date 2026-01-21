package com.ai.va.model;

import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.index.Indexed;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;

/**
 * Voice Transcript Entity
 * Stores complete transcript of a voice session in MongoDB
 */
@Document(collection = "voice_transcripts")
public class VoiceTranscript {

    @Id
    private String id;

    private String sessionId;

    private String userId;

    private String customerId;

    private List<TranscriptSegment> transcript = new ArrayList<>();

    private TranscriptMetadata metadata;

    private Instant createdAt;
    private Instant updatedAt;

    public VoiceTranscript() {
        this.createdAt = Instant.now();
        this.updatedAt = Instant.now();
    }

    public VoiceTranscript(String sessionId, String userId, String customerId) {
        this();
        this.sessionId = sessionId;
        this.userId = userId;
        this.customerId = customerId;
        this.metadata = new TranscriptMetadata();
    }

    // Getters and Setters
    public String getId() {
        return id;
    }

    public void setId(String id) {
        this.id = id;
    }

    public String getSessionId() {
        return sessionId;
    }

    public void setSessionId(String sessionId) {
        this.sessionId = sessionId;
    }

    public String getUserId() {
        return userId;
    }

    public void setUserId(String userId) {
        this.userId = userId;
    }

    public String getCustomerId() {
        return customerId;
    }

    public void setCustomerId(String customerId) {
        this.customerId = customerId;
    }

    public List<TranscriptSegment> getTranscript() {
        return transcript;
    }

    public void setTranscript(List<TranscriptSegment> transcript) {
        this.transcript = transcript;
    }

    public TranscriptMetadata getMetadata() {
        return metadata;
    }

    public void setMetadata(TranscriptMetadata metadata) {
        this.metadata = metadata;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(Instant createdAt) {
        this.createdAt = createdAt;
    }

    public Instant getUpdatedAt() {
        return updatedAt;
    }

    public void setUpdatedAt(Instant updatedAt) {
        this.updatedAt = updatedAt;
    }

    // Helper methods
    public void addSegment(TranscriptSegment segment) {
        this.transcript.add(segment);
        this.updatedAt = Instant.now();
        updateMetadata(segment);
    }

    private void updateMetadata(TranscriptSegment segment) {
        if (this.metadata != null) {
            // Update duration
            if (segment.getTimestamp() != null) {
                long duration = segment.getTimestamp().toEpochMilli() - this.createdAt.toEpochMilli();
                this.metadata.setDurationMs(duration);
            }
            
            // Update turn count
            this.metadata.setTotalTurns(this.transcript.size());
            
            // Update speaker counts
            if ("user".equalsIgnoreCase(segment.getSpeaker())) {
                this.metadata.setUserTurns(this.metadata.getUserTurns() + 1);
            } else if ("assistant".equalsIgnoreCase(segment.getSpeaker())) {
                this.metadata.setAssistantTurns(this.metadata.getAssistantTurns() + 1);
            }
        }
    }

    @Override
    public String toString() {
        return "VoiceTranscript{" +
                "id='" + id + '\'' +
                ", sessionId='" + sessionId + '\'' +
                ", userId='" + userId + '\'' +
                ", customerId='" + customerId + '\'' +
                ", transcriptSize=" + transcript.size() +
                ", metadata=" + metadata +
                ", createdAt=" + createdAt +
                ", updatedAt=" + updatedAt +
                '}';
    }

    /**
     * Nested class for individual transcript segments
     */
    public static class TranscriptSegment {
        private String speaker; // "user" or "assistant"
        private String text;
        private Instant timestamp;
        private Integer sequenceNumber;
        private Double confidence; // STT confidence score (0.0 - 1.0)

        public TranscriptSegment() {
            this.timestamp = Instant.now();
        }

        public TranscriptSegment(String speaker, String text) {
            this();
            this.speaker = speaker;
            this.text = text;
        }

        public TranscriptSegment(String speaker, String text, Integer sequenceNumber) {
            this(speaker, text);
            this.sequenceNumber = sequenceNumber;
        }

        // Getters and Setters
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

        public Instant getTimestamp() {
            return timestamp;
        }

        public void setTimestamp(Instant timestamp) {
            this.timestamp = timestamp;
        }

        public Integer getSequenceNumber() {
            return sequenceNumber;
        }

        public void setSequenceNumber(Integer sequenceNumber) {
            this.sequenceNumber = sequenceNumber;
        }

        public Double getConfidence() {
            return confidence;
        }

        public void setConfidence(Double confidence) {
            this.confidence = confidence;
        }

        @Override
        public String toString() {
            return "TranscriptSegment{" +
                    "speaker='" + speaker + '\'' +
                    ", text='" + text + '\'' +
                    ", timestamp=" + timestamp +
                    ", sequenceNumber=" + sequenceNumber +
                    ", confidence=" + confidence +
                    '}';
        }
    }

    /**
     * Metadata about the transcript
     */
    public static class TranscriptMetadata {
        private Long durationMs; // Total session duration in milliseconds
        private String sttProvider; // "whisper", "google", "azure", etc.
        private String language; // "en-US", "es-ES", etc.
        private Integer totalTurns;
        private Integer userTurns;
        private Integer assistantTurns;
        private String tenantId;
        private String productId;

        public TranscriptMetadata() {
            this.totalTurns = 0;
            this.userTurns = 0;
            this.assistantTurns = 0;
            this.language = "en-US";
        }

        // Getters and Setters
        public Long getDurationMs() {
            return durationMs;
        }

        public void setDurationMs(Long durationMs) {
            this.durationMs = durationMs;
        }

        public String getSttProvider() {
            return sttProvider;
        }

        public void setSttProvider(String sttProvider) {
            this.sttProvider = sttProvider;
        }

        public String getLanguage() {
            return language;
        }

        public void setLanguage(String language) {
            this.language = language;
        }

        public Integer getTotalTurns() {
            return totalTurns;
        }

        public void setTotalTurns(Integer totalTurns) {
            this.totalTurns = totalTurns;
        }

        public Integer getUserTurns() {
            return userTurns;
        }

        public void setUserTurns(Integer userTurns) {
            this.userTurns = userTurns;
        }

        public Integer getAssistantTurns() {
            return assistantTurns;
        }

        public void setAssistantTurns(Integer assistantTurns) {
            this.assistantTurns = assistantTurns;
        }

        public String getTenantId() {
            return tenantId;
        }

        public void setTenantId(String tenantId) {
            this.tenantId = tenantId;
        }

        public String getProductId() {
            return productId;
        }

        public void setProductId(String productId) {
            this.productId = productId;
        }

        @Override
        public String toString() {
            return "TranscriptMetadata{" +
                    "durationMs=" + durationMs +
                    ", sttProvider='" + sttProvider + '\'' +
                    ", language='" + language + '\'' +
                    ", totalTurns=" + totalTurns +
                    ", userTurns=" + userTurns +
                    ", assistantTurns=" + assistantTurns +
                    ", tenantId='" + tenantId + '\'' +
                    ", productId='" + productId + '\'' +
                    '}';
        }
    }
}
