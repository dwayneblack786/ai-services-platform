import { getApiUrl } from '../config/api';

/**
 * Log levels for categorizing log messages
 */
export enum LogLevel {
  DEBUG = 'DEBUG',
  INFO = 'INFO',
  WARN = 'WARN',
  ERROR = 'ERROR'
}

/**
 * Log entry structure
 */
interface LogEntry {
  level: LogLevel;
  message: string;
  timestamp: string;
  context?: Record<string, any>;
  error?: {
    message: string;
    stack?: string;
    name?: string;
  };
}

/**
 * Logger configuration
 */
const config = {
  // Enable console logging in development
  enableConsole: import.meta.env.DEV,
  
  // Send logs to backend in production
  enableRemote: import.meta.env.PROD,
  
  // Minimum log level to process (in order: DEBUG < INFO < WARN < ERROR)
  minLevel: import.meta.env.PROD ? LogLevel.WARN : LogLevel.DEBUG,
  
  // Backend endpoint for log collection
  remoteEndpoint: '/api/logs/client'
};

/**
 * Log level hierarchy for filtering
 */
const levelHierarchy: Record<LogLevel, number> = {
  [LogLevel.DEBUG]: 0,
  [LogLevel.INFO]: 1,
  [LogLevel.WARN]: 2,
  [LogLevel.ERROR]: 3
};

/**
 * Check if a log level should be processed
 */
function shouldLog(level: LogLevel): boolean {
  return levelHierarchy[level] >= levelHierarchy[config.minLevel];
}

/**
 * Send log to backend for persistence
 */
async function sendToBackend(entry: LogEntry): Promise<void> {
  if (!config.enableRemote) return;

  try {
    // Use fetch instead of axios to avoid circular dependencies
    await fetch(getApiUrl(config.remoteEndpoint), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      credentials: 'include', // Include session cookies
      body: JSON.stringify(entry)
    });
  } catch (err) {
    // Silently fail to avoid infinite loops
    // Only log to console if available
    if (config.enableConsole) {
      console.error('Failed to send log to backend:', err);
    }
  }
}

/**
 * Format log entry for console output
 */
function formatForConsole(entry: LogEntry): string {
  const { level, message, timestamp, context } = entry;
  const emoji = {
    [LogLevel.DEBUG]: '🔍',
    [LogLevel.INFO]: 'ℹ️',
    [LogLevel.WARN]: '⚠️',
    [LogLevel.ERROR]: '❌'
  }[level];

  let output = `${emoji} [${timestamp}] ${level}: ${message}`;
  
  if (context && Object.keys(context).length > 0) {
    output += `\n   Context: ${JSON.stringify(context, null, 2)}`;
  }
  
  if (entry.error) {
    output += `\n   Error: ${entry.error.message}`;
    if (entry.error.stack) {
      output += `\n   Stack: ${entry.error.stack}`;
    }
  }
  
  return output;
}

/**
 * Core logging function
 */
function log(level: LogLevel, message: string, context?: Record<string, any>, error?: Error): void {
  if (!shouldLog(level)) return;

  const entry: LogEntry = {
    level,
    message,
    timestamp: new Date().toISOString(),
    context
  };

  // Add error details if provided
  if (error) {
    entry.error = {
      message: error.message,
      stack: error.stack,
      name: error.name
    };
  }

  // Console output (development)
  if (config.enableConsole) {
    const formatted = formatForConsole(entry);
    switch (level) {
      case LogLevel.DEBUG:
      case LogLevel.INFO:
        console.log(formatted);
        break;
      case LogLevel.WARN:
        console.warn(formatted);
        break;
      case LogLevel.ERROR:
        console.error(formatted);
        break;
    }
  }

  // Send to backend (production)
  if (config.enableRemote && level !== LogLevel.DEBUG) {
    // Fire and forget - don't await to avoid blocking
    sendToBackend(entry).catch(() => {
      // Silently fail
    });
  }
}

/**
 * Public logger interface
 */
export const logger = {
  /**
   * Log debug information (development only)
   * Use for detailed troubleshooting information
   */
  debug: (message: string, context?: Record<string, any>) => {
    log(LogLevel.DEBUG, message, context);
  },

  /**
   * Log informational messages
   * Use for normal application flow events
   */
  info: (message: string, context?: Record<string, any>) => {
    log(LogLevel.INFO, message, context);
  },

  /**
   * Log warning messages
   * Use for potentially harmful situations
   */
  warn: (message: string, context?: Record<string, any>) => {
    log(LogLevel.WARN, message, context);
  },

  /**
   * Log error messages
   * Use for error events that should be investigated
   */
  error: (message: string, errorOrContext?: Error | Record<string, any>, context?: Record<string, any>) => {
    if (errorOrContext instanceof Error) {
      log(LogLevel.ERROR, message, context, errorOrContext);
    } else {
      log(LogLevel.ERROR, message, errorOrContext);
    }
  },

  /**
   * Set minimum log level dynamically
   */
  setMinLevel: (level: LogLevel) => {
    config.minLevel = level;
  },

  /**
   * Enable/disable remote logging
   */
  setRemoteLogging: (enabled: boolean) => {
    config.enableRemote = enabled;
  }
};

/**
 * Development-only console replacement
 * In production, these are no-ops unless they're errors
 */
export const devConsole = {
  log: (...args: any[]) => {
    if (import.meta.env.DEV) {
      console.log(...args);
    }
  },
  
  warn: (...args: any[]) => {
    if (import.meta.env.DEV) {
      console.warn(...args);
    }
  },
  
  error: (...args: any[]) => {
    // Always log errors, but send to backend in production
    if (import.meta.env.PROD) {
      logger.error('Console error', { args: args.map(String) });
    } else {
      console.error(...args);
    }
  }
};

export default logger;
