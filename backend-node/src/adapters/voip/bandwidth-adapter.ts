import crypto from 'crypto';
import { BaseVoipAdapter, IncomingCallData, CallControlResponse, AudioChunkData } from './base-adapter';

/**
 * Bandwidth VoIP Provider Adapter
 * Handles Bandwidth-specific webhook formats and BXML responses
 */
export class BandwidthAdapter extends BaseVoipAdapter {
  constructor() {
    super('bandwidth');
  }

  /**
   * Parse Bandwidth incoming call webhook
   * https://dev.bandwidth.com/docs/voice/webhooks/
   */
  parseIncomingCall(requestBody: any, headers: any): IncomingCallData {
    return {
      callId: requestBody.callId,
      from: requestBody.from,
      to: requestBody.to,
      timestamp: new Date(requestBody.startTime),
      provider: 'bandwidth',
      rawData: {
        accountId: requestBody.accountId,
        applicationId: requestBody.applicationId,
        direction: requestBody.direction,
        callUrl: requestBody.callUrl
      }
    };
  }

  /**
   * Generate Bandwidth BXML response
   * https://dev.bandwidth.com/docs/voice/bxml/
   */
  generateCallResponse(response: CallControlResponse): string {
    switch (response.action) {
      case 'answer':
        return `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <SpeakSentence voice="kate">${response.message || 'Hello'}</SpeakSentence>
</Response>`;

      case 'reject':
        return `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Hangup/>
</Response>`;

      case 'forward':
        return `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Transfer>
    <PhoneNumber>${response.forwardTo}</PhoneNumber>
  </Transfer>
</Response>`;

      case 'stream':
        return `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <StartStream>
    <StreamParam name="destination" value="${response.streamUrl}"/>
    <StreamParam name="track" value="inbound"/>
  </StartStream>
  <Pause duration="60"/>
</Response>`;

      default:
        return `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <SpeakSentence>An error occurred.</SpeakSentence>
</Response>`;
    }
  }

  /**
   * Parse Bandwidth audio stream
   */
  parseAudioChunk(requestBody: any): AudioChunkData | null {
    if (!requestBody || requestBody.eventType !== 'audio') {
      return null;
    }

    return {
      callId: requestBody.callId,
      audioData: Buffer.from(requestBody.media, 'base64'),
      format: 'mulaw', // Bandwidth typically uses μ-law
      sampleRate: 8000,
      timestamp: new Date(requestBody.timestamp)
    };
  }

  /**
   * Validate Bandwidth webhook signature
   * https://dev.bandwidth.com/docs/voice/webhooks/#validate-webhooks
   */
  validateWebhook(requestBody: any, headers: any, secret: string): boolean {
    // Bandwidth doesn't use webhook signatures by default
    // Instead, validate using IP whitelist or custom headers
    const userAgent = headers['user-agent'];
    return userAgent && userAgent.includes('Bandwidth');
  }
}
