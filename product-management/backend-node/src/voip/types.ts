// VoIP Gateway Types

export interface VoIPConfig {
  provider: 'twilio' | 'vonage' | 'bandwidth' | 'plivo' | 'sip' | 'test';
  credentials?: {
    accountSid?: string;
    authToken?: string;
    phoneNumber?: string;
  };
  sipConfig?: {
    domain: string;
    username: string;
    password: string;
  };
  codec: 'opus' | 'pcmu' | 'pcma' | 'g729';
  recording: boolean;
  region?: string;
}

export interface CallMetadata {
  callSid: string;
  from: string;
  to: string;
  direction: 'inbound' | 'outbound';
  startTime: Date;
  endTime?: Date;
  duration?: number;
  callerId?: string;
}

export interface AudioChunk {
  data: Buffer;
  timestamp: number;
  sequenceNumber: number;
  codec: string;
}

export interface DTMFInput {
  digit: string;
  timestamp: number;
}

export interface CallEvent {
  type: 'ringing' | 'answered' | 'dtmf' | 'audio' | 'hangup' | 'error';
  timestamp: number;
  data?: any;
}

export type CallEventHandler = (event: CallEvent) => void;

export interface IVoIPGateway {
  initialize(): Promise<void>;
  acceptCall(callMetadata: CallMetadata): Promise<string>;
  sendAudio(callSid: string, audio: Buffer): Promise<void>;
  receiveAudio(callSid: string, handler: (chunk: AudioChunk) => void): void;
  sendDTMF(callSid: string, digit: string): Promise<void>;
  hangup(callSid: string): Promise<void>;
  transfer(callSid: string, destination: string): Promise<void>;
  on(event: string, handler: CallEventHandler): void;
  shutdown(): Promise<void>;
}
