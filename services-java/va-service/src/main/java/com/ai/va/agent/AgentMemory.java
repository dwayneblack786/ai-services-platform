package com.ai.va.agent;

import org.springframework.stereotype.Component;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

/**
 * In-memory conversation history management
 * 
 * For production, this should be backed by:
 * - MongoDB for persistence
 * - Redis for caching
 * - Vector DB (Pinecone/Weaviate) for semantic search
 */
@Component
public class AgentMemory {
    
    private final Map<String, List<String>> sessionHistory = new ConcurrentHashMap<>();
    private static final int MAX_HISTORY_SIZE = 50;
    
    /**
     * Get conversation history for a session
     */
    public List<String> getHistory(String sessionId) {
        return sessionHistory.computeIfAbsent(sessionId, k -> new ArrayList<>());
    }
    
    /**
     * Add a message to session history
     */
    public void addToHistory(String sessionId, String message) {
        List<String> history = getHistory(sessionId);
        history.add(message);
        
        // Keep only last N messages to avoid context overflow
        if (history.size() > MAX_HISTORY_SIZE) {
            history.removeFirst();
        }
    }
    
    /**
     * Clear session history
     */
    public void clearHistory(String sessionId) {
        sessionHistory.remove(sessionId);
    }
    
    /**
     * Get history size for a session
     */
    public int getHistorySize(String sessionId) {
        return getHistory(sessionId).size();
    }
}
