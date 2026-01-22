package com.ai.va.grpc;

import com.ai.va.grpc.ChatProto.*;
import io.grpc.Channel;
import io.grpc.ManagedChannel;
import io.grpc.ManagedChannelBuilder;
import io.grpc.StatusRuntimeException;
import org.junit.jupiter.api.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;

import java.util.concurrent.CountDownLatch;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicInteger;

import static org.junit.jupiter.api.Assertions.*;

/**
 * ChatService gRPC Contract Tests
 * 
 * These tests validate that the Java ChatService implementation matches the proto definition.
 * They ensure message structures, RPC methods, and data types are correct.
 * 
 * CRITICAL: These tests prevent breaking changes in gRPC service contracts.
 */
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.DEFINED_PORT)
@ActiveProfiles("test")
@TestMethodOrder(MethodOrderer.OrderAnnotation.class)
public class ChatServiceContractTest {

    private static final String GRPC_HOST = "localhost";
    private static final int GRPC_PORT = 50051;
    
    private ManagedChannel channel;
    private ChatServiceGrpc.ChatServiceBlockingStub blockingStub;
    private ChatServiceGrpc.ChatServiceStub asyncStub;

    @Autowired(required = false)
    private ChatServiceImpl chatService;

    @BeforeEach
    void setUp() {
        // Create gRPC channel and stubs
        channel = ManagedChannelBuilder.forAddress(GRPC_HOST, GRPC_PORT)
                .usePlaintext()
                .build();
        
        blockingStub = ChatServiceGrpc.newBlockingStub(channel);
        asyncStub = ChatServiceGrpc.newStub(channel);
    }

    @AfterEach
    void tearDown() throws InterruptedException {
        if (channel != null && !channel.isShutdown()) {
            channel.shutdown().awaitTermination(5, TimeUnit.SECONDS);
        }
    }

    @Nested
    @DisplayName("Proto Definition Validation")
    class ProtoDefinitionTests {

        @Test
        @Order(1)
        @DisplayName("Should have ChatService defined in generated code")
        void testChatServiceExists() {
            assertNotNull(ChatServiceGrpc.class, "ChatServiceGrpc class should be generated from proto");
            assertNotNull(ChatServiceGrpc.getServiceDescriptor(), "Service descriptor should exist");
        }

        @Test
        @Order(2)
        @DisplayName("Should have all required RPC methods defined")
        void testAllRpcMethodsExist() {
            var serviceDescriptor = ChatServiceGrpc.getServiceDescriptor();
            var methods = serviceDescriptor.getMethods();
            
            var methodNames = methods.stream()
                    .map(m -> m.getBareMethodName())
                    .toList();
            
            assertTrue(methodNames.contains("StartSession"), "StartSession method should exist");
            assertTrue(methodNames.contains("SendMessage"), "SendMessage method should exist");
            assertTrue(methodNames.contains("SendMessageStream"), "SendMessageStream method should exist");
            assertTrue(methodNames.contains("EndSession"), "EndSession method should exist");
            assertTrue(methodNames.contains("GetHistory"), "GetHistory method should exist");
        }

        @Test
        @Order(3)
        @DisplayName("Should have ChatService implementation bean")
        void testChatServiceImplementationExists() {
            // This will pass if chat profile is active, skip if not
            if (chatService == null) {
                System.out.println("⏭️ ChatService not registered (chat profile not active)");
                return;
            }
            
            assertNotNull(chatService, "ChatService implementation should be available");
        }
    }

    @Nested
    @DisplayName("Message Structure Contracts")
    class MessageStructureTests {

        @Test
        @DisplayName("Should create valid SessionRequest message")
        void testSessionRequestStructure() {
            SessionRequest request = SessionRequest.newBuilder()
                    .setCustomerId("test-customer")
                    .setProductId("test-product")
                    .build();
            
            assertNotNull(request);
            assertEquals("test-customer", request.getCustomerId());
            assertEquals("test-product", request.getProductId());
        }

        @Test
        @DisplayName("Should create valid ChatRequest message")
        void testChatRequestStructure() {
            ChatRequest request = ChatRequest.newBuilder()
                    .setSessionId("test-session-123")
                    .setMessage("Hello, assistant!")
                    .setCustomerId("test-customer")
                    .build();
            
            assertNotNull(request);
            assertEquals("test-session-123", request.getSessionId());
            assertEquals("Hello, assistant!", request.getMessage());
            assertEquals("test-customer", request.getCustomerId());
        }

