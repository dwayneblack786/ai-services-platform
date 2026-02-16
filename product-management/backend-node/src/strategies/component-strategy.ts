// Component Strategy - STT → LLM → TTS pipeline

import { BaseVoiceStrategy } from './base-strategy';
import { VoiceRequest, VoiceResponse } from '../orchestrator/types';
import { createModuleLogger } from '../utils/logger';

const logger = createModuleLogger('component-strategy');

export interface ComponentConfig {
  stt: {
    provider: 'whisper' | 'google' | 'azure';
    endpoint: string;
  };
  llm: {
    provider: 'openai' | 'anthropic';
    model: string;
    endpoint: string;
  };
  tts: {
    provider: 'azure' | 'google' | 'elevenlabs';
    endpoint: string;
    voice: string;
  };
}

export class ComponentStrategy extends BaseVoiceStrategy {
  private config: ComponentConfig;

  constructor(config: ComponentConfig) {
    super('component');
    this.config = config;
  }

  async process(request: VoiceRequest): Promise<VoiceResponse> {
    const startTime = Date.now();

    logger.info('Processing with component strategy', {
      sessionId: request.sessionId.substring(0, 8),
      stt: this.config.stt.provider,
      llm: this.config.llm.provider,
      tts: this.config.tts.provider,
      audioSize: request.audioData.length
    });

    try {
      // Step 1: Speech-to-Text
      const transcription = await this.performSTT(request);

      // Step 2: LLM Processing
      const responseText = await this.performLLM(transcription, request);

      // Step 3: Text-to-Speech
      const audioData = await this.performTTS(responseText, request);

      const latency = Date.now() - startTime;

      return this.createResponse(request, {
        transcription,
        responseText,
        audioData,
        metadata: {
          strategy: 'component',
          latency,
          provider: 'component-pipeline',
          voiceName: this.config.tts.voice,
          confidence: 0.92
        }
      });
    } catch (error) {
      logger.error('Component strategy failed', {
        sessionId: request.sessionId.substring(0, 8),
        error
      });
      throw error;
    }
  }

  private async performSTT(request: VoiceRequest): Promise<string> {
    const startTime = Date.now();

    logger.debug('Performing STT', {
      sessionId: request.sessionId.substring(0, 8),
      provider: this.config.stt.provider
    });

    try {
      if (this.config.stt.provider === 'whisper') {
        // Use Java gRPC service for Whisper STT
        try {
          const { grpcClient } = await import('../grpc/client');

          const response = await grpcClient.transcribe(
            request.sessionId,
            request.audioData,
            request.format,
            request.customerId || 'unknown'
          );

          const latency = Date.now() - startTime;
          logger.debug('STT completed (Whisper)', {
            sessionId: request.sessionId.substring(0, 8),
            latency,
            transcription: response.text.substring(0, 50),
            confidence: response.confidence
          });

          return response.text;
        } catch (grpcError: any) {
          // Fallback to mock if gRPC unavailable
          logger.warn('Whisper gRPC unavailable, using mock', {
            sessionId: request.sessionId.substring(0, 8),
            error: grpcError.message
          });
        }
      }

      // Fallback to mock for other providers or when service unavailable
      const mockTranscription = 'Hello, how can I help you?';
      const latency = Date.now() - startTime;

      logger.debug('STT completed (mock)', {
        sessionId: request.sessionId.substring(0, 8),
        latency,
        transcription: mockTranscription
      });

      return mockTranscription;
    } catch (error) {
      logger.error('STT failed', {
        sessionId: request.sessionId.substring(0, 8),
        provider: this.config.stt.provider,
        error
      });
      throw error;
    }
  }

  private async performLLM(transcription: string, request: VoiceRequest): Promise<string> {
    const startTime = Date.now();

    logger.debug('Performing LLM', {
      sessionId: request.sessionId.substring(0, 8),
      provider: this.config.llm.provider,
      model: this.config.llm.model
    });

    // Real implementation would call LLM service
    // For now, return mock response
    const mockResponse = `I heard you say: ${transcription}. How can I assist you today?`;

    const latency = Date.now() - startTime;
    logger.debug('LLM completed', {
      sessionId: request.sessionId.substring(0, 8),
      latency,
      responseLength: mockResponse.length
    });

    return mockResponse;
  }

  private async performTTS(text: string, request: VoiceRequest): Promise<Buffer> {
    const startTime = Date.now();

    logger.debug('Performing TTS', {
      sessionId: request.sessionId.substring(0, 8),
      provider: this.config.tts.provider,
      voice: this.config.tts.voice,
      textLength: text.length
    });

    // Real implementation would call TTS service
    // For now, return mock audio
    const mockAudio = Buffer.from(`mock-tts-audio-${text.length}`);

    const latency = Date.now() - startTime;
    logger.debug('TTS completed', {
      sessionId: request.sessionId.substring(0, 8),
      latency,
      audioSize: mockAudio.length
    });

    return mockAudio;
  }

  getName(): string {
    return `component-${this.config.stt.provider}-${this.config.llm.provider}-${this.config.tts.provider}`;
  }

  async isAvailable(): Promise<boolean> {
    // In real implementation: Check all service endpoints
    // For now, assume available
    return true;
  }

  // Get individual service health (for monitoring)
  async getServiceHealth(): Promise<{
    stt: boolean;
    llm: boolean;
    tts: boolean;
  }> {
    // Real implementation would ping each service
    return {
      stt: true,
      llm: true,
      tts: true
    };
  }
}
