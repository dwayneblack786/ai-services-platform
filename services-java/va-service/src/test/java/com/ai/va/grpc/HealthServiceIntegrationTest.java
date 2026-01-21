package com.ai.va.grpc;

import io.grpc.ManagedChannel;
import io.grpc.ManagedChannelBuilder;
import org.junit.jupiter.api.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;

import java.util.concurrent.TimeUnit;

import static org.junit.jupiter.api.Assertions.*;

/**
 * Integration tests for HealthService gRPC implementation
 * Tests Task 3.3 (Health Check RPC) from Phase 3
 * 
 * These tests verify:
 * - STT service health check
 * - MongoDB health check
 * - Combined health check (all services)
 * - Individual service health checks
 * - Health status reporting
 */
@SpringBootTest(
    classes = com.ai.va.application.VaServiceApplication.class,
    webEnvironment = SpringBootTest.WebEnvironment.DEFINED_PORT
)
@ActiveProfiles("test")
@TestMethodOrder(MethodOrderer.OrderAnnotation.class)
public class HealthServiceIntegrationTest {

    private static final String GRPC_HOST = "localhost";
    private static final int GRPC_PORT = 50051;
    
    private ManagedChannel channel;
    private HealthServiceGrpc.HealthServiceBlockingStub blockingStub;

    @Autowired(required = false)
    private HealthServiceImpl healthService;

    @BeforeEach
    void setUp() {
        channel = ManagedChannelBuilder.forAddress(GRPC_HOST, GRPC_PORT)
                .usePlaintext()
                .build();
        
        blockingStub = HealthServiceGrpc.newBlockingStub(channel);
    }

    @AfterEach
    void tearDown() throws InterruptedException {
        if (channel != null) {
            channel.shutdown();
            channel.awaitTermination(5, TimeUnit.SECONDS);
        }
    }

    // ============================================================================
    // Task 3.3: Health Check RPC Tests
    // ============================================================================

    @Test
    @Order(1)
    @DisplayName("Test health check for all services")
    void testHealthCheck_AllServices() {
        // Given
        HealthCheckRequest request = HealthCheckRequest.newBuilder()
                .setService("all")
                .build();

        // When
        HealthCheckResponse response = blockingStub.check(request);

        // Then
        assertNotNull(response);
        assertTrue(
            response.getStatus() == HealthCheckResponse.ServingStatus.SERVING ||
            response.getStatus() == HealthCheckResponse.ServingStatus.NOT_SERVING,
            "Status should be SERVING or NOT_SERVING"
        );
        assertNotNull(response.getMessage());
        
        // Verify details contain expected keys
        assertTrue(response.getDetailsMap().containsKey("stt"), "Should include STT status");
        assertTrue(response.getDetailsMap().containsKey("mongodb"), "Should include MongoDB status");
        
        System.out.println("✅ Health Check (all) - Status: " + response.getStatus());
        System.out.println("   Message: " + response.getMessage());
        System.out.println("   STT: " + response.getDetailsMap().get("stt"));
        System.out.println("   MongoDB: " + response.getDetailsMap().get("mongodb"));
        
        if (response.getDetailsMap().containsKey("stt_provider")) {
            System.out.println("   Provider: " + response.getDetailsMap().get("stt_provider"));
        }
    }

    @Test
    @Order(2)
    @DisplayName("Test health check for STT service only")
    void testHealthCheck_SttService() {
        // Given
        HealthCheckRequest request = HealthCheckRequest.newBuilder()
                .setService("stt")
                .build();

        // When
        HealthCheckResponse response = blockingStub.check(request);

        // Then
        assertNotNull(response);
        assertNotNull(response.getMessage());
        assertTrue(response.getDetailsMap().containsKey("stt"), "Should include STT status");
        
        String sttStatus = response.getDetailsMap().get("stt");
        assertTrue(
            sttStatus.equals("healthy") || sttStatus.equals("unhealthy"),
            "STT status should be 'healthy' or 'unhealthy'"
        );
        
        System.out.println("✅ Health Check (STT) - Status: " + response.getStatus());
        System.out.println("   Message: " + response.getMessage());
        System.out.println("   STT Status: " + sttStatus);
    }

    @Test
    @Order(3)
    @DisplayName("Test health check for MongoDB only")
    void testHealthCheck_MongoDb() {
        // Given
        HealthCheckRequest request = HealthCheckRequest.newBuilder()
                .setService("mongodb")
                .build();

        // When
        HealthCheckResponse response = blockingStub.check(request);

        // Then
        assertNotNull(response);
        assertNotNull(response.getMessage());
        assertTrue(response.getDetailsMap().containsKey("mongodb"), "Should include MongoDB status");
        
        String mongoStatus = response.getDetailsMap().get("mongodb");
        assertTrue(
            mongoStatus.equals("healthy") || mongoStatus.equals("unhealthy"),
            "MongoDB status should be 'healthy' or 'unhealthy'"
        );
        
        System.out.println("✅ Health Check (MongoDB) - Status: " + response.getStatus());
        System.out.println("   Message: " + response.getMessage());
        System.out.println("   MongoDB Status: " + mongoStatus);
    }

