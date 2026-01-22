package com.ai.va.service.tts;

import com.microsoft.cognitiveservices.speech.*;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Service;

import jakarta.annotation.PostConstruct;
import jakarta.annotation.PreDestroy;
import java.util.*;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.ExecutionException;
import java.util.stream.Collectors;

/**
 * Azure Speech Services TTS Implementation
 * 
 * Provides high-quality neural voice synthesis using Microsoft Azure Cognitive Services.
 * Supports 100+ neural voices in 50+ languages with SSML for prosody control.
 * 
 * Configuration:
 * <pre>
 * tts.provider=azure
 * tts.azure.subscription-key=${AZURE_SPEECH_KEY}
 * tts.azure.region=eastus
 * tts.azure.voice=en-US-JennyNeural
 * tts.azure.format=audio-24khz-48kbitrate-mono-mp3
 * </pre>
 * 
 * @see <a href="https://learn.microsoft.com/azure/cognitive-services/speech-service">Azure Speech Documentation</a>
 */
@Service("azureTtsService")
@ConditionalOnProperty(name = "tts.provider", havingValue = "azure")
public class AzureTtsService implements TtsService {
    
    private static final Logger logger = LoggerFactory.getLogger(AzureTtsService.class);
    
    @Value("${tts.azure.subscription-key}")
    private String subscriptionKey;
    
    @Value("${tts.azure.region:eastus}")
    private String region;
    
    @Value("${tts.azure.voice:en-US-JennyNeural}")
    private String defaultVoice;
    
    @Value("${tts.azure.format:audio-24khz-48kbitrate-mono-mp3}")
    private String audioFormat;
    
    private SpeechConfig speechConfig;
    private List<Voice> cachedVoices;
    private boolean initialized = false;
    
    @PostConstruct
    public void initialize() {
        logger.info("🎤 Initializing Azure TTS Service...");
        logger.info("   Region: {}", region);
        logger.info("   Default Voice: {}", defaultVoice);
        logger.info("   Audio Format: {}", audioFormat);
        
        try {
            // Create speech configuration
            speechConfig = SpeechConfig.fromSubscription(subscriptionKey, region);
            
            // Set audio output format
            setAudioFormat(audioFormat);
            
            // Set default voice
            speechConfig.setSpeechSynthesisVoiceName(defaultVoice);
            
            initialized = true;
            logger.info("✅ Azure TTS Service initialized successfully");
            
            // Load available voices in background
            CompletableFuture.runAsync(this::loadAvailableVoices);
            
        } catch (Exception e) {
            logger.error("❌ Failed to initialize Azure TTS Service: {}", e.getMessage(), e);
            throw new TtsException("Azure TTS initialization failed", 
                TtsException.ErrorType.AUTHENTICATION_ERROR, "AzureTTS", e);
        }
    }
    
    @PreDestroy
    public void cleanup() {
        logger.info("🔄 Cleaning up Azure TTS Service...");
        if (speechConfig != null) {
            speechConfig.close();
        }
    }
    
    @Override
    public CompletableFuture<byte[]> synthesize(String text, String language) {
        return synthesize(text, language, null);
    }
    
    @Override
    public CompletableFuture<byte[]> synthesize(String text, String language, String voiceName) {
        if (!initialized) {
            return CompletableFuture.failedFuture(
                TtsException.providerError("Azure TTS not initialized", "AzureTTS", null)
            );
        }
        
        // Validate input
        if (!isTextValid(text)) {
            return CompletableFuture.failedFuture(
                TtsException.invalidInput("Text is null, empty, or exceeds 5000 characters", "AzureTTS")
            );
        }
        
        return CompletableFuture.supplyAsync(() -> {
            long startTime = System.currentTimeMillis();
            
            try {
                logger.info("[AzureTTS] Synthesizing {} characters, language: {}, voice: {}", 
                    text.length(), language, voiceName != null ? voiceName : defaultVoice);
                
                // Create synthesizer
                SpeechSynthesizer synthesizer = createSynthesizer(voiceName);
                
                try {
                    // Perform synthesis
                    SpeechSynthesisResult result = synthesizer.SpeakText(text);
                    
                    // Check result
                    if (result.getReason() == ResultReason.SynthesizingAudioCompleted) {
                        byte[] audioData = result.getAudioData();
                        long duration = System.currentTimeMillis() - startTime;
                        
                        logger.info("[AzureTTS] Synthesis successful: {} bytes in {}ms", 
                            audioData.length, duration);
                        
                        return audioData;
                        
                    } else if (result.getReason() == ResultReason.Canceled) {
                        SpeechSynthesisCancellationDetails cancellation = 
                            SpeechSynthesisCancellationDetails.fromResult(result);
                        
                        String errorMsg = "Synthesis canceled: %s - %s".formatted(
                                cancellation.getReason(), cancellation.getErrorDetails());
                        
                        logger.error("[AzureTTS] {}", errorMsg);
                        
                        if (cancellation.getReason() == CancellationReason.Error) {
                            if (cancellation.getErrorCode() == CancellationErrorCode.ConnectionFailure) {
                                throw TtsException.connectivityError("AzureTTS", null);
                            } else if (cancellation.getErrorCode() == CancellationErrorCode.AuthenticationFailure) {
                                throw TtsException.authenticationError("AzureTTS");
                            } else {
                                throw TtsException.providerError(errorMsg, "AzureTTS", null);
                            }
                        }
                        
                        throw TtsException.providerError(errorMsg, "AzureTTS", null);
                        
                    } else {
                        String errorMsg = "Unknown synthesis result: " + result.getReason();
                        logger.error("[AzureTTS] {}", errorMsg);
                        throw TtsException.providerError(errorMsg, "AzureTTS", null);
                    }
                    
                } finally {
                    synthesizer.close();
                }
                
            } catch (TtsException e) {
                throw e;
            } catch (Exception e) {
                logger.error("[AzureTTS] Synthesis failed", e);
                throw TtsException.providerError("Synthesis failed: " + e.getMessage(), "AzureTTS", e);
            }
        });
    }
    
