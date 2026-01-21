package com.ai.va.service.tts;

import java.util.List;
import java.util.concurrent.CompletableFuture;

/**
 * Text-to-Speech (TTS) Service Interface
 * 
 * Supports multiple TTS providers (Azure, ElevenLabs, Google) through factory pattern.
 * Provides both synchronous and asynchronous speech synthesis.
 * 
 * @see TtsServiceFactory
 * @see AzureTtsService
 */
public interface TtsService {
    
    /**
     * Synthesize speech from text asynchronously with default voice
     * 
     * @param text Text to synthesize (max 5000 characters)
     * @param language Language code (e.g., "en-US", "es-ES", "fr-FR")
     * @return CompletableFuture containing audio data as byte array
     * @throws TtsException if synthesis fails
     */
    CompletableFuture<byte[]> synthesize(String text, String language);
    
    /**
     * Synthesize speech from text with custom voice selection
     * 
     * @param text Text to synthesize (max 5000 characters)
     * @param language Language code (e.g., "en-US")
     * @param voiceName Specific voice name (e.g., "en-US-JennyNeural")
     * @return CompletableFuture containing audio data as byte array
     * @throws TtsException if synthesis fails
     */
    CompletableFuture<byte[]> synthesize(String text, String language, String voiceName);
    
    /**
     * Synthesize speech and return detailed result with metadata
     * 
     * @param text Text to synthesize
     * @param language Language code
     * @param voiceName Optional voice name (null for default)
     * @return CompletableFuture containing TtsResult with audio and metadata
     * @throws TtsException if synthesis fails
     */
    CompletableFuture<TtsResult> synthesizeWithMetadata(String text, String language, String voiceName);
    
    /**
     * Get list of available voices for this TTS provider
     * 
     * @return List of Voice objects with metadata (name, language, gender)
     */
    List<Voice> getAvailableVoices();
    
    /**
     * Get available voices filtered by language
     * 
     * @param language Language code to filter by (e.g., "en-US")
     * @return List of voices for specified language
     */
    List<Voice> getAvailableVoices(String language);
    
    /**
     * Check if TTS service is healthy and reachable
     * 
     * @return true if service is operational, false otherwise
     */
    boolean isHealthy();
    
    /**
     * Get the name of this TTS provider
     * 
     * @return Provider name (e.g., "AzureTTS", "ElevenLabs", "GoogleTTS")
     */
    String getProviderName();
    
    /**
     * Get default voice name for this provider
     * 
     * @return Default voice name
     */
    String getDefaultVoice();
    
    /**
     * Get supported audio formats
     * 
     * @return List of supported formats (e.g., ["mp3", "wav", "webm"])
     */
    List<String> getSupportedFormats();
    
    /**
     * Validate if text is within acceptable limits for synthesis
     * 
     * @param text Text to validate
     * @return true if text is valid for synthesis
     */
    default boolean isTextValid(String text) {
        if (text == null || text.trim().isEmpty()) {
            return false;
        }
        // Most TTS services have 5000 character limit
        return text.length() <= 5000;
    }
    
    /**
     * Split long text into chunks suitable for synthesis
     * Useful for texts exceeding provider limits
     * 
     * @param text Text to split
     * @param maxChunkSize Maximum characters per chunk
     * @return List of text chunks
     */
    default List<String> splitText(String text, int maxChunkSize) {
        List<String> chunks = new java.util.ArrayList<>();
        String[] sentences = text.split("(?<=[.!?])\\s+");
        
        StringBuilder currentChunk = new StringBuilder();
        for (String sentence : sentences) {
            if (currentChunk.length() + sentence.length() > maxChunkSize) {
                if (currentChunk.length() > 0) {
                    chunks.add(currentChunk.toString().trim());
                    currentChunk = new StringBuilder();
                }
            }
            currentChunk.append(sentence).append(" ");
        }
        
        if (currentChunk.length() > 0) {
            chunks.add(currentChunk.toString().trim());
        }
        
        return chunks;
    }
}
