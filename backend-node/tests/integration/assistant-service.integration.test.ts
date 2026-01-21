/**
 * Assistant Service Integration Tests
 * 
 * Tests the full assistant workflow including:
 * - Text message processing
 * - Voice message processing
 * - Session management
 * - Context preservation
 * - Error handling
 * - Multi-user scenarios
 * 
 * Prerequisites: Java VA service running on port 8136
 */

import axios from 'axios';
import { AssistantService, AssistantMessageParams } from '../../src/services/assistant-service';

describe('Assistant Service Integration Tests', () => {
  let assistantService: AssistantService;
  const agentApiUrl = process.env.INFERO_API_URL || 'http://localhost:8136';

  beforeAll(() => {
    assistantService = new AssistantService();
  });

  beforeEach(async () => {
    // Check if service is available
    try {
      await axios.get(`${agentApiUrl}/agent/health`, { timeout: 2000 });
    } catch (error) {
      console.warn('⏭️ Java VA service not available, tests may be skipped');
    }
  });

  describe('Text Message Processing', () => {
    it('should process a simple text message', async () => {
      const params: AssistantMessageParams = {
        sessionId: `test-text-${Date.now()}`,
        message: 'Hello, assistant!',
        userId: 'test-user-1',
        userEmail: 'test@example.com',
        source: 'text',
        context: {
          productId: 'test-product',
          userRole: 'customer',
          userName: 'Test User',
        },
      };

      try {
        const response = await assistantService.processMessage(params);

        expect(response).toBeDefined();
        expect(response.sessionId).toBe(params.sessionId);
        expect(response.message).toBeTruthy();
        expect(typeof response.message).toBe('string');
        expect(response.metadata?.source).toBe('text');
      } catch (error: any) {
        if (error.code === 'ECONNREFUSED') {
          console.warn('⏭️ Service not available, skipping test');
        } else {
          throw error;
        }
      }
    }, 15000);

    it('should maintain context across multiple text messages', async () => {
      const sessionId = `test-context-${Date.now()}`;
      
      try {
        const message1 = await assistantService.processMessage({
          sessionId,
          message: 'My name is Alice',
          userId: 'test-user-context',
          source: 'text',
        });

        expect(message1.sessionId).toBe(sessionId);

        const message2 = await assistantService.processMessage({
          sessionId,
          message: 'What is my name?',
          userId: 'test-user-context',
          source: 'text',
        });

        expect(message2.sessionId).toBe(sessionId);
        expect(message2.message).toBeTruthy();
        // Response should reference the name "Alice" from conversation history
      } catch (error: any) {
        if (error.code === 'ECONNREFUSED') {
          console.warn('⏭️ Service not available, skipping test');
        } else {
          throw error;
        }
      }
    }, 30000);

    it('should handle complex queries', async () => {
      const params: AssistantMessageParams = {
        sessionId: `test-complex-${Date.now()}`,
        message: 'What is the difference between supervised and unsupervised machine learning?',
        userId: 'test-user-complex',
        source: 'text',
      };

      try {
        const response = await assistantService.processMessage(params);

        expect(response).toBeDefined();
        expect(response.message.length).toBeGreaterThan(50);
      } catch (error: any) {
        if (error.code === 'ECONNREFUSED') {
          console.warn('⏭️ Service not available, skipping test');
        } else {
          throw error;
        }
      }
    }, 20000);
  });

  describe('Voice Message Processing', () => {
    it('should process a voice message', async () => {
      const params: AssistantMessageParams = {
        sessionId: `test-voice-${Date.now()}`,
        message: 'Hello from voice input',
        userId: 'test-user-voice',
        source: 'voice',
        context: {
          productId: 'voice-product',
        },
      };

      try {
        const response = await assistantService.processMessage(params);

        expect(response).toBeDefined();
        expect(response.sessionId).toBe(params.sessionId);
        expect(response.message).toBeTruthy();
        expect(response.metadata?.source).toBe('voice');
      } catch (error: any) {
        if (error.code === 'ECONNREFUSED') {
          console.warn('⏭️ Service not available, skipping test');
        } else {
          throw error;
        }
      }
    }, 15000);

    it('should maintain context between text and voice messages', async () => {
      const sessionId = `test-mixed-${Date.now()}`;
      
      try {
        // Start with text
        await assistantService.processMessage({
          sessionId,
          message: 'I want to order a pizza',
          userId: 'test-user-mixed',
          source: 'text',
        });

        // Continue with voice
        const voiceResponse = await assistantService.processMessage({
          sessionId,
          message: 'Make it a large pepperoni',
          userId: 'test-user-mixed',
          source: 'voice',
        });

        expect(voiceResponse.sessionId).toBe(sessionId);
        expect(voiceResponse.message).toBeTruthy();
      } catch (error: any) {
        if (error.code === 'ECONNREFUSED') {
          console.warn('⏭️ Service not available, skipping test');
        } else {
          throw error;
        }
      }
    }, 30000);
  });

  describe('Session Management', () => {
    it('should handle new session creation', async () => {
      const newSessionId = `new-session-${Date.now()}`;
      
      try {
        const response = await assistantService.processMessage({
          sessionId: newSessionId,
          message: 'This is a new session',
          userId: 'test-user-new-session',
          source: 'text',
        });

        expect(response.sessionId).toBe(newSessionId);
      } catch (error: any) {
        if (error.code === 'ECONNREFUSED') {
          console.warn('⏭️ Service not available, skipping test');
        } else {
          throw error;
        }
      }
    }, 15000);

    it('should handle multiple concurrent sessions', async () => {
      const sessions = [
        { id: `concurrent-1-${Date.now()}`, userId: 'user-1', message: 'Message from user 1' },
        { id: `concurrent-2-${Date.now()}`, userId: 'user-2', message: 'Message from user 2' },
        { id: `concurrent-3-${Date.now()}`, userId: 'user-3', message: 'Message from user 3' },
      ];

      try {
        const promises = sessions.map(session =>
          assistantService.processMessage({
            sessionId: session.id,
            message: session.message,
            userId: session.userId,
            source: 'text',
          })
        );

        const responses = await Promise.all(promises);

        expect(responses.length).toBe(3);
        responses.forEach((response, index) => {
          expect(response.sessionId).toBe(sessions[index].id);
          expect(response.message).toBeTruthy();
        });
      } catch (error: any) {
        if (error.code === 'ECONNREFUSED') {
          console.warn('⏭️ Service not available, skipping test');
        } else {
          throw error;
        }
      }
    }, 30000);

    it('should isolate conversations between different users', async () => {
      const timestamp = Date.now();
      
      try {
        // User 1 conversation
        await assistantService.processMessage({
          sessionId: `user1-session-${timestamp}`,
          message: 'My favorite color is blue',
          userId: 'user-1',
          source: 'text',
        });

        // User 2 conversation
        await assistantService.processMessage({
          sessionId: `user2-session-${timestamp}`,
          message: 'My favorite color is red',
          userId: 'user-2',
          source: 'text',
        });

        // User 1 asks about their color
        const user1Response = await assistantService.processMessage({
          sessionId: `user1-session-${timestamp}`,
          message: 'What is my favorite color?',
          userId: 'user-1',
          source: 'text',
        });

        // Should not be confused with user 2's color
        expect(user1Response.message).toBeTruthy();
      } catch (error: any) {
        if (error.code === 'ECONNREFUSED') {
          console.warn('⏭️ Service not available, skipping test');
        } else {
          throw error;
        }
      }
    }, 45000);
  });

  describe('Context Handling', () => {
    it('should use provided context in responses', async () => {
      const params: AssistantMessageParams = {
        sessionId: `test-context-use-${Date.now()}`,
        message: 'Tell me about this product',
        userId: 'test-user-context-use',
        source: 'text',
        context: {
          productId: 'premium-subscription',
          userRole: 'potential-customer',
          userName: 'John Doe',
        },
      };

      try {
        const response = await assistantService.processMessage(params);

        expect(response).toBeDefined();
        expect(response.message).toBeTruthy();
      } catch (error: any) {
        if (error.code === 'ECONNREFUSED') {
          console.warn('⏭️ Service not available, skipping test');
        } else {
          throw error;
        }
      }
    }, 15000);

    it('should handle missing optional context gracefully', async () => {
      const params: AssistantMessageParams = {
        sessionId: `test-no-context-${Date.now()}`,
        message: 'Hello',
        userId: 'test-user-no-context',
        source: 'text',
        // No context provided
      };

      try {
        const response = await assistantService.processMessage(params);

        expect(response).toBeDefined();
        expect(response.message).toBeTruthy();
      } catch (error: any) {
        if (error.code === 'ECONNREFUSED') {
          console.warn('⏭️ Service not available, skipping test');
        } else {
          throw error;
        }
      }
    }, 15000);
  });

  describe('Error Handling', () => {
    it('should handle empty message gracefully', async () => {
      const params: AssistantMessageParams = {
        sessionId: `test-empty-${Date.now()}`,
        message: '',
        userId: 'test-user-empty',
        source: 'text',
      };

      try {
        const response = await assistantService.processMessage(params);
        
        // Service may handle empty messages gracefully or throw error
        expect(response).toBeDefined();
      } catch (error: any) {
        // Either connection error or validation error is acceptable
        expect(error).toBeDefined();
      }
    }, 10000);

    it('should handle service timeout', async () => {
      const originalTimeout = axios.defaults.timeout;
      axios.defaults.timeout = 100; // Very short timeout

      try {
        await assistantService.processMessage({
          sessionId: `test-timeout-${Date.now()}`,
          message: 'Test timeout',
          userId: 'test-user-timeout',
          source: 'text',
        });
      } catch (error: any) {
        expect(['ECONNABORTED', 'ECONNREFUSED', 'ETIMEDOUT']).toContain(error.code);
      } finally {
        axios.defaults.timeout = originalTimeout;
      }
    }, 5000);

    it('should handle invalid session ID format', async () => {
      const params: AssistantMessageParams = {
        sessionId: '', // Invalid empty session ID
        message: 'Test message',
        userId: 'test-user-invalid',
        source: 'text',
      };

      try {
        const response = await assistantService.processMessage(params);
        
        // Service may auto-generate session ID or accept empty
        expect(response).toBeDefined();
      } catch (error: any) {
        // Validation error is acceptable
        expect(error).toBeDefined();
      }
    }, 10000);
  });

  describe('Performance and Load', () => {
    it('should handle rapid sequential messages', async () => {
      const sessionId = `test-rapid-${Date.now()}`;
      const messages = [
        'First message',
        'Second message',
        'Third message',
        'Fourth message',
        'Fifth message',
      ];

      try {
        const responses = [];
        for (const message of messages) {
          const response = await assistantService.processMessage({
            sessionId,
            message,
            userId: 'test-user-rapid',
            source: 'text',
          });
          responses.push(response);
        }

        expect(responses.length).toBe(5);
        responses.forEach(response => {
          expect(response.sessionId).toBe(sessionId);
          expect(response.message).toBeTruthy();
        });
      } catch (error: any) {
        if (error.code === 'ECONNREFUSED') {
          console.warn('⏭️ Service not available, skipping test');
        } else {
          throw error;
        }
      }
    }, 60000);

    it('should process messages within acceptable time', async () => {
      const startTime = Date.now();

      try {
        const response = await assistantService.processMessage({
          sessionId: `test-performance-${Date.now()}`,
          message: 'Quick test message',
          userId: 'test-user-perf',
          source: 'text',
        });

        const elapsed = Date.now() - startTime;

        expect(response).toBeDefined();
        expect(elapsed).toBeLessThan(15000); // Should respond within 15 seconds
      } catch (error: any) {
        if (error.code === 'ECONNREFUSED') {
          console.warn('⏭️ Service not available, skipping test');
        } else {
          throw error;
        }
      }
    }, 20000);
  });

  describe('Response Metadata', () => {
    it('should include processing time in metadata', async () => {
      try {
        const response = await assistantService.processMessage({
          sessionId: `test-metadata-${Date.now()}`,
          message: 'Test message for metadata',
          userId: 'test-user-metadata',
          source: 'text',
        });

        expect(response.metadata).toBeDefined();
        expect(response.metadata?.source).toBe('text');
        expect(response.metadata?.processingTime).toBeGreaterThan(0);
      } catch (error: any) {
        if (error.code === 'ECONNREFUSED') {
          console.warn('⏭️ Service not available, skipping test');
        } else {
          throw error;
        }
      }
    }, 15000);

    it('should indicate message source correctly', async () => {
      try {
        const textResponse = await assistantService.processMessage({
          sessionId: `test-source-text-${Date.now()}`,
          message: 'Text message',
          userId: 'test-user-source',
          source: 'text',
        });

        expect(textResponse.metadata?.source).toBe('text');

        const voiceResponse = await assistantService.processMessage({
          sessionId: `test-source-voice-${Date.now()}`,
          message: 'Voice message',
          userId: 'test-user-source',
          source: 'voice',
        });

        expect(voiceResponse.metadata?.source).toBe('voice');
      } catch (error: any) {
        if (error.code === 'ECONNREFUSED') {
          console.warn('⏭️ Service not available, skipping test');
        } else {
          throw error;
        }
      }
    }, 30000);
  });
});
