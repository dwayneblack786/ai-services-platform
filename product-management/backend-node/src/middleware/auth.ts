import { Request, Response, NextFunction } from 'express';
import User from '../models/User';
import logger from '../utils/logger';

/**
 * Session-based authentication middleware for Keycloak SSO
 * Checks if user is authenticated via Passport session
 */
export const authenticateSession = async (req: Request, res: Response, next: NextFunction) => {
  try {
    // Passport attaches the deserialized user to req.user, not req.session.passport.user
    // req.session.passport.user only contains the serialized ID
    if (!req.user) {
      logger.warn('Authentication failed - No req.user (passport deserialization failed or not logged in)', {
        url: req.originalUrl,
        ip: req.ip,
        hasSession: !!req.session,
        hasPassportInSession: !!req.session.passport,
        sessionID: req.sessionID
      });
      return res.status(401).json({ 
        error: 'not_authenticated',
        message: 'User not authenticated - please login via Keycloak' 
      });
    }

    const sessionUser = req.user as any;

    logger.debug('User authenticated via session', {
      userId: sessionUser._id?.toString() || sessionUser.id,
      email: sessionUser.email,
      tenantId: sessionUser.tenantId,
      route: req.originalUrl
    });
    
    // User is already attached by passport middleware, but ensure consistent format
    if (!req.user.id && sessionUser._id) {
      (req.user as any).id = sessionUser._id.toString();
    }
    
    next();
  } catch (error) {
    logger.error('Session authentication failed', {
      error: error instanceof Error ? error.message : String(error),
      url: req.originalUrl
    });
    return res.status(500).json({ 
      error: 'authentication_error',
      message: 'Authentication failed' 
    });
  }
};
