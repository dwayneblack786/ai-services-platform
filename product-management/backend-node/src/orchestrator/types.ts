// Orchestrator Types

export type StrategyType = 'unified' | 'component' | 'hybrid';

export interface ServiceHealth {
  name: string;
  healthy: boolean;
  latency?: number;
  errorRate?: number;
  lastCheck: Date;
}

export interface TenantVoiceConfig {
  tenantId: string;
  strategy: StrategyType;
  unifiedConfig?: {
    provider: 'openai' | 'google';
    model: string;
    apiKey: string;
  };
  componentConfig?: {
    stt: {
      provider: 'whisper' | 'google' | 'azure';
      endpoint: string;
    };
    llm: {
      provider: 'openai' | 'anthropic';
      model: string;
      endpoint: string;
    };
    tts: {
      provider: 'azure' | 'google' | 'elevenlabs';
      endpoint: string;
      voice: string;
    };
  };
  fallbackStrategy?: StrategyType;
  maxLatencyMs?: number;
  costTier?: 'basic' | 'standard' | 'premium' | 'enterprise';
}

export interface VoiceRequest {
  sessionId: string;
  tenantId: string;
  audioData: Buffer;
  format: string;
  customerId?: string;
}

export interface VoiceResponse {
  sessionId: string;
  transcription?: string;
  responseText?: string;
  audioData?: Buffer;
  metadata?: {
    strategy: StrategyType;
    latency: number;
    provider: string;
    voiceName?: string;
    confidence?: number;
  };
}

export interface RoutingDecision {
  strategy: StrategyType;
  provider: string;
  config: any;
  fallback?: RoutingDecision;
  healthCheck: boolean;
}

export interface StrategyMetrics {
  totalRequests: number;
  successCount: number;
  errorCount: number;
  avgLatency: number;
  totalCost: number;
}
