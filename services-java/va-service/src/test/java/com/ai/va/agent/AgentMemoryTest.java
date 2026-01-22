package com.ai.va.agent;

import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.*;

/**
 * Unit tests for AgentMemory
 */
class AgentMemoryTest {
    
    @Test
    void testGetHistoryForNewSession() {
        AgentMemory memory = new AgentMemory();
        var history = memory.getHistory("new-session");
        
        assertNotNull(history);
        assertTrue(history.isEmpty());
    }
    
    @Test
    void testAddToHistory() {
        AgentMemory memory = new AgentMemory();
        String sessionId = "test-session";
        
        memory.addToHistory(sessionId, "User: Hello");
        memory.addToHistory(sessionId, "Assistant: Hi there!");
        
        var history = memory.getHistory(sessionId);
        assertEquals(2, history.size());
    }
    
    @Test
    void testHistoryPruning() {
        AgentMemory memory = new AgentMemory();
        String sessionId = "test-session";
        
        // Add 60 messages (exceeds MAX_HISTORY_SIZE of 50)
        for (int i = 0; i < 60; i++) {
            memory.addToHistory(sessionId, "Message " + i);
        }
        
        var history = memory.getHistory(sessionId);
        
        // Should only keep 50 most recent messages
        assertEquals(50, history.size());
        
        // First message should be "Message 10" (0-9 were pruned)
        assertTrue(history.getFirst().contains("Message 10"));
    }
    
    @Test
    void testClearHistory() {
        AgentMemory memory = new AgentMemory();
        String sessionId = "test-session";
        
        memory.addToHistory(sessionId, "User: Hello");
        memory.clearHistory(sessionId);
        
        var history = memory.getHistory(sessionId);
        assertTrue(history.isEmpty());
    }
    
    @Test
    void testGetHistorySize() {
        AgentMemory memory = new AgentMemory();
        String sessionId = "test-session";
        
        assertEquals(0, memory.getHistorySize(sessionId));
        
        memory.addToHistory(sessionId, "User: Hello");
        assertEquals(1, memory.getHistorySize(sessionId));
        
        memory.addToHistory(sessionId, "Assistant: Hi!");
        assertEquals(2, memory.getHistorySize(sessionId));
    }
    
    @Test
    void testMultipleSessions() {
        AgentMemory memory = new AgentMemory();
        
        memory.addToHistory("session-1", "Session 1 Message");
        memory.addToHistory("session-2", "Session 2 Message");
        
        assertEquals(1, memory.getHistorySize("session-1"));
        assertEquals(1, memory.getHistorySize("session-2"));
        
        // Clear one session shouldn't affect the other
        memory.clearHistory("session-1");
        assertEquals(0, memory.getHistorySize("session-1"));
        assertEquals(1, memory.getHistorySize("session-2"));
    }
}
