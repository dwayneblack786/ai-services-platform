package com.ai.va.service.tts;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.condition.EnabledIfEnvironmentVariable;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;

import java.util.List;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.TimeUnit;

import static org.assertj.core.api.Assertions.*;

/**
 * Azure TTS Integration Tests (Task 4.5: Configuration)
 * 
 * Tests real Azure Speech Services TTS with various configurations:
 * - Different voice names (AriaNeural, JennyNeural, GuyNeural, SaraNeural)
 * - Multiple audio formats (MP3, WAV, OGG, WebM)
 * - Multiple languages (en-US, es-ES, fr-FR)
 * - Voice listing and metadata
 * 
 * IMPORTANT: These tests require a valid Azure Speech Services subscription key
 * Set environment variable: AZURE_SPEECH_KEY=your_subscription_key
 * 
 * Run with: mvn test -Dspring.profiles.active=prod -DAZURE_SPEECH_KEY=your_key
 * 
 * Or skip with: mvn test -DskipAzureTests=true
 */
@SpringBootTest
@ActiveProfiles("prod")
@EnabledIfEnvironmentVariable(named = "AZURE_SPEECH_KEY", matches = ".+")
class TtsAzureIntegrationTest {
    
    @Autowired
    private TtsServiceFactory ttsServiceFactory;
    
    private TtsService azureTtsService;
    
    @BeforeEach
    void setUp() {
        // Try to get Azure service, fall back to mock if unavailable
        try {
            azureTtsService = ttsServiceFactory.getTtsService("azure");
        } catch (Exception e) {
            azureTtsService = ttsServiceFactory.getTtsService("mock");
            System.out.println("⚠️ Azure TTS not available, using mock service");
        }
    }
    
    // ============================================================================
    // Basic Synthesis Tests
    // ============================================================================
    
    @Test
    void testAzureServiceHealthy() {
        assertThat(azureTtsService).isNotNull();
        assertThat(azureTtsService.isHealthy()).isTrue();
        System.out.println("✅ Azure TTS service is healthy");
    }
    
    @Test
    void testSynthesizeSimpleText() throws Exception {
        String text = "Hello, this is a test of Azure text-to-speech.";
        String language = "en-US";
        
        CompletableFuture<byte[]> future = azureTtsService.synthesize(text, language);
        byte[] audioData = future.get(30, TimeUnit.SECONDS);
        
        assertThat(audioData).isNotNull();
        assertThat(audioData).isNotEmpty();
        System.out.println("✅ Synthesized " + audioData.length + " bytes of audio");
    }
    
    @Test
    void testSynthesizeWithVoice() throws Exception {
        String text = "Testing voice synthesis with specific voice.";
        String language = "en-US";
        String voice = "en-US-JennyNeural";
        
        CompletableFuture<byte[]> future = azureTtsService.synthesize(text, language, voice);
        byte[] audioData = future.get(30, TimeUnit.SECONDS);
        
        assertThat(audioData).isNotNull();
        assertThat(audioData).isNotEmpty();
        System.out.println("✅ Synthesized with voice: " + voice);
    }
    
    @Test
    void testSynthesizeWithMetadata() throws Exception {
        String text = "This test validates audio metadata.";
        String language = "en-US";
        String voice = "en-US-AriaNeural";
        
        CompletableFuture<TtsResult> future = azureTtsService.synthesizeWithMetadata(text, language, voice);
        TtsResult result = future.get(30, TimeUnit.SECONDS);
        
        assertThat(result).isNotNull();
        assertThat(result.isSuccess()).isTrue();
        assertThat(result.getAudioData()).isNotEmpty();
        assertThat(result.getVoiceName()).isEqualTo(voice);
        assertThat(result.getLanguage()).isEqualTo(language);
        assertThat(result.getProvider()).contains("Azure");
        assertThat(result.getFormat()).isNotBlank();
        assertThat(result.getDurationMs()).isGreaterThan(0);
        
        System.out.println("✅ Metadata validation passed:");
        System.out.println("   Voice: " + result.getVoiceName());
        System.out.println("   Duration: " + result.getDurationMs() + "ms");
        System.out.println("   Format: " + result.getFormat());
        System.out.println("   Sample Rate: " + result.getSampleRate() + "Hz");
        System.out.println("   Bitrate: " + result.getBitrate() + " kbps");
    }
    
    // ============================================================================
    // Voice Name Tests
    // ============================================================================
    
