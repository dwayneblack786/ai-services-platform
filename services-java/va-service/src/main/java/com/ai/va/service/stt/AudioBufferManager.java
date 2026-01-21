package com.ai.va.service.stt;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

/**
 * Manages audio buffering by session for STT processing.
 * Accumulates audio chunks until ready for transcription.
 */
@Service
public class AudioBufferManager {
    
    private static final Logger logger = LoggerFactory.getLogger(AudioBufferManager.class);
    
    // Session ID -> List of audio chunks
    private final Map<String, List<byte[]>> sessionBuffers = new ConcurrentHashMap<>();
    
    // Session ID -> Audio format
    private final Map<String, String> sessionFormats = new ConcurrentHashMap<>();
    
    // Session ID -> Total bytes accumulated
    private final Map<String, Long> sessionSizes = new ConcurrentHashMap<>();
    
    private static final long MAX_BUFFER_SIZE = 10 * 1024 * 1024; // 10MB max per session
    
    /**
     * Initialize a new audio session.
     * 
     * @param sessionId Unique session identifier
     * @param format Audio format for this session
     */
    public void initializeSession(String sessionId, String format) {
        logger.debug("Initializing audio session: {}", sessionId);
        sessionBuffers.put(sessionId, new ArrayList<>());
        sessionFormats.put(sessionId, format);
        sessionSizes.put(sessionId, 0L);
    }
    
    /**
     * Add an audio chunk to the session buffer.
     * 
     * @param sessionId Session identifier
     * @param audioChunk Audio data to buffer
     * @throws IllegalStateException if buffer size exceeds maximum
     */
    public void addChunk(String sessionId, byte[] audioChunk) {
        List<byte[]> buffer = sessionBuffers.get(sessionId);
        if (buffer == null) {
            logger.warn("Received chunk for unknown session: {}. Auto-initializing with default format.", sessionId);
            initializeSession(sessionId, "webm");
            buffer = sessionBuffers.get(sessionId);
        }
        
        long currentSize = sessionSizes.getOrDefault(sessionId, 0L);
        long newSize = currentSize + audioChunk.length;
        
        if (newSize > MAX_BUFFER_SIZE) {
            throw new IllegalStateException(
                String.format("Session %s buffer exceeds maximum size: %d bytes", sessionId, MAX_BUFFER_SIZE)
            );
        }
        
        buffer.add(audioChunk);
        sessionSizes.put(sessionId, newSize);
        
        logger.trace("Added chunk to session {}: {} bytes (total: {} bytes, {} chunks)", 
            sessionId, audioChunk.length, newSize, buffer.size());
    }
    
    /**
     * Get all accumulated audio chunks for a session.
     * 
     * @param sessionId Session identifier
     * @return List of audio chunks
     */
    public List<byte[]> getChunks(String sessionId) {
        return sessionBuffers.getOrDefault(sessionId, new ArrayList<>());
    }
    
    /**
     * Get concatenated audio data for a session.
     * 
     * @param sessionId Session identifier
     * @return All audio chunks concatenated into a single byte array
     */
    public byte[] getConcatenatedAudio(String sessionId) {
        List<byte[]> chunks = getChunks(sessionId);
        if (chunks.isEmpty()) {
            return new byte[0];
        }
        
        long totalSize = sessionSizes.getOrDefault(sessionId, 0L);
        byte[] result = new byte[(int) totalSize];
        
        int offset = 0;
        for (byte[] chunk : chunks) {
            System.arraycopy(chunk, 0, result, offset, chunk.length);
            offset += chunk.length;
        }
        
        logger.debug("Concatenated {} chunks for session {}: total {} bytes", 
            chunks.size(), sessionId, totalSize);
        
        return result;
    }
    
    /**
     * Get the audio format for a session.
     * 
     * @param sessionId Session identifier
     * @return Audio format, or null if session not found
     */
    public String getFormat(String sessionId) {
        return sessionFormats.get(sessionId);
    }
    
    /**
     * Get the total buffered size for a session.
     * 
     * @param sessionId Session identifier
     * @return Total bytes buffered
     */
    public long getBufferSize(String sessionId) {
        return sessionSizes.getOrDefault(sessionId, 0L);
    }
    
    /**
     * Clear all buffers for a session (call after transcription).
     * 
     * @param sessionId Session identifier
     */
    public void clearSession(String sessionId) {
        logger.debug("Clearing audio session: {}", sessionId);
        sessionBuffers.remove(sessionId);
        sessionFormats.remove(sessionId);
        sessionSizes.remove(sessionId);
    }
    
    /**
     * Check if a session exists.
     * 
     * @param sessionId Session identifier
     * @return true if session has been initialized
     */
    public boolean hasSession(String sessionId) {
        return sessionBuffers.containsKey(sessionId);
    }
    
    /**
     * Get statistics about active sessions.
     * 
     * @return Map of session ID to buffer size
     */
    public Map<String, Long> getSessionStats() {
        return new ConcurrentHashMap<>(sessionSizes);
    }
}
