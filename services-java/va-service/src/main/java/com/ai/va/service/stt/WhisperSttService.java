package com.ai.va.service.stt;

import com.ai.va.service.stt.dto.TranscriptionResult;
import com.ai.va.service.stt.dto.TranscriptionMetadata;
import com.ai.va.service.stt.exception.SttException;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.http.*;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;
import reactor.core.publisher.Flux;
import reactor.core.publisher.Mono;

import java.util.Base64;
import java.util.Map;
import java.util.concurrent.CompletableFuture;

/**
 * Whisper STT client for local development.
 * Connects to a Python Whisper server running on localhost:8000
 */
@Service
@ConditionalOnProperty(name = "stt.provider", havingValue = "whisper", matchIfMissing = true)
public class WhisperSttService implements SttService {
    
    private static final Logger logger = LoggerFactory.getLogger(WhisperSttService.class);
    
    private static final String[] SUPPORTED_FORMATS = {"webm", "wav", "mp3", "opus", "flac", "m4a"};
    
    private final RestTemplate restTemplate;
    private final String whisperUrl;
    private final String model;
    
    public WhisperSttService(
            @Value("${stt.whisper.url:http://localhost:8000}") String whisperUrl,
            @Value("${stt.whisper.model:base}") String model,
            RestTemplate restTemplate) {
        this.whisperUrl = whisperUrl;
        this.model = model;
        this.restTemplate = restTemplate;
        logger.info("Initialized WhisperSttService with URL: {} and model: {}", whisperUrl, model);
    }
    
    @Override
    public TranscriptionResult transcribe(byte[] audioData, String format, String sessionId) throws SttException {
        try {
            return transcribeAsync(audioData, format, sessionId).join();
        } catch (Exception e) {
            throw new SttException("Synchronous transcription failed", e, SttException.ErrorCode.PROVIDER_ERROR, sessionId);
        }
    }
    
    @Override
    public CompletableFuture<TranscriptionResult> transcribeAsync(
            byte[] audioData, 
            String format, 
            String sessionId) {
        return transcribeAsync(audioData, format, sessionId, "en");
    }
    
    @Override
    public CompletableFuture<TranscriptionResult> transcribeAsync(
            byte[] audioData, 
            String format, 
            String sessionId,
            String languageCode) {
        
        return CompletableFuture.supplyAsync(() -> {
            long startTime = System.currentTimeMillis();
            
            try {
                logger.debug("Sending audio to Whisper server. SessionId: {}, Size: {} bytes", 
                    sessionId, audioData.length);
                
                // Prepare request body
                HttpHeaders headers = new HttpHeaders();
                headers.setContentType(MediaType.APPLICATION_JSON);
                
                // Encode audio as base64 for JSON transport
                String audioBase64 = Base64.getEncoder().encodeToString(audioData);
                
                Map<String, Object> requestBody = Map.of(
                    "audio_data", audioBase64,
                    "format", format,
                    "language", languageCode,
                    "model", model
                );
                
                HttpEntity<Map<String, Object>> request = new HttpEntity<>(requestBody, headers);
                
                // Call Whisper server
                ResponseEntity<Map> response = restTemplate.postForEntity(
                    whisperUrl + "/transcribe",
                    request,
                    Map.class
                );
                
                if (response.getStatusCode() != HttpStatus.OK) {
                    throw new RuntimeException("Whisper server returned: " + response.getStatusCode());
                }
                
                Map<String, Object> responseBody = response.getBody();
                if (responseBody == null) {
                    throw new RuntimeException("Empty response from Whisper server");
                }
                
                String text = (String) responseBody.get("text");
                Double confidence = responseBody.containsKey("confidence") ? 
                    ((Number) responseBody.get("confidence")).doubleValue() : 1.0;
                Number durationNum = responseBody.containsKey("duration") ? 
                    (Number) responseBody.get("duration") : 0.0;
                float durationSeconds = durationNum.floatValue();
                String detectedLanguage = responseBody.containsKey("language") ? 
                    (String) responseBody.get("language") : languageCode;
                
                long processingTime = System.currentTimeMillis() - startTime;
                
                logger.info("Whisper transcription successful. SessionId: {}, Text length: {}, Processing time: {}ms",
                    sessionId, text.length(), processingTime);
                
                TranscriptionMetadata metadata = TranscriptionMetadata.builder()
                    .language(detectedLanguage)
                    .durationSeconds(durationSeconds)
                    .wordCount(text.split("\\s+").length)
                    .provider("whisper")
                    .model(model)
                    .streaming(false)
                    .audioFormat(format)
                    .build();
                
                return TranscriptionResult.builder()
                    .sessionId(sessionId)
                    .text(text)
                    .confidence(confidence)
                    .isFinal(true)
                    .metadata(metadata)
                    .build();
                    
            } catch (Exception e) {
                logger.error("Whisper transcription failed. SessionId: {}", sessionId, e);
                throw new RuntimeException("Whisper transcription failed: " + e.getMessage(), e);
            }
        });
    }
    
    @Override
    public Flux<TranscriptionResult> transcribeStream(Flux<byte[]> audioChunks, String format, String sessionId) {
        return transcribeStream(audioChunks, format, sessionId, "en");
    }
    
    @Override
    public Flux<TranscriptionResult> transcribeStream(Flux<byte[]> audioChunks, String format, String sessionId, String languageCode) {
        // Whisper doesn't support true streaming, so we buffer all chunks and transcribe at once
        return audioChunks
            .collectList()
            .flatMapMany(chunks -> {
                // Combine all chunks into single byte array
                int totalSize = chunks.stream().mapToInt(chunk -> chunk.length).sum();
                byte[] combined = new byte[totalSize];
                int offset = 0;
                for (byte[] chunk : chunks) {
                    System.arraycopy(chunk, 0, combined, offset, chunk.length);
                    offset += chunk.length;
                }
                
                // Transcribe combined audio
                return Mono.fromFuture(transcribeAsync(combined, format, sessionId, languageCode))
                    .flux();
            });
    }
    
    @Override
    public boolean isHealthy() {
        try {
            ResponseEntity<String> response = restTemplate.getForEntity(
                whisperUrl + "/health",
                String.class
            );
            return response.getStatusCode() == HttpStatus.OK;
        } catch (Exception e) {
            logger.warn("Whisper health check failed", e);
            return false;
        }
    }
    
    @Override
    public Mono<HealthStatus> getHealthStatus() {
        return Mono.fromCallable(() -> {
            if (isHealthy()) {
                return HealthStatus.healthy("whisper", model);
            } else {
                return HealthStatus.unhealthy("whisper", model, "Unable to connect to Whisper server");
            }
        });
    }
    
    @Override
    public String getProvider() {
        return "whisper";
    }
    
    @Override
    public String getModel() {
        return model;
    }
    
    @Override
    public String[] getSupportedFormats() {
        return SUPPORTED_FORMATS;
    }
}
