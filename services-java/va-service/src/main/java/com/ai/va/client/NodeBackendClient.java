package com.ai.va.client;

import com.ai.common.logging.LogFactory;
import com.ai.va.model.UsageUpdate;
import org.slf4j.Logger;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.*;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestTemplate;

/**
 * Node Backend Client
 * HTTP client for communicating with Node.js backend
 */
@Component
public class NodeBackendClient {

    private static final Logger logger = LogFactory.getLogger(NodeBackendClient.class);

    @Value("${node.backend.url:http://localhost:5000}")
    private String nodeBackendUrl;

    private final RestTemplate restTemplate;

    public NodeBackendClient() {
        this.restTemplate = new RestTemplate();
    }

    /**
     * Post usage metrics to Node.js backend
     * Updates assistant_calls.usage and subscriptions.usage for billing
     * 
     * @param usage Usage metrics to report
     * @return true if successful, false otherwise
     */
    public boolean postUsageMetrics(UsageUpdate usage) {
        try {
            String url = nodeBackendUrl + "/api/usage/assistant-call";
            
            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);
            
            HttpEntity<UsageUpdate> request = new HttpEntity<>(usage, headers);
            
            ResponseEntity<String> response = restTemplate.exchange(
                url,
                HttpMethod.POST,
                request,
                String.class
            );

            if (response.getStatusCode() == HttpStatus.OK || 
                response.getStatusCode() == HttpStatus.CREATED) {
                logger.info("Successfully posted usage metrics to Node backend");
                return true;
            } else {
                logger.error("Failed to post usage metrics: {}", response.getStatusCode());
                return false;
            }

        } catch (Exception e) {
            logger.error("Error posting usage metrics to Node backend: {}", e.getMessage(), e);
            return false;
        }
    }

    /**
     * Health check Node backend
     */
    public boolean isBackendAvailable() {
        try {
            String url = nodeBackendUrl + "/api/health";
            ResponseEntity<String> response = restTemplate.getForEntity(url, String.class);
            return response.getStatusCode() == HttpStatus.OK;
        } catch (Exception e) {
            return false;
        }
    }
}
