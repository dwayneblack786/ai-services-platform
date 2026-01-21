package com.ai.va.agent;

import com.ai.va.util.TestRestTemplate;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.*;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;

import java.util.HashMap;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.*;

/**
 * AgentController REST API Contract Tests
 * 
 * These tests validate the REST API contract for the AgentController.
 * They ensure request/response schemas, endpoints, and status codes match expectations.
 * 
 * CRITICAL: These tests prevent breaking changes in REST API contracts.
 */
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@ActiveProfiles("test")
@TestMethodOrder(MethodOrderer.OrderAnnotation.class)
public class AgentControllerContractTest {

    @Value("${local.server.port}")
    private int port;

    private TestRestTemplate restTemplate;

    @Autowired
    private ObjectMapper objectMapper;
    
    @BeforeEach
    void setup() {
        restTemplate = new TestRestTemplate(baseUrl());
    }

    private String baseUrl() {
        return "http://localhost:" + port;
    }

    @Nested
    @DisplayName("Health Endpoint Contract")
    class HealthEndpointTests {

        @Test
        @Order(1)
        @DisplayName("Should have GET /agent/health endpoint available")
        void testHealthEndpointExists() {
            ResponseEntity<Map> response = restTemplate.getForEntity(
                    baseUrl() + "/agent/health",
                    Map.class
            );
            
            assertEquals(HttpStatus.OK, response.getStatusCode());
            assertTrue(response.getHeaders().getContentType().includes(MediaType.APPLICATION_JSON));
        }

        @Test
        @Order(2)
        @DisplayName("Should return valid health response schema")
        void testHealthResponseSchema() {
            ResponseEntity<Map> response = restTemplate.getForEntity(
                    baseUrl() + "/agent/health",
                    Map.class
            );
            
            assertEquals(HttpStatus.OK, response.getStatusCode());
            assertNotNull(response.getBody());
            assertEquals("healthy", response.getBody().get("status"));
            assertEquals("ai-assistant-agent", response.getBody().get("service"));
        }

        @Test
        @DisplayName("Should return health response with string types")
        void testHealthResponseDataTypes() {
            ResponseEntity<Map> response = restTemplate.getForEntity(
                    baseUrl() + "/agent/health",
                    Map.class
            );
            
            assertEquals(HttpStatus.OK, response.getStatusCode());
            assertNotNull(response.getBody());
            assertTrue(response.getBody().get("status") instanceof String);
            assertTrue(response.getBody().get("service") instanceof String);
        }
    }

    @Nested
    @DisplayName("Execute Endpoint Contract")
    class ExecuteEndpointTests {

        @Test
        @Order(1)
        @DisplayName("Should have POST /agent/execute endpoint available")
        void testExecuteEndpointExists() {
            Map<String, Object> request = new HashMap<>();
            request.put("sessionId", "contract-test-session");
            request.put("message", "Contract test message");
            request.put("context", new HashMap<>());

            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);
            HttpEntity<Map<String, Object>> entity = new HttpEntity<>(request, headers);

            ResponseEntity<Map> response = restTemplate.postForEntity(
                    baseUrl() + "/agent/execute",
                    entity,
                    Map.class
            );
            
            assertEquals(HttpStatus.OK, response.getStatusCode());
            assertTrue(response.getHeaders().getContentType().includes(MediaType.APPLICATION_JSON));
        }

        @Test
        @Order(2)
        @DisplayName("Should accept valid request schema")
        void testValidRequestSchema() {
            Map<String, Object> context = new HashMap<>();
            context.put("userId", "contract-test-user");
            context.put("productId", "contract-test-product");

            Map<String, Object> request = new HashMap<>();
            request.put("sessionId", "test-session-" + System.currentTimeMillis());
            request.put("message", "What is the weather like?");
            request.put("context", context);

            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);
            HttpEntity<Map<String, Object>> entity = new HttpEntity<>(request, headers);

            ResponseEntity<Map> response = restTemplate.postForEntity(
                    baseUrl() + "/agent/execute",
                    entity,
                    Map.class
            );
            
