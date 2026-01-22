package com.ai.va.client;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;
import java.util.List;
import java.util.Map;
import java.util.function.Consumer;
import java.util.stream.Stream;

import org.slf4j.Logger;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import com.ai.common.logging.LogFactory;
import com.fasterxml.jackson.databind.ObjectMapper;

/**
 * LLM Client for connecting to LM Studio or other OpenAI-compatible APIs
 * Uses standard HttpClient for direct API communication
 */
@Component
public class LlmClient {

    private static final Logger logger = LogFactory.getLogger(LlmClient.class);
    
    private final String provider;
    private final String apiUrl;
    private final String apiKey;
    private final String defaultModel;
    private final String deployment;
    private final int timeout;
    private final HttpClient httpClient;
    private final ObjectMapper objectMapper;

    public LlmClient(
            @Value("${api.endpoints.llm.provider:lm-studio}") String provider,
            @Value("${api.endpoints.llm.url}") String apiUrl,
            @Value("${api.endpoints.llm.api-key:lm-studio}") String apiKey,
            @Value("${api.endpoints.llm.model:google/gemma-2-9b}") String defaultModel,
            @Value("${api.endpoints.llm.deployment:}") String deployment,
            @Value("${api.client.timeout:300}") int timeout) {
        
        this.provider = provider;
        this.apiUrl = apiUrl;
        this.apiKey = apiKey;
        this.defaultModel = defaultModel;
        this.deployment = deployment;
        this.timeout = timeout;
        this.httpClient = HttpClient.newBuilder()
                .connectTimeout(Duration.ofSeconds(30))  // Connection timeout
                .version(HttpClient.Version.HTTP_1_1)    // Use HTTP/1.1 for better compatibility
                .followRedirects(HttpClient.Redirect.NORMAL)
                .build();
        this.objectMapper = new ObjectMapper();
        
        logger.info("[LLMClient] Initialized with provider: {}", provider);
        logger.info("[LLMClient] URL: {}", apiUrl);
        logger.info("[LLMClient] Default model: {}", defaultModel);
        if ("azure-openai".equals(provider)) {
            logger.info("[LLMClient] Azure deployment: {}", deployment);
        }
        logger.info("[LLMClient] Connect timeout: 30 seconds");
        logger.info("[LLMClient] Request timeout: {} seconds", timeout);
    }

    /**
     * Generate response from language model with system prompt
     * 
     * @param prompt Full prompt including context
     * @param maxTokens Maximum tokens to generate
     * @param temperature Sampling temperature
     * @return Generated text
     */
    public String generate(String prompt, int maxTokens, double temperature) {
        try {
            return getChatCompletion("You are a helpful AI assistant.", prompt, temperature);
        } catch (Exception e) {
            logger.error("[LLMClient] Error generating response: {}", e.getMessage(), e);
            return "I apologize, but I'm having trouble processing your request right now.";
        }
    }

    /**
     * Send a chat completion request with system prompt and user message
     * 
     * @param systemPrompt System-level instructions for the LLM
     * @param userMessage User's message/query
     * @param temperature Temperature setting (0.0 to 1.0)
     * @return LLM response text
     */
    public String getChatCompletion(String systemPrompt, String userMessage, double temperature) throws Exception {
        return getChatCompletion(systemPrompt, userMessage, temperature, defaultModel);
    }

    /**
     * Send a chat completion request with custom model and max tokens
     * 
     * @param systemPrompt System-level instructions for the LLM
     * @param userMessage User's message/query
     * @param temperature Temperature setting (0.0 to 1.0)
     * @param model Model identifier
     * @return LLM response text
     */
    public String getChatCompletion(String systemPrompt, String userMessage, double temperature, String model) throws Exception {
        return getChatCompletion(systemPrompt, userMessage, temperature, model, 2000);
    }

