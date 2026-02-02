/**
 * VoIP Provider Adapters
 * Unified interface for multiple VoIP providers
 */

export { BaseVoipAdapter, IncomingCallData, CallControlResponse, AudioChunkData } from './base-adapter';
export { TwilioAdapter } from './twilio-adapter';
export { VonageAdapter } from './vonage-adapter';
export { BandwidthAdapter } from './bandwidth-adapter';
export { VoipAdapterFactory } from './adapter-factory';
