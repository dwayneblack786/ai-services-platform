package com.ai.va.service.stt.dto;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.*;

/**
 * Unit tests for WordTimingInfo.
 */
@DisplayName("WordTimingInfo Tests")
class WordTimingInfoTest {
    
    @Test
    @DisplayName("Should create WordTimingInfo with valid parameters")
    void testCreation() {
        // When
        WordTimingInfo word = new WordTimingInfo("hello", 0.5f, 1.0f, 0.95f);
        
        // Then
        assertEquals("hello", word.getWord());
        assertEquals(0.5f, word.getStartTimeSeconds());
        assertEquals(1.0f, word.getEndTimeSeconds());
        assertEquals(0.95f, word.getConfidence());
        assertEquals(0.5f, word.getDurationSeconds());
    }
    
    @Test
    @DisplayName("Should validate timing constraints")
    void testTimingValidation() {
        // Given/When/Then - End time before start time
        assertThrows(IllegalArgumentException.class, () -> 
            new WordTimingInfo("word", 1.0f, 0.5f, 0.9f)
        );
        
        // Valid - same start and end time
        assertDoesNotThrow(() -> 
            new WordTimingInfo("word", 1.0f, 1.0f, 0.9f)
        );
    }
    
    @Test
    @DisplayName("Should validate confidence range")
    void testConfidenceValidation() {
        // Given/When/Then - Confidence < 0
        assertThrows(IllegalArgumentException.class, () -> 
            new WordTimingInfo("word", 0.0f, 1.0f, -0.1f)
        );
        
        // Confidence > 1
        assertThrows(IllegalArgumentException.class, () -> 
            new WordTimingInfo("word", 0.0f, 1.0f, 1.1f)
        );
        
        // Valid confidence values
        assertDoesNotThrow(() -> 
            new WordTimingInfo("word", 0.0f, 1.0f, 0.0f)
        );
        
        assertDoesNotThrow(() -> 
            new WordTimingInfo("word", 0.0f, 1.0f, 1.0f)
        );
    }
    
    @Test
    @DisplayName("Should require non-null word")
    void testNullWordValidation() {
        // Given/When/Then
        assertThrows(NullPointerException.class, () -> 
            new WordTimingInfo(null, 0.0f, 1.0f, 0.9f)
        );
    }
    
    @Test
    @DisplayName("Should calculate duration correctly")
    void testDurationCalculation() {
        // Given
        WordTimingInfo word = new WordTimingInfo("test", 1.5f, 2.8f, 0.9f);
        
        // When
        float duration = word.getDurationSeconds();
        
        // Then
        assertEquals(1.3f, duration, 0.001f);
    }
    
    @Test
    @DisplayName("Should classify confidence levels correctly")
    void testConfidenceClassification() {
        // High confidence
        WordTimingInfo highConf = new WordTimingInfo("word", 0.0f, 1.0f, 0.95f);
        assertTrue(highConf.isHighConfidence());
        assertFalse(highConf.isLowConfidence());
        
        // Low confidence
        WordTimingInfo lowConf = new WordTimingInfo("word", 0.0f, 1.0f, 0.65f);
        assertFalse(lowConf.isHighConfidence());
        assertTrue(lowConf.isLowConfidence());
        
        // Medium confidence
        WordTimingInfo medConf = new WordTimingInfo("word", 0.0f, 1.0f, 0.80f);
        assertFalse(medConf.isHighConfidence());
        assertFalse(medConf.isLowConfidence());
    }
    
    @Test
    @DisplayName("Should implement equals and hashCode correctly")
    void testEqualsAndHashCode() {
        // Given
        WordTimingInfo word1 = new WordTimingInfo("hello", 0.0f, 1.0f, 0.95f);
        WordTimingInfo word2 = new WordTimingInfo("hello", 0.0f, 1.0f, 0.95f);
        WordTimingInfo word3 = new WordTimingInfo("world", 0.0f, 1.0f, 0.95f);
        
        // Then
        assertEquals(word1, word2);
        assertEquals(word1.hashCode(), word2.hashCode());
        assertNotEquals(word1, word3);
    }
    
    @Test
    @DisplayName("Should generate meaningful toString")
    void testToString() {
        // Given
        WordTimingInfo word = new WordTimingInfo("hello", 0.5f, 1.0f, 0.95f);
        
        // When
        String toString = word.toString();
        
        // Then
        assertNotNull(toString);
        assertTrue(toString.contains("hello"));
        assertTrue(toString.contains("0.50")); // Start time
        assertTrue(toString.contains("1.00")); // End time
        assertTrue(toString.contains("0.95")); // Confidence
    }
}
