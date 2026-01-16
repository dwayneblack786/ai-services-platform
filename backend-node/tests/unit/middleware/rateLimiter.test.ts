/**
 * Unit Tests for Rate Limiter Middleware
 * Tests stream rate limiting and token tracking
 */

import { Request, Response, NextFunction } from 'express';
import {
  streamRateLimiter,
  trackTokenUsage,
  checkTokenLimit,
  getUserStats,
  getRateLimiterConfig
} from '../../../src/middleware/rateLimiter';

// Mock config/env module
jest.mock('../../../src/config/env', () => ({
  env: {
    RATE_LIMIT_ENABLED: true,
    RATE_LIMIT_CONCURRENT_STREAMS: 5,
    RATE_LIMIT_MESSAGES_PER_HOUR: 100,
    RATE_LIMIT_MESSAGES_PER_DAY: 1000,
    RATE_LIMIT_TOKENS_PER_DAY: 100000,
    NODE_ENV: 'test',
    PORT: 3001,
    MONGODB_URI: 'mongodb://localhost:27017/test',
    SESSION_SECRET: 'test-secret-key-minimum-32-characters-long',
    FRONTEND_URL: 'http://localhost:3000',
    BACKEND_URL: 'http://localhost:3001',
    GOOGLE_CLIENT_ID: 'test-client-id',
    GOOGLE_CLIENT_SECRET: 'test-client-secret',
    GOOGLE_CALLBACK_URL: 'http://localhost:3001/api/auth/google/callback',
    JWT_SECRET: 'test-jwt-secret-minimum-32-characters-long',
    JWT_EXPIRES_IN: '7d',
    SESSION_MAX_AGE: 604800000,
    CORS_ORIGINS: 'http://localhost:3000',
    REDIS_URL: 'redis://localhost:6379',
    LOG_LEVEL: 'info',
    SESSION_COOKIE_SECURE: false,
    SESSION_COOKIE_HTTP_ONLY: true,
    SESSION_COOKIE_SAME_SITE: 'lax' as const,
    GRPC_VA_SERVICE_URL: 'localhost:50051'
  },
  validateEnv: jest.fn()
}));

// Mock logger - logger is a default export
jest.mock('../../../src/utils/logger', () => {
  const mockLogger = {
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn()
  };
  return mockLogger;
});

describe('Rate Limiter Middleware', () => {
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let nextFunction: NextFunction;

  const testUser = {
    id: 'user-123',
    email: 'test@example.com',
    name: 'Test User',
    role: 'user' as const,
    tenantId: 'tenant-123',
    emailVerified: true,
    companyDetailsCompleted: true,
    picture: ''
  };

  beforeEach(() => {
    jest.clearAllMocks();
    
    mockRequest = {
      user: testUser,
      originalUrl: '/api/chat/message',
      ip: '127.0.0.1'
    };

    mockResponse = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
      on: jest.fn()
    };

    nextFunction = jest.fn();
  });

  describe('streamRateLimiter Middleware', () => {
    it('should call next() when under rate limits', async () => {
      streamRateLimiter(
        mockRequest as Request,
        mockResponse as Response,
        nextFunction
      );

      expect(nextFunction).toHaveBeenCalled();
      expect(mockResponse.status).not.toHaveBeenCalled();
    });

    it('should handle missing user', async () => {
      mockRequest.user = undefined;

      streamRateLimiter(
        mockRequest as Request,
        mockResponse as Response,
        nextFunction
      );

      // Should handle gracefully (will use 'anonymous' user)
      expect(nextFunction).toHaveBeenCalled();
    });

    it('should register response handlers for cleanup', () => {
      streamRateLimiter(
        mockRequest as Request,
        mockResponse as Response,
        nextFunction
      );

      expect(mockResponse.on).toHaveBeenCalledWith('close', expect.any(Function));
      expect(mockResponse.on).toHaveBeenCalledWith('finish', expect.any(Function));
    });
  });

  describe('trackTokenUsage', () => {
    it('should track token usage', () => {
      expect(() => trackTokenUsage(testUser.id, 1500)).not.toThrow();
    });

    it('should handle zero tokens', () => {
      expect(() => trackTokenUsage(testUser.id, 0)).not.toThrow();
    });

    it('should handle large token counts', () => {
      expect(() => trackTokenUsage(testUser.id, 50000)).not.toThrow();
    });
  });

  describe('checkTokenLimit', () => {
    it('should return boolean', () => {
      const result = checkTokenLimit(testUser.id);
      expect(typeof result).toBe('boolean');
    });

    it('should return true for user under limit', () => {
      const result = checkTokenLimit('new-user-456');
      expect(result).toBe(true);
    });
  });

  describe('getUserStats', () => {
    it('should return stats with correct structure', () => {
      const stats = getUserStats(testUser.id);

      expect(stats).toBeDefined();
      expect(stats.concurrentStreams).toBeDefined();
      expect(stats.concurrentStreams.current).toBeDefined();
      expect(stats.concurrentStreams.max).toBeDefined();
      expect(stats.messagesThisHour).toBeDefined();
      expect(stats.messagesThisHour.current).toBeDefined();
      expect(stats.messagesThisHour.max).toBeDefined();
      expect(stats.messagesToday).toBeDefined();
      expect(stats.messagesToday.current).toBeDefined();
      expect(stats.messagesToday.max).toBeDefined();
      expect(stats.tokensToday).toBeDefined();
      expect(stats.tokensToday.current).toBeDefined();
      expect(stats.tokensToday.max).toBeDefined();
    });

    it('should return zero counts for new user', () => {
      const stats = getUserStats('new-user-789');

      expect(stats.concurrentStreams.current).toBe(0);
      expect(stats.messagesThisHour.current).toBe(0);
      expect(stats.messagesToday.current).toBe(0);
      expect(stats.tokensToday.current).toBe(0);
    });
  });

  describe('getRateLimiterConfig', () => {
    it('should return configuration object', () => {
      const config = getRateLimiterConfig();

      expect(config).toBeDefined();
      expect(typeof config).toBe('object');
      expect(config.maxConcurrentStreams).toBeDefined();
      expect(config.maxMessagesPerHour).toBeDefined();
      expect(config.maxMessagesPerDay).toBeDefined();
      expect(config.maxTokensPerDay).toBeDefined();
      expect(config.enabled).toBeDefined();
      expect(config.totalUsers).toBeDefined();
      expect(config.activeStreams).toBeDefined();
    });

    it('should include statistics', () => {
      const config = getRateLimiterConfig();

      expect(typeof config.totalUsers).toBe('number');
      expect(typeof config.activeStreams).toBe('number');
    });
  });

  describe('Integration Tests', () => {
    it('should track message count after allowing request', () => {
      const statsBefore = getUserStats(testUser.id);

      streamRateLimiter(
        mockRequest as Request,
        mockResponse as Response,
        nextFunction
      );

      const statsAfter = getUserStats(testUser.id);
      expect(statsAfter.messagesThisHour.current).toBeGreaterThan(statsBefore.messagesThisHour.current);
    });

    it('should track tokens after usage', () => {
      // Use unique user ID to avoid pollution from previous tests
      const uniqueUserId = 'token-test-user-999';
      trackTokenUsage(uniqueUserId, 1000);
      const stats = getUserStats(uniqueUserId);

      expect(stats.tokensToday.current).toBe(1000);
    });
  });
});