    @Test
    @Order(4)
    @DisplayName("Test health check with empty service (defaults to all)")
    void testHealthCheck_EmptyService() {
        // Given
        HealthCheckRequest request = HealthCheckRequest.newBuilder()
                .build(); // Empty service defaults to "all"

        // When
        HealthCheckResponse response = blockingStub.check(request);

        // Then
        assertNotNull(response);
        assertTrue(response.getDetailsMap().containsKey("stt"));
        assertTrue(response.getDetailsMap().containsKey("mongodb"));
        
        System.out.println("✅ Health Check (empty/default) - Status: " + response.getStatus());
    }

    @Test
    @Order(5)
    @DisplayName("Test health check with unknown service")
    void testHealthCheck_UnknownService() {
        // Given
        HealthCheckRequest request = HealthCheckRequest.newBuilder()
                .setService("unknown-service")
                .build();

        // When
        HealthCheckResponse response = blockingStub.check(request);

        // Then
        assertNotNull(response);
        assertEquals(HealthCheckResponse.ServingStatus.UNKNOWN, response.getStatus());
        assertTrue(response.getMessage().contains("Unknown service"));
        
        System.out.println("✅ Health Check (unknown) - Message: " + response.getMessage());
    }

    @Test
    @Order(6)
    @DisplayName("Test health check provides STT provider information")
    void testHealthCheck_ProviderInfo() {
        // Given
        HealthCheckRequest request = HealthCheckRequest.newBuilder()
                .setService("all")
                .build();

        // When
        HealthCheckResponse response = blockingStub.check(request);

        // Then
        assertNotNull(response);
        
        // Provider info should be included if STT service is available
        if (response.getDetailsMap().get("stt").equals("healthy")) {
            assertTrue(
                response.getDetailsMap().containsKey("stt_provider"),
                "Should include STT provider information when service is healthy"
            );
            
            String provider = response.getDetailsMap().get("stt_provider");
            assertNotNull(provider);
            assertFalse(provider.isEmpty());
            
            System.out.println("✅ Provider info - Provider: " + provider);
        } else {
            System.out.println("⚠️ STT service unhealthy, skipping provider check");
        }
    }

    @Test
    @Order(7)
    @DisplayName("Test health check response consistency")
    void testHealthCheck_ResponseConsistency() {
        // Test multiple calls to ensure consistency
        for (int i = 0; i < 3; i++) {
            HealthCheckRequest request = HealthCheckRequest.newBuilder()
                    .setService("all")
                    .build();

            HealthCheckResponse response = blockingStub.check(request);
            
            assertNotNull(response);
            assertNotNull(response.getStatus());
            assertNotNull(response.getMessage());
            assertTrue(response.getDetailsMap().containsKey("stt"));
            assertTrue(response.getDetailsMap().containsKey("mongodb"));
            
            System.out.println("✅ Health Check iteration " + (i + 1) + " - Consistent");
        }
    }

    @Test
    @Order(8)
    @DisplayName("Test health check validates service availability")
    void testHealthCheck_ServiceAvailability() {
        // Given
        HealthCheckRequest request = HealthCheckRequest.newBuilder()
                .setService("all")
                .build();

        // When
        HealthCheckResponse response = blockingStub.check(request);

        // Then
        String sttStatus = response.getDetailsMap().get("stt");
        String mongoStatus = response.getDetailsMap().get("mongodb");
        
        // If both are healthy, overall status should be SERVING
        if (sttStatus.equals("healthy") && mongoStatus.equals("healthy")) {
            assertEquals(
                HealthCheckResponse.ServingStatus.SERVING,
                response.getStatus(),
                "Overall status should be SERVING when all services are healthy"
            );
            assertTrue(response.getMessage().contains("healthy"));
        }
        
        // If any is unhealthy, overall status should be NOT_SERVING
        if (sttStatus.equals("unhealthy") || mongoStatus.equals("unhealthy")) {
            assertEquals(
                HealthCheckResponse.ServingStatus.NOT_SERVING,
                response.getStatus(),
                "Overall status should be NOT_SERVING when any service is unhealthy"
            );
            assertTrue(response.getMessage().contains("unhealthy"));
        }
        
        System.out.println("✅ Service availability check - STT: " + sttStatus + ", MongoDB: " + mongoStatus);
    }
}
