package com.ai.va.service.stt;

import com.ai.va.service.stt.dto.TranscriptionResult;
import com.ai.va.service.stt.exception.SttException;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.*;
import org.springframework.web.client.RestClientException;
import org.springframework.web.client.RestTemplate;
import reactor.core.publisher.Flux;
import reactor.core.publisher.Mono;
import reactor.test.StepVerifier;

import java.util.Base64;
import java.util.Map;
import java.util.concurrent.CompletableFuture;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

/**
 * Unit tests for WhisperSttService
 */
@ExtendWith(MockitoExtension.class)
class WhisperSttServiceTest {

    @Mock
    private RestTemplate restTemplate;

    private WhisperSttService whisperService;

    private static final String WHISPER_URL = "http://localhost:8000";
    private static final String MODEL = "base";

    @BeforeEach
    void setUp() {
        whisperService = new WhisperSttService(WHISPER_URL, MODEL, restTemplate);
    }

    @Test
    void testTranscribeAsync_Success() {
        // Given
        byte[] audioData = "test audio data".getBytes();
        String format = "webm";
        String sessionId = "session-123";
        String expectedText = "Hello world";

        Map<String, Object> responseBody = Map.of(
            "text", expectedText,
            "confidence", 0.95,
            "duration", 5.2,
            "language", "en"
        );

        @SuppressWarnings("rawtypes")
        ResponseEntity<Map> response = new ResponseEntity<>(responseBody, HttpStatus.OK);

        when(restTemplate.postForEntity(
            eq(WHISPER_URL + "/transcribe"),
            any(HttpEntity.class),
            eq(Map.class)
        )).thenReturn(response);

        // When
        CompletableFuture<TranscriptionResult> future = whisperService.transcribeAsync(
            audioData, format, sessionId
        );

        // Then
        assertNotNull(future);
        TranscriptionResult result = future.join();
        
        assertNotNull(result);
        assertEquals(sessionId, result.getSessionId());
        assertEquals(expectedText, result.getText());
        assertEquals(0.95, result.getConfidence(), 0.001);
        assertTrue(result.isFinal());
        
        assertNotNull(result.getMetadata());
        assertEquals("en", result.getMetadata().getLanguage());
        assertEquals(5.2f, result.getMetadata().getDurationSeconds(), 0.01f);
        assertEquals(2, result.getMetadata().getWordCount());
        assertEquals("whisper", result.getMetadata().getProvider());
        assertEquals(MODEL, result.getMetadata().getModel());
        assertFalse(result.getMetadata().isStreaming());
    }

    @Test
    void testTranscribeAsync_WithLanguageCode() {
        // Given
        byte[] audioData = "test audio data".getBytes();
        String format = "wav";
        String sessionId = "session-456";
        String languageCode = "es";

        Map<String, Object> responseBody = Map.of(
            "text", "Hola mundo",
            "confidence", 0.92,
            "language", "es"
        );

        @SuppressWarnings("rawtypes")
        ResponseEntity<Map> response = new ResponseEntity<>(responseBody, HttpStatus.OK);

        when(restTemplate.postForEntity(anyString(), any(HttpEntity.class), eq(Map.class)))
            .thenReturn(response);

        // When
        CompletableFuture<TranscriptionResult> future = whisperService.transcribeAsync(
            audioData, format, sessionId, languageCode
        );

        // Then
        TranscriptionResult result = future.join();
        assertEquals("Hola mundo", result.getText());
        assertEquals("es", result.getMetadata().getLanguage());

        // Verify request body contains language code
        ArgumentCaptor<HttpEntity> captor = ArgumentCaptor.forClass(HttpEntity.class);
        verify(restTemplate).postForEntity(anyString(), captor.capture(), eq(Map.class));
        
        @SuppressWarnings("unchecked")
        Map<String, Object> requestBody = (Map<String, Object>) captor.getValue().getBody();
        assertEquals("es", requestBody.get("language"));
        assertEquals(MODEL, requestBody.get("model"));
        assertEquals(format, requestBody.get("format"));
    }

    @Test
    void testTranscribeAsync_EmptyResponse() {
        // Given
        byte[] audioData = "test audio data".getBytes();
        @SuppressWarnings("rawtypes")
        ResponseEntity<Map> response = new ResponseEntity<>((Map)null, HttpStatus.OK);

        when(restTemplate.postForEntity(anyString(), any(HttpEntity.class), eq(Map.class)))
            .thenReturn(response);

        // When
        CompletableFuture<TranscriptionResult> future = whisperService.transcribeAsync(
            audioData, "webm", "session-123"
        );

        // Then
        assertThrows(RuntimeException.class, future::join);
    }

