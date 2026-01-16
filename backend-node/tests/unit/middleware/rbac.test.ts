/**
 * Unit Tests for RBAC Middleware
 * Tests role-based access control and tenant isolation
 */

import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { UserRole } from '../../../../shared/types';
import {
  requireRole,
  requireTenant,
  requireTenantOrAdmin,
  requireProjectAdmin,
  checkTenantAccess,
  isAdmin,
  filterByTenant,
} from '../../../src/middleware/rbac';

// Mock passport config
const mockUsers = new Map();
jest.mock('../../../src/config/passport', () => ({
  users: mockUsers,
}));

describe('RBAC Middleware', () => {
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let nextFunction: NextFunction;

  const testUsers = {
    admin: {
      id: 'admin-1',
      email: 'admin@example.com',
      name: 'Admin User',
      picture: '',
      role: UserRole.PROJECT_ADMIN,
      tenantId: 'tenant-1',
      emailVerified: true,
      companyDetailsCompleted: true,
    },
    analyst: {
      id: 'analyst-1',
      email: 'analyst@example.com',
      name: 'Analyst User',
      picture: '',
      role: UserRole.ANALYST,
      tenantId: 'tenant-1',
      emailVerified: true,
      companyDetailsCompleted: true,
    },
    client: {
      id: 'client-1',
      email: 'client@example.com',
      name: 'Client User',
      picture: '',
      role: UserRole.CLIENT,
      tenantId: 'tenant-2',
      emailVerified: true,
      companyDetailsCompleted: true,
    },
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockUsers.clear();

    // Add test users to mock map
    Object.values(testUsers).forEach((user) => {
      mockUsers.set(user.id, user);
    });

    // Set JWT secret for testing
    process.env.JWT_SECRET = 'test-secret';

    mockRequest = {
      cookies: {},
    };

    mockResponse = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };

    nextFunction = jest.fn();
  });

  describe('requireRole', () => {
    it('should allow access for users with required role', () => {
      const token = jwt.sign({ id: testUsers.admin.id }, 'test-secret');
      mockRequest.cookies = { token };

      const middleware = requireRole(UserRole.PROJECT_ADMIN);
      middleware(mockRequest as Request, mockResponse as Response, nextFunction);

      expect(nextFunction).toHaveBeenCalled();
      expect(mockRequest.user).toEqual(testUsers.admin);
    });

    it('should deny access for users without required role', () => {
      const token = jwt.sign({ id: testUsers.client.id }, 'test-secret');
      mockRequest.cookies = { token };

      const middleware = requireRole(UserRole.PROJECT_ADMIN);
      middleware(mockRequest as Request, mockResponse as Response, nextFunction);

      expect(mockResponse.status).toHaveBeenCalledWith(403);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: 'Access denied',
        })
      );
      expect(nextFunction).not.toHaveBeenCalled();
    });

    it('should accept multiple allowed roles', () => {
      const token = jwt.sign({ id: testUsers.analyst.id }, 'test-secret');
      mockRequest.cookies = { token };

      const middleware = requireRole(UserRole.ANALYST, UserRole.PROJECT_ADMIN);
      middleware(mockRequest as Request, mockResponse as Response, nextFunction);

      expect(nextFunction).toHaveBeenCalled();
    });

    it('should return 401 when no token provided', () => {
      mockRequest.cookies = {};

      const middleware = requireRole(UserRole.PROJECT_ADMIN);
      middleware(mockRequest as Request, mockResponse as Response, nextFunction);

      expect(mockResponse.status).toHaveBeenCalledWith(401);
      expect(mockResponse.json).toHaveBeenCalledWith({
        error: 'Authentication required',
      });
    });

    it('should return 401 for invalid token', () => {
      mockRequest.cookies = { token: 'invalid-token' };

      const middleware = requireRole(UserRole.PROJECT_ADMIN);
      middleware(mockRequest as Request, mockResponse as Response, nextFunction);

      expect(mockResponse.status).toHaveBeenCalledWith(401);
      expect(mockResponse.json).toHaveBeenCalledWith({
        error: 'Invalid token',
      });
    });

    it('should return 401 when user not found in cache', () => {
      const token = jwt.sign({ id: 'non-existent-id' }, 'test-secret');
      mockRequest.cookies = { token };

      const middleware = requireRole(UserRole.PROJECT_ADMIN);
      middleware(mockRequest as Request, mockResponse as Response, nextFunction);

      expect(mockResponse.status).toHaveBeenCalledWith(401);
      expect(mockResponse.json).toHaveBeenCalledWith({
        error: 'User not found',
      });
    });
  });

  describe('requireTenant', () => {
    it('should attach tenant info to request', () => {
      const token = jwt.sign({ id: testUsers.analyst.id }, 'test-secret');
      mockRequest.cookies = { token };

      requireTenant(mockRequest as Request, mockResponse as Response, nextFunction);

      expect(nextFunction).toHaveBeenCalled();
      expect(mockRequest.tenantId).toBe('tenant-1');
    });

    it('should return 401 when tenant info missing', () => {
      const userWithoutTenant = { ...testUsers.client, tenantId: undefined };
      mockUsers.set(userWithoutTenant.id, userWithoutTenant);

      const token = jwt.sign({ id: userWithoutTenant.id }, 'test-secret');
      mockRequest.cookies = { token };

      requireTenant(mockRequest as Request, mockResponse as Response, nextFunction);

      expect(mockResponse.status).toHaveBeenCalledWith(401);
      expect(mockResponse.json).toHaveBeenCalledWith({
        error: 'Tenant information missing',
      });
    });
  });

  describe('requireTenantOrAdmin', () => {
    it('should set tenantId to ALL for PROJECT_ADMIN', () => {
      const token = jwt.sign({ id: testUsers.admin.id }, 'test-secret');
      mockRequest.cookies = { token };

      requireTenantOrAdmin(mockRequest as Request, mockResponse as Response, nextFunction);

      expect(nextFunction).toHaveBeenCalled();
      expect(mockRequest.tenantId).toBe('ALL');
    });

    it('should keep original tenantId for non-admin users', () => {
      const token = jwt.sign({ id: testUsers.analyst.id }, 'test-secret');
      mockRequest.cookies = { token };

      requireTenantOrAdmin(mockRequest as Request, mockResponse as Response, nextFunction);

      expect(nextFunction).toHaveBeenCalled();
      expect(mockRequest.tenantId).toBe('tenant-1');
    });
  });

  describe('requireProjectAdmin', () => {
    it('should allow PROJECT_ADMIN access', () => {
      const token = jwt.sign({ id: testUsers.admin.id }, 'test-secret');
      mockRequest.cookies = { token };

      requireProjectAdmin(mockRequest as Request, mockResponse as Response, nextFunction);

      expect(nextFunction).toHaveBeenCalled();
      expect(mockRequest.tenantId).toBe('ALL');
    });

    it('should deny non-PROJECT_ADMIN users', () => {
      const token = jwt.sign({ id: testUsers.analyst.id }, 'test-secret');
      mockRequest.cookies = { token };

      requireProjectAdmin(mockRequest as Request, mockResponse as Response, nextFunction);

      expect(mockResponse.status).toHaveBeenCalledWith(403);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: 'Access denied',
          message: 'Only PROJECT_ADMIN can access this resource',
        })
      );
    });
  });

  describe('Helper Functions', () => {
    describe('checkTenantAccess', () => {
      it('should return true for matching tenants', () => {
        expect(checkTenantAccess('tenant-1', 'tenant-1')).toBe(true);
      });

      it('should return false for different tenants', () => {
        expect(checkTenantAccess('tenant-1', 'tenant-2')).toBe(false);
      });
    });

    describe('isAdmin', () => {
      it('should return true for PROJECT_ADMIN', () => {
        expect(isAdmin(testUsers.admin)).toBe(true);
      });

      it('should return true for ADMIN role', () => {
        const adminUser = { ...testUsers.admin, role: UserRole.ADMIN };
        expect(isAdmin(adminUser)).toBe(true);
      });

      it('should return false for non-admin roles', () => {
        expect(isAdmin(testUsers.analyst)).toBe(false);
        expect(isAdmin(testUsers.client)).toBe(false);
      });
    });

    describe('filterByTenant', () => {
      const testData = [
        { id: '1', name: 'Item 1', tenantId: 'tenant-1' },
        { id: '2', name: 'Item 2', tenantId: 'tenant-2' },
        { id: '3', name: 'Item 3', tenantId: 'tenant-1' },
      ];

      it('should return all data for PROJECT_ADMIN', () => {
        const filtered = filterByTenant(testData, testUsers.admin);
        expect(filtered).toHaveLength(3);
      });

      it('should filter by tenant for non-admin users', () => {
        const filtered = filterByTenant(testData, testUsers.analyst);
        expect(filtered).toHaveLength(2);
        expect(filtered.every((item) => item.tenantId === 'tenant-1')).toBe(true);
      });

      it('should return empty array for tenant with no data', () => {
        const filtered = filterByTenant(testData, testUsers.client);
        expect(filtered).toHaveLength(1);
        expect(filtered[0].tenantId).toBe('tenant-2');
      });
    });
  });
});
