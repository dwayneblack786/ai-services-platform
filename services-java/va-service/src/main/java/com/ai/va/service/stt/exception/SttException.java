package com.ai.va.service.stt.exception;

/**
 * Base exception for Speech-to-Text operations.
 * 
 * Provides error categorization and retry logic support for STT failures.
 * 
 * @author AI Services Platform
 * @version 1.0
 * @since 2026-01-20
 */
public class SttException extends Exception {
    
    private final ErrorCode errorCode;
    private final boolean retryable;
    private final String sessionId;
    
    public SttException(String message, ErrorCode errorCode) {
        super(message);
        this.errorCode = errorCode;
        this.retryable = errorCode.isRetryable();
        this.sessionId = null;
    }
    
    public SttException(String message, ErrorCode errorCode, String sessionId) {
        super(message);
        this.errorCode = errorCode;
        this.retryable = errorCode.isRetryable();
        this.sessionId = sessionId;
    }
    
    public SttException(String message, Throwable cause, ErrorCode errorCode) {
        super(message, cause);
        this.errorCode = errorCode;
        this.retryable = errorCode.isRetryable();
        this.sessionId = null;
    }
    
    public SttException(String message, Throwable cause, ErrorCode errorCode, String sessionId) {
        super(message, cause);
        this.errorCode = errorCode;
        this.retryable = errorCode.isRetryable();
        this.sessionId = sessionId;
    }
    
    public ErrorCode getErrorCode() {
        return errorCode;
    }
    
    public boolean isRetryable() {
        return retryable;
    }
    
    public String getSessionId() {
        return sessionId;
    }
    
    /**
     * Error codes for STT operations.
     */
    public enum ErrorCode {
        // Client errors (4xx) - not retryable
        INVALID_AUDIO_FORMAT("Invalid audio format", false, 400),
        AUDIO_TOO_LARGE("Audio file exceeds size limit", false, 413),
        AUDIO_TOO_LONG("Audio duration exceeds limit", false, 413),
        UNSUPPORTED_LANGUAGE("Unsupported language code", false, 400),
        INVALID_REQUEST("Invalid request parameters", false, 400),
        
        // Server errors (5xx) - retryable
        SERVICE_UNAVAILABLE("STT service unavailable", true, 503),
        TIMEOUT("Transcription timeout", true, 504),
        PROVIDER_ERROR("STT provider error", true, 502),
        INTERNAL_ERROR("Internal server error", true, 500),
        
        // Audio processing errors - conditionally retryable
        AUDIO_DECODE_ERROR("Failed to decode audio", false, 422),
        AUDIO_EMPTY("Audio data is empty", false, 400),
        AUDIO_CORRUPTED("Audio data is corrupted", false, 422),
        
        // Rate limiting - retryable with backoff
        RATE_LIMIT_EXCEEDED("Rate limit exceeded", true, 429),
        QUOTA_EXCEEDED("Quota exceeded", false, 429),
        
        // Authentication/Authorization
        AUTHENTICATION_FAILED("Authentication failed", false, 401),
        AUTHORIZATION_FAILED("Authorization failed", false, 403),
        
        // Unknown
        UNKNOWN("Unknown error", false, 500);
        
        private final String description;
        private final boolean retryable;
        private final int httpStatusCode;
        
        ErrorCode(String description, boolean retryable, int httpStatusCode) {
            this.description = description;
            this.retryable = retryable;
            this.httpStatusCode = httpStatusCode;
        }
        
        public String getDescription() {
            return description;
        }
        
        public boolean isRetryable() {
            return retryable;
        }
        
        public int getHttpStatusCode() {
            return httpStatusCode;
        }
        
        public boolean isClientError() {
            return httpStatusCode >= 400 && httpStatusCode < 500;
        }
        
        public boolean isServerError() {
            return httpStatusCode >= 500;
        }
    }
    
    @Override
    public String toString() {
        return "SttException{code=%s, retryable=%s, sessionId=%s, message=%s}".formatted(
                errorCode, retryable, sessionId, getMessage());
    }
}
