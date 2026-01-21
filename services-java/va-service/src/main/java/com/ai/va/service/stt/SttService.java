package com.ai.va.service.stt;

import com.ai.va.service.stt.dto.TranscriptionResult;
import com.ai.va.service.stt.exception.SttException;
import reactor.core.publisher.Flux;
import reactor.core.publisher.Mono;

import java.util.concurrent.CompletableFuture;

/**
 * Speech-to-Text Service Interface
 * 
 * Provides abstraction for STT operations supporting multiple providers:
 * - Whisper (local development)
 * - Azure Cognitive Services Speech (production)
 * 
 * Supports both batch and streaming transcription modes.
 * 
 * @author AI Services Platform
 * @version 1.0
 * @since 2026-01-20
 */
public interface SttService {
    
    /**
     * Transcribe audio data synchronously (blocking operation).
     * Suitable for small audio files or when async is not needed.
     * 
     * @param audioData Raw audio bytes
     * @param format Audio format (e.g., "webm", "wav", "mp3", "opus")
     * @param sessionId Session identifier for tracking and logging
     * @return TranscriptionResult containing text, confidence, metadata
     * @throws SttException if transcription fails
     */
    TranscriptionResult transcribe(byte[] audioData, String format, String sessionId) throws SttException;
    
    /**
     * Transcribe audio data asynchronously.
     * Returns immediately with a CompletableFuture for non-blocking operation.
     * 
     * @param audioData Raw audio bytes
     * @param format Audio format (e.g., "webm", "wav", "mp3", "opus")
     * @param sessionId Session identifier for tracking and logging
     * @return CompletableFuture that completes with TranscriptionResult
     */
    CompletableFuture<TranscriptionResult> transcribeAsync(byte[] audioData, String format, String sessionId);
    
    /**
     * Transcribe audio data with language hint.
     * Improves accuracy when source language is known.
     * 
     * @param audioData Raw audio bytes
     * @param format Audio format
     * @param sessionId Session identifier
     * @param languageCode Language code (e.g., "en-US", "es-ES", "fr-FR")
     * @return CompletableFuture with TranscriptionResult
     */
    CompletableFuture<TranscriptionResult> transcribeAsync(
        byte[] audioData, 
        String format, 
        String sessionId, 
        String languageCode
    );
    
    /**
     * Stream transcription for real-time audio processing.
     * Returns a reactive stream of partial and final transcription results.
     * 
     * Workflow:
     * 1. Client sends audio chunks via input Flux
     * 2. STT service processes chunks in real-time
     * 3. Returns stream of interim results (is_final=false)
     * 4. Returns final result when stream completes (is_final=true)
     * 
     * @param audioChunks Flux of audio chunk bytes
     * @param format Audio format
     * @param sessionId Session identifier
     * @return Flux of TranscriptionResult (interim + final)
     */
    Flux<TranscriptionResult> transcribeStream(Flux<byte[]> audioChunks, String format, String sessionId);
    
    /**
     * Stream transcription with language hint.
     * 
     * @param audioChunks Flux of audio chunk bytes
     * @param format Audio format
     * @param sessionId Session identifier
     * @param languageCode Language code
     * @return Flux of TranscriptionResult
     */
    Flux<TranscriptionResult> transcribeStream(
        Flux<byte[]> audioChunks, 
        String format, 
        String sessionId, 
        String languageCode
    );
    
    /**
     * Check if the STT service is healthy and ready to process requests.
     * 
     * @return true if service is operational, false otherwise
     */
    boolean isHealthy();
    
    /**
     * Get detailed health status with diagnostic information.
     * 
     * @return Mono that emits health check details
     */
    Mono<HealthStatus> getHealthStatus();
    
    /**
     * Get the provider name for this STT service.
     * 
     * @return Provider identifier (e.g., "whisper", "azure-speech")
     */
    String getProvider();
    
    /**
     * Get the model name/version being used.
     * 
     * @return Model identifier (e.g., "whisper-large-v3", "azure-speech-v2")
     */
    String getModel();
    
    /**
     * Get supported audio formats for this provider.
     * 
     * @return Array of supported format strings
     */
    String[] getSupportedFormats();
    
    /**
     * Validate if the given audio format is supported.
     * 
     * @param format Audio format to check
     * @return true if format is supported, false otherwise
     */
    default boolean isFormatSupported(String format) {
        if (format == null || format.isEmpty()) {
            return false;
        }
        String[] supported = getSupportedFormats();
        for (String supportedFormat : supported) {
            if (supportedFormat.equalsIgnoreCase(format)) {
                return true;
            }
        }
        return false;
    }
    
    /**
     * Get maximum audio duration supported (in seconds).
     * Returns -1 if no limit.
     * 
     * @return Maximum duration in seconds
     */
    default int getMaxAudioDurationSeconds() {
        return 300; // 5 minutes default
    }
    
    /**
     * Get maximum audio size supported (in bytes).
     * Returns -1 if no limit.
     * 
     * @return Maximum size in bytes
     */
    default long getMaxAudioSizeBytes() {
        return 25 * 1024 * 1024; // 25MB default
    }
    
    /**
     * Health status information for STT service.
     */
    record HealthStatus(
        boolean healthy,
        String provider,
        String model,
        String message,
        java.util.Map<String, String> details
    ) {
        public static HealthStatus healthy(String provider, String model) {
            return new HealthStatus(
                true, 
                provider, 
                model, 
                "Service is operational",
                java.util.Map.of(
                    "status", "SERVING",
                    "timestamp", java.time.Instant.now().toString()
                )
            );
        }
        
        public static HealthStatus unhealthy(String provider, String model, String reason) {
            return new HealthStatus(
                false, 
                provider, 
                model, 
                reason,
                java.util.Map.of(
                    "status", "NOT_SERVING",
                    "reason", reason,
                    "timestamp", java.time.Instant.now().toString()
                )
            );
        }
    }
}
