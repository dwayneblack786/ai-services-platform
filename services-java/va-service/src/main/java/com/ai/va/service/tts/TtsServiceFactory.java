package com.ai.va.service.tts;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.ApplicationContext;
import org.springframework.stereotype.Component;

import jakarta.annotation.PostConstruct;
import java.util.HashMap;
import java.util.Map;

/**
 * Factory for creating and managing TTS service instances
 * 
 * Supports runtime switching between different TTS providers:
 * - Azure Speech Services (production)
 * - ElevenLabs (high-quality voice cloning)
 * - Google Cloud TTS (alternative provider)
 * - Mock TTS (testing)
 * 
 * Provider selection is controlled via application.yml:
 * <pre>
 * tts:
 *   provider: azure  # or elevenlabs, google, mock
 * </pre>
 * 
 * @see TtsService
 * @see AzureTtsService
 */
@Component
public class TtsServiceFactory {
    
    private static final Logger logger = LoggerFactory.getLogger(TtsServiceFactory.class);
    
    @Value("${tts.provider:mock}")
    private String provider;
    
    @Autowired
    private ApplicationContext applicationContext;
    
    private final Map<String, TtsService> serviceCache = new HashMap<>();
    private TtsService currentService;
    
    @PostConstruct
    public void initialize() {
        logger.info("🎤 Initializing TtsServiceFactory with provider: {}", provider);
        
        try {
            currentService = createTtsService(provider);
            logger.info("✅ TTS service initialized: {}", currentService.getProviderName());
            
            // Log available voices
            try {
                int voiceCount = currentService.getAvailableVoices().size();
                logger.info("📢 Available voices: {}", voiceCount);
            } catch (Exception e) {
                logger.warn("⚠️ Could not load available voices: {}", e.getMessage());
            }
            
        } catch (Exception e) {
            logger.error("❌ Failed to initialize TTS service: {}", e.getMessage(), e);
            logger.info("🔄 Falling back to MockTtsService");
            currentService = createMockService();
        }
    }
    
    /**
     * Get the current TTS service instance
     * 
     * @return Active TTS service
     * @throws IllegalStateException if no service is available
     */
    public TtsService getTtsService() {
        if (currentService == null) {
            throw new IllegalStateException("No TTS service available");
        }
        return currentService;
    }
    
    /**
     * Get TTS service by provider name
     * Useful for testing or multi-provider scenarios
     * 
     * @param providerName Provider identifier ("azure", "elevenlabs", "google", "mock")
     * @return TTS service instance
     */
    public TtsService getTtsService(String providerName) {
        if (serviceCache.containsKey(providerName)) {
            return serviceCache.get(providerName);
        }
        
        TtsService service = createTtsService(providerName);
        serviceCache.put(providerName, service);
        return service;
    }
    
    /**
     * Switch to a different TTS provider at runtime
     * 
     * @param providerName New provider to use
     * @return true if switch successful, false otherwise
     */
    public boolean switchProvider(String providerName) {
        logger.info("🔄 Switching TTS provider from {} to {}", provider, providerName);
        
        try {
            TtsService newService = getTtsService(providerName);
            
            if (!newService.isHealthy()) {
                logger.warn("⚠️ New TTS provider {} is not healthy", providerName);
                return false;
            }
            
            currentService = newService;
            provider = providerName;
            logger.info("✅ TTS provider switched to: {}", currentService.getProviderName());
            return true;
            
        } catch (Exception e) {
            logger.error("❌ Failed to switch TTS provider: {}", e.getMessage(), e);
            return false;
        }
    }
    
    /**
     * Get current provider name
     * 
     * @return Active provider identifier
     */
    public String getCurrentProviderName() {
        return provider;
    }
    
    /**
     * Get current TTS service display name
     * 
     * @return Service provider name
     */
    public String getCurrentServiceName() {
        return currentService != null ? currentService.getProviderName() : "None";
    }
    
    /**
     * Check if TTS service is available and healthy
     * 
     * @return true if service is operational
     */
    public boolean isServiceHealthy() {
        return currentService != null && currentService.isHealthy();
    }
    
