package com.ai.va.proto;

import com.ai.va.grpc.*;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.DisplayName;
import static org.junit.jupiter.api.Assertions.*;

/**
 * Validation tests for voice.proto message definitions.
 * These tests ensure proto messages are properly defined and can be constructed.
 */
@DisplayName("Voice Proto Validation Tests")
class VoiceProtoValidationTest {

    @Test
    @DisplayName("Should create AudioChunk with all STT fields")
    void testAudioChunkCreation() {
        // Given
        byte[] audioData = "test audio data".getBytes();
        String sessionId = "session-123";
        String customerId = "customer-456";
        
        // When
        AudioChunk audioChunk = AudioChunk.newBuilder()
            .setSessionId(sessionId)
            .setCustomerId(customerId)
            .setAudioData(com.google.protobuf.ByteString.copyFrom(audioData))
            .setFormat("webm")
            .setTimestamp(System.currentTimeMillis())
            .setSequenceNumber(1)
            .setIsFinalChunk(false)
            .build();
        
        // Then
        assertEquals(sessionId, audioChunk.getSessionId());
        assertEquals(customerId, audioChunk.getCustomerId());
        assertEquals("webm", audioChunk.getFormat());
        assertTrue(audioChunk.getTimestamp() > 0);
        assertEquals(1, audioChunk.getSequenceNumber());
        assertFalse(audioChunk.getIsFinalChunk());
        assertNotNull(audioChunk.getAudioData());
    }

    @Test
    @DisplayName("Should create TranscriptionResponse with metadata")
    void testTranscriptionResponseCreation() {
        // Given
        String transcriptText = "This is a test transcription";
        double confidence = 0.95;
        boolean isFinal = true;
        
        TranscriptionMetadata metadata = TranscriptionMetadata.newBuilder()
            .setProvider("whisper")
            .setProcessingTimeMs(550)
            .setModel("whisper-large-v3")
            .setStreaming(true)
            .build();
        
        // When
        TranscriptionResponse response = TranscriptionResponse.newBuilder()
            .setSessionId("session-123")
            .setText(transcriptText)
            .setConfidence(confidence)
            .setIsFinal(isFinal)
            .setMetadata(metadata)
            .build();
        
        // Then
        assertEquals("session-123", response.getSessionId());
        assertEquals(transcriptText, response.getText());
        assertEquals(confidence, response.getConfidence(), 0.001);
        assertTrue(response.getIsFinal());
        assertEquals("whisper", response.getMetadata().getProvider());
        assertEquals("whisper-large-v3", response.getMetadata().getModel());
        assertTrue(response.getMetadata().getStreaming());
    }

    @Test
    @DisplayName("Should create TranscriptionMetadata with STT-specific fields")
    void testTranscriptionMetadataCreation() {
        // When
        TranscriptionMetadata metadata = TranscriptionMetadata.newBuilder()
            .setProvider("azure")
            .setProcessingTimeMs(1050)
            .setModel("azure-speech-v2")
            .setStreaming(false)
            .build();
        
        // Then
        assertEquals("azure", metadata.getProvider());
        assertEquals(1050, metadata.getProcessingTimeMs());
        assertEquals("azure-speech-v2", metadata.getModel());
        assertFalse(metadata.getStreaming());
    }

    @Test
    @DisplayName("Should create WordTimestamp with timing information")
    void testWordTimestampCreation() {
        // When
        WordTimestamp timestamp = WordTimestamp.newBuilder()
            .setWord("hello")
            .setStartMs(500)
            .setEndMs(1000)
            .setConfidence(0.98)
            .build();
        
        // Then
        assertEquals("hello", timestamp.getWord());
        assertEquals(500, timestamp.getStartMs());
        assertEquals(1000, timestamp.getEndMs());
        assertEquals(0.98, timestamp.getConfidence(), 0.001);
    }

    @Test
    @DisplayName("Should create HealthCheckRequest for service monitoring")
    void testHealthCheckRequestCreation() {
        // When
        HealthCheckRequest request = HealthCheckRequest.newBuilder()
            .setService("va-service")
            .build();
        
        // Then
        assertEquals("va-service", request.getService());
    }

    @Test
    @DisplayName("Should create HealthCheckResponse with serving status")
    void testHealthCheckResponseCreation() {
        // When
        HealthCheckResponse response = HealthCheckResponse.newBuilder()
            .setStatus(HealthCheckResponse.ServingStatus.SERVING)
            .setMessage("Service is healthy")
            .putDetails("uptime", "3600s")
            .putDetails("version", "1.0.0")
            .build();
        
        // Then
        assertEquals(HealthCheckResponse.ServingStatus.SERVING, response.getStatus());
        assertEquals("Service is healthy", response.getMessage());
        assertEquals("3600s", response.getDetailsOrDefault("uptime", ""));
        assertEquals("1.0.0", response.getDetailsOrDefault("version", ""));
    }

    @Test
    @DisplayName("Should handle empty optional fields correctly")
    void testOptionalFieldsHandling() {
        // When - Create minimal AudioChunk
        AudioChunk minimalChunk = AudioChunk.newBuilder()
            .setSessionId("session-123")
            .setAudioData(com.google.protobuf.ByteString.copyFrom("data".getBytes()))
            .build();
        
        // Then - Optional fields should have default values
        assertEquals("", minimalChunk.getCustomerId()); // Empty string default
        assertEquals("", minimalChunk.getFormat());
        assertEquals(0, minimalChunk.getTimestamp());
        assertEquals(0, minimalChunk.getSequenceNumber());
        assertFalse(minimalChunk.getIsFinalChunk()); // Boolean default is false
    }

    @Test
    @DisplayName("Should validate confidence value precision as double")
    void testConfidencePrecision() {
        // Given - High precision confidence value
        double highPrecisionConfidence = 0.987654321;
        
        // When
        TranscriptionResponse response = TranscriptionResponse.newBuilder()
            .setSessionId("session-123")
            .setText("test")
            .setConfidence(highPrecisionConfidence)
            .setIsFinal(true)
            .build();
        
        // Then - Should preserve precision (within double epsilon)
        assertEquals(highPrecisionConfidence, response.getConfidence(), 1e-9);
    }

    @Test
    @DisplayName("Should support final chunk flag for streaming completion")
    void testFinalChunkFlag() {
        // When - Create final chunk
        AudioChunk finalChunk = AudioChunk.newBuilder()
            .setSessionId("session-123")
            .setAudioData(com.google.protobuf.ByteString.copyFrom("final data".getBytes()))
            .setIsFinalChunk(true)
            .build();
        
        // Then
        assertTrue(finalChunk.getIsFinalChunk());
        
        // When - Create intermediate chunk
        AudioChunk intermediateChunk = AudioChunk.newBuilder()
            .setSessionId("session-123")
            .setAudioData(com.google.protobuf.ByteString.copyFrom("data".getBytes()))
            .setIsFinalChunk(false)
            .build();
        
        // Then
        assertFalse(intermediateChunk.getIsFinalChunk());
    }

    @Test
    @DisplayName("Should support all common audio formats")
    void testAudioFormatSupport() {
        // Common audio formats for STT
        String[] formats = {"webm", "wav", "mp3", "opus", "flac", "pcm"};
        
        for (String format : formats) {
            AudioChunk chunk = AudioChunk.newBuilder()
                .setSessionId("session-123")
                .setAudioData(com.google.protobuf.ByteString.copyFrom("data".getBytes()))
                .setFormat(format)
                .build();
            
            assertEquals(format, chunk.getFormat());
        }
    }
}
