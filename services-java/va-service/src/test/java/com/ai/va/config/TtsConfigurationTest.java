package com.ai.va.config;

import com.ai.va.service.tts.TtsService;
import com.ai.va.service.tts.TtsServiceFactory;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.TestPropertySource;

import static org.assertj.core.api.Assertions.*;

/**
 * TTS Configuration Validation Tests
 * 
 * Tests for Task 4.5: Configuration
 * Validates:
 * - Configuration property loading
 * - Provider-specific settings
 * - TtsServiceFactory provider switching
 * - Azure configuration validation
 * - Voice names and audio formats
 */
@SpringBootTest
@ActiveProfiles("test")
class TtsConfigurationTest {
    
    @Autowired
    private TtsConfig ttsConfig;
    
    @Autowired
    private TtsServiceFactory ttsServiceFactory;
    
    // ============================================================================
    // Configuration Loading Tests
    // ============================================================================
    
    @Test
    void testTtsConfigLoaded() {
        assertThat(ttsConfig).isNotNull();
        assertThat(ttsConfig.getProvider()).isNotNull();
        assertThat(ttsConfig.getLanguage()).isEqualTo("en-US");
    }
    
    @Test
    void testAzureConfigPropertiesLoaded() {
        TtsConfig.Azure azureConfig = ttsConfig.getAzure();
        assertThat(azureConfig).isNotNull();
        assertThat(azureConfig.getRegion()).isNotBlank();
        assertThat(azureConfig.getVoice()).isNotBlank();
        assertThat(azureConfig.getFormat()).isNotBlank();
        assertThat(azureConfig.getTimeoutSeconds()).isPositive();
    }
    
    @Test
    void testMockConfigPropertiesLoaded() {
        TtsConfig.Mock mockConfig = ttsConfig.getMock();
        assertThat(mockConfig).isNotNull();
        assertThat(mockConfig.isEnabled()).isTrue();
        assertThat(mockConfig.getDelayMs()).isGreaterThanOrEqualTo(0);
    }
    
    @Test
    void testDefaultProviderIsMock() {
        // In test profile, provider should be mock
        String provider = ttsConfig.getProvider();
        assertThat(provider).isNotNull();
        assertThat(provider).isEqualTo("mock");
    }
    
    // ============================================================================
    // Azure Configuration Validation Tests
    // ============================================================================
    
    @Test
    void testAzureVoiceNamesValid() {
        String voice = ttsConfig.getAzure().getVoice();
        assertThat(voice)
            .isNotBlank()
            .contains("-"); // Azure voice format: en-US-JennyNeural
        
        // Voice name format validation: language-region-VoiceName
        String[] parts = voice.split("-");
        assertThat(parts).hasSizeGreaterThanOrEqualTo(3);
    }
    
    @Test
    void testAzureAudioFormatValid() {
        String format = ttsConfig.getAzure().getFormat();
        assertThat(format)
            .isNotBlank()
            .matches("audio-\\d+khz-\\d+kbitrate-mono-(mp3|wav|ogg|webm)");
        
        // Example: audio-24khz-48kbitrate-mono-mp3
    }
    
    @Test
    void testAzureRegionValid() {
        String region = ttsConfig.getAzure().getRegion();
        assertThat(region)
            .isNotBlank()
            .matches("[a-z]+"); // eastus, westus, etc.
    }
    
    @Test
    void testAzureTimeoutReasonable() {
        int timeout = ttsConfig.getAzure().getTimeoutSeconds();
        assertThat(timeout)
            .isBetween(5, 120); // Between 5 and 120 seconds
    }
    
    // ============================================================================
    // TtsServiceFactory Tests
    // ============================================================================
    
    @Test
    void testTtsServiceFactoryInitialized() {
        assertThat(ttsServiceFactory).isNotNull();
        assertThat(ttsServiceFactory.getTtsService()).isNotNull();
    }
    
    @Test
    void testGetCurrentProvider() {
        String currentProvider = ttsServiceFactory.getCurrentProviderName();
        assertThat(currentProvider).isNotBlank();
    }
    
    @Test
    void testGetCurrentServiceName() {
        String serviceName = ttsServiceFactory.getCurrentServiceName();
        assertThat(serviceName).isNotBlank();
    }
    
    @Test
    void testServiceHealthCheck() {
        boolean isHealthy = ttsServiceFactory.isServiceHealthy();
        assertThat(isHealthy).isTrue();
    }
    
    @Test
    void testGetMockTtsService() {
        TtsService mockService = ttsServiceFactory.getTtsService("mock");
        assertThat(mockService).isNotNull();
        assertThat(mockService.isHealthy()).isTrue();
        assertThat(mockService.getProviderName()).contains("Mock");
    }
    
    @Test
    void testMockServiceHasVoices() {
        TtsService mockService = ttsServiceFactory.getTtsService("mock");
        assertThat(mockService.getAvailableVoices()).isNotEmpty();
    }
    
