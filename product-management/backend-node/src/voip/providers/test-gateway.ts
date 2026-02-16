// Test Gateway - For development testing without VoIP

import { BaseVoIPGateway } from '../gateway';
import { createModuleLogger } from '../../utils/logger';
import {
  VoIPConfig,
  CallMetadata,
  AudioChunk,
  CallEvent
} from '../types';

const logger = createModuleLogger('test-gateway');

export class TestGateway extends BaseVoIPGateway {
  private audioHandlers: Map<string, (chunk: AudioChunk) => void> = new Map();
  private sequenceNumbers: Map<string, number> = new Map();

  constructor(config?: Partial<VoIPConfig>) {
    super({
      provider: 'test',
      codec: config?.codec || 'opus',
      recording: config?.recording || false,
      ...config
    });
  }

  async initialize(): Promise<void> {
    logger.info('Test Gateway initialized');
  }

  async acceptCall(callMetadata: CallMetadata): Promise<string> {
    const callSid = callMetadata.callSid || `test-call-${Date.now()}`;
    const metadata: CallMetadata = {
      ...callMetadata,
      callSid,
      startTime: new Date()
    };

    this.registerCall(callSid, metadata);
    this.sequenceNumbers.set(callSid, 0);

    this.emitEvent({
      type: 'answered',
      timestamp: Date.now(),
      data: { callSid, metadata }
    });

    logger.info('Test call accepted', {
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

    // Simulate sending audio (in test mode, just emit event)
    this.emitEvent({
      type: 'audio',
      timestamp: Date.now(),
      data: {
        callSid,
        direction: 'outbound',
        size: audio.length
      }
    });

    logger.debug('Audio sent', {
      callSid: callSid.substring(0, 16),
      size: audio.length
    });
  }

  receiveAudio(callSid: string, handler: (chunk: AudioChunk) => void): void {
    this.audioHandlers.set(callSid, handler);
    logger.debug('Audio handler registered', {
      callSid: callSid.substring(0, 16)
    });
  }

  // Simulate incoming audio (for testing)
  simulateIncomingAudio(callSid: string, audio: Buffer): void {
    const handler = this.audioHandlers.get(callSid);
    if (!handler) {
      logger.warn('No audio handler registered', {
        callSid: callSid.substring(0, 16)
      });
      return;
    }

    const seqNum = this.sequenceNumbers.get(callSid) || 0;
    this.sequenceNumbers.set(callSid, seqNum + 1);

    const chunk: AudioChunk = {
      data: audio,
      timestamp: Date.now(),
      sequenceNumber: seqNum,
      codec: this.config.codec
    };

    handler(chunk);

    this.emitEvent({
      type: 'audio',
      timestamp: Date.now(),
      data: {
        callSid,
        direction: 'inbound',
        size: audio.length
      }
    });
  }

  async sendDTMF(callSid: string, digit: string): Promise<void> {
    const metadata = this.getActiveCall(callSid);
    if (!metadata) {
      throw new Error(`Call not found: ${callSid}`);
    }

    this.emitEvent({
      type: 'dtmf',
      timestamp: Date.now(),
      data: { callSid, digit }
    });

    logger.debug('DTMF sent', { callSid: callSid.substring(0, 16), digit });
  }

  async hangup(callSid: string): Promise<void> {
    const metadata = this.getActiveCall(callSid);
    if (!metadata) {
      logger.warn('Call not found for hangup', {
        callSid: callSid.substring(0, 16)
      });
      return;
    }

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

    logger.info('Call ended', {
      callSid: callSid.substring(0, 16),
      duration: metadata.duration
    });
  }

  async transfer(callSid: string, destination: string): Promise<void> {
    const metadata = this.getActiveCall(callSid);
    if (!metadata) {
      throw new Error(`Call not found: ${callSid}`);
    }

    logger.info('Call transfer (simulated)', {
      callSid: callSid.substring(0, 16),
      destination
    });

    // In test mode, just log and emit event
    this.emitEvent({
      type: 'ringing',
      timestamp: Date.now(),
      data: { callSid, destination }
    });
  }

  async shutdown(): Promise<void> {
    // Hangup all active calls
    const callSids = Array.from(this.activeCalls.keys());
    for (const callSid of callSids) {
      await this.hangup(callSid);
    }

    this.audioHandlers.clear();
    this.sequenceNumbers.clear();

    logger.info('Test Gateway shutdown');
  }
}
