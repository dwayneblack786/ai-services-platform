import crypto from 'crypto';
import { BaseVoipAdapter, IncomingCallData, CallControlResponse, AudioChunkData } from './base-adapter';

/**
 * Vonage (formerly Nexmo) VoIP Provider Adapter
 * Handles Vonage-specific webhook formats and NCCO responses
 */
export class VonageAdapter extends BaseVoipAdapter {
  constructor() {
    super('vonage');
  }

  /**
   * Parse Vonage incoming call webhook
   * https://developer.vonage.com/en/voice/voice-api/webhook-reference
   */
  parseIncomingCall(requestBody: any, headers: any): IncomingCallData {
    return {
      callId: requestBody.uuid || requestBody.conversation_uuid,
      from: requestBody.from,
      to: requestBody.to,
      timestamp: new Date(requestBody.timestamp),
      provider: 'vonage',
      rawData: {
        direction: requestBody.direction,
        status: requestBody.status,
        network: requestBody.network
      }
    };
  }

  /**
   * Generate Vonage NCCO (Call Control Objects) JSON response
   * https://developer.vonage.com/en/voice/voice-api/ncco-reference
   */
  generateCallResponse(response: CallControlResponse): string {
    let ncco: any[] = [];

    switch (response.action) {
      case 'answer':
        ncco = [{
          action: 'talk',
          text: response.message || 'Hello',
          language: 'en-US',
          style: 0
        }];
        break;

      case 'reject':
        ncco = [{
          action: 'talk',
          text: 'This call cannot be completed.',
          language: 'en-US'
        }];
        break;

      case 'forward':
        ncco = [{
          action: 'connect',
          endpoint: [{
            type: 'phone',
            number: response.forwardTo
          }]
        }];
        break;

      case 'stream':
        ncco = [
          {
            action: 'conversation',
            name: response.callId || 'va-conversation'
          },
          {
            action: 'connect',
            endpoint: [{
              type: 'websocket',
              uri: response.streamUrl,
              'content-type': 'audio/l16;rate=16000'
            }]
          }
        ];
        break;

      default:
        ncco = [{
          action: 'talk',
          text: 'An error occurred.'
        }];
    }

    return JSON.stringify(ncco);
  }

  /**
   * Parse Vonage WebSocket audio chunks
   * https://developer.vonage.com/en/voice/voice-api/guides/websockets
   */
  parseAudioChunk(requestBody: any): AudioChunkData | null {
    // Vonage sends binary audio via WebSocket, not HTTP POST
    // This would be handled differently in WebSocket handler
    if (!requestBody || !requestBody.audio) {
      return null;
    }

    return {
      callId: requestBody.call_uuid,
      audioData: Buffer.from(requestBody.audio, 'base64'),
      format: 'pcm', // Vonage uses PCM by default
      sampleRate: 16000,
      timestamp: new Date()
    };
  }

  /**
   * Validate Vonage webhook signature
   * https://developer.vonage.com/en/getting-started/concepts/signing-messages
   */
  validateWebhook(requestBody: any, headers: any, signatureSecret: string): boolean {
    const signature = headers['authorization'];
    if (!signature) {
      return false;
    }

    // Vonage uses JWT tokens for webhook authentication
    try {
      const token = signature.replace('Bearer ', '');
      const [headerB64, payloadB64, signatureB64] = token.split('.');
      
      const expectedSignature = crypto
        .createHmac('sha256', signatureSecret)
        .update(`${headerB64}.${payloadB64}`)
        .digest('base64url');

      return signatureB64 === expectedSignature;
    } catch (error) {
      console.error('[Vonage] Signature validation error:', error);
      return false;
    }
  }
}