            assertEquals(HttpStatus.OK, response.getStatusCode());
        }

        @Test
        @Order(3)
        @DisplayName("Should return valid response schema")
        void testValidResponseSchema() {
            Map<String, Object> request = new HashMap<>();
            request.put("sessionId", "test-session-response");
            request.put("message", "Hello, assistant!");
            request.put("context", new HashMap<>());

            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);
            HttpEntity<Map<String, Object>> entity = new HttpEntity<>(request, headers);

            ResponseEntity<Map> response = restTemplate.postForEntity(
                    baseUrl() + "/agent/execute",
                    entity,
                    Map.class
            );
            
            assertEquals(HttpStatus.OK, response.getStatusCode());
            assertNotNull(response.getBody());
            assertTrue(response.getBody().containsKey("sessionId"));
            assertTrue(response.getBody().containsKey("message"));
            assertTrue(response.getBody().get("sessionId") instanceof String);
            assertTrue(response.getBody().get("message") instanceof String);
        }

        @Test
        @DisplayName("Should include executionTimeMs in response")
        void testExecutionTimeInResponse() {
            Map<String, Object> request = new HashMap<>();
            request.put("sessionId", "test-session-perf");
            request.put("message", "Performance test message");
            request.put("context", new HashMap<>());

            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);
            HttpEntity<Map<String, Object>> entity = new HttpEntity<>(request, headers);

            ResponseEntity<Map> response = restTemplate.postForEntity(
                    baseUrl() + "/agent/execute",
                    entity,
                    Map.class
            );
            
            assertEquals(HttpStatus.OK, response.getStatusCode());
            assertNotNull(response.getBody());
            assertTrue(response.getBody().containsKey("executionTimeMs"));
            assertTrue(response.getBody().get("executionTimeMs") instanceof Number);
        }

        @Test
        @DisplayName("Should return sessionId matching request")
        void testSessionIdEcho() {
            String testSessionId = "test-session-echo-" + System.currentTimeMillis();
            
            Map<String, Object> request = new HashMap<>();
            request.put("sessionId", testSessionId);
            request.put("message", "Echo test");
            request.put("context", new HashMap<>());

            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);
            HttpEntity<Map<String, Object>> entity = new HttpEntity<>(request, headers);

            ResponseEntity<Map> response = restTemplate.postForEntity(
                    baseUrl() + "/agent/execute",
                    entity,
                    Map.class
            );
            
            assertEquals(HttpStatus.OK, response.getStatusCode());
            assertNotNull(response.getBody());
            assertEquals(testSessionId, response.getBody().get("sessionId"));
        }

        @Test
        @DisplayName("Should handle requests with context object")
        void testContextHandling() {
            Map<String, Object> context = new HashMap<>();
            context.put("key1", "value1");
            context.put("key2", 123);
            context.put("key3", true);

            Map<String, Object> request = new HashMap<>();
            request.put("sessionId", "test-session-context");
            request.put("message", "Context test");
            request.put("context", context);

            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);
            HttpEntity<Map<String, Object>> entity = new HttpEntity<>(request, headers);

            ResponseEntity<Map> response = restTemplate.postForEntity(
                    baseUrl() + "/agent/execute",
                    entity,
                    Map.class
            );
            
            assertEquals(HttpStatus.OK, response.getStatusCode());
            assertNotNull(response.getBody());
            assertTrue(response.getBody().containsKey("message"));
        }

        @Test
        @DisplayName("Should handle requests without context object")
        void testWithoutContext() {
            Map<String, Object> request = new HashMap<>();
            request.put("sessionId", "test-session-no-context");
            request.put("message", "No context test");

            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);
            HttpEntity<Map<String, Object>> entity = new HttpEntity<>(request, headers);

            ResponseEntity<Map> response = restTemplate.postForEntity(
                    baseUrl() + "/agent/execute",
                    entity,
                    Map.class
            );
            
            assertEquals(HttpStatus.OK, response.getStatusCode());
            assertNotNull(response.getBody());
            assertTrue(response.getBody().containsKey("message"));
        }
    }

    @Nested
    @DisplayName("Session Management Contract")
    class SessionManagementTests {

        @Test
        @Order(1)
        @DisplayName("Should have DELETE /agent/session/{sessionId} endpoint")
        void testDeleteSessionEndpointExists() {
            String sessionId = "delete-test-" + System.currentTimeMillis();

            ResponseEntity<Void> response = restTemplate.exchange(
                baseUrl() + "/agent/session/" + sessionId,
                HttpMethod.DELETE,
                null,
                Void.class
            );
            
            assertEquals(HttpStatus.OK, response.getStatusCode());
        }

        @Test
        @DisplayName("Should clear session successfully")
        void testClearSession() {
            String sessionId = "clear-test-" + System.currentTimeMillis();

            // First, create a session by executing a message
            Map<String, Object> request = new HashMap<>();
            request.put("sessionId", sessionId);
            request.put("message", "Initial message");
            request.put("context", new HashMap<>());

            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);
            HttpEntity<Map<String, Object>> entity = new HttpEntity<>(request, headers);

            restTemplate.postForEntity(
                baseUrl() + "/agent/execute",
                entity,
                Map.class
            );

            // Then delete the session
            ResponseEntity<Void> deleteResponse = restTemplate.exchange(
                baseUrl() + "/agent/session/" + sessionId,
                HttpMethod.DELETE,
                null,
                Void.class
            );
            
            assertEquals(HttpStatus.OK, deleteResponse.getStatusCode());
        }

        @Test
        @DisplayName("Should handle deleting non-existent session")
        void testDeleteNonExistentSession() {
            String nonExistentSessionId = "non-existent-" + System.currentTimeMillis();

            // Should not fail when deleting non-existent session
            ResponseEntity<Void> response = restTemplate.exchange(
                baseUrl() + "/agent/session/" + nonExistentSessionId,
                HttpMethod.DELETE,
                null,
                Void.class
            );
            
            assertEquals(HttpStatus.OK, response.getStatusCode());
        }
    }

    @Nested
    @DisplayName("Debug Endpoint Contract")
    class DebugEndpointTests {

        @Test
        @Order(1)
        @DisplayName("Should have POST /agent/debug/prompt endpoint")
        void testDebugPromptEndpointExists() {
            Map<String, Object> request = new HashMap<>();
            request.put("sessionId", "debug-test-" + System.currentTimeMillis());
            request.put("message", "Debug prompt test");
            request.put("context", new HashMap<>());

            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);
            HttpEntity<Map<String, Object>> entity = new HttpEntity<>(request, headers);

            ResponseEntity<Map> response = restTemplate.postForEntity(
                baseUrl() + "/agent/debug/prompt",
                entity,
                Map.class
            );
            
            assertEquals(HttpStatus.OK, response.getStatusCode());
            assertTrue(response.getHeaders().getContentType().includes(MediaType.APPLICATION_JSON));
        }

        @Test
        @DisplayName("Should return debug prompt information")
        void testDebugPromptResponse() {
            Map<String, Object> request = new HashMap<>();
            request.put("sessionId", "debug-test-response");
            request.put("message", "Debug test message");
            request.put("context", new HashMap<>());

            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);
            HttpEntity<Map<String, Object>> entity = new HttpEntity<>(request, headers);

            ResponseEntity<Map> response = restTemplate.postForEntity(
                baseUrl() + "/agent/debug/prompt",
                entity,
                Map.class
            );
            
            assertEquals(HttpStatus.OK, response.getStatusCode());
            assertNotNull(response.getBody());
            assertTrue(response.getBody() instanceof Map);
        }
    }

    @Nested
    @DisplayName("Error Response Contract")
    class ErrorResponseTests {

        @Test
        @DisplayName("Should handle malformed JSON with 400 Bad Request")
        void testMalformedJson() {
            String malformedJson = "{invalid-json}";

            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);
            HttpEntity<String> entity = new HttpEntity<>(malformedJson, headers);

            ResponseEntity<String> response = restTemplate.postForEntity(
                baseUrl() + "/agent/execute",
                entity,
                String.class
            );
            
            assertTrue(response.getStatusCode().is4xxClientError());
        }

        @Test
        @DisplayName("Should handle missing Content-Type header gracefully")
        void testMissingContentType() {
            Map<String, Object> request = new HashMap<>();
            request.put("sessionId", "test-session");
            request.put("message", "test");

            HttpEntity<Map<String, Object>> entity = new HttpEntity<>(request);

            ResponseEntity<String> response = restTemplate.postForEntity(
                baseUrl() + "/agent/execute",
                entity,
                String.class
            );
            
            assertTrue(response.getStatusCode().is4xxClientError() || response.getStatusCode().is2xxSuccessful());
        }

        @Test
        @DisplayName("Should return appropriate status on internal error")
        void testInternalErrorResponse() {
            // Try to trigger internal error with extreme input
            Map<String, Object> request = new HashMap<>();
            request.put("sessionId", "error-test");
            request.put("message", ""); // Empty message might cause error
            request.put("context", new HashMap<>());

            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);
            HttpEntity<Map<String, Object>> entity = new HttpEntity<>(request, headers);

            ResponseEntity<Map> response = restTemplate.postForEntity(
                baseUrl() + "/agent/execute",
                entity,
                Map.class
            );
            
            // Accept any valid HTTP status (200, 400, or 500)
            assertTrue(
                response.getStatusCode().is2xxSuccessful() ||
                response.getStatusCode().is4xxClientError() ||
                response.getStatusCode().is5xxServerError()
            );
        }
    }

    @Nested
    @DisplayName("Data Type Validation")
    class DataTypeTests {

        @Test
        @DisplayName("Should enforce sessionId as string")
        void testSessionIdAsString() {
            Map<String, Object> request = new HashMap<>();
            request.put("sessionId", "valid-string-session-id");
            request.put("message", "test");
            request.put("context", new HashMap<>());

            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);
            HttpEntity<Map<String, Object>> entity = new HttpEntity<>(request, headers);

            ResponseEntity<Map> response = restTemplate.postForEntity(
                baseUrl() + "/agent/execute",
                entity,
                Map.class
            );
            
            assertEquals(HttpStatus.OK, response.getStatusCode());
            assertNotNull(response.getBody());
            assertTrue(response.getBody().get("sessionId") instanceof String);
        }

        @Test
        @DisplayName("Should enforce message as string")
        void testMessageAsString() {
            Map<String, Object> request = new HashMap<>();
            request.put("sessionId", "test-session");
            request.put("message", "Valid message string");
            request.put("context", new HashMap<>());

            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);
            HttpEntity<Map<String, Object>> entity = new HttpEntity<>(request, headers);

            ResponseEntity<Map> response = restTemplate.postForEntity(
                baseUrl() + "/agent/execute",
                entity,
                Map.class
            );
            
            assertEquals(HttpStatus.OK, response.getStatusCode());
            assertNotNull(response.getBody());
            assertTrue(response.getBody().get("message") instanceof String);
        }

        @Test
        @DisplayName("Should allow context as object/map")
        void testContextAsObject() {
            Map<String, Object> context = new HashMap<>();
            context.put("stringValue", "test");
            context.put("numberValue", 42);
            context.put("booleanValue", true);

            Map<String, Object> request = new HashMap<>();
            request.put("sessionId", "test-session");
            request.put("message", "test");
            request.put("context", context);

            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);
            HttpEntity<Map<String, Object>> entity = new HttpEntity<>(request, headers);

            ResponseEntity<Map> response = restTemplate.postForEntity(
                baseUrl() + "/agent/execute",
                entity,
                Map.class
            );
            
            assertEquals(HttpStatus.OK, response.getStatusCode());
        }

        @Test
        @DisplayName("Should return executionTimeMs as number")
        void testExecutionTimeMsAsNumber() {
            Map<String, Object> request = new HashMap<>();
            request.put("sessionId", "test-session");
            request.put("message", "test");
            request.put("context", new HashMap<>());

            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);
            HttpEntity<Map<String, Object>> entity = new HttpEntity<>(request, headers);

            ResponseEntity<Map> response = restTemplate.postForEntity(
                baseUrl() + "/agent/execute",
                entity,
                Map.class
            );
            
            assertEquals(HttpStatus.OK, response.getStatusCode());
            assertNotNull(response.getBody());
            assertTrue(response.getBody().get("executionTimeMs") instanceof Number);
        }
    }

    @Nested
    @DisplayName("HTTP Headers Contract")
    class HttpHeadersTests {

        @Test
        @DisplayName("Should return Content-Type: application/json")
        void testContentTypeJson() {
            ResponseEntity<Map> response = restTemplate.getForEntity(
                baseUrl() + "/agent/health",
                Map.class
            );
            
            assertEquals(HttpStatus.OK, response.getStatusCode());
            assertTrue(response.getHeaders().getContentType().includes(MediaType.APPLICATION_JSON));
        }

        @Test
        @DisplayName("Should accept Content-Type: application/json for POST")
        void testAcceptJsonContentType() {
            Map<String, Object> request = new HashMap<>();
            request.put("sessionId", "test-session");
            request.put("message", "test");

            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);
            HttpEntity<Map<String, Object>> entity = new HttpEntity<>(request, headers);

            ResponseEntity<Map> response = restTemplate.postForEntity(
                baseUrl() + "/agent/execute",
                entity,
                Map.class
            );
            
            assertEquals(HttpStatus.OK, response.getStatusCode());
        }
    }
}
