import { Request, Response, NextFunction } from 'express';
import { keycloakService } from '../services/keycloak.service';

/**
 * Keycloak Authentication Middleware (Multi-Realm Support)
 *
 * Validates Keycloak access token from session or Authorization header
 * Supports multi-realm by getting realm from session tenantId
 * Loads user from MongoDB and attaches to req.user
 */
export async function requireKeycloakAuth(req: Request, res: Response, next: NextFunction) {
  try {
    // Check session first
    let accessToken = req.session.keycloakAccessToken;
    let tenantId = req.session.tenantId;

    // If no token in session, check Authorization header
    if (!accessToken) {
      const authHeader = req.headers.authorization;
      if (authHeader && authHeader.startsWith('Bearer ')) {
        accessToken = authHeader.substring(7);
      }
    }

    if (!accessToken) {
      return res.status(401).json({
        error: 'not_authenticated',
        message: 'Authentication required'
      });
    }

    // Get realm from session tenantId (tenantId = realmName)
    // If not in session, try to decode token to extract realm
    let realm: string = tenantId || '';

    if (!realm) {
      // Decode token without validation to extract tenant/realm info
      const decoded = keycloakService.decodeToken(accessToken);
      // Try to get tenant from token claims or use default
      realm = decoded.payload.tenant_id || decoded.payload.azp || process.env.KEYCLOAK_DEFAULT_REALM || 'master';
    }

    // Validate token with Keycloak using correct realm
    const tokenPayload = await keycloakService.validateAccessToken(realm, accessToken);

    // Load user from MongoDB
    const User = (await import('../models/User')).default;
    const user = await User.findOne({ keycloakSub: tokenPayload.sub });

    if (!user) {
      return res.status(401).json({
        error: 'user_not_found',
        message: 'User not found in database'
      });
    }

    // Attach user to request (compatible with existing code)
    req.user = {
      id: user._id.toString(),
      email: user.email,
      name: user.name,
      picture: user.picture || '',
      role: user.role,
      tenantId: user.tenantId,
      emailVerified: user.emailVerified,
      companyDetailsCompleted: user.companyDetailsCompleted || false,
      authProvider: 'keycloak',
      firstName: user.firstName,
      lastName: user.lastName,
      keycloakSub: user.keycloakSub
    };

    next();
  } catch (error: any) {
    console.error('Keycloak auth middleware error:', error);
    return res.status(403).json({
      error: 'invalid_token',
      message: 'Token validation failed'
    });
  }
}

/**
 * Optional Keycloak Authentication (Multi-Realm Support)
 *
 * Attempts to authenticate but allows request to proceed if no token
 */
export async function optionalKeycloakAuth(req: Request, res: Response, next: NextFunction) {
  try {
    let accessToken = req.session.keycloakAccessToken;
    let tenantId = req.session.tenantId;

    if (!accessToken) {
      const authHeader = req.headers.authorization;
      if (authHeader && authHeader.startsWith('Bearer ')) {
        accessToken = authHeader.substring(7);
      }
    }

    if (accessToken) {
      // Get realm from session tenantId (tenantId = realmName)
      let realm: string = tenantId || '';

      if (!realm) {
        // Decode token without validation to extract tenant/realm info
        const decoded = keycloakService.decodeToken(accessToken);
        realm = decoded.payload.tenant_id || decoded.payload.azp || process.env.KEYCLOAK_DEFAULT_REALM || 'master';
      }

      // Validate token with Keycloak using correct realm
      const tokenPayload = await keycloakService.validateAccessToken(realm, accessToken);

      const User = (await import('../models/User')).default;
      const user = await User.findOne({ keycloakSub: tokenPayload.sub });

      if (user) {
        req.user = {
          id: user._id.toString(),
          email: user.email,
          name: user.name,
          picture: user.picture || '',
          role: user.role,
          tenantId: user.tenantId,
          emailVerified: user.emailVerified,
          companyDetailsCompleted: user.companyDetailsCompleted || false,
          authProvider: 'keycloak',
          firstName: user.firstName,
          lastName: user.lastName,
          keycloakSub: user.keycloakSub
        };
      }
    }

    next();
  } catch (error) {
    // Ignore authentication errors for optional auth
    next();
  }
}

/**
 * Send usage event to tenant-service
 * 
 * Helper to track usage across the platform
 */
export async function trackUsage(
  eventType: string,
  userId: string,
  tenantId: string,
  resourceType?: string,
  resourceId?: string,
  metadata?: Record<string, any>
) {
  try {
    const axios = (await import('axios')).default;
    
    await axios.post(
      `${process.env.TENANT_SERVICE_URL || 'http://localhost:5000'}/api/usage/events`,
      {
        tenant_id: tenantId,
        user_id: userId,
        event_type: eventType,
        resource_type: resourceType,
        resource_id: resourceId,
        metadata: metadata,
        timestamp: new Date().toISOString()
      },
      {
        timeout: 3000 // Don't block requests if usage service is slow
      }
    );
  } catch (error) {
    // Log but don't fail the request if usage tracking fails
    console.error('Usage tracking failed:', error);
  }
}

/**
 * Middleware to track route usage
 * 
 * Automatically sends usage event after successful request
 */
export function trackRouteUsage(eventType: string, resourceType?: string) {
  return (req: Request, res: Response, next: NextFunction) => {
    // Store original send function
    const originalSend = res.send;

    // Override send to track usage on success
    res.send = function(data: any) {
      if (res.statusCode >= 200 && res.statusCode < 300 && req.user) {
        // Track usage async (don't await)
        trackUsage(
          eventType,
          req.user.id,
          req.user.tenantId,
          resourceType,
          req.params.id || req.body.id,
          {
            method: req.method,
            path: req.path,
            statusCode: res.statusCode
          }
        ).catch(err => console.error('Usage tracking error:', err));
      }

      // Call original send
      return originalSend.call(this, data);
    };

    next();
  };
}
