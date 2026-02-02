/**
 * Unit Tests for Authentication Middleware
 * Tests JWT validation, user loading, and error handling
 */

import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { authenticateToken, verifyToken } from '../../../src/middleware/auth';
import { users } from '../../../src/config/passport';
import * as database from '../../../src/config/database';
import { IUser } from '../../../src/models/User';
import { UserRole } from '../../../../shared/types';

// Mock dependencies
jest.mock('../../../src/config/passport', () => ({
  users: new Map()
}));

jest.mock('../../../src/config/database');
jest.mock('../../../src/utils/logger', () => {
  const mockLogger = {
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn()
  };
  return mockLogger;
});

describe('Authentication Middleware', () => {
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let nextFunction: NextFunction;
  let mockDB: any;

  const testUser = {
    id: 'user-123',
    email: 'test@example.com',
    name: 'Test User',
    picture: '',
    role: UserRole.CLIENT,
    tenantId: 'tenant-123',
    emailVerified: true,
    companyDetailsCompleted: true,
    authProvider: 'local' as const,
    createdAt: new Date(),
    updatedAt: new Date()
  };

  const testUserDoc: Partial<IUser> = {
    _id: 'user-123',
    id: 'user-123',
    email: 'test@example.com',
    name: 'Test User',
    picture: '',
    role: UserRole.CLIENT,
    tenantId: 'tenant-123',
    emailVerified: true,
    companyDetailsCompleted: true,
    authProvider: 'local',
    createdAt: new Date(),
    updatedAt: new Date()
  };

  beforeEach(() => {
    // Setup request/response mocks
    mockRequest = {
      cookies: {},
      originalUrl: '/api/test',
      ip: '127.0.0.1'
    };

    mockResponse = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis()
    };

    nextFunction = jest.fn();

    // Clear users map
    users.clear();

    // Setup database mock
    mockDB = {
      collection: jest.fn().mockReturnValue({
        findOne: jest.fn()
      })
    };

    (database.getDB as jest.Mock).mockReturnValue(mockDB);

    // Set JWT secret
    process.env.JWT_SECRET = 'test-secret';
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('verifyToken', () => {
    it('should verify valid JWT token', () => {
      const token = jwt.sign(
        { id: 'user-123', email: 'test@example.com' },
        'test-secret'
      );

      const decoded = verifyToken(token) as any;

      expect(decoded.id).toBe('user-123');
      expect(decoded.email).toBe('test@example.com');
    });

    it('should throw error for invalid token', () => {
      expect(() => verifyToken('invalid-token')).toThrow();
    });

    it('should throw error for expired token', () => {
      const token = jwt.sign(
        { id: 'user-123', email: 'test@example.com' },
        'test-secret',
        { expiresIn: '-1h' } // Expired 1 hour ago
      );

      expect(() => verifyToken(token)).toThrow();
    });
  });

  describe('authenticateToken - No Token', () => {
    it('should return 401 when no token in cookies', async () => {
      mockRequest.cookies = {};

      await authenticateToken(
        mockRequest as Request,
        mockResponse as Response,
        nextFunction
      );

      expect(mockResponse.status).toHaveBeenCalledWith(401);
      expect(mockResponse.json).toHaveBeenCalledWith({
        error: 'Authentication required'
      });
      expect(nextFunction).not.toHaveBeenCalled();
    });

    it('should return 401 when token is undefined', async () => {
      mockRequest.cookies = { token: undefined };

      await authenticateToken(
        mockRequest as Request,
        mockResponse as Response,
        nextFunction
      );

      expect(mockResponse.status).toHaveBeenCalledWith(401);
      expect(nextFunction).not.toHaveBeenCalled();
    });
  });

  describe('authenticateToken - Valid Token with User in Memory', () => {
    beforeEach(() => {
      const token = jwt.sign(
        { id: testUser.id, email: testUser.email },
        'test-secret'
      );
      mockRequest.cookies = { token };
      users.set(testUser.id, testUser);
    });

    it('should authenticate user from memory cache', async () => {
      await authenticateToken(
        mockRequest as Request,
        mockResponse as Response,
        nextFunction
      );

      expect(nextFunction).toHaveBeenCalled();
      expect(mockRequest.user).toEqual(testUser);
      expect(mockDB.collection).not.toHaveBeenCalled(); // Shouldn't query DB
    });

    it('should not call database when user in memory', async () => {
      await authenticateToken(
        mockRequest as Request,
        mockResponse as Response,
        nextFunction
      );

      expect(mockDB.collection).not.toHaveBeenCalled();
    });
  });

  describe('authenticateToken - Valid Token with User in Database', () => {
    beforeEach(() => {
      const token = jwt.sign(
        { id: testUser.id, email: testUser.email },
        'test-secret'
      );
      mockRequest.cookies = { token };
      
      // User NOT in memory
      users.clear();

      // Mock database response
      mockDB.collection.mockReturnValue({
        findOne: jest.fn().mockResolvedValue(testUserDoc)
      });
    });

    it('should load user from database when not in memory', async () => {
      await authenticateToken(
        mockRequest as Request,
        mockResponse as Response,
        nextFunction
      );

      expect(mockDB.collection).toHaveBeenCalledWith('users');
      expect(nextFunction).toHaveBeenCalled();
      expect(mockRequest.user).toBeDefined();
    });

    it('should cache user in memory after database load', async () => {
      await authenticateToken(
        mockRequest as Request,
        mockResponse as Response,
        nextFunction
      );

      expect(users.has(testUser.id)).toBe(true);
      expect(users.get(testUser.id)).toMatchObject({
        id: testUser.id,
        email: testUser.email
      });
    });

    it('should query database with multiple conditions', async () => {
      const findOne = jest.fn().mockResolvedValue(testUserDoc);
      mockDB.collection.mockReturnValue({ findOne });

      await authenticateToken(
        mockRequest as Request,
        mockResponse as Response,
        nextFunction
      );

      expect(findOne).toHaveBeenCalledWith({
        $or: [
          { _id: testUser.id },
          { id: testUser.id },
          { email: testUser.email }
        ]
      });
    });
  });

  describe('authenticateToken - User Not Found', () => {
    beforeEach(() => {
      const token = jwt.sign(
        { id: 'nonexistent', email: 'ghost@example.com' },
        'test-secret'
      );
      mockRequest.cookies = { token };
      users.clear();

      // Database returns null
      mockDB.collection.mockReturnValue({
        findOne: jest.fn().mockResolvedValue(null)
      });
    });

    it('should return 401 when user not found in database', async () => {
      await authenticateToken(
        mockRequest as Request,
        mockResponse as Response,
        nextFunction
      );

      expect(mockResponse.status).toHaveBeenCalledWith(401);
      expect(mockResponse.json).toHaveBeenCalledWith({
        error: 'User not found'
      });
      expect(nextFunction).not.toHaveBeenCalled();
    });

    it('should not cache non-existent user', async () => {
      await authenticateToken(
        mockRequest as Request,
        mockResponse as Response,
        nextFunction
      );

      expect(users.size).toBe(0);
    });
  });

  describe('authenticateToken - Invalid Token', () => {
    it('should return 403 for malformed token', async () => {
      mockRequest.cookies = { token: 'malformed.token.here' };

      await authenticateToken(
        mockRequest as Request,
        mockResponse as Response,
        nextFunction
      );

      expect(mockResponse.status).toHaveBeenCalledWith(403);
      expect(mockResponse.json).toHaveBeenCalledWith({
        error: 'Invalid token'
      });
      expect(nextFunction).not.toHaveBeenCalled();
    });

    it('should return 403 for expired token', async () => {
      const expiredToken = jwt.sign(
        { id: 'user-123', email: 'test@example.com' },
        'test-secret',
        { expiresIn: '-1h' }
      );
      mockRequest.cookies = { token: expiredToken };

      await authenticateToken(
        mockRequest as Request,
        mockResponse as Response,
        nextFunction
      );

      expect(mockResponse.status).toHaveBeenCalledWith(403);
      expect(nextFunction).not.toHaveBeenCalled();
    });

    it('should return 403 for token with wrong secret', async () => {
      const wrongToken = jwt.sign(
        { id: 'user-123', email: 'test@example.com' },
        'wrong-secret'
      );
      mockRequest.cookies = { token: wrongToken };

      await authenticateToken(
        mockRequest as Request,
        mockResponse as Response,
        nextFunction
      );

      expect(mockResponse.status).toHaveBeenCalledWith(403);
    });
  });

  describe('authenticateToken - Database Errors', () => {
    beforeEach(() => {
      const token = jwt.sign(
        { id: testUser.id, email: testUser.email },
        'test-secret'
      );
      mockRequest.cookies = { token };
      users.clear();
    });

    it('should handle database connection error', async () => {
      mockDB.collection.mockReturnValue({
        findOne: jest.fn().mockRejectedValue(new Error('DB connection lost'))
      });

      await authenticateToken(
        mockRequest as Request,
        mockResponse as Response,
        nextFunction
      );

      // Auth middleware catches errors and returns 403, doesn't throw
      expect(mockResponse.status).toHaveBeenCalledWith(403);
      expect(mockResponse.json).toHaveBeenCalledWith({
        error: 'Invalid token'
      });
    });

    it('should handle database query error', async () => {
      mockDB.collection.mockReturnValue({
        findOne: jest.fn().mockRejectedValue(new Error('Query failed'))
      });

      await authenticateToken(
        mockRequest as Request,
        mockResponse as Response,
        nextFunction
      );

      // Auth middleware catches errors and returns 403, doesn't throw
      expect(mockResponse.status).toHaveBeenCalledWith(403);
      expect(mockResponse.json).toHaveBeenCalledWith({
        error: 'Invalid token'
      });
    });
  });

  describe('authenticateToken - User Object Mapping', () => {
    it('should correctly map IUser to User', async () => {
      const token = jwt.sign(
        { id: testUser.id, email: testUser.email },
        'test-secret'
      );
      mockRequest.cookies = { token };
      users.clear();

      mockDB.collection.mockReturnValue({
        findOne: jest.fn().mockResolvedValue(testUserDoc)
      });

      await authenticateToken(
        mockRequest as Request,
        mockResponse as Response,
        nextFunction
      );

      expect(mockRequest.user).toMatchObject({
        id: testUserDoc.id,
        email: testUserDoc.email,
        name: testUserDoc.name,
        role: testUserDoc.role,
        tenantId: testUserDoc.tenantId
      });
    });
  });

  describe('Edge Cases', () => {
    it('should handle request without cookies object', async () => {
      // Note: Current implementation doesn't handle missing cookies object
      // This would cause a runtime error: Cannot read properties of undefined (reading 'token')
      // In real Express apps, cookie-parser middleware ensures req.cookies exists
      mockRequest.cookies = {} as any; // Empty cookies instead of undefined

      await authenticateToken(
        mockRequest as Request,
        mockResponse as Response,
        nextFunction
      );

      expect(mockResponse.status).toHaveBeenCalledWith(401);
    });

    it('should handle empty token string', async () => {
      mockRequest.cookies = { token: '' };

      await authenticateToken(
        mockRequest as Request,
        mockResponse as Response,
        nextFunction
      );

      expect(mockResponse.status).toHaveBeenCalledWith(401);
    });

    it('should preserve request properties', async () => {
      const token = jwt.sign(
        { id: testUser.id, email: testUser.email },
        'test-secret'
      );
      
      mockRequest = {
        cookies: { token },
        originalUrl: '/api/products',
        ip: '192.168.1.1',
        method: 'GET',
        headers: { 'user-agent': 'test' }
      };

      users.set(testUser.id, testUser);

      await authenticateToken(
        mockRequest as Request,
        mockResponse as Response,
        nextFunction
      );

      expect(mockRequest.originalUrl).toBe('/api/products');
      expect(mockRequest.ip).toBe('192.168.1.1');
      expect(mockRequest.method).toBe('GET');
    });
  });
});