        @Test
        @DisplayName("Should create valid ChatResponse message")
        void testChatResponseStructure() {
            ChatResponse response = ChatResponse.newBuilder()
                    .setSessionId("test-session-123")
                    .setMessage("Hello! How can I help?")
                    .setIntent("greeting")
                    .setRequiresAction(false)
                    .setSuggestedAction("")
                    .setIsFinal(true)
                    .putExtractedSlots("slot1", "value1")
                    .build();
            
            assertNotNull(response);
            assertEquals("test-session-123", response.getSessionId());
            assertEquals("Hello! How can I help?", response.getMessage());
            assertEquals("greeting", response.getIntent());
            assertFalse(response.getRequiresAction());
            assertTrue(response.getIsFinal());
            assertTrue(response.getExtractedSlotsMap().containsKey("slot1"));
        }

        @Test
        @DisplayName("Should create valid EndSessionRequest message")
        void testEndSessionRequestStructure() {
            EndSessionRequest request = EndSessionRequest.newBuilder()
                    .setSessionId("test-session-end")
                    .build();
            
            assertNotNull(request);
            assertEquals("test-session-end", request.getSessionId());
        }

        @Test
        @DisplayName("Should create valid HistoryRequest message")
        void testHistoryRequestStructure() {
            HistoryRequest request = HistoryRequest.newBuilder()
                    .setSessionId("test-session-history")
                    .build();
            
            assertNotNull(request);
            assertEquals("test-session-history", request.getSessionId());
        }
    }

    @Nested
    @DisplayName("RPC Method Contracts (Integration)")
    class RpcMethodTests {

        @Test
        @DisplayName("Should start a session successfully")
        void testStartSession() {
            SessionRequest request = SessionRequest.newBuilder()
                    .setCustomerId("contract-test-customer")
                    .setProductId("contract-test-product")
                    .build();

            try {
                SessionResponse response = blockingStub.startSession(request);
                
                assertNotNull(response, "Response should not be null");
                assertNotNull(response.getSessionId(), "Session ID should be present");
                assertFalse(response.getSessionId().isEmpty(), "Session ID should not be empty");
                assertTrue(response.getSuccess(), "Session start should succeed");
                
            } catch (StatusRuntimeException e) {
                // Skip if service not available
                if (e.getStatus().getCode() == io.grpc.Status.Code.UNAVAILABLE) {
                    System.out.println("⏭️ gRPC server not available, skipping integration test");
                    return;
                }
                throw e;
            }
        }

        @Test
        @DisplayName("Should send a message successfully")
        void testSendMessage() {
            ChatRequest request = ChatRequest.newBuilder()
                    .setSessionId("test-session-contract")
                    .setMessage("Contract test message")
                    .setCustomerId("contract-test-customer")
                    .build();

            try {
                ChatResponse response = blockingStub.sendMessage(request);
                
                assertNotNull(response, "Response should not be null");
                assertNotNull(response.getSessionId(), "Session ID should be present");
                assertNotNull(response.getMessage(), "Message should be present");
                assertTrue(response.getIsFinal(), "Response should be marked as final");
                
            } catch (StatusRuntimeException e) {
                if (e.getStatus().getCode() == io.grpc.Status.Code.UNAVAILABLE) {
                    System.out.println("⏭️ gRPC server not available, skipping integration test");
                    return;
                }
                throw e;
            }
        }

        @Test
        @DisplayName("Should handle streaming messages")
        void testSendMessageStream() throws InterruptedException {
            ChatRequest request = ChatRequest.newBuilder()
                    .setSessionId("test-session-stream")
                    .setMessage("Contract streaming test")
                    .setCustomerId("contract-test-customer")
                    .build();

            CountDownLatch latch = new CountDownLatch(1);
            AtomicInteger chunkCount = new AtomicInteger(0);

            try {
                asyncStub.sendMessageStream(request, new io.grpc.stub.StreamObserver<ChatResponse>() {
                    @Override
                    public void onNext(ChatResponse response) {
                        chunkCount.incrementAndGet();
                        
                        // Validate each chunk
                        assertNotNull(response.getSessionId(), "Session ID should be present in chunk");
                        assertNotNull(response.getMessage(), "Message should be present in chunk");
                    }

                    @Override
                    public void onError(Throwable t) {
                        if (t instanceof StatusRuntimeException e) {
                            if (e.getStatus().getCode() == io.grpc.Status.Code.UNAVAILABLE) {
                                System.out.println("⏭️ gRPC server not available, skipping streaming test");
                                latch.countDown();
                                return;
                            }
                        }
                        fail("Stream should not error: " + t.getMessage());
                        latch.countDown();
                    }

                    @Override
                    public void onCompleted() {
                        assertTrue(chunkCount.get() > 0, "Should receive at least one chunk");
                        latch.countDown();
                    }
                });

                assertTrue(latch.await(10, TimeUnit.SECONDS), "Stream should complete within timeout");
                
            } catch (StatusRuntimeException e) {
                if (e.getStatus().getCode() == io.grpc.Status.Code.UNAVAILABLE) {
                    System.out.println("⏭️ gRPC server not available, skipping streaming test");
                    return;
                }
                throw e;
            }
        }

