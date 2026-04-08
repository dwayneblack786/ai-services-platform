import { Request, Response, NextFunction } from 'express';
import { User, UserRole } from '../types/shared';
import { JWTPayload } from '../types/jwt.types';
import * as jwt from 'jsonwebtoken';

// Extend Express Request to include user and tenant info
declare global {
  namespace Express {
    interface Request {
      user?: User;
      tenantId?: string;
    }
  }
}

/**
 * Middleware to check if user has required role
 * Uses session-based authentication (Passport.js)
 */
export const requireRole = (...allowedRoles: UserRole[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    // Check if user is authenticated via session (Passport.js)
    if (!req.isAuthenticated || !req.isAuthenticated()) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    // User is attached by Passport session middleware
    const user = req.user as any;

    if (!user) {
      return res.status(401).json({ error: 'User not found' });
    }

    // Normalize role to string for comparison
    const userRole = String(user.role);
    const allowedRoleStrings = allowedRoles.map((r) => String(r));

    // Check if user has required role
    if (!allowedRoleStrings.includes(userRole)) {
      return res.status(403).json({ 
        error: 'Access denied', 
        message: `Required role: ${allowedRoles.join(' or ')}. Your role: ${userRole}` 
      });
    }

    // Ensure user is properly typed and attached to request
    req.user = user;
    req.tenantId = user.tenantId;
    next();
  };
};

/**
 * Middleware to ensure tenant isolation
 * Use this on routes that need to filter data by tenant
 */
export const requireTenant = (req: Request, res: Response, next: NextFunction) => {
  // Check if user is authenticated via session (Passport.js)
  if (!req.isAuthenticated || !req.isAuthenticated()) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  const user = req.user as any;

  if (!user?.tenantId) {
    return res.status(401).json({ error: 'Tenant information missing' });
  }

  req.user = user;
  req.tenantId = user.tenantId;
  next();
};

/**
 * Check if user belongs to specific tenant
 */
export const checkTenantAccess = (resourceTenantId: string, userTenantId: string): boolean => {
  return resourceTenantId === userTenantId;
};

/**
 * Check if user has admin role (admins can access all tenants)
 */
export const isAdmin = (user: User): boolean => {
  return user.role === UserRole.ADMIN || user.role === UserRole.PROJECT_ADMIN;
};

/**
 * Middleware that allows PROJECT_ADMIN to access all tenants, but restricts others to their own tenant
 */
export const requireTenantOrAdmin = (req: Request, res: Response, next: NextFunction) => {
  // Check if user is authenticated via session (Passport.js)
  if (!req.isAuthenticated || !req.isAuthenticated()) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  const user = req.user as any;

  if (!user) {
    return res.status(401).json({ error: 'User not found' });
  }

  req.user = user;
  req.tenantId = user.tenantId;
  
  // Only PROJECT_ADMIN can access all tenants
  const userRole = typeof user.role === 'string' ? user.role : user.role?.toString();
  if (userRole === 'PROJECT_ADMIN' || userRole === UserRole.PROJECT_ADMIN) {
    req.tenantId = 'ALL'; // Special marker for project-admin cross-tenant access
  }
  
  next();
};

/**
 * Middleware that requires PROJECT_ADMIN role only
 */
export const requireProjectAdmin = (req: Request, res: Response, next: NextFunction) => {
  // Check if user is authenticated via session (Passport.js)
  if (!req.isAuthenticated || !req.isAuthenticated()) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  const user = req.user as any;

  if (!user) {
    return res.status(401).json({ error: 'User not found' });
  }

  const userRole = typeof user.role === 'string' ? user.role : user.role?.toString();
  if (userRole !== 'PROJECT_ADMIN' && userRole !== UserRole.PROJECT_ADMIN) {
    return res.status(403).json({ 
      error: 'Access denied', 
      message: 'Only PROJECT_ADMIN can access this resource' 
    });
  }

  req.user = user;
  req.tenantId = 'ALL';
  next();
};

/**
 * Helper to filter data by tenant
 */
export const filterByTenant = <T extends { tenantId: string }>(
  data: T[],
  user: User
): T[] => {
  // Only Project Admins see all data
  if (user.role === UserRole.PROJECT_ADMIN) {
    return data;
  }
  // Other users only see their tenant's data
  return data.filter(item => item.tenantId === user.tenantId);
};
