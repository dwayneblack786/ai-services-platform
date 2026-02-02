/**
 * Centralized Logging Configuration
 * 
 * Uses Winston for structured logging with multiple transports:
 * - Console output (formatted for development)
 * - File output (JSON for production)
 * - Error log file (errors only)
 */

import winston from 'winston';
import path from 'path';
import { env } from '../config/env';

const { combine, timestamp, printf, errors, json, colorize } = winston.format;

// Custom format for console output (development)
const consoleFormat = printf(({ level, message, timestamp, service, ...metadata }) => {
  let msg = `${timestamp} [${service}] ${level}: ${message}`;
  
  // Add metadata if present
  if (Object.keys(metadata).length > 0) {
    msg += ` ${JSON.stringify(metadata)}`;
  }
  
  return msg;
});

// Create logs directory if it doesn't exist
const logsDir = path.join(__dirname, '../../logs');

// Use validated environment configuration
const logLevel = env.LOG_LEVEL;

// Create the logger
const logger = winston.createLogger({
  level: logLevel,
  defaultMeta: { service: 'ai-services-backend' },
  format: combine(
    timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    errors({ stack: true }),
    json()
  ),
  transports: [
    // Console transport (formatted for readability)
    new winston.transports.Console({
      format: combine(
        colorize(),
        timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
        consoleFormat
      ),
    }),
    
    // File transport - all logs
    new winston.transports.File({
      filename: path.join(logsDir, 'combined.log'),
      maxsize: 10485760, // 10MB
      maxFiles: 5,
      format: combine(
        timestamp(),
        json()
      ),
    }),
    
    // File transport - errors only
    new winston.transports.File({
      filename: path.join(logsDir, 'error.log'),
      level: 'error',
      maxsize: 10485760, // 10MB
      maxFiles: 5,
      format: combine(
        timestamp(),
        json()
      ),
    }),
  ],
  
  // Handle exceptions and rejections
  exceptionHandlers: [
    new winston.transports.File({
      filename: path.join(logsDir, 'exceptions.log'),
    }),
  ],
  rejectionHandlers: [
    new winston.transports.File({
      filename: path.join(logsDir, 'rejections.log'),
    }),
  ],
});

// Add stream for Morgan HTTP logging
export const httpLoggerStream = {
  write: (message: string) => {
    logger.http(message.trim());
  },
};

// Create child loggers for different modules
export const createModuleLogger = (module: string) => {
  return logger.child({ module });
};

/**
 * Structured metadata for logging
 * Allows additional fields but provides type safety for common fields
 */
export interface LogMetadata {
  userId?: string;
  tenantId?: string;
  correlationId?: string;
  component?: string;
  duration?: number;
  statusCode?: number;
  method?: string;
  path?: string;
  error?: string;
  stack?: string;
  code?: string | number;
  [key: string]: unknown; // Allow additional fields
}

// Export convenience methods
export default logger;

// Export typed logging methods
export const logInfo = (message: string, meta?: LogMetadata) => {
  logger.info(message, meta);
};

export const logError = (message: string, error?: Error | unknown, meta?: LogMetadata) => {
  const errorInfo: LogMetadata = {
    ...meta,
  };
  
  if (error instanceof Error) {
    errorInfo.error = error.message;
    errorInfo.stack = error.stack;
    errorInfo.code = (error as any).code;
  } else if (error) {
    errorInfo.error = String(error);
  }
  
  logger.error(message, errorInfo);
};

export const logWarn = (message: string, meta?: LogMetadata) => {
  logger.warn(message, meta);
};

export const logDebug = (message: string, meta?: LogMetadata) => {
  logger.debug(message, meta);
};

export const logHttp = (message: string, meta?: LogMetadata) => {
  logger.http(message, meta);
};