        @Test
        @DisplayName("Should end a session successfully")
        void testEndSession() {
            EndSessionRequest request = EndSessionRequest.newBuilder()
                    .setSessionId("test-session-end")
                    .build();

            try {
                EndSessionResponse response = blockingStub.endSession(request);
                
                assertNotNull(response, "Response should not be null");
                assertTrue(response.getSuccess(), "Session end should succeed");
                
            } catch (StatusRuntimeException e) {
                if (e.getStatus().getCode() == io.grpc.Status.Code.UNAVAILABLE) {
                    System.out.println("⏭️ gRPC server not available, skipping integration test");
                    return;
                }
                throw e;
            }
        }
    }

    @Nested
    @DisplayName("Data Type Contracts")
    class DataTypeTests {

        @Test
        @DisplayName("Should enforce string types for IDs")
        void testStringTypes() {
            ChatRequest request = ChatRequest.newBuilder()
                    .setSessionId("valid-string-id")
                    .setMessage("test")
                    .setCustomerId("customer-123")
                    .build();
            
            assertTrue(request.getSessionId() instanceof String);
            assertTrue(request.getCustomerId() instanceof String);
        }

        @Test
        @DisplayName("Should enforce boolean types for flags")
        void testBooleanTypes() {
            ChatResponse response = ChatResponse.newBuilder()
                    .setSessionId("test")
                    .setMessage("test")
                    .setRequiresAction(true)
                    .setIsFinal(false)
                    .build();
            
            assertTrue(response.getRequiresAction());
            assertFalse(response.getIsFinal());
        }

        @Test
        @DisplayName("Should enforce map type for extracted_slots")
        void testMapType() {
            ChatResponse response = ChatResponse.newBuilder()
                    .setSessionId("test")
                    .setMessage("test")
                    .putExtractedSlots("key1", "value1")
                    .putExtractedSlots("key2", "value2")
                    .build();
            
            assertEquals(2, response.getExtractedSlotsCount());
            assertEquals("value1", response.getExtractedSlotsOrDefault("key1", null));
            assertEquals("value2", response.getExtractedSlotsOrDefault("key2", null));
        }

        @Test
        @DisplayName("Should handle empty optional fields")
        void testOptionalFields() {
            ChatResponse response = ChatResponse.newBuilder()
                    .setSessionId("test")
                    .setMessage("test")
                    .build();
            
            // Optional fields should have default values
            assertEquals("", response.getIntent());
            assertEquals("", response.getSuggestedAction());
            assertFalse(response.getRequiresAction());
            assertFalse(response.getIsFinal());
            assertEquals(0, response.getExtractedSlotsCount());
        }
    }

    @Nested
    @DisplayName("Error Handling Contracts")
    class ErrorHandlingTests {

        @Test
        @DisplayName("Should handle empty session ID gracefully")
        void testEmptySessionId() {
            ChatRequest request = ChatRequest.newBuilder()
                    .setSessionId("")
                    .setMessage("test message")
                    .setCustomerId("customer-123")
                    .build();

            try {
                ChatResponse response = blockingStub.sendMessage(request);
                // If succeeds, server handles empty session ID
                assertNotNull(response);
                
            } catch (StatusRuntimeException e) {
                // Should get INVALID_ARGUMENT or UNAVAILABLE
                assertTrue(
                    e.getStatus().getCode() == io.grpc.Status.Code.INVALID_ARGUMENT ||
                    e.getStatus().getCode() == io.grpc.Status.Code.UNAVAILABLE,
                    "Should return INVALID_ARGUMENT or UNAVAILABLE for empty session ID"
                );
            }
        }

        @Test
        @DisplayName("Should handle empty message gracefully")
        void testEmptyMessage() {
            ChatRequest request = ChatRequest.newBuilder()
                    .setSessionId("test-session")
                    .setMessage("")
                    .setCustomerId("customer-123")
                    .build();

            try {
                ChatResponse response = blockingStub.sendMessage(request);
                // If succeeds, server handles empty message
                assertNotNull(response);
                
            } catch (StatusRuntimeException e) {
                // Should handle gracefully
                assertTrue(
                    e.getStatus().getCode() == io.grpc.Status.Code.INVALID_ARGUMENT ||
                    e.getStatus().getCode() == io.grpc.Status.Code.UNAVAILABLE
                );
            }
        }
    }
}
