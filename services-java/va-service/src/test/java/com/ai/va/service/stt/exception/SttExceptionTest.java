package com.ai.va.service.stt.exception;

import com.ai.va.service.stt.exception.SttException.ErrorCode;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.*;

/**
 * Unit tests for SttException.
 */
@DisplayName("SttException Tests")
class SttExceptionTest {
    
    @Test
    @DisplayName("Should create exception with error code")
    void testCreationWithErrorCode() {
        // When
        SttException exception = new SttException("Test error", ErrorCode.INVALID_AUDIO_FORMAT);
        
        // Then
        assertEquals("Test error", exception.getMessage());
        assertEquals(ErrorCode.INVALID_AUDIO_FORMAT, exception.getErrorCode());
        assertFalse(exception.isRetryable());
        assertNull(exception.getSessionId());
    }
    
    @Test
    @DisplayName("Should create exception with session ID")
    void testCreationWithSessionId() {
        // When
        SttException exception = new SttException(
            "Test error", 
            ErrorCode.SERVICE_UNAVAILABLE, 
            "session-123"
        );
        
        // Then
        assertEquals("session-123", exception.getSessionId());
        assertEquals(ErrorCode.SERVICE_UNAVAILABLE, exception.getErrorCode());
        assertTrue(exception.isRetryable());
    }
    
    @Test
    @DisplayName("Should create exception with cause")
    void testCreationWithCause() {
        // Given
        Throwable cause = new RuntimeException("Root cause");
        
        // When
        SttException exception = new SttException(
            "Test error", 
            cause, 
            ErrorCode.PROVIDER_ERROR
        );
        
        // Then
        assertEquals("Test error", exception.getMessage());
        assertEquals(cause, exception.getCause());
        assertEquals(ErrorCode.PROVIDER_ERROR, exception.getErrorCode());
    }
    
    @Test
    @DisplayName("Should inherit retryable flag from error code")
    void testRetryableFlag() {
        // Retryable errors
        SttException retryable = new SttException("Error", ErrorCode.TIMEOUT);
        assertTrue(retryable.isRetryable());
        
        // Non-retryable errors
        SttException nonRetryable = new SttException("Error", ErrorCode.INVALID_REQUEST);
        assertFalse(nonRetryable.isRetryable());
    }
    
    @Test
    @DisplayName("Should categorize error codes correctly")
    void testErrorCodeCategories() {
        // Client errors (4xx)
        assertTrue(ErrorCode.INVALID_AUDIO_FORMAT.isClientError());
        assertFalse(ErrorCode.INVALID_AUDIO_FORMAT.isServerError());
        
        // Server errors (5xx)
        assertTrue(ErrorCode.INTERNAL_ERROR.isServerError());
        assertFalse(ErrorCode.INTERNAL_ERROR.isClientError());
    }
    
    @Test
    @DisplayName("Should have correct HTTP status codes")
    void testHttpStatusCodes() {
        assertEquals(400, ErrorCode.INVALID_REQUEST.getHttpStatusCode());
        assertEquals(413, ErrorCode.AUDIO_TOO_LARGE.getHttpStatusCode());
        assertEquals(429, ErrorCode.RATE_LIMIT_EXCEEDED.getHttpStatusCode());
        assertEquals(500, ErrorCode.INTERNAL_ERROR.getHttpStatusCode());
        assertEquals(503, ErrorCode.SERVICE_UNAVAILABLE.getHttpStatusCode());
    }
    
    @Test
    @DisplayName("Should mark appropriate errors as retryable")
    void testRetryableErrorCodes() {
        // Retryable
        assertTrue(ErrorCode.SERVICE_UNAVAILABLE.isRetryable());
        assertTrue(ErrorCode.TIMEOUT.isRetryable());
        assertTrue(ErrorCode.PROVIDER_ERROR.isRetryable());
        assertTrue(ErrorCode.RATE_LIMIT_EXCEEDED.isRetryable());
        
        // Non-retryable
        assertFalse(ErrorCode.INVALID_AUDIO_FORMAT.isRetryable());
        assertFalse(ErrorCode.AUDIO_TOO_LARGE.isRetryable());
        assertFalse(ErrorCode.QUOTA_EXCEEDED.isRetryable());
        assertFalse(ErrorCode.AUTHENTICATION_FAILED.isRetryable());
    }
    
    @Test
    @DisplayName("Should have meaningful error descriptions")
    void testErrorDescriptions() {
        assertNotNull(ErrorCode.INVALID_AUDIO_FORMAT.getDescription());
        assertTrue(ErrorCode.INVALID_AUDIO_FORMAT.getDescription().length() > 0);
        
        assertNotNull(ErrorCode.SERVICE_UNAVAILABLE.getDescription());
        assertTrue(ErrorCode.SERVICE_UNAVAILABLE.getDescription().length() > 0);
    }
    
    @Test
    @DisplayName("Should generate meaningful toString")
    void testToString() {
        // Given
        SttException exception = new SttException(
            "Audio format not supported", 
            ErrorCode.INVALID_AUDIO_FORMAT,
            "session-123"
        );
        
        // When
        String toString = exception.toString();
        
        // Then
        assertNotNull(toString);
        assertTrue(toString.contains("INVALID_AUDIO_FORMAT"));
        assertTrue(toString.contains("session-123"));
        assertTrue(toString.contains("retryable=false"));
    }
}
