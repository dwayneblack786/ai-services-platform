import express, { Router, Request, Response } from 'express';
import logger from '../utils/logger';

const router: Router = express.Router();

/**
 * Client-side log collection endpoint
 * Receives logs from frontend applications for centralized logging
 * 
 * POST /api/logs/client
 */
router.post('/client', express.json(), (req: Request, res: Response) => {
  try {
    const { level, message, context, error } = req.body;

    // Build log context
    const logContext = {
      source: 'frontend',
      userId: (req.user as any)?.id || 'anonymous',
      sessionId: req.sessionID,
      ip: req.ip,
      userAgent: req.get('user-agent'),
      referer: req.get('referer'),
      ...context
    };

    // Log with appropriate level
    switch (level?.toUpperCase()) {
      case 'ERROR':
        logger.error(`[Frontend] ${message}`, error || {}, logContext);
        break;
      case 'WARN':
        logger.warn(`[Frontend] ${message}`, logContext);
        break;
      case 'INFO':
        logger.info(`[Frontend] ${message}`, logContext);
        break;
      case 'DEBUG':
      default:
        logger.debug(`[Frontend] ${message}`, logContext);
    }

    res.json({ success: true });
  } catch (err: any) {
    // Silently fail to avoid infinite loops
    logger.error('Failed to process client log', { error: err.message });
    res.status(500).json({ success: false });
  }
});

export default router;