    @Override
    public CompletableFuture<TtsResult> synthesizeWithMetadata(String text, String language, String voiceName) {
        long startTime = System.currentTimeMillis();
        
        return synthesize(text, language, voiceName)
            .thenApply(audioData -> {
                long duration = System.currentTimeMillis() - startTime;
                
                return TtsResult.builder()
                    .audioData(audioData)
                    .format(getFormatExtension(audioFormat))
                    .voiceName(voiceName != null ? voiceName : defaultVoice)
                    .language(language)
                    .durationMs(duration)
                    .sampleRate(getSampleRate(audioFormat))
                    .bitrate(getBitrate(audioFormat))
                    .provider("AzureTTS")
                    .success(true)
                    .build();
            })
            .exceptionally(error -> {
                logger.error("[AzureTTS] Synthesis with metadata failed", error);
                return TtsResult.failure(error.getMessage(), "AzureTTS");
            });
    }
    
    @Override
    public List<Voice> getAvailableVoices() {
        if (cachedVoices != null && !cachedVoices.isEmpty()) {
            return new ArrayList<>(cachedVoices);
        }
        
        // Return empty list if not loaded yet, trigger background load
        CompletableFuture.runAsync(this::loadAvailableVoices);
        return Collections.emptyList();
    }
    
    @Override
    public List<Voice> getAvailableVoices(String language) {
        return getAvailableVoices().stream()
            .filter(v -> v.getLanguage().startsWith(language) || v.getLocale().startsWith(language))
            .collect(Collectors.toList());
    }
    
    @Override
    public boolean isHealthy() {
        if (!initialized) {
            return false;
        }
        
        try {
            // Try a small synthesis to verify connectivity
            byte[] result = synthesize("test", "en-US").get();
            return result != null && result.length > 0;
        } catch (InterruptedException | ExecutionException e) {
            logger.warn("[AzureTTS] Health check failed: {}", e.getMessage());
            return false;
        }
    }
    
    @Override
    public String getProviderName() {
        return "AzureTTS";
    }
    
    @Override
    public String getDefaultVoice() {
        return defaultVoice;
    }
    
    @Override
    public List<String> getSupportedFormats() {
        return Arrays.asList("mp3", "wav", "ogg", "webm");
    }
    
    /**
     * Create synthesizer with optional custom voice
     */
    private SpeechSynthesizer createSynthesizer(String voiceName) {
        SpeechConfig config = SpeechConfig.fromSubscription(subscriptionKey, region);
        setAudioFormat(audioFormat);
        
        if (voiceName != null && !voiceName.isEmpty()) {
            config.setSpeechSynthesisVoiceName(voiceName);
        } else {
            config.setSpeechSynthesisVoiceName(defaultVoice);
        }
        
        return new SpeechSynthesizer(config);
    }
    
