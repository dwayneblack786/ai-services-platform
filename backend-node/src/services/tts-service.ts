import { grpcClient } from '../grpc/client';

/**
 * Text-to-Speech Service
 * Provides high-level TTS functionality using the Java gRPC TTS service
 */

export interface TtsOptions {
  language?: string;
  voiceName?: string;
  format?: string;
  customerId?: string;
}

export interface TtsResponse {
  audioData: Buffer;
  format: string;
  metadata: {
    voiceName: string;
    language: string;
    durationMs: number;
    sampleRate: number;
    bitrate: number;
    provider: string;
    processingTimeMs: number;
    success: boolean;
  };
}

export class TtsService {
  /**
   * Synthesize text to speech (single request)
   * Best for short texts and when you need the full audio immediately
   */
  async synthesize(
    sessionId: string,
    text: string,
    options: TtsOptions = {}
  ): Promise<TtsResponse> {
    const {
      language = 'en-US',
      voiceName = 'en-US-JennyNeural',
      format = 'mp3',
      customerId = 'default'
    } = options;

    try {
      console.log(`[TTS] Synthesizing text:`, {
        sessionId: sessionId.substring(0, 8) + '...',
        textLength: text.length,
        language,
        voiceName,
        format
      });

      const startTime = Date.now();
      const response = await grpcClient.synthesize(
        sessionId,
        text,
        language,
        voiceName,
        format,
        customerId
      );

      const processingTime = Date.now() - startTime;

      console.log(`[TTS] Synthesis complete in ${processingTime}ms:`, {
        audioSize: response.audio_data?.length || 0,
        provider: response.metadata?.provider,
        success: response.metadata?.success
      });

      return {
        audioData: Buffer.from(response.audio_data),
        format: response.format || format,
        metadata: {
          voiceName: response.metadata?.voice_name || voiceName,
          language: response.metadata?.language || language,
          durationMs: response.metadata?.duration_ms || 0,
          sampleRate: response.metadata?.sample_rate || 24000,
          bitrate: response.metadata?.bitrate || 48000,
          provider: response.metadata?.provider || 'unknown',
          processingTimeMs: response.metadata?.processing_time_ms || processingTime,
          success: response.metadata?.success !== false
        }
      };

    } catch (error: any) {
      console.error('[TTS] Synthesis failed:', {
        sessionId: sessionId.substring(0, 8) + '...',
        error: error.message
      });

      throw {
        message: 'Text-to-speech synthesis failed',
        details: error.message,
        sessionId
      };
    }
  }

  /**
   * Synthesize text to speech (streaming)
   * Best for long texts or when you want to start playback before full synthesis completes
   */
  synthesizeStream(
    sessionId: string,
    text: string,
    options: TtsOptions = {}
  ): Promise<TtsResponse> {
    return new Promise((resolve, reject) => {
      const {
        language = 'en-US',
        voiceName = 'en-US-JennyNeural',
        format = 'mp3',
        customerId = 'default'
      } = options;

      console.log(`[TTS Stream] Starting synthesis:`, {
        sessionId: sessionId.substring(0, 8) + '...',
        textLength: text.length,
        language,
        voiceName
      });

      const startTime = Date.now();
      const audioChunks: Buffer[] = [];
      let metadata: any = null;

      const stream = grpcClient.synthesizeStream(
        sessionId,
        text,
        language,
        voiceName,
        format,
        customerId
      );

      stream.on('data', (response: any) => {
        if (response.audio_data && response.audio_data.length > 0) {
          audioChunks.push(Buffer.from(response.audio_data));
          console.log(`[TTS Stream] Received chunk: ${response.audio_data.length} bytes`);
        }
        
        if (response.metadata) {
          metadata = response.metadata;
        }
      });

      stream.on('end', () => {
        const processingTime = Date.now() - startTime;
        const fullAudio = Buffer.concat(audioChunks);

        console.log(`[TTS Stream] Synthesis complete:`, {
          totalSize: fullAudio.length,
          chunks: audioChunks.length,
          processingTimeMs: processingTime
        });

        resolve({
          audioData: fullAudio,
          format: format,
          metadata: {
            voiceName: metadata?.voice_name || voiceName,
            language: metadata?.language || language,
            durationMs: metadata?.duration_ms || 0,
            sampleRate: metadata?.sample_rate || 24000,
            bitrate: metadata?.bitrate || 48000,
            provider: metadata?.provider || 'unknown',
            processingTimeMs: metadata?.processing_time_ms || processingTime,
            success: metadata?.success !== false
          }
        });
      });

      stream.on('error', (error: Error) => {
        console.error('[TTS Stream] Stream error:', error.message);
        reject({
          message: 'TTS streaming failed',
          details: error.message,
          sessionId
        });
      });
    });
  }

  /**
   * Get recommended voice for a language
   */
  getRecommendedVoice(language: string): string {
    const voiceMap: { [key: string]: string } = {
      'en-US': 'en-US-JennyNeural',
      'en-GB': 'en-GB-SoniaNeural',
      'es-ES': 'es-ES-ElviraNeural',
      'es-MX': 'es-MX-DaliaNeural',
      'fr-FR': 'fr-FR-DeniseNeural',
      'fr-CA': 'fr-CA-SylvieNeural',
      'de-DE': 'de-DE-KatjaNeural',
      'it-IT': 'it-IT-ElsaNeural',
      'pt-BR': 'pt-BR-FranciscaNeural',
      'ja-JP': 'ja-JP-NanamiNeural',
      'ko-KR': 'ko-KR-SunHiNeural',
      'zh-CN': 'zh-CN-XiaoxiaoNeural'
    };

    return voiceMap[language] || voiceMap['en-US'];
  }

  /**
   * Get supported audio formats
   */
  getSupportedFormats(): string[] {
    return ['mp3', 'wav', 'ogg', 'webm'];
  }

  /**
   * Validate TTS options
   */
  validateOptions(options: TtsOptions): { valid: boolean; error?: string } {
    if (options.format && !this.getSupportedFormats().includes(options.format)) {
      return {
        valid: false,
        error: `Unsupported audio format: ${options.format}. Supported: ${this.getSupportedFormats().join(', ')}`
      };
    }

    return { valid: true };
  }
}

// Singleton instance
export const ttsService = new TtsService();
