export interface ApiResponse<T = unknown> {
  statusCode: number;
  statusMessage: string;
  data: T;
}

export interface ApiError {
  statusCode: number;
  statusMessage: string;
  data: {
    message: string;
  };
}

// Voice Session Types
export interface VoiceSessionInitRequest {
  callId: string;
  customerId: string;
  tenantId: string;
  productId: string;
}

export interface VoiceGreeting {
  text: string;
  audio: string; // Base64 encoded WAV audio
}

export interface VoiceSessionInitResponse {
  sessionId: string;
  greetingText: string | null;
  greetingAudio: string | null; // Base64
}

export interface VoiceSessionInitEventData {
  sessionId: string;
  customerId: string;
  productId?: string;
  tenantId?: string;
}

export interface VoiceSessionInitializedEvent {
  sessionId: string;
  greeting: VoiceGreeting | null;
  status: 'ready' | 'ready_no_greeting';
}

export interface VoiceErrorEvent {
  code: string;
  message: string;
  details?: string;
}
