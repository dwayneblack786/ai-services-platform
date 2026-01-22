import { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger';

/**
 * Maintenance mode middleware
 * Returns 503 Service Unavailable when MAINTENANCE_MODE=true
 * Allows health check endpoints to continue functioning
 */
export function maintenanceMode(req: Request, res: Response, next: NextFunction) {
  // Skip maintenance mode for health check endpoints
  if (req.path.startsWith('/api/health') || req.path === '/health') {
    return next();
  }

  // Check if maintenance mode is enabled
  const isMaintenanceMode = process.env.MAINTENANCE_MODE === 'true';
  
  if (isMaintenanceMode) {
    const maintenanceEndTime = process.env.MAINTENANCE_END_TIME;
    const retryAfter = maintenanceEndTime 
      ? Math.ceil((new Date(maintenanceEndTime).getTime() - Date.now()) / 1000)
      : 3600; // Default 1 hour

    logger.info('Request blocked during maintenance mode', {
      path: req.path,
      method: req.method,
      ip: req.ip
    });

    return res.status(503).json({
      error: 'Service Unavailable',
      message: 'Server is currently under maintenance. Please try again later.',
      maintenanceEndTime,
      retryAfter: retryAfter > 0 ? retryAfter : 3600
    }).header('Retry-After', String(retryAfter > 0 ? retryAfter : 3600));
  }

  next();
}

export default maintenanceMode;
