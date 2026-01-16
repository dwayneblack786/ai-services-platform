/**
 * Request Logging Middleware
 * 
 * Logs all HTTP requests with:
 * - Request ID (correlation tracking)
 * - Method, URL, status code
 * - Response time
 * - User information (if authenticated)
 * - Error details (if any)
 */

import { Request, Response, NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';
import logger from '../utils/logger';

// Extend Express Request to include correlation ID
declare global {
  namespace Express {
    interface Request {
      correlationId?: string;
      startTime?: number;
    }
  }
}

/**
 * Add correlation ID to all requests
 */
export const correlationIdMiddleware = (req: Request, res: Response, next: NextFunction) => {
  req.correlationId = req.headers['x-correlation-id'] as string || uuidv4();
  req.startTime = Date.now();
  
  // Add correlation ID to response headers
  res.setHeader('X-Correlation-ID', req.correlationId);
  
  next();
};

/**
 * Log all HTTP requests
 */
export const requestLoggerMiddleware = (req: Request, res: Response, next: NextFunction) => {
  const startTime = req.startTime || Date.now();
  
  // Log request
  logger.http('HTTP Request', {
    correlationId: req.correlationId,
    method: req.method,
    url: req.originalUrl,
    ip: req.ip || req.socket.remoteAddress,
    userAgent: req.headers['user-agent'],
    userId: (req.user as any)?.id,
    tenantId: (req.user as any)?.tenantId,
  });

  // Capture response
  const originalSend = res.send;
  let responseBody: any;

  res.send = function (body: any): Response {
    responseBody = body;
    return originalSend.call(this, body);
  };

  // Log response when finished
  res.on('finish', () => {
    const duration = Date.now() - startTime;
    const logLevel = res.statusCode >= 500 ? 'error' : 
                     res.statusCode >= 400 ? 'warn' : 'http';

    logger.log(logLevel, 'HTTP Response', {
      correlationId: req.correlationId,
      method: req.method,
      url: req.originalUrl,
      statusCode: res.statusCode,
      duration: `${duration}ms`,
      contentLength: res.get('content-length'),
      userId: (req.user as any)?.id,
      tenantId: (req.user as any)?.tenantId,
    });
  });

  next();
};

/**
 * Log errors with full context
 */
export const errorLoggerMiddleware = (
  err: Error,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  logger.error('Unhandled Error', {
    correlationId: req.correlationId,
    method: req.method,
    url: req.originalUrl,
    error: err.message,
    stack: err.stack,
    userId: (req.user as any)?.id,
    tenantId: (req.user as any)?.tenantId,
  });

  next(err);
};
