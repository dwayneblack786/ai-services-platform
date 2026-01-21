package com.ai.va.service.stt;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.*;

/**
 * Unit tests for SttProvider enum.
 */
@DisplayName("SttProvider Tests")
class SttProviderTest {
    
    @Test
    @DisplayName("Should have correct provider codes")
    void testProviderCodes() {
        assertEquals("whisper", SttProvider.WHISPER.getCode());
        assertEquals("azure-speech", SttProvider.AZURE_SPEECH.getCode());
        assertEquals("google-speech", SttProvider.GOOGLE_SPEECH.getCode());
        assertEquals("aws-transcribe", SttProvider.AWS_TRANSCRIBE.getCode());
    }
    
    @Test
    @DisplayName("Should have correct display names")
    void testDisplayNames() {
        assertEquals("Whisper (Local)", SttProvider.WHISPER.getDisplayName());
        assertEquals("Azure Speech", SttProvider.AZURE_SPEECH.getDisplayName());
        assertEquals("Google Speech", SttProvider.GOOGLE_SPEECH.getDisplayName());
        assertEquals("AWS Transcribe", SttProvider.AWS_TRANSCRIBE.getDisplayName());
    }
    
    @Test
    @DisplayName("Should correctly identify self-hosted providers")
    void testSelfHostedFlag() {
        assertTrue(SttProvider.WHISPER.isSelfHosted());
        assertFalse(SttProvider.WHISPER.isCloudBased());
        
        assertFalse(SttProvider.AZURE_SPEECH.isSelfHosted());
        assertTrue(SttProvider.AZURE_SPEECH.isCloudBased());
        
        assertFalse(SttProvider.GOOGLE_SPEECH.isSelfHosted());
        assertTrue(SttProvider.GOOGLE_SPEECH.isCloudBased());
        
        assertFalse(SttProvider.AWS_TRANSCRIBE.isSelfHosted());
        assertTrue(SttProvider.AWS_TRANSCRIBE.isCloudBased());
    }
    
    @Test
    @DisplayName("Should find provider by code (case-insensitive)")
    void testFromCode() {
        assertEquals(SttProvider.WHISPER, SttProvider.fromCode("whisper"));
        assertEquals(SttProvider.WHISPER, SttProvider.fromCode("WHISPER"));
        assertEquals(SttProvider.WHISPER, SttProvider.fromCode("Whisper"));
        
        assertEquals(SttProvider.AZURE_SPEECH, SttProvider.fromCode("azure-speech"));
        assertEquals(SttProvider.AZURE_SPEECH, SttProvider.fromCode("AZURE-SPEECH"));
        
        assertEquals(SttProvider.GOOGLE_SPEECH, SttProvider.fromCode("google-speech"));
        assertEquals(SttProvider.AWS_TRANSCRIBE, SttProvider.fromCode("aws-transcribe"));
    }
    
    @Test
    @DisplayName("Should return null for unknown provider code")
    void testFromCodeUnknown() {
        assertNull(SttProvider.fromCode("unknown-provider"));
        assertNull(SttProvider.fromCode(""));
        assertNull(SttProvider.fromCode(null));
    }
    
    @Test
    @DisplayName("Should use display name in toString")
    void testToString() {
        assertEquals("Whisper (Local)", SttProvider.WHISPER.toString());
        assertEquals("Azure Speech", SttProvider.AZURE_SPEECH.toString());
    }
    
    @Test
    @DisplayName("Should have all four providers defined")
    void testAllProviders() {
        SttProvider[] providers = SttProvider.values();
        assertEquals(4, providers.length);
        
        assertTrue(java.util.Arrays.asList(providers).contains(SttProvider.WHISPER));
        assertTrue(java.util.Arrays.asList(providers).contains(SttProvider.AZURE_SPEECH));
        assertTrue(java.util.Arrays.asList(providers).contains(SttProvider.GOOGLE_SPEECH));
        assertTrue(java.util.Arrays.asList(providers).contains(SttProvider.AWS_TRANSCRIBE));
    }
}