    @Test
    void testTranscribeAsync_ServerError() {
        // Given
        byte[] audioData = "test audio data".getBytes();
        @SuppressWarnings("rawtypes")
        ResponseEntity<Map> response = new ResponseEntity<>((Map)null, HttpStatus.INTERNAL_SERVER_ERROR);

        when(restTemplate.postForEntity(anyString(), any(HttpEntity.class), eq(Map.class)))
            .thenReturn(response);

        // When
        CompletableFuture<TranscriptionResult> future = whisperService.transcribeAsync(
            audioData, "webm", "session-123"
        );

        // Then
        assertThrows(RuntimeException.class, future::join);
    }

    @Test
    void testTranscribeAsync_NetworkException() {
        // Given
        byte[] audioData = "test audio data".getBytes();
        when(restTemplate.postForEntity(anyString(), any(HttpEntity.class), eq(Map.class)))
            .thenThrow(new RestClientException("Connection refused"));

        // When
        CompletableFuture<TranscriptionResult> future = whisperService.transcribeAsync(
            audioData, "webm", "session-123"
        );

        // Then
        RuntimeException exception = assertThrows(RuntimeException.class, future::join);
        assertTrue(exception.getMessage().contains("Whisper transcription failed"));
    }

    @Test
    void testTranscribe_Synchronous() throws SttException {
        // Given
        byte[] audioData = "test audio data".getBytes();
        Map<String, Object> responseBody = Map.of(
            "text", "Synchronous test",
            "confidence", 0.98
        );

        @SuppressWarnings("rawtypes")
        ResponseEntity<Map> response = new ResponseEntity<>(responseBody, HttpStatus.OK);
        when(restTemplate.postForEntity(anyString(), any(HttpEntity.class), eq(Map.class)))
            .thenReturn(response);

        // When
        TranscriptionResult result = whisperService.transcribe(
            audioData, "webm", "session-sync"
        );

        // Then
        assertNotNull(result);
        assertEquals("Synchronous test", result.getText());
        assertEquals("session-sync", result.getSessionId());
    }

    @Test
    void testTranscribe_ThrowsSttException() {
        // Given
        byte[] audioData = "test audio data".getBytes();
        when(restTemplate.postForEntity(anyString(), any(HttpEntity.class), eq(Map.class)))
            .thenThrow(new RestClientException("Network error"));

        // When/Then
        SttException exception = assertThrows(SttException.class, () -> {
            whisperService.transcribe(audioData, "webm", "session-error");
        });

        assertEquals("Synchronous transcription failed", exception.getMessage());
        assertEquals(SttException.ErrorCode.PROVIDER_ERROR, exception.getErrorCode());
        assertEquals("session-error", exception.getSessionId());
    }

    @Test
    void testTranscribeStream_BuffersAndTranscribes() {
        // Given
        byte[] chunk1 = "chunk1".getBytes();
        byte[] chunk2 = "chunk2".getBytes();
        Flux<byte[]> audioChunks = Flux.just(chunk1, chunk2);

        Map<String, Object> responseBody = Map.of(
            "text", "Streamed result",
            "confidence", 0.97
        );

        @SuppressWarnings("rawtypes")
        ResponseEntity<Map> response = new ResponseEntity<>(responseBody, HttpStatus.OK);
        when(restTemplate.postForEntity(anyString(), any(HttpEntity.class), eq(Map.class)))
            .thenReturn(response);

        // When
        Flux<TranscriptionResult> resultFlux = whisperService.transcribeStream(
            audioChunks, "webm", "session-stream"
        );

        // Then
        StepVerifier.create(resultFlux)
            .assertNext(result -> {
                assertEquals("Streamed result", result.getText());
                assertEquals("session-stream", result.getSessionId());
            })
            .verifyComplete();

        // Verify combined audio was sent
        ArgumentCaptor<HttpEntity> captor = ArgumentCaptor.forClass(HttpEntity.class);
        verify(restTemplate).postForEntity(anyString(), captor.capture(), eq(Map.class));
        
        @SuppressWarnings("unchecked")
        Map<String, Object> requestBody = (Map<String, Object>) captor.getValue().getBody();
        String audioBase64 = (String) requestBody.get("audio_data");
        byte[] sentAudio = Base64.getDecoder().decode(audioBase64);
        
        // Combined size should be chunk1 + chunk2
        assertEquals(chunk1.length + chunk2.length, sentAudio.length);
    }

    @Test
    void testTranscribeStream_WithLanguageCode() {
        // Given
        Flux<byte[]> audioChunks = Flux.just("test".getBytes());
        Map<String, Object> responseBody = Map.of("text", "Result", "language", "fr");
        @SuppressWarnings("rawtypes")
        ResponseEntity<Map> response = new ResponseEntity<>(responseBody, HttpStatus.OK);

        when(restTemplate.postForEntity(anyString(), any(HttpEntity.class), eq(Map.class)))
            .thenReturn(response);

        // When
        Flux<TranscriptionResult> resultFlux = whisperService.transcribeStream(
            audioChunks, "wav", "session-fr", "fr"
        );

        // Then
        StepVerifier.create(resultFlux)
            .assertNext(result -> {
                assertEquals("Result", result.getText());
                assertEquals("fr", result.getMetadata().getLanguage());
            })
            .verifyComplete();
    }

