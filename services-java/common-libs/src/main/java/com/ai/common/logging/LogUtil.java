package com.ai.common.logging;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.slf4j.MDC;

import java.util.Map;
import java.util.UUID;

/**
 * Utility class for enhanced logging with MDC (Mapped Diagnostic Context) support
 */
public class LogUtil {
    
    private static final String REQUEST_ID = "requestId";
    private static final String USER_ID = "userId";
    private static final String SERVICE_NAME = "serviceName";
    private static final String CORRELATION_ID = "correlationId";

    /**
     * Get logger instance for a class
     */
    public static Logger getLogger(Class<?> clazz) {
        return LoggerFactory.getLogger(clazz);
    }

    /**
     * Initialize MDC context with request ID
     */
    public static String initRequestContext() {
        String requestId = UUID.randomUUID().toString();
        MDC.put(REQUEST_ID, requestId);
        return requestId;
    }

    /**
     * Initialize MDC context with existing request ID
     */
    public static void initRequestContext(String requestId) {
        MDC.put(REQUEST_ID, requestId);
    }

    /**
     * Set user ID in MDC context
     */
    public static void setUserId(String userId) {
        if (userId != null && !userId.isEmpty()) {
            MDC.put(USER_ID, userId);
        }
    }

    /**
     * Set service name in MDC context
     */
    public static void setServiceName(String serviceName) {
        if (serviceName != null && !serviceName.isEmpty()) {
            MDC.put(SERVICE_NAME, serviceName);
        }
    }

    /**
     * Set correlation ID for distributed tracing
     */
    public static void setCorrelationId(String correlationId) {
        if (correlationId != null && !correlationId.isEmpty()) {
            MDC.put(CORRELATION_ID, correlationId);
        }
    }

    /**
     * Get current request ID from MDC
     */
    public static String getRequestId() {
        return MDC.get(REQUEST_ID);
    }

    /**
     * Get current user ID from MDC
     */
    public static String getUserId() {
        return MDC.get(USER_ID);
    }

    /**
     * Get current correlation ID from MDC
     */
    public static String getCorrelationId() {
        return MDC.get(CORRELATION_ID);
    }

    /**
     * Set custom MDC value
     */
    public static void put(String key, String value) {
        if (key != null && value != null) {
            MDC.put(key, value);
        }
    }

    /**
     * Get custom MDC value
     */
    public static String get(String key) {
        return MDC.get(key);
    }

    /**
     * Remove specific key from MDC
     */
    public static void remove(String key) {
        MDC.remove(key);
    }

    /**
     * Clear all MDC context
     */
    public static void clearContext() {
        MDC.clear();
    }

    /**
     * Get all MDC context as map
     */
    public static Map<String, String> getContextMap() {
        return MDC.getCopyOfContextMap();
    }

    /**
     * Set entire MDC context from map
     */
    public static void setContextMap(Map<String, String> contextMap) {
        if (contextMap != null) {
            MDC.setContextMap(contextMap);
        }
    }

    /**
     * Log method entry with parameters
     */
    public static void logMethodEntry(Logger logger, String methodName, Object... params) {
        if (logger.isDebugEnabled()) {
            StringBuilder sb = new StringBuilder("Entering method: ").append(methodName);
            if (params != null && params.length > 0) {
                sb.append(" with parameters: ");
                for (int i = 0; i < params.length; i++) {
                    sb.append(params[i]);
                    if (i < params.length - 1) {
                        sb.append(", ");
                    }
                }
            }
            logger.debug(sb.toString());
        }
    }

    /**
     * Log method exit with result
     */
    public static void logMethodExit(Logger logger, String methodName, Object result) {
        if (logger.isDebugEnabled()) {
            logger.debug("Exiting method: {} with result: {}", methodName, result);
        }
    }

    /**
     * Log exception with context
     */
    public static void logException(Logger logger, String message, Throwable throwable) {
        logger.error("{} | RequestId: {} | UserId: {}", 
            message, 
            getRequestId(), 
            getUserId(), 
            throwable);
    }

    /**
     * Log with timing information
     */
    public static void logWithTiming(Logger logger, String operation, long startTime) {
        long duration = System.currentTimeMillis() - startTime;
        logger.info("Operation '{}' completed in {} ms | RequestId: {}", 
            operation, 
            duration, 
            getRequestId());
    }
}