    /**
     * Get statistics about available TTS services
     * 
     * @return Map of provider names to health status
     */
    public Map<String, Boolean> getServiceStatus() {
        Map<String, Boolean> status = new HashMap<>();
        
        for (String providerName : new String[]{"azure", "elevenlabs", "google", "mock"}) {
            try {
                TtsService service = getTtsService(providerName);
                status.put(providerName, service.isHealthy());
            } catch (Exception e) {
                status.put(providerName, false);
            }
        }
        
        return status;
    }
    
    /**
     * Create TTS service instance based on provider name
     */
    private TtsService createTtsService(String providerName) {
        logger.debug("Creating TTS service for provider: {}", providerName);
        
        return switch (providerName.toLowerCase()) {
            case "azure", "azure-speech" -> createAzureService();
            case "elevenlabs", "eleven-labs" -> createElevenLabsService();
            case "google", "google-tts" -> createGoogleService();
            case "mock", "test" -> createMockService();
            default -> {
                logger.warn("Unknown TTS provider: {}. Using mock service.", providerName);
                yield createMockService();
            }
        };
    }
    
    private TtsService createAzureService() {
        try {
            // Try to get existing bean first
            return applicationContext.getBean("azureTtsService", TtsService.class);
        } catch (Exception e) {
            logger.warn("AzureTtsService bean not found, will be created when implemented");
            throw new IllegalStateException("AzureTtsService not yet implemented", e);
        }
    }
    
    private TtsService createElevenLabsService() {
        try {
            return applicationContext.getBean("elevenLabsTtsService", TtsService.class);
        } catch (Exception e) {
            logger.warn("ElevenLabsTtsService not available");
            throw new IllegalStateException("ElevenLabsTtsService not yet implemented", e);
        }
    }
    
    private TtsService createGoogleService() {
        try {
            return applicationContext.getBean("googleTtsService", TtsService.class);
        } catch (Exception e) {
            logger.warn("GoogleTtsService not available");
            throw new IllegalStateException("GoogleTtsService not yet implemented", e);
        }
    }
    
    private TtsService createMockService() {
        try {
            return applicationContext.getBean("mockTtsService", TtsService.class);
        } catch (Exception e) {
            logger.info("Creating inline MockTtsService");
            return new MockTtsService();
        }
    }
    
    /**
     * Simple mock TTS service for testing
     * Returns empty audio data with success status
     */
    private static class MockTtsService implements TtsService {
        
        @Override
        public java.util.concurrent.CompletableFuture<byte[]> synthesize(String text, String language) {
            return java.util.concurrent.CompletableFuture.completedFuture(new byte[1024]); // Empty audio
        }
        
        @Override
        public java.util.concurrent.CompletableFuture<byte[]> synthesize(String text, String language, String voiceName) {
            return synthesize(text, language);
        }
        
        @Override
        public java.util.concurrent.CompletableFuture<TtsResult> synthesizeWithMetadata(String text, String language, String voiceName) {
            return java.util.concurrent.CompletableFuture.completedFuture(
                TtsResult.builder()
                    .audioData(new byte[1024])
                    .format("mp3")
                    .voiceName(voiceName != null ? voiceName : "mock-voice")
                    .language(language)
                    .provider("MockTTS")
                    .success(true)
                    .build()
            );
        }
        
        @Override
        public java.util.List<Voice> getAvailableVoices() {
            return java.util.List.of(
                Voice.of("mock-en-US-voice", "en-US", Voice.Gender.FEMALE),
                Voice.of("mock-es-ES-voice", "es-ES", Voice.Gender.MALE)
            );
        }
        
        @Override
        public java.util.List<Voice> getAvailableVoices(String language) {
            return getAvailableVoices().stream()
                .filter(v -> v.getLanguage().startsWith(language))
                .collect(java.util.stream.Collectors.toList());
        }
        
        @Override
        public boolean isHealthy() {
            return true;
        }
        
        @Override
        public String getProviderName() {
            return "MockTTS";
        }
        
        @Override
        public String getDefaultVoice() {
            return "mock-en-US-voice";
        }
        
        @Override
        public java.util.List<String> getSupportedFormats() {
            return java.util.List.of("mp3", "wav");
        }
    }
}
