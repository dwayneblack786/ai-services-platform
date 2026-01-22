package com.ai.va.service;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import com.ai.va.config.ApiEndpointsConfig;

/**
 * Example service showing how to use ApiClientService to call external APIs
 * This demonstrates calling an LLM endpoint (OpenAI, LM Studio, Azure OpenAI, etc.)
 */
@Service
public class ExternalLlmService {

    @Autowired
    private ApiClientService apiClientService;

    @Autowired
    private ApiEndpointsConfig apiEndpointsConfig;

    /**
     * Example: Call LLM endpoint with a prompt
     * 
     * @param systemPrompt The system instructions
     * @param userMessage The user's message
     * @return The LLM's response
     */
    public String callLlm(String systemPrompt, String userMessage) {
        // Get the configured LLM endpoint
        ApiEndpointsConfig.EndpointConfig llmEndpoint = apiEndpointsConfig.getEndpoint("llm");
        
        if (llmEndpoint == null) {
            throw new RuntimeException("LLM endpoint not configured");
        }

        // Build request body for OpenAI-compatible API
        Map<String, Object> requestBody = new HashMap<>();
        requestBody.put("model", "local-model");
        requestBody.put("temperature", 0.7);
        requestBody.put("max_tokens", 500);
        
        List<Map<String, String>> messages = new ArrayList<>();
        if (systemPrompt != null && !systemPrompt.isEmpty()) {
            messages.add(Map.of("role", "system", "content", systemPrompt));
        }
        messages.add(Map.of("role", "user", "content", userMessage));
        requestBody.put("messages", messages);

        // Call the endpoint
        Map<?, ?> response = apiClientService.post(
            llmEndpoint.getUrl(),
            llmEndpoint.getHeadersWithAuth(),
            requestBody,
            Map.class
        );

        // Parse response (OpenAI format)
        if (response != null && response.containsKey("choices")) {
            @SuppressWarnings("unchecked")
			List<Map<String, Object>> choices = (List<Map<String, Object>>) response.get("choices");
            if (!choices.isEmpty()) {
                Map<String, Object> firstChoice = choices.getFirst();
                @SuppressWarnings("unchecked")
				Map<String, String> message = (Map<String, String>) firstChoice.get("message");
                return message.get("content");
            }
        }

        return null;
    }

    /**
     * Example: Call any custom OpenAPI endpoint
     * 
     * @param endpointName Name configured in application.yaml
     * @param body Request body
     * @return Response as Map
     */
    @SuppressWarnings("unchecked")
	public Map<String, Object> callCustomEndpoint(String endpointName, Object body) {
        ApiEndpointsConfig.EndpointConfig endpoint = apiEndpointsConfig.getEndpoint(endpointName);
        
        if (endpoint == null) {
            throw new RuntimeException("Endpoint '" + endpointName + "' not configured");
        }

        return apiClientService.post(
            endpoint.getUrl(),
            endpoint.getHeadersWithAuth(),
            body,
            Map.class
        );
    }
}