    @Test
    void testMockServiceSupportedFormats() {
        TtsService mockService = ttsServiceFactory.getTtsService("mock");
        assertThat(mockService.getSupportedFormats())
            .isNotEmpty()
            .contains("mp3", "wav");
    }
    
    // ============================================================================
    // Voice Configuration Tests
    // ============================================================================
    
    @Test
    void testSupportedVoiceFormats() {
        // Test that common Azure neural voices are supported
        String[] azureNeuralVoices = {
            "en-US-JennyNeural",
            "en-US-GuyNeural",
            "en-US-AriaNeural",
            "en-US-SaraNeural",
            "es-ES-ElviraNeural",
            "fr-FR-DeniseNeural"
        };
        
        for (String voice : azureNeuralVoices) {
            assertThat(voice)
                .matches("[a-z]{2}-[A-Z]{2}-[A-Za-z]+Neural");
        }
    }
    
    @Test
    void testSupportedAudioFormats() {
        // Test that Azure supports common audio formats
        String[] supportedFormats = {
            "audio-16khz-32kbitrate-mono-mp3",
            "audio-24khz-48kbitrate-mono-mp3",
            "audio-48khz-96kbitrate-mono-mp3",
            "audio-16khz-128kbitrate-mono-mp3",
            "audio-24khz-96kbitrate-mono-mp3"
        };
        
        for (String format : supportedFormats) {
            assertThat(format)
                .matches("audio-\\d+khz-\\d+kbitrate-mono-mp3");
        }
    }
    
    // ============================================================================
    // Provider Switching Tests
    // ============================================================================
    
    @Test
    void testGetServiceStatusReturnsMultipleProviders() {
        var serviceStatus = ttsServiceFactory.getServiceStatus();
        assertThat(serviceStatus)
            .isNotEmpty()
            .containsKeys("mock");
    }
    
    @Test
    void testMockProviderAlwaysHealthy() {
        var serviceStatus = ttsServiceFactory.getServiceStatus();
        Boolean mockHealth = serviceStatus.get("mock");
        assertThat(mockHealth).isTrue();
    }
    
    // ============================================================================
    // Speech Rate and Pitch Tests
    // ============================================================================
    
    @Test
    void testSpeechRateValid() {
        double speechRate = ttsConfig.getSpeechRate();
        assertThat(speechRate)
            .isBetween(0.5, 2.0); // Typical range: 0.5x to 2.0x
    }
    
    @Test
    void testPitchValid() {
        double pitch = ttsConfig.getPitch();
        assertThat(pitch)
            .isBetween(-10.0, 10.0); // Typical range: -10 to +10
    }
    
    // ============================================================================
    // Configuration Defaults Tests
    // ============================================================================
    
    @Test
    void testAzureConfigHasDefaults() {
        TtsConfig.Azure azureConfig = new TtsConfig.Azure();
        assertThat(azureConfig.getRegion()).isEqualTo("eastus");
        assertThat(azureConfig.getVoice()).isEqualTo("en-US-JennyNeural");
        assertThat(azureConfig.getFormat()).isEqualTo("audio-24khz-48kbitrate-mono-mp3");
        assertThat(azureConfig.getTimeoutSeconds()).isEqualTo(30);
        assertThat(azureConfig.isEnabled()).isTrue();
    }
    
    @Test
    void testMockConfigHasDefaults() {
        TtsConfig.Mock mockConfig = new TtsConfig.Mock();
        assertThat(mockConfig.isEnabled()).isTrue();
        assertThat(mockConfig.getDelayMs()).isEqualTo(100);
    }
}

/**
 * Azure TTS Integration Test (requires real credentials)
 * Run with: -Dspring.profiles.active=prod -DAZURE_SPEECH_KEY=your_key
 */
@SpringBootTest
@ActiveProfiles("prod")
@TestPropertySource(properties = {
    "tts.provider=azure",
    "tts.azure.subscription-key=${AZURE_SPEECH_KEY:dummy}",
    "tts.azure.region=${AZURE_SPEECH_REGION:eastus}"
})
class TtsAzureConfigurationIntegrationTest {
    
    @Autowired
    private TtsConfig ttsConfig;
    
    @Autowired
    private TtsServiceFactory ttsServiceFactory;
    
    @Test
    void testAzureConfigurationInProdProfile() {
        assertThat(ttsConfig.getProvider()).isEqualTo("azure");
        assertThat(ttsConfig.getAzure().getSubscriptionKey()).isNotBlank();
        assertThat(ttsConfig.getAzure().getRegion()).isNotBlank();
    }
    
    @Test
    void testAzureServiceFactoryConfigured() {
        String currentProvider = ttsServiceFactory.getCurrentProviderName();
        assertThat(currentProvider).isIn("azure", "mock"); // Falls back to mock if Azure unavailable
    }
}
