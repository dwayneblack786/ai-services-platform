import { Request, Response, NextFunction } from 'express';
import { User, UserRole } from '../../../shared/types';
import jwt from 'jsonwebtoken';

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
 */
export const requireRole = (...allowedRoles: UserRole[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    // Check JWT token
    const token = req.cookies.token;
    if (!token) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-jwt-secret') as any;
      const { users } = require('../config/passport');
      const user = users.get(decoded.id);

      if (!user) {
        return res.status(401).json({ error: 'User not found' });
      }

      // Check if user has required role
      if (!allowedRoles.includes(user.role)) {
        return res.status(403).json({ 
          error: 'Access denied', 
          message: `Required role: ${allowedRoles.join(' or ')}` 
        });
      }

      // Attach user to request
      req.user = user;
      req.tenantId = user.tenantId;
      next();
    } catch (error) {
      return res.status(401).json({ error: 'Invalid token' });
    }
  };
};

/**
 * Middleware to ensure tenant isolation
 * Use this on routes that need to filter data by tenant
 */
export const requireTenant = (req: Request, res: Response, next: NextFunction) => {
  const token = req.cookies.token;
  if (!token) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-jwt-secret') as any;
    const { users } = require('../config/passport');
    const user = users.get(decoded.id);

    if (!user || !user.tenantId) {
      return res.status(401).json({ error: 'Tenant information missing' });
    }

    req.user = user;
    req.tenantId = user.tenantId;
    next();
  } catch (error) {
    return res.status(401).json({ error: 'Invalid token' });
  }
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
  const token = req.cookies.token;
  if (!token) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-jwt-secret') as any;
    const { users } = require('../config/passport');
    const user = users.get(decoded.id);

    if (!user) {
      return res.status(401).json({ error: 'User not found' });
    }

    req.user = user;
    req.tenantId = user.tenantId;
    
    // Only PROJECT_ADMIN can access all tenants
    if (user.role === UserRole.PROJECT_ADMIN) {
      req.tenantId = 'ALL'; // Special marker for project-admin cross-tenant access
    }
    
    next();
  } catch (error) {
    return res.status(401).json({ error: 'Invalid token' });
  }
};

/**
 * Middleware that requires PROJECT_ADMIN role only
 */
export const requireProjectAdmin = (req: Request, res: Response, next: NextFunction) => {
  const token = req.cookies.token;
  if (!token) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-jwt-secret') as any;
    const { users } = require('../config/passport');
    const user = users.get(decoded.id);

    if (!user) {
      return res.status(401).json({ error: 'User not found' });
    }

    if (user.role !== UserRole.PROJECT_ADMIN) {
      return res.status(403).json({ 
        error: 'Access denied', 
        message: 'Only PROJECT_ADMIN can access this resource' 
      });
    }

    req.user = user;
    req.tenantId = 'ALL';
    next();
  } catch (error) {
    return res.status(401).json({ error: 'Invalid token' });
  }
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
