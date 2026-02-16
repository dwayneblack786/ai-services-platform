// VoIP Gateway - Main interface

import { EventEmitter } from 'events';
import { createModuleLogger } from '../utils/logger';
import {
  IVoIPGateway,
  VoIPConfig,
  CallMetadata,
  AudioChunk,
  CallEvent,
  CallEventHandler
} from './types';

const logger = createModuleLogger('voip-gateway');

export abstract class BaseVoIPGateway extends EventEmitter implements IVoIPGateway {
  protected config: VoIPConfig;
  protected activeCalls: Map<string, CallMetadata> = new Map();

  constructor(config: VoIPConfig) {
    super();
    this.config = config;
  }

  abstract initialize(): Promise<void>;
  abstract acceptCall(callMetadata: CallMetadata): Promise<string>;
  abstract sendAudio(callSid: string, audio: Buffer): Promise<void>;
  abstract receiveAudio(callSid: string, handler: (chunk: AudioChunk) => void): void;
  abstract sendDTMF(callSid: string, digit: string): Promise<void>;
  abstract hangup(callSid: string): Promise<void>;
  abstract transfer(callSid: string, destination: string): Promise<void>;
  abstract shutdown(): Promise<void>;

  on(event: string, handler: CallEventHandler): this {
    return super.on(event, handler);
  }

  protected emitEvent(event: CallEvent): void {
    this.emit(event.type, event);
  }

  protected getActiveCall(callSid: string): CallMetadata | undefined {
    return this.activeCalls.get(callSid);
  }

  protected registerCall(callSid: string, metadata: CallMetadata): void {
    this.activeCalls.set(callSid, metadata);
    logger.info('Call registered', {
      callSid: callSid.substring(0, 8),
      from: metadata.from,
      to: metadata.to,
      direction: metadata.direction
    });
  }

  protected unregisterCall(callSid: string): void {
    const metadata = this.activeCalls.get(callSid);
    if (metadata) {
      this.activeCalls.delete(callSid);
      logger.info('Call unregistered', {
        callSid: callSid.substring(0, 8),
        duration: metadata.duration
      });
    }
  }

  getActiveCallCount(): number {
    return this.activeCalls.size;
  }
}
