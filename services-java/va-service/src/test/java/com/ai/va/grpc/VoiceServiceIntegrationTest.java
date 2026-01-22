package com.ai.va.grpc;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.junit.jupiter.api.Assertions.fail;

import java.util.concurrent.CountDownLatch;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicBoolean;
import java.util.concurrent.atomic.AtomicReference;

import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.MethodOrderer;
import org.junit.jupiter.api.Order;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.TestMethodOrder;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;

import com.ai.va.service.TranscriptService;
import com.ai.va.service.stt.AudioBufferManager;
import com.google.protobuf.ByteString;

import io.grpc.ManagedChannel;
import io.grpc.ManagedChannelBuilder;
import io.grpc.Status;
import io.grpc.StatusRuntimeException;
import io.grpc.stub.StreamObserver;

/**
 * Integration tests for VoiceService gRPC implementation
 * Tests Task 3.1 (TranscribeStream) and Task 3.2 (Transcribe) from Phase 3
 * 
 * These tests verify:
 * - Single audio chunk transcription (Transcribe RPC)
 * - Streaming audio transcription (TranscribeStream RPC)
 * - MongoDB persistence
 * - Error handling scenarios
 * - Audio buffer management
 */
@SpringBootTest(
    classes = com.ai.va.application.VaServiceApplication.class,
    webEnvironment = SpringBootTest.WebEnvironment.DEFINED_PORT
)
@ActiveProfiles("test")
@TestMethodOrder(MethodOrderer.OrderAnnotation.class)
public class VoiceServiceIntegrationTest {

    private static final String GRPC_HOST = "localhost";
    private static final int GRPC_PORT = 50051;
    private static final int TIMEOUT_SECONDS = 30;
    
    private ManagedChannel channel;
    private VoiceServiceGrpc.VoiceServiceBlockingStub blockingStub;
    private VoiceServiceGrpc.VoiceServiceStub asyncStub;

    @Autowired(required = false)
    private VoiceServiceImpl voiceService;
    
    @Autowired
    private TranscriptService transcriptService;
    
    @Autowired
    private AudioBufferManager audioBufferManager;

    @BeforeEach
    void setUp() {
        channel = ManagedChannelBuilder.forAddress(GRPC_HOST, GRPC_PORT)
                .usePlaintext()
                .build();
        
        blockingStub = VoiceServiceGrpc.newBlockingStub(channel);
        asyncStub = VoiceServiceGrpc.newStub(channel);
    }

    @AfterEach
    void tearDown() throws InterruptedException {
        if (channel != null) {
            channel.shutdown();
            channel.awaitTermination(5, TimeUnit.SECONDS);
        }
    }

    // ============================================================================
    // Task 3.2: Transcribe RPC Tests (Non-streaming)
    // ============================================================================

    @Test
    @Order(1)
    @DisplayName("Test Transcribe RPC with valid audio data")
    void testTranscribe_ValidAudio() {
        // Given
        String sessionId = "test-session-" + System.currentTimeMillis();
        byte[] audioData = createDummyAudioData(1024); // 1KB
        
        AudioChunk request = AudioChunk.newBuilder()
                .setSessionId(sessionId)
                .setAudioData(ByteString.copyFrom(audioData))
                .setFormat("webm")
                .setTimestamp(System.currentTimeMillis())
                .setSequenceNumber(1)
                .setCustomerId("test-customer")
                .setIsFinalChunk(true)
                .build();

        // When
        TranscriptionResponse response = blockingStub.transcribe(request);

        // Then
        assertNotNull(response);
        assertEquals(sessionId, response.getSessionId());
        assertNotNull(response.getText());
        assertTrue(response.getConfidence() >= 0.0 && response.getConfidence() <= 1.0);
        assertTrue(response.getIsFinal());
        assertNotNull(response.getLanguage());
        
        // Verify metadata
        assertTrue(response.hasMetadata());
        TranscriptionMetadata metadata = response.getMetadata();
        assertNotNull(metadata.getProvider());
        assertNotNull(metadata.getModel());
        assertFalse(metadata.getStreaming()); // Non-streaming transcription
        
        System.out.println("✅ Transcribe RPC - Text: " + response.getText());
        System.out.println("   Confidence: " + response.getConfidence());
        System.out.println("   Language: " + response.getLanguage());
        System.out.println("   Provider: " + metadata.getProvider());
    }

