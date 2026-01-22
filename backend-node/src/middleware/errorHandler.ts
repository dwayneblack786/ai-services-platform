import { Request, Response, NextFunction } from 'express';
import logger from '../utils/logger';

/**
 * Standard API error format
 */
export interface ApiErrorResponse {
  success: false;
  error: {
    code: string;
    message: string;
    details?: any;
    timestamp: string;
    path?: string;
  };
}

/**
 * Custom error class with status code and error code
 */
export class ApiError extends Error {
  statusCode: number;
  code: string;
  details?: any;

  constructor(message: string, statusCode: number = 500, code: string = 'INTERNAL_ERROR', details?: any) {
    super(message);
    this.name = 'ApiError';
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * Predefined error creators for common scenarios
 */
export const createError = {
  unauthorized: (message: string = 'Unauthorized') => 
    new ApiError(message, 401, 'UNAUTHORIZED'),
  
  forbidden: (message: string = 'Forbidden') => 
    new ApiError(message, 403, 'FORBIDDEN'),
  
  notFound: (message: string = 'Resource not found') => 
    new ApiError(message, 404, 'NOT_FOUND'),
  
  validation: (message: string, details?: any) => 
    new ApiError(message, 400, 'VALIDATION_ERROR', details),
  
  conflict: (message: string = 'Resource conflict') => 
    new ApiError(message, 409, 'CONFLICT'),
  
  internal: (message: string = 'Internal server error') => 
    new ApiError(message, 500, 'INTERNAL_ERROR'),
  
  badRequest: (message: string = 'Bad request') => 
    new ApiError(message, 400, 'BAD_REQUEST'),
  
  tooManyRequests: (message: string = 'Too many requests') => 
    new ApiError(message, 429, 'RATE_LIMIT_EXCEEDED')
};

/**
 * Global error handler middleware
 * Must be registered AFTER all routes
 */
export const errorHandler = (
  err: any,
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  // Extract correlation ID if present
  const correlationId = (req as any).correlationId || 'unknown';

  // Determine status code
  const statusCode = err.statusCode || 500;
  const errorCode = err.code || 'INTERNAL_ERROR';

  // Log error with context
  logger.error('Request error', {
    correlationId,
    error: err.message,
    stack: err.stack,
    statusCode,
    errorCode,
    path: req.path,
    method: req.method,
    userId: (req.user as any)?.id || 'anonymous',
    details: err.details
  });

  // Build error response
  const errorResponse: ApiErrorResponse = {
    success: false,
    error: {
      code: errorCode,
      message: process.env.NODE_ENV === 'production' 
        ? getProductionMessage(statusCode, errorCode)
        : err.message,
      timestamp: new Date().toISOString(),
      path: req.path
    }
  };

  // Include details only in development
  if (process.env.NODE_ENV !== 'production' && err.details) {
    errorResponse.error.details = err.details;
  }

  // Send error response
  res.status(statusCode).json(errorResponse);
};

/**
 * Get user-friendly error messages for production
 * Hides internal details from end users
 */
function getProductionMessage(statusCode: number, errorCode: string): string {
  switch (statusCode) {
    case 400:
      return 'The request was invalid. Please check your input and try again.';
    case 401:
      return 'Authentication required. Please log in.';
    case 403:
      return 'You do not have permission to access this resource.';
    case 404:
      return 'The requested resource was not found.';
    case 409:
      return 'This request conflicts with existing data.';
    case 429:
      return 'Too many requests. Please try again later.';
    case 500:
    default:
      return 'An unexpected error occurred. Please try again later.';
  }
}

/**
 * Async handler wrapper to catch promise rejections
 * Usage: app.get('/route', asyncHandler(async (req, res) => { ... }))
 */
export const asyncHandler = (fn: Function) => {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

/**
 * 404 handler for unmatched routes
 * Should be registered before error handler
 */
export const notFoundHandler = (req: Request, res: Response, next: NextFunction): void => {
  next(createError.notFound(`Route ${req.method} ${req.path} not found`));
};
