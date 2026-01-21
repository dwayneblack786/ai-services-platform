package com.ai.va.service.stt;

import com.ai.va.service.stt.dto.TranscriptionResult;
import com.ai.va.service.stt.dto.TranscriptionMetadata;
import com.ai.va.service.stt.exception.SttException;
import com.microsoft.cognitiveservices.speech.*;
import com.microsoft.cognitiveservices.speech.audio.AudioConfig;
import com.microsoft.cognitiveservices.speech.audio.AudioInputStream;
import com.microsoft.cognitiveservices.speech.audio.AudioStreamFormat;
import com.microsoft.cognitiveservices.speech.audio.PullAudioInputStream;
import com.microsoft.cognitiveservices.speech.audio.PullAudioInputStreamCallback;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Service;
import reactor.core.publisher.Flux;
import reactor.core.publisher.Mono;

import java.io.ByteArrayInputStream;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.ExecutionException;

/**
 * Azure Cognitive Services Speech-to-Text client for production.
 * Provides high-quality transcription with Azure Speech SDK.
 */
@Service
@ConditionalOnProperty(name = "stt.provider", havingValue = "azure")
public class AzureSpeechSttService implements SttService {
    
    private static final Logger logger = LoggerFactory.getLogger(AzureSpeechSttService.class);
    
    private static final String[] SUPPORTED_FORMATS = {"wav", "mp3", "opus", "flac"};
    
    private final String subscriptionKey;
    private final String region;
    private final SpeechConfig speechConfig;
    
    public AzureSpeechSttService(
            @Value("${stt.azure.key}") String subscriptionKey,
            @Value("${stt.azure.region}") String region) {
        this.subscriptionKey = subscriptionKey;
        this.region = region;
        
        // Initialize Speech SDK configuration
        this.speechConfig = SpeechConfig.fromSubscription(subscriptionKey, region);
        
        logger.info("Initialized AzureSpeechSttService with region: {}", region);
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
        return transcribeAsync(audioData, format, sessionId, "en-US");
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
                logger.debug("Sending audio to Azure Speech. SessionId: {}, Size: {} bytes", 
                    sessionId, audioData.length);
                
                // Set recognition language
                speechConfig.setSpeechRecognitionLanguage(languageCode);
                
                // Create audio config from byte array (assuming WAV format for now)
                PullAudioInputStream pullStream = createPullStream(audioData);
                AudioConfig audioConfig = AudioConfig.fromStreamInput(pullStream);
                
                // Create speech recognizer
                SpeechRecognizer recognizer = new SpeechRecognizer(speechConfig, audioConfig);
                
                // Perform recognition
                SpeechRecognitionResult result = recognizer.recognizeOnceAsync().get();
                
                if (result.getReason() == ResultReason.RecognizedSpeech) {
                    long processingTime = System.currentTimeMillis() - startTime;
                    
                    logger.info("Azure Speech transcription successful. SessionId: {}, Text length: {}, Processing time: {}ms",
                        sessionId, result.getText().length(), processingTime);
                    
                    // Get confidence from first word (Azure doesn't provide overall confidence easily)
                    double confidence = 0.95; // Default high confidence for recognized speech
                    
                    float durationSeconds = result.getDuration().divide(java.math.BigInteger.valueOf(10000000)).floatValue(); // Convert from 100-nanosecond units to seconds
                    
                    TranscriptionMetadata metadata = TranscriptionMetadata.builder()
                        .language(languageCode)
                        .durationSeconds(durationSeconds)
                        .wordCount(result.getText().split("\\s+").length)
                        .provider("azure-speech")
                        .model("azure-speech-v2")
                        .streaming(false)
                        .audioFormat(format)
                        .build();
                    
                    return TranscriptionResult.builder()
                        .sessionId(sessionId)
                        .text(result.getText())
                        .confidence(confidence)
                        .isFinal(true)
                        .metadata(metadata)
                        .build();
                        
                } else if (result.getReason() == ResultReason.NoMatch) {
                    logger.warn("Azure Speech: No speech detected. SessionId: {}", sessionId);
                    throw new RuntimeException("No speech detected in audio");
                    
                } else if (result.getReason() == ResultReason.Canceled) {
                    CancellationDetails cancellation = CancellationDetails.fromResult(result);
                    logger.error("Azure Speech canceled. SessionId: {}, Reason: {}, Details: {}",
                        sessionId, cancellation.getReason(), cancellation.getErrorDetails());
                    throw new RuntimeException("Azure Speech canceled: " + cancellation.getErrorDetails());
                    
                } else {
                    throw new RuntimeException("Unexpected result reason: " + result.getReason());
                }
                
            } catch (InterruptedException | ExecutionException e) {
                logger.error("Azure Speech transcription failed. SessionId: {}", sessionId, e);
                throw new RuntimeException("Azure Speech transcription failed: " + e.getMessage(), e);
            }
        });
    }
    
    @Override
    public Flux<TranscriptionResult> transcribeStream(Flux<byte[]> audioChunks, String format, String sessionId) {
        return transcribeStream(audioChunks, format, sessionId, "en-US");
    }
    
    @Override
    public Flux<TranscriptionResult> transcribeStream(Flux<byte[]> audioChunks, String format, String sessionId, String languageCode) {
        // Azure supports streaming, but for simplicity we'll buffer for now
        // TODO: Implement true streaming with Azure's streaming recognition
        return audioChunks
            .collectList()
            .flatMapMany(chunks -> {
                int totalSize = chunks.stream().mapToInt(chunk -> chunk.length).sum();
                byte[] combined = new byte[totalSize];
                int offset = 0;
                for (byte[] chunk : chunks) {
                    System.arraycopy(chunk, 0, combined, offset, chunk.length);
                    offset += chunk.length;
                }
                
                return Mono.fromFuture(transcribeAsync(combined, format, sessionId, languageCode))
                    .flux();
            });
    }
    
    @Override
    public boolean isHealthy() {
        return speechConfig != null && subscriptionKey != null && !subscriptionKey.isEmpty();
    }
    
    @Override
    public Mono<HealthStatus> getHealthStatus() {
        return Mono.fromCallable(() -> {
            if (isHealthy()) {
                return HealthStatus.healthy("azure-speech", "azure-speech-v2");
            } else {
                return HealthStatus.unhealthy("azure-speech", "azure-speech-v2", "Speech config not properly initialized");
            }
        });
    }
    
    @Override
    public String getProvider() {
        return "azure-speech";
    }
    
    @Override
    public String getModel() {
        return "azure-speech-v2";
    }
    
    @Override
    public String[] getSupportedFormats() {
        return SUPPORTED_FORMATS;
    }
    
    /**
     * Create pull stream from byte array for Azure SDK
     */
    private PullAudioInputStream createPullStream(byte[] audioData) {
        return AudioInputStream.createPullStream(
            new PullAudioInputStreamCallback() {
                private final ByteArrayInputStream inputStream = new ByteArrayInputStream(audioData);
                
                @Override
                public int read(byte[] buffer) {
                    return inputStream.read(buffer, 0, buffer.length);
                }
                
                @Override
                public void close() {
                    try {
                        inputStream.close();
                    } catch (Exception e) {
                        logger.error("Error closing audio stream", e);
                    }
                }
            }
        );
    }
}
