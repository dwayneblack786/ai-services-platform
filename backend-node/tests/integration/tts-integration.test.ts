import { describe, it, expect, beforeAll, afterAll, jest } from '@jest/globals';
import { ttsService } from '../../src/services/tts-service';
import { grpcClient } from '../../src/grpc/client';

describe('TTS Integration Tests', () => {
  const testSessionId = 'test-session-123';
  
  beforeAll(async () => {
    // Ensure gRPC client is initialized
    // Note: These tests require the Java VA service to be running
    console.log('Starting TTS integration tests...');
    console.log('Make sure Java VA service is running on localhost:50051');
  });
  
  afterAll(async () => {
    // Cleanup
    console.log('TTS integration tests complete');
  });

  describe('TTS Service - Single Request', () => {
    it('should synthesize short text to audio', async () => {
      const text = 'Hello, this is a test.';
      
      const response = await ttsService.synthesize(testSessionId, text, {
        language: 'en-US',
        voiceName: 'en-US-JennyNeural',
        format: 'mp3'
      });
      
      expect(response).toBeDefined();
      expect(response.audioData).toBeInstanceOf(Buffer);
      expect(response.audioData.length).toBeGreaterThan(0);
      expect(response.format).toBe('mp3');
      expect(response.metadata).toBeDefined();
      expect(response.metadata.voiceName).toBe('en-US-JennyNeural');
      expect(response.metadata.language).toBe('en-US');
      expect(response.metadata.success).toBe(true);
      
      console.log(`✓ Synthesized ${response.audioData.length} bytes in ${response.metadata.processingTimeMs}ms`);
    }, 30000); // 30 second timeout

    it('should synthesize text in different languages', async () => {
      const testCases = [
        { text: 'Hola, ¿cómo estás?', language: 'es-ES', voiceName: 'es-ES-ElviraNeural' },
        { text: 'Bonjour, comment allez-vous?', language: 'fr-FR', voiceName: 'fr-FR-DeniseNeural' },
        { text: 'こんにちは、元気ですか？', language: 'ja-JP', voiceName: 'ja-JP-NanamiNeural' }
      ];
      
      for (const testCase of testCases) {
        const response = await ttsService.synthesize(testSessionId, testCase.text, {
          language: testCase.language,
          voiceName: testCase.voiceName,
          format: 'mp3'
        });
        
        expect(response.audioData.length).toBeGreaterThan(0);
        expect(response.metadata.language).toBe(testCase.language);
        expect(response.metadata.voiceName).toBe(testCase.voiceName);
        
        console.log(`✓ ${testCase.language}: ${response.audioData.length} bytes`);
      }
    }, 60000); // 60 second timeout for multiple requests

    it('should handle long text synthesis', async () => {
      const longText = `
        This is a longer text that will test the text-to-speech service's ability to handle
        more substantial content. The service should be able to process this entire paragraph
        and return a complete audio file. This tests both the synthesis capability and the
        data transfer over gRPC. The resulting audio should maintain consistent quality
        throughout the entire synthesis process.
      `.trim();
      
      const response = await ttsService.synthesize(testSessionId, longText, {
        language: 'en-US',
        format: 'mp3'
      });
      
      expect(response.audioData.length).toBeGreaterThan(10000); // Should be substantial
      expect(response.metadata.durationMs).toBeGreaterThan(0);
      
      console.log(`✓ Long text: ${response.audioData.length} bytes, ${response.metadata.durationMs}ms duration`);
    }, 30000);
  });

  describe('TTS Service - Streaming', () => {
    it('should synthesize text using streaming', async () => {
      const text = 'This is a streaming test.';
      
      const response = await ttsService.synthesizeStream(testSessionId, text, {
        language: 'en-US',
        format: 'mp3'
      });
      
      expect(response).toBeDefined();
      expect(response.audioData).toBeInstanceOf(Buffer);
      expect(response.audioData.length).toBeGreaterThan(0);
      expect(response.format).toBe('mp3');
      
      console.log(`✓ Streamed ${response.audioData.length} bytes`);
    }, 30000);
  });

  describe('TTS Service - Voice Recommendation', () => {
    it('should recommend appropriate voices for languages', () => {
      const testCases = [
        { language: 'en-US', expected: 'en-US-JennyNeural' },
        { language: 'es-ES', expected: 'es-ES-ElviraNeural' },
        { language: 'fr-FR', expected: 'fr-FR-DeniseNeural' },
        { language: 'de-DE', expected: 'de-DE-KatjaNeural' },
        { language: 'ja-JP', expected: 'ja-JP-NanamiNeural' },
        { language: 'zh-CN', expected: 'zh-CN-XiaoxiaoNeural' }
      ];
      
      for (const testCase of testCases) {
        const voice = ttsService.getRecommendedVoice(testCase.language);
        expect(voice).toBe(testCase.expected);
      }
      
      // Unknown language should default to en-US
      const unknownVoice = ttsService.getRecommendedVoice('xx-XX');
      expect(unknownVoice).toBe('en-US-JennyNeural');
    });
  });

  describe('TTS Service - Format Validation', () => {
    it('should return supported formats', () => {
      const formats = ttsService.getSupportedFormats();
      expect(formats).toEqual(['mp3', 'wav', 'ogg', 'webm']);
    });

    it('should validate TTS options', () => {
      // Valid options
      const validResult = ttsService.validateOptions({
        language: 'en-US',
        voiceName: 'en-US-JennyNeural',
        format: 'mp3'
      });
      expect(validResult.valid).toBe(true);
      expect(validResult.error).toBeUndefined();
      
      // Invalid format
      const invalidFormatResult = ttsService.validateOptions({
        format: 'invalid-format'
      });
      expect(invalidFormatResult.valid).toBe(false);
      expect(invalidFormatResult.error).toContain('Invalid format');
    });
  });

  describe('TTS Service - Error Handling', () => {
    it('should handle empty text gracefully', async () => {
      await expect(async () => {
        await ttsService.synthesize(testSessionId, '', {
          language: 'en-US',
          format: 'mp3'
        });
      }).rejects.toThrow();
    });

    it('should handle invalid voice name', async () => {
      // This test depends on Java service behavior
      // It may return an error or use fallback voice
      const text = 'Testing invalid voice';
      
      try {
        const response = await ttsService.synthesize(testSessionId, text, {
          language: 'en-US',
          voiceName: 'invalid-voice-name',
          format: 'mp3'
        });
        
        // If it succeeds, it used a fallback voice
        expect(response.audioData.length).toBeGreaterThan(0);
        console.log('✓ Service used fallback voice for invalid voice name');
      } catch (error: any) {
        // If it fails, that's also acceptable behavior
        expect(error).toBeDefined();
        console.log('✓ Service rejected invalid voice name');
      }
    }, 30000);
  });

  describe('gRPC Client - TTS Methods', () => {
    it('should synthesize via gRPC client directly', async () => {
      const text = 'Direct gRPC client test';
      
      const response = await grpcClient.synthesize(
        testSessionId,
        text,
        'en-US',
        'en-US-JennyNeural',
        'mp3',
        'test-customer'
      );
      
      expect(response).toBeDefined();
      expect(response.audio_data).toBeDefined();
      expect(response.format).toBe('mp3');
      expect(response.metadata).toBeDefined();
      
      console.log(`✓ gRPC synthesized ${response.audio_data.length} bytes`);
    }, 30000);
  });

  describe('Full Voice Conversation Flow', () => {
    it('should complete STT → TTS cycle', async () => {
      // This test simulates the full voice conversation flow
      // In a real scenario, this would involve:
      // 1. Recording audio from microphone
      // 2. Sending to STT (transcribe)
      // 3. Processing with assistant
      // 4. Converting response to audio (TTS)
      // 5. Playing audio response
      
      // For this test, we'll just verify the TTS part
      const assistantResponse = 'I can help you with that. What would you like to know?';
      
      const ttsResponse = await ttsService.synthesize(testSessionId, assistantResponse, {
        language: 'en-US',
        voiceName: 'en-US-JennyNeural',
        format: 'mp3'
      });
      
      expect(ttsResponse.audioData.length).toBeGreaterThan(0);
      expect(ttsResponse.metadata.success).toBe(true);
      
      // Verify we can convert to base64 for WebSocket transmission
      const base64Audio = ttsResponse.audioData.toString('base64');
      expect(base64Audio).toBeDefined();
      expect(base64Audio.length).toBeGreaterThan(0);
      
      // Verify we can convert back from base64
      const decodedAudio = Buffer.from(base64Audio, 'base64');
      expect(decodedAudio.length).toBe(ttsResponse.audioData.length);
      
      console.log(`✓ Complete TTS cycle: ${ttsResponse.audioData.length} bytes → ${base64Audio.length} base64 chars`);
    }, 30000);
  });
});