    /**
     * Set audio output format
     */
    private void setAudioFormat(String format) {
        SpeechSynthesisOutputFormat outputFormat = switch (format.toLowerCase()) {
            case "audio-16khz-32kbitrate-mono-mp3" -> 
                SpeechSynthesisOutputFormat.Audio16Khz32KBitRateMonoMp3;
            case "audio-24khz-48kbitrate-mono-mp3" -> 
                SpeechSynthesisOutputFormat.Audio24Khz48KBitRateMonoMp3;
            case "audio-48khz-96kbitrate-mono-mp3" -> 
                SpeechSynthesisOutputFormat.Audio48Khz96KBitRateMonoMp3;
            case "riff-24khz-16bit-mono-pcm", "wav" -> 
                SpeechSynthesisOutputFormat.Riff24Khz16BitMonoPcm;
            case "ogg-24khz-16bit-mono-opus", "ogg" -> 
                SpeechSynthesisOutputFormat.Ogg24Khz16BitMonoOpus;
            case "webm-24khz-16bit-mono-opus", "webm" -> 
                SpeechSynthesisOutputFormat.Webm24Khz16BitMonoOpus;
            default -> SpeechSynthesisOutputFormat.Audio24Khz48KBitRateMonoMp3;
        };
        
        speechConfig.setSpeechSynthesisOutputFormat(outputFormat);
    }
    
    /**
     * Load available voices from Azure (cached)
     */
    private void loadAvailableVoices() {
        if (cachedVoices != null && !cachedVoices.isEmpty()) {
            return; // Already loaded
        }
        
        try {
            logger.info("[AzureTTS] Loading available voices from Azure...");
            
            SpeechSynthesizer synthesizer = new SpeechSynthesizer(speechConfig);
            
            try {
                SynthesisVoicesResult result = synthesizer.getVoicesAsync().get();
                
                if (result.getReason() == ResultReason.VoicesListRetrieved) {
                    List<VoiceInfo> azureVoices = result.getVoices();
                    
                    cachedVoices = azureVoices.stream()
                        .map(this::convertToVoice)
                        .collect(Collectors.toList());
                    
                    logger.info("[AzureTTS] Loaded {} voices", cachedVoices.size());
                    
                } else {
                    logger.warn("[AzureTTS] Failed to retrieve voices: {}", result.getReason());
                    cachedVoices = getDefaultVoices();
                }
                
            } finally {
                synthesizer.close();
            }
            
        } catch (Exception e) {
            logger.error("[AzureTTS] Error loading voices: {}", e.getMessage(), e);
            cachedVoices = getDefaultVoices();
        }
    }
    
    /**
     * Convert Azure VoiceInfo to our Voice model
     */
    private Voice convertToVoice(VoiceInfo azureVoice) {
        Voice.Gender gender = switch (azureVoice.getGender()) {
            case Male -> Voice.Gender.MALE;
            case Female -> Voice.Gender.FEMALE;
            default -> Voice.Gender.NEUTRAL;
        };
        
        Voice.VoiceType type = azureVoice.getVoiceType().toString().toLowerCase().contains("neural")
            ? Voice.VoiceType.NEURAL
            : Voice.VoiceType.STANDARD;
        
        return Voice.builder()
            .name(azureVoice.getShortName())
            .displayName(azureVoice.getLocalName())
            .language(azureVoice.getLocale().split("-")[0])
            .locale(azureVoice.getLocale())
            .gender(gender)
            .type(type)
            .styleList(String.join(",", azureVoice.getStyleList()))
            .build();
    }
    
    /**
     * Get default voices if Azure query fails
     */
    private List<Voice> getDefaultVoices() {
        return Arrays.asList(
            Voice.of("en-US-JennyNeural", "en-US", Voice.Gender.FEMALE),
            Voice.of("en-US-GuyNeural", "en-US", Voice.Gender.MALE),
            Voice.of("en-US-AriaNeural", "en-US", Voice.Gender.FEMALE),
            Voice.of("es-ES-ElviraNeural", "es-ES", Voice.Gender.FEMALE),
            Voice.of("fr-FR-DeniseNeural", "fr-FR", Voice.Gender.FEMALE)
        );
    }
    
    /**
     * Extract format extension from Azure format string
     */
    private String getFormatExtension(String format) {
        if (format.contains("mp3")) return "mp3";
        if (format.contains("wav") || format.contains("pcm")) return "wav";
        if (format.contains("ogg")) return "ogg";
        if (format.contains("webm")) return "webm";
        return "mp3";
    }
    
    /**
     * Get sample rate from format string
     */
    private int getSampleRate(String format) {
        if (format.contains("48khz")) return 48000;
        if (format.contains("24khz")) return 24000;
        if (format.contains("16khz")) return 16000;
        return 24000;
    }
    
    /**
     * Get bitrate from format string
     */
    private int getBitrate(String format) {
        if (format.contains("96kbitrate")) return 96000;
        if (format.contains("48kbitrate")) return 48000;
        if (format.contains("32kbitrate")) return 32000;
        return 48000;
    }
}
