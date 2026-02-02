import express, { Request, Response } from 'express';
import User from '../models/User';
import UserActivity from '../models/UserActivity';

const router = express.Router();

// All authentication is now handled by tenant-auth.ts (Keycloak flow)
// Local auth and Google OAuth removed - using Keycloak for SSO

// Logout endpoint - destroys session
router.post('/logout', async (req: Request, res: Response) => {
  console.log('Logout request - Session ID:', req.sessionID);
  
  const userId = req.session.userId;
  const tenantId = req.session.tenantId;

  // Track logout activity before destroying session
  if (userId && tenantId) {
    try {
      const user = await User.findById(userId);
      if (user) {
        await UserActivity.create({
          userId: user._id,
          userEmail: user.email,
          tenantId: tenantId,
          eventType: 'logout',
          eventName: 'User Logout',
          ipAddress: req.ip || req.headers['x-forwarded-for'] as string || req.socket.remoteAddress,
          userAgent: req.headers['user-agent'],
          timestamp: new Date(),
          metadata: {
            path: req.path,
            method: req.method,
          },
        });
        console.log('✅ Logout activity tracked');
      }
    } catch (activityError: any) {
      console.error('❌ Failed to track logout activity:', activityError.message);
    }
  }

  req.session.destroy((err) => {
    if (err) {
      console.error('Session destruction error:', err);
      return res.status(500).json({ error: 'Logout failed' });
    }
    res.clearCookie('ai_platform.sid');
    console.log('✅ Session destroyed successfully');
    res.json({ success: true });
  });
});

export default router;