    @Test
    @Order(2)
    @DisplayName("Test Transcribe RPC with empty audio data")
    void testTranscribe_EmptyAudio() {
        // Given
        AudioChunk request = AudioChunk.newBuilder()
                .setSessionId("test-session-empty")
                .setAudioData(ByteString.EMPTY)
                .setFormat("webm")
                .setTimestamp(System.currentTimeMillis())
                .setSequenceNumber(1)
                .setCustomerId("test-customer")
                .setIsFinalChunk(true)
                .build();

        // When/Then
        StatusRuntimeException exception = assertThrows(
            StatusRuntimeException.class,
            () -> blockingStub.transcribe(request)
        );
        
        assertEquals(Status.Code.INVALID_ARGUMENT, exception.getStatus().getCode());
        assertTrue(exception.getStatus().getDescription().contains("empty"));
        
        System.out.println("✅ Empty audio validation - Error: " + exception.getStatus().getDescription());
    }

    @Test
    @Order(3)
    @DisplayName("Test Transcribe RPC with multiple formats")
    void testTranscribe_MultipleFormats() {
        String[] formats = {"webm", "wav", "mp3", "ogg"};
        
        for (String format : formats) {
            String sessionId = "test-format-" + format + "-" + System.currentTimeMillis();
            byte[] audioData = createDummyAudioData(512);
            
            AudioChunk request = AudioChunk.newBuilder()
                    .setSessionId(sessionId)
                    .setAudioData(ByteString.copyFrom(audioData))
                    .setFormat(format)
                    .setTimestamp(System.currentTimeMillis())
                    .setSequenceNumber(1)
                    .setCustomerId("test-customer")
                    .setIsFinalChunk(true)
                    .build();

            TranscriptionResponse response = blockingStub.transcribe(request);
            
            assertNotNull(response);
            assertEquals(sessionId, response.getSessionId());
            
            System.out.println("✅ Format test - " + format + ": " + response.getText());
        }
    }

    // ============================================================================
    // Task 3.1: TranscribeStream RPC Tests (Streaming)
    // ============================================================================

    @Test
    @Order(4)
    @DisplayName("Test TranscribeStream RPC with single chunk")
    void testTranscribeStream_SingleChunk() throws InterruptedException {
        // Given
        String sessionId = "test-stream-single-" + System.currentTimeMillis();
        byte[] audioData = createDummyAudioData(2048); // 2KB
        CountDownLatch latch = new CountDownLatch(1);
        AtomicReference<TranscriptionResponse> responseRef = new AtomicReference<>();
        AtomicBoolean errorOccurred = new AtomicBoolean(false);

        // When
        StreamObserver<AudioChunk> requestObserver = asyncStub.transcribeStream(
            new StreamObserver<TranscriptionResponse>() {
                @Override
                public void onNext(TranscriptionResponse response) {
                    responseRef.set(response);
                    System.out.println("📨 Received response: " + response.getText());
                }

                @Override
                public void onError(Throwable t) {
                    errorOccurred.set(true);
                    System.err.println("❌ Error: " + t.getMessage());
                    latch.countDown();
                }

                @Override
                public void onCompleted() {
                    System.out.println("✅ Stream completed");
                    latch.countDown();
                }
            }
        );

        // Send single chunk with final flag
        AudioChunk chunk = AudioChunk.newBuilder()
                .setSessionId(sessionId)
                .setAudioData(ByteString.copyFrom(audioData))
                .setFormat("webm")
                .setTimestamp(System.currentTimeMillis())
                .setSequenceNumber(1)
                .setCustomerId("test-customer")
                .setIsFinalChunk(true)
                .build();
        
        requestObserver.onNext(chunk);
        requestObserver.onCompleted();

        // Then
        assertTrue(latch.await(TIMEOUT_SECONDS, TimeUnit.SECONDS), "Request timed out");
        assertFalse(errorOccurred.get(), "Error occurred during streaming");
        
        TranscriptionResponse response = responseRef.get();
        assertNotNull(response, "Response should not be null");
        assertEquals(sessionId, response.getSessionId());
        assertNotNull(response.getText());
        assertTrue(response.getIsFinal());
        
        // Verify streaming metadata
        assertTrue(response.hasMetadata());
        assertTrue(response.getMetadata().getStreaming(), "Should indicate streaming transcription");
        
        System.out.println("✅ TranscribeStream single chunk - Text: " + response.getText());
    }