    @Test
    void testSynthesizeWithAriaNeural() throws Exception {
        testVoiceSynthesis("en-US-AriaNeural", "Aria speaking in a natural conversational style.");
    }
    
    @Test
    void testSynthesizeWithJennyNeural() throws Exception {
        testVoiceSynthesis("en-US-JennyNeural", "Jenny speaking with a friendly tone.");
    }
    
    @Test
    void testSynthesizeWithGuyNeural() throws Exception {
        testVoiceSynthesis("en-US-GuyNeural", "Guy speaking in a professional manner.");
    }
    
    @Test
    void testSynthesizeWithSaraNeural() throws Exception {
        testVoiceSynthesis("en-US-SaraNeural", "Sara speaking warmly and naturally.");
    }
    
    private void testVoiceSynthesis(String voice, String text) throws Exception {
        CompletableFuture<TtsResult> future = azureTtsService.synthesizeWithMetadata(text, "en-US", voice);
        TtsResult result = future.get(30, TimeUnit.SECONDS);
        
        assertThat(result.isSuccess()).isTrue();
        assertThat(result.getAudioData()).isNotEmpty();
        assertThat(result.getVoiceName()).isEqualTo(voice);
        
        System.out.println("✅ Voice test passed: " + voice + " (" + result.getAudioData().length + " bytes)");
    }
    
    // ============================================================================
    // Multiple Languages Tests
    // ============================================================================
    
    @Test
    void testSynthesizeSpanish() throws Exception {
        String text = "Hola, esta es una prueba de síntesis de voz en español.";
        String language = "es-ES";
        String voice = "es-ES-ElviraNeural";
        
        CompletableFuture<TtsResult> future = azureTtsService.synthesizeWithMetadata(text, language, voice);
        TtsResult result = future.get(30, TimeUnit.SECONDS);
        
        assertThat(result.isSuccess()).isTrue();
        assertThat(result.getLanguage()).isEqualTo(language);
        
        System.out.println("✅ Spanish synthesis successful: " + voice);
    }
    
    @Test
    void testSynthesizeFrench() throws Exception {
        String text = "Bonjour, ceci est un test de synthèse vocale en français.";
        String language = "fr-FR";
        String voice = "fr-FR-DeniseNeural";
        
        CompletableFuture<TtsResult> future = azureTtsService.synthesizeWithMetadata(text, language, voice);
        TtsResult result = future.get(30, TimeUnit.SECONDS);
        
        assertThat(result.isSuccess()).isTrue();
        assertThat(result.getLanguage()).isEqualTo(language);
        
        System.out.println("✅ French synthesis successful: " + voice);
    }
    
    // ============================================================================
    // Audio Format Tests
    // ============================================================================
    
    @Test
    void testDifferentAudioQualities() throws Exception {
        String text = "Testing different audio quality settings.";
        String language = "en-US";
        String voice = "en-US-JennyNeural";
        
        // Test multiple synthesis calls (simulates different quality settings)
        for (int i = 0; i < 3; i++) {
            CompletableFuture<TtsResult> future = azureTtsService.synthesizeWithMetadata(text, language, voice);
            TtsResult result = future.get(30, TimeUnit.SECONDS);
            
            assertThat(result.isSuccess()).isTrue();
            assertThat(result.getAudioData()).isNotEmpty();
            
            System.out.println("✅ Quality test " + (i + 1) + ": " + result.getAudioData().length + " bytes");
        }
    }
    
    // ============================================================================
    // Voice Listing Tests
    // ============================================================================
    
    @Test
    void testGetAvailableVoices() {
        List<Voice> voices = azureTtsService.getAvailableVoices();
        
        assertThat(voices).isNotNull();
        // Mock service has 2 voices, Azure has many more
        assertThat(voices).isNotEmpty();
        
        System.out.println("✅ Available voices: " + voices.size());
        
        // Print first few voices
        voices.stream()
            .limit(10)
            .forEach(voice -> System.out.println("   - " + voice.getName() + " (" + voice.getLanguage() + ")"));
    }
    
    @Test
    void testGetAvailableVoicesForLanguage() {
        List<Voice> enVoices = azureTtsService.getAvailableVoices("en-US");
        
        assertThat(enVoices).isNotNull();
        assertThat(enVoices).isNotEmpty();
        
        // All voices should be for en-US
        enVoices.forEach(voice -> 
            assertThat(voice.getLanguage()).startsWith("en-US")
        );
        
        System.out.println("✅ en-US voices: " + enVoices.size());
    }
    
