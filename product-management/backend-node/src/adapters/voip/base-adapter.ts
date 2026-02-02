/**
 * Base VoIP Provider Adapter Interface
 * Defines standard contract for all VoIP providers
 */

export interface IncomingCallData {
  callId: string;
  from: string;
  to: string;
  timestamp: Date;
  provider: 'twilio' | 'vonage' | 'bandwidth' | 'plivo' | 'telnyx';
  rawData: any;
}

export interface CallControlResponse {
  action: 'answer' | 'reject' | 'forward' | 'stream';
  message?: string;
  forwardTo?: string;
  streamUrl?: string;
  audioUrl?: string;
  initialAudio?: string; // Base64 encoded audio to play before stream (greeting)
}

export interface AudioChunkData {
  callId: string;
  audioData: Buffer;
  format: 'pcm' | 'mulaw' | 'alaw' | 'opus';
  sampleRate: number;
  timestamp: Date;
}

export abstract class BaseVoipAdapter {
  protected providerName: string;

  constructor(providerName: string) {
    this.providerName = providerName;
  }

  /**
   * Parse incoming webhook request to standard format
   */
  abstract parseIncomingCall(requestBody: any, headers: any): IncomingCallData;

  /**
   * Generate provider-specific response to control the call
   */
  abstract generateCallResponse(response: CallControlResponse): string;

  /**
   * Parse streaming audio chunks to standard format
   */
  abstract parseAudioChunk(requestBody: any): AudioChunkData | null;

  /**
   * Validate webhook signature for security
   */
  abstract validateWebhook(requestBody: any, headers: any, secret: string): boolean;

  /**
   * Get provider name
   */
  getProviderName(): string {
    return this.providerName;
  }
}
