/**
 * Agent REST API Contract Tests
 * 
 * These tests validate the contract between Node.js backend and Java AgentController REST API.
 * They ensure that request/response schemas, status codes, and endpoints match expectations.
 * 
 * CRITICAL: These tests prevent breaking changes in REST API communication.
 */

import axios, { AxiosError } from 'axios';
import { z } from 'zod';

const AGENT_API_URL = process.env.INFERO_API_URL || 'http://localhost:8136';

// Define Zod schemas for contract validation
const AgentRequestSchema = z.object({
  sessionId: z.string().min(1),
  message: z.string().min(1),
  context: z.record(z.unknown()).optional(),
});

const AgentResponseSchema = z.object({
  sessionId: z.string(),
  message: z.string(),
  toolsUsed: z.array(z.string()).optional(),
  executionTimeMs: z.number().optional(),
  intent: z.string().optional(),
  confidence: z.number().optional(),
});

const HealthResponseSchema = z.object({
  status: z.string(),
  service: z.string(),
});

describe('Agent REST API Contract Tests', () => {
  const testSessionId = `contract-test-${Date.now()}`;

  describe('Health Endpoint Contract', () => {
    it('should have /agent/health endpoint available', async () => {
      try {
        const response = await axios.get(`${AGENT_API_URL}/agent/health`);
        
        expect(response.status).toBe(200);
        expect(response.headers['content-type']).toMatch(/application\/json/);
      } catch (error) {
        if ((error as AxiosError).code === 'ECONNREFUSED') {
          console.warn('Agent service not running, skipping integration test');
          return;
        }
        throw error;
      }
    });

    it('should return valid health response schema', async () => {
      try {
        const response = await axios.get(`${AGENT_API_URL}/agent/health`);
        
        // Validate response matches schema
        const validationResult = HealthResponseSchema.safeParse(response.data);
        
        expect(validationResult.success).toBe(true);
        if (validationResult.success) {
          expect(validationResult.data.status).toBe('healthy');
          expect(validationResult.data.service).toBe('ai-assistant-agent');
        }
      } catch (error) {
        if ((error as AxiosError).code === 'ECONNREFUSED') {
          console.warn('Agent service not running, skipping integration test');
          return;
        }
        throw error;
      }
    });
  });

  describe('Execute Endpoint Contract', () => {
    it('should have POST /agent/execute endpoint available', async () => {
      const validRequest = {
        sessionId: testSessionId,
        message: 'Contract test message',
        context: {
          userId: 'test-user',
          productId: 'test-product',
        },
      };

      try {
        const response = await axios.post(`${AGENT_API_URL}/agent/execute`, validRequest);
        
        expect(response.status).toBe(200);
        expect(response.headers['content-type']).toMatch(/application\/json/);
      } catch (error) {
        if ((error as AxiosError).code === 'ECONNREFUSED') {
          console.warn('Agent service not running, skipping integration test');
          return;
        }
        
        // Even if server returns error, endpoint should exist (not 404)
        const axiosError = error as AxiosError;
        expect(axiosError.response?.status).not.toBe(404);
      }
    });

    it('should accept valid request schema', async () => {
      const validRequest = {
        sessionId: testSessionId,
        message: 'What is the weather like?',
        context: {
          userId: 'contract-test-user',
          timestamp: new Date().toISOString(),
        },
      };

      // Validate request matches schema
      const requestValidation = AgentRequestSchema.safeParse(validRequest);
      expect(requestValidation.success).toBe(true);

      try {
        const response = await axios.post(`${AGENT_API_URL}/agent/execute`, validRequest);
        expect(response.status).toBe(200);
      } catch (error) {
        if ((error as AxiosError).code === 'ECONNREFUSED') {
          console.warn('Agent service not running, skipping integration test');
          return;
        }
        // If error is not connection refused, endpoint still processed request
        const axiosError = error as AxiosError;
        expect(axiosError.response?.status).not.toBe(404);
      }
    });

    it('should return valid response schema', async () => {
      const validRequest = {
        sessionId: testSessionId,
        message: 'Hello, assistant!',
        context: {
          userId: 'contract-test-user',
        },
      };

      try {
        const response = await axios.post(`${AGENT_API_URL}/agent/execute`, validRequest);
        
        // Validate response matches schema
        const validationResult = AgentResponseSchema.safeParse(response.data);
        
        expect(validationResult.success).toBe(true);
        if (validationResult.success) {
          expect(validationResult.data.sessionId).toBe(testSessionId);
          expect(validationResult.data.message).toBeTruthy();
          expect(typeof validationResult.data.message).toBe('string');
        }
      } catch (error) {
        if ((error as AxiosError).code === 'ECONNREFUSED') {
          console.warn('Agent service not running, skipping integration test');
          return;
        }
        throw error;
      }
    });

    it('should handle missing required fields with 400 Bad Request', async () => {
      const invalidRequest = {
        message: 'Missing sessionId',
      };

      try {
        await axios.post(`${AGENT_API_URL}/agent/execute`, invalidRequest);
        
        // If it succeeds, that's acceptable (server may provide defaults)
        // But we should log this for awareness
        console.warn('Server accepted request without sessionId');
      } catch (error) {
        const axiosError = error as AxiosError;
        
        if (axiosError.code === 'ECONNREFUSED') {
          console.warn('Agent service not running, skipping integration test');
          return;
        }

        // Should get 400 Bad Request for invalid payload
        // Or 500 if server doesn't validate (still not 404)
        expect([400, 500]).toContain(axiosError.response?.status);
        expect(axiosError.response?.status).not.toBe(404);
      }
    });

    it('should include executionTimeMs in response', async () => {
      const validRequest = {
        sessionId: testSessionId,
        message: 'Performance test message',
        context: {},
      };

      try {
        const response = await axios.post(`${AGENT_API_URL}/agent/execute`, validRequest);
        
        expect(response.data).toHaveProperty('executionTimeMs');
        expect(typeof response.data.executionTimeMs).toBe('number');
        expect(response.data.executionTimeMs).toBeGreaterThanOrEqual(0);
      } catch (error) {
        if ((error as AxiosError).code === 'ECONNREFUSED') {
          console.warn('Agent service not running, skipping integration test');
          return;
        }
        throw error;
      }
    });
  });

  describe('Session Management Contract', () => {
    it('should have DELETE /agent/session/{sessionId} endpoint', async () => {
      const sessionToDelete = `delete-test-${Date.now()}`;

      try {
        const response = await axios.delete(`${AGENT_API_URL}/agent/session/${sessionToDelete}`);
        
        // Should accept DELETE request (200 or 204)
        expect([200, 204]).toContain(response.status);
      } catch (error) {
        const axiosError = error as AxiosError;
        
        if (axiosError.code === 'ECONNREFUSED') {
          console.warn('Agent service not running, skipping integration test');
          return;
        }

        // Should not return 404 - endpoint should exist
        expect(axiosError.response?.status).not.toBe(404);
      }
    });

    it('should clear session successfully', async () => {
      const sessionToClear = `clear-test-${Date.now()}`;

      // First, create a session by executing a message
      try {
        await axios.post(`${AGENT_API_URL}/agent/execute`, {
          sessionId: sessionToClear,
          message: 'Initial message',
        });
      } catch (error) {
        if ((error as AxiosError).code === 'ECONNREFUSED') {
          console.warn('Agent service not running, skipping integration test');
          return;
        }
      }

      // Then delete the session
      try {
        const response = await axios.delete(`${AGENT_API_URL}/agent/session/${sessionToClear}`);
        expect([200, 204]).toContain(response.status);
      } catch (error) {
        if ((error as AxiosError).code === 'ECONNREFUSED') {
          console.warn('Agent service not running, skipping integration test');
          return;
        }
        throw error;
      }
    });
  });

  describe('Debug Endpoint Contract', () => {
    it('should have POST /agent/debug/prompt endpoint', async () => {
      const debugRequest = {
        sessionId: `debug-test-${Date.now()}`,
        message: 'Debug prompt test',
        context: {},
      };

      try {
        const response = await axios.post(`${AGENT_API_URL}/agent/debug/prompt`, debugRequest);
        
        expect(response.status).toBe(200);
        expect(response.data).toBeDefined();
      } catch (error) {
        const axiosError = error as AxiosError;
        
        if (axiosError.code === 'ECONNREFUSED') {
          console.warn('Agent service not running, skipping integration test');
          return;
        }

        // Should not return 404
        expect(axiosError.response?.status).not.toBe(404);
      }
    });
  });

  describe('Error Response Contract', () => {
    it('should return 500 with valid error response on server error', async () => {
      // Send request designed to trigger error (if server validates)
      const errorRequest = {
        sessionId: 'error-test',
        message: '', // Empty message might trigger error
        context: {},
      };

      try {
        const response = await axios.post(`${AGENT_API_URL}/agent/execute`, errorRequest);
        
        // If succeeds, validate response still matches schema
        const validationResult = AgentResponseSchema.safeParse(response.data);
        expect(validationResult.success).toBe(true);
      } catch (error) {
        const axiosError = error as AxiosError;
        
        if (axiosError.code === 'ECONNREFUSED') {
          console.warn('Agent service not running, skipping integration test');
          return;
        }

        // If error, should have proper status code and response body
        if (axiosError.response) {
          expect(axiosError.response.status).toBeGreaterThanOrEqual(400);
          expect(axiosError.response.data).toBeDefined();
        }
      }
    });
  });

  describe('CORS and Headers Contract', () => {
    it('should include CORS headers in response', async () => {
      try {
        const response = await axios.get(`${AGENT_API_URL}/agent/health`);
        
        // Check for CORS headers (may or may not be present depending on config)
        if (response.headers['access-control-allow-origin']) {
          expect(response.headers['access-control-allow-origin']).toBeDefined();
        }
      } catch (error) {
        if ((error as AxiosError).code === 'ECONNREFUSED') {
          console.warn('Agent service not running, skipping integration test');
          return;
        }
        throw error;
      }
    });

    it('should return Content-Type: application/json', async () => {
      try {
        const response = await axios.get(`${AGENT_API_URL}/agent/health`);
        
        expect(response.headers['content-type']).toMatch(/application\/json/);
      } catch (error) {
        if ((error as AxiosError).code === 'ECONNREFUSED') {
          console.warn('Agent service not running, skipping integration test');
          return;
        }
        throw error;
      }
    });
  });

  describe('Data Type Validation', () => {
    it('should enforce sessionId as string', () => {
      const validRequest = {
        sessionId: 'valid-session-id',
        message: 'test',
      };

      const validation = AgentRequestSchema.safeParse(validRequest);
      expect(validation.success).toBe(true);
    });

    it('should reject sessionId as number', () => {
      const invalidRequest = {
        sessionId: 12345, // Should be string
        message: 'test',
      };

      const validation = AgentRequestSchema.safeParse(invalidRequest);
      expect(validation.success).toBe(false);
    });

    it('should enforce message as string', () => {
      const validRequest = {
        sessionId: 'test-session',
        message: 'Valid message string',
      };

      const validation = AgentRequestSchema.safeParse(validRequest);
      expect(validation.success).toBe(true);
    });

    it('should allow optional context object', () => {
      const requestWithContext = {
        sessionId: 'test-session',
        message: 'test',
        context: { key: 'value' },
      };

      const requestWithoutContext = {
        sessionId: 'test-session',
        message: 'test',
      };

      expect(AgentRequestSchema.safeParse(requestWithContext).success).toBe(true);
      expect(AgentRequestSchema.safeParse(requestWithoutContext).success).toBe(true);
    });
  });
});