    @Test
    @Order(5)
    @DisplayName("Test TranscribeStream RPC with multiple chunks")
    void testTranscribeStream_MultipleChunks() throws InterruptedException {
        // Given
        String sessionId = "test-stream-multi-" + System.currentTimeMillis();
        int numChunks = 5;
        CountDownLatch latch = new CountDownLatch(1);
        AtomicReference<TranscriptionResponse> responseRef = new AtomicReference<>();
        AtomicBoolean errorOccurred = new AtomicBoolean(false);

        // When
        StreamObserver<AudioChunk> requestObserver = asyncStub.transcribeStream(
            new StreamObserver<TranscriptionResponse>() {
                @Override
                public void onNext(TranscriptionResponse response) {
                    responseRef.set(response);
                    System.out.println("📨 Received multi-chunk response: " + response.getText());
                }

                @Override
                public void onError(Throwable t) {
                    errorOccurred.set(true);
                    System.err.println("❌ Error: " + t.getMessage());
                    latch.countDown();
                }

                @Override
                public void onCompleted() {
                    System.out.println("✅ Multi-chunk stream completed");
                    latch.countDown();
                }
            }
        );

        // Send multiple chunks
        for (int i = 1; i <= numChunks; i++) {
            boolean isFinal = (i == numChunks);
            byte[] chunkData = createDummyAudioData(512); // 512 bytes per chunk
            
            AudioChunk chunk = AudioChunk.newBuilder()
                    .setSessionId(sessionId)
                    .setAudioData(ByteString.copyFrom(chunkData))
                    .setFormat("webm")
                    .setTimestamp(System.currentTimeMillis())
                    .setSequenceNumber(i)
                    .setCustomerId("test-customer")
                    .setIsFinalChunk(isFinal)
                    .build();
            
            requestObserver.onNext(chunk);
            System.out.println("📤 Sent chunk " + i + "/" + numChunks + " (" + chunkData.length + " bytes)");
            
            // Small delay between chunks to simulate real streaming
            Thread.sleep(50);
        }
        
        requestObserver.onCompleted();

        // Then
        assertTrue(latch.await(TIMEOUT_SECONDS, TimeUnit.SECONDS), "Request timed out");
        assertFalse(errorOccurred.get(), "Error occurred during streaming");
        
        TranscriptionResponse response = responseRef.get();
        assertNotNull(response, "Response should not be null");
        assertEquals(sessionId, response.getSessionId());
        assertNotNull(response.getText());
        
        System.out.println("✅ TranscribeStream multiple chunks - Total: " + numChunks);
        System.out.println("   Text: " + response.getText());
    }

    @Test
    @Order(6)
    @DisplayName("Test TranscribeStream RPC with session mismatch")
    void testTranscribeStream_SessionMismatch() throws InterruptedException {
        // Given
        CountDownLatch latch = new CountDownLatch(1);
        AtomicBoolean errorOccurred = new AtomicBoolean(false);
        AtomicReference<String> errorMessage = new AtomicReference<>();

        // When
        StreamObserver<AudioChunk> requestObserver = asyncStub.transcribeStream(
            new StreamObserver<TranscriptionResponse>() {
                @Override
                public void onNext(TranscriptionResponse response) {
                    fail("Should not receive response on session mismatch");
                }

                @Override
                public void onError(Throwable t) {
                    errorOccurred.set(true);
                    errorMessage.set(t.getMessage());
                    System.out.println("✅ Expected error: " + t.getMessage());
                    latch.countDown();
                }

                @Override
                public void onCompleted() {
                    latch.countDown();
                }
            }
        );

        // Send first chunk with session-1
        AudioChunk chunk1 = AudioChunk.newBuilder()
                .setSessionId("session-1")
                .setAudioData(ByteString.copyFrom(createDummyAudioData(512)))
                .setFormat("webm")
                .setTimestamp(System.currentTimeMillis())
                .setSequenceNumber(1)
                .setCustomerId("test-customer")
                .setIsFinalChunk(false)
                .build();
        
        requestObserver.onNext(chunk1);

        // Send second chunk with different session-2 (should fail)
        AudioChunk chunk2 = AudioChunk.newBuilder()
                .setSessionId("session-2") // Different session ID
                .setAudioData(ByteString.copyFrom(createDummyAudioData(512)))
                .setFormat("webm")
                .setTimestamp(System.currentTimeMillis())
                .setSequenceNumber(2)
                .setCustomerId("test-customer")
                .setIsFinalChunk(true)
                .build();
        
        requestObserver.onNext(chunk2);

        // Then
        assertTrue(latch.await(TIMEOUT_SECONDS, TimeUnit.SECONDS));
        assertTrue(errorOccurred.get(), "Should have received error");
        assertNotNull(errorMessage.get());
        assertTrue(errorMessage.get().contains("mismatch"));
        
        System.out.println("✅ Session mismatch validation passed");
    }

