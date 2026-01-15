package com.ai.va.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.filter.CommonsRequestLoggingFilter;

/**
 * Request Logging Configuration
 * Enables detailed HTTP request logging when debug mode is enabled
 */
@Configuration
public class RequestLoggingConfig {

    @Value("${app.debug:false}")
    private boolean debugEnabled;

    @Bean
    public CommonsRequestLoggingFilter requestLoggingFilter() {
        CommonsRequestLoggingFilter filter = new CommonsRequestLoggingFilter();
        
        if (debugEnabled) {
            filter.setIncludeQueryString(true);
            filter.setIncludePayload(true);
            filter.setMaxPayloadLength(10000);
            filter.setIncludeHeaders(true);
            filter.setIncludeClientInfo(true);
            filter.setAfterMessagePrefix("REQUEST DATA : ");
        }
        
        return filter;
    }
}
