package com.ai.va.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.client.RestTemplate;

/**
 * Configuration for REST client beans.
 */
@Configuration
public class RestClientConfig {
    
    /**
     * Provides a RestTemplate bean for HTTP communication.
     * Used by WhisperSttService to communicate with the Python Whisper server.
     */
    @Bean
    public RestTemplate restTemplate() {
        return new RestTemplate();
    }
}