    /**
     * Send a chat completion request with full configuration
     * 
     * @param systemPrompt System-level instructions for the LLM
     * @param userMessage User's message/query
     * @param temperature Temperature setting (0.0 to 1.0)
     * @param model Model identifier
     * @param maxTokens Maximum tokens to generate
     * @return LLM response text
     */
    public String getChatCompletion(String systemPrompt, String userMessage, double temperature, String model, int maxTokens) throws Exception {
        LogFactory.logEntry(logger, "getChatCompletion",
                "model=%s, temp=%.2f, maxTokens=%d".formatted(model, temperature, maxTokens));
        
        try {
            // Validate inputs
            if (userMessage == null || userMessage.trim().isEmpty()) {
                logger.warn("[LLMClient] Empty user message provided");
                throw new IllegalArgumentException("User message cannot be empty");
            }
            
            String effectiveModel = model != null ? model : defaultModel;
            
            // Build the request URL (different for Azure vs LM Studio)
            String requestUrl = buildRequestUrl();
            
            // Build messages array with system and user messages
            List<Map<String, String>> messages = List.of(
                Map.of("role", "system", "content", systemPrompt != null ? systemPrompt : "You are a helpful AI assistant."),
                Map.of("role", "user", "content", userMessage)
            );

            // Build request body (Azure doesn't need model field in body)
            Map<String, Object> requestBody = buildRequestBody(messages, temperature, maxTokens, effectiveModel);

            String jsonBody = objectMapper.writeValueAsString(requestBody);
            
            LogFactory.debug(logger, "[LLMClient] Sending request to: {} with model: {}", requestUrl, effectiveModel);
            LogFactory.debug(logger, "[LLMClient] Provider: {}", provider);
            LogFactory.debug(logger, "[LLMClient] System prompt length: {} chars", systemPrompt != null ? systemPrompt.length() : 0);
            LogFactory.debug(logger, "[LLMClient] User message length: {} chars", userMessage.length());
            LogFactory.debug(logger, "[LLMClient] Request body: {}", jsonBody);

            HttpRequest.Builder requestBuilder = HttpRequest.newBuilder()
                    .uri(URI.create(requestUrl))
                    .header("Content-Type", "application/json")
                    .timeout(Duration.ofSeconds(timeout))
                    .POST(HttpRequest.BodyPublishers.ofString(jsonBody));

            // Add authentication headers based on provider
            addAuthHeaders(requestBuilder);

            HttpRequest request = requestBuilder.build();
            
            // Generate and log curl command for debugging
            String curlCommand = generateCurlCommand(requestUrl, jsonBody);
            logger.info("[LLMClient] ============================================");
            logger.info("[LLMClient] CURL COMMAND FOR DEBUGGING:");
            logger.info(curlCommand);
            logger.info("[LLMClient] ============================================");
            
            long startTime = System.currentTimeMillis();
            logger.info("[LLMClient] Sending HTTP request to LLM API...");
            logger.info("[LLMClient] About to call httpClient.send()...");
            
            HttpResponse<String> response = null;
            try {
                response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());
                logger.info("[LLMClient] httpClient.send() completed successfully");
            } catch (Exception sendEx) {
                logger.error("[LLMClient] Exception during httpClient.send(): {}", sendEx.getMessage(), sendEx);
                throw sendEx;
            }
            
            long duration = System.currentTimeMillis() - startTime;
            
            logger.info("[LLMClient] Response received - Status: {}, Duration: {}ms", response.statusCode(), duration);
            logger.info("[LLMClient] Response headers: {}", response.headers().map());
            logger.info("[LLMClient] Response body length: {} chars", response.body() != null ? response.body().length() : 0);
            LogFactory.debug(logger, "[LLMClient] Response body: {}", response.body());

            if (response.statusCode() == 200) {
                logger.info("[LLMClient] Status 200 OK - parsing response...");
                String content = parseResponse(response.body());
                logger.info("[LLMClient] Successfully got completion ({}ms, {} chars response)", duration, content.length());
                LogFactory.debug(logger, "[LLMClient] Response preview: {}...",  content);
                LogFactory.logExit(logger, "getChatCompletion", "success");
                return content;
            } else {
                String errorMsg = "LLM API request failed with status %d: %s".formatted(
                        response.statusCode(), response.body());
                logger.error("[LLMClient] API error: {}", errorMsg);
                throw new RuntimeException(errorMsg);
            }
            
        } catch (IllegalArgumentException e) {
            logger.error("[LLMClient] Invalid input: {}", e.getMessage());
            throw e;
        } catch (java.net.http.HttpTimeoutException e) {
            logger.error("[LLMClient] Request timed out after {} seconds", timeout);
            throw new RuntimeException("LLM API request timed out after " + timeout + " seconds", e);
        } catch (java.io.IOException e) {
            logger.error("[LLMClient] Network error communicating with LLM API: {}", e.getMessage(), e);
            throw new RuntimeException("Network error communicating with LLM API: " + e.getMessage(), e);
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            logger.error("[LLMClient] Request interrupted");
            throw new RuntimeException("LLM API request was interrupted", e);
        } catch (Exception e) {
            logger.error("[LLMClient] Unexpected error in getChatCompletion: {}", e.getMessage(), e);
            logger.error("[LLMClient] Error type: {}", e.getClass().getName());
            if (e.getCause() != null) {
                logger.error("[LLMClient] Caused by: {} - {}", e.getCause().getClass().getName(), e.getCause().getMessage());
            }
            e.printStackTrace();
            throw new RuntimeException("Failed to get chat completion: " + e.getMessage(), e);
        }
    }

    /**
     * Generate curl command for debugging
     * @param url API endpoint URL
     * @param jsonBody Request body JSON
     * @return Formatted curl command
     */
    private String generateCurlCommand(String url, String jsonBody) {
        StringBuilder curl = new StringBuilder();
        curl.append("curl -X POST \\").append("\n");
        curl.append("  '").append(url).append("' \\").append("\n");
        curl.append("  -H 'Content-Type: application/json' \\").append("\n");
        
        // Add authorization headers based on provider
        if ("azure-openai".equals(provider)) {
            curl.append("  -H 'api-key: ").append(apiKey).append("' \\").append("\n");
        } else if (apiKey != null && !apiKey.isEmpty() && !apiKey.equals("lm-studio") && !apiKey.equals("not-needed")) {
            curl.append("  -H 'Authorization: Bearer ").append(apiKey).append("' \\").append("\n");
        }
        
        // Escape single quotes in JSON body for shell
        String escapedBody = jsonBody.replace("'", "'\\''");
        curl.append("  -d '").append(escapedBody).append("'");
        
        return curl.toString();
    }
    
    /**
     * Build the request URL based on provider type
     * @return Complete API endpoint URL
     */
    private String buildRequestUrl() {
        if ("azure-openai".equals(provider)) {
            // Azure format: {endpoint}/openai/deployments/{deployment}/chat/completions?api-version=2024-02-01
            String baseUrl = apiUrl;
            // Remove trailing slash if present
            if (baseUrl.endsWith("/")) {
                baseUrl = baseUrl.substring(0, baseUrl.length() - 1);
            }
            // Check if URL already contains the full path
            if (baseUrl.contains("/chat/completions")) {
                return baseUrl.contains("api-version") ? baseUrl : baseUrl + "?api-version=2024-02-01";
            }
            // Build full Azure URL
            String deploymentName = deployment != null && !deployment.isEmpty() ? deployment : defaultModel;
            return "%s/openai/deployments/%s/chat/completions?api-version=2024-02-01".formatted(
                    baseUrl, deploymentName);
        } else {
            // LM Studio / OpenAI format: {endpoint}/chat/completions (or full URL as-is)
            return apiUrl;
        }
    }
    
    /**
     * Build request body based on provider type
     * @param messages Chat messages
     * @param temperature Temperature setting
     * @param maxTokens Max tokens to generate
     * @param model Model name
     * @return Request body map
     */
    private Map<String, Object> buildRequestBody(List<Map<String, String>> messages, 
                                                   double temperature, int maxTokens, String model) {
        Map<String, Object> body = new java.util.HashMap<>();
        body.put("messages", messages);
        body.put("temperature", temperature);
        body.put("max_tokens", maxTokens);
        
        // Only include model for non-Azure providers (Azure uses deployment in URL)
        if (!"azure-openai".equals(provider)) {
            body.put("model", model);
        }
        
        return body;
    }
    
    /**
     * Add authentication headers based on provider type
     * @param requestBuilder HTTP request builder
     */
    private void addAuthHeaders(HttpRequest.Builder requestBuilder) {
        if ("azure-openai".equals(provider)) {
            // Azure uses api-key header
            requestBuilder.header("api-key", apiKey);
            LogFactory.debug(logger, "[LLMClient] Using Azure api-key authentication");
        } else if (apiKey != null && !apiKey.isEmpty() && 
                   !apiKey.equals("lm-studio") && !apiKey.equals("not-needed")) {
            // OpenAI-style Bearer token
            requestBuilder.header("Authorization", "Bearer " + apiKey);
            LogFactory.debug(logger, "[LLMClient] Using Bearer token authentication");
        } else {
            LogFactory.debug(logger, "[LLMClient] No authentication (LM Studio mode)");
        }
    }

    /**
     * Parse the LLM API response to extract the message content
     */
    @SuppressWarnings("unchecked")
    private String parseResponse(String responseBody) throws Exception {
        try {
            logger.info("[LLMClient] Parsing response, body length: {} chars", responseBody.length());
            logger.info("[LLMClient] Response body preview: {}", responseBody.substring(0, Math.min(500, responseBody.length())));
            
            Map<String, Object> jsonResponse = objectMapper.readValue(responseBody, Map.class);
            logger.info("[LLMClient] Parsed JSON, keys: {}", jsonResponse.keySet());
            
            List<Map<String, Object>> choices = (List<Map<String, Object>>) jsonResponse.get("choices");
            
            if (choices == null || choices.isEmpty()) {
                logger.error("[LLMClient] No choices in LLM response: {}", responseBody);
                throw new RuntimeException("No choices in LLM response");
            }
            
            logger.info("[LLMClient] Found {} choices", choices.size());
            Map<String, Object> firstChoice = choices.getFirst();
            logger.info("[LLMClient] First choice keys: {}", firstChoice.keySet());

            Map<String, Object> messageContent = (Map<String, Object>) firstChoice.get("message");
            if (messageContent == null) {
                logger.error("[LLMClient] No message in choice: {}", responseBody);
                throw new RuntimeException("No message content in LLM response");
            }
            
            logger.info("[LLMClient] Message keys: {}", messageContent.keySet());
            String content = (String) messageContent.get("content");
            
            if (content == null) {
                logger.error("[LLMClient] Null content in message: {}", responseBody);
                throw new RuntimeException("Null content in LLM response");
            }
            
            logger.info("[LLMClient] Extracted content length: {} chars", content.length());
            logger.info("[LLMClient] Raw content: {}", content);
            
            // Check if content is JSON-wrapped (some LLMs return {"response": "text"}, {"greeting": "text"}, {"assistant": "text"})
            String finalContent = content.trim();
            if (finalContent.startsWith("{") && (finalContent.contains("\"response\"") || finalContent.contains("\"greeting\"") || finalContent.contains("\"message\"") || finalContent.contains("\"assistant\""))) {
                try {
                    Map<String, Object> contentJson = objectMapper.readValue(finalContent, Map.class);
                    
                    // Try different keys in order of preference
                    if (contentJson.containsKey("greeting")) {
                        finalContent = (String) contentJson.get("greeting");
                        logger.info("[LLMClient] Unwrapped JSON greeting, new length: {} chars", finalContent.length());
                    } else if (contentJson.containsKey("assistant")) {
                        finalContent = (String) contentJson.get("assistant");
                        logger.info("[LLMClient] Unwrapped JSON assistant, new length: {} chars", finalContent.length());
                    } else if (contentJson.containsKey("response")) {
                        finalContent = (String) contentJson.get("response");
                        logger.info("[LLMClient] Unwrapped JSON response, new length: {} chars", finalContent.length());
                    } else if (contentJson.containsKey("message")) {
                        finalContent = (String) contentJson.get("message");
                        logger.info("[LLMClient] Unwrapped JSON message, new length: {} chars", finalContent.length());
                    }
                } catch (Exception jsonEx) {
                    logger.warn("[LLMClient] Content looks like JSON but failed to parse, using as-is: {}", jsonEx.getMessage());
                    // Use original content if parsing fails
                }
            }
            
            logger.info("[LLMClient] Final content: {}", finalContent);
            
            return finalContent;
        } catch (Exception e) {
            logger.error("[LLMClient] Error parsing response: {}", e.getMessage());
            logger.error("[LLMClient] Response body was: {}", responseBody);
            throw new RuntimeException("Failed to parse LLM response: " + e.getMessage(), e);
        }
    }

    /**
     * Test connection to LLM endpoint
     */
    public boolean testConnection() {
        try {
            String response = getChatCompletion(
                "You are a helpful assistant.", 
                "Say 'Hello' if you can hear me.", 
                0.7
            );
            return response != null && !response.isEmpty();
        } catch (Exception e) {
            logger.error("[LLMClient] Connection test failed: {}", e.getMessage(), e);
            return false;
        }
    }

    /**
     * Stream chat completion with token-by-token callback
     * Uses Server-Sent Events (SSE) format for real-time streaming
     * 
     * @param systemPrompt System-level instructions for the LLM
     * @param userMessage User's message/query
     * @param temperature Temperature setting (0.0 to 1.0)
     * @param tokenCallback Consumer function called for each token
     * @return Complete accumulated response text
     */
    public String streamChatCompletion(String systemPrompt, String userMessage, double temperature, Consumer<String> tokenCallback) throws Exception {
        return streamChatCompletion(systemPrompt, userMessage, temperature, defaultModel, 2000, tokenCallback);
    }

    /**
     * Stream chat completion with full configuration and token-by-token callback
     * 
     * @param systemPrompt System-level instructions for the LLM
     * @param userMessage User's message/query
     * @param temperature Temperature setting (0.0 to 1.0)
     * @param model Model identifier
     * @param maxTokens Maximum tokens to generate
     * @param tokenCallback Consumer function called for each token
     * @return Complete accumulated response text
     */
    public String streamChatCompletion(String systemPrompt, String userMessage, double temperature, String model, int maxTokens, Consumer<String> tokenCallback) throws Exception {
        LogFactory.logEntry(logger, "streamChatCompletion",
                "model=%s, temp=%.2f, maxTokens=%d".formatted(model, temperature, maxTokens));
        
        try {
            // Validate inputs
            if (userMessage == null || userMessage.trim().isEmpty()) {
                logger.warn("[LLMClient] Empty user message provided");
                throw new IllegalArgumentException("User message cannot be empty");
            }
            
            String effectiveModel = model != null ? model : defaultModel;
            
            // Build the request URL (different for Azure vs LM Studio)
            String requestUrl = buildRequestUrl();
            
            // Build messages array with system and user messages
            List<Map<String, String>> messages = List.of(
                Map.of("role", "system", "content", systemPrompt != null ? systemPrompt : "You are a helpful AI assistant."),
                Map.of("role", "user", "content", userMessage)
            );

            // Build request body with streaming enabled
            Map<String, Object> requestBody = buildRequestBody(messages, temperature, maxTokens, effectiveModel);
            requestBody.put("stream", true);  // Enable streaming mode

            String jsonBody = objectMapper.writeValueAsString(requestBody);
            
            LogFactory.debug(logger, "[LLMClient] Sending streaming request to: {} with model: {}", requestUrl, effectiveModel);
            LogFactory.debug(logger, "[LLMClient] Provider: {}", provider);
            LogFactory.debug(logger, "[LLMClient] System prompt length: {} chars", systemPrompt != null ? systemPrompt.length() : 0);
            LogFactory.debug(logger, "[LLMClient] User message length: {} chars", userMessage.length());

            HttpRequest.Builder requestBuilder = HttpRequest.newBuilder()
                    .uri(URI.create(requestUrl))
                    .header("Content-Type", "application/json")
                    .header("Accept", "text/event-stream")  // SSE format
                    .timeout(Duration.ofSeconds(timeout))
                    .POST(HttpRequest.BodyPublishers.ofString(jsonBody));

            // Add authentication headers based on provider
            addAuthHeaders(requestBuilder);

            HttpRequest request = requestBuilder.build();
            
            long startTime = System.currentTimeMillis();
            logger.info("[LLMClient] Starting streaming request...");
            
            // Use ofLines() to process response line-by-line as it arrives
            HttpResponse<Stream<String>> response = httpClient.send(request, 
                HttpResponse.BodyHandlers.ofLines());
            
            if (response.statusCode() != 200) {
                String errorMsg = "LLM API streaming request failed with status %d".formatted(response.statusCode());
                logger.error("[LLMClient] Streaming error: {}", errorMsg);
                throw new RuntimeException(errorMsg);
            }

            logger.info("[LLMClient] Streaming response started - Status: {}", response.statusCode());
            
            StringBuilder fullResponse = new StringBuilder();
            
            // Process SSE stream line by line
            response.body().forEach(line -> {
                try {
                    if (line.isEmpty()) {
                        return; // Skip empty lines
                    }
                    
                    // SSE format: "data: {json}"
                    if (line.startsWith("data: ")) {
                        String data = line.substring(6); // Remove "data: " prefix
                        
                        // Check for stream end marker
                        if (data.equals("[DONE]")) {
                            logger.info("[LLMClient] Stream completed");
                            return;
                        }
                        
                        // Parse the JSON chunk
                        Map<String, Object> chunk = objectMapper.readValue(data, Map.class);
                        List<Map<String, Object>> choices = (List<Map<String, Object>>) chunk.get("choices");
                        
                        if (choices != null && !choices.isEmpty()) {
                            Map<String, Object> firstChoice = choices.getFirst();
                            Map<String, Object> delta = (Map<String, Object>) firstChoice.get("delta");
                            
                            if (delta != null && delta.containsKey("content")) {
                                String token = (String) delta.get("content");
                                if (token != null && !token.isEmpty()) {
                                    fullResponse.append(token);
                                    
                                    // Call token callback for real-time processing
                                    if (tokenCallback != null) {
                                        tokenCallback.accept(token);
                                    }
                                }
                            }
                        }
                    }
                } catch (Exception e) {
                    logger.error("[LLMClient] Error processing SSE line: {}", e.getMessage());
                }
            });
            
            long duration = System.currentTimeMillis() - startTime;
            String completeResponse = fullResponse.toString();
            
            logger.info("[LLMClient] Streaming completed ({}ms, {} chars)", duration, completeResponse.length());
            LogFactory.logExit(logger, "streamChatCompletion", "success");
            
            return completeResponse;
            
        } catch (java.net.http.HttpTimeoutException e) {
            logger.error("[LLMClient] Streaming request timed out after {} seconds", timeout);
            throw new RuntimeException("LLM streaming request timed out after " + timeout + " seconds", e);
        } catch (java.io.IOException e) {
            logger.error("[LLMClient] Network error during streaming: {}", e.getMessage(), e);
            throw new RuntimeException("Network error during streaming: " + e.getMessage(), e);
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            logger.error("[LLMClient] Streaming request interrupted");
            throw new RuntimeException("LLM streaming request was interrupted", e);
        } catch (Exception e) {
            logger.error("[LLMClient] Unexpected error in streamChatCompletion: {}", e.getMessage(), e);
            throw new RuntimeException("Failed to stream chat completion: " + e.getMessage(), e);
        }
    }
}
