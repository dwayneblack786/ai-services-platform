import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { users } from '../config/passport';
import { getDB } from '../config/database';
import { UserDocument } from '../models/User';
import logger from '../utils/logger';
/**
 * Verify JWT token and return decoded payload
 * Used by both Express middleware and Socket.IO
 */
export const verifyToken = (token: string) => {
  return jwt.verify(token, process.env.JWT_SECRET || 'your-jwt-secret');
};

export const authenticateToken = async (req: Request, res: Response, next: NextFunction) => {
  const token = req.cookies.token;

  // console.log('==== Auth Middleware ====');
  // console.log('Has token:', !!token);

  if (!token) {
    logger.warn('Authentication failed - No token in cookies', {
      url: req.originalUrl,
      ip: req.ip
    });
    return res.status(401).json({ error: 'Authentication required' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-jwt-secret') as { id: string; email: string };
    let user = users.get(decoded.id);
    
    // console.log('Decoded JWT:', decoded);
    // console.log('Found user in memory map:', !!user);
    
    // If user not in memory, try loading from database
    if (!user) {
      logger.debug('User not in memory, checking database', { userId: decoded.id, email: decoded.email });
      const db = getDB();
      const userDoc = await db.collection<UserDocument>('users').findOne({ 
        $or: [
          { _id: decoded.id },
          { id: decoded.id },
          { email: decoded.email }
        ]
      });
      
      if (userDoc) {
        logger.info('User found in database and cached', { email: userDoc.email, userId: userDoc.id });
        // Convert UserDocument to User and cache in memory
        user = {
          id: userDoc.id || userDoc._id?.toString() || decoded.id,
          email: userDoc.email,
          name: userDoc.name,
          picture: userDoc.picture,
          role: userDoc.role,
          tenantId: userDoc.tenantId,
          emailVerified: userDoc.emailVerified,
          companyDetailsCompleted: userDoc.companyDetailsCompleted,
          authProvider: userDoc.authProvider,
          createdAt: userDoc.createdAt,
          updatedAt: userDoc.updatedAt
        };
        users.set(user.id, user);
      }
    }
    
    if (!user) {
      logger.error('User not found in database', {
        decoded,
        availableUserIds: Array.from(users.keys())
      });
      return res.status(401).json({ error: 'User not found' });
    }
    logger.info('User authenticated successfully', {
      userId: user.id,
      email: user.email,
      tenantId: user.tenantId,
      route: req.originalUrl
    });
    req.user = user;
    next();
  } catch (error) {
    logger.error('Token verification failed', {
      error: error instanceof Error ? error.message : String(error),
      url: req.originalUrl
    });
    return res.status(403).json({ error: 'Invalid token' });
  }
};
