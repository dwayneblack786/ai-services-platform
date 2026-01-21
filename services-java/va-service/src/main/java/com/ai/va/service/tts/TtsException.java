package com.ai.va.service.tts;

/**
 * Custom exception for TTS service errors
 * 
 * Thrown when text-to-speech synthesis fails due to various reasons
 * including invalid input, provider errors, or connectivity issues.
 */
public class TtsException extends RuntimeException {
    
    private final ErrorType errorType;
    private final String provider;
    
    public enum ErrorType {
        INVALID_INPUT,           // Text is null, empty, or too long
        INVALID_LANGUAGE,        // Unsupported language code
        INVALID_VOICE,           // Voice name not found
        PROVIDER_ERROR,          // TTS provider returned error
        CONNECTIVITY_ERROR,      // Cannot reach TTS service
        RATE_LIMIT_EXCEEDED,     // API rate limit reached
        AUTHENTICATION_ERROR,    // Invalid API key or credentials
        TIMEOUT,                 // Request timed out
        UNKNOWN                  // Unknown error
    }
    
    public TtsException(String message, ErrorType errorType, String provider) {
        super(message);
        this.errorType = errorType;
        this.provider = provider;
    }
    
    public TtsException(String message, ErrorType errorType, String provider, Throwable cause) {
        super(message, cause);
        this.errorType = errorType;
        this.provider = provider;
    }
    
    public ErrorType getErrorType() {
        return errorType;
    }
    
    public String getProvider() {
        return provider;
    }
    
    @Override
    public String toString() {
        return String.format("TtsException{errorType=%s, provider='%s', message='%s'}",
                errorType, provider, getMessage());
    }
    
    // Convenience factory methods
    
    public static TtsException invalidInput(String message, String provider) {
        return new TtsException(message, ErrorType.INVALID_INPUT, provider);
    }
    
    public static TtsException invalidLanguage(String language, String provider) {
        return new TtsException(
                String.format("Unsupported language: %s", language),
                ErrorType.INVALID_LANGUAGE,
                provider
        );
    }
    
    public static TtsException invalidVoice(String voiceName, String provider) {
        return new TtsException(
                String.format("Voice not found: %s", voiceName),
                ErrorType.INVALID_VOICE,
                provider
        );
    }
    
    public static TtsException providerError(String message, String provider, Throwable cause) {
        return new TtsException(message, ErrorType.PROVIDER_ERROR, provider, cause);
    }
    
    public static TtsException connectivityError(String provider, Throwable cause) {
        return new TtsException(
                String.format("Cannot reach TTS service: %s", provider),
                ErrorType.CONNECTIVITY_ERROR,
                provider,
                cause
        );
    }
    
    public static TtsException rateLimitExceeded(String provider) {
        return new TtsException(
                "TTS rate limit exceeded. Please try again later.",
                ErrorType.RATE_LIMIT_EXCEEDED,
                provider
        );
    }
    
    public static TtsException authenticationError(String provider) {
        return new TtsException(
                "TTS authentication failed. Check API credentials.",
                ErrorType.AUTHENTICATION_ERROR,
                provider
        );
    }
    
    public static TtsException timeout(String provider) {
        return new TtsException(
                "TTS request timed out",
                ErrorType.TIMEOUT,
                provider
        );
    }
}
