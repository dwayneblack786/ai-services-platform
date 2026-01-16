package com.ai.va.controller;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.HashMap;
import java.util.Map;

/**
 * Health Check and Root Controller
 * Provides server status and health check endpoints for VA service
 */
@RestController
public class HealthController {

    @Value("${spring.application.name:Service}")
    private String applicationName;

    @Value("${server.port:8136}")
    private String serverPort;

    /**
     * Root endpoint
     * Returns basic server information
     * 
     * @return Server welcome message
     */
    @GetMapping("/")
    public ResponseEntity<Map<String, Object>> root() {
        Map<String, Object> response = new HashMap<>();
        response.put("status", "ok");
        response.put("message", "Welcome to " + applicationName);
        response.put("service", applicationName);
        response.put("version", "1.0.0");
        response.put("timestamp", LocalDateTime.now().format(DateTimeFormatter.ISO_LOCAL_DATE_TIME));
        response.put("port", serverPort);
        
        return ResponseEntity.ok(response);
    }

    /**
     * Health check endpoint
     * Used by monitoring systems and load balancers
     * 
     * @return Health status
     */
    @GetMapping("/health")
    public ResponseEntity<Map<String, Object>> health() {
        Map<String, Object> response = new HashMap<>();
        response.put("status", "UP");
        response.put("service", applicationName);
        response.put("timestamp", LocalDateTime.now().format(DateTimeFormatter.ISO_LOCAL_DATE_TIME));
        response.put("checks", Map.of(
            "application", "healthy",
            "server", "running"
        ));
        
        return ResponseEntity.ok(response);
    }

    /**
     * Readiness check endpoint
     * Indicates if the service is ready to accept traffic
     * 
     * @return Readiness status
     */
    @GetMapping("/ready")
    public ResponseEntity<Map<String, String>> ready() {
        Map<String, String> response = new HashMap<>();
        response.put("status", "ready");
        response.put("message", "Service is ready to accept requests");
        
        return ResponseEntity.ok(response);
    }

    /**
     * Liveness check endpoint
     * Indicates if the service is alive
     * 
     * @return Liveness status
     */
    @GetMapping("/live")
    public ResponseEntity<Map<String, String>> live() {
        Map<String, String> response = new HashMap<>();
        response.put("status", "alive");
        response.put("message", "Service is alive");
        
        return ResponseEntity.ok(response);
    }
}
