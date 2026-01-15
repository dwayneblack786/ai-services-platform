import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { users } from '../config/passport';
import { getDB } from '../config/database';
import { UserDocument } from '../models/User';

/**
 * Verify JWT token and return decoded payload
 * Used by both Express middleware and Socket.IO
 */
export const verifyToken = (token: string) => {
  return jwt.verify(token, process.env.JWT_SECRET || 'your-jwt-secret');
};

export const authenticateToken = async (req: Request, res: Response, next: NextFunction) => {
  const token = req.cookies.token;

  console.log('==== Auth Middleware ====');
  console.log('Has token:', !!token);

  if (!token) {
    console.log('❌ No token in cookies');
    return res.status(401).json({ error: 'Authentication required' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-jwt-secret') as { id: string; email: string };
    let user = users.get(decoded.id);
    
    console.log('Decoded JWT:', decoded);
    console.log('Found user in memory map:', !!user);
    
    // If user not in memory, try loading from database
    if (!user) {
      console.log('User not in memory, checking database...');
      const db = getDB();
      const userDoc = await db.collection<UserDocument>('users').findOne({ 
        $or: [
          { _id: decoded.id },
          { id: decoded.id },
          { email: decoded.email }
        ]
      });
      
      if (userDoc) {
        console.log('✓ User found in database:', userDoc.email);
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
      console.log('❌ User not found in database for:', decoded);
      console.log('Available user IDs in memory:', Array.from(users.keys()));
      return res.status(401).json({ error: 'User not found' });
    }
    console.log('✓✓✓✓✓✓✓✓✓✓✓ User requested route :', req.originalUrl,'✓✓✓✓✓✓✓✓✓✓✓✓✓');
    // console.log('✓ User authenticated:', { id: user.id, email: user.email, tenantId: user.tenantId });
    req.user = user;
    next();
  } catch (error) {
    console.log('❌ Token verification failed:', error);
    return res.status(403).json({ error: 'Invalid token' });
  }
};
