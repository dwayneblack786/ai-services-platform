package com.ai.va.util;

import org.springframework.http.*;
import org.springframework.web.client.RestTemplate;

/**
 * Simple TestRestTemplate implementation for testing REST endpoints
 * Created as a workaround for Spring Boot 4.x compatibility
 */
public class TestRestTemplate {
    
    private final RestTemplate restTemplate;
    private final String baseUrl;
    
    public TestRestTemplate(String baseUrl) {
        this.restTemplate = new RestTemplate();
        this.baseUrl = baseUrl;
    }
    
    public TestRestTemplate() {
        this("");
    }
    
    /**
     * GET request
     */
    public <T> ResponseEntity<T> getForEntity(String url, Class<T> responseType) {
        return restTemplate.getForEntity(baseUrl + url, responseType);
    }
    
    /**
     * POST request
     */
    public <T> ResponseEntity<T> postForEntity(String url, Object request, Class<T> responseType) {
        return restTemplate.postForEntity(baseUrl + url, request, responseType);
    }
    
    /**
     * POST request with headers
     */
    public <T> ResponseEntity<T> postForEntity(String url, HttpEntity<?> requestEntity, Class<T> responseType) {
        return restTemplate.postForEntity(baseUrl + url, requestEntity, responseType);
    }
    
    /**
     * PUT request
     */
    public <T> ResponseEntity<T> exchange(String url, HttpMethod method, HttpEntity<?> requestEntity, Class<T> responseType) {
        return restTemplate.exchange(baseUrl + url, method, requestEntity, responseType);
    }
    
    /**
     * DELETE request
     */
    public void delete(String url) {
        restTemplate.delete(baseUrl + url);
    }
    
    /**
     * Generic exchange method
     */
    public <T> ResponseEntity<T> exchange(String url, HttpMethod method, HttpEntity<?> requestEntity, 
                                          org.springframework.core.ParameterizedTypeReference<T> responseType) {
        return restTemplate.exchange(baseUrl + url, method, requestEntity, responseType);
    }
    
    /**
     * Get underlying RestTemplate
     */
    public RestTemplate getRestTemplate() {
        return restTemplate;
    }
    
    /**
     * Set base URL
     */
    public TestRestTemplate withBasicAuth(String username, String password) {
        // For simplicity, we can add this later if needed
        return this;
    }
}