    @Test
    @Order(7)
    @DisplayName("Test TranscribeStream RPC with empty audio")
    void testTranscribeStream_EmptyAudio() throws InterruptedException {
        // Given
        String sessionId = "test-stream-empty-" + System.currentTimeMillis();
        CountDownLatch latch = new CountDownLatch(1);
        AtomicBoolean errorOccurred = new AtomicBoolean(false);

        // When
        StreamObserver<AudioChunk> requestObserver = asyncStub.transcribeStream(
            new StreamObserver<TranscriptionResponse>() {
                @Override
                public void onNext(TranscriptionResponse response) {
                    fail("Should not receive response for empty audio");
                }

                @Override
                public void onError(Throwable t) {
                    errorOccurred.set(true);
                    System.out.println("✅ Expected error for empty audio: " + t.getMessage());
                    latch.countDown();
                }

                @Override
                public void onCompleted() {
                    latch.countDown();
                }
            }
        );

        // Send empty audio chunk
        AudioChunk chunk = AudioChunk.newBuilder()
                .setSessionId(sessionId)
                .setAudioData(ByteString.EMPTY)
                .setFormat("webm")
                .setTimestamp(System.currentTimeMillis())
                .setSequenceNumber(1)
                .setCustomerId("test-customer")
                .setIsFinalChunk(true)
                .build();
        
        requestObserver.onNext(chunk);
        requestObserver.onCompleted();

        // Then
        assertTrue(latch.await(TIMEOUT_SECONDS, TimeUnit.SECONDS));
        assertTrue(errorOccurred.get(), "Should have received error for empty audio");
        
        System.out.println("✅ Empty audio validation passed");
    }

    @Test
    @Order(8)
    @DisplayName("Test TranscribeStream RPC buffer management")
    void testTranscribeStream_BufferManagement() throws InterruptedException {
        // Given
        String sessionId = "test-buffer-" + System.currentTimeMillis();
        CountDownLatch latch = new CountDownLatch(1);
        AtomicReference<TranscriptionResponse> responseRef = new AtomicReference<>();

        // When
        StreamObserver<AudioChunk> requestObserver = asyncStub.transcribeStream(
            new StreamObserver<TranscriptionResponse>() {
                @Override
                public void onNext(TranscriptionResponse response) {
                    responseRef.set(response);
                }

                @Override
                public void onError(Throwable t) {
                    System.err.println("❌ Error: " + t.getMessage());
                    latch.countDown();
                }

                @Override
                public void onCompleted() {
                    latch.countDown();
                }
            }
        );

        // Send chunks and verify buffer
        for (int i = 1; i <= 3; i++) {
            AudioChunk chunk = AudioChunk.newBuilder()
                    .setSessionId(sessionId)
                    .setAudioData(ByteString.copyFrom(createDummyAudioData(1024)))
                    .setFormat("webm")
                    .setTimestamp(System.currentTimeMillis())
                    .setSequenceNumber(i)
                    .setCustomerId("test-customer")
                    .setIsFinalChunk(i == 3)
                    .build();
            
            requestObserver.onNext(chunk);
        }
        
        requestObserver.onCompleted();

        // Then
        assertTrue(latch.await(TIMEOUT_SECONDS, TimeUnit.SECONDS));
        assertNotNull(responseRef.get());
        
        // Verify buffer was cleaned up
        assertFalse(audioBufferManager.hasSession(sessionId), "Buffer should be cleaned up after completion");
        
        System.out.println("✅ Buffer management test passed");
    }

    // ============================================================================
    // Helper Methods
    // ============================================================================

    private byte[] createDummyAudioData(int size) {
        byte[] data = new byte[size];
        // Fill with non-zero data to simulate real audio
        for (int i = 0; i < size; i++) {
            data[i] = (byte) (i % 256);
        }
        return data;
    }
}
