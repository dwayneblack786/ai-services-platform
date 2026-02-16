// Twilio VoIP Adapter

import { BaseVoIPGateway } from '../gateway';
import { createModuleLogger } from '../../utils/logger';
import {
  VoIPConfig,
  CallMetadata,
  AudioChunk
} from '../types';

const logger = createModuleLogger('twilio-adapter');

export class TwilioAdapter extends BaseVoIPGateway {
  private audioHandlers: Map<string, (chunk: AudioChunk) => void> = new Map();
  private sequenceNumbers: Map<string, number> = new Map();
  private twilioClient: any; // Will be Twilio SDK client

  constructor(config: VoIPConfig) {
    super(config);

    if (!config.credentials?.accountSid || !config.credentials?.authToken) {
      throw new Error('Twilio credentials required: accountSid and authToken');
    }
  }

  async initialize(): Promise<void> {
    try {
      // Initialize Twilio client (requires 'twilio' package)
      // const twilio = require('twilio');
      // this.twilioClient = twilio(
      //   this.config.credentials!.accountSid,
      //   this.config.credentials!.authToken
      // );

      logger.info('Twilio adapter initialized', {
        region: this.config.region,
        codec: this.config.codec
      });
    } catch (error) {
      logger.error('Failed to initialize Twilio adapter', { error });
      throw error;
    }
  }

  async acceptCall(callMetadata: CallMetadata): Promise<string> {
    const callSid = callMetadata.callSid;
    const metadata: CallMetadata = {
      ...callMetadata,
      startTime: new Date()
    };

    this.registerCall(callSid, metadata);
    this.sequenceNumbers.set(callSid, 0);

    this.emitEvent({
      type: 'answered',
      timestamp: Date.now(),
      data: { callSid, metadata }
    });

    logger.info('Twilio call accepted', {
      callSid: callSid.substring(0, 16),
      from: metadata.from,
      to: metadata.to
    });

    return callSid;
  }

  async sendAudio(callSid: string, audio: Buffer): Promise<void> {
    const metadata = this.getActiveCall(callSid);
    if (!metadata) {
      throw new Error(`Call not found: ${callSid}`);
    }

    // Send audio via Twilio Media Streams
    // Implementation depends on Twilio SDK and WebSocket connection

    this.emitEvent({
      type: 'audio',
      timestamp: Date.now(),
      data: {
        callSid,
        direction: 'outbound',
        size: audio.length
      }
    });

    logger.debug('Audio sent to Twilio', {
      callSid: callSid.substring(0, 16),
      size: audio.length
    });
  }

  receiveAudio(callSid: string, handler: (chunk: AudioChunk) => void): void {
    this.audioHandlers.set(callSid, handler);
    logger.debug('Audio handler registered for Twilio call', {
      callSid: callSid.substring(0, 16)
    });
  }

  async sendDTMF(callSid: string, digit: string): Promise<void> {
    const metadata = this.getActiveCall(callSid);
    if (!metadata) {
      throw new Error(`Call not found: ${callSid}`);
    }

    // Send DTMF via Twilio API
    // await this.twilioClient.calls(callSid).update({ digits: digit });

    this.emitEvent({
      type: 'dtmf',
      timestamp: Date.now(),
      data: { callSid, digit }
    });

    logger.debug('DTMF sent via Twilio', {
      callSid: callSid.substring(0, 16),
      digit
    });
  }

  async hangup(callSid: string): Promise<void> {
    const metadata = this.getActiveCall(callSid);
    if (!metadata) {
      logger.warn('Call not found for hangup', {
        callSid: callSid.substring(0, 16)
      });
      return;
    }

    // Hangup via Twilio API
    // await this.twilioClient.calls(callSid).update({ status: 'completed' });

    metadata.endTime = new Date();
    metadata.duration = metadata.endTime.getTime() - metadata.startTime.getTime();

    this.emitEvent({
      type: 'hangup',
      timestamp: Date.now(),
      data: { callSid, duration: metadata.duration }
    });

    this.unregisterCall(callSid);
    this.audioHandlers.delete(callSid);
    this.sequenceNumbers.delete(callSid);

    logger.info('Twilio call ended', {
      callSid: callSid.substring(0, 16),
      duration: metadata.duration
    });
  }

  async transfer(callSid: string, destination: string): Promise<void> {
    const metadata = this.getActiveCall(callSid);
    if (!metadata) {
      throw new Error(`Call not found: ${callSid}`);
    }

    // Transfer via Twilio API
    // await this.twilioClient.calls(callSid).update({ url: transferUrl });

    logger.info('Twilio call transfer initiated', {
      callSid: callSid.substring(0, 16),
      destination
    });

    this.emitEvent({
      type: 'ringing',
      timestamp: Date.now(),
      data: { callSid, destination }
    });
  }

  async shutdown(): Promise<void> {
    const callSids = Array.from(this.activeCalls.keys());
    for (const callSid of callSids) {
      await this.hangup(callSid);
    }

    this.audioHandlers.clear();
    this.sequenceNumbers.clear();

    logger.info('Twilio adapter shutdown');
  }

  // Handle incoming Twilio Media Stream
  handleMediaStream(callSid: string, mediaPayload: any): void {
    const handler = this.audioHandlers.get(callSid);
    if (!handler) {
      return;
    }

    const seqNum = this.sequenceNumbers.get(callSid) || 0;
    this.sequenceNumbers.set(callSid, seqNum + 1);

    // Extract audio from Twilio media payload
    const audioData = Buffer.from(mediaPayload.payload, 'base64');

    const chunk: AudioChunk = {
      data: audioData,
      timestamp: Date.now(),
      sequenceNumber: seqNum,
      codec: mediaPayload.codec || this.config.codec
    };

    handler(chunk);
  }
}
