package com.ai.va.service.stt.dto;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.time.Instant;
import java.util.Arrays;

import static org.junit.jupiter.api.Assertions.*;

/**
 * Unit tests for TranscriptionResult DTO.
 */
@DisplayName("TranscriptionResult Tests")
class TranscriptionResultTest {
    
    @Test
    @DisplayName("Should create TranscriptionResult with builder")
    void testBuilderCreation() {
        // Given
        String sessionId = "session-123";
        String text = "Hello, world!";
        double confidence = 0.95;
        
        TranscriptionMetadata metadata = TranscriptionMetadata.builder()
            .language("en-US")
            .provider("whisper")
            .model("base")
            .build();
        
        // When
        TranscriptionResult result = TranscriptionResult.builder()
            .sessionId(sessionId)
            .text(text)
            .confidence(confidence)
            .isFinal(true)
            .metadata(metadata)
            .build();
        
        // Then
        assertEquals(sessionId, result.getSessionId());
        assertEquals(text, result.getText());
        assertEquals(confidence, result.getConfidence());
        assertTrue(result.isFinal());
        assertEquals(metadata, result.getMetadata());
        assertNotNull(result.getTimestamp());
    }
    
    @Test
    @DisplayName("Should create TranscriptionResult with word timings")
    void testBuilderWithWords() {
        // Given
        WordTimingInfo word1 = new WordTimingInfo("Hello", 0.0f, 0.5f, 0.98f);
        WordTimingInfo word2 = new WordTimingInfo("world", 0.6f, 1.0f, 0.95f);
        
        // When
        TranscriptionResult result = TranscriptionResult.builder("session-123", "Hello world")
            .confidence(0.96)
            .addWord(word1)
            .addWord(word2)
            .build();
        
        // Then
        assertTrue(result.hasWords());
        assertEquals(2, result.getWordCount());
        assertEquals(Arrays.asList(word1, word2), result.getWords());
    }
    
    @Test
    @DisplayName("Should validate confidence range")
    void testConfidenceValidation() {
        // Given/When/Then - Invalid confidence values
        assertThrows(IllegalArgumentException.class, () -> 
            TranscriptionResult.builder("session", "text")
                .confidence(-0.1)
                .build()
        );
        
        assertThrows(IllegalArgumentException.class, () -> 
            TranscriptionResult.builder("session", "text")
                .confidence(1.1)
                .build()
        );
        
        // Valid confidence values
        assertDoesNotThrow(() -> 
            TranscriptionResult.builder("session", "text")
                .confidence(0.0)
                .build()
        );
        
        assertDoesNotThrow(() -> 
            TranscriptionResult.builder("session", "text")
                .confidence(1.0)
                .build()
        );
    }
    
    @Test
    @DisplayName("Should require non-null sessionId and text")
    void testRequiredFields() {
        // Given/When/Then - Null sessionId
        assertThrows(NullPointerException.class, () -> 
            TranscriptionResult.builder()
                .text("text")
                .build()
        );
        
        // Null text
        assertThrows(NullPointerException.class, () -> 
            TranscriptionResult.builder()
                .sessionId("session")
                .build()
        );
    }
    
    @Test
    @DisplayName("Should classify confidence levels correctly")
    void testConfidenceClassification() {
        // High confidence
        TranscriptionResult highConf = TranscriptionResult.builder("s1", "text")
            .confidence(0.95)
            .build();
        assertTrue(highConf.isHighConfidence());
        assertFalse(highConf.isLowConfidence());
        
        // Low confidence
        TranscriptionResult lowConf = TranscriptionResult.builder("s2", "text")
            .confidence(0.65)
            .build();
        assertFalse(lowConf.isHighConfidence());
        assertTrue(lowConf.isLowConfidence());
        
        // Medium confidence
        TranscriptionResult medConf = TranscriptionResult.builder("s3", "text")
            .confidence(0.80)
            .build();
        assertFalse(medConf.isHighConfidence());
        assertFalse(medConf.isLowConfidence());
    }
    
    @Test
    @DisplayName("Should handle empty words list")
    void testEmptyWords() {
        // When
        TranscriptionResult result = TranscriptionResult.builder("session", "text")
            .build();
        
        // Then
        assertFalse(result.hasWords());
        assertEquals(0, result.getWordCount());
        assertTrue(result.getWords().isEmpty());
    }
    
    @Test
    @DisplayName("Should use default values for optional fields")
    void testDefaultValues() {
        // When
        TranscriptionResult result = TranscriptionResult.builder("session", "text")
            .build();
        
        // Then
        assertEquals(1.0, result.getConfidence()); // Default confidence
        assertTrue(result.isFinal()); // Default isFinal
        assertNull(result.getMetadata()); // Optional metadata
        assertNotNull(result.getTimestamp()); // Auto-generated
    }
    
    @Test
    @DisplayName("Should create immutable words list")
    void testWordsImmutability() {
        // Given
        TranscriptionResult result = TranscriptionResult.builder("session", "text")
            .addWord(new WordTimingInfo("test", 0.0f, 0.5f, 0.9f))
            .build();
        
        // When/Then - Should not be able to modify returned list
        assertThrows(UnsupportedOperationException.class, () -> 
            result.getWords().add(new WordTimingInfo("new", 1.0f, 1.5f, 0.9f))
        );
    }
    
    @Test
    @DisplayName("Should implement equals and hashCode correctly")
    void testEqualsAndHashCode() {
        // Given
        TranscriptionResult result1 = TranscriptionResult.builder("session", "text")
            .confidence(0.95)
            .isFinal(true)
            .build();
        
        TranscriptionResult result2 = TranscriptionResult.builder("session", "text")
            .confidence(0.95)
            .isFinal(true)
            .build();
        
        TranscriptionResult result3 = TranscriptionResult.builder("session", "different")
            .confidence(0.95)
            .isFinal(true)
            .build();
        
        // Then
        assertEquals(result1, result2);
        assertEquals(result1.hashCode(), result2.hashCode());
        assertNotEquals(result1, result3);
    }
    
    @Test
    @DisplayName("Should generate meaningful toString")
    void testToString() {
        // Given
        TranscriptionResult result = TranscriptionResult.builder("session-123", "Hello world")
            .confidence(0.95)
            .isFinal(true)
            .addWord(new WordTimingInfo("Hello", 0.0f, 0.5f, 0.98f))
            .build();
        
        // When
        String toString = result.toString();
        
        // Then
        assertNotNull(toString);
        assertTrue(toString.contains("session-123"));
        assertTrue(toString.contains("Hello world"));
        assertTrue(toString.contains("0.95"));
        assertTrue(toString.contains("wordCount=1"));
    }
}
