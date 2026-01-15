package com.ai.va.test;

import com.ai.common.logging.LogFactory;
import org.slf4j.Logger;

/**
 * Test class to demonstrate centralized debug logging control
 * 
 * To disable debug logging:
 * 1. Open src/main/resources/application.properties
 * 2. Set: logging.debug.enabled=false
 * 3. Rebuild and run
 * 
 * All logger.debug() and LogFactory.debug() calls will be suppressed
 * while INFO, WARN, and ERROR logs continue to work normally.
 */
public class LoggingTest {

    private static final Logger logger = LogFactory.getLogger(LoggingTest.class);

    public static void main(String[] args) {
        System.out.println("\n=== Testing Centralized Debug Logging Control ===\n");
        
        // Check if debug is enabled
        System.out.println("Debug logging enabled: " + LogFactory.isDebugEnabled());
        System.out.println();
        
        // Test debug logging (controlled by application.properties)
        logger.debug("This is a DEBUG message (controlled by logging.debug.enabled)");
        LogFactory.debug(logger, "This is a DEBUG message via LogFactory (controlled by logging.debug.enabled)");
        
        // Test other log levels (always work regardless of debug setting)
        logger.info("This is an INFO message (always works)");
        logger.warn("This is a WARN message (always works)");
        logger.error("This is an ERROR message (always works)");
        
        // Test method entry/exit (controlled by debug setting)
        testMethod("example", 123);
        
        System.out.println("\n=== Test Complete ===");
        System.out.println("Check logs/va-service.log to see the output");
        System.out.println("To disable debug logs, set logging.debug.enabled=false in application.properties");
    }
    
    private static void testMethod(String param1, int param2) {
        LogFactory.logEntry(logger, "testMethod", param1, param2);
        
        logger.info("Executing testMethod with param1={} and param2={}", param1, param2);
        
        LogFactory.logExit(logger, "testMethod", "success");
    }
}