    @Test
    void testIsHealthy_Success() {
        // Given
        ResponseEntity<String> response = new ResponseEntity<>(
            "{\"status\":\"ok\"}", 
            HttpStatus.OK
        );
        when(restTemplate.getForEntity(eq(WHISPER_URL + "/health"), eq(String.class)))
            .thenReturn(response);

        // When
        boolean healthy = whisperService.isHealthy();

        // Then
        assertTrue(healthy);
        verify(restTemplate).getForEntity(eq(WHISPER_URL + "/health"), eq(String.class));
    }

    @Test
    void testIsHealthy_Failure() {
        // Given
        when(restTemplate.getForEntity(anyString(), eq(String.class)))
            .thenThrow(new RestClientException("Connection refused"));

        // When
        boolean healthy = whisperService.isHealthy();

        // Then
        assertFalse(healthy);
    }

    @Test
    void testGetHealthStatus_Healthy() {
        // Given
        ResponseEntity<String> response = new ResponseEntity<>(HttpStatus.OK);
        when(restTemplate.getForEntity(anyString(), eq(String.class)))
            .thenReturn(response);

        // When
        Mono<SttService.HealthStatus> statusMono = whisperService.getHealthStatus();

        // Then
        StepVerifier.create(statusMono)
            .assertNext(status -> {
                assertTrue(status.healthy());
                assertEquals("whisper", status.provider());
                assertEquals(MODEL, status.model());
                assertNull(status.message());
            })
            .verifyComplete();
    }

    @Test
    void testGetHealthStatus_Unhealthy() {
        // Given
        when(restTemplate.getForEntity(anyString(), eq(String.class)))
            .thenThrow(new RestClientException("Server down"));

        // When
        Mono<SttService.HealthStatus> statusMono = whisperService.getHealthStatus();

        // Then
        StepVerifier.create(statusMono)
            .assertNext(status -> {
                assertFalse(status.healthy());
                assertEquals("whisper", status.provider());
                assertEquals(MODEL, status.model());
                assertEquals("Unable to connect to Whisper server", status.message());
            })
            .verifyComplete();
    }

    @Test
    void testGetProvider() {
        assertEquals("whisper", whisperService.getProvider());
    }

    @Test
    void testGetModel() {
        assertEquals(MODEL, whisperService.getModel());
    }

    @Test
    void testGetSupportedFormats() {
        String[] formats = whisperService.getSupportedFormats();
        assertNotNull(formats);
        assertEquals(6, formats.length);
        assertArrayEquals(
            new String[]{"webm", "wav", "mp3", "opus", "flac", "m4a"},
            formats
        );
    }

    @Test
    void testBase64Encoding() {
        // Given
        byte[] audioData = new byte[]{1, 2, 3, 4, 5};
        Map<String, Object> responseBody = Map.of("text", "Test");
        @SuppressWarnings("rawtypes")
        ResponseEntity<Map> response = new ResponseEntity<>(responseBody, HttpStatus.OK);

        when(restTemplate.postForEntity(anyString(), any(HttpEntity.class), eq(Map.class)))
            .thenReturn(response);

        // When
        whisperService.transcribeAsync(audioData, "webm", "session-123").join();

        // Then
        ArgumentCaptor<HttpEntity> captor = ArgumentCaptor.forClass(HttpEntity.class);
        verify(restTemplate).postForEntity(anyString(), captor.capture(), eq(Map.class));
        
        @SuppressWarnings("unchecked")
        Map<String, Object> requestBody = (Map<String, Object>) captor.getValue().getBody();
        String audioBase64 = (String) requestBody.get("audio_data");
        
        // Verify base64 decoding produces original data
        byte[] decoded = Base64.getDecoder().decode(audioBase64);
        assertArrayEquals(audioData, decoded);
    }

    @Test
    void testRequestHeaders() {
        // Given
        Map<String, Object> responseBody = Map.of("text", "Test");
        @SuppressWarnings("rawtypes")
        ResponseEntity<Map> response = new ResponseEntity<>(responseBody, HttpStatus.OK);

        when(restTemplate.postForEntity(anyString(), any(HttpEntity.class), eq(Map.class)))
            .thenReturn(response);

        // When
        whisperService.transcribeAsync("test".getBytes(), "webm", "session-123").join();

        // Then
        ArgumentCaptor<HttpEntity> captor = ArgumentCaptor.forClass(HttpEntity.class);
        verify(restTemplate).postForEntity(anyString(), captor.capture(), eq(Map.class));
        
        HttpHeaders headers = captor.getValue().getHeaders();
        assertEquals(MediaType.APPLICATION_JSON, headers.getContentType());
    }
}
