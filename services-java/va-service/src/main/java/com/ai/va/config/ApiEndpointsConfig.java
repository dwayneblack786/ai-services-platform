package com.ai.va.config;

import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.context.annotation.Configuration;

import java.util.HashMap;
import java.util.Map;

/**
 * External API Endpoints Configuration
 * Configure all external API endpoints per environment
 * Values loaded from application.yaml or environment-specific properties
 */
@Configuration
@ConfigurationProperties(prefix = "api.endpoints")
public class ApiEndpointsConfig {

    private Map<String, EndpointConfig> endpoints = new HashMap<>();

    public Map<String, EndpointConfig> getEndpoints() {
        return endpoints;
    }

    public void setEndpoints(Map<String, EndpointConfig> endpoints) {
        this.endpoints = endpoints;
    }

    /**
     * Get endpoint configuration by name
     * 
     * @param name The endpoint name (e.g., "llm", "payment", "notification")
     * @return The endpoint configuration
     */
    public EndpointConfig getEndpoint(String name) {
        return endpoints.get(name);
    }

    /**
     * Configuration for a single endpoint
     */
    public static class EndpointConfig {
        private String url;
        private String apiKey;
        private Map<String, String> headers = new HashMap<>();

        public String getUrl() {
            return url;
        }

        public void setUrl(String url) {
            this.url = url;
        }

        public String getApiKey() {
            return apiKey;
        }

        public void setApiKey(String apiKey) {
            this.apiKey = apiKey;
        }

        public Map<String, String> getHeaders() {
            return headers;
        }

        public void setHeaders(Map<String, String> headers) {
            this.headers = headers;
        }

        /**
         * Get headers with API key included if configured
         * 
         * @return Map of headers ready to use
         */
        public Map<String, String> getHeadersWithAuth() {
            Map<String, String> allHeaders = new HashMap<>(headers);
            
            if (apiKey != null && !apiKey.isEmpty()) {
                allHeaders.put("Authorization", "Bearer " + apiKey);
            }
            
            return allHeaders;
        }
    }
}
