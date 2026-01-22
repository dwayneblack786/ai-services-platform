import crypto from 'crypto';
import { BaseVoipAdapter, IncomingCallData, CallControlResponse, AudioChunkData } from './base-adapter';

/**
 * Twilio VoIP Provider Adapter
 * Handles Twilio-specific webhook formats and TwiML responses
 */
export class TwilioAdapter extends BaseVoipAdapter {
  constructor() {
    super('twilio');
  }

  /**
   * Parse Twilio incoming call webhook
   * https://www.twilio.com/docs/voice/twiml#request-parameters
   */
  parseIncomingCall(requestBody: any, headers: any): IncomingCallData {
    return {
      callId: requestBody.CallSid,
      from: requestBody.From,
      to: requestBody.To,
      timestamp: new Date(),
      provider: 'twilio',
      rawData: {
        accountSid: requestBody.AccountSid,
        callStatus: requestBody.CallStatus,
        direction: requestBody.Direction,
        fromCity: requestBody.FromCity,
        fromState: requestBody.FromState,
        fromCountry: requestBody.FromCountry
      }
    };
  }

  /**
   * Generate TwiML XML response
   * https://www.twilio.com/docs/voice/twiml
   */
  generateCallResponse(response: CallControlResponse): string {
    switch (response.action) {
      case 'answer':
        return `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say>${response.message || 'Hello'}</Say>
</Response>`;

      case 'reject':
        return `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Reject reason="busy" />
</Response>`;

      case 'forward':
        return `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Dial>${response.forwardTo}</Dial>
</Response>`;

      case 'stream':
        return `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Connect>
    <Stream url="${response.streamUrl}" />
  </Connect>
</Response>`;

      default:
        return `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say>An error occurred.</Say>
</Response>`;
    }
  }

  /**
   * Parse Twilio Media Stream audio chunks
   * https://www.twilio.com/docs/voice/twiml/stream#message-media
   */
  parseAudioChunk(requestBody: any): AudioChunkData | null {
    if (requestBody.event !== 'media') {
      return null;
    }

    const media = requestBody.media;
    if (!media || !media.payload) {
      return null;
    }

    // Twilio sends base64-encoded μ-law audio
    const audioBuffer = Buffer.from(media.payload, 'base64');

    return {
      callId: requestBody.streamSid,
      audioData: audioBuffer,
      format: 'mulaw',
      sampleRate: 8000, // Twilio default
      timestamp: new Date(requestBody.sequenceNumber)
    };
  }

  /**
   * Validate Twilio webhook signature
   * https://www.twilio.com/docs/usage/security#validating-requests
   */
  validateWebhook(requestBody: any, headers: any, authToken: string): boolean {
    const signature = headers['x-twilio-signature'];
    if (!signature) {
      return false;
    }

    const url = headers['x-forwarded-proto'] 
      ? `${headers['x-forwarded-proto']}://${headers.host}${headers['x-original-uri'] || requestBody.url}`
      : requestBody.url;

    // Create signature: SHA1 HMAC of URL + sorted params
    const data = Object.keys(requestBody)
      .sort()
      .reduce((acc, key) => acc + key + requestBody[key], url);

    const expectedSignature = crypto
      .createHmac('sha1', authToken)
      .update(Buffer.from(data, 'utf-8'))
      .digest('base64');

    return signature === expectedSignature;
  }
}
