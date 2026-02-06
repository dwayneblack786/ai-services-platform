import { Request, Response, NextFunction } from 'express';
import UserActivity from '../models/UserActivity';
import User from '../models/User';
import logger from '../utils/logger';
import { any } from 'zod/v4';

/**
 * Middleware to track user activity
 * Should be used after authentication middleware that sets req.user
 */
export const trackActivity = (eventType: 'login' | 'logout' | 'dashboard_view' | 'product_access' | 'settings_change' | 'api_call', eventName?: string) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    // Skip if user not authenticated
    if (!req.user) {
      return next();
    }

    try {
      const user = req.user as any;
      
      // Create activity log
      await UserActivity.create({
        userId: user._id || user.id,
        userEmail: user.email,
        tenantId: user.tenantId,
        eventType,
        eventName: eventName || eventType,
        ipAddress: req.ip || req.headers['x-forwarded-for'] as string || req.socket.remoteAddress,
        userAgent: req.headers['user-agent'],
        timestamp: new Date(),
        metadata: {
          path: req.path,
          method: req.method,
        },
      });

      // Update user's lastLogin if this is a login event
      if (eventType === 'login') {
        await User.findByIdAndUpdate(
          user._id || user.id,
          {
            $set: { lastLogin: new Date() },
            $inc: { loginCount: 1 },
          }
        );
      }
    } catch (error: any) {
      // Log but don't fail the request
      logger.error('Activity tracking failed', {
        error: error.message,
        eventType,
        userId: /*req.user?._id   ||*/ req.user?.id,
      });
    }

    next();
  };
};

/**
 * Track login activity
 */
export const trackLogin = trackActivity('login', 'User Login');

/**
 * Track logout activity
 */
export const trackLogout = trackActivity('logout', 'User Logout');

/**
 * Track API calls (use sparingly on high-frequency endpoints)
 */
export const trackApiCall = (apiName: string) => {
  return trackActivity('api_call', apiName);
};
