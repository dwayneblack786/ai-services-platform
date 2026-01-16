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

// Determine log level based on environment
const logLevel = process.env.LOG_LEVEL || (process.env.NODE_ENV === 'production' ? 'info' : 'debug');

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

// Export convenience methods
export default logger;

// Export typed logging methods
export const logInfo = (message: string, meta?: Record<string, any>) => {
  logger.info(message, meta);
};

export const logError = (message: string, error?: Error | any, meta?: Record<string, any>) => {
  logger.error(message, {
    ...meta,
    error: error?.message,
    stack: error?.stack,
    code: error?.code,
  });
};

export const logWarn = (message: string, meta?: Record<string, any>) => {
  logger.warn(message, meta);
};

export const logDebug = (message: string, meta?: Record<string, any>) => {
  logger.debug(message, meta);
};

export const logHttp = (message: string, meta?: Record<string, any>) => {
  logger.http(message, meta);
};
