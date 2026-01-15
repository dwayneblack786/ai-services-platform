package com.ai.common.logging;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.io.IOException;
import java.io.InputStream;
import java.util.Properties;

/**
 * Central factory for obtaining logger instances across all AI services.
 * Uses SLF4J API with Log4j2 implementation.
 * 
 * Supports centralized debug logging control via application.properties:
 * - logging.debug.enabled=true (default) - enables debug logging
 * - logging.debug.enabled=false - disables ALL debug logging application-wide
 * 
 * Usage:
 * <pre>
 * private static final Logger logger = LogFactory.getLogger(MyClass.class);
 * 
 * LogFactory.debug(logger, "Processing request for user: {}", userId);
 * logger.info("Processing request for user: {}", userId);
 * logger.error("Failed to process request", exception);
 * </pre>
 */
public class LogFactory {

    private static final boolean DEBUG_ENABLED;
    private static final Logger FACTORY_LOGGER = LoggerFactory.getLogger(LogFactory.class);

    static {
        boolean debugEnabled = true; // Default to true
        try {
            Properties props = new Properties();
            InputStream input = LogFactory.class.getClassLoader()
                    .getResourceAsStream("application.properties");
            
            if (input != null) {
                props.load(input);
                String debugProperty = props.getProperty("logging.debug.enabled", "true");
                debugEnabled = Boolean.parseBoolean(debugProperty);
                input.close();
                
                FACTORY_LOGGER.info("Debug logging initialized: {}", debugEnabled ? "ENABLED" : "DISABLED");
            } else {
                FACTORY_LOGGER.warn("application.properties not found, defaulting debug logging to ENABLED");
            }
        } catch (IOException e) {
            FACTORY_LOGGER.error("Error loading logging configuration, defaulting debug logging to ENABLED", e);
        }
        DEBUG_ENABLED = debugEnabled;
    }

    private LogFactory() {
        // Private constructor to prevent instantiation
    }

    /**
     * Check if debug logging is enabled globally
     * 
     * @return true if debug logging is enabled, false otherwise
     */
    public static boolean isDebugEnabled() {
        return DEBUG_ENABLED;
    }

    /**
     * Get a logger instance for the specified class.
     * This is the preferred method for obtaining loggers.
     * 
     * @param clazz The class requesting the logger
     * @return A configured Logger instance
     */
    public static Logger getLogger(Class<?> clazz) {
        return LoggerFactory.getLogger(clazz);
    }

    /**
     * Get a logger instance by name.
     * Use this when you need a custom logger name.
     * 
     * @param name The logger name
     * @return A configured Logger instance
     */
    public static Logger getLogger(String name) {
        return LoggerFactory.getLogger(name);
    }

    /**
     * Log a debug message with optional context information.
     * Respects global debug logging configuration from application.properties.
     * 
     * @param logger The logger instance
     * @param message The message to log
     * @param args Optional arguments for message formatting
     */
    public static void debug(Logger logger, String message, Object... args) {
        if (DEBUG_ENABLED && logger.isDebugEnabled()) {
            logger.debug(message, args);
        }
    }

    /**
     * Log an info message with optional context information
     * 
     * @param logger The logger instance
     * @param message The message to log
     * @param args Optional arguments for message formatting
     */
    public static void info(Logger logger, String message, Object... args) {
        if (logger.isInfoEnabled()) {
            logger.info(message, args);
        }
    }

    /**
     * Log a warning message with optional context information
     * 
     * @param logger The logger instance
     * @param message The message to log
     * @param args Optional arguments for message formatting
     */
    public static void warn(Logger logger, String message, Object... args) {
        if (logger.isWarnEnabled()) {
            logger.warn(message, args);
        }
    }

    /**
     * Log an error message with optional context information
     * 
     * @param logger The logger instance
     * @param message The message to log
     * @param args Optional arguments for message formatting
     */
    public static void error(Logger logger, String message, Object... args) {
        if (logger.isErrorEnabled()) {
            logger.error(message, args);
        }
    }

    /**
     * Log an error message with exception
     * 
     * @param logger The logger instance
     * @param message The message to log
     * @param throwable The exception to log
     */
    public static void error(Logger logger, String message, Throwable throwable) {
        if (logger.isErrorEnabled()) {
            logger.error(message, throwable);
        }
    }

    /**
     * Log method entry (useful for debugging).
     * Respects global debug logging configuration from application.properties.
     * 
     * @param logger The logger instance
     * @param methodName The name of the method
     * @param params Method parameters
     */
    public static void logEntry(Logger logger, String methodName, Object... params) {
        if (DEBUG_ENABLED && logger.isDebugEnabled()) {
            logger.debug("Entering method: {} with parameters: {}", methodName, params);
        }
    }

    /**
     * Log method exit (useful for debugging).
     * Respects global debug logging configuration from application.properties.
     * 
     * @param logger The logger instance
     * @param methodName The name of the method
     * @param result The return value
     */
    public static void logExit(Logger logger, String methodName, Object result) {
        if (DEBUG_ENABLED && logger.isDebugEnabled()) {
            logger.debug("Exiting method: {} with result: {}", methodName, result);
        }
    }

    /**
     * Log operation with timing
     * 
     * @param logger The logger instance
     * @param operation The operation name
     * @param startTimeMs Start time in milliseconds
     */
    public static void logTiming(Logger logger, String operation, long startTimeMs) {
        long duration = System.currentTimeMillis() - startTimeMs;
        if (logger.isInfoEnabled()) {
            logger.info("Operation '{}' completed in {} ms", operation, duration);
        }
    }
}