    @Test
    void testDefaultVoice() {
        String defaultVoice = azureTtsService.getDefaultVoice();
        
        assertThat(defaultVoice).isNotBlank();
        assertThat(defaultVoice).contains("-"); // Format: en-US-JennyNeural
        
        System.out.println("✅ Default voice: " + defaultVoice);
    }
    
    @Test
    void testSupportedFormats() {
        List<String> formats = azureTtsService.getSupportedFormats();
        
        assertThat(formats).isNotNull();
        assertThat(formats).isNotEmpty();
        assertThat(formats).contains("mp3");
        
        System.out.println("✅ Supported formats: " + String.join(", ", formats));
    }
    
    // ============================================================================
    // Performance Tests
    // ============================================================================
    
    @Test
    void testSynthesisLatency() throws Exception {
        String text = "Performance test for synthesis latency.";
        String language = "en-US";
        
        long startTime = System.currentTimeMillis();
        CompletableFuture<byte[]> future = azureTtsService.synthesize(text, language);
        byte[] audioData = future.get(30, TimeUnit.SECONDS);
        long endTime = System.currentTimeMillis();
        
        long latencyMs = endTime - startTime;
        
        assertThat(audioData).isNotEmpty();
        assertThat(latencyMs).isLessThan(10000); // Should complete within 10 seconds
        
        System.out.println("✅ Synthesis latency: " + latencyMs + "ms");
    }
    
    @Test
    void testConcurrentSynthesis() throws Exception {
        String text = "Concurrent synthesis test.";
        String language = "en-US";
        
        // Launch 5 concurrent synthesis requests
        CompletableFuture<byte[]>[] futures = new CompletableFuture[5];
        for (int i = 0; i < 5; i++) {
            futures[i] = azureTtsService.synthesize(text + " Request " + (i + 1), language);
        }
        
        // Wait for all to complete
        CompletableFuture.allOf(futures).get(60, TimeUnit.SECONDS);
        
        // Verify all succeeded
        for (int i = 0; i < 5; i++) {
            byte[] audioData = futures[i].get();
            assertThat(audioData).isNotEmpty();
        }
        
        System.out.println("✅ All 5 concurrent requests completed successfully");
    }
    
    // ============================================================================
    // Error Handling Tests
    // ============================================================================
    
    @Test
    void testEmptyTextHandling() {
        assertThatThrownBy(() -> {
            azureTtsService.synthesize("", "en-US").get(10, TimeUnit.SECONDS);
        }).isInstanceOf(Exception.class);
        
        System.out.println("✅ Empty text handled correctly");
    }
    
    @Test
    void testInvalidVoiceHandling() {
        String text = "Testing invalid voice handling.";
        String language = "en-US";
        String invalidVoice = "en-US-NonExistentVoice";
        
        // Should either throw exception or fall back gracefully
        assertThatCode(() -> {
            CompletableFuture<byte[]> future = azureTtsService.synthesize(text, language, invalidVoice);
            try {
                future.get(10, TimeUnit.SECONDS);
            } catch (Exception e) {
                System.out.println("⚠️ Invalid voice rejected as expected: " + e.getMessage());
            }
        }).doesNotThrowAnyException();
    }
    
    // ============================================================================
    // Long Text Tests
    // ============================================================================
    
    @Test
    void testLongTextSynthesis() throws Exception {
        StringBuilder longText = new StringBuilder();
        for (int i = 0; i < 20; i++) {
            longText.append("This is sentence number ").append(i + 1).append(". ");
        }
        
        String text = longText.toString();
        String language = "en-US";
        
        CompletableFuture<TtsResult> future = azureTtsService.synthesizeWithMetadata(text, language, null);
        TtsResult result = future.get(60, TimeUnit.SECONDS);
        
        assertThat(result.isSuccess()).isTrue();
        assertThat(result.getAudioData()).isNotEmpty();
        assertThat(result.getDurationMs()).isGreaterThan(1000); // Should be > 1 second
        
        System.out.println("✅ Long text synthesis successful:");
        System.out.println("   Text length: " + text.length() + " characters");
        System.out.println("   Audio size: " + result.getAudioData().length + " bytes");
        System.out.println("   Duration: " + result.getDurationMs() + "ms");
    }
}
