package com.ai.va.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.web.client.RestTemplate;

/**
 * API Client Configuration
 * Configures RestTemplate for external API calls
 * Can be used to call any OpenAPI/REST endpoints configured per environment
 */
@Configuration
public class ApiClientConfig {

    @Value("${api.client.timeout:300}")
    private int timeout;

    /**
     * Creates a RestTemplate for general API calls
     * Used by ApiClientService to call configured external endpoints
     * 
     * @return Configured RestTemplate instance
     */
    @Bean(name = "apiRestTemplate")
    public RestTemplate apiRestTemplate() {
        SimpleClientHttpRequestFactory factory = new SimpleClientHttpRequestFactory();
        factory.setConnectTimeout(timeout * 1000);
        factory.setReadTimeout(timeout * 1000);

        return new RestTemplate(factory);
    }
}